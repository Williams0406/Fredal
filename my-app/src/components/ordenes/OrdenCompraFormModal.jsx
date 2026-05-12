"use client";

import { useEffect, useState } from "react";
import { itemAPI, ordenCompraAPI, proveedorAPI } from "@/lib/api";

const emptyRow = {
  item: "",
  cantidad: "1",
  proveedor: "",
};

export default function OrdenCompraFormModal({
  onCreated,
  triggerLabel = "Crear orden de compra",
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [rows, setRows] = useState([{ ...emptyRow }]);
  const [observaciones, setObservaciones] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    Promise.all([itemAPI.list(), proveedorAPI.list()])
      .then(([itemsRes, proveedoresRes]) => {
        setItems(itemsRes.data || []);
        setProveedores(proveedoresRes.data || []);
      })
      .catch((err) => {
        console.error("Error cargando datos para orden de compra:", err);
      });
  }, [open]);

  const updateRow = (index, field, value) => {
    setRows((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      )
    );
  };

  const addRow = () => setRows((prev) => [...prev, { ...emptyRow }]);
  const removeRow = (index) =>
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));

  const handleSubmit = async () => {
    setError("");

    const payloadRows = rows
      .map((row) => ({
        item: Number(row.item),
        cantidad: Number(row.cantidad),
        proveedor: row.proveedor ? Number(row.proveedor) : null,
      }))
      .filter((row) => row.item && row.cantidad > 0);

    if (!payloadRows.length) {
      setError("Debes agregar al menos un item válido.");
      return;
    }

    setLoading(true);
    try {
      await ordenCompraAPI.create({
        observaciones,
        items: payloadRows,
      });

      setOpen(false);
      setRows([{ ...emptyRow }]);
      setObservaciones("");
      onCreated?.();
    } catch (err) {
      console.error("Error creando orden de compra:", err);
      setError(err?.response?.data?.detail || "No se pudo crear la orden de compra.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2.5 rounded-lg bg-[#1e3a8a] text-white text-sm font-medium hover:bg-[#17315f] transition-colors"
      >
        {triggerLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white w-full max-w-4xl rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#1e3a8a]">Nueva orden de compra</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Registra los items que compras debe gestionar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones
                </label>
                <textarea
                  value={observaciones}
                  onChange={(event) => setObservaciones(event.target.value)}
                  rows={3}
                  placeholder="Notas para el área de compras"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm"
                />
              </div>

              <div className="space-y-4">
                {rows.map((row, index) => {
                  const selectedItem = items.find((item) => String(item.id) === String(row.item));

                  return (
                    <div key={`row-${index}`} className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-gray-800">Item #{index + 1}</p>
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Quitar
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-5">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Item</label>
                          <select
                            value={row.item}
                            onChange={(event) => updateRow(index, "item", event.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                          >
                            <option value="">Selecciona un item</option>
                            {items.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.codigo} - {item.nombre}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Cantidad</label>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={row.cantidad}
                            onChange={(event) => updateRow(index, "cantidad", event.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                          />
                        </div>

                        <div className="md:col-span-5">
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Proveedor</label>
                          <select
                            value={row.proveedor}
                            onChange={(event) => updateRow(index, "proveedor", event.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                          >
                            <option value="">Sin proveedor definido</option>
                            {proveedores.map((proveedor) => (
                              <option key={proveedor.id} value={proveedor.id}>
                                {proveedor.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {selectedItem && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-600">
                          <div className="rounded-lg bg-white border border-gray-200 px-3 py-2">
                            <span className="block text-gray-500">Código</span>
                            <span className="font-semibold text-gray-800">{selectedItem.codigo}</span>
                          </div>
                          <div className="rounded-lg bg-white border border-gray-200 px-3 py-2">
                            <span className="block text-gray-500">Nombre</span>
                            <span className="font-semibold text-gray-800">{selectedItem.nombre}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={addRow}
                className="px-4 py-2 rounded-lg border border-dashed border-[#1e3a8a] text-[#1e3a8a] text-sm font-medium hover:bg-blue-50"
              >
                Agregar item
              </button>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSubmit}
                className="px-4 py-2.5 rounded-lg bg-[#1e3a8a] text-white text-sm font-medium disabled:opacity-60"
              >
                {loading ? "Guardando..." : "Emitir orden"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
