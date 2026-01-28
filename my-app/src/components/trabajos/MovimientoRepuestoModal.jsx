"use client";

import { useEffect, useState } from "react";
import { itemAPI, movimientoRepuestoAPI } from "@/lib/api";

export default function MovimientoRepuestoModal({
  open,
  onClose,
  actividad,
  onSaved,
}) {

  /* ================== STATE ================== */

  const [items, setItems] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [movimientosDB, setMovimientosDB] = useState([]); // existentes
  const [movimientosNew, setMovimientosNew] = useState([]); // nuevos
  const [loading, setLoading] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);

  const [form, setForm] = useState({
    item: "",
    item_unidad: "",
  });
  
  const movimientos = [
    ...movimientosDB,
    ...movimientosNew,
  ];

  const movimientosFiltrados = movimientos.filter(
    (m) => m.estado !== "INOPERATIVO"
  );

  /* ================== DATA ================== */

  useEffect(() => {
    if (open) {
      setForm({ item: "", item_unidad: "" });
      setUnidades([]);
      setMovimientosNew([]);
    }
  }, [open]);

  useEffect(() => {
    itemAPI.list().then((res) => setItems(res.data));
  }, []);

  useEffect(() => {
    if (!form.item) {
      setUnidades([]);
      return;
    }

    setLoading(true);
    itemAPI.unidadesAsignables(form.item, {
      actividad: actividad.id,
    }).then((res) => {
      setUnidades(res.data);
      setLoading(false);
    });
  }, [form.item, actividad?.id, movimientosNew]);

  useEffect(() => {
    if (!actividad?.id) return;

    movimientoRepuestoAPI.list({
      actividad: actividad.id,
    }).then((res) => {
      setMovimientosDB(
        res.data.map((m) => ({
          id: m.id,
          item_id: m.item_id,
          item_codigo: m.item_codigo,
          item_nombre: m.item_nombre,
          unidad_id: m.item_unidad,
          unidad_serie: m.unidad_serie,
          estado: m.estado,
        }))
      );
    });
  }, [actividad]);

  useEffect(() => {
    if (!actividad?.id) return;

    setForm({
      item: "",
      item_unidad: "",
    });

    setUnidades([]);
    setMovimientosNew([]);
    setMovimientosDB([]);
  }, [actividad?.id]);

  if (!open) return null;

  if (actividad?.tipo_actividad !== "MANTENIMIENTO") {
    return (
      <div
        className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-xl w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-xl font-semibold text-[#1e3a8a]">
              Repuestos
            </h3>
          </div>
          <div className="px-6 py-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Solo para Mantenimiento
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Los repuestos solo se registran en actividades de mantenimiento
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl flex justify-end">
            <button
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white 
                       border border-gray-300 rounded-lg hover:bg-gray-50 
                       transition-all duration-200"
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ================== HELPERS ================== */

  const handleAddUnidad = () => {
    if (!form.item || !form.item_unidad) return;

    const item = items.find(
      (i) => String(i.id) === String(form.item)
    );

    const unidad = unidades.find(
      (u) => String(u.id) === String(form.item_unidad)
    );

    if (!item || !unidad) return;

    setMovimientosNew((prev) => {
      // evitar duplicar el mismo item
      const filtrados = prev.filter(
        (m) => m.item_id !== item.id
      );

      return [
        ...filtrados,
        {
          item_id: item.id,
          item_codigo: item.codigo,
          item_nombre: item.nombre,
          unidad_id: unidad.id,
          unidad_serie: unidad.serie || `Unidad #${unidad.id}`,
          estado: unidad.estado,
        },
      ];
    });

    setForm({
      item: "",
      item_unidad: "",
    });

    setUnidades([]);
  };

  const handleRemove = (movimiento) => {
    setMovimientosNew((prev) =>
      prev.filter((m) => m !== movimiento)
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const nuevos = movimientos.filter((m) => !m.id);

      for (const m of nuevos) {
        await movimientoRepuestoAPI.create({
          actividad: actividad.id,
          item_unidad: m.unidad_id,
        });
      }

      onSaved?.();
      onClose();
    } catch (error) {
      console.error("Error al guardar movimientos:", error);
      alert("Error al guardar los movimientos de repuestos");
    } finally {
      setLoading(false);
    }
  };

  const itemsFiltrados = items.filter((i) =>
    `${i.codigo} ${i.nombre}`
      .toLowerCase()
      .includes(itemSearch.toLowerCase())
  );

  /* ================== UI ================== */

  return (
    <div
      className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold text-[#1e3a8a]">
                Movimiento de Repuestos
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {actividad.tipo_mantenimiento} - {actividad.subtipo}
              </p>
            </div>
            <button 
              onClick={onClose}
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
            
            {/* Sección: Agregar Repuesto */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
              <h4 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#1e3a8a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar Repuesto
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Item */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar item por código o nombre..."
                      value={itemSearch}
                      onChange={(e) => {
                        setItemSearch(e.target.value);
                        setShowItemDropdown(true);
                        setForm((p) => ({ ...p, item: "", item_unidad: "" }));
                      }}
                      onFocus={() => setShowItemDropdown(true)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                                focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
                    />

                    {showItemDropdown && itemSearch && (
                      <div
                        className="absolute z-30 mt-1 w-full bg-white border border-gray-200
                                  rounded-lg shadow-lg max-h-56 overflow-y-auto"
                      >
                        {itemsFiltrados.length > 0 ? (
                          itemsFiltrados.map((i) => (
                            <button
                              key={i.id}
                              type="button"
                              onClick={() => {
                                setForm((p) => ({
                                  ...p,
                                  item: String(i.id),
                                  item_unidad: "",
                                }));
                                setItemSearch(`${i.codigo} - ${i.nombre}`);
                                setShowItemDropdown(false);
                              }}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50
                                        transition-colors"
                            >
                              <span className="font-medium">{i.codigo}</span>{" "}
                              <span className="text-gray-600">— {i.nombre}</span>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-sm text-gray-500">
                            No se encontraron items
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Unidad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unidad disponible
                  </label>
                  <select
                    value={form.item_unidad}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, item_unidad: e.target.value }))
                    }
                    disabled={!form.item || loading}
                    className={`
                      w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                      focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                      transition-all duration-200
                      ${!form.item || loading ? "bg-gray-50 cursor-not-allowed" : ""}
                    `}
                  >
                    <option value="">
                      {loading ? "Cargando..." : "Seleccione unidad"}
                    </option>
                    {unidades.map((u) => (
                      <option key={u.id} value={String(u.id)}>
                        {u.serie || `Unidad #${u.id}`} ({u.estado})
                      </option>
                    ))}
                  </select>
                  {form.item && unidades.length === 0 && !loading && (
                    <p className="text-xs text-gray-500 mt-2">
                      No hay unidades disponibles para este item
                    </p>
                  )}
                </div>

                {/* Botón Agregar */}
                <div className="flex items-end">
                  <button
                    onClick={handleAddUnidad}
                    disabled={!form.item || !form.item_unidad || loading}
                    className="w-full px-5 py-3 text-sm font-medium text-white bg-[#84cc16]
                             rounded-lg hover:bg-[#84cc16]/90 focus:outline-none 
                             focus:ring-2 focus:ring-[#84cc16] focus:ring-offset-2
                             transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                             flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar
                  </button>
                </div>
              </div>
            </div>

            {/* Sección: Lista de Repuestos */}
            {movimientosFiltrados.length > 0 ? (
              <div className="border border-gray-200 rounded-lg">
                <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 rounded-t-lg">
                  <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#1e3a8a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Repuestos Agregados
                    <span className="text-sm font-normal text-gray-600">
                      ({movimientosFiltrados.length})
                    </span>
                  </h4>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Código
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Item
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Unidad
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {movimientosFiltrados.map((m, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-5 py-4 text-sm font-medium text-gray-900">
                            {m.item_codigo}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-700">
                            {m.item_nombre}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-700">
                            {m.unidad_serie}
                          </td>
                          <td className="px-5 py-4 text-sm">
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              {m.estado}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-right">
                            {!m.id && (
                              <button
                                onClick={() => handleRemove(m)}
                                className="text-red-600 hover:text-red-800 font-medium
                                         transition-colors duration-200 flex items-center gap-1 ml-auto"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Quitar
                              </button>
                            )}
                            {m.id && (
                              <span className="text-gray-500 text-xs">Guardado</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-sm text-gray-600 font-medium">
                  No hay repuestos agregados
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Selecciona un item y una unidad para comenzar
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl flex-shrink-0">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white 
                       border border-gray-300 rounded-lg hover:bg-gray-50 
                       focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:ring-offset-2
                       transition-all duration-200 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={movimientosFiltrados.length === 0 || loading}
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
                  Guardar Movimientos
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}