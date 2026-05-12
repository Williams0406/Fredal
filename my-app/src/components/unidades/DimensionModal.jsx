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
              placeholder="Código (Ej: LONGITUD)"
              value={form.codigo}
              onChange={(e) => onChange({ ...form, codigo: e.target.value.toUpperCase() })}
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
              onChange={(e) => onChange({ ...form, descripcion: e.target.value })}
            />
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
