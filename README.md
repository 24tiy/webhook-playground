# Webhook Playground

Receive Stripe, Adyen, and PayPal webhooks in a GitHub Codespace, store events as JSON under `data/events`, and publish a static dashboard on GitHub Pages.

## Quick start
1) Create a repo and add these files.
2) Open the repo in GitHub Codespaces.
3) In the terminal:


cp .env.example .env
npm install
npm run dev

4) In the Ports panel, set port 3000 to Public and copy the URL.
5) Configure webhooks:
- Stripe: `https://<codespace-url>/webhooks/stripe` and set `STRIPE_ENDPOINT_SECRET` in `.env`
- Adyen: `https://<codespace-url>/webhooks/adyen` and set `ADYEN_HMAC_KEY`
- PayPal: `https://<codespace-url>/webhooks/paypal` and set `PAYPAL_WEBHOOK_ID`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV`

Webhooks are saved to `data/events`. Run:


npm run persist

This commits `data/` to `main`. The Pages workflow publishes a dashboard from `docs/`.

## Scripts
- `npm run dev` start server in Codespaces
- `npm run build` compile TypeScript
- `npm run start` run compiled server
- `npm run persist` add/commit/push `data/` to `main`

## Endpoints
- `POST /webhooks/stripe`
- `POST /webhooks/adyen`
- `POST /webhooks/paypal`
- `GET  /events`
- `GET  /events/:id`

## License
MIT
