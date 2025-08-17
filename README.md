
# Webhook Playground

Minimal playground for verifying and storing payment webhooks from **Stripe**, **PayPal**, and **Adyen**.  
Runs locally, persists events to `data/events`, and can publish a static dashboard to GitHub Pages from `docs/`.

## Features
- Stripe raw-body signature verification
- PayPal signature verification via API `verify-webhook-signature`
- Adyen HMAC verification
- File-based storage
- `/events` API to list recent events
- `npm run persist` → copy events to `docs/` for static dashboard

## Requirements
- Node.js 20+
- GitHub repository with Pages enabled (from `docs/`)

## Setup
```bash
git clone https://github.com/<you>/webhook-playground.git
cd webhook-playground
cp .env.example .env
npm install
npm run dev
````

Server runs at:
`http://localhost:3000`

## Environment

Create `.env` file:

```
PORT=3000

# Stripe
STRIPE_ENDPOINT_SECRET=whsec_xxx

# PayPal
PAYPAL_ENV=sandbox
PAYPAL_WEBHOOK_ID=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=

# Adyen
ADYEN_HMAC_KEY=
```

## Endpoints

* `POST /webhooks/stripe`
* `POST /webhooks/paypal`
* `POST /webhooks/adyen`
* `GET  /events`
* `POST /__test_write`

## Quick test

```bash
curl -s -X POST http://localhost:3000/__test_write \
  -H "Content-Type: application/json" \
  -d '{"hello":"world"}'
```

```bash
curl -s http://localhost:3000/events
```

## Stripe

```bash
curl -s -X POST http://localhost:3000/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: test" \
  -d '{"id":"evt_test","object":"event","type":"test.ping"}'
```

## PayPal

```bash
curl -s -X POST http://localhost:3000/webhooks/paypal \
  -H "Content-Type: application/json" \
  -d '{"id":"WH-TEST","event_type":"PAYMENT.CAPTURE.COMPLETED"}'
```

## Adyen

```bash
curl -s -X POST http://localhost:3000/webhooks/adyen \
  -H "Content-Type: application/json" \
  -d '{"notificationItems":[{"NotificationRequestItem":{"eventCode":"AUTHORISATION","success":"true","pspReference":"ABC123","merchantReference":"ORDER1","merchantAccountCode":"ACCT","amount":{"value":1000,"currency":"EUR"},"additionalData":{"hmacSignature":"xxx"}}}]}'
```

## Publish dashboard to GitHub Pages

```bash
npm run persist
```

Events will be copied into `docs/events/` and available at GitHub Pages.

````

---

### `.env.example`
```env
PORT=3000

# Stripe
STRIPE_ENDPOINT_SECRET=whsec_xxx

# PayPal
PAYPAL_ENV=sandbox
PAYPAL_WEBHOOK_ID=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=

# Adyen
ADYEN_HMAC_KEY=
````

---

Хочешь, я следующим шагом соберу тебе `Dockerfile` и `docker-compose.yml`, чтобы любой человек мог запустить без npm install?
