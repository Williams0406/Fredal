"use client";

import { useState } from "react";
import { itemAPI } from "@/lib/api";

export default function ItemFormModal({ open, onClose, onCreated }) {
  const [autoCode, setAutoCode] = useState(true);
  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    tipo_insumo: "REPUESTO",
    unidad_medida: "UNIDAD",
    volvo: false,
  });

  if (!open) return null;

  const generateCode = () =>
    `ITEM-${Math.floor(Math.random() * 99999)
      .toString()
      .padStart(5, "0")}`;

  const submit = async (e) => {
    e.preventDefault();

    const payload = {
      ...form,
      codigo: autoCode ? generateCode() : form.codigo,
    };

    try {
      await itemAPI.create(payload);
      onCreated();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error al crear el item");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form
        onSubmit={submit}
        className="bg-white rounded-lg p-6 w-full max-w-md space-y-4"
      >
        <h2 className="text-lg font-semibold">➕ Nuevo Item</h2>

        {/* Código */}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoCode}
            onChange={() => setAutoCode(!autoCode)}
          />
          Código autogenerado
        </label>

        {!autoCode && (
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Código"
            required
            value={form.codigo}
            onChange={(e) =>
              setForm({ ...form, codigo: e.target.value })
            }
          />
        )}

        {/* Nombre */}
        <div>
          <label className="text-sm font-medium">Nombre</label>
          <input
            className="w-full border rounded px-3 py-2"
            required
            value={form.nombre}
            onChange={(e) =>
              setForm({ ...form, nombre: e.target.value })
            }
          />
        </div>

        {/* Tipo */}
        <div>
          <label className="text-sm font-medium">Tipo de insumo</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={form.tipo_insumo}
            onChange={(e) =>
              setForm({ ...form, tipo_insumo: e.target.value })
            }
          >
            <option value="REPUESTO">Repuesto</option>
            <option value="CONSUMIBLE">Consumible</option>
          </select>
        </div>

        {/* Unidad */}
        <div>
          <label className="text-sm font-medium">Unidad de medida</label>
          <input
            className="w-full border rounded px-3 py-2"
            required
            value={form.unidad_medida}
            onChange={(e) =>
              setForm({ ...form, unidad_medida: e.target.value })
            }
          />
        </div>

        {/* Volvo */}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.volvo}
            onChange={() =>
              setForm({ ...form, volvo: !form.volvo })
            }
          />
          Repuesto Volvo
        </label>

        {/* Acciones */}
        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded border"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded bg-blue-600 text-white"
          >
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
