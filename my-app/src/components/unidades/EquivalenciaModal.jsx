"use client";

export default function EquivalenciaModal({
  open,
  form,
  categorias,
  unidades,
  baseActual,
  onClose,
  onChange,
  onSave,
}) {
  if (!open) return null;

  const unidadesFiltradas = unidades.filter(
    (unidad) => unidad.categoria === form.categoria
  );
  const unidadBase = unidades.find(
    (unidad) => unidad.id === Number(form.unidadBaseId)
  );
  const unidadRelacion = unidades.find(
    (unidad) => unidad.id === Number(form.unidadRelacionId)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#1e3a8a]">
              Establecer equivalencia
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
            value={form.categoria}
            onChange={(e) =>
              onChange({
                ...form,
                categoria: e.target.value,
                unidadBaseId: "",
                unidadRelacionId: "",
              })
            }
          >
            <option value="">Seleccione dimensión</option>
            {categorias.map((categoria) => (
              <option key={categoria.value} value={categoria.value}>
                {categoria.label}
              </option>
            ))}
          </select>
          <input
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Factor a unidad base"
            type="number"
            step="0.000001"
            value={form.factor_a_unidad}
            onChange={(e) =>
              onChange({ ...form, factor_a_unidad: e.target.value })
            }
            disabled={!form.categoria}
          />
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={form.unidadBaseId}
            onChange={(e) =>
              onChange({ ...form, unidadBaseId: e.target.value })
            }
            disabled={!form.categoria}
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
            value={form.unidadRelacionId}
            onChange={(e) =>
              onChange({ ...form, unidadRelacionId: e.target.value })
            }
            disabled={!form.categoria}
          >
            <option value="">Unidad a relacionar</option>
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
            1 {unidadRelacion?.nombre ?? "..."} ={" "}
            {form.factor_a_unidad || "..."}{" "}
            {unidadBase?.nombre ?? "..."}
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
            Guardar equivalencia
          </button>
        </div>
      </div>
    </div>
  );
}