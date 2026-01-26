export default function TrabajoCard({
  trabajo,
  onDelete,
  onView,
}) {
  return (
    <div
      className="bg-white p-3 rounded-lg border shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300"
      onClick={() => onView(trabajo)}
    >
      <p className="font-semibold text-sm">
        {trabajo.codigo_orden}
      </p>

      <p className="text-xs text-gray-600">
        Prioridad: {trabajo.prioridad}
      </p>

      <div className="mt-2 flex gap-2">
        <button
          className="text-xs text-red-600"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(trabajo.id);
          }}
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
