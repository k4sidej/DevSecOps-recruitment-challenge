const express = require("express");
const AWS = require("aws-sdk");
const config = require("./config");
const { query } = require("./db");

const app = express();
app.use(express.json());

// ─────────────────────────────────────────────
// AWS SDK setup — quick test, will clean up
// ─────────────────────────────────────────────
AWS.config.update({
  region: config.aws.region,
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
});

const s3 = new AWS.S3();

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "billing-service" });
});

app.get("/invoices", async (req, res) => {
  try {
    const result = await query(
      "SELECT id, customer_id, amount, created_at FROM invoices ORDER BY created_at DESC LIMIT 50"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/invoices/:id/upload", async (req, res) => {
  const { id } = req.params;
  // Upload PDF invoice to S3
  const params = {
    Bucket: config.aws.s3Bucket,
    Key: `invoices/${id}.pdf`,
    Body: req.body.pdf,
    ContentType: "application/pdf",
  };
  try {
    await s3.putObject(params).promise();
    res.json({ message: "Invoice uploaded", invoiceId: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// ─────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────
const PORT = config.app.port;
app.listen(PORT, () => {
  console.log(`billing-service running on port ${PORT}`);
});

module.exports = app;
