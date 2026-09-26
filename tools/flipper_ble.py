"""Small BLE RPC client for project NFC deployment.

Wire fields follow https://github.com/flipperdevices/flipperzero-protobuf.
No shell commands, firmware updates, or radio transmissions are exposed.
"""
import argparse
import asyncio
import hashlib
import json
from pathlib import Path, PurePosixPath

from bleak import BleakClient, BleakScanner
from bleak.exc import BleakError

BASE = "19ed82ae-ed21-4c9d-4145-228e"
TX = BASE + "61fe0000"
RX = BASE + "62fe0000"
FLOW = BASE + "63fe0000"


def varint(value):
    if value < 0:
        raise ValueError("Unsigned integers only")
    result = bytearray()
    while value > 127:
        result.append((value & 127) | 128)
        value >>= 7
    result.append(value)
    return bytes(result)


def read_varint(data, offset=0):
    value = 0
    for shift in range(0, 70, 7):
        if offset >= len(data):
            raise EOFError("Incomplete varint")
        byte = data[offset]
        offset += 1
        value |= (byte & 127) << shift
        if byte < 128:
            return value, offset
    raise ValueError("Invalid varint")


def field(number, value):
    if isinstance(value, str):
        value = value.encode("utf-8")
    if isinstance(value, bytes):
        return varint(number * 8 + 2) + varint(len(value)) + value
    return varint(number * 8) + varint(value)


def decode(data):
    result = {}
    pos = 0
    while pos < len(data):
        key, pos = read_varint(data, pos)
        number, wire = key >> 3, key & 7
        if not number:
            raise ValueError("Invalid protobuf field")
        if wire == 0:
            value, pos = read_varint(data, pos)
        elif wire == 2:
            size, pos = read_varint(data, pos)
            if pos + size > len(data):
                raise EOFError("Truncated protobuf field")
            value = bytes(data[pos:pos + size])
            pos += size
        else:
            raise ValueError(f"Unsupported protobuf wire type {wire}")
        result.setdefault(number, []).append(value)
    return result


def first(message, number, default=b""):
    return message.get(number, [default])[0]


class Rpc:
    def __init__(self, client):
        self.client = client
        self.buffer = bytearray()
        self.inbox = asyncio.Queue()
        self.frames = asyncio.Queue()
        self.credit = 0
        self.credit_changed = asyncio.Event()
        self.command = 0

    def on_flow(self, _, data):
        self.credit = int.from_bytes(data, "big")
        self.credit_changed.set()

    def on_data(self, _, data):
        self.buffer.extend(data)
        while self.buffer:
            try:
                size, start = read_varint(self.buffer)
            except EOFError:
                return
            if size > 1024 * 1024:
                raise ValueError("Oversized RPC frame")
            if len(self.buffer) < start + size:
                return
            message = decode(self.buffer[start:start + size])
            del self.buffer[:start + size]
            (self.frames if 22 in message else self.inbox).put_nowait(message)

    async def start(self):
        await self.client.start_notify(FLOW, self.on_flow)
        await self.client.start_notify(TX, self.on_data)
        self.on_flow(None, await self.client.read_gatt_char(FLOW))

    async def send(self, data):
        while data:
            if not self.credit:
                self.credit_changed.clear()
                await asyncio.wait_for(self.credit_changed.wait(), 15)
                continue
            size = min(len(data), self.credit, 128, self.client.mtu_size - 3)
            self.credit -= size
            await self.client.write_gatt_char(RX, data[:size], response=True)
            data = data[size:]

    async def call(self, number, payload=b"", more=False, command=None):
        if command is None:
            self.command += 1
            command = self.command
        message = field(1, command) + field(3, int(more)) + field(number, payload)
        await self.send(varint(len(message)) + message)
        if more:
            return []
        responses = []
        while True:
            response = await asyncio.wait_for(self.inbox.get(), 20)
            if first(response, 1, 0) != command:
                continue
            status = first(response, 2, 0)
            if status:
                raise RuntimeError(f"Flipper RPC status {status} for field {number}")
            responses.append(response)
            if not first(response, 3, 0):
                return responses

    async def read_file(self, path):
        responses = await self.call(9, field(1, path))
        return b"".join(first(decode(first(decode(first(r, 10)), 1)), 4)
                        for r in responses if 10 in r)


