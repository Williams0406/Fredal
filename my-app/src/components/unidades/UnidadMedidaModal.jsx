"use client";

export default function UnidadMedidaModal({
  open,
  form,
  dimensiones,
  title,
  description,
  primaryLabel,
  onClose,
  onChange,
  onSave,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/30" onClick={onClose}>
      <div className="flex min-h-full items-start justify-center px-4 py-4 sm:items-center">
        <div
          className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl sm:max-h-[calc(100dvh-4rem)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold text-[#1e3a8a]">{title}</h2>
              <p className="text-xs text-gray-500">{description}</p>
            </div>
            <button className="text-gray-400 hover:text-gray-600" onClick={onClose} aria-label="Cerrar">
              ×
            </button>
          </div>

          <div className="mt-4 flex-1 overflow-y-auto space-y-3 px-6 pb-1">
            <input
              className="w-full rounded-lg border px-3 py-2"
              placeholder="Nombre (Ej: METRO)"
              value={form.nombre}
              onChange={(e) => onChange({ ...form, nombre: e.target.value })}
            />
            <input
              className="w-full rounded-lg border px-3 py-2"
              placeholder="Símbolo (Ej: m)"
              value={form.simbolo}
              onChange={(e) => onChange({ ...form, simbolo: e.target.value })}
            />
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={form.dimension}
              onChange={(e) => onChange({ ...form, dimension: e.target.value })}
            >
              <option value="">Seleccione dimensión</option>
              {dimensiones.map((dimension) => (
                <option key={dimension.id} value={dimension.id}>
                  {dimension.nombre} ({dimension.codigo})
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-gray-200 px-6 py-4 sm:flex-row sm:justify-end">
            <button className="rounded-lg border px-4 py-2 text-sm" onClick={onClose}>
              Cancelar
            </button>
            <button className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm text-white" onClick={onSave}>
              {primaryLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
