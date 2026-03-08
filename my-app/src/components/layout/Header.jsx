"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function Header({ onMenuToggle }) {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    console.log("Búsqueda:", searchQuery);
  };

  return (
    <header className="h-14 md:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-3 md:px-6 sticky top-0 z-10">

      {/* ── LEFT: Hamburger (mobile) + Título ── */}
      <div className="flex items-center gap-2 flex-1 min-w-0">

        {/* Botón hamburguesa — solo visible en mobile */}
        <button
          onClick={onMenuToggle}
          className="
            md:hidden
            p-2 -ml-1 rounded-lg
            text-[#1e3a8a] hover:bg-blue-50
            active:bg-blue-100
            transition-colors duration-150
            flex-shrink-0
          "
          aria-label="Abrir menú"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
              d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Título — compacto en mobile */}
        <div className="min-w-0">
          <h2 className="text-sm md:text-lg font-bold text-[#1e3a8a] leading-none truncate">
            Sistema de Gestión
          </h2>
          {user && (
            <p className="text-[11px] text-gray-500 mt-0.5 hidden sm:block">
              Sesión activa:{" "}
              <span className="font-semibold text-gray-700">{user.username}</span>
            </p>
          )}
        </div>
      </div>

      {/* ── CENTER: Búsqueda — solo desktop ── */}
      <div className="flex-1 max-w-md mx-6 hidden md:block">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar maquinaria, trabajos, items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="
                w-full pl-10 pr-4 py-2 text-sm
                border border-gray-300 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                transition-all duration-200 placeholder:text-gray-400
              "
            />
          </div>
        </form>
      </div>

      {/* ── RIGHT: Acciones ── */}
      <div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0">

        {/* Búsqueda móvil — ícono que expande */}
        <button
          className="
            md:hidden
            p-2 rounded-lg text-gray-500
            hover:bg-gray-100 active:bg-gray-200
            transition-colors duration-150
          "
          onClick={() => setSearchOpen(!searchOpen)}
          aria-label="Buscar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        {/* Notificaciones */}
        <button
          className="
            relative p-2 rounded-lg
            text-gray-400 hover:text-gray-600
            hover:bg-gray-100 active:bg-gray-200
            transition-colors duration-150
          "
          aria-label="Notificaciones"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {/* Badge verde */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#84cc16] rounded-full ring-2 ring-white" />
        </button>

        {/* Separador — solo desktop */}
        <div className="hidden md:block w-px h-8 bg-gray-200" />

        {/* Rol — solo desktop */}
        <div className="hidden md:block text-right">
          <p className="text-sm font-medium text-gray-900">
            {user?.roles?.[0] || "Usuario"}
          </p>
          <p className="text-xs text-gray-500">Rol principal</p>
        </div>

        {/* Avatar con iniciales */}
        <div className="
          w-8 h-8 md:w-9 md:h-9
          bg-[#1e3a8a] text-white rounded-lg
          flex items-center justify-center
          text-sm font-bold flex-shrink-0
        ">
          {user?.username?.charAt(0).toUpperCase() || "U"}
        </div>

        {/* Cerrar sesión — texto en desktop, ícono en mobile */}
        <button
          onClick={logout}
          className="
            hidden sm:flex
            items-center gap-1.5
            px-3 py-2 text-sm font-medium
            text-gray-700 bg-gray-100 border border-gray-300 rounded-lg
            hover:bg-gray-200 active:bg-gray-300
            focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:ring-offset-1
            transition-colors duration-150
          "
          aria-label="Cerrar sesión"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden md:inline">Cerrar sesión</span>
        </button>
      </div>

      {/* ── Barra de búsqueda expandida en mobile ── */}
      {searchOpen && (
        <div className="
          md:hidden
          absolute top-14 left-0 right-0
          bg-white border-b border-gray-200
          px-4 py-3 z-20
          shadow-md
        ">
          <form onSubmit={(e) => { handleSearch(e); setSearchOpen(false); }}>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar maquinaria, trabajos, items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="
                  w-full pl-10 pr-10 py-2.5 text-sm
                  border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                "
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}
    </header>
  );
}