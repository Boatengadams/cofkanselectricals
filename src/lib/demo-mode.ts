/**
 * DEMO MODE
 *
 * When true, the app runs entirely in the browser with mock data — no Firebase
 * or Supabase calls happen. Flip to false later to reconnect the real backend.
 */
export const DEMO_MODE = false;

import type { UserRole } from '@/app/types';

export interface DemoUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL: string;
  isSuperAdmin: boolean;
}

export const DEMO_USERS: Record<UserRole, DemoUser> = {
  customer: {
    uid: 'demo-customer',
    email: 'customer@demo.app',
    displayName: 'Demo Customer',
    role: 'customer',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=customer',
    isSuperAdmin: false,
  },
  admin: {
    uid: 'demo-admin',
    email: 'admin@demo.app',
    displayName: 'Demo Admin',
    role: 'admin',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    isSuperAdmin: true,
  },
  technician: {
    uid: 'demo-tech',
    email: 'tech@demo.app',
    displayName: 'Demo Technician',
    role: 'technician',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tech',
    isSuperAdmin: false,
  },
  driver: {
    uid: 'demo-driver',
    email: 'driver@demo.app',
    displayName: 'Demo Driver',
    role: 'driver',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=driver',
    isSuperAdmin: false,
  },
  support_agent: {
    uid: 'demo-support',
    email: 'ama@cofkans.demo',
    displayName: 'Ama Boateng',
    role: 'support_agent',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ama',
    isSuperAdmin: false,
  },
};

export const DEMO_STORAGE_KEY = 'cofkans:demo-role';
