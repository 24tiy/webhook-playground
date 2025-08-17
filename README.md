# Webhook Playground

Minimal playground for verifying and storing payment webhooks from Stripe, PayPal, and Adyen. Runs locally, persists events to `data/events`, and can publish a static dashboard to GitHub Pages from `docs/`.

## Features
- Stripe raw-body signature verification
- PayPal signature verification via API `verify-webhook-signature`
- Adyen HMAC verification
- File-based storage with safe writes
- `/events` API to list recent events
- One-command sync to GitHub Pages with `npm run persist`

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