async def run(args):
    device = args.address or await BleakScanner.find_device_by_filter(
        lambda d, a: (args.name == (a.local_name or d.name)) if args.name
        else "flipper" in (a.local_name or d.name or "").lower(), timeout=12)
    if not device:
        raise RuntimeError("Flipper not advertising. Enable Bluetooth, unlock it, and disconnect other clients.")
    async with BleakClient(device, timeout=20) as client:
        rpc = Rpc(client)
        await rpc.start()
        if args.action == "info":
            results = await rpc.call(32)
            info = {}
            for result in results:
                if 33 in result:
                    item = decode(first(result, 33))
                    info[first(item, 1).decode()] = first(item, 2).decode()
            print(json.dumps(info, indent=2))
        elif args.action == "list":
            results = await rpc.call(7, field(1, args.path))
            for result in results:
                for raw in decode(first(result, 8)).get(1, []):
                    item = decode(raw)
                    print(json.dumps({"name": first(item, 2).decode(),
                                      "size": first(item, 3, 0),
                                      "directory": bool(first(item, 1, 0))}))
        elif args.action == "get":
            data = await rpc.read_file(args.path)
            target = Path(args.output)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            print(f"Saved {len(data)} bytes to {target}")
        elif args.action == "put":
            remote = PurePosixPath(args.path)
            if str(remote.parent) != "/ext/nfc/occult-party" or remote.suffix != ".nfc":
                raise ValueError("Uploads must be .nfc files directly inside /ext/nfc/occult-party/")
            data = Path(args.input).read_bytes()
            try:
                await rpc.call(24, field(1, str(remote)))
            except RuntimeError as error:
                if "status 7 " not in str(error):
                    raise
            else:
                raise FileExistsError(f"Refusing to overwrite {remote}")
            try:
                await rpc.call(13, field(1, str(remote.parent)))
            except RuntimeError as error:
                if "status 6 " not in str(error):
                    raise
            rpc.command += 1
            command = rpc.command
            chunks = [data[i:i + 256] for i in range(0, len(data), 256)] or [b""]
            for i, chunk in enumerate(chunks):
                await rpc.call(11, field(1, str(remote)) + field(2, field(4, chunk)),
                               more=i < len(chunks) - 1, command=command)
            if await rpc.read_file(str(remote)) != data:
                raise RuntimeError("Uploaded file failed read-back verification")
            print(f"Verified {len(data)} bytes; SHA256 {hashlib.sha256(data).hexdigest()}")
        elif args.action == "screen":
            from PIL import Image
            await rpc.call(20)
            try:
                frame = decode(first(await asyncio.wait_for(rpc.frames.get(), 10), 22))
                pixels = first(frame, 1)
                if len(pixels) != 1024:
                    raise ValueError(f"Unexpected screen length {len(pixels)}")
                img = Image.new("1", (128, 64), 1)
                for y in range(64):
                    for x in range(128):
                        img.putpixel((x, y), 0 if pixels[x + (y // 8) * 128] & (1 << (y % 8)) else 1)
                target = Path(args.output)
                target.parent.mkdir(parents=True, exist_ok=True)
                img.resize((768, 384), Image.Resampling.NEAREST).save(target)
                print(f"Saved screen to {target}; orientation={first(frame, 2, 0)}")
            finally:
                await rpc.call(21)
        elif args.action == "button":
            key = ["up", "down", "right", "left", "ok", "back"].index(args.key)
            await rpc.call(23, field(1, key) + field(2, 0))
            await rpc.call(23, field(1, key) + field(2, 2))
            await rpc.call(23, field(1, key) + field(2, 1))
            print(f"Pressed {args.key}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    target = parser.add_mutually_exclusive_group(required=True)
    target.add_argument("--name", help="Exact advertised Flipper name")
    target.add_argument("--address", help="Known bonded BLE address; skips name discovery")
    sub = parser.add_subparsers(dest="action", required=True)
    sub.add_parser("info")
    ls = sub.add_parser("list")
    ls.add_argument("path", nargs="?", default="/ext/nfc")
    get = sub.add_parser("get")
    get.add_argument("path")
    get.add_argument("output")
    put = sub.add_parser("put")
    put.add_argument("input")
    put.add_argument("path")
    screen = sub.add_parser("screen")
    screen.add_argument("output", nargs="?", default="artifacts/flipper-screen.png")
    button = sub.add_parser("button")
    button.add_argument("key", choices=["up", "down", "right", "left", "ok", "back"])
    args = parser.parse_args()
    try:
        asyncio.run(run(args))
    except (RuntimeError, TimeoutError, OSError, ValueError, BleakError) as error:
        parser.exit(1, f"Error: {error or type(error).__name__}\n")


if __name__ == "__main__":
    main()
