"use client";

import { useEffect, useState } from "react";
import { itemAPI, maquinariaAPI, trabajadorAPI, almacenAPI } from "@/lib/api";
import { Select } from "@/components/ui/select";

export default function ItemUbicacionModal({ itemId, open, onClose }) {
  const [item, setItem] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [almacenes, setAlmacenes] = useState([]);
  const [maquinarias, setMaquinarias] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [editingUnitId, setEditingUnitId] = useState(null);

  useEffect(() => {
    if (open && itemId) {
      itemAPI.retrieve(itemId).then((res) => {
        setItem(res.data);
      });

      // Traer opciones de ubicaciones
      fetchUbicaciones();
    }
  }, [open, itemId]);

  const fetchUbicaciones = async () => {
    const [alm, maq, tra] = await Promise.all([
      almacenAPI.list(),     // ✅ correcto
      maquinariaAPI.list(),
      trabajadorAPI.list(),
    ]);

    setAlmacenes(alm.data || []);
    setMaquinarias(maq.data || []);
    setTrabajadores(tra.data || []);
  };

  const ESTADOS_UNIDAD = {
    NUEVO: "NUEVO",
    USADO: "USADO",
    INOPERATIVO: "INOPERATIVO",
    REPARADO: "REPARADO",
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
  };


  if (!open || !item) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-4xl rounded-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto relative">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Detalle de Unidades</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left">Serie</th>
                <th className="py-2 text-left">Estado</th>
                <th className="py-2 text-left">Ubicación</th>
                <th className="py-2 text-left">Fecha Inicio</th>
                <th className="py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {item.unidades.map((u) => {
                const isEditing = editingUnitId === u.id;
                return (
                  <tr key={u.id} className="border-b last:border-b-0 hover:bg-gray-50">
                    <td className="py-2 font-mono">{u.serie || "—"}</td>

                    <td className="py-2">
                      {isEditing ? (
                        <select
                          className="border px-1 py-0.5 rounded"
                          value={editValues.estado}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              estado: e.target.value,
                            })
                          }
                        >
                          {Object.keys(ESTADOS_UNIDAD).map((e) => (
                            <option key={e} value={e}>
                              {e}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-200 text-gray-700">
                          {u.estado}
                        </span>
                      )}
                    </td>

                    <td className="py-2">
                      {isEditing ? (
                        <>
                          <select
                            className="border px-1 py-0.5 rounded mr-1"
                            value={editValues.tipoUbicacion}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                tipoUbicacion: e.target.value,
                                ubicacion: "",
                              })
                            }
                          >
                            <option value="">SIN UBICACIÓN</option>
                            <option value="almacen">Almacén</option>
                            <option value="maquinaria">Maquinaria</option>
                            <option value="trabajador">Trabajador</option>
                          </select>

                          <select
                            className="border px-1 py-0.5 rounded"
                            value={editValues.ubicacion || ""}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                ubicacion: e.target.value,
                              })
                            }
                          >
                            <option value="">-- Seleccione --</option>
                            {editValues.tipoUbicacion === "almacen" &&
                              almacenes.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.nombre}
                                </option>
                              ))}
                            {editValues.tipoUbicacion === "maquinaria" &&
                              maquinarias.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.nombre}
                                </option>
                              ))}
                            {editValues.tipoUbicacion === "trabajador" &&
                              trabajadores.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.nombres} {t.apellidos}
                                </option>
                              ))}
                          </select>
                        </>
                      ) : u.ubicacion_actual ? (
                        <span className="font-medium">
                          {u.ubicacion_actual.tipo}{" "}
                          <span className="text-gray-500">– {u.ubicacion_actual.nombre}</span>
                        </span>
                      ) : (
                        <span className="italic text-gray-400">SIN UBICACIÓN</span>
                      )}
                    </td>

                    <td className="py-2 text-gray-600">
                      {u.ubicacion_actual?.fecha_inicio
                        ? new Date(u.ubicacion_actual.fecha_inicio).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="py-2">
                      {isEditing ? (
                        <div className="flex gap-1">
                          <button
                            className="px-2 py-1 text-xs bg-green-500 text-white rounded"
                            onClick={async () => {
                              if (!editValues.tipoUbicacion || !editValues.ubicacion) return;

                              await itemAPI.cambiarEstadoUnidad(item.id, {
                                unidad_id: u.id,
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
                            }}
                          >
                            Guardar
                          </button>

                          <button
                            className="px-2 py-1 text-xs bg-gray-200 rounded"
                            onClick={() => setEditingUnitId(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          className="px-2 py-1 text-xs bg-blue-500 text-white rounded"
                          onClick={() => startEditUnidad(u)}
                        >
                          Editar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end px-6 py-4 border-t bg-gray-50 rounded-b-xl gap-2">
          
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
