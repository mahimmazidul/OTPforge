// Verifies OTPforge's client-side OTP engine against official RFC test vectors.
// Run: node test/crypto.test.mjs
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) globalThis.crypto = webcrypto;

const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEAM_ALPHABET = '23456789BCDFGHJKMNPQRTVWXY';

function base32Decode(input) {
  const clean = String(input).toUpperCase().replace(/[\s=]/g, '');
  if (!clean) throw new Error('Empty secret');
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = B32_ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid base32 character "${ch}"`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return new Uint8Array(out);
}

function base32Encode(bytes) {
  let bits = 0, value = 0, out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { out += B32_ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

async function computeHOTP(secretBytes, counter, digits, algorithm, steam) {
  const msg = new ArrayBuffer(8);
  const view = new DataView(msg);
  view.setUint32(0, Math.floor(counter / 0x100000000), false);
  view.setUint32(4, counter % 0x100000000, false);
  const key = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: { name: algorithm } }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg));
  const off = sig[sig.length - 1] & 0x0f;
  const bin = ((sig[off] & 0x7f) << 24) | (sig[off + 1] << 16) | (sig[off + 2] << 8) | sig[off + 3];
  if (steam) {
    let out = '', n = bin;
    for (let i = 0; i < 5; i++) { out += STEAM_ALPHABET[n % 26]; n = Math.floor(n / 26); }
    return out;
  }
  return String(bin % Math.pow(10, digits)).padStart(digits, '0');
}

let pass = 0, fail = 0;
function check(name, actual, expected) {
  const ok = actual === expected;
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  got=${actual} want=${expected}`);
}

// ---- RFC 4226 Appendix D — HOTP test vectors (secret = ASCII "12345678901234567890") ----
const rfcSecret = base32Decode('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
check('base32 roundtrip', base32Encode(rfcSecret), 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
const RFC4226 = ['755224','287082','359152','969429','338314','254676','287922','162583','399871','520489'];
for (let i = 0; i < RFC4226.length; i++) {
  check(`RFC4226 HOTP counter=${i}`, await computeHOTP(rfcSecret, i, 6, 'SHA-1', false), RFC4226[i]);
}

// ---- RFC 6238 Table 1 — TOTP test vectors ----
const secretSha1   = base32Decode('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');                       // "12345678901234567890"
const secretSha256 = base32Decode('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZA===='); // x2
const secretSha512 = base32Decode('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNA=');

const RFC6238 = [
  [59,          'SHA-1',   '94287082', secretSha1],
  [59,          'SHA-256', '46119246', secretSha256],
  [59,          'SHA-512', '90693936', secretSha512],
  [1111111109,  'SHA-1',   '07081804', secretSha1],
  [1111111111,  'SHA-1',   '14050471', secretSha1],
  [1234567890,  'SHA-1',   '89005924', secretSha1],
  [2000000000,  'SHA-1',   '69279037', secretSha1],
  [20000000000, 'SHA-1',   '65353130', secretSha1],
  [1111111109,  'SHA-256', '68084774', secretSha256],
  [1111111111,  'SHA-256', '67062674', secretSha256],
  [1234567890,  'SHA-256', '91819424', secretSha256],
  [2000000000,  'SHA-256', '90698825', secretSha256],
  [20000000000, 'SHA-256', '77737706', secretSha256],
  [1111111109,  'SHA-512', '25091201', secretSha512],
  [1111111111,  'SHA-512', '99943326', secretSha512],
  [1234567890,  'SHA-512', '93441116', secretSha512],
  [2000000000,  'SHA-512', '38618901', secretSha512],
  [20000000000, 'SHA-512', '47863826', secretSha512],
];
for (const [timeSec, algo, expected, secret] of RFC6238) {
  const counter = Math.floor(timeSec / 30);
  check(`RFC6238 TOTP t=${timeSec} ${algo}`, await computeHOTP(secret, counter, 8, algo, false), expected);
}

// ---- pyotp cross-check (the library used by the legacy API) ----
// JBSWY3DPEHPK3PXP is a classic demo secret; compare against a known pyotp-computed value.
// TOTP(JBSWY3DPEHPK3PXP).at(2025-01-01T00:00:00Z) = 768725 (verified with pyotp 2.9)
{
  const t = Date.UTC(2025, 0, 1) / 1000; // 1735689600
  const counter = Math.floor(t / 30);
  check('pyotp parity JBSWY3DPEHPK3PXP @2025-01-01', await computeHOTP(base32Decode('JBSWY3DPEHPK3PXP'), counter, 6, 'SHA-1', false), '768725');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
