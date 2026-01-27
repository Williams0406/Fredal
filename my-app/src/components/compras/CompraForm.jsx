"use client";

import { useEffect, useState } from "react";
import { compraAPI, itemAPI, proveedorAPI } from "@/lib/api";

const IGV = 1.18;

const emptyDetalle = {
  item: "",
  cantidad: 1,
  moneda: "PEN",
  tipo_registro: "VALOR_UNITARIO",
  monto: "",
};

export default function CompraForm({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =========================
     CABECERA
  ========================= */

  const [cabecera, setCabecera] = useState({
    fecha: "",
    proveedor: "",
    tipo_comprobante: "",
    codigo_comprobante: "",
  });

  /* =========================
     DETALLE
  ========================= */

  const [detalles, setDetalles] = useState([{ ...emptyDetalle }]);

  useEffect(() => {
    if (open) {
      itemAPI.list().then((res) => setItems(res.data));
      proveedorAPI.list().then((res) => setProveedores(res.data));
    }
  }, [open]);

  /* =========================
     HELPERS
  ========================= */

  const updateDetalle = (index, field, value) => {
    const copy = [...detalles];
    copy[index][field] = value;
    setDetalles(copy);
  };

  const addDetalle = () =>
    setDetalles((prev) => [...prev, { ...emptyDetalle }]);

  const removeDetalle = (index) =>
    setDetalles((prev) => prev.filter((_, i) => i !== index));

  const calcular = (d) => {
    const monto = Number(d.monto || 0);
    const cantidad = Number(d.cantidad || 1);

    let valor_unitario = 0;
    let costo_unitario = 0;
    let valor_total = 0;
    let costo_total = 0;

    switch (d.tipo_registro) {
      case "VALOR_UNITARIO":
        valor_unitario = monto;
        costo_unitario = monto * IGV;
        valor_total = valor_unitario * cantidad;
        costo_total = costo_unitario * cantidad;
        break;

      case "COSTO_UNITARIO":
        costo_unitario = monto;
        valor_unitario = monto / IGV;
        valor_total = valor_unitario * cantidad;
        costo_total = costo_unitario * cantidad;
        break;

      case "VALOR_TOTAL":
        valor_total = monto;
        valor_unitario = monto / cantidad;
        costo_unitario = valor_unitario * IGV;
        costo_total = costo_unitario * cantidad;
        break;

      case "COSTO_TOTAL":
        costo_total = monto;
        costo_unitario = monto / cantidad;
        valor_unitario = costo_unitario / IGV;
        valor_total = valor_unitario * cantidad;
        break;
    }

    return {
      valor_unitario,
      costo_unitario,
      valor_total,
      costo_total,
    };
  };

  /* =========================
     SUBMIT
  ========================= */

  const handleSubmit = async () => {
    setError("");

    // Validaciones
    if (!cabecera.fecha) {
      setError("La fecha es obligatoria");
      return;
    }

    if (!cabecera.tipo_comprobante) {
      setError("El tipo de comprobante es obligatorio");
      return;
    }

    if (!cabecera.codigo_comprobante?.trim()) {
      setError("El código de comprobante es obligatorio");
      return;
    }

    // Validar que todos los detalles tengan item y monto
    for (let i = 0; i < detalles.length; i++) {
      if (!detalles[i].item) {
        setError(`Falta seleccionar el item en la línea ${i + 1}`);
        return;
      }
      if (!detalles[i].monto || Number(detalles[i].monto) <= 0) {
        setError(`Falta el monto en la línea ${i + 1}`);
        return;
      }
    }

    setLoading(true);

    try {
      for (const d of detalles) {
        await compraAPI.create({
          fecha: cabecera.fecha,
          proveedor: cabecera.proveedor || null,
          tipo_comprobante: cabecera.tipo_comprobante,
          codigo_comprobante: cabecera.codigo_comprobante,

          item: Number(d.item),
          cantidad: Number(d.cantidad),
          moneda: d.moneda,
          tipo_registro: d.tipo_registro,
          monto: Number(d.monto),
        });
      }

      setOpen(false);
      setCabecera({
        fecha: "",
        proveedor: "",
        tipo_comprobante: "",
        codigo_comprobante: "",
      });
      setDetalles([{ ...emptyDetalle }]);
      onCreated?.();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Error al registrar la compra");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     UI
  ========================= */

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-[#1e3a8a] text-white px-5 py-2.5 rounded-lg text-sm font-medium
                 hover:bg-[#1e3a8a]/90 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] 
                 focus:ring-offset-2 transition-all duration-200 flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Registrar Compra
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white w-full max-w-5xl rounded-xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-[#1e3a8a]">
                  Registrar Nueva Compra
                </h2>
                <button
                  onClick={() => setOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-6">
                
                {/* Error message */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* CABECERA */}
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">
                    Información del Comprobante
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={cabecera.fecha}
                        onChange={(e) =>
                          setCabecera({ ...cabecera, fecha: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                                 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                                 transition-all duration-200"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Proveedor (opcional)
                      </label>
                      <select
                        value={cabecera.proveedor}
                        onChange={(e) =>
                          setCabecera({ ...cabecera, proveedor: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                                 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                                 transition-all duration-200"
                      >
                        <option value="">Sin proveedor</option>
                        {proveedores.map((p) => (
                          <option key={p.id} value={p.id.toString()}>
                            {p.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de comprobante <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={cabecera.tipo_comprobante}
                        onChange={(e) =>
                          setCabecera({ ...cabecera, tipo_comprobante: e.target.value })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                                 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                                 transition-all duration-200"
                      >
                        <option value="">Seleccione tipo</option>
                        <option value="FACTURA">Factura</option>
                        <option value="BOLETA">Boleta</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Código de comprobante <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: F001-00123"
                        value={cabecera.codigo_comprobante}
                        onChange={(e) =>
                          setCabecera({
                            ...cabecera,
                            codigo_comprobante: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                                 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                                 transition-all duration-200 placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </div>

                {/* DETALLE */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-semibold text-gray-900">
                      Items de la Compra
                    </h3>
                    <button
                      onClick={addDetalle}
                      className="px-4 py-2 text-sm font-medium text-[#84cc16] bg-green-50 
                               border border-green-200 rounded-lg hover:bg-green-100 
                               transition-all duration-200 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Agregar Item
                    </button>
                  </div>

                  <div className="space-y-4">
                    {detalles.map((d, i) => {
                      const calc = calcular(d);

                      return (
                        <div
                          key={i}
                          className="border border-gray-200 rounded-lg p-4 bg-white"
                        >
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-sm font-semibold text-gray-700">
                              Item #{i + 1}
                            </span>
                            {detalles.length > 1 && (
                              <button
                                onClick={() => removeDetalle(i)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium
                                         transition-colors duration-200 flex items-center gap-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Quitar
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-5 gap-3 mb-3">
                            <div className="col-span-2">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Item
                              </label>
                              <select
                                value={d.item}
                                onChange={(e) =>
                                  updateDetalle(i, "item", e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                                         focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
                              >
                                <option value="">Seleccione item</option>
                                {items.map((it) => (
                                  <option key={it.id} value={it.id.toString()}>
                                    {it.codigo} — {it.nombre}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Cantidad
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={d.cantidad}
                                onChange={(e) =>
                                  updateDetalle(i, "cantidad", e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                                         focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Moneda
                              </label>
                              <select
                                value={d.moneda}
                                onChange={(e) =>
                                  updateDetalle(i, "moneda", e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                                         focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
                              >
                                <option value="PEN">PEN</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Tipo registro
                              </label>
                              <select
                                value={d.tipo_registro}
                                onChange={(e) =>
                                  updateDetalle(i, "tipo_registro", e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                                         focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
                              >
                                <option value="VALOR_UNITARIO">Valor unit.</option>
                                <option value="COSTO_UNITARIO">Costo unit.</option>
                                <option value="VALOR_TOTAL">Valor total</option>
                                <option value="COSTO_TOTAL">Costo total</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Monto
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={d.monto}
                                onChange={(e) =>
                                  updateDetalle(i, "monto", e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                                         focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                                         placeholder:text-gray-400"
                              />
                            </div>
                          </div>

                          {/* Cálculos */}
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-xs font-medium text-blue-900 mb-2">
                              Valores calculados (IGV 18%):
                            </p>
                            <div className="grid grid-cols-4 gap-3 text-xs">
                              <div>
                                <span className="text-blue-700">V. Unit:</span>
                                <span className="ml-1 font-semibold text-blue-900">
                                  {calc.valor_unitario.toFixed(2)}
                                </span>
                              </div>
                              <div>
                                <span className="text-blue-700">C. Unit:</span>
                                <span className="ml-1 font-semibold text-blue-900">
                                  {calc.costo_unitario.toFixed(2)}
                                </span>
                              </div>
                              <div>
                                <span className="text-blue-700">V. Total:</span>
                                <span className="ml-1 font-semibold text-blue-900">
                                  {calc.valor_total.toFixed(2)}
                                </span>
                              </div>
                              <div>
                                <span className="text-blue-700">C. Total:</span>
                                <span className="ml-1 font-semibold text-blue-900">
                                  {calc.costo_total.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl flex-shrink-0">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setOpen(false)}
                  disabled={loading}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white 
                           border border-gray-300 rounded-lg hover:bg-gray-50 
                           transition-all duration-200 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-[#1e3a8a]
                           rounded-lg hover:bg-[#1e3a8a]/90 focus:outline-none 
                           focus:ring-2 focus:ring-[#1e3a8a] focus:ring-offset-2
                           transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M5 13l4 4L19 7" />
                      </svg>
                      Guardar Compra
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}