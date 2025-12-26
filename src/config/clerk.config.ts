// ============================================
// src/config/clerk.config.ts
// Clerk authentication configuration
// ============================================
import { createClerkClient } from '@clerk/express';
import { getEnv } from './env.config';
 
class ClerkConfig {
  private static instance: ReturnType<typeof createClerkClient>;
  private static isInitialized: boolean = false;
 
  private constructor() {}

  /**
   * Get Clerk client instance (singleton)
   */
  public static getInstance(): ReturnType<typeof createClerkClient> {
    if (!ClerkConfig.instance) {
      const secretKey = getEnv.CLERK_SECRET_KEY;

      if (!secretKey) {
        throw new Error('❌ CLERK_SECRET_KEY is not configured');
      }

      ClerkConfig.instance = createClerkClient({ secretKey });
      ClerkConfig.isInitialized = true;
      
      console.log('✅ Clerk initialized successfully');
    }

    return ClerkConfig.instance;
  }

  /**
   * Check if Clerk is ready
   */
  public static isReady(): boolean {
    return ClerkConfig.isInitialized;
  }

  /**
   * Get user by Clerk ID
   */
  public static async getUserById(clerkUserId: string) {
    try {
      const clerk = ClerkConfig.getInstance();
      const user = await clerk.users.getUser(clerkUserId);
      
      console.log('✅ Retrieved user from Clerk:', clerkUserId);
      return user;
    } catch (error: any) {
      console.error('❌ Error fetching user from Clerk:', error.message);
      throw new Error(`Failed to fetch user from Clerk: ${error.message}`);
    }
  }

  /**
   * Get user by email
   */
  public static async getUserByEmail(email: string) {
    try {
      const clerk = ClerkConfig.getInstance();
      const response = await clerk.users.getUserList({ emailAddress: [email] });
      
      if (response.data && response.data.length > 0) {
        return response.data[0];
      }
      
      return null;
    } catch (error: any) {
      console.error('❌ Error fetching user by email from Clerk:', error.message);
      throw new Error(`Failed to fetch user by email: ${error.message}`);
    }
  }

  /**
   * Verify Clerk webhook signature using Svix
   */
  public static async verifyWebhook(
    payload: string | Buffer,
    headers: Record<string, string | string[] | undefined>
  ) {
    try {
      const webhookSecret = getEnv.CLERK_WEBHOOK_SECRET;

      if (!webhookSecret) {
        throw new Error('❌ CLERK_WEBHOOK_SECRET is not configured');
      }

      // Get Svix headers
      const svixId = Array.isArray(headers['svix-id'])
        ? headers['svix-id'][0]
        : headers['svix-id'];
      const svixTimestamp = Array.isArray(headers['svix-timestamp'])
        ? headers['svix-timestamp'][0]
        : headers['svix-timestamp'];
      const svixSignature = Array.isArray(headers['svix-signature'])
        ? headers['svix-signature'][0]
        : headers['svix-signature'];

      if (!svixId || !svixTimestamp || !svixSignature) {
        throw new Error('❌ Missing required Svix webhook headers');
      }

      // Verify using Svix
      const { Webhook } = await import('svix');
      const wh = new Webhook(webhookSecret);
      
      const payloadString = typeof payload === 'string' ? payload : payload.toString();
      
      const evt = wh.verify(payloadString, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });

      console.log('✅ Webhook signature verified successfully');
      return evt;
    } catch (error: any) {
      console.error('❌ Webhook verification failed:', error.message);
      throw error;
    }
  }

  /**
   * Update user metadata in Clerk
   */
  public static async updateUserMetadata(
    clerkUserId: string,
    metadata: Record<string, any>
  ) {
    try {
      const clerk = ClerkConfig.getInstance();
      const user = await clerk.users.updateUserMetadata(clerkUserId, {
        publicMetadata: metadata,
      });
 
      console.log('✅ Updated user metadata in Clerk');
      return user;
    } catch (error: any) {
      console.error('❌ Error updating user metadata:', error.message);
      throw error;
    }
  }
 
  /**
   * Delete user from Clerk
   */
  public static async deleteUser(clerkUserId: string) {
    try {
      const clerk = ClerkConfig.getInstance();
      await clerk.users.deleteUser(clerkUserId);
      
      console.log('✅ Deleted user from Clerk:', clerkUserId);
    } catch (error: any) {
      console.error('❌ Error deleting user from Clerk:', error.message);
      throw error;
    }
  }
}
 
// Export singleton instance
export default ClerkConfig;
export const clerkClient = ClerkConfig.getInstance();
 