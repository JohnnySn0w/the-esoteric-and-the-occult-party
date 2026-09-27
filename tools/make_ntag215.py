"""Generate a rewritable NTAG215 Flipper file containing one HTTPS NDEF URI."""
import argparse
from ipaddress import ip_address, ip_network
from pathlib import Path
from urllib.parse import urlsplit


def uri_tlv(url, *, allow_lan_http=False):
    parsed = urlsplit(url)
    lan_http = False
    if allow_lan_http and parsed.scheme == "http" and parsed.hostname:
        try:
            address = ip_address(parsed.hostname)
            lan_http = any(address in ip_network(network) for network in
                           ("10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"))
        except ValueError:
            pass
    if (parsed.scheme != "https" and not lan_http) or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("Use an absolute HTTPS URL without embedded credentials")
    if any(ord(c) < 33 or ord(c) > 126 for c in url):
        raise ValueError("Use an ASCII URL with spaces/unicode percent-encoded")
    prefix = b"\x03" if lan_http else b"\x04"
    payload = prefix + url[len(parsed.scheme) + 3:].encode("ascii")
    if len(payload) <= 255:
        record = b"\xd1\x01" + bytes([len(payload)]) + b"U" + payload
    else:
        record = b"\xc1\x01" + len(payload).to_bytes(4, "big") + b"U" + payload
    size = bytes([len(record)]) if len(record) < 255 else b"\xff" + len(record).to_bytes(2, "big")
    tlv = b"\x03" + size + record + b"\xfe"
    if len(tlv) > 496:
        raise ValueError(f"NDEF needs {len(tlv)} bytes; this NTAG215 layout advertises 496")
    return tlv


def make_dump(url, *, allow_lan_http=False):
    tlv = uri_tlv(url, allow_lan_http=allow_lan_http)
    memory = bytearray(540)
    # Synthetic identifier for this generated image; physical tag UIDs stay unchanged.
    uid = bytes.fromhex("04 50 41 53 54 59 80")
    memory[:3] = uid[:3]
    memory[3] = 0x88 ^ uid[0] ^ uid[1] ^ uid[2]
    memory[4:8] = uid[3:]
    memory[8] = uid[3] ^ uid[4] ^ uid[5] ^ uid[6]
    memory[9] = 0x48
    memory[12:16] = bytes.fromhex("E1 10 3E 00")
    memory[16:16 + len(tlv)] = tlv
    # Same unlocked config as Flipper's built-in NTAG215 generator.
    memory[520:540] = bytes.fromhex("00 00 00 BD 04 00 00 FF 00 05 00 00 FF FF FF FF 00 00 00 00")
    lines = ["Filetype: Flipper NFC device", "Version: 4",
             "Device type: NTAG/Ultralight", f"UID: {uid.hex(' ').upper()}",
             "ATQA: 00 44", "SAK: 00", "Data format version: 2",
             "NTAG/Ultralight type: NTAG215", "Signature: " + " ".join(["00"] * 32),
             "Mifare version: 00 04 04 02 01 00 11 03"]
    for i in range(3):
        lines += [f"Counter {i}: 0", f"Tearing {i}: 00"]
    lines += ["Pages total: 135", "Pages read: 135"]
    lines += [f"Page {i}: {memory[i*4:i*4+4].hex(' ').upper()}" for i in range(135)]
    lines.append("Failed authentication attempts: 0")
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url")
    parser.add_argument("output", type=Path)
    parser.add_argument("--allow-lan-http", action="store_true",
                        help="Local testing only: allow HTTP to an RFC1918 IPv4 address")
    args = parser.parse_args()
    try:
        dump = make_dump(args.url, allow_lan_http=args.allow_lan_http)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open("x", encoding="ascii", newline="\n") as output:
            output.write(dump)
    except (ValueError, OSError) as error:
        parser.exit(1, f"Error: {error}\n")
    print(f"Created {args.output}: {len(uri_tlv(args.url, allow_lan_http=args.allow_lan_http))}/496 NDEF area bytes")


if __name__ == "__main__":
    main()
