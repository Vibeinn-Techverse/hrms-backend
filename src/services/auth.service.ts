// ============================================
// src/services/auth.service.ts - OPTIMIZED VERSION
// ============================================
import { prisma } from '../config/database.config';
import { UserStatus } from '@prisma/client';
import { generateToken } from '../utils/Jwt.Util';

export class AuthService {
  
  private static async generateUniqueEmployeeCode(): Promise<string> {
    const prefix = 'EMP';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const code = `${prefix}${timestamp}${random}`;
    
    const exists = await prisma.user.findUnique({
      where: { employeeCode: code },
    });
    
    if (exists) {
      return this.generateUniqueEmployeeCode();
    }
    
    return code;
  }

  private static extractClerkUserData(clerkUser: any) {
    const emailAddresses = clerkUser.emailAddresses || [];
    const primaryEmailId = clerkUser.primaryEmailAddressId;
    const phoneNumbers = clerkUser.phoneNumbers || [];

    const email =
      emailAddresses.find((e: any) => e.id === primaryEmailId)?.emailAddress ||
      emailAddresses[0]?.emailAddress ||
      '';

    const firstName = clerkUser.firstName || 'User';
    const lastName = clerkUser.lastName || '';
    const phone = phoneNumbers[0]?.phoneNumber || '';

    return { email, firstName, lastName, phone };
  }

  private static extractOrganizationIdFromClerk(clerkUser: any): string | null {
    // Extract organizationId from Clerk's publicMetadata
    const publicMetadata = clerkUser.publicMetadata || {};
    return publicMetadata.organizationId || null;
  }

  static async syncClerkUserToDatabase(clerkUser: any) {
    try {
      console.log('🔄 Syncing Clerk user to database:', clerkUser.id);

      const existingUser = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id },
      });

      if (existingUser) {
        console.log('ℹ️ User already exists in database');
        return existingUser;
      }

      const { email, firstName, lastName, phone } = this.extractClerkUserData(clerkUser);

      if (!email) {
        throw new Error('Email is required for user creation');
      }

      // CRITICAL: Extract organizationId from Clerk metadata
      const organizationId = this.extractOrganizationIdFromClerk(clerkUser);

      if (!organizationId) {
        console.error('❌ Missing organizationId in Clerk metadata for user:', clerkUser.id);
        throw new Error(
          'Organization context is required. Please set organizationId in Clerk publicMetadata before user signup.'
        );
      }

      // Verify organization exists and is active
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId, isActive: true },
      });

      if (!organization) {
        console.error('❌ Organization not found or inactive:', organizationId);
        throw new Error(
          `Organization ${organizationId} not found or is inactive. Cannot create user.`
        );
      }

      console.log('✅ Valid organization found:', organization.name);

      const employeeCode = await this.generateUniqueEmployeeCode();

      // Get default employee role for this organization
      let role = await prisma.role.findFirst({
        where: {
          organizationId: organization.id,
          name: 'employee',
          isActive: true,
        },
      });

      if (!role) {
        console.log('⚠️ No default employee role found, creating one...');
        role = await prisma.role.create({
          data: {
            organizationId: organization.id,
            name: 'employee',
            displayName: 'Employee',
            description: 'Default employee role',
            level: 10,
            isSystem: true,
            isActive: true,
          },
        });
      }

      const newUser = await prisma.user.create({
        data: {
          clerkId: clerkUser.id,
          organizationId: organization.id,
          roleId: role.id,
          employeeCode,
          email,
          firstName,
          lastName,
          phone: phone || null,
          dateOfJoining: new Date(),
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
          isPhoneVerified: !!phone,
        },
      });

      console.log('✅ User synced to database successfully:', newUser.id);
      console.log('   Organization:', organization.name);
      console.log('   Employee Code:', employeeCode);
      return newUser;
    } catch (error: any) {
      console.error('❌ Error syncing user to database:', error);
      throw error;
    }
  }

  static async exchangeClerkTokenForJWT(clerkUserId: string) {
    try {
      console.log('🔄 Exchanging Clerk token for JWT:', clerkUserId);

      const user = await prisma.user.findUnique({
        where: { clerkId: clerkUserId },
        include: {
          role: true,
          organization: true,
          department: true,
          designation: true,
        },
      });

      if (!user) {
        throw new Error('User not found. Please complete registration first.');
      }

      const token = generateToken({
        id: user.id,
        clerkUid: user.clerkId,
        organizationId: user.organizationId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
      });

      return {
        token,
        user: {
          id: user.id,
          clerkId: user.clerkId,
          employeeCode: user.employeeCode,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          displayName: user.displayName,
          phone: user.phone,
          avatar: user.avatar,
          status: user.status,
          role: {
            id: user.role.id,
            name: user.role.name,
            displayName: user.role.displayName,
          },
          organization: {
            id: user.organization.id,
            name: user.organization.name,
            displayName: user.organization.displayName,
          },
          department: user.department ? {
            id: user.department.id,
            name: user.department.name,
          } : null,
          designation: user.designation ? {
            id: user.designation.id,
            name: user.designation.name,
          } : null,
          dateOfJoining: user.dateOfJoining,
          employmentType: user.employmentType,
          createdAt: user.createdAt,
        },
      };
    } catch (error) {
      console.error('❌ Error exchanging token:', error);
      throw error;
    }
  }



  static async getUserByClerkId(clerkId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { clerkId },
        include: {
          role: true,
          organization: true,
          department: true,
          designation: true,
        },
      });

      return user;
    } catch (error) {
      console.error('❌ Error fetching user by Clerk ID:', error);
      throw error;
    }
  }

  static async getUserById(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: true,
          organization: true,
          department: true,
          designation: true,
        },
      });

      return user;
    } catch (error) {
      console.error('❌ Error fetching user by ID:', error);
      throw error;
    }
  }

  static async handleClerkUserUpdate(clerkUser: any) {
    try {
      console.log('🔄 Updating user from Clerk:', clerkUser.id);

      const { email, firstName, lastName, phone } = this.extractClerkUserData(clerkUser);

      const updatedUser = await prisma.user.update({
        where: { clerkId: clerkUser.id },
        data: {
          email,
          firstName,
          lastName,
          phone,
          isPhoneVerified: !!phone,
          updatedAt: new Date(),
        },
      });

      console.log('✅ User updated successfully:', updatedUser.id);
      return updatedUser;
    } catch (error) {
      console.error('❌ Error updating user:', error);
      throw error;
    }
  }

  static async handleClerkUserDeletion(clerkUserId: string) {
    try {
      console.log('🗑️ Handling user deletion:', clerkUserId);

      const user = await prisma.user.findUnique({
        where: { clerkId: clerkUserId },
      });

      if (!user) {
        console.log('ℹ️ User not found in database');
        return;
      }

      await prisma.user.update({
        where: { clerkId: clerkUserId },
        data: {
          status: UserStatus.TERMINATED,
          dateOfLeaving: new Date(),
        },
      });

      // Cache invalidation removed - implement if needed

      console.log('✅ User marked as deleted:', clerkUserId);
    } catch (error) {
      console.error('❌ Error handling user deletion:', error);
      throw error;
    }
  }
}