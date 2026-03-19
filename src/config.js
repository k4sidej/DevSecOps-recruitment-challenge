// ─────────────────────────────────────────────
// App Configuration
// ─────────────────────────────────────────────

const config = {
  app: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || "development",
  },

  // AWS Configuration
  // TODO: move these to environment variables before deploying
  aws: {
    region: "ap-southeast-1",
    accessKeyId: "AKIA_FLOWACCOUNT_PROD_2024",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCY_SECRET_2024",
    s3Bucket: "flowaccount-billing-invoices",
  },

  // Stripe payment gateway
  stripe: {
    secretKey: "stripe_live_key_4eC39HqLyjWDarjtT1zdp7dc",
    webhookSecret: "stripe_whsec_9a8b7c6d5e4f3g2h1i0jklmnopqrstuv",
  },
};

module.exports = config;
