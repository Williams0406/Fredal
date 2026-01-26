// src/lib/permissions.js

import { ROLES } from "./constants";

export const hasRole = (user, role) =>
  user?.roles?.includes(role);

export const hasAnyRole = (user, roles = []) =>
  roles.some((role) => user?.roles?.includes(role));

export const isAdmin = (user) =>
  user?.is_staff === true;
