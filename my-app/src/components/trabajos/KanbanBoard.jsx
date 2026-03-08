"use client";

import { useState } from "react";
import KanbanColumn from "./KanbanColumn";

const ESTADOS = [
  {
    key: "PENDIENTE",
    label: "Pendiente",
    icon: "⏳",
    color: "gray",
  },
  {
    key: "EN_PROCESO",
    label: "En Proceso",
    icon: "⚙️",
    color: "blue",
  },
  {
    key: "FINALIZADO",
    label: "Finalizado",
    icon: "✓",
    color: "green",
  },
];

const TAB_ACTIVE = {
  PENDIENTE: "border-gray-500 text-gray-700 bg-gray-100",
  EN_PROCESO: "border-[#1e3a8a] text-[#1e3a8a] bg-blue-50",
  FINALIZADO: "border-[#84cc16] text-[#4d7c0f] bg-lime-50",
};

const TAB_INACTIVE =
  "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300";

export default function KanbanBoard({
  trabajos,
  onStatusChange,
  onEdit,
  onDelete,
  onView,
  tecnicoLookup = {},
  maquinariaLookup = {},
}) {
  // activeTab solo se usa en mobile (< md)
  const [activeTab, setActiveTab] = useState("EN_PROCESO");

  return (
    <>
      {/* ════════════════════════════════════════
          MOBILE: Tab switcher + columna activa
          Solo visible en pantallas < md
      ════════════════════════════════════════ */}
      <div className="md:hidden">
        {/* ── Tab bar ── */}
        <div className="flex border-b border-gray-200 bg-white rounded-t-xl overflow-hidden shadow-sm mb-4">
          {ESTADOS.map((estado) => {
            const count = trabajos.filter((t) => t.estatus === estado.key).length;
            const isActive = activeTab === estado.key;

            return (
              <button
                key={estado.key}
                onClick={() => setActiveTab(estado.key)}
                className={`
                  flex-1 flex flex-col items-center justify-center
                  pt-3 pb-2.5 px-1
                  border-b-2 transition-all duration-150
                  ${isActive ? TAB_ACTIVE[estado.key] : TAB_INACTIVE}
                `}
              >
                <span className="text-lg leading-none mb-0.5">{estado.icon}</span>
                <span className="text-[11px] font-bold tracking-wide uppercase leading-tight">
                  {estado.label}
                </span>
                {/* Contador inline */}
                <span
                  className={`
                    mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full
                    ${isActive
                      ? "bg-current/10 text-current"
                      : "bg-gray-100 text-gray-500"
                    }
                  `}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Columna activa ── */}
        {ESTADOS.map((estado) =>
          activeTab === estado.key ? (
            <KanbanColumn
              key={estado.key}
              estado={estado}
              trabajos={trabajos.filter((t) => t.estatus === estado.key)}
              onStatusChange={onStatusChange}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={onView}
              tecnicoLookup={tecnicoLookup}
              maquinariaLookup={maquinariaLookup}
            />
          ) : null
        )}
      </div>

      {/* ════════════════════════════════════════
          DESKTOP: Grid de 3 columnas (sin cambios)
          Solo visible en pantallas >= md
      ════════════════════════════════════════ */}
      <div className="hidden md:grid md:grid-cols-3 gap-6">
        {ESTADOS.map((estado) => (
          <KanbanColumn
            key={estado.key}
            estado={estado}
            trabajos={trabajos.filter((t) => t.estatus === estado.key)}
            onStatusChange={onStatusChange}
            onEdit={onEdit}
            onDelete={onDelete}
            onView={onView}
            tecnicoLookup={tecnicoLookup}
            maquinariaLookup={maquinariaLookup}
          />
        ))}
      </div>
    </>
  );
}