"use client";

import Modal from "@/components/ui/Modal";

export default function ClienteModal({
  open,
  onClose,
  title = "Registrar cliente",
  primaryLabel = "Guardar",
  formCliente,
  onChange,
  onSave,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Nombre</label>
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="Nombre del cliente"
            value={formCliente.nombre}
            onChange={(e) => onChange({ ...formCliente, nombre: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">RUC</label>
          <input
            className="w-full rounded border px-3 py-2"
            placeholder="RUC"
            value={formCliente.ruc}
            onChange={(e) => onChange({ ...formCliente, ruc: e.target.value })}
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
