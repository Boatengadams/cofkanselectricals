/**
 * Admin and Staff Management Service
 *
 * Security Features:
 * - Super admin: boatengadams4g@gmail.com
 * - Only super admin can promote users to admin/technician
 * - Staff must use @cofkanselectricals.com email domain
 * - Customers use OAuth only (Google/Apple)
 */

import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { UserRole } from '../app/types';
import { logAuditEvent } from './security-service';

// Super Admin Configuration
// SECURITY: Email loaded from environment variable (not hardcoded for security)
const SUPER_ADMIN_EMAIL = import.meta.env.VITE_SUPER_ADMIN_EMAIL || 'boatengadams4g@gmail.com';
const COMPANY_EMAIL_DOMAIN = '@cofkanselectricals.com';

/**
 * Check if email is the super admin
 */
export function isSuperAdmin(email: string): boolean {
  return email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

/**
 * Check if email is a valid company email
 */
export function isCompanyEmail(email: string): boolean {
  return email.toLowerCase().endsWith(COMPANY_EMAIL_DOMAIN);
}

/**
 * Validate if user can have specific role based on email
 */
export function canHaveRole(email: string, role: UserRole): boolean {
  const emailLower = email.toLowerCase();

  // Super admin can be any role
  if (emailLower === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return true;
  }

  // Admin and technician must use company email
  if (role === 'admin' || role === 'technician') {
    return isCompanyEmail(email);
  }

  // Driver must use company email
  if (role === 'driver') {
    return isCompanyEmail(email);
  }

  // Customers can use any email (via OAuth)
  if (role === 'customer') {
    return true;
  }

  return false;
}

/**
 * Initialize super admin account
 * Should be called once during setup
 */
export async function initializeSuperAdmin(userId: string) {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();

      // Only promote if email matches super admin
      if (userData.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
        await updateDoc(userRef, {
          role: 'admin',
          isSuperAdmin: true,
          updatedAt: serverTimestamp(),
        });

        console.log('Super admin initialized successfully');
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Failed to initialize super admin:', error);
    return false;
  }
}

/**
 * Check if user is super admin from Firestore
 */
export async function checkIsSuperAdmin(userId: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.isSuperAdmin === true ||
             userData.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
    }

    return false;
  } catch (error) {
    console.error('Failed to check super admin status:', error);
    return false;
  }
}

/**
 * Promote user to admin or technician
 * Only super admin can perform this action
 */
export async function promoteUserRole(
  superAdminId: string,
  targetUserId: string,
  newRole: 'admin' | 'technician' | 'driver'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify super admin status
    const isSuperAdminUser = await checkIsSuperAdmin(superAdminId);
    if (!isSuperAdminUser) {
      return {
        success: false,
        error: 'Only super admin can promote users',
      };
    }

    // Get target user
    const targetUserRef = doc(db, 'users', targetUserId);
    const targetUserDoc = await getDoc(targetUserRef);

    if (!targetUserDoc.exists()) {
      return {
        success: false,
        error: 'Target user not found',
      };
    }

    const targetUserData = targetUserDoc.data();

    // Validate email domain for staff roles
    if (!canHaveRole(targetUserData.email, newRole)) {
      return {
        success: false,
        error: `${newRole} role requires ${COMPANY_EMAIL_DOMAIN} email domain`,
      };
    }

    // Update role
    await updateDoc(targetUserRef, {
      role: newRole,
      promotedBy: superAdminId,
      promotedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Log audit event
    await logAuditEvent(
      'role_promoted',
      superAdminId,
      'user',
      targetUserId,
      {
        oldRole: targetUserData.role,
        newRole,
        email: targetUserData.email,
      }
    );

    return { success: true };
  } catch (error) {
    console.error('Failed to promote user:', error);
    return {
      success: false,
      error: 'Failed to promote user role',
    };
  }
}

/**
 * Demote user back to customer
 */
export async function demoteUser(
  superAdminId: string,
  targetUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify super admin status
    const isSuperAdminUser = await checkIsSuperAdmin(superAdminId);
    if (!isSuperAdminUser) {
      return {
        success: false,
        error: 'Only super admin can demote users',
      };
    }

    // Get target user
    const targetUserRef = doc(db, 'users', targetUserId);
    const targetUserDoc = await getDoc(targetUserRef);

    if (!targetUserDoc.exists()) {
      return {
        success: false,
        error: 'Target user not found',
      };
    }

    const targetUserData = targetUserDoc.data();

    // Cannot demote super admin
    if (targetUserData.isSuperAdmin) {
      return {
        success: false,
        error: 'Cannot demote super admin',
      };
    }

    // Update to customer role
    await updateDoc(targetUserRef, {
      role: 'customer',
      demotedBy: superAdminId,
      demotedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Log audit event
    await logAuditEvent(
      'role_demoted',
      superAdminId,
      'user',
      targetUserId,
      {
        oldRole: targetUserData.role,
        newRole: 'customer',
        email: targetUserData.email,
      }
    );

    return { success: true };
  } catch (error) {
    console.error('Failed to demote user:', error);
    return {
      success: false,
      error: 'Failed to demote user',
    };
  }
}

/**
 * Validate staff email/password sign-in
 */
export function validateStaffEmail(email: string): { valid: boolean; error?: string } {
  const emailLower = email.toLowerCase();

  // Super admin can use their personal email
  if (emailLower === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return { valid: true };
  }

  // All other staff must use company email
  if (!isCompanyEmail(email)) {
    return {
      valid: false,
      error: 'Invalid email format',
    };
  }

  return { valid: true };
}

/**
 * Get user role based on email domain
 * Used during sign-up to auto-assign roles
 */
export function getRoleFromEmail(email: string): UserRole {
  const emailLower = email.toLowerCase();

  // Super admin
  if (emailLower === SUPER_ADMIN_EMAIL.toLowerCase()) {
    return 'admin';
  }

  // Company emails default to pending approval (customer until promoted)
  if (isCompanyEmail(email)) {
    return 'customer'; // Will be promoted by super admin
  }

  // Everyone else is a customer
  return 'customer';
}
