import TrabajoCard from "./TrabajoCard";

export default function KanbanColumn({
  estado,
  trabajos,
  onStatusChange,
  onEdit,
  onDelete,
  onView,
  tecnicoLookup = {},
  maquinariaLookup = {},
}) {
  const colorClasses = {
    gray: {
      header: "bg-gray-100 text-gray-700",
      badge: "bg-gray-500 text-white",
      emptyIcon: "text-gray-400",
    },
    blue: {
      header: "bg-[#1e3a8a] text-white",
      badge: "bg-white/20 text-white",
      emptyIcon: "text-blue-300",
    },
    green: {
      header: "bg-[#84cc16] text-white",
      badge: "bg-white/25 text-white",
      emptyIcon: "text-lime-400",
    },
  };

  const colors = colorClasses[estado.color] || colorClasses.gray;

  return (
    <div className="flex flex-col h-full">
      {/* ── Column Header ── */}
      <div className={`rounded-t-xl px-4 py-3 ${colors.header}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl leading-none">{estado.icon}</span>
            <h3 className="font-bold text-sm tracking-wide uppercase">
              {estado.label}
            </h3>
          </div>

          {/* Badge contador */}
          <span
            className={`
              ${colors.badge}
              text-xs font-bold px-2.5 py-1 rounded-full
              min-w-[28px] text-center
            `}
          >
            {trabajos.length}
          </span>
        </div>
      </div>

      {/* ── Cards container ── */}
      <div
        className="
          flex-1 bg-gray-50/80 rounded-b-xl p-3 space-y-3
          overflow-y-auto
          /* Mobile: altura fija para scroll suave */
          min-h-[300px]
          /* Desktop: más alto */
          md:min-h-[400px]
        "
        style={{ maxHeight: "calc(100vh - 360px)" }}
      >
        {trabajos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className={`w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-3`}>
              <svg
                className={`w-6 h-6 ${colors.emptyIcon}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Sin trabajos en {estado.label.toLowerCase()}
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
              tecnicoLookup={tecnicoLookup}
              maquinariaLookup={maquinariaLookup}
            />
          ))
        )}
      </div>
    </div>
  );
}