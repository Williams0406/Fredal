import TrabajoCard from "@/app/(private)/trabajos/TrabajoCard";

export default function KanbanColumn({
  estado,
  trabajos,
  onStatusChange,
  onEdit,
  onDelete,
  onView,
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 shadow-sm">
      <h3 className="font-semibold mb-3">
        {estado.label} ({trabajos.length})
      </h3>

      <div className="space-y-3">
        {trabajos.map((trabajo) => (
          <TrabajoCard
            key={trabajo.id}
            trabajo={trabajo}
            onStatusChange={onStatusChange}
            onEdit={onEdit}
            onDelete={onDelete}
            onView={onView}
          />
        ))}
      </div>
    </div>
  );
}
