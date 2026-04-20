import { ROLES } from './constants';

export const hasRole = (user, role) =>
  Array.isArray(user?.roles) && user.roles.includes(role);

export const hasAnyRole = (user, roles = []) =>
  roles.some((role) => hasRole(user, role));

export const isAdminUser = (user) =>
  Boolean(user?.is_staff || hasRole(user, 'admin'));

export const canManagePlannedActivities = (user) =>
  isAdminUser(user) || hasAnyRole(user, [ROLES.JEFE_ALMACEN, ROLES.ALMACENERO]);

export const canCreateTrabajo = (user) =>
  isAdminUser(user) || hasAnyRole(user, [ROLES.JEFE_ALMACEN, ROLES.JEFE_TECNICOS]);
