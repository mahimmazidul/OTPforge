# OTPForge

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

OTPForge is a secure, time- and counter-based One-Time Password (OTP) API.  
It supports TOTP (time-based) and HOTP (counter-based) OTP generation, ideal for authentication systems, apps, or testing purposes.


## Features
* Generate TOTP (time-based) OTPs
* Generate HOTP (counter-based) OTPs
* JSON API with live Try-It support
* CORS enabled for web usage
* Rate-limited: 60 requests per minute per IP
* Lightweight and easy to deploy with Flask

## Installation

Make sure you have Python 3.9+ installed. Then:

```
git clone https://github.com/mahimmazidul/OTPforge.git
cd otpforge 
pip install -r requirements.txt
```


## Running the App

```
python main.py
```

By default, the app runs on:

`
http://127.0.0.1:5005/get-otp
`



## API Documentation

Endpoint: POST `/get-otp`  
Content-Type: `application/json`  

### Request Format

Send a JSON payload like this:

```
{
  "key": "JBSWY3DPEHPK3PXP",
  "type": "time",
  "username": "alice",
  "counter": 0
}
```

- `key`: Optional; if omitted, a new key is generated.  
- `type`: Required; "time" for TOTP, "counter" for HOTP.  
- `username`: Optional; used to track counters for HOTP.  
- `counter`: Optional; used for testing HOTP.



### Responses

TOTP (Time-Based)

```
{
  "status": "ok",
  "type": "time",
  "username": "alice",
  "key": "JBSWY3DPEHPK3PXP",
  "otp": "492039",
  "remaining_seconds": 18
}
```

- `remaining_seconds`: seconds until the OTP expires.

#### HOTP (Counter-Based)

```
{
  "status": "ok",
  "type": "counter",
  "username": "bob",
  "key": "JBSWY3DPEHPK3PXP",
  "otp": "583927",
  "counter_used": 0,
  "next_counter": 1
}
```

- `counter_used`: counter used to generate OTP.  
- `next_counter`: next valid counter.


## Example Python Usage

```
import requests

url = "https://mahim.dev/get-otp"
payload = {
    "key": "JBSWY3DPEHPK3PXP",
    "type": "time",
    "username": "alice"
}

response = requests.post(url, json=payload)
print(response.json())
```


## Author

Mazidul Islam Mahim  
Email: meow@mahim.dev  
GitHub: https://github.com/mahimmazidul

