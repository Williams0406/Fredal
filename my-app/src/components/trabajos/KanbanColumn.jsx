import TrabajoCard from "./TrabajoCard";

export default function KanbanColumn({
  estado,
  trabajos,
  onStatusChange,
  onEdit,
  onDelete,
  onView,
}) {
  // Colores según el estado (Fredal: borde izquierdo por estado)
  const colorClasses = {
    gray: {
      header: "bg-gray-100 text-gray-700",
      badge: "bg-gray-200 text-gray-700",
    },
    blue: {
      header: "bg-blue-50 text-[#1e3a8a]",
      badge: "bg-[#1e3a8a] text-white",
    },
    green: {
      header: "bg-green-50 text-green-700",
      badge: "bg-[#84cc16] text-white",
    },
  };

  const colors = colorClasses[estado.color] || colorClasses.gray;

  return (
    <div className="flex flex-col h-full">
      {/* Header de la columna */}
      <div className={`rounded-t-xl px-4 py-3 ${colors.header} border-b border-gray-200`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{estado.icon}</span>
            <h3 className="font-semibold text-base">
              {estado.label}
            </h3>
          </div>
          
          {/* Badge con contador */}
          <span className={`${colors.badge} text-xs font-semibold px-2.5 py-1 rounded-full min-w-[24px] text-center`}>
            {trabajos.length}
          </span>
        </div>
      </div>

      {/* Contenedor de tarjetas con scroll */}
      <div 
        className="flex-1 bg-gray-50 rounded-b-xl p-4 space-y-3 overflow-y-auto"
        style={{ minHeight: "400px", maxHeight: "calc(100vh - 400px)" }}
      >
        {trabajos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-3">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 font-medium">
              No hay trabajos en {estado.label.toLowerCase()}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Las órdenes aparecerán aquí
            </p>
          </div>
        ) : (
          trabajos.map((trabajo) => (
            <TrabajoCard
              key={trabajo.id}
              trabajo={trabajo}
              onStatusChange={onStatusChange}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={onView}
            />
          ))
        )}
      </div>
    </div>
  );
}