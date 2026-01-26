// src/components/trabajos/TrabajoDetalleModal.jsx

import { useEffect, useState } from "react";
import {
  trabajoAPI,
  trabajadorAPI,
  maquinariaAPI,
  movimientoRepuestoAPI,
  actividadTrabajoAPI,
} from "@/lib/api";
import ActividadTrabajoModal from "./ActividadTrabajoModal";
import MovimientoRepuestoModal from "./MovimientoRepuestoModal";
import FinalizarOrdenModal from "./FinalizarOrdenModal";

/* =========================
   CONSTANTES
========================= */

const PRIORIDADES = [
  { value: "URGENTE", label: "Urgente" },
  { value: "EMERGENCIA", label: "Emergencia" },
  { value: "REGULAR", label: "Regular" },
];

const LUGARES = [
  { value: "TALLER", label: "Taller" },
  { value: "CAMPO", label: "Campo" },
];

const ESTADOS_EQUIPO = [
  { value: "OPERATIVO", label: "Operativo" },
  { value: "INOPERATIVO", label: "Inoperativo" },
];

export default function TrabajoDetalleModal({ open, trabajoId, onClose, onUpdated }) {

  const [trabajo, setTrabajo] = useState(null);
  const [form, setForm] = useState(null);
  const [tecnicos, setTecnicos] = useState([]);
  const [maquinarias, setMaquinarias] = useState([]);
  const [actividades, setActividades] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [showActividadModal, setShowActividadModal] = useState(false);
  const [showMovimientoModal, setShowMovimientoModal] = useState(false);
  const [actividadSeleccionada, setActividadSeleccionada] = useState(null);
  const [showFinalizarModal, setShowFinalizarModal] = useState(false);
  const [unidadesPorActividad, setUnidadesPorActividad] = useState({});

  /* =========================
     FLAGS DE ESTADO
  ========================= */
  const esPendiente = trabajo?.estatus === "PENDIENTE";
  const esEnProceso = trabajo?.estatus === "EN_PROCESO";
  const esFinalizado = trabajo?.estatus === "FINALIZADO";

  const readOnly = esFinalizado || !editMode;
  

  /* =========================
     LOAD DATA
  ========================= */
  useEffect(() => {
    if (!open || !trabajoId) return;

    setLoading(true);

    Promise.all([
      trabajoAPI.retrieve(trabajoId),
      actividadTrabajoAPI.listByTrabajo(trabajoId),
      trabajadorAPI.list(),
      maquinariaAPI.list(),
    ]).then(([tRes, actRes, tecRes, maqRes]) => {
      setTrabajo(tRes.data);
      setForm(tRes.data);
      setActividades(actRes.data);
      setTecnicos(tecRes.data);
      setMaquinarias(maqRes.data);
      setLoading(false);
    });
  }, [open, trabajoId]);

  useEffect(() => {
    if (!actividades.length) {
      setUnidadesPorActividad({});
      return;
    }

    const loadUnidades = async () => {
      const result = {};

      for (const a of actividades) {
        if (a.tipo_actividad !== "MANTENIMIENTO") continue;

        const res = await movimientoRepuestoAPI.list({
          actividad: a.id,
        });

        result[a.id] = res.data.filter(
          (m) => m.estado !== "INOPERATIVO"
        );
      }

      setUnidadesPorActividad(result);
    };

    loadUnidades();
  }, [actividades]);

  if (!open) return null;

  if (loading || !form) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded">
          Cargando...
        </div>
      </div>
    );
  }

  /* =========================
     HANDLERS
  ========================= */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleTecnico = (id) => {
    setForm((prev) => {
      const actuales = prev.tecnicos || [];
      return {
        ...prev,
        tecnicos: actuales.includes(id)
          ? actuales.filter((t) => t !== id)
          : [...actuales, id],
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await trabajoAPI.patch(trabajoId, {
        prioridad: form.prioridad,
        lugar: form.lugar,
        estado_equipo: form.estado_equipo || null,
        fecha: form.fecha,
        hora_inicio: form.hora_inicio,
        hora_fin: form.hora_fin,
        horometro: form.horometro,
        ubicacion_detalle: form.ubicacion_detalle || "",
        observaciones: form.observaciones || "",
        maquinaria: form.maquinaria,
        tecnicos: form.tecnicos,
      });

      setTrabajo(res.data);
      setForm(res.data);
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  };

  const handleIniciarTrabajo = async () => {
    setSaving(true);
    try {
      const res = await trabajoAPI.patch(trabajoId, {
        estatus: "EN_PROCESO",
      });

      setTrabajo(res.data);
      setForm(res.data);

      onUpdated?.(res.data); // 🔥 AVISA AL KANBAN
    } finally {
      setSaving(false);
    }
  };

  const handleCloseAll = () => {
    setTrabajo(null);
    setForm(null);
    setLoading(true);
    setEditMode(false);

    setShowActividadModal(false);
    setShowMovimientoModal(false);
    setShowFinalizarModal(false);

    onClose();
  };

  const hayModalHijoAbierto =
    showActividadModal || showMovimientoModal || showFinalizarModal;

  /* =========================
     RENDER
  ========================= */
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={() => {
        if (!hayModalHijoAbierto) handleCloseAll();
      }}
    >
      <div
        className="
          bg-white rounded-xl w-full max-w-4xl
          max-h-[90vh] overflow-y-auto
          p-6 space-y-4
        "
        onClick={(e) => e.stopPropagation()}
      >

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            Orden {trabajo.codigo_orden}
          </h2>

          {!esFinalizado && (
            !editMode ? (
              <button
                className="text-blue-600 text-sm"
                onClick={() => setEditMode(true)}
              >
                Editar
              </button>
            ) : (
              <button
                className="text-gray-600 text-sm"
                onClick={() => {
                  setForm(trabajo);
                  setEditMode(false);
                }}
              >
                Cancelar edición
              </button>
            )
          )}
        </div>

        {/* INFO GENERAL */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Maquinaria"
            name="maquinaria"
            value={form.maquinaria}
            onChange={handleChange}
            options={maquinarias.map((m) => ({
              value: m.id,
              label: `${m.codigo_maquina} - ${m.nombre}`,
            }))}
            disabled={readOnly}
          />

          <Input
            type="date"
            label="Fecha"
            name="fecha"
            value={form.fecha}
            onChange={handleChange}
            disabled={readOnly}
          />

          {(esEnProceso || esFinalizado) && (
            <>
              <Input
                type="time"
                label="Hora inicio"
                name="hora_inicio"
                value={form.hora_inicio || ""}
                onChange={handleChange}
                disabled={readOnly}
              />
              <Input
                type="time"
                label="Hora fin"
                name="hora_fin"
                value={form.hora_fin || ""}
                onChange={handleChange}
                disabled={readOnly}
              />
              <Input
                type="number"
                label="Horómetro"
                name="horometro"
                value={form.horometro || ""}
                onChange={handleChange}
                disabled={readOnly}
              />
            </>
          )}
        </div>

        {/* SELECTS */}
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Prioridad"
            name="prioridad"
            value={form.prioridad}
            onChange={handleChange}
            options={PRIORIDADES}
            disabled={readOnly}
          />

          <Select
            label="Lugar"
            name="lugar"
            value={form.lugar}
            onChange={handleChange}
            options={LUGARES}
            disabled={readOnly}
          />

          {(esEnProceso || esFinalizado) && (
            <Select
              label="Estado del equipo"
              name="estado_equipo"
              value={form.estado_equipo || ""}
              onChange={handleChange}
              options={ESTADOS_EQUIPO}
              disabled={readOnly}
            />
          )}
        </div>

        {/* OBSERVACIONES */}
        <Textarea
          label="Observaciones"
          name="observaciones"
          value={form.observaciones || ""}
          onChange={handleChange}
          disabled={readOnly}
        />

        {/* TECNICOS */}
        <div>
          <p className="font-medium mb-2">Técnicos asignados</p>
          <div className="grid grid-cols-2 gap-2">
            {tecnicos.map((t) => (
              <label key={t.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  disabled={readOnly}
                  checked={form.tecnicos?.includes(t.id)}
                  onChange={() => toggleTecnico(t.id)}
                />
                {t.nombres} {t.apellidos}
              </label>
            ))}
          </div>
        </div>

        {/* ACTIVIDADES */}
        {(esEnProceso || esFinalizado) && (
          <div className="border-t pt-4">
            <div className="flex justify-between mb-2">
              <p className="font-medium">Actividades</p>
              {!esFinalizado && (
                <button
                  className="text-sm text-blue-600"
                  onClick={() => setShowActividadModal(true)}
                >
                  + Actividad
                </button>
              )}
            </div>

            {actividades.length === 0 && (
              <p className="text-xs text-gray-500">
                No hay actividades registradas
              </p>
            )}

            <ul className="space-y-2">
              {actividades.map((a) => (
                <li key={a.id} className="border rounded p-2 text-sm">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">{a.tipo_actividad}</p>
                      {a.tipo_mantenimiento && (
                        <p className="text-xs text-gray-600">
                          {a.tipo_mantenimiento} – {a.subtipo}
                        </p>
                      )}
                    </div>

                    {a.tipo_actividad === "MANTENIMIENTO" && !esFinalizado && (
                      <button
                        className="text-xs text-blue-600"
                        onClick={() => {
                          setActividadSeleccionada(a);
                          setShowMovimientoModal(true);
                        }}
                      >
                        + Repuesto
                      </button>
                    )}
                  </div>
                  {/* UNIDADES ASIGNADAS */}
                  {unidadesPorActividad[a.id]?.length > 0 && (
                    <div className="mt-2 border rounded-md p-2 bg-gray-50">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b text-left">
                            <th>Item</th>
                            <th>Unidad</th>
                            <th>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {unidadesPorActividad[a.id].map((u, i) => (
                            <tr key={i} className="border-b last:border-0">
                              <td>
                                {u.item_codigo} – {u.item_nombre}
                              </td>
                              <td>{u.unidad_serie}</td>
                              <td>{u.estado}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ACTIONS */}
        <div className="flex justify-end gap-2 border-t pt-4">
          {esPendiente && (
            <button
              className="px-4 py-2 bg-green-600 text-white rounded text-sm"
              onClick={handleIniciarTrabajo}
              disabled={saving}
            >
              ▶ Iniciar trabajo
            </button>
          )}

          {(esEnProceso || esFinalizado) && (
            <button
              className="px-4 py-2 bg-red-600 text-white rounded text-sm"
              onClick={() => setShowFinalizarModal(true)}
            >
              Finalizar orden
            </button>
          )}

          {editMode && (
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded"
              onClick={handleSave}
              disabled={saving}
            >
              Guardar
            </button>
          )}

          <button
            className="px-4 py-2 border rounded"
            onClick={handleCloseAll}
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* MODALES */}
      {showActividadModal && (
        <ActividadTrabajoModal
          trabajoId={trabajoId}
          onClose={() => setShowActividadModal(false)}
          onSaved={async () => {
            const res = await actividadTrabajoAPI.listByTrabajo(trabajoId);
            setActividades(res.data);
          }}
        />
      )}

      {showMovimientoModal && actividadSeleccionada && (
        <MovimientoRepuestoModal
          key={actividadSeleccionada.id} // 🔥 CLAVE ABSOLUTA
          open={showMovimientoModal}
          actividad={actividadSeleccionada}
          onClose={() => setShowMovimientoModal(false)}
          onSaved={async () => {
            const res = await actividadTrabajoAPI.listByTrabajo(trabajoId);
            setActividades(res.data);
          }}
        />
      )}

      {showFinalizarModal && (
        <FinalizarOrdenModal
          trabajo={trabajo}
          onClose={() => setShowFinalizarModal(false)}
          onFinalizado={(trabajoActualizado) => {
            setTrabajo(trabajoActualizado);
            setForm(trabajoActualizado);
            setShowFinalizarModal(false);

            onUpdated?.(trabajoActualizado); // 🔥 AVISA AL KANBAN
          }}
        />
      )}
    </div>
  );
}

/* =========================
   INPUTS
========================= */

function Input({ label, ...props }) {
  return (
    <div>
      <label className="text-xs text-gray-600">{label}</label>
      <input {...props} className="w-full border rounded p-1 text-sm" />
    </div>
  );
}

function Textarea({ label, ...props }) {
  return (
    <div>
      <label className="text-xs text-gray-600">{label}</label>
      <textarea {...props} className="w-full border rounded p-1 text-sm" />
    </div>
  );
}

function Select({ label, options, ...props }) {
  return (
    <div>
      <label className="text-xs text-gray-600">{label}</label>
      <select {...props} className="w-full border rounded p-1 text-sm">
        <option value="">---</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
