// src/hooks/useRoles.js

import { useAuth } from "@/context/AuthContext";

export function useRoles() {
  const { roles } = useAuth();

  const safeRoles = roles ?? [];

  const hasRole = (role) => safeRoles.includes(role);

  const hasAnyRole = (allowedRoles = []) =>
    allowedRoles.some((role) => safeRoles.includes(role));

  return {
    roles,
    hasRole,
    hasAnyRole,
  };
}
