"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  HardHat,
  LayoutDashboard,
  LogOut,
  Package,
  Ruler,
  ShieldAlert,
  ShoppingCart,
  Tractor,
  Truck,
  UserRound,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { MENU_ITEMS } from "@/config/menu";

const ACCENT_COLOR = "#8FBF2F";

export default function Sidebar({ collapsed, onToggle, onMobileClose }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  const roles = user.roles || [];
  const menuItems = MENU_ITEMS.filter((item) =>
    item.roles.some((role) => roles.includes(role))
  );

  const expandedContentClass = collapsed ? "block md:hidden" : "block";
  const expandedInlineFlexClass = collapsed
    ? "inline-flex md:hidden"
    : "inline-flex";

  return (
    <aside
      className={`
        ${collapsed ? "w-72 md:w-20" : "w-72 md:w-64"}
        relative h-screen overflow-hidden
        bg-[#0f2346] text-white
        shadow-[0_28px_60px_rgba(15,35,70,0.38)]
        transition-all duration-300
      `}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(143,191,47,0.16),transparent_28%),linear-gradient(180deg,#0f2346_0%,#173569_100%)]" />

      <div className="absolute inset-y-0 right-0 w-px bg-white/8" />

      <div className="relative flex h-full flex-col">
        <div className="border-b border-white/10 px-4 py-5">
          <div
            className={`flex ${
              collapsed
                ? "items-center justify-between md:flex-col md:justify-start md:gap-4"
                : "items-center justify-between gap-3"
            }`}
          >
            <Link
              href="/dashboard"
              className={`flex min-w-0 items-center gap-3 ${
                collapsed ? "md:flex-col md:gap-2" : ""
              }`}
              onClick={onMobileClose}
            >
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[22px] bg-white/95 ring-1 ring-white/10 shadow-[0_12px_24px_rgba(15,35,70,0.18)]">
                <img
                  src="/logo/logo.png"
                  alt="Fredal Logo"
                  className="object-contain p-2 w-full h-full"
                />
              </div>

              <div className={`${expandedContentClass} min-w-0`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/44">
                  Workspace
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.28em] text-white/78">
                  Fredal Workspace
                </p>
              </div>
            </Link>

            <div
              className={`flex items-center gap-2 ${
                collapsed ? "md:w-full md:justify-center" : ""
              }`}
            >
              {onMobileClose ? (
                <button
                  type="button"
                  onClick={onMobileClose}
                  className="rounded-2xl border border-white/10 bg-white/6 p-2.5 text-white/72 transition hover:bg-white/10 hover:text-white md:hidden"
                  aria-label="Cerrar menu"
                >
                  <X className="h-5 w-5" strokeWidth={2.2} />
                </button>
              ) : null}

              <button
                type="button"
                onClick={onToggle}
                className="hidden rounded-2xl border border-white/10 bg-white/6 p-2.5 text-white/72 transition hover:bg-white/10 hover:text-white md:flex"
                aria-label={collapsed ? "Expandir menu" : "Colapsar menu"}
              >
                {collapsed ? (
                  <ChevronRight className="h-5 w-5" strokeWidth={2.2} />
                ) : (
                  <ChevronLeft className="h-5 w-5" strokeWidth={2.2} />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden px-3 py-5">
          <div
            className={`${expandedContentClass} px-3 pb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38`}
          >
            Navegacion
          </div>

          <div className="relative h-full overflow-hidden rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-7 bg-[linear-gradient(180deg,rgba(15,35,70,0.92),rgba(15,35,70,0))]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-[linear-gradient(0deg,rgba(15,35,70,0.95),rgba(15,35,70,0))]" />

            <nav className="sidebar-scroll h-full space-y-1.5 overflow-y-auto px-2.5 py-3 pr-2">
              {menuItems.map((item) => {
                const isActive =
                  pathname === item.path ||
                  pathname.startsWith(item.path + "/");
                const Icon = getIconForPath(item.path);

                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    title={collapsed ? item.label : undefined}
                    aria-current={isActive ? "page" : undefined}
                    onClick={onMobileClose}
                    className={`
                      group relative flex min-h-[54px] items-center rounded-[22px] border
                      transition-all duration-200
                      ${
                        collapsed
                          ? "gap-3 px-3 md:justify-center md:px-0"
                          : "gap-3 px-3"
                      }
                      ${
                        isActive
                          ? "border-white/16 bg-white text-[#12233D] shadow-[0_18px_34px_rgba(11,28,56,0.18)]"
                          : "border-transparent text-white/68 hover:border-white/10 hover:bg-white/8 hover:text-white"
                      }
                    `}
                  >
                    {isActive ? (
                      <span
                        className={`
                          absolute rounded-full
                          ${
                            collapsed
                              ? "left-1.5 top-1/2 h-8 w-1 -translate-y-1/2 md:left-auto md:right-2 md:h-1.5 md:w-1.5"
                              : "left-1.5 top-1/2 h-8 w-1 -translate-y-1/2"
                          }
                        `}
                        style={{ backgroundColor: ACCENT_COLOR }}
                      />
                    ) : null}

                    <span
                      className={`
                        flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl
                        transition-colors duration-200
                        ${
                          isActive
                            ? "bg-[#EAF1FF] text-[#173569]"
                            : "bg-white/8 text-white/78 group-hover:bg-white/12 group-hover:text-white"
                        }
                      `}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2.1} />
                    </span>

                    <span
                      className={`${expandedContentClass} min-w-0 flex-1 truncate text-sm font-semibold`}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={logout}
            className={`
              flex items-center justify-center gap-2 rounded-[20px] border border-white/10
              bg-white/6 text-white transition hover:bg-white/12
              shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]
              ${
                collapsed
                  ? "w-full px-3 py-3 md:mx-auto md:h-11 md:w-11 md:px-0"
                  : "w-full px-3 py-3"
              }
            `}
            aria-label="Cerrar sesion"
          >
            <LogOut className="h-4.5 w-4.5" strokeWidth={2.1} />
            <span className={`${expandedContentClass} text-sm font-semibold`}>
              Cerrar sesion
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}

function getIconForPath(path) {
  if (path === "/dashboard") return LayoutDashboard;
  if (path.includes("asistencia")) return Users;
  if (path.includes("checklist")) return ClipboardList;
  if (path.includes("iperc")) return ShieldAlert;
  if (path.includes("proceso")) return ClipboardList;
  if (path.includes("trabajo")) return ClipboardList;
  if (path.includes("compra")) return ShoppingCart;
  if (path.includes("proveedor")) return Truck;
  if (path.includes("almacen") || path.includes("item")) return Warehouse;
  if (path.includes("cliente")) return Building2;
  if (path.includes("unidad")) return Ruler;
  if (path.includes("sync") || path.includes("import")) return ArrowLeftRight;
  if (path.includes("maquinaria")) return Tractor;
  if (path.includes("gestion")) return BarChart3;
  if (path.includes("trabajador")) return HardHat;
  if (path.includes("usuario")) return UserRound;
  if (path.includes("user")) return Users;
  return Package;
}
