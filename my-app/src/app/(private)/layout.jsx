"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authAPI } from "@/lib/api";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function PrivateLayout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const me = await authAPI.me();
        setUser(me);
      } catch {
        router.replace("/");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1e3a8a]/20 animate-pulse" />
          <div className="w-24 h-2 rounded-full bg-gray-200 animate-pulse" />
        </div>
      </div>
    );
  }

  // ⚠️ Tailwind no detecta clases construidas con template literals dinámicos.
  // Las clases deben escribirse completas para que el compilador las incluya.
  const contentMargin = collapsed ? "md:ml-20" : "md:ml-64";

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Overlay oscuro — solo mobile cuando el drawer está abierto */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-30 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar
          Mobile : drawer deslizante (no ocupa espacio en el layout)
          Desktop: fijo, siempre visible, sí ocupa espacio (via margin en content)
      */}
      <div
        className={`
          fixed top-0 left-0 h-full z-40
          transition-transform duration-300 ease-in-out
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          onMobileClose={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Contenido principal
          ml-0      → mobile: sidebar es overlay, no desplaza el contenido
          md:ml-64  → desktop expandido: deja espacio al sidebar de 256px
          md:ml-20  → desktop colapsado: deja espacio al sidebar de 80px
      */}
      <div className={`flex flex-col min-h-screen transition-all duration-300 ml-0 ${contentMargin}`}>
        <Header onMenuToggle={() => setMobileMenuOpen(true)} />

        <main className="p-4 md:p-6 flex-1 overflow-auto">
          {children}
        </main>
      </div>

    </div>
  );
}