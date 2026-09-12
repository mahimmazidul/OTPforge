"""
OTPforge — Modern TOTP Authenticator + OTP API
================================================
A secure, time- and counter-based OTP app.

What's new in v2:
  * A modern, totp.app / Google Authenticator style web authenticator
    served at `/` (all codes are computed client-side via Web Crypto —
    secrets never leave the browser).
  * Legacy JSON API kept for backward compatibility: POST /get-otp
"""

import time
from collections import defaultdict, deque

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

try:
    import pyotp
except ImportError:  # pragma: no cover
    pyotp = None

app = Flask(__name__, static_folder="static", static_url_path="/static")
CORS(app)

# ---------------------------------------------------------------------------
# Simple in-memory rate limiter: 60 requests / minute / IP (legacy behaviour)
# ---------------------------------------------------------------------------
RATE_LIMIT = 60
_request_log = defaultdict(deque)


def _rate_limited() -> bool:
    ip = request.remote_addr or "unknown"
    now = time.time()
    q = _request_log[ip]
    while q and now - q[0] > 60:
        q.popleft()
    if len(q) >= RATE_LIMIT:
        return True
    q.append(now)
    return False


# Keep HOTP counters per username (legacy behaviour)
_counters = defaultdict(int)


# ---------------------------------------------------------------------------
# Authenticator frontend (static)
# ---------------------------------------------------------------------------
@app.route("/")
def index():
    # index.html lives at the repo root so the same file works on GitHub Pages
    return send_from_directory(app.root_path, "index.html")


@app.route("/healthz")
def healthz():
    return jsonify(status="ok", app="OTPforge", version="2.0.0")


# ---------------------------------------------------------------------------
# Legacy API: POST /get-otp
# ---------------------------------------------------------------------------
@app.route("/get-otp", methods=["POST"])
def get_otp():
    if pyotp is None:
        return jsonify(status="error", message="pyotp is not installed on the server"), 500

    if _rate_limited():
        return jsonify(status="error", message="Rate limit exceeded (60 requests/minute)"), 429

    data = request.get_json(silent=True) or {}
    otype = data.get("type")
    if otype not in ("time", "counter"):
        return jsonify(status="error", message="'type' must be 'time' or 'counter'"), 400

    key = data.get("key") or pyotp.random_base32()
    username = data.get("username") or "default"

    try:
        if otype == "time":
            otp = pyotp.TOTP(key).now()
            remaining = 30 - int(time.time()) % 30
            return jsonify(
                status="ok",
                type="time",
                username=username,
                key=key,
                otp=otp,
                remaining_seconds=remaining,
            )

        # HOTP (counter based)
        counter = data.get("counter")
        if counter is None:
            counter = _counters[username]
            _counters[username] += 1
        counter = int(counter)
        otp = pyotp.HOTP(key).at(counter)
        return jsonify(
            status="ok",
            type="counter",
            username=username,
            key=key,
            otp=otp,
            counter_used=counter,
            next_counter=counter + 1,
        )
    except Exception as exc:  # invalid secret etc.
        return jsonify(status="error", message=str(exc)), 400


if __name__ == "__main__":
    import os

    port = int(os.environ.get("PORT", 5005))
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
