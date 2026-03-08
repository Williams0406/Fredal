"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { MENU_ITEMS } from "@/config/menu";

export default function Sidebar({ collapsed, onToggle, onMobileClose }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  const roles = user.roles || [];
  const menuItems = MENU_ITEMS.filter((item) =>
    item.roles.some((role) => roles.includes(role))
  );

  return (
    <aside
      className={`
        ${collapsed ? "w-20" : "w-72 md:w-64"}
        h-screen
        bg-[#1e3a8a] text-white
        flex flex-col
        transition-all duration-300
        /* Sombra extra en mobile para separar del overlay */
        shadow-2xl md:shadow-none
      `}
    >
      {/* ── Header / Logo ── */}
      <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between">
        {!collapsed && (
          <div>
            <h1 className="text-xl font-bold tracking-wide">FREDAL</h1>
            <p className="text-xs text-white/50 font-medium">Peruvian Group</p>
          </div>
        )}

        <div className="flex items-center gap-1 ml-auto">
          {/* Botón cerrar drawer — solo mobile */}
          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="
                md:hidden
                p-2 rounded-lg hover:bg-white/10 active:bg-white/20
                transition-colors duration-150
              "
              aria-label="Cerrar menú"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Botón colapsar — solo desktop */}
          <button
            onClick={onToggle}
            className="
              hidden md:flex
              p-2 rounded-lg hover:bg-white/10
              transition-colors duration-150
            "
            aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={collapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Navegación ── */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive =
            pathname === item.path || pathname.startsWith(item.path + "/");

          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={onMobileClose} // Cierra el drawer al navegar en mobile
              className={`
                flex items-center gap-3 rounded-xl
                /* Mobile: tap targets más grandes */
                px-3 py-3.5 md:py-3
                text-sm font-medium
                transition-all duration-150
                active:scale-[0.98]
                ${isActive
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
                }
              `}
            >
              {/* Indicador activo — barra izquierda */}
              {isActive && (
                <span className="absolute left-0 w-1 h-8 bg-[#84cc16] rounded-r-full" />
              )}

              {/* Ícono */}
              <div className="w-5 h-5 flex-shrink-0">
                {getIconForPath(item.path)}
              </div>

              {/* Texto */}
              {!collapsed && (
                <span className="flex-1 truncate">{item.label}</span>
              )}

              {/* Punto verde activo (desktop colapsado) */}
              {isActive && collapsed && (
                <div className="absolute right-2 w-1.5 h-1.5 bg-[#84cc16] rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Footer usuario ── */}
      <div className="border-t border-white/10 px-3 py-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="
            w-9 h-9 flex-shrink-0
            bg-white/15 rounded-lg
            flex items-center justify-center
            text-sm font-bold
          ">
            {user.username?.charAt(0).toUpperCase()}
          </div>

          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{user.username}</p>
                <p className="text-xs text-white/50 truncate">{user.roles?.[0]}</p>
              </div>

              {/* Logout inline en mobile (dentro del sidebar/drawer) */}
              <button
                onClick={logout}
                className="
                  md:hidden
                  p-2 rounded-lg text-white/60
                  hover:bg-white/10 active:bg-white/20
                  transition-colors duration-150 flex-shrink-0
                "
                aria-label="Cerrar sesión"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

// ── Íconos SVG por ruta ──
function getIconForPath(path) {
  const cls = "w-5 h-5";

  if (path === "/dashboard")
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
      </svg>
    );

  if (path.includes("trabajo"))
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    );

  if (path.includes("item") || path.includes("almacen"))
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    );

  if (path.includes("compra"))
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    );

  if (path.includes("maquinaria"))
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    );

  if (path.includes("trabajador") || path.includes("user"))
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    );

  if (path.includes("cambio"))
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    );

  return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}