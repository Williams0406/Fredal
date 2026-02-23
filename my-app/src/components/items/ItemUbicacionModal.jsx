"use client";

import { useEffect, useState } from "react";
import { itemAPI, maquinariaAPI, trabajadorAPI, almacenAPI } from "@/lib/api";

const ESTADOS_UNIDAD = {
  NUEVO: "Nuevo",
  USADO: "Usado",
  INOPERATIVO: "Inoperativo",
  REPARADO: "Reparado",
};

export default function ItemUbicacionModal({ itemId, open, onClose }) {
  const [item, setItem] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [almacenes, setAlmacenes] = useState([]);
  const [maquinarias, setMaquinarias] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [editingUnitId, setEditingUnitId] = useState(null);
  const [consumibleUbicaciones, setConsumibleUbicaciones] = useState([]);
  const [editingConsumibleId, setEditingConsumibleId] = useState(null);
  const [consumibleEditValues, setConsumibleEditValues] = useState({ tipoUbicacion: "", ubicacion: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && itemId) {
      loadData();
    }
  }, [open, itemId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemRes, almRes, maqRes, traRes] = await Promise.all([
        itemAPI.retrieve(itemId),
        almacenAPI.list(),
        maquinariaAPI.list(),
        trabajadorAPI.list(),
      ]);

      setItem(itemRes.data);
      setAlmacenes(almRes.data || []);
      setMaquinarias(maqRes.data || []);
      setTrabajadores(traRes.data || []);

      if (itemRes.data?.tipo_insumo === "CONSUMIBLE") {
        const consumibleRes = await itemAPI.ubicacionesConsumible(itemId);
        setConsumibleUbicaciones(consumibleRes.data || []);
      } else {
        setConsumibleUbicaciones([]);
      }
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  const startEditUnidad = (unidad) => {
    const ubic = unidad.ubicacion_actual || {};

    let tipoUbicacion = "";
    let ubicacionId = "";

    if (ubic.almacen) {
      tipoUbicacion = "almacen";
      ubicacionId = ubic.almacen.id;
    } else if (ubic.maquinaria) {
      tipoUbicacion = "maquinaria";
      ubicacionId = ubic.maquinaria.id;
    } else if (ubic.trabajador) {
      tipoUbicacion = "trabajador";
      ubicacionId = ubic.trabajador.id;
    }

    setEditValues({
      estado: unidad.estado,
      tipoUbicacion,
      ubicacion: ubicacionId,
    });

    setEditingUnitId(unidad.id);
    setError("");
  };

  const handleSave = async (unidadId) => {
    // Validaciones
    if (!editValues.tipoUbicacion) {
      setError("Selecciona un tipo de ubicación");
      return;
    }

    if (!editValues.ubicacion) {
      setError("Selecciona una ubicación específica");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await itemAPI.cambiarEstadoUnidad(item.id, {
        unidad_id: unidadId,
        nuevo_estado: editValues.estado,
        almacen_id:
          editValues.tipoUbicacion === "almacen"
            ? Number(editValues.ubicacion)
            : null,
        maquinaria_id:
          editValues.tipoUbicacion === "maquinaria"
            ? Number(editValues.ubicacion)
            : null,
        trabajador_id:
          editValues.tipoUbicacion === "trabajador"
            ? Number(editValues.ubicacion)
            : null,
      });

      const res = await itemAPI.retrieve(item.id);
      setItem(res.data);
      setEditingUnitId(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingUnitId(null);
    setError("");
  };



  const startEditConsumible = (row) => {
    const tipoMap = {
      ALMACEN: "almacen",
      MAQUINARIA: "maquinaria",
      TRABAJADOR: "trabajador",
    };

    const tipoUbicacion = tipoMap[row.tipo_ubicacion] || "";
    const ubicacion =
      tipoUbicacion === "almacen"
        ? row.almacen_id
        : tipoUbicacion === "maquinaria"
          ? row.maquinaria_id
          : row.trabajador_id;

    setEditingConsumibleId(row.id);
    setConsumibleEditValues({ tipoUbicacion, ubicacion: ubicacion ? String(ubicacion) : "" });
    setError("");
  };

  const handleCancelConsumible = () => {
    setEditingConsumibleId(null);
    setConsumibleEditValues({ tipoUbicacion: "", ubicacion: "" });
  };

  const handleSaveConsumible = async (historialId) => {
    if (!consumibleEditValues.tipoUbicacion || !consumibleEditValues.ubicacion) {
      setError("Selecciona tipo y ubicación para el consumible");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await itemAPI.cambiarUbicacionConsumible(item.id, {
        historial_id: historialId,
        almacen_id: consumibleEditValues.tipoUbicacion === "almacen" ? Number(consumibleEditValues.ubicacion) : null,
        maquinaria_id: consumibleEditValues.tipoUbicacion === "maquinaria" ? Number(consumibleEditValues.ubicacion) : null,
        trabajador_id: consumibleEditValues.tipoUbicacion === "trabajador" ? Number(consumibleEditValues.ubicacion) : null,
      });

      const consumibleRes = await itemAPI.ubicacionesConsumible(item.id);
      setConsumibleUbicaciones(consumibleRes.data || []);
      handleCancelConsumible();
    } catch (err) {
      setError(err.response?.data?.detail || "Error al actualizar ubicación del consumible");
    } finally {
      setSaving(false);
    }
  };

  const getUbicacionLabel = (ubicacionActual) => {
    if (!ubicacionActual) return null;

    if (ubicacionActual.tipo === "MAQUINARIA" && ubicacionActual.maquinaria) {
      const codigo = ubicacionActual.maquinaria.codigo_maquina || ubicacionActual.maquinaria.codigo;
      const nombre = ubicacionActual.maquinaria.nombre;
      return `MAQUINARIA - ${codigo} - ${nombre}`;
    }

    return `${ubicacionActual.tipo} - ${ubicacionActual.nombre}`;
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-5xl rounded-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-[#1e3a8a] flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Gestión de Ubicaciones
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {item?.nombre} - Administra el estado y ubicación de cada unidad
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
          {/* Error message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-sm text-gray-600">Cargando unidades...</p>
              </div>
            </div>
          ) : !item || (item.tipo_insumo !== "CONSUMIBLE" && item.unidades.length === 0) || (item.tipo_insumo === "CONSUMIBLE" && consumibleUbicaciones.length === 0) ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-sm text-gray-600 font-medium">
                No hay ubicaciones registradas
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Las ubicaciones aparecerán aquí cuando existan asignaciones activas
              </p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                {item?.tipo_insumo === "CONSUMIBLE" ? (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Lote</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Cantidad Ubicación</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ubicación</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Fecha Asignación</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {consumibleUbicaciones.map((u) => {
                        const isEditingConsumible = editingConsumibleId === u.id;

                        return (
                          <tr key={u.id} className="hover:bg-gray-50 transition-colors duration-150">
                            <td className="px-4 py-3 text-sm font-mono text-gray-900">Lote #{u.lote}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{Number(u.cantidad_ubicacion).toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {isEditingConsumible ? (
                                <div className="flex gap-2">
                                  <select
                                    value={consumibleEditValues.tipoUbicacion}
                                    onChange={(e) => setConsumibleEditValues({ tipoUbicacion: e.target.value, ubicacion: "" })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent"
                                  >
                                    <option value="">Tipo...</option>
                                    <option value="almacen">Almacén</option>
                                    <option value="maquinaria">Maquinaria</option>
                                    <option value="trabajador">Trabajador</option>
                                  </select>
                                  <select
                                    value={consumibleEditValues.ubicacion || ""}
                                    onChange={(e) => setConsumibleEditValues((prev) => ({ ...prev, ubicacion: e.target.value }))}
                                    disabled={!consumibleEditValues.tipoUbicacion}
                                    className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent ${!consumibleEditValues.tipoUbicacion ? "bg-gray-50 cursor-not-allowed" : ""}`}
                                  >
                                    <option value="">Seleccione...</option>
                                    {consumibleEditValues.tipoUbicacion === "almacen" && almacenes.map((a) => (<option key={a.id} value={a.id}>{a.nombre}</option>))}
                                    {consumibleEditValues.tipoUbicacion === "maquinaria" && maquinarias.map((m) => (<option key={m.id} value={m.id}>{m.codigo_maquina} - {m.nombre}</option>))}
                                    {consumibleEditValues.tipoUbicacion === "trabajador" && trabajadores.map((t) => (<option key={t.id} value={t.id}>{t.nombres} {t.apellidos}</option>))}
                                  </select>
                                </div>
                              ) : (
                                <span className="font-medium">{u.ubicacion}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{u.fecha_inicio ? new Date(u.fecha_inicio).toLocaleDateString('es-PE') : <span className="text-gray-400">—</span>}</td>
                            <td className="px-4 py-3 text-center">
                              {isEditingConsumible ? (
                                <div className="flex items-center justify-center gap-2">
                                  <button onClick={() => handleSaveConsumible(u.id)} disabled={saving} className="px-3 py-1.5 text-xs font-medium text-white bg-[#84cc16] rounded-lg hover:bg-[#84cc16]/90 transition-all duration-200 disabled:opacity-50">Guardar</button>
                                  <button onClick={handleCancelConsumible} disabled={saving} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-all duration-200">Cancelar</button>
                                </div>
                              ) : (
                                <button onClick={() => startEditConsumible(u)} className="px-3 py-1.5 text-xs font-medium text-white bg-[#1e3a8a] rounded-lg hover:bg-[#1e3a8a]/90 transition-all duration-200">Editar</button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Serie</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Estado</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Ubicación</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Fecha Asignación</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {item.unidades.map((u) => {
                        const isEditing = editingUnitId === u.id;

                        return (
                          <tr key={u.id} className="hover:bg-gray-50 transition-colors duration-150">
                            <td className="px-4 py-3 text-sm font-mono text-gray-900">{u.serie || <span className="text-gray-400">Sin serie</span>}</td>
                            <td className="px-4 py-3 text-sm">
                              {isEditing ? (
                                <select value={editValues.estado} onChange={(e) => setEditValues({ ...editValues, estado: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent">
                                  {Object.entries(ESTADOS_UNIDAD).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${u.estado === "NUEVO" ? "bg-blue-100 text-blue-700" : ""} ${u.estado === "USADO" ? "bg-gray-100 text-gray-700" : ""} ${u.estado === "INOPERATIVO" ? "bg-red-100 text-red-700" : ""} ${u.estado === "REPARADO" ? "bg-green-100 text-green-700" : ""}`}>{ESTADOS_UNIDAD[u.estado] || u.estado}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {isEditing ? (
                                <div className="flex gap-2">
                                  <select value={editValues.tipoUbicacion} onChange={(e) => setEditValues({ ...editValues, tipoUbicacion: e.target.value, ubicacion: "" })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent">
                                    <option value="">Tipo...</option>
                                    <option value="almacen">Almacén</option>
                                    <option value="maquinaria">Maquinaria</option>
                                    <option value="trabajador">Trabajador</option>
                                  </select>
                                  <select value={editValues.ubicacion || ""} onChange={(e) => setEditValues({ ...editValues, ubicacion: e.target.value })} disabled={!editValues.tipoUbicacion} className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent ${!editValues.tipoUbicacion ? "bg-gray-50 cursor-not-allowed" : ""}`}>
                                    <option value="">Seleccione...</option>
                                    {editValues.tipoUbicacion === "almacen" && almacenes.map((a) => (<option key={a.id} value={a.id}>{a.nombre}</option>))}
                                    {editValues.tipoUbicacion === "maquinaria" && maquinarias.map((m) => (<option key={m.id} value={m.id}>{m.codigo_maquina} - {m.nombre}</option>))}
                                    {editValues.tipoUbicacion === "trabajador" && trabajadores.map((t) => (<option key={t.id} value={t.id}>{t.nombres} {t.apellidos}</option>))}
                                  </select>
                                </div>
                              ) : u.ubicacion_actual ? (
                                <div className="font-medium text-gray-900">{getUbicacionLabel(u.ubicacion_actual)}</div>
                              ) : (
                                <span className="text-gray-400 italic">Sin ubicación</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{u.ubicacion_actual?.fecha_inicio ? new Date(u.ubicacion_actual.fecha_inicio).toLocaleDateString('es-PE') : <span className="text-gray-400">—</span>}</td>
                            <td className="px-4 py-3 text-center">
                              {isEditing ? (
                                <div className="flex items-center justify-center gap-2">
                                  <button onClick={() => handleSave(u.id)} disabled={saving} className="px-3 py-1.5 text-xs font-medium text-white bg-[#84cc16] rounded-lg hover:bg-[#84cc16]/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1">{saving ? <>Guardando</> : <>Guardar</>}</button>
                                  <button onClick={handleCancel} disabled={saving} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-all duration-200 disabled:opacity-50">Cancelar</button>
                                </div>
                              ) : (
                                <button onClick={() => startEditUnidad(u)} className="px-3 py-1.5 text-xs font-medium text-white bg-[#1e3a8a] rounded-lg hover:bg-[#1e3a8a]/90 transition-all duration-200 flex items-center gap-1 mx-auto">Editar</button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {item && ((item.tipo_insumo === "CONSUMIBLE" && consumibleUbicaciones.length > 0) || (item.tipo_insumo !== "CONSUMIBLE" && item.unidades.length > 0)) && (
                <span>
                  {item.tipo_insumo === "CONSUMIBLE" ? "Total de ubicaciones activas:" : "Total de unidades:"} <span className="font-semibold text-gray-900">{item.tipo_insumo === "CONSUMIBLE" ? consumibleUbicaciones.length : item.unidades.length}</span>
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white 
                       border border-gray-300 rounded-lg hover:bg-gray-50 
                       transition-all duration-200"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}