"use client";

import KanbanColumn from "./KanbanColumn";

const ESTADOS = [
  { 
    key: "PENDIENTE", 
    label: "Pendiente",
    icon: "⏳",
    color: "gray"
  },
  { 
    key: "EN_PROCESO", 
    label: "En Proceso",
    icon: "⚙️",
    color: "blue"
  },
  { 
    key: "FINALIZADO", 
    label: "Finalizado",
    icon: "✓",
    color: "green"
  },
];

export default function KanbanBoard({
  trabajos,
  onStatusChange,
  onEdit,
  onDelete,
  onView,
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {ESTADOS.map((estado) => {
        const trabajosFiltrados = trabajos.filter(
          (t) => t.estatus === estado.key
        );

        return (
          <KanbanColumn
            key={estado.key}
            estado={estado}
            trabajos={trabajosFiltrados}
            onStatusChange={onStatusChange}
            onEdit={onEdit}
            onDelete={onDelete}
            onView={onView}
          />
        );
      })}
    </div>
  );
}