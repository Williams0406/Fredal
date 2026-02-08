"use client";

export default function UnidadRelacionModal({
  open,
  form,
  dimensiones,
  unidades,
  baseActual,
  onClose,
  onChange,
  onSave,
}) {
  if (!open) return null;

  const unidadesFiltradas = unidades.filter(
    (unidad) => String(unidad.dimension) === String(form.dimension)
  );
  const unidadBase = unidades.find(
    (unidad) => unidad.id === Number(form.unidad_base)
  );
  const unidadRelacionada = unidades.find(
    (unidad) => unidad.id === Number(form.unidad_relacionada)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#1e3a8a]">
              Relacionar unidades
            </h2>
            <p className="text-xs text-gray-500">
              Selecciona unidades de la misma dimensión y define la relación.
            </p>
          </div>
          <button
            className="text-gray-400 hover:text-gray-600"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={form.dimension}
            onChange={(e) =>
              onChange({
                ...form,
                dimension: e.target.value,
                unidad_base: "",
                unidad_relacionada: "",
              })
            }
          >
            <option value="">Seleccione dimensión</option>
            {dimensiones.map((dimension) => (
              <option key={dimension.id} value={dimension.id}>
                {dimension.nombre} ({dimension.codigo})
              </option>
            ))}
          </select>
          <input
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Factor (1 base = X relacionada)"
            type="number"
            step="0.000001"
            value={form.factor}
            onChange={(e) => onChange({ ...form, factor: e.target.value })}
            disabled={!form.dimension}
          />
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={form.unidad_base}
            onChange={(e) => onChange({ ...form, unidad_base: e.target.value })}
            disabled={!form.dimension}
          >
            <option value="">Unidad base</option>
            {unidadesFiltradas.map((unidad) => (
              <option key={unidad.id} value={unidad.id}>
                {unidad.nombre}
                {unidad.simbolo ? ` (${unidad.simbolo})` : ""}
              </option>
            ))}
          </select>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={form.unidad_relacionada}
            onChange={(e) =>
              onChange({ ...form, unidad_relacionada: e.target.value })
            }
            disabled={!form.dimension}
          >
            <option value="">Unidad relacionada</option>
            {unidadesFiltradas.map((unidad) => (
              <option key={unidad.id} value={unidad.id}>
                {unidad.nombre}
                {unidad.simbolo ? ` (${unidad.simbolo})` : ""}
              </option>
            ))}
          </select>
        </div>

        {baseActual ? (
          <p className="mt-3 text-xs text-gray-500">
            Base actual en esta dimensión: {baseActual.nombre}
            {baseActual.simbolo ? ` (${baseActual.simbolo})` : ""}.
          </p>
        ) : null}

        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          <p className="font-semibold">Vista previa</p>
          <p>
            1 {unidadBase?.nombre ?? "..."} = {form.factor || "..."}{" "}
            {unidadRelacionada?.nombre ?? "..."}
          </p>
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
            Guardar relación
          </button>
        </div>
      </div>
    </div>
  );
}