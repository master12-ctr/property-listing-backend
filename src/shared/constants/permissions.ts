export enum Permission {
  // Property Permissions
  PROPERTY_CREATE = 'property.create',
  PROPERTY_READ_OWN = 'property.read.own',
  PROPERTY_READ_ALL = 'property.read.all',
  PROPERTY_UPDATE_OWN = 'property.update.own',
  PROPERTY_UPDATE_ALL = 'property.update.all',
  PROPERTY_DELETE_OWN = 'property.delete.own',
  PROPERTY_DELETE_ALL = 'property.delete.all',
  PROPERTY_PUBLISH = 'property.publish',
  PROPERTY_ARCHIVE = 'property.archive',
  
  // User Permissions
  USER_READ_OWN = 'user.read.own',
  USER_READ_ALL = 'user.read.all',
  USER_UPDATE_OWN = 'user.update.own',
  USER_UPDATE_ALL = 'user.update.all',
  
  // Admin Permissions
  SYSTEM_METRICS_READ = 'system.metrics.read',
  SYSTEM_CONFIG_UPDATE = 'system.config.update',
  
  // Favorite Permissions
  FAVORITE_CREATE = 'favorite.create',
  FAVORITE_READ = 'favorite.read',
  FAVORITE_DELETE = 'favorite.delete',
}

// Permission groups for common user types
export const PermissionGroups = {
  ADMIN: [
    Permission.PROPERTY_READ_ALL,
    Permission.PROPERTY_UPDATE_ALL,
    Permission.PROPERTY_DELETE_ALL,
    Permission.USER_READ_ALL,
    Permission.USER_UPDATE_ALL,
    Permission.SYSTEM_METRICS_READ,
    Permission.SYSTEM_CONFIG_UPDATE,
  ],
  PROPERTY_OWNER: [
    Permission.PROPERTY_CREATE,
    Permission.PROPERTY_READ_OWN,
    Permission.PROPERTY_UPDATE_OWN,
    Permission.PROPERTY_DELETE_OWN,
    Permission.PROPERTY_PUBLISH,
    Permission.PROPERTY_ARCHIVE,
    Permission.USER_READ_OWN,
    Permission.USER_UPDATE_OWN,
    Permission.FAVORITE_CREATE,
    Permission.FAVORITE_READ,
    Permission.FAVORITE_DELETE,
  ],
  REGULAR_USER: [
    Permission.PROPERTY_READ_OWN, 
    Permission.USER_READ_OWN,
    Permission.USER_UPDATE_OWN,
    Permission.FAVORITE_CREATE,
    Permission.FAVORITE_READ,
    Permission.FAVORITE_DELETE,
  ],
};