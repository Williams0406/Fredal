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

  if (loading) return <p>Cargando...</p>;

  return (
    <div className="min-h-screen">
      <Sidebar
        user={user}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />

      <div
        className={`
          flex flex-col min-h-screen transition-all duration-300
          ${collapsed ? "ml-20" : "ml-64"}
        `}
      >
        <Header user={user} />
        <main className="p-6 flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
