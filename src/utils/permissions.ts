// Role-based permission helpers
// Usage: const can = getPermissions(activeUser?.role);

export type UserRole = 'owner' | 'admin' | 'housekeeper' | 'viewer' | 'member';

export interface Permissions {
  // Tasks
  canAddTask: boolean;
  canEditTask: boolean;
  canDeleteTask: boolean;
  canCompleteTask: boolean;
  // Inventory
  canAddInventoryItem: boolean;
  canEditInventoryItem: boolean;
  canDeleteInventoryItem: boolean;
  canUpdateStock: boolean;
  canAddCategory: boolean;
  // Shopping
  canAddShoppingItem: boolean;
  canEditShoppingItem: boolean;
  canDeleteShoppingItem: boolean;
  canMarkPurchased: boolean;
  canAddShoppingCategory: boolean;
  // Settings
  canEditHouseName: boolean;
  canManageUsers: boolean;
}

export function getPermissions(role: string | undefined): Permissions {
  const r = (role || 'viewer') as UserRole;

  const isOwner      = r === 'owner';
  const isAdmin      = r === 'admin';
  const isHousekeeper = r === 'housekeeper';
  const isViewer     = r === 'viewer';

  const ownerOrAdmin       = isOwner || isAdmin;
  const ownerAdminOrKeeper = isOwner || isAdmin || isHousekeeper;

  return {
    // Tasks
    canAddTask:      ownerAdminOrKeeper,
    canEditTask:     ownerAdminOrKeeper,
    canDeleteTask:   ownerOrAdmin,
    canCompleteTask: ownerAdminOrKeeper,
    // Inventory
    canAddInventoryItem:    ownerOrAdmin,
    canEditInventoryItem:   ownerOrAdmin,
    canDeleteInventoryItem: ownerOrAdmin,
    canUpdateStock:         ownerAdminOrKeeper,
    canAddCategory:         ownerOrAdmin,
    // Shopping
    canAddShoppingItem:      ownerAdminOrKeeper,
    canEditShoppingItem:     ownerOrAdmin,
    canDeleteShoppingItem:   ownerOrAdmin,
    canMarkPurchased:        ownerAdminOrKeeper,
    canAddShoppingCategory:  ownerOrAdmin,
    // Settings
    canEditHouseName: ownerOrAdmin,
    canManageUsers:   isOwner,
  };
}
