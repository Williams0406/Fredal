"use client";

import Modal from "@/components/ui/Modal";

export default function UbicacionModal({
  open,
  onClose,
  title = "Registrar ubicación",
  primaryLabel = "Guardar",
  clientes,
  formUbicacion,
  onChange,
  onSave,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Cliente</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={formUbicacion.cliente}
            onChange={(e) => onChange({ ...formUbicacion, cliente: e.target.value })}
          >
            <option value="">Seleccione cliente</option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Nombre ubicación</label>
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Ej: Sede central"
            value={formUbicacion.nombre}
            onChange={(e) => onChange({ ...formUbicacion, nombre: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Dirección</label>
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Dirección"
            value={formUbicacion.direccion}
            onChange={(e) => onChange({ ...formUbicacion, direccion: e.target.value })}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 px-4 py-2 text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded bg-[#1e3a8a] px-4 py-2 text-sm text-white"
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}