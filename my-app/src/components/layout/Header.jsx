"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { CalendarDays, Menu, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { MENU_ITEMS } from "@/config/menu";

const HEADER_META = {
  "/dashboard": {
    eyebrow: "Vista general",
    description: "Supervisa el rendimiento operativo y entra rapido a los modulos clave.",
  },
  "/trabajos": {
    eyebrow: "Operacion tecnica",
    description: "Gestiona ordenes, avances y cierres con contexto claro de ejecucion.",
  },
  "/compras": {
    eyebrow: "Abastecimiento",
    description: "Controla solicitudes, ordenes y seguimiento de compra desde un solo flujo.",
  },
  "/proveedores": {
    eyebrow: "Red comercial",
    description: "Consulta proveedores y mantén sus datos listos para compras y abastecimiento.",
  },
  "/almacen": {
    eyebrow: "Inventario",
    description: "Revisa stock, movimientos y disponibilidad con foco operativo.",
  },
  "/clientes": {
    eyebrow: "Relacion comercial",
    description: "Accede rapido al contexto de clientes y ubicaciones asociadas.",
  },
  "/unidades": {
    eyebrow: "Parametros base",
    description: "Administra unidades y referencias que sostienen el catalogo tecnico.",
  },
  "/catalogo-sync": {
    eyebrow: "Intercambio de datos",
    description: "Importa y exporta informacion critica sin salir del entorno de gestion.",
  },
  "/maquinaria": {
    eyebrow: "Parque de equipos",
    description: "Consulta el estado de cada maquinaria y su contexto de mantenimiento.",
  },
  "/gestion": {
    eyebrow: "Analitica operativa",
    description: "Explora indicadores, matrices y curvas para tomar mejores decisiones.",
  },
  "/trabajadores": {
    eyebrow: "Equipo interno",
    description: "Visualiza y organiza al personal con una capa de administracion clara.",
  },
  "/usuarios": {
    eyebrow: "Acceso y permisos",
    description: "Gestiona cuentas y roles con una lectura mas limpia del entorno.",
  },
};

export default function Header({ onMenuToggle }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const currentItem = useMemo(() => {
    return [...MENU_ITEMS]
      .sort((a, b) => b.path.length - a.path.length)
      .find(
        (item) => pathname === item.path || pathname.startsWith(item.path + "/")
      );
  }, [pathname]);

  const title = currentItem?.label || "Panel";
  const meta = HEADER_META[currentItem?.path] || {
    eyebrow: "Fredal Workspace",
    description: "Navega el sistema con una vista mas clara y enfocada en el contexto actual.",
  };

  const todayLabel = useMemo(() => {
    return new Intl.DateTimeFormat("es-PE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  }, []);

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-[rgba(243,246,251,0.88)] backdrop-blur-xl">
      <div className="flex min-h-[88px] items-center justify-between gap-4 px-4 py-4 md:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={onMenuToggle}
            className="mt-0.5 rounded-2xl border border-slate-200 bg-white p-2.5 text-[#173569] shadow-sm transition hover:border-slate-300 hover:bg-slate-50 md:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" strokeWidth={2.3} />
          </button>

          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#5F6C80]">
              {meta.eyebrow}
            </p>
            <h2 className="mt-1 truncate text-2xl font-bold tracking-tight text-[#12233D]">
              {title}
            </h2>
            <p className="mt-1 hidden max-w-2xl text-sm leading-6 text-[#5F6C80] md:block">
              {meta.description}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <HeaderChip
            icon={ShieldCheck}
            label={user?.roles?.[0] || "Usuario"}
            tone="navy"
          />
          <HeaderChip
            icon={CalendarDays}
            label={todayLabel}
            tone="neutral"
            className="hidden sm:inline-flex"
          />
        </div>
      </div>
    </header>
  );
}

function HeaderChip({ icon: Icon, label, tone = "neutral", className = "" }) {
  const tones = {
    navy: "border-[#D9E2EF] bg-white text-[#173569]",
    neutral: "border-transparent bg-[#EAF1FF] text-[#173569]",
  };

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold shadow-sm ${tones[tone]} ${className}`}
    >
      <Icon className="h-4 w-4" strokeWidth={2.2} />
      <span className="max-w-[12rem] truncate">{label}</span>
    </div>
  );
}
