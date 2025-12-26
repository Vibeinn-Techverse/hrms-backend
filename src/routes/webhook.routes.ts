// ============================================
// FILE 6: src/routes/webhook.routes.ts
// ============================================
import express from 'express';
import { WebhookController } from '../controllers/webhook.controller';

const router = express.Router();

// Clerk webhook endpoint (raw body middleware applied in server.ts)
router.post('/clerk', WebhookController.handleClerkWebhook);

export default router;