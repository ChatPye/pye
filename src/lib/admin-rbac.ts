// Secure RBAC (Role-Based Access Control) System with Clerk
import { auth } from '@clerk/nextjs/server';

export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin', 
  MODERATOR = 'moderator',
  SUPPORT = 'support'
}

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
  level: number;
  permissions: string[];
  createdAt: Date;
  lastLogin: Date;
  isActive: boolean;
  createdBy?: string;
}

// Role hierarchy and permissions
const ROLE_CONFIG: Record<AdminRole, {
  level: number;
  permissions: string[];
  canManageRoles: AdminRole[];
}> = {
  [AdminRole.SUPER_ADMIN]: {
    level: 1,
    permissions: ['*'], // All permissions
    canManageRoles: [AdminRole.ADMIN, AdminRole.MODERATOR, AdminRole.SUPPORT]
  },
  [AdminRole.ADMIN]: {
    level: 2,
    permissions: [
      'users.read', 'users.update', 'users.delete',
      'analytics.read', 'revenue.read',
      'coupons.read', 'coupons.create', 'coupons.update'
    ],
    canManageRoles: [AdminRole.MODERATOR, AdminRole.SUPPORT]
  },
  [AdminRole.MODERATOR]: {
    level: 3,
    permissions: [
      'users.read', 'users.update',
      'content.moderate', 'reports.read'
    ],
    canManageRoles: []
  },
  [AdminRole.SUPPORT]: {
    level: 4,
    permissions: [
      'users.read',
      'tickets.read', 'tickets.update'
    ],
    canManageRoles: []
  }
};

// Check if user has admin access using Clerk
export async function checkAdminAccess(): Promise<AdminUser | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    // Get user from Clerk with metadata
    const clerkUser = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!clerkUser.ok) return null;
    const user = await clerkUser.json();
    const email = user.email_addresses[0]?.email_address;

    if (!email) return null;

    // Check if user has admin role in Clerk public_metadata
    const adminRole = user.public_metadata?.admin_role;
    const adminLevel = user.public_metadata?.admin_level;

    if (!adminRole || !adminLevel) return null;

    return {
      id: user.id,
      email: email,
      role: adminRole as AdminRole,
      level: parseInt(adminLevel),
      permissions: ROLE_CONFIG[adminRole as AdminRole]?.permissions || [],
      createdAt: new Date(user.created_at),
      lastLogin: new Date(user.last_sign_in_at || user.created_at),
      isActive: user.public_metadata?.admin_active !== false,
      createdBy: user.public_metadata?.admin_created_by
    };
  } catch (error) {
    console.error('Error checking admin access:', error);
    return null;
  }
}

// Get admin user by email using Clerk
export async function getAdminUserByEmail(email: string): Promise<AdminUser | null> {
  try {
    // Search for user in Clerk by email
    const response = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}&limit=1`, {
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) return null;
    const data = await response.json();
    
    if (data.length === 0) return null;
    const user = data[0];

    const adminRole = user.public_metadata?.admin_role;
    const adminLevel = user.public_metadata?.admin_level;

    if (!adminRole || !adminLevel) return null;

    return {
      id: user.id,
      email: email,
      role: adminRole as AdminRole,
      level: parseInt(adminLevel),
      permissions: ROLE_CONFIG[adminRole as AdminRole]?.permissions || [],
      createdAt: new Date(user.created_at),
      lastLogin: new Date(user.last_sign_in_at || user.created_at),
      isActive: user.public_metadata?.admin_active !== false,
      createdBy: user.public_metadata?.admin_created_by
    };
  } catch (error) {
    console.error('Error getting admin user:', error);
    return null;
  }
}

// Create admin user in Clerk
export async function createAdminUser(
  email: string, 
  role: AdminRole, 
  createdBy: string
): Promise<AdminUser | null> {
  try {
    // First, check if user exists in Clerk
    const existingUser = await getAdminUserByEmail(email);
    if (existingUser) {
      // Update existing user with admin role
      return await updateAdminRole(existingUser.id, role, createdBy);
    }

    // Create invitation for new admin user
    const invitation = await fetch('https://api.clerk.com/v1/invitations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email_address: email,
        public_metadata: {
          admin_role: role,
          admin_level: ROLE_CONFIG[role].level.toString(),
          admin_active: true,
          admin_created_by: createdBy,
          admin_created_at: new Date().toISOString()
        },
        redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin`
      })
    });

    if (!invitation.ok) return null;
    const invitationData = await invitation.json();

    return {
      id: invitationData.id,
      email: email,
      role: role,
      level: ROLE_CONFIG[role].level,
      permissions: ROLE_CONFIG[role].permissions,
      createdAt: new Date(),
      lastLogin: new Date(),
      isActive: true,
      createdBy: createdBy
    };
  } catch (error) {
    console.error('Error creating admin user:', error);
    return null;
  }
}

