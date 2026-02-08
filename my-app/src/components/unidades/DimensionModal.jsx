"use client";

export default function DimensionModal({
  open,
  form,
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
            placeholder="Código (Ej: LONGITUD)"
            value={form.codigo}
            onChange={(e) =>
              onChange({ ...form, codigo: e.target.value.toUpperCase() })
            }
          />
          <input
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Nombre (Ej: Longitud)"
            value={form.nombre}
            onChange={(e) => onChange({ ...form, nombre: e.target.value })}
          />
          <textarea
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Descripción (opcional)"
            rows={3}
            value={form.descripcion}
            onChange={(e) =>
              onChange({ ...form, descripcion: e.target.value })
            }
          />
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