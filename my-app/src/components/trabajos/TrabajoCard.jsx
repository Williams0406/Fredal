const prettyLabel = (value = "") =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export default function TrabajoCard({
  trabajo,
  onDelete,
  onView,
  tecnicoLookup = {},
  maquinariaLookup = {},
}) {
  const prioridadStyles = {
    REGULAR: {
      bg: "bg-gray-100",
      text: "text-gray-700",
      border: "border-gray-300",
      dot: "bg-gray-400",
    },
    URGENTE: {
      bg: "bg-yellow-50",
      text: "text-yellow-700",
      border: "border-yellow-300",
      dot: "bg-yellow-400",
    },
    EMERGENCIA: {
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-300",
      dot: "bg-red-500",
    },
  };

  const prioridadStyle = prioridadStyles[trabajo.prioridad] || prioridadStyles.REGULAR;

  const estatusBorderColor = {
    PENDIENTE: "border-l-gray-400",
    EN_PROCESO: "border-l-[#1e3a8a]",
    FINALIZADO: "border-l-[#84cc16]",
  };

  const actividades = trabajo.actividades || [];
  const tipoActividades = Array.from(
    new Set(actividades.map((a) => a.tipo_actividad).filter(Boolean))
  );
  const tiposMantenimiento = Array.from(
    new Set(actividades.map((a) => a.tipo_mantenimiento).filter(Boolean))
  );
  const itemsAsignados = Array.from(
    new Set(
      actividades.flatMap((a) => [
        ...(a.repuestos || []).map((i) => i.item_nombre),
        ...(a.consumibles || []).map((i) => i.item_nombre),
      ]).filter(Boolean)
    )
  );

  const tecnicos = (trabajo.tecnicos || []).map(
    (id) => tecnicoLookup[id] || `Técnico #${id}`
  );
  const maquinariaTexto = maquinariaLookup[trabajo.maquinaria] || null;

  return (
    <div
      className={`
        bg-white rounded-lg border border-gray-200 shadow-sm
        ${estatusBorderColor[trabajo.estatus]} border-l-4
        p-4 cursor-pointer
        hover:shadow-md hover:border-gray-300
        active:scale-[0.99] active:shadow-sm
        transition-all duration-150
        group
      `}
      onClick={() => onView(trabajo)}
    >
      {/* ── Header: código + prioridad ── */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-2">
          <h4 className="font-bold text-[#1e3a8a] text-base leading-tight truncate">
            {trabajo.codigo_orden}
          </h4>
          {/* Maquinaria visible desde el primer vistazo */}
          {(trabajo.maquinaria_nombre || maquinariaTexto) && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              <span className="font-semibold text-gray-700">
                {trabajo.maquinaria_codigo || "MAQ"}
              </span>{" "}
              · {trabajo.maquinaria_nombre || maquinariaTexto}
            </p>
          )}
        </div>

        <span
          className={`
            flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold
            ${prioridadStyle.bg} ${prioridadStyle.text} ${prioridadStyle.border} border
            whitespace-nowrap flex-shrink-0
          `}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${prioridadStyle.dot}`} />
          {trabajo.prioridad}
        </span>
      </div>

      {/* ── Meta info compacta ── */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3">
        {trabajo.fecha && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            {/* Calendar icon */}
            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{new Date(trabajo.fecha).toLocaleDateString("es-PE")}</span>
          </div>
        )}

        {trabajo.lugar && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            {/* Location icon */}
            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className={trabajo.lugar === "CAMPO" ? "font-semibold text-[#1e3a8a]" : ""}>
              {trabajo.lugar === "TALLER" ? "Taller" : "Campo"}
            </span>
          </div>
        )}

        {tecnicos.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600 w-full">
            {/* Person icon */}
            <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="truncate">{tecnicos.join(", ")}</span>
          </div>
        )}
      </div>

      {/* ── Actividades / Items ── */}
      {(tipoActividades.length > 0 || tiposMantenimiento.length > 0 || itemsAsignados.length > 0) && (
        <div className="pt-2.5 border-t border-gray-100 space-y-1.5 mb-3">
          {tipoActividades.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tipoActividades.slice(0, 3).map((tipo) => (
                <span key={tipo}
                  className="px-2 py-0.5 rounded-md bg-blue-50 text-[#1e3a8a] text-[11px] font-semibold">
                  {prettyLabel(tipo)}
                </span>
              ))}
              {tipoActividades.length > 3 && (
                <span className="text-[11px] text-gray-400 self-center">+{tipoActividades.length - 3}</span>
              )}
            </div>
          )}

          {tiposMantenimiento.length > 0 && (
            <p className="text-[11px] text-gray-500">
              Mant.: <span className="font-semibold text-gray-700">{tiposMantenimiento.map(prettyLabel).join(", ")}</span>
            </p>
          )}

          {itemsAsignados.length > 0 && (
            <p className="text-[11px] text-gray-500">
              Items: <span className="font-semibold text-gray-700">
                {itemsAsignados.slice(0, 2).join(", ")}
                {itemsAsignados.length > 2 ? ` +${itemsAsignados.length - 2}` : ""}
              </span>
            </p>
          )}
        </div>
      )}

      {/* ── Acciones ── */}
      {/*
        Desktop: botones pequeños de texto (como antes)
        Mobile: botones táctiles grandes (min 44px de altura, full-width friendly)
      */}
      <div className="flex items-center justify-between pt-2.5 border-t border-gray-100 gap-2">
        {/* Ver detalles — botón principal en mobile */}
        <button
          className="
            flex-1 flex items-center justify-center gap-1.5
            text-xs font-semibold text-[#1e3a8a]
            bg-blue-50 hover:bg-blue-100
            rounded-lg
            py-2.5 px-3
            min-h-[40px]
            transition-colors duration-150
            md:flex-none md:bg-transparent md:hover:bg-transparent md:py-0 md:px-0
            md:hover:text-[#1e3a8a]/80
          "
          onClick={(e) => {
            e.stopPropagation();
            onView(trabajo);
          }}
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Ver detalles
        </button>

        {/* Eliminar — botón secundario, más pequeño en mobile */}
        <button
          className="
            flex items-center justify-center gap-1.5
            text-xs font-semibold text-red-600
            bg-red-50 hover:bg-red-100
            rounded-lg
            py-2.5 px-3
            min-h-[40px]
            transition-colors duration-150
            md:bg-transparent md:hover:bg-transparent md:py-0 md:px-0
            md:hover:text-red-700
          "
          onClick={(e) => {
            e.stopPropagation();
            onDelete(trabajo.id);
          }}
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="hidden sm:inline">Eliminar</span>
        </button>
      </div>
    </div>
  );
}