// Check if user has specific permission
export function hasPermission(adminUser: AdminUser, permission: string): boolean {
  if (!adminUser || !adminUser.isActive) return false;
  
  // Super admin has all permissions
  if (adminUser.permissions.includes('*')) return true;
  
  return adminUser.permissions.includes(permission);
}

// Check if user can manage another role
export function canManageRole(adminUser: AdminUser, targetRole: AdminRole): boolean {
  if (!adminUser || !adminUser.isActive) return false;
  
  const config = ROLE_CONFIG[adminUser.role];
  return config?.canManageRoles?.includes(targetRole) || false;
}

// Get all admin users from Clerk
export async function getAllAdminUsers(): Promise<AdminUser[]> {
  try {
    const response = await fetch('https://api.clerk.com/v1/users?limit=100', {
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) return [];

    const data = await response.json();
    
    return data
      .filter((user: any) => user.public_metadata?.admin_role)
      .map((user: any) => ({
        id: user.id,
        email: user.email_addresses[0]?.email_address || '',
        role: user.public_metadata.admin_role as AdminRole,
        level: parseInt(user.public_metadata.admin_level || '0'),
        permissions: ROLE_CONFIG[user.public_metadata.admin_role as AdminRole]?.permissions || [],
        createdAt: new Date(user.created_at),
        lastLogin: new Date(user.last_sign_in_at || user.created_at),
        isActive: user.public_metadata.admin_active !== false,
        createdBy: user.public_metadata.admin_created_by
      }));
  } catch (error) {
    console.error('Error getting all admin users:', error);
    return [];
  }
}

// Update admin user role in Clerk
export async function updateAdminRole(
  userId: string, 
  newRole: AdminRole, 
  updatedBy: string
): Promise<AdminUser | null> {
  try {
    const response = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        public_metadata: {
          admin_role: newRole,
          admin_level: ROLE_CONFIG[newRole].level.toString(),
          admin_updated_by: updatedBy,
          admin_updated_at: new Date().toISOString()
        }
      })
    });

    if (!response.ok) return null;
    const user = await response.json();

    return {
      id: user.id,
      email: user.email_addresses[0]?.email_address || '',
      role: newRole,
      level: ROLE_CONFIG[newRole].level,
      permissions: ROLE_CONFIG[newRole].permissions,
      createdAt: new Date(user.created_at),
      lastLogin: new Date(user.last_sign_in_at || user.created_at),
      isActive: true,
      createdBy: updatedBy
    };
  } catch (error) {
    console.error('Error updating admin role:', error);
    return null;
  }
}

// Deactivate admin user in Clerk
export async function deactivateAdmin(userId: string, deactivatedBy: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        public_metadata: {
          admin_active: false,
          admin_deactivated_by: deactivatedBy,
          admin_deactivated_at: new Date().toISOString()
        }
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Error deactivating admin:', error);
    return false;
  }
}
