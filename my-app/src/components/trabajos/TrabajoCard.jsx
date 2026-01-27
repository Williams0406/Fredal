export default function TrabajoCard({ trabajo, onDelete, onView }) {
  // Mapeo de prioridades a colores
  const prioridadStyles = {
    REGULAR: {
      bg: "bg-gray-100",
      text: "text-gray-700",
      border: "border-gray-300",
    },
    URGENTE: {
      bg: "bg-yellow-50",
      text: "text-yellow-700",
      border: "border-yellow-300",
    },
    EMERGENCIA: {
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-300",
    },
  };

  const prioridadStyle = prioridadStyles[trabajo.prioridad] || prioridadStyles.REGULAR;

  // Mapeo de estados para borde izquierdo (según guía Fredal)
  const estatusBorderColor = {
    PENDIENTE: "border-l-gray-400",
    EN_PROCESO: "border-l-[#1e3a8a]",
    FINALIZADO: "border-l-[#84cc16]",
  };

  return (
    <div
      className={`
        bg-white rounded-lg border border-gray-200 shadow-sm
        ${estatusBorderColor[trabajo.estatus]} border-l-4
        p-4 cursor-pointer
        hover:shadow-md hover:border-gray-300
        transition-all duration-200
        group
      `}
      onClick={() => onView(trabajo)}
    >
      {/* Header - Código de orden */}
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-[#1e3a8a] text-base group-hover:text-[#1e3a8a]/80 transition-colors">
          {trabajo.codigo_orden}
        </h4>
        
        {/* Badge de prioridad */}
        <span
          className={`
            px-2 py-0.5 rounded text-xs font-medium
            ${prioridadStyle.bg} ${prioridadStyle.text} ${prioridadStyle.border} border
          `}
        >
          {trabajo.prioridad}
        </span>
      </div>

      {/* Información de maquinaria */}
      {trabajo.maquinaria_nombre && (
        <div className="mb-3">
          <p className="text-sm text-gray-900 font-medium">
            {trabajo.maquinaria_codigo}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {trabajo.maquinaria_nombre}
          </p>
        </div>
      )}

      {/* Meta información */}
      <div className="space-y-1.5 mb-3">
        {/* Fecha */}
        {trabajo.fecha && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{new Date(trabajo.fecha).toLocaleDateString('es-PE')}</span>
          </div>
        )}

        {/* Lugar */}
        {trabajo.lugar && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{trabajo.lugar === "TALLER" ? "Taller" : "Campo"}</span>
          </div>
        )}

        {/* Técnicos asignados */}
        {trabajo.tecnicos?.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>{trabajo.tecnicos.length} técnico(s)</span>
          </div>
        )}
      </div>

      {/* Footer - Acciones */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <button
          className="text-xs text-[#1e3a8a] font-medium hover:text-[#1e3a8a]/80 
                   transition-colors duration-200 flex items-center gap-1"
          onClick={(e) => {
            e.stopPropagation();
            onView(trabajo);
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Ver detalles
        </button>

        <button
          className="text-xs text-red-600 font-medium hover:text-red-700 
                   transition-colors duration-200 flex items-center gap-1"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(trabajo.id);
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Eliminar
        </button>
      </div>
    </div>
  );
}