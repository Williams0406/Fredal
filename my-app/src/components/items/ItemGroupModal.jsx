"use client";

import { useEffect, useState } from "react";
import { itemAPI, itemGrupoAPI, unidadMedidaAPI } from "@/lib/api";

const emptyRow = {
  itemId: "",
  cantidad: 1,
  unidadId: "",
};

export default function ItemGroupModal({ onClose, onCreated }) {
  const [groupName, setGroupName] = useState("");
  const [rows, setRows] = useState([{ ...emptyRow }]);
  const [items, setItems] = useState([]);
  const [units, setUnits] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    itemAPI.list().then((res) => setItems(res.data));
    unidadMedidaAPI.list().then((res) => setUnits(res.data));
  }, []);

  const unitsByDimension = (dimensionId) =>
    units.filter((unit) => unit.dimension === dimensionId);

  const updateRow = (index, field, value) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === "itemId") next[index].unidadId = "";
      return next;
    });
  };

  const addRow = () => setRows((prev) => [...prev, { ...emptyRow }]);
  const removeRow = (index) => setRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));

  const handleSubmit = async () => {
    setError("");
    if (!groupName.trim()) return setError("Ingresa el nombre del grupo.");

    const payloadItems = rows
      .map((row) => {
        const item = items.find((it) => String(it.id) === String(row.itemId));
        const cantidad = Number(row.cantidad);
        if (!item || !cantidad || cantidad <= 0) return null;
        return {
          item: item.id,
          cantidad,
          unidad_medida: row.unidadId ? Number(row.unidadId) : item.unidad_medida || null,
        };
      })
      .filter(Boolean);

    if (!payloadItems.length) return setError("Debes agregar al menos un item válido.");

    setSaving(true);
    try {
      await itemGrupoAPI.create({ nombre: groupName.trim(), items: payloadItems });
      onCreated?.();
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.detail || "No se pudo guardar el grupo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={(event) => event.stopPropagation()}>
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#1e3a8a]">Crear grupo de items mixto</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del grupo</label>
            <input className="w-full border rounded-lg px-3 py-2" value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Ej. Kit mantenimiento mixto" />
          </div>

          <div className="space-y-3">
            {rows.map((row, index) => {
              const selectedItem = items.find((item) => String(item.id) === String(row.itemId));
              const availableUnits = selectedItem ? unitsByDimension(selectedItem.dimension) : [];

              return (
                <div key={`${index}-${row.itemId}`} className="border rounded-lg p-3 bg-gray-50 grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-5">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Item</label>
                    <select className="w-full border rounded-lg px-3 py-2 bg-white" value={row.itemId} onChange={(event) => updateRow(index, "itemId", event.target.value)}>
                      <option value="">Selecciona un item</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>{item.codigo} - {item.nombre} ({item.tipo_insumo})</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cantidad</label>
                    <input type="number" min="0.01" step="0.01" className="w-full border rounded-lg px-3 py-2" value={row.cantidad} onChange={(event) => updateRow(index, "cantidad", event.target.value)} />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Unidad</label>
                    <select className="w-full border rounded-lg px-3 py-2 bg-white" value={row.unidadId} onChange={(event) => updateRow(index, "unidadId", event.target.value)}>
                      <option value="">Unidad por defecto del item</option>
                      {availableUnits.map((unit) => (
                        <option key={unit.id} value={unit.id}>{unit.nombre}{unit.simbolo ? ` (${unit.simbolo})` : ""}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    <button type="button" onClick={() => removeRow(index)} disabled={rows.length === 1} className="w-full px-3 py-2 border rounded-lg text-red-600 border-red-200 disabled:opacity-40">−</button>
                  </div>
                </div>
              );
            })}
          </div>

          <button type="button" className="px-4 py-2 rounded-lg border border-dashed border-[#1e3a8a] text-[#1e3a8a]" onClick={addRow}>+ Agregar item al grupo</button>
        </div>

        <div className="border-t px-6 py-4 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
          <button className="px-4 py-2 border rounded-lg" onClick={onClose}>Cancelar</button>
          <button className="px-4 py-2 bg-[#1e3a8a] text-white rounded-lg disabled:opacity-50" onClick={handleSubmit} disabled={saving}>Guardar grupo</button>
        </div>
      </div>
    </div>
  );
}