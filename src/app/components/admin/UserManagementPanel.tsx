import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { collection, query, getDocs, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { promoteUserRole, demoteUser, isSuperAdmin } from '@/lib/admin-service';
import { createWorkerAccount, generateTempPassword } from '@/lib/create-worker';
import { useFirebaseAuth } from '../../contexts/FirebaseAuthContext';
import { sanitizeInput } from '@/lib/security-service';
import toast from 'react-hot-toast';
import {
  Users,
  Shield,
  Search,
  ChevronDown,
  UserCog,
  Crown,
  AlertCircle,
  CheckCircle,
  XCircle,
  UserPlus,
  Copy,
  Mail,
  MessageCircle,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { UserRole } from '../../types';
import type { FirestoreUser } from '@/lib/firestore-schema';

interface UserWithId extends FirestoreUser {
  id: string;
}

const ROLE_COLORS = {
  customer: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
  technician: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  driver: 'bg-green-500/10 text-green-600 dark:text-green-400',
  admin: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
};

const ROLE_ICONS = {
  customer: Users,
  technician: UserCog,
  driver: UserCog,
  admin: Shield,
};

export function UserManagementPanel() {
  const { user: currentUser } = useFirebaseAuth();
  const [users, setUsers] = useState<UserWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
  const [promotingUserId, setPromotingUserId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'technician' | 'driver'>('technician');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string; displayName: string } | null>(null);

  const isCurrentUserSuperAdmin = isSuperAdmin(currentUser?.email || '');

  // Load users from Firestore
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(usersQuery);
      const userData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserWithId[];

      setUsers(userData);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Unable to load user list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteUser = async (userId: string, email: string, newRole: 'admin' | 'technician' | 'driver') => {
    if (!currentUser?.id) return;
    if (!isCurrentUserSuperAdmin) {
      toast.error('Only super administrators can promote users.');
      return;
    }

    try {
      setPromotingUserId(userId);

      const result = await promoteUserRole(
        currentUser.id,
        userId,
        newRole
      );

      if (result.success) {
        toast.success(`User promoted to ${newRole} successfully`);
        await loadUsers(); // Reload to show updated data
      } else {
        toast.error(result.error || 'Failed to promote user');
      }
    } catch (error) {
      console.error('Promotion error:', error);
      toast.error('An error occurred while promoting the user');
    } finally {
      setPromotingUserId(null);
    }
  };

  const handleDemoteUser = async (userId: string, email: string) => {
    if (!currentUser?.id) return;
    if (!isCurrentUserSuperAdmin) {
      toast.error('Only super administrators can demote users.');
      return;
    }

    // Prevent demoting super admin
    if (isSuperAdmin(email)) {
      toast.error('Cannot demote the super administrator');
      return;
    }

    try {
      setPromotingUserId(userId);

      const result = await demoteUser(currentUser.id, userId);

      if (result.success) {
        toast.success('User demoted to customer successfully');
        await loadUsers();
      } else {
        toast.error(result.error || 'Failed to demote user');
      }
    } catch (error) {
      console.error('Demotion error:', error);
      toast.error('An error occurred while demoting the user');
    } finally {
      setPromotingUserId(null);
    }
  };

  const handleCreateWorker = async () => {
    if (!currentUser?.id) return;
    setCreating(true);
    try {
      const res = await createWorkerAccount({
        creatorUserId: currentUser.id,
        username: newUsername,
        displayName: newDisplayName,
        role: newRole,
        password: newPassword,
      });
      if (res.success && res.email && res.password) {
        toast.success(`Worker account ready: ${res.email}`);
        setCreated({ email: res.email, password: res.password, displayName: newDisplayName });
        setNewUsername('');
        setNewDisplayName('');
        setNewRole('technician');
        setNewPassword('');
        await loadUsers();
      } else {
        toast.error(res.error || 'Failed to create worker.');
      }
    } finally {
      setCreating(false);
    }
  };

  const credentialMessage = (c: { email: string; password: string; displayName: string }) =>
    `Hi ${c.displayName}, your Cofkans Electricals account is ready.\n\nEmail: ${c.email}\nTemporary password: ${c.password}\n\nSign in at https://cofkanselectricals.web.app and change your password on first login.`;

  const copyCredentials = async (c: { email: string; password: string; displayName: string }) => {
    try {
      await navigator.clipboard.writeText(credentialMessage(c));
      toast.success('Credentials copied to clipboard');
    } catch {
      toast.error('Could not copy. Select the text manually.');
    }
  };

  // Sanitize search input
  const handleSearchChange = (value: string) => {
    const sanitized = sanitizeInput(value);
    setSearchQuery(sanitized);
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.displayName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = filterRole === 'all' || user.role === filterRole;

    return matchesSearch && matchesRole;
  });

  if (!isCurrentUserSuperAdmin) {
    return (
      <div className="bg-card border-2 border-border rounded-2xl p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">Super Admin Only</h3>
          <p className="text-muted-foreground">
            User management requires super administrator privileges.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border-2 border-border rounded-2xl p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-purple-500/10 rounded-xl">
          <Users className="w-6 h-6 text-purple-600" strokeWidth={2.5} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-sm text-muted-foreground">
            Promote and manage staff members (Super Admin only)
          </p>
        </div>
      </div>

      {/* Create Worker */}
      <div className="mb-6">
        <button
          onClick={() => setShowCreate(s => !s)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity"
        >
          <UserPlus className="w-4 h-4" />
          {showCreate ? 'Cancel' : 'Create Worker Account'}
        </button>

        {showCreate && (
          <div className="mt-4 p-4 bg-background border-2 border-border rounded-xl space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Username</span>
                <div className="mt-1 flex items-center bg-muted rounded-lg border-2 border-border focus-within:border-primary">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    placeholder="kwame"
                    className="flex-1 px-3 py-2 bg-transparent focus:outline-none font-semibold"
                  />
                  <span className="px-3 text-xs text-muted-foreground select-none">@cofkanselectricals.com</span>
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Display name</span>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={e => setNewDisplayName(e.target.value)}
                  placeholder="Kwame Mensah"
                  className="mt-1 w-full px-3 py-2 bg-muted rounded-lg border-2 border-border focus:border-primary focus:outline-none font-semibold"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Role</span>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as 'admin' | 'technician' | 'driver')}
                  className="mt-1 w-full px-3 py-2 bg-muted rounded-lg border-2 border-border focus:border-primary focus:outline-none font-semibold"
                >
                  <option value="technician">Technician</option>
                  <option value="driver">Driver</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Temporary password</span>
                <div className="mt-1 flex items-center gap-2 bg-muted rounded-lg border-2 border-border focus-within:border-primary">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Type or generate (min 8 chars)"
                    className="flex-1 px-3 py-2 bg-transparent focus:outline-none font-mono"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="px-2 text-muted-foreground hover:text-foreground"
                    title={showPassword ? 'Hide' : 'Show'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNewPassword(generateTempPassword()); setShowPassword(true); }}
                    className="px-3 py-2 text-xs font-bold text-primary hover:bg-primary/10 rounded-r-lg flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Generate
                  </button>
                </div>
              </label>
            </div>
            <button
              onClick={handleCreateWorker}
              disabled={creating || !newUsername.trim() || !newDisplayName.trim() || newPassword.length < 8}
              className="w-full py-3 rounded-xl bg-foreground text-background font-bold disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create worker account'}
            </button>
            <p className="text-xs text-muted-foreground">
              The worker signs in with this password once, then is required to set their own.
            </p>
          </div>
        )}

        {created && (
          <div className="mt-4 p-4 bg-green-500/10 border-2 border-green-500/30 rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h4 className="font-bold text-green-800 dark:text-green-300">Worker account created</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2 bg-background px-3 py-2 rounded-lg border border-border">
                <span className="text-xs uppercase font-bold text-muted-foreground">Email</span>
                <span className="font-mono truncate">{created.email}</span>
              </div>
              <div className="flex items-center justify-between gap-2 bg-background px-3 py-2 rounded-lg border border-border">
                <span className="text-xs uppercase font-bold text-muted-foreground">Password</span>
                <span className="font-mono truncate">{created.password}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => copyCredentials(created)}
                className="flex items-center gap-1 px-3 py-2 bg-foreground text-background text-xs font-bold rounded-lg hover:opacity-90"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(credentialMessage(created))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700"
              >
                <MessageCircle className="w-3 h-3" /> WhatsApp
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent('Your Cofkans Electricals account')}&body=${encodeURIComponent(credentialMessage(created))}`}
                className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700"
              >
                <Mail className="w-3 h-3" /> Email
              </a>
              <button
                onClick={() => setCreated(null)}
                className="ml-auto px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Dismiss
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              This password is shown once and cannot be recovered. Share it now, then dismiss.
            </p>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by email or name..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-background border-2 border-border rounded-xl focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Role Filter */}
        <div className="relative">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as UserRole | 'all')}
            className="w-full px-4 py-3 bg-background border-2 border-border rounded-xl focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="customer">Customers</option>
            <option value="technician">Technicians</option>
            <option value="driver">Drivers</option>
            <option value="admin">Admins</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* User List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No users found</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {filteredUsers.map((user) => {
            const RoleIcon = ROLE_ICONS[user.role || 'customer'];
            const isSuperAdminUser = isSuperAdmin(user.email || '');
            const isProcessing = promotingUserId === user.id;

            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-background border-2 border-border rounded-xl p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* User Info */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-muted rounded-lg flex-shrink-0">
                      <RoleIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold truncate">
                          {user.displayName || 'No Name'}
                        </h3>
                        {isSuperAdminUser && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-primary to-secondary rounded-full">
                            <Crown className="w-3 h-3 text-white" />
                            <span className="text-xs font-bold text-white">SUPER ADMIN</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {user.email}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${ROLE_COLORS[user.role || 'customer']}`}>
                          <RoleIcon className="w-3 h-3" />
                          {user.role?.toUpperCase()}
                        </span>
                        {user.emailVerified && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg text-xs font-bold">
                            <CheckCircle className="w-3 h-3" />
                            Verified
                          </span>
                        )}
                        {user.isLocked && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold">
                            <XCircle className="w-3 h-3" />
                            Locked
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {!isSuperAdminUser && (
                    <div className="flex flex-col gap-2">
                      {user.role !== 'admin' && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handlePromoteUser(user.id, user.email || '', 'admin')}
                          disabled={isProcessing}
                          className="px-3 py-1.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessing ? 'Processing...' : '→ Admin'}
                        </motion.button>
                      )}
                      {user.role !== 'technician' && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handlePromoteUser(user.id, user.email || '', 'technician')}
                          disabled={isProcessing}
                          className="px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessing ? 'Processing...' : '→ Tech'}
                        </motion.button>
                      )}
                      {user.role !== 'driver' && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handlePromoteUser(user.id, user.email || '', 'driver')}
                          disabled={isProcessing}
                          className="px-3 py-1.5 bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessing ? 'Processing...' : '→ Driver'}
                        </motion.button>
                      )}
                      {user.role !== 'customer' && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDemoteUser(user.id, user.email || '')}
                          disabled={isProcessing}
                          className="px-3 py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isProcessing ? 'Processing...' : '↓ Customer'}
                        </motion.button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-6 border-t-2 border-border">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{users.length}</div>
          <div className="text-xs text-muted-foreground">Total Users</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
            {users.filter(u => u.role === 'customer').length}
          </div>
          <div className="text-xs text-muted-foreground">Customers</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {users.filter(u => u.role === 'technician').length}
          </div>
          <div className="text-xs text-muted-foreground">Technicians</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {users.filter(u => u.role === 'driver').length}
          </div>
          <div className="text-xs text-muted-foreground">Drivers</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {users.filter(u => u.role === 'admin').length}
          </div>
          <div className="text-xs text-muted-foreground">Admins</div>
        </div>
      </div>
    </div>
  );
}
