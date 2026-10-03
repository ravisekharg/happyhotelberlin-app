#!/usr/bin/env python3
"""Local server for the Happy Hotel Berlin site (Python standard library only).

- Serves ./public with clean URLs (/rooms -> index.html, /privacy -> privacy.html) and a 404 page.
- Handles form posts at /api/submit/<form>: saves the fields as JSON under
  ./submissions/<form>/<timestamp>-<ref>.json and returns a reference number.

Usage:  python3 server.py [port]      (default: first free port from 8080)
"""
import json
import re
import secrets
import socket
import sys
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs

ROOT = Path(__file__).parent
PUBLIC = ROOT / "public"
SUBMISSIONS = ROOT / "submissions"
MAX_BODY = 1 * 1024 * 1024
ALLOWED_FORMS = {"booking", "contact"}
# Section URLs of the one-page site; each serves index.html and the JS scrolls to it.
SECTION_ROUTES = {"/rooms", "/stay", "/amenities", "/gallery", "/neighbourhood",
                  "/location", "/groups", "/faq", "/book", "/contact"}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(PUBLIC), **kw)

    def log_message(self, fmt, *args):
        sys.stderr.write("  %s  %s\n" % (self.log_date_time_string(), fmt % args))

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        if self.path.startswith("/assets/"):
            self.send_header("Cache-Control", "no-cache, must-revalidate")
        super().end_headers()

    def do_GET(self):
        clean = self.path.split("?", 1)[0].split("#", 1)[0].rstrip("/") or "/"
        # Section URLs are cosmetic (set by JS replaceState on scroll); redirect any
        # direct browser request back to root so the page always starts at the hero.
        if clean in SECTION_ROUTES:
            self.send_response(302)
            self.send_header("Location", "/")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            return
        super().do_GET()

    def translate_path(self, path):
        clean = path.split("?", 1)[0].split("#", 1)[0].rstrip("/") or "/"
        if clean != "/" and not Path(clean).suffix:
            candidate = PUBLIC / (clean.strip("/") + ".html")
            if candidate.is_file():
                return str(candidate)
        return super().translate_path(path)

    def send_error(self, code, message=None, explain=None):
        page = PUBLIC / "404.html"
        if code == 404 and page.is_file():
            body = page.read_bytes()
            self.send_response(404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(body)
            return
        super().send_error(code, message, explain)

    def _json(self, code, data):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        m = re.fullmatch(r"/api/submit/([a-z-]+)", self.path.split("?", 1)[0])
        if not m or m.group(1) not in ALLOWED_FORMS:
            return self._json(404, {"ok": False, "error": "Unknown form"})
        form = m.group(1)
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY:
            return self._json(413, {"ok": False, "error": "Request too large"})
        raw = self.rfile.read(length)
        ctype = self.headers.get("Content-Type", "")
        try:
            if "application/json" in ctype:
                fields = json.loads(raw)
            else:
                fields = {k: v[0] if len(v) == 1 else v
                          for k, v in parse_qs(raw.decode("utf-8")).items()}
        except Exception:
            return self._json(400, {"ok": False, "error": "Invalid data"})
        if fields.get("website"):  # honeypot
            return self._json(200, {"ok": True, "ref": "HHB-0000"})
        if not fields.get("email") or not fields.get("name"):
            return self._json(422, {"ok": False, "error": "Name and email are required"})

        ref = "HHB-" + secrets.token_hex(3).upper()
        out = SUBMISSIONS / form
        out.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        record = {"form": form, "ref": ref, "received": datetime.now().isoformat(timespec="seconds"),
                  "fields": fields}
        (out / f"{stamp}-{ref}.json").write_text(json.dumps(record, indent=2, ensure_ascii=False),
                                                 encoding="utf-8")
        print(f"  ✓ {form} submission saved: {ref}")
        return self._json(200, {"ok": True, "ref": ref})


def free_port(start):
    for port in range(start, start + 50):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("127.0.0.1", port)) != 0:
                return port
    raise SystemExit("No free port found")


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else free_port(8080)
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Happy Hotel Berlin → http://localhost:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
