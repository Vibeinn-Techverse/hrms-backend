import express from "express";
import dotenv from "dotenv";
import webhookRoutes from './routes/webhook.routes';

dotenv.config();

const app = express();

// Webhook routes (need raw body for signature verification)
app.use('/api/v1/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

// Regular JSON parsing for other routes
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "HRMS backend is running"
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
