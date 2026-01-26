"use client";

import KanbanColumn from "./KanbanColumn";

const ESTADOS = [
  { key: "PENDIENTE", label: "Pendiente" },
  { key: "EN_PROCESO", label: "En Proceso" },
  { key: "FINALIZADO", label: "Finalizado" },
];

export default function KanbanBoard({
  trabajos,
  onStatusChange,
  onEdit,
  onDelete,
  onView,
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {ESTADOS.map((estado) => (
        <KanbanColumn
          key={estado.key}
          estado={estado}
          trabajos={trabajos.filter(
            (t) => t.estatus === estado.key
          )}
          onStatusChange={onStatusChange}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
        />
      ))}
    </div>
  );
}
