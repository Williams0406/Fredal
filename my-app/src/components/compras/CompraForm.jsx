"use client";

import { useEffect, useState, useMemo } from "react";
import {
  compraAPI,
  itemAPI,
  proveedorAPI,
  unidadMedidaAPI,
  unidadRelacionAPI,
} from "@/lib/api";
import ItemGroupSelector from "@/components/items/ItemGroupSelector";
import { getTodayDateInputValue } from "@/lib/utils";

const IGV = 1.18;

const getApiErrorMessage = (err, fallback) => {
  const data = err?.response?.data;
  const detail = data?.detail;

  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail) && typeof detail[0] === "string") return detail[0];
  if (detail && typeof detail === "object") {
    const firstDetail = Object.values(detail)[0];
    if (Array.isArray(firstDetail) && typeof firstDetail[0] === "string") {
      return firstDetail[0];
    }
    if (typeof firstDetail === "string") return firstDetail;
  }

  if (typeof data === "string" && data.trim()) return data;
  if (Array.isArray(data) && typeof data[0] === "string") return data[0];
  if (data && typeof data === "object") {
    const firstValue = Object.values(data)[0];
    if (Array.isArray(firstValue) && typeof firstValue[0] === "string") {
      return firstValue[0];
    }
    if (typeof firstValue === "string") return firstValue;
  }

  return fallback;
};

const emptyDetalle = {
  item: "",
  cantidad: 1,
  unidad_medida: "",
  tipo_registro: "VALOR_UNITARIO",
  monto: "",
};

