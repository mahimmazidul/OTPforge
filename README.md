# OTPforge

A modern, private 2FA authenticator that runs in your browser or on GitHub Pages — plus a legacy OTP API.

OTPforge is a full TOTP authenticator web app: scan the QR code a service shows you when you enable 2FA, and OTPforge generates the rotating 6-digit codes right in your browser. All codes are computed locally with Web Crypto — your secrets never leave your device.

## Authenticator features

- **Works with any service** that shows a standard `otpauth://` QR when you enable two-factor authentication
- **Add accounts 3 ways** — camera QR scan, QR image upload, paste an `otpauth://` link, or manual secret entry
- **Import from other authenticator apps** — scan/paste the standard `otpauth-migration://` transfer QR and all codes come across
- **TOTP and HOTP** — time-based and counter-based codes
- **Full RFC 6238 support** — SHA-1 / SHA-256 / SHA-512, 6–8 digits, 15/30/60 s periods
- **Steam Guard** 5-character codes
- Search, drag-to-reorder, dark/light theme
- **Export / import JSON backups** — move between devices easily
- **Show any account as a QR** to migrate to another authenticator
- Verified against the official RFC 4226 / RFC 6238 test vectors (`node test/crypto.test.mjs`)
- No account, no cloud, no tracking — secrets live only in your browser's localStorage

## Run it on GitHub Pages (no server needed)

The authenticator is 100% client-side (all crypto runs in the browser), so it works perfectly on GitHub Pages. The legacy `/get-otp` API is the only part that needs a server — on Pages you simply get the authenticator.

Option A — automatic deploy (recommended), already wired up:

1. Push this repo to GitHub.
2. In the repo: **Settings → Pages → Source → GitHub Actions**.
3. Done. Every push to `main` deploys the site via `.github/workflows/deploy-pages.yml`, live at `https://<username>.github.io/OTPforge/`.

Option B — deploy from branch (no Actions):

1. **Settings → Pages → Source → Deploy from a branch** → branch `main`, folder `/ (root)`.
2. Visit `https://<username>.github.io/OTPforge/`.

Notes:

- Asset paths are relative, so it works both on Pages and self-hosted.
- GitHub Pages is HTTPS, which browsers require for camera QR scanning and Web Crypto — both work out of the box.

## Self-hosted (local / VPS)

Requires Python 3.9+. This mode also enables the legacy JSON API.

```bash
git clone https://github.com/mahimmazidul/OTPforge.git
cd OTPforge
pip install -r requirements.txt
python main.py
```

Then open http://127.0.0.1:5005/ and add your first account (or click *Try a demo account*).

To use camera QR scanning from a phone, serve over HTTPS (e.g. behind any HTTPS reverse proxy) — browsers only allow camera access on secure origins.

## Using it as a 2FA app

1. Turn on 2FA on the service (e.g. GitHub → *Settings → Password and authentication*).
2. Choose *"setup using an authenticator app"* — a QR code appears.
3. In OTPforge click **Add → Scan QR** (or upload a screenshot of the QR).
4. Type the 6-digit code back into the service to confirm. Done — codes rotate every 30 s.

To migrate **from another authenticator**: use its transfer/export feature and scan the resulting QR with OTPforge.

## Legacy JSON API (self-hosted only)

Rate-limited: 60 requests/minute/IP. Not available on GitHub Pages.

**Endpoint:** `POST /get-otp` · Content-Type: `application/json`

```json
{
  "key": "JBSWY3DPEHPK3PXP",
  "type": "time",
  "username": "alice",
  "counter": 0
}
```

- `key`: optional — a new key is generated if omitted
- `type`: required — `"time"` (TOTP) or `"counter"` (HOTP)
- `username`: optional — tracks HOTP counters
- `counter`: optional — explicit HOTP counter

**TOTP response**

```json
{ "status": "ok", "type": "time", "username": "alice",
  "key": "JBSWY3DPEHPK3PXP", "otp": "492039", "remaining_seconds": 18 }
```

**HOTP response**

```json
{ "status": "ok", "type": "counter", "username": "bob",
  "key": "JBSWY3DPEHPK3PXP", "otp": "583927",
  "counter_used": 0, "next_counter": 1 }
```

## Project layout

```
OTPforge/
├── index.html            # authenticator UI (repo root so GitHub Pages serves it)
├── static/
│   ├── style.css
│   ├── app.js            # TOTP/HOTP engine (Web Crypto) + UI logic
│   └── vendor/           # jsQR (QR decoding), qrcode-generator (QR encoding)
├── main.py               # optional Flask server: serves the app + legacy /get-otp API
├── requirements.txt
├── .github/workflows/
│   └── deploy-pages.yml  # GitHub Pages deployment
└── test/
    └── crypto.test.mjs   # RFC 4226/6238 test-vector suite (node)
```

## Roadmap ideas

- PWA install + offline caching
- Optional password-gated encrypted storage
- Push-style login approval

## Author

**Mazidul Islam Mahim**
Email: [meow@mahim.dev](mailto:meow@mahim.dev) · GitHub: [mahimmazidul](https://github.com/mahimmazidul)

## License

MIT — see [LICENSE](LICENSE).
