import { initializeApp, deleteApp, getApp, getApps } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { logAuditEvent } from './security-service';
import { checkIsSuperAdmin, canHaveRole } from './admin-service';

const COMPANY_DOMAIN = '@cofkanselectricals.com';

export function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  const arr = new Uint32Array(12);
  crypto.getRandomValues(arr);
  for (const n of arr) out += chars[n % chars.length];
  return out + '!9';
}

function normaliseUsername(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
}

/**
 * Create a worker account from the super admin UI.
 *
 * Admin supplies username, display name, role, and an initial password
 * (typed or generated). The worker uses this temp password to sign in for
 * the first time; the `mustChangePassword` flag forces them to set a new
 * one before they can use the app freely.
 *
 * Uses a SECONDARY Firebase app so the current admin's session isn't
 * replaced when createUserWithEmailAndPassword auto-signs-in the new user.
 */
export async function createWorkerAccount(opts: {
  creatorUserId: string;
  username: string;
  displayName: string;
  role: 'admin' | 'technician' | 'driver';
  password: string;
}): Promise<{ success: boolean; email?: string; password?: string; error?: string }> {
  const username = normaliseUsername(opts.username);
  if (!username) return { success: false, error: 'Username is required.' };
  if (!opts.displayName.trim()) return { success: false, error: 'Display name is required.' };
  if (!opts.password || opts.password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters.' };
  }

  const email = `${username}${COMPANY_DOMAIN}`;
  if (!canHaveRole(email, opts.role)) {
    return { success: false, error: 'Role not permitted for this email.' };
  }

  const isSuper = await checkIsSuperAdmin(opts.creatorUserId);
  if (!isSuper) return { success: false, error: 'Only super admin can create workers.' };

  const primary = getApp();
  const secondaryName = `worker-create-${Date.now()}`;
  const secondary = getApps().find(a => a.name === secondaryName)
    ?? initializeApp(primary.options, secondaryName);
  const secondaryAuth = getAuth(secondary);

  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, opts.password);
    await updateProfile(cred.user, { displayName: opts.displayName });

    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      email,
      displayName: opts.displayName,
      phoneNumber: null,
      photoURL: null,
      provider: 'email',
      emailVerified: false,
      role: opts.role,
      isSuperAdmin: false,
      mustChangePassword: true,
      createdBy: opts.creatorUserId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await firebaseSignOut(secondaryAuth);

    await logAuditEvent('worker_created', opts.creatorUserId, 'user', cred.user.uid, {
      email, role: opts.role,
    });

    return { success: true, email, password: opts.password };
  } catch (e: any) {
    if (e?.code === 'auth/email-already-in-use') {
      return { success: false, error: 'That username is already taken.' };
    }
    if (e?.code === 'auth/weak-password') {
      return { success: false, error: 'Password too weak. Use 8+ chars with a number.' };
    }
    console.error('createWorkerAccount failed:', e);
    return { success: false, error: e?.message || 'Failed to create worker account.' };
  } finally {
    try { await deleteApp(secondary); } catch { /* ignore */ }
  }
}
