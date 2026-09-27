import unittest
from tools.make_ntag215 import make_dump, uri_tlv
from tools.flipper_ble import Rpc, decode, field, read_varint, varint


class NdefTests(unittest.TestCase):
    def test_known_uri_encoding(self):
        self.assertEqual(uri_tlv("https://example.com/"), bytes.fromhex(
            "03 11 D1 01 0D 55 04 65 78 61 6D 70 6C 65 2E 63 6F 6D 2F FE"))

    def test_extended_record_and_tlv(self):
        tlv = uri_tlv("https://example.com/" + "a" * 260)
        self.assertEqual(tlv[:2], b"\x03\xff")
        self.assertEqual(int.from_bytes(tlv[2:4], "big"), len(tlv) - 5)
        self.assertEqual(tlv[4:6], b"\xc1\x01")
        self.assertEqual(int.from_bytes(tlv[6:10], "big"), 273)

    def test_capacity_and_invalid_urls(self):
        for url in ["http://example.com", "https://", "https://a:b@example.com",
                    "https://example.com/\n", "https://example.com/" + "a" * 500]:
            with self.subTest(url=url), self.assertRaises(ValueError):
                uri_tlv(url)

    def test_memory_layout_remains_unlocked(self):
        pages = [bytes.fromhex(line.split(": ")[1]) for line in
                 make_dump("https://example.com/").splitlines() if line.startswith("Page ")]
        self.assertEqual(len(pages), 135)
        self.assertEqual(pages[2][2:], b"\x00\x00")
        self.assertEqual(pages[130][:3], b"\x00\x00\x00")
        self.assertEqual(pages[131][3], 255)
        self.assertEqual(pages[133], b"\xff" * 4)
        self.assertEqual(pages[134][:2], b"\x00\x00")
        self.assertEqual(pages[3], bytes.fromhex("E1 10 3E 00"))

    def test_lan_http_requires_explicit_opt_in(self):
        url = "http://10.1.2.3:5173/?circle=test"
        with self.assertRaises(ValueError):
            uri_tlv(url)
        tlv = uri_tlv(url, allow_lan_http=True)
        self.assertEqual(tlv[5:7], b"U\x03")
        self.assertEqual(tlv[7:-1].decode(), url.removeprefix("http://"))
        for url in ["http://example.com", "http://8.8.8.8", "http://127.0.0.1",
                    "http://10.1.2.3@example.com", "http://u:p@10.1.2.3"]:
            with self.subTest(url=url), self.assertRaises(ValueError):
                uri_tlv(url, allow_lan_http=True)


class FramingTests(unittest.TestCase):
    def test_fragmented_and_coalesced_notifications(self):
        rpc = Rpc(None)
        bodies = [field(1, 1) + field(33, field(1, "firmware")), field(22, field(1, b"pixels"))]
        stream = b"".join(varint(len(body)) + body for body in bodies)
        for byte in stream:
            rpc.on_data(None, bytes([byte]))
        self.assertEqual(rpc.inbox.get_nowait(), decode(bodies[0]))
        self.assertEqual(rpc.frames.get_nowait(), decode(bodies[1]))
        rpc.on_data(None, stream)
        self.assertEqual(rpc.inbox.qsize(), 1)
        self.assertEqual(rpc.frames.qsize(), 1)

    def test_truncated_fields(self):
        with self.assertRaises(EOFError):
            decode(b"\x0a\x05ab")
        with self.assertRaises(EOFError):
            read_varint(b"\x80")
        with self.assertRaises(ValueError):
            read_varint(b"\x80" * 10)


if __name__ == "__main__":
    unittest.main()