export default function CompraForm({ onCreated }) {
  const getToday = () => getTodayDateInputValue();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [unidadesMedida, setUnidadesMedida] = useState([]);
  const [relacionesUnidad, setRelacionesUnidad] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  /* =========================
      CABECERA
  ========================= */

  const [cabecera, setCabecera] = useState({
    fecha: getToday(),
    proveedor: "",
    tipo_comprobante: "",
    codigo_comprobante: "",
    moneda: "PEN", // 2. Agregado a la cabecera
  });

  /* =========================
      DETALLE
  ========================= */

  const [detalles, setDetalles] = useState([{ ...emptyDetalle }]);

  useEffect(() => {
    if (open) {
      itemAPI.list().then((res) => setItems(res.data));
      proveedorAPI.list().then((res) => setProveedores(res.data));
      unidadMedidaAPI.list().then((res) =>
        setUnidadesMedida(res.data)
      );
      unidadRelacionAPI.list().then((res) => setRelacionesUnidad(res.data));
      setCabecera((prev) => ({
        ...prev,
        fecha: prev.fecha || getToday(),
      }));
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

  const handleApplyGroup = (group) => {
    if (!group?.items?.length) return;

    const detallesDesdeGrupo = group.items
      .map((groupItem) => {
        const item = items.find((it) => String(it.id) === String(groupItem.item));
        if (!item) return null;
        return {
          ...emptyDetalle,
          item: String(item.id),
          cantidad: Number(groupItem.cantidad) || 1,
          unidad_medida: groupItem.unidad_medida ? String(groupItem.unidad_medida) : String(item.unidad_medida || ""),
        };
      })
      .filter(Boolean);

    if (!detallesDesdeGrupo.length) return;
    setDetalles((prev) => [...prev, ...detallesDesdeGrupo]);
    setError("");
  };

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

  const unidadesPorItem = (itemSel) => {
    if (!itemSel?.dimension) return [];
    return unidadesMedida.filter((u) => u.dimension === itemSel.dimension);
  };

  const relationForUnits = (originUnitId, targetUnitId) =>
    relacionesUnidad.find(
      (rel) =>
        rel.unidad_base === originUnitId &&
        rel.unidad_relacionada === targetUnitId
    );

  const resolveCantidadBase = (detalle, itemSel) => {
    const cantidad = Number(detalle.cantidad || 0);
    if (itemSel?.tipo_insumo !== "CONSUMIBLE") {
      return {
        cantidad,
        unidad_medida: itemSel?.unidad_medida ?? null,
        missingRelation: false,
      };
    }

    const selectedUnitId = detalle.unidad_medida
      ? Number(detalle.unidad_medida)
      : itemSel.unidad_medida ?? null;

    if (!selectedUnitId || selectedUnitId === itemSel.unidad_medida) {
      return {
        cantidad,
        unidad_medida: selectedUnitId ?? null,
        missingRelation: false,
      };
    }

    const relation = relationForUnits(selectedUnitId, itemSel.unidad_medida);
    if (!relation) {
      return {
        cantidad,
        unidad_medida: selectedUnitId,
        missingRelation: true,
      };
    }

    return {
      cantidad,
      unidad_medida: selectedUnitId,
      missingRelation: false,
    };
  };

  /* =========================
      SUBMIT
  ========================= */

  const handleSubmit = async () => {
    setError("");

    if (!cabecera.fecha) { setError("La fecha es obligatoria"); return; }
    if (Boolean(cabecera.tipo_comprobante) !== Boolean(cabecera.codigo_comprobante?.trim())) {
      setError("Debes completar tipo y codigo de comprobante juntos, o dejar ambos vacios");
      return;
    }
    for (let i = 0; i < detalles.length; i++) {
      if (!detalles[i].item) {
        setError(`Falta seleccionar el item en la linea ${i + 1}`);
        return;
      }
      if (!detalles[i].monto || Number(detalles[i].monto) <= 0) {
        setError(`Falta el monto en la linea ${i + 1}`);
        return;
      }
      const itemSel = items.find((it) => it.id.toString() === detalles[i].item);
      if (itemSel?.tipo_insumo === "CONSUMIBLE") {
        const conversion = resolveCantidadBase(detalles[i], itemSel);
        if (conversion.missingRelation) {
          setError(
            `No existe relacion de unidades para convertir la linea ${i + 1}.`
          );
          return;
        }
      }
    }

    setLoading(true);

    try {
      await compraAPI.batch({
        fecha: cabecera.fecha,
        proveedor: cabecera.proveedor || null,
        tipo_comprobante: cabecera.tipo_comprobante || null,
        codigo_comprobante: cabecera.codigo_comprobante?.trim() || null,
        moneda: cabecera.moneda, // Enviamos la moneda de la cabecera

        items: detalles.map((d) => {
          const itemSel = items.find((it) => it.id.toString() === d.item);
          const conversion = resolveCantidadBase(d, itemSel);
          return {
            item: Number(d.item),
            cantidad: Number(conversion.cantidad),
            unidad_medida: conversion.unidad_medida,
            moneda: cabecera.moneda, // Todos los items heredan la moneda del comprobante
            tipo_registro: d.tipo_registro,
            monto: Number(d.monto),
          };
        }),
      });

      setOpen(false);
      setCabecera({
        fecha: "",
        proveedor: "",
        tipo_comprobante: "",
        codigo_comprobante: "",
        moneda: "PEN",
      });
      setDetalles([{ ...emptyDetalle }]);
      onCreated?.();

    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, "Error al registrar la compra"));
    } finally {
      setLoading(false);
    }
  };

  // Filtrado de items
  const itemsFiltrados = useMemo(() => {
    return items.filter(it => 
      it.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      it.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  // Calculo del total general
  const totalGeneralCompra = useMemo(() => {
    return detalles.reduce((acc, d) => {
      const { costo_total } = calcular(d);
      return acc + costo_total;
    }, 0);
  }, [detalles]);

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

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-6">
                
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Cabecera - Informacion del comprobante */}
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">
                    Información del Comprobante
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={cabecera.fecha}
                        onChange={(e) => setCabecera({ ...cabecera, fecha: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                                  focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Proveedor
                      </label>
                      <select
                        value={cabecera.proveedor}
                        onChange={(e) => setCabecera({ ...cabecera, proveedor: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                                  focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
                      >
                        <option value="">Sin proveedor</option>
                        {proveedores.map((p) => (
                          <option key={p.id} value={p.id.toString()}>{p.nombre}</option>
                        ))}
                      </select>
                    </div>

                    {/* Campo moneda */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Moneda <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={cabecera.moneda}
                        onChange={(e) => setCabecera({ ...cabecera, moneda: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm font-semibold
                                  focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-white"
                      >
                        <option value="PEN">Soles (PEN)</option>
                        <option value="USD">Dólares (USD)</option>
                        <option value="EUR">Euros (EUR)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo de comprobante
                      </label>
                      <select
                        value={cabecera.tipo_comprobante}
                        onChange={(e) => setCabecera({ ...cabecera, tipo_comprobante: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                                  focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
                      >
                        <option value="">Seleccione tipo</option>
                        <option value="FACTURA">Factura</option>
                        <option value="BOLETA">Boleta</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Codigo de comprobante
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: F001-00123 (opcional)"
                        value={cabecera.codigo_comprobante}
                        onChange={(e) => setCabecera({ ...cabecera, codigo_comprobante: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                                  focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] placeholder:text-gray-400"
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        Si la compra no tiene comprobante, deja tipo y codigo vacios.
                      </p>
                    </div>
                  </div>
                </div>

                <ItemGroupSelector
                  onApply={handleApplyGroup}
                />

                {/* DETALLE */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-semibold text-gray-900">
                      Items de la Compra ({cabecera.moneda})
                    </h3>
                    <button
                      onClick={addDetalle}
                      className="px-4 py-2 text-sm font-medium text-[#84cc16] bg-green-50 
                                border border-green-200 rounded-lg hover:bg-green-100"
                    >
                      + Agregar Item
                    </button>
                  </div>

                  <div className="space-y-4">
                    {detalles.map((d, i) => {
                      const calc = calcular(d);
                      return (
                        <div key={i} className="border border-gray-200 rounded-lg p-4 bg-white">
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-sm font-semibold text-gray-700">Item #{i + 1}</span>
                            {detalles.length > 1 && (
                              <button onClick={() => removeDetalle(i)} className="text-red-600 text-sm flex items-center gap-1">
                                Quitar
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
                            <div className="md:col-span-2">
                              <label className="block text-xs font-medium text-gray-700 mb-1">Item</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder="Buscar item por código o nombre..."
                                  value={
                                    d.item
                                      ? items.find(it => it.id.toString() === d.item)?.nombre || ""
                                      : searchTerm
                                  }
                                  onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    updateDetalle(i, "item", "");
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                                            focus:ring-2 focus:ring-[#1e3a8a]"
                                />

                                {searchTerm && (
                                  <div className="absolute z-20 bg-white border border-gray-200 rounded-lg
                                                  shadow-lg mt-1 max-h-48 overflow-y-auto w-full">
                                    {itemsFiltrados.length > 0 ? (
                                      itemsFiltrados.map((it) => (
                                        <button
                                          type="button"
                                          key={it.id}
                                          onClick={() => {
                                            updateDetalle(i, "item", it.id.toString());
                                            updateDetalle(
                                              i,
                                              "unidad_medida",
                                              it.unidad_medida ? it.unidad_medida.toString() : ""
                                            );
                                            setSearchTerm("");
                                          }}
                                          className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50"
                                        >
                                          <span className="font-medium">{it.codigo}</span>{" "}
                                          <span className="text-gray-500">- {it.nombre}</span>
                                        </button>
                                      ))
                                    ) : (
                                      <div className="px-3 py-2 text-sm text-gray-500">
                                        No se encontraron items
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Cantidad</label>
                              <input
                                type="number"
                                min="1"
                                value={d.cantidad}
                                onChange={(e) => updateDetalle(i, "cantidad", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a8a]"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Unidad</label>
                              {(() => {
                                const itemSel = items.find((it) => it.id.toString() === d.item);
                                const isConsumible = itemSel?.tipo_insumo === "CONSUMIBLE";
                                const unidadesDisponibles = unidadesPorItem(itemSel);
                                if (!isConsumible) {
                                  return (
                                    <input
                                      type="text"
                                      disabled
                                      value={
                                        itemSel?.unidad_medida_detalle?.nombre || "UNIDAD"
                                      }
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                                    />
                                  );
                                }
                                return (
                                  <select
                                    value={d.unidad_medida}
                                    onChange={(e) => updateDetalle(i, "unidad_medida", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a8a]"
                                  >
                                    <option value="">
                                      {itemSel?.unidad_medida_detalle?.nombre
                                        ? `Unidad: ${itemSel.unidad_medida_detalle.nombre}`
                                        : "Selecciona unidad"}
                                    </option>
                                    {unidadesDisponibles.map((u) => (
                                      <option key={u.id} value={u.id}>
                                        {u.nombre}
                                        {u.simbolo ? ` (${u.simbolo})` : ""}
                                      </option>
                                    ))}
                                  </select>
                                );
                              })()}
                            </div>
                            
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Tipo registro</label>
                              <select
                                value={d.tipo_registro}
                                onChange={(e) => updateDetalle(i, "tipo_registro", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a8a]"
                              >
                                <option value="VALOR_UNITARIO">Valor unit.</option>
                                <option value="COSTO_UNITARIO">Costo unit.</option>
                                <option value="VALOR_TOTAL">Valor total</option>
                                <option value="COSTO_TOTAL">Costo total</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                             <div className="md:col-span-1">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Monto ({cabecera.moneda})
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={d.monto}
                                onChange={(e) => updateDetalle(i, "monto", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e3a8a]"
                              />
                            </div>

                            <div className="md:col-span-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <div className="grid grid-cols-4 gap-2 text-[10px] md:text-xs">
                                <div><span className="text-blue-700 block">V. Unit:</span><span className="font-bold">{cabecera.moneda} {calc.valor_unitario.toFixed(2)}</span></div>
                                <div><span className="text-blue-700 block">C. Unit:</span><span className="font-bold">{cabecera.moneda} {calc.costo_unitario.toFixed(2)}</span></div>
                                <div><span className="text-blue-700 block">V. Total:</span><span className="font-bold">{cabecera.moneda} {calc.valor_total.toFixed(2)}</span></div>
                                <div><span className="text-blue-700 block">C. Total:</span><span className="font-bold">{cabecera.moneda} {calc.costo_total.toFixed(2)}</span></div>
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

            {/* FOOTER DEL MODAL CON TOTAL GENERAL */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl flex-shrink-0">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500 font-medium">
                    TOTAL GENERAL ESTIMADO (CON IGV)
                  </span>
                  <span className="text-2xl font-bold text-[#1e3a8a]">
                    {cabecera.moneda}{" "}
                    {totalGeneralCompra.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setOpen(false)}
                    disabled={loading}
                    className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg"
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-[#1e3a8a] rounded-lg disabled:opacity-50"
                  >
                    {loading ? "Guardando..." : "Guardar Compra"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
