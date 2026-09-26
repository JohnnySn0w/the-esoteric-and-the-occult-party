# The Esoteric and the Occult Party — NFC experiments

NFC experiences that work with built-in phone features, without a third-party app.
Target OS releases from the preceding four years (cutoff at project setup: September 26, 2022).
Hardware: NTAG215 stickers and a Flipper Zero, connected to Windows over BLE.

## What we will deploy

| Experience | Approach | Guest setup |
| --- | --- | --- |
| Website, clue, party info, playlist, map | One standard NDEF HTTPS URI | Scan, then follow the phone's prompt; app links should have a web fallback |
| Guest Wi-Fi | Printed Wi-Fi QR code | Built-in camera/Wi-Fi scanner; NFC Wi-Fi records are not a shared iPhone/Android solution |
| Personal iPhone automation | Built-in Shortcuts NFC trigger | Each person must set up their own automation; not a public tap-and-run experience |

An NFC URL does not silently join Wi-Fi, install software, or grant additional permissions.
NFC launches the browser; a linked website can provide interactive clues or other experiences.
Use a stable URL under our control when available, so content can change without rewriting tags.
No destination URL has been chosen yet. The included example opens **https://example.com/**.

## Tools

Python 3.13 is available on the project laptop, with Bleak and Pillow already installed.
On another machine, use a virtual environment and install `requirements.txt`.
Commands below are run from this repository in PowerShell.

```powershell
py -3.13 tools/flipper_ble.py --name 'Flipper DEVICE_NAME' info
py -3.13 tools/flipper_ble.py --name 'Flipper DEVICE_NAME' screen
py -3.13 tools/flipper_ble.py --name 'Flipper DEVICE_NAME' list /ext/nfc/occult-party
py -3.13 tools/flipper_ble.py --name 'Flipper DEVICE_NAME' button back
```

If discovery is intermittent, use `--address BONDED_BLE_ADDRESS` instead of `--name`.
Windows hardware access may require running outside the Codex sandbox under the user's account.
BLE must be enabled on the Flipper. Disconnect competing clients if it is unavailable.
Each command connects, performs its operation, and disconnects. This is a small project CLI,
not a persistent desktop application. Screens are snapshots.

### Generate and stage an HTTPS tag

```powershell
py -3.13 tools/make_ntag215.py https://example.com/ artifacts/my-tag.nfc
py -3.13 tools/flipper_ble.py --address BONDED_BLE_ADDRESS put artifacts/my-tag.nfc /ext/nfc/occult-party/my-tag.nfc
```

The generator creates a Flipper version-4 NTAG215 file. It stores one URI record, keeps lock
bits clear, and uses default password/configuration values. The synthetic UID is for the
generated image; this does not change a physical NTAG215's factory UID or forge its signature.
Although NTAG215 has 504 user-memory bytes, this standard capability container advertises
496 bytes for the NDEF area, including record/TLV overhead. Oversized URLs are rejected.

Uploads are restricted to new `.nfc` files directly in `/ext/nfc/occult-party/`.
Existing filenames are refused. Every upload is downloaded again and compared byte-for-byte.
An interrupted upload may leave a partial file; use a new filename or inspect/remove it manually.
Local captures and private URLs belong in ignored `artifacts/` or `.local/` directories.

### Write a physical sticker

1. Open NFC → Saved → occult-party and select the intended file.
2. Inspect its contents and confirm the destination.
3. Use the available NTAG write action and place one blank NTAG215 at the Flipper's NFC antenna.
4. Read the sticker back and compare its NDEF payload. Its UID will differ from the generated image.
5. Test a real iPhone and Android phone using built-in scanning, with no NFC reader app open.
6. Record phone models, OS versions, prompts, and actual destination behavior before deploying.

Official Flipper documentation requires matching NTAG types, default PWD/PACK, disabled AUTH0,
and zero static/dynamic lock bits. Leave test stickers rewritable. Physical writing and phone
behavior remain unverified until a sticker is present and the phones are tested.

## Verification

```powershell
py -3.13 -m unittest discover -s tests -v
```

On September 26, 2026:

- Connected over BLE and read device information: official firmware **1.4.3**, protocol **0.25**.
- Captured and visually inspected the Flipper screen.
- Verified remote button navigation. Opened the generated sample in NFC Saved; Flipper accepted
  the file and displayed its **Emulate** and **Write** actions. Left it at that menu, idle.
- Uploaded `examples/https-demo-ntag215.nfc` to `/ext/nfc/occult-party/https-demo-ntag215.nfc`.
- Read-back matched all **3,323 bytes**; SHA-256:
  `bfbb619af23a01c4bf5e88213f12b87f1bafd1a3d79554991b932b8fa3e53108`.
- Six unit tests passed for NDEF encoding, size limits, unlocked memory layout, and RPC framing.
- The user reported that the sample worked on their phone. Phone model, OS version, and whether
  the test used Flipper emulation or a physical sticker have not yet been recorded. Testing on
  both platforms and verification of a physical sticker remain pending.

## References

- [Flipper NFC reading and NTAG writing](https://docs.flipper.net/zero/nfc/read)
- [Flipper NFC file format](https://developer.flipper.net/flipperzero/doxygen/nfc_file_format.html)
- [Firmware 1.4.3 tag defaults](https://github.com/flipperdevices/flipperzero-firmware/blob/1.4.3/lib/nfc/helpers/nfc_data_generator.c)
- [Official RPC protocol](https://github.com/flipperdevices/flipperzero-protobuf)
- [Apple background NFC reading](https://developer.apple.com/documentation/corenfc/adding-support-for-background-tag-reading)
- [Android NFC basics](https://developer.android.com/develop/connectivity/nfc/nfc)
