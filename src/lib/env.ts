import "dotenv/config";

export const ENV = {
  PORT: Number(process.env.PORT ?? 3000),
  NODE_ENV: process.env.NODE_ENV ?? "development",
  AUTH_TOKEN: process.env.AUTH_TOKEN || "",

  STRIPE_ENDPOINT_SECRET: process.env.STRIPE_ENDPOINT_SECRET || "",

  PAYPAL: {
    ENV: (process.env.PAYPAL_ENV as "sandbox" | "live") || "sandbox",
    WEBHOOK_ID: process.env.PAYPAL_WEBHOOK_ID || "",
    CLIENT_ID: process.env.PAYPAL_CLIENT_ID || "",
    CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET || ""
  },

  ADYEN_HMAC_KEY: process.env.ADYEN_HMAC_KEY || ""
};

export const ENABLED = {
  STRIPE: !!ENV.STRIPE_ENDPOINT_SECRET,
  PAYPAL: !!(ENV.PAYPAL.WEBHOOK_ID && ENV.PAYPAL.CLIENT_ID && ENV.PAYPAL.CLIENT_SECRET),
  ADYEN: !!ENV.ADYEN_HMAC_KEY
};
