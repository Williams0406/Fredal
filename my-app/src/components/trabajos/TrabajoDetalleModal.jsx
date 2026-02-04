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
  const [actividadModalPlanificada, setActividadModalPlanificada] = useState(false);
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

  const actividadesPlanificadas = actividades.filter((a) => a.es_planificada);
  const actividadesRegistradas = actividades.filter((a) => !a.es_planificada);
  

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
    if (!actividades.length || !trabajoId) {
      setUnidadesPorActividad({});
      return;
    }

    const loadUnidadesHistorial = async () => {
      try {
        const result = {};
        
        // Ejecutamos las peticiones para cada actividad
        await Promise.all(
          actividades.map(async (a) => {
            // Usamos movimientoRepuestoAPI en lugar de 'api'
            const res = await movimientoRepuestoAPI.list({ actividad: a.id });
            
            // Guardamos TODOS los movimientos (sin filtrar por estado INOPERATIVO)
            // para que el historial sea permanente.
            result[a.id] = res.data; 
          })
        );

        setUnidadesPorActividad(result);
      } catch (error) {
        console.error("Error cargando historial de unidades", error);
      }
    };

    loadUnidadesHistorial();
  }, [actividades, trabajoId]);

  if (!open) return null;

  if (loading || !form) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-xl text-center">
          <div className="w-12 h-12 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Cargando detalles...</p>
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

      onUpdated?.(res.data);
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
    setActividadModalPlanificada(false);
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
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={() => {
        if (!hayModalHijoAbierto) handleCloseAll();
      }}
    >
      <div
        className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >

        {/* HEADER STICKY */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold text-[#1e3a8a]">
                {trabajo.codigo_orden}
              </h2>
              
              {/* Badge de estado */}
              <StatusBadge estatus={trabajo.estatus} />
            </div>

            <div className="flex items-center gap-3">
              {!esFinalizado && (
                !editMode ? (
                  <button
                    className="text-sm font-medium text-[#1e3a8a] hover:text-[#1e3a8a]/80 
                             transition-colors duration-200 flex items-center gap-1"
                    onClick={() => setEditMode(true)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Editar
                  </button>
                ) : (
                  <button
                    className="text-sm font-medium text-gray-600 hover:text-gray-800 
                             transition-colors duration-200"
                    onClick={() => {
                      setForm(trabajo);
                      setEditMode(false);
                    }}
                  >
                    Cancelar edición
                  </button>
                )
              )}

              <button
                onClick={handleCloseAll}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* CONTENIDO CON SCROLL */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            
            {/* SECCIÓN: Información General */}
            <section>
              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#1e3a8a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Información General
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              <div className="mt-4">
                <Input
                  label="Ubicación detallada"
                  name="ubicacion_detalle"
                  value={form.ubicacion_detalle || ""}
                  onChange={handleChange}
                  disabled={readOnly}
                  placeholder="Ubicación exacta del trabajo"
                />
              </div>
            </section>

            {/* SECCIÓN: Información Técnica (solo en proceso o finalizado) */}
            {(esEnProceso || esFinalizado) && (
              <section className="border-t border-gray-200 pt-6">
                <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#1e3a8a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Información Técnica
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    placeholder="Horas"
                  />
                </div>

                <div className="mt-4">
                  <Select
                    label="Estado del equipo"
                    name="estado_equipo"
                    value={form.estado_equipo || ""}
                    onChange={handleChange}
                    options={ESTADOS_EQUIPO}
                    disabled={readOnly}
                  />
                </div>
              </section>
            )}

            {/* SECCIÓN: Observaciones */}
            <section className="border-t border-gray-200 pt-6">
              <Textarea
                label="Observaciones"
                name="observaciones"
                value={form.observaciones || ""}
                onChange={handleChange}
                disabled={readOnly}
                placeholder="Detalles adicionales sobre el trabajo..."
                rows={4}
              />
            </section>

            {/* SECCIÓN: Técnicos */}
            <section className="border-t border-gray-200 pt-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#1e3a8a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Técnicos Asignados
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {tecnicos.map((t) => (
                  <label 
                    key={t.id} 
                    className={`
                      flex items-center gap-3 p-3 border rounded-lg text-sm
                      transition-all duration-200 cursor-pointer
                      ${form.tecnicos?.includes(t.id) 
                        ? "border-[#1e3a8a] bg-blue-50" 
                        : "border-gray-300 hover:border-gray-400 bg-white"
                      }
                      ${readOnly ? "opacity-60 cursor-not-allowed" : ""}
                    `}
                  >
                    <input
                      type="checkbox"
                      disabled={readOnly}
                      checked={form.tecnicos?.includes(t.id)}
                      onChange={() => toggleTecnico(t.id)}
                      className="w-4 h-4 text-[#1e3a8a] border-gray-300 rounded 
                               focus:ring-2 focus:ring-[#1e3a8a]"
                    />
                    <span className="flex-1 font-medium">
                      {t.nombres} {t.apellidos}
                    </span>
                  </label>
                ))}
              </div>
            </section>

            {/* SECCIÓN: Actividades (solo en proceso o finalizado) */}
            {(esEnProceso || esFinalizado) && (
              <section className="border-t border-gray-200 pt-6">
                <div className="space-y-8">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#1e3a8a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        Actividades a Realizar
                        <span className="text-sm font-normal text-gray-500">
                          ({actividadesPlanificadas.length})
                        </span>
                      </h3>
                      {!esFinalizado && (
                        <button
                          className="px-4 py-2 text-sm font-medium text-white bg-[#84cc16] 
                                   rounded-lg hover:bg-[#84cc16]/90 focus:outline-none 
                                   focus:ring-2 focus:ring-[#84cc16] focus:ring-offset-2
                                   transition-all duration-200 flex items-center gap-2"
                          onClick={() => {
                            setActividadModalPlanificada(true);
                            setShowActividadModal(true);
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Nueva Actividad
                        </button>
                      )}
                    </div>

                    {actividadesPlanificadas.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm text-gray-600 font-medium">
                          No hay actividades planificadas
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Define las actividades que el técnico debe realizar
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {actividadesPlanificadas.map((a) => (
                          <ActividadCard
                            key={a.id}
                            actividad={a}
                            unidades={unidadesPorActividad[a.id]}
                            esFinalizado={esFinalizado}
                            onAgregarRepuesto={() => {
                              setActividadSeleccionada(a);
                              setShowMovimientoModal(true);
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#1e3a8a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        Actividades Registradas
                        <span className="text-sm font-normal text-gray-500">
                          ({actividadesRegistradas.length})
                        </span>
                      </h3>
                      {!esFinalizado && (
                        <button
                          className="px-4 py-2 text-sm font-medium text-white bg-[#1e3a8a] 
                                   rounded-lg hover:bg-[#1e3a8a]/90 focus:outline-none 
                                   focus:ring-2 focus:ring-[#1e3a8a] focus:ring-offset-2
                                   transition-all duration-200 flex items-center gap-2"
                          onClick={() => {
                            setActividadModalPlanificada(false);
                            setShowActividadModal(true);
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Nueva Actividad
                        </button>
                      )}
                    </div>

                    {actividadesRegistradas.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm text-gray-600 font-medium">
                          No hay actividades registradas
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Agrega actividades para documentar el trabajo realizado
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {actividadesRegistradas.map((a) => (
                          <ActividadCard
                            key={a.id}
                            actividad={a}
                            unidades={unidadesPorActividad[a.id]}
                            esFinalizado={esFinalizado}
                            onAgregarRepuesto={() => {
                              setActividadSeleccionada(a);
                              setShowMovimientoModal(true);
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>

        {/* FOOTER STICKY CON ACCIONES */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-xl flex-shrink-0">
          <div className="flex justify-end gap-3">
            {esPendiente && (
              <button
                className="px-5 py-2.5 text-sm font-medium text-white bg-[#84cc16]
                         rounded-lg hover:bg-[#84cc16]/90 focus:outline-none 
                         focus:ring-2 focus:ring-[#84cc16] focus:ring-offset-2
                         transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
                onClick={handleIniciarTrabajo}
                disabled={saving}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Iniciar Trabajo
              </button>
            )}

            {esEnProceso && (
              <button
                className="px-5 py-2.5 text-sm font-medium text-white bg-red-600
                         rounded-lg hover:bg-red-700 focus:outline-none 
                         focus:ring-2 focus:ring-red-600 focus:ring-offset-2
                         transition-all duration-200 flex items-center gap-2"
                onClick={() => setShowFinalizarModal(true)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Finalizar Orden
              </button>
            )}

            {editMode && (
              <button
                className="px-5 py-2.5 text-sm font-medium text-white bg-[#1e3a8a]
                         rounded-lg hover:bg-[#1e3a8a]/90 focus:outline-none 
                         focus:ring-2 focus:ring-[#1e3a8a] focus:ring-offset-2
                         transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
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
                    Guardar Cambios
                  </>
                )}
              </button>
            )}

            <button
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white 
                       border border-gray-300 rounded-lg hover:bg-gray-50 
                       focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:ring-offset-2
                       transition-all duration-200"
              onClick={handleCloseAll}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* MODALES HIJOS */}
      {showActividadModal && (
        <ActividadTrabajoModal
          trabajoId={trabajoId}
          esPlanificada={actividadModalPlanificada}
          onClose={() => {
            setShowActividadModal(false);
            setActividadModalPlanificada(false);
          }}
          onSaved={async () => {
            const res = await actividadTrabajoAPI.listByTrabajo(trabajoId);
            setActividades(res.data);
          }}
        />
      )}

      {showMovimientoModal && actividadSeleccionada && (
        <MovimientoRepuestoModal
          key={actividadSeleccionada.id}
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
            onUpdated?.(trabajoActualizado);
          }}
        />
      )}
    </div>
  );
}

/* =========================
   COMPONENTES AUXILIARES
========================= */

function StatusBadge({ estatus }) {
  const config = {
    PENDIENTE: { bg: "bg-gray-100", text: "text-gray-700", label: "Pendiente" },
    EN_PROCESO: { bg: "bg-blue-100", text: "text-[#1e3a8a]", label: "En Proceso" },
    FINALIZADO: { bg: "bg-green-100", text: "text-green-700", label: "Finalizado" },
  };

  const style = config[estatus] || config.PENDIENTE;

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

function ActividadCard({ actividad, unidades, esFinalizado, onAgregarRepuesto }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow duration-200">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="font-semibold text-[#1e3a8a]">
            {actividad.tipo_actividad}
          </p>
          {actividad.tipo_mantenimiento && (
            <p className="text-sm text-gray-600 mt-1">
              {actividad.tipo_mantenimiento} – {actividad.subtipo}
            </p>
          )}
        </div>

        {actividad.tipo_actividad === "MANTENIMIENTO" && !esFinalizado && (
          <button
            className="px-3 py-1.5 text-xs font-medium text-[#84cc16] bg-green-50 
                     border border-green-200 rounded-lg hover:bg-green-100 
                     transition-all duration-200 flex items-center gap-1"
            onClick={onAgregarRepuesto}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar Repuesto
          </button>
        )}
      </div>

      {/* REEMPLAZO: Unidades/Repuestos desde el historial de la actividad */}
      {unidades && unidades.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <p className="text-xs font-medium text-gray-700 mb-2">
            Unidades asignadas en esta actividad:
          </p>
          <div className="mt-2 space-y-1">
            {unidades.map((mov) => (
              <div key={mov.id} className="text-xs bg-gray-50 p-2 rounded border flex justify-between items-center">
                <span className="flex flex-col">
                  <span className="font-semibold text-gray-900">
                    {mov.item_codigo} - {mov.item_nombre} {/* <--- MOSTRAR NOMBRE AQUÍ */}
                  </span>
                  <span className="text-gray-500">
                    S/N: {mov.unidad_serie}
                  </span>
                </span>
                <span className="text-gray-500 italic bg-white px-2 py-0.5 rounded border border-gray-100">
                  Estado: {mov.estado}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================
   INPUTS REUTILIZABLES
========================= */

function Input({ label, disabled, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input 
        {...props} 
        disabled={disabled}
        className={`
          w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
          focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
          transition-all duration-200 placeholder:text-gray-400
          ${disabled ? "bg-gray-50 text-gray-600 cursor-not-allowed" : "bg-white"}
        `}
      />
    </div>
  );
}

function Textarea({ label, disabled, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <textarea 
        {...props} 
        disabled={disabled}
        className={`
          w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
          focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
          transition-all duration-200 placeholder:text-gray-400 resize-none
          ${disabled ? "bg-gray-50 text-gray-600 cursor-not-allowed" : "bg-white"}
        `}
      />
    </div>
  );
}

function Select({ label, options, disabled, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <select 
        {...props} 
        disabled={disabled}
        className={`
          w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
          focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
          transition-all duration-200
          ${disabled ? "bg-gray-50 text-gray-600 cursor-not-allowed" : "bg-white"}
        `}
      >
        <option value="">Seleccione una opción</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
