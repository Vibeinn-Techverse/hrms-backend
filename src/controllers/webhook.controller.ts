
// ============================================
// src/controllers/webhook.controller.ts - FIXED
// ============================================
import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import ClerkConfig from '../config/clerk.config';

export class WebhookController {
  /**
   * Handle Clerk webhook events
   */
  static async handleClerkWebhook(req: Request, res: Response) {
    try {
      console.log('📥 Received Clerk webhook');

      // Get raw body (should be Buffer from express.raw middleware)
      const payload = (req as any).body;
      const headers = req.headers as Record<string, string>;

      // Verify webhook signature
      const evt = await ClerkConfig.verifyWebhook(payload, headers);

      if (!evt) {
        console.error('❌ Invalid webhook signature');
        return res.status(401).json({
          success: false,
          message: 'Invalid webhook signature',
        });
      }

      const { type, data } = evt as any;

      console.log('📋 Webhook event type:', type);

      // Handle different webhook events
      switch (type) {
        case 'user.created':
          // Sync Clerk user to database
          console.log('ℹ️ New user signed up with Clerk:', data.id);
          await AuthService.syncClerkUserToDatabase(data);
          console.log('✅ User synced to database');
          break;

        case 'user.updated':
          // Only update if user exists in DB
          const existingUser = await AuthService.getUserByClerkId(data.id);
          if (existingUser) {
            await AuthService.handleClerkUserUpdate(data);
            console.log('✅ User updated');
          } else {
            console.log('ℹ️ User not in DB yet, skipping update');
          }
          break;

        case 'user.deleted':
          await AuthService.handleClerkUserDeletion(data.id);
          console.log('✅ User deleted/deactivated');
          break;

        default:
          console.log('ℹ️ Unhandled webhook event type:', type);
      }

      return res.status(200).json({
        success: true,
        message: 'Webhook processed successfully',
      });
    } catch (error: any) {
      console.error('❌ Webhook processing error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error processing webhook',
        error: error.message,
      });
    }
  }
}