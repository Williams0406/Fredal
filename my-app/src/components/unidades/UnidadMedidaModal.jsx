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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#1e3a8a]">
              {title}
            </h2>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
          <button
            className="text-gray-400 hover:text-gray-600"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-3">
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
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={form.es_base}
              onChange={(e) =>
                onChange({ ...form, es_base: e.target.checked })
              }
            />
            Marcar como unidad base de la dimensión
          </label>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            className="rounded-lg border px-4 py-2 text-sm"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm text-white"
            onClick={onSave}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}