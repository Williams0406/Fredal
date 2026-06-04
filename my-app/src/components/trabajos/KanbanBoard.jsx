"use client";

import { useState } from "react";
import { CircleCheckBig, Clock3, Wrench } from "lucide-react";
import KanbanColumn from "./KanbanColumn";

const ESTADOS = [
  {
    key: "PENDIENTE",
    label: "Pendiente",
    icon: Clock3,
    color: "gray",
  },
  {
    key: "EN_PROCESO",
    label: "En Proceso",
    icon: Wrench,
    color: "blue",
  },
  {
    key: "FINALIZADO",
    label: "Finalizado",
    icon: CircleCheckBig,
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

const getTrabajoDateValue = (trabajo) => {
  const dateValue = Date.parse(trabajo?.created_at || trabajo?.fecha || "");
  return Number.isNaN(dateValue) ? 0 : dateValue;
};

const sortTrabajosByNewest = (trabajos = []) =>
  [...trabajos].sort((a, b) => {
    const dateDiff = getTrabajoDateValue(b) - getTrabajoDateValue(a);
    if (dateDiff !== 0) return dateDiff;
    return Number(b?.id || 0) - Number(a?.id || 0);
  });

export default function KanbanBoard({
  trabajos,
  onStatusChange,
  onEdit,
  onDelete,
  onView,
  tecnicoLookup = {},
  maquinariaLookup = {},
}) {
  const [activeTab, setActiveTab] = useState("EN_PROCESO");

  return (
    <>
      <div className="md:hidden">
        <div className="mb-4 flex overflow-hidden rounded-t-xl border-b border-gray-200 bg-white shadow-sm">
          {ESTADOS.map((estado) => {
            const count = trabajos.filter((t) => t.estatus === estado.key).length;
            const isActive = activeTab === estado.key;
            const Icon = estado.icon;

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
                <Icon className="mb-0.5 h-5 w-5" strokeWidth={2.2} />
                <span className="text-[11px] font-bold uppercase tracking-wide leading-tight">
                  {estado.label}
                </span>
                <span
                  className={`
                    mt-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold
                    ${isActive ? "bg-current/10 text-current" : "bg-gray-100 text-gray-500"}
                  `}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {ESTADOS.map((estado) =>
          activeTab === estado.key ? (
            <KanbanColumn
              key={estado.key}
              estado={estado}
              trabajos={sortTrabajosByNewest(
                trabajos.filter((t) => t.estatus === estado.key)
              )}
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

      <div className="hidden gap-6 md:grid md:grid-cols-3">
        {ESTADOS.map((estado) => (
          <KanbanColumn
            key={estado.key}
            estado={estado}
            trabajos={sortTrabajosByNewest(
              trabajos.filter((t) => t.estatus === estado.key)
            )}
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
