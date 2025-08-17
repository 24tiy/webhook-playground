# Webhook Playground

Minimal server to receive and debug webhooks from payment providers (Stripe, PayPal, Adyen).  
Incoming events are stored as JSON files and exposed via a small API.

## Quickstart

```bash
git clone https://github.com/24tiy/webhook-playground.git
cd webhook-playground
cp .env.example .env
npm install
npm run dev
````

Server runs at: [http://localhost:3000](http://localhost:3000)

## Environment

Fill `.env` (see `.env.example` below).
Stripe needs the raw body for signature verification — this is already configured in the server.

### `.env.example`

```env
PORT=3000

# Stripe
STRIPE_ENDPOINT_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx

# PayPal
PAYPAL_ENV=sandbox
PAYPAL_WEBHOOK_ID=your-webhook-id
PAYPAL_CLIENT_ID=your-client-id
PAYPAL_CLIENT_SECRET=your-client-secret

# Adyen
ADYEN_HMAC_KEY=your-hmac-key-hex-or-base64
```

## Endpoints

| Method | Path               | Description                       |
| -----: | ------------------ | --------------------------------- |
|   POST | `/webhooks/stripe` | Receive Stripe webhooks           |
|   POST | `/webhooks/paypal` | Receive PayPal webhooks           |
|   POST | `/webhooks/adyen`  | Receive Adyen webhooks            |
|    GET | `/events`          | List stored events                |
|    GET | `/__diag`          | Diagnostics (data dir, files)     |
|   POST | `/__test_write`    | Create a debug event              |
|   POST | `/persist`         | Copy events to `docs/` and commit |

## Storage

Events are written to `data/events/*.json`.
`npm run persist` copies them to `docs/events/` and builds `docs/events.json` for GitHub Pages.

## Local smoke test

```bash
curl -s -X POST http://localhost:3000/__test_write \
  -H "content-type: application/json" \
  -d '{"ping":1}' | jq .

curl -s http://localhost:3000/events | jq .
```

## Provider test stubs

Stripe:

```bash
curl -s -X POST http://localhost:3000/webhooks/stripe \
  -H "content-type: application/json" \
  -H "Stripe-Signature: test" \
  -d '{"id":"evt_test","object":"event","type":"test.ping"}' | jq .
```

PayPal:

```bash
curl -s -X POST http://localhost:3000/webhooks/paypal \
  -H "content-type: application/json" \
  -H "paypal-transmission-id: TID" \
  -H "paypal-transmission-time: 2025-01-01T00:00:00Z" \
  -H "paypal-auth-algo: SHA256withRSA" \
  -H "paypal-cert-url: https://api-m.sandbox.paypal.com/certs/test" \
  -H "paypal-transmission-sig: test" \
  -d '{"id":"WH-TEST","event_type":"PAYMENT.CAPTURE.COMPLETED"}' | jq .
```

Adyen:

```bash
curl -s -X POST http://localhost:3000/webhooks/adyen \
  -H "content-type: application/json" \
  -d '{"notificationItems":[{"NotificationRequestItem":{"eventCode":"AUTHORISATION","success":"true","pspReference":"ABC123","merchantReference":"ORDER1","amount":{"value":1000,"currency":"EUR"},"additionalData":{"hmacSignature":"xxx"}}}]}' | jq .
```

## GitHub Pages

Enable: Settings → Pages → Deploy from a branch → Branch `main`, Folder `/docs`.
Publish your events:

```bash
npm run persist
```

## Env matrix

| Provider | Required variables                                                            |
| -------- | ----------------------------------------------------------------------------- |
| Stripe   | `STRIPE_ENDPOINT_SECRET`                                                      |
| PayPal   | `PAYPAL_ENV`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` |
| Adyen    | `ADYEN_HMAC_KEY`                                                              |

## License
[MIT](https://github.com/24tiy/webhook-playground/blob/main/license)
