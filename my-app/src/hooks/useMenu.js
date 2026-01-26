import { useAuth } from "@/context/AuthContext";
import { MENU_ITEMS } from "@/config/menu";

export function useMenu() {
  const { user, loading } = useAuth();

  if (loading || !user) return [];

  const roles = user.roles ?? [];

  return MENU_ITEMS.filter((item) =>
    item.roles?.some((role) => roles.includes(role))
  );
}
