import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { collection, query, getDocs, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { promoteUserRole, demoteUser, isSuperAdmin } from '@/lib/admin-service';
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
  XCircle
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
