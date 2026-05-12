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
      iconWrap: "bg-white/80 text-gray-600",
    },
    blue: {
      header: "bg-[#1e3a8a] text-white",
      badge: "bg-white/20 text-white",
      emptyIcon: "text-blue-300",
      iconWrap: "bg-white/15 text-white",
    },
    green: {
      header: "bg-[#84cc16] text-white",
      badge: "bg-white/25 text-white",
      emptyIcon: "text-lime-400",
      iconWrap: "bg-white/15 text-white",
    },
  };

  const colors = colorClasses[estado.color] || colorClasses.gray;
  const Icon = estado.icon;

  return (
    <div className="flex h-full flex-col">
      <div className={`rounded-t-xl px-4 py-3 ${colors.header}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${colors.iconWrap}`}>
              <Icon className="h-4 w-4" strokeWidth={2.2} />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wide">
              {estado.label}
            </h3>
          </div>

          <span
            className={`
              ${colors.badge}
              min-w-[28px] rounded-full px-2.5 py-1 text-center text-xs font-bold
            `}
          >
            {trabajos.length}
          </span>
        </div>
      </div>

      <div
        className="
          flex-1 space-y-3 rounded-b-xl bg-gray-50/80 p-3
          overflow-y-auto
          min-h-[300px]
          md:min-h-[400px]
        "
        style={{ maxHeight: "calc(100vh - 360px)" }}
      >
        {trabajos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-200">
              <svg
                className={`h-6 w-6 ${colors.emptyIcon}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-xs font-medium text-gray-500">
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
