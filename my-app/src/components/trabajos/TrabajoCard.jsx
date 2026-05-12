import { Trash2 } from "lucide-react";
import { formatDisplayDate } from "@/lib/utils";

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
  const itemsAsignados = Array.from(
    new Set(
      actividades.flatMap((a) => [
        ...(a.repuestos || []).map((i) => i.item_nombre),
        ...(a.consumibles || []).map((i) => i.item_nombre),
      ]).filter(Boolean)
    )
  );

  const tecnicos = (trabajo.tecnicos || []).map(
    (id) => tecnicoLookup[id] || `Tecnico #${id}`
  );
  const maquinariaTexto = maquinariaLookup[trabajo.maquinaria] || null;

  return (
    <div
      className={`
        group cursor-pointer rounded-lg border border-gray-200 border-l-4 bg-white p-4 shadow-sm
        transition-all duration-150 hover:border-gray-300 hover:shadow-md active:scale-[0.99] active:shadow-sm
        ${estatusBorderColor[trabajo.estatus]}
      `}
      onClick={() => onView(trabajo)}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 pr-1">
          <h4 className="truncate text-base font-bold leading-tight text-[#1e3a8a]">
            {trabajo.codigo_orden}
          </h4>
          {(trabajo.maquinaria_nombre || maquinariaTexto) && (
            <p className="mt-0.5 truncate text-xs text-gray-500">
              <span className="font-semibold text-gray-700">
                {trabajo.maquinaria_codigo || "MAQ"}
              </span>{" "}
              · {trabajo.maquinaria_nombre || maquinariaTexto}
            </p>
          )}
        </div>

        <div className="flex items-start gap-2">
          <span
            className={`
              flex flex-shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold
              ${prioridadStyle.bg} ${prioridadStyle.text} ${prioridadStyle.border}
            `}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${prioridadStyle.dot}`} />
            {trabajo.prioridad}
          </span>

          {onDelete ? (
            <button
              type="button"
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(trabajo.id);
              }}
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4" strokeWidth={2.2} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {trabajo.fecha && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <svg className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{formatDisplayDate(trabajo.fecha)}</span>
          </div>
        )}

        {trabajo.lugar && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <svg className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className={trabajo.lugar === "CAMPO" ? "font-semibold text-[#1e3a8a]" : ""}>
              {trabajo.lugar === "TALLER" ? "Taller" : "Campo"}
            </span>
          </div>
        )}

        {tecnicos.length > 0 && (
          <div className="flex w-full items-center gap-1.5 text-xs text-gray-600">
            <svg className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="truncate">{tecnicos.join(", ")}</span>
          </div>
        )}
      </div>

      {(tipoActividades.length > 0 || itemsAsignados.length > 0) && (
        <div className="space-y-1.5 border-t border-gray-100 pt-2.5">
          {tipoActividades.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tipoActividades.slice(0, 3).map((tipo) => (
                <span
                  key={tipo}
                  className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-[#1e3a8a]"
                >
                  {prettyLabel(tipo)}
                </span>
              ))}
              {tipoActividades.length > 3 && (
                <span className="self-center text-[11px] text-gray-400">+{tipoActividades.length - 3}</span>
              )}
            </div>
          )}

          {itemsAsignados.length > 0 && (
            <p className="text-[11px] text-gray-500">
              Items:{" "}
              <span className="font-semibold text-gray-700">
                {itemsAsignados.slice(0, 2).join(", ")}
                {itemsAsignados.length > 2 ? ` +${itemsAsignados.length - 2}` : ""}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
