"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import { checklistAPI } from "@/lib/api";
import { getTodayDateInputValue } from "@/lib/utils";

const inputClassName =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#173569] focus:ring-2 focus:ring-[#EAF1FF]";

const TIPO_RESPUESTA_OPTIONS = [
  { value: "TEXTO", label: "Texto" },
  { value: "NUMERO", label: "Numero" },
  { value: "BOOLEANO", label: "Si / No" },
  { value: "OPCION", label: "Opcion" },
];

function createActividadRow(index = 1) {
  const localId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `actividad-${Date.now()}-${Math.random()}`;

  return {
    localId,
    orden: index,
    obligatorio: true,
    modeActividad: "new",
    actividadId: "",
    actividadData: {
      descripcion: "",
      tipo_respuesta: "BOOLEANO",
      obligatorio: true,
      requiere_observacion: false,
      requiere_evidencia: false,
      item: "",
      activo: true,
    },
    modeSistema: "none",
    sistemaId: "",
    sistemaData: {
      nombre: "",
      descripcion: "",
    },
  };
}

function getApiErrorMessage(error) {
  const data = error?.response?.data;

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (typeof data === "string") {
    return data;
  }

  if (data && typeof data === "object") {
    const firstValue = Object.values(data)[0];
    if (Array.isArray(firstValue) && firstValue.length > 0) {
      return String(firstValue[0]);
    }
    if (typeof firstValue === "string") {
      return firstValue;
    }
  }

  return "No se pudo registrar el checklist.";
}

export default function ChecklistBuilderModal({
  open,
  onClose,
  onCreated,
  actividadesBase = [],
  sistemas = [],
  items = [],
}) {
  const [form, setForm] = useState({
    motivo: "",
    fecha: getTodayDateInputValue(),
    estado: "ACTIVO",
  });
  const [actividades, setActividades] = useState([createActividadRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm({
      motivo: "",
      fecha: getTodayDateInputValue(),
      estado: "ACTIVO",
    });
    setActividades([createActividadRow()]);
    setSaving(false);
    setError("");
  }, [open]);

  const sortedActividades = useMemo(
    () =>
      [...actividadesBase].sort((left, right) =>
        String(left.descripcion || "").localeCompare(String(right.descripcion || ""))
      ),
    [actividadesBase]
  );

  const sortedSistemas = useMemo(
    () =>
      [...sistemas].sort((left, right) =>
        String(left.nombre || "").localeCompare(String(right.nombre || ""))
      ),
    [sistemas]
  );

  const sortedItems = useMemo(
    () =>
      [...items].sort((left, right) => {
        const leftLabel = `${left.codigo || ""} ${left.nombre || ""}`.trim();
        const rightLabel = `${right.codigo || ""} ${right.nombre || ""}`.trim();
        return leftLabel.localeCompare(rightLabel);
      }),
    [items]
  );

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
    if (error) setError("");
  };

  const handleActividadRowChange = (localId, updater) => {
    setActividades((current) =>
      current.map((row) => (row.localId === localId ? updater(row) : row))
    );
    if (error) setError("");
  };

  const handleActividadModeChange = (localId, value) => {
    handleActividadRowChange(localId, (row) => ({
      ...row,
      modeActividad: value,
      actividadId: value === "existing" ? row.actividadId : "",
    }));
  };

  const handleSistemaModeChange = (localId, value) => {
    handleActividadRowChange(localId, (row) => ({
      ...row,
      modeSistema: value,
      sistemaId: value === "existing" ? row.sistemaId : "",
      sistemaData:
        value === "new"
          ? row.sistemaData
          : {
              nombre: "",
              descripcion: "",
            },
    }));
  };

  const addActividadRow = () => {
    setActividades((current) => [...current, createActividadRow(current.length + 1)]);
  };

  const removeActividadRow = (localId) => {
    setActividades((current) => {
      const next = current.filter((row) => row.localId !== localId);
      return next.length > 0
        ? next.map((row, index) => ({
            ...row,
            orden: index + 1,
          }))
        : [createActividadRow()];
    });
    if (error) setError("");
  };

  const buildPayload = () => {
    if (!form.motivo.trim()) {
      throw new Error("Escribe el motivo del checklist.");
    }

    const actividadesPayload = actividades.map((row, index) => {
      const payload = {
        orden: Number(row.orden || index + 1),
        obligatorio: Boolean(row.obligatorio),
      };

      if (row.modeActividad === "existing") {
        if (!row.actividadId) {
          throw new Error(`Selecciona la actividad base del bloque ${index + 1}.`);
        }
        payload.actividad = Number(row.actividadId);
      } else {
        if (!row.actividadData.descripcion.trim()) {
          throw new Error(`Describe la nueva actividad del bloque ${index + 1}.`);
        }
        payload.actividad_data = {
          descripcion: row.actividadData.descripcion.trim(),
          tipo_respuesta: row.actividadData.tipo_respuesta,
          obligatorio: Boolean(row.actividadData.obligatorio),
          requiere_observacion: Boolean(row.actividadData.requiere_observacion),
          requiere_evidencia: Boolean(row.actividadData.requiere_evidencia),
          item: row.actividadData.item ? Number(row.actividadData.item) : null,
          activo: Boolean(row.actividadData.activo),
        };
      }

      if (row.modeSistema === "existing") {
        if (!row.sistemaId) {
          throw new Error(`Selecciona el sistema del bloque ${index + 1}.`);
        }
        payload.sistema = Number(row.sistemaId);
      } else if (row.modeSistema === "new") {
        if (!row.sistemaData.nombre.trim()) {
          throw new Error(`Escribe el nombre del nuevo sistema del bloque ${index + 1}.`);
        }
        payload.sistema_data = {
          nombre: row.sistemaData.nombre.trim(),
          descripcion: row.sistemaData.descripcion.trim(),
        };
      }

      return payload;
    });

    return {
      motivo: form.motivo.trim(),
      fecha: form.fecha,
      estado: form.estado,
      actividades_payload: actividadesPayload,
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = buildPayload();
      await checklistAPI.create(payload);
      onCreated?.();
      onClose?.();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : getApiErrorMessage(submitError)
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!saving) onClose?.();
      }}
      title="Nuevo checklist"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
          <div className="grid gap-5 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">
                Motivo del checklist
              </label>
              <input
                type="text"
                name="motivo"
                value={form.motivo}
                onChange={handleFormChange}
                placeholder="Ej: Checklist previo al encendido de equipo"
                disabled={saving}
                className={inputClassName}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">Fecha</label>
              <input
                type="date"
                name="fecha"
                value={form.fecha}
                onChange={handleFormChange}
                disabled={saving}
                className={inputClassName}
              />
            </div>
          </div>

          <div className="mt-5 max-w-xs">
            <label className="text-sm font-semibold text-slate-700">Estado</label>
            <select
              name="estado"
              value={form.estado}
              onChange={handleFormChange}
              disabled={saving}
              className={inputClassName}
            >
              <option value="BORRADOR">Borrador</option>
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Actividades del checklist
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Combina actividades y sistemas existentes o crea nuevos elementos sobre la marcha.
              </p>
            </div>

            <button
              type="button"
              onClick={addActividadRow}
              disabled={saving}
              className="rounded-2xl bg-[#173569] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(23,53,105,0.18)] transition hover:bg-[#0f2346] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Agregar actividad
            </button>
          </div>

          <div className="space-y-4">
            {actividades.map((row, index) => (
              <article
                key={row.localId}
                className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_16px_38px_rgba(15,35,70,0.05)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Bloque {index + 1}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Define la actividad base, el sistema asociado y el orden de control.
                    </p>
                  </div>

                  {actividades.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeActividadRow(row.localId)}
                      disabled={saving}
                      className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Quitar
                    </button>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
                  <div className="space-y-5 rounded-[22px] border border-slate-200 bg-slate-50/70 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-semibold text-slate-700">
                          Orden
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={row.orden}
                          onChange={(event) =>
                            handleActividadRowChange(row.localId, (current) => ({
                              ...current,
                              orden: event.target.value,
                            }))
                          }
                          disabled={saving}
                          className={inputClassName}
                        />
                      </div>

                      <label className="mt-8 inline-flex items-center gap-3 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={row.obligatorio}
                          onChange={(event) =>
                            handleActividadRowChange(row.localId, (current) => ({
                              ...current,
                              obligatorio: event.target.checked,
                            }))
                          }
                          disabled={saving}
                          className="h-4 w-4 rounded border-slate-300 text-[#173569] focus:ring-[#173569]"
                        />
                        Obligatorio en el checklist
                      </label>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-700">
                        Fuente de actividad
                      </label>
                      <select
                        value={row.modeActividad}
                        onChange={(event) =>
                          handleActividadModeChange(row.localId, event.target.value)
                        }
                        disabled={saving}
                        className={inputClassName}
                      >
                        <option value="new">Crear nueva actividad checklist</option>
                        <option value="existing">Usar actividad existente</option>
                      </select>
                    </div>

                    {row.modeActividad === "existing" ? (
                      <div>
                        <label className="text-sm font-semibold text-slate-700">
                          Actividad base
                        </label>
                        <select
                          value={row.actividadId}
                          onChange={(event) =>
                            handleActividadRowChange(row.localId, (current) => ({
                              ...current,
                              actividadId: event.target.value,
                            }))
                          }
                          disabled={saving}
                          className={inputClassName}
                        >
                          <option value="">Selecciona una actividad</option>
                          {sortedActividades.map((actividad) => (
                            <option key={actividad.id} value={actividad.id}>
                              {actividad.descripcion}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-semibold text-slate-700">
                            Descripcion de la actividad
                          </label>
                          <textarea
                            value={row.actividadData.descripcion}
                            onChange={(event) =>
                              handleActividadRowChange(row.localId, (current) => ({
                                ...current,
                                actividadData: {
                                  ...current.actividadData,
                                  descripcion: event.target.value,
                                },
                              }))
                            }
                            disabled={saving}
                            rows={3}
                            className={`${inputClassName} resize-y`}
                            placeholder="Describe la actividad a inspeccionar"
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="text-sm font-semibold text-slate-700">
                              Tipo de respuesta
                            </label>
                            <select
                              value={row.actividadData.tipo_respuesta}
                              onChange={(event) =>
                                handleActividadRowChange(row.localId, (current) => ({
                                  ...current,
                                  actividadData: {
                                    ...current.actividadData,
                                    tipo_respuesta: event.target.value,
                                  },
                                }))
                              }
                              disabled={saving}
                              className={inputClassName}
                            >
                              {TIPO_RESPUESTA_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-sm font-semibold text-slate-700">
                              Item relacionado
                            </label>
                            <select
                              value={row.actividadData.item}
                              onChange={(event) =>
                                handleActividadRowChange(row.localId, (current) => ({
                                  ...current,
                                  actividadData: {
                                    ...current.actividadData,
                                    item: event.target.value,
                                  },
                                }))
                              }
                              disabled={saving}
                              className={inputClassName}
                            >
                              <option value="">Sin item asociado</option>
                              {sortedItems.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.codigo} - {item.nombre}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="inline-flex items-center gap-3 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={row.actividadData.obligatorio}
                              onChange={(event) =>
                                handleActividadRowChange(row.localId, (current) => ({
                                  ...current,
                                  actividadData: {
                                    ...current.actividadData,
                                    obligatorio: event.target.checked,
                                  },
                                }))
                              }
                              disabled={saving}
                              className="h-4 w-4 rounded border-slate-300 text-[#173569] focus:ring-[#173569]"
                            />
                            Actividad base obligatoria
                          </label>

                          <label className="inline-flex items-center gap-3 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={row.actividadData.activo}
                              onChange={(event) =>
                                handleActividadRowChange(row.localId, (current) => ({
                                  ...current,
                                  actividadData: {
                                    ...current.actividadData,
                                    activo: event.target.checked,
                                  },
                                }))
                              }
                              disabled={saving}
                              className="h-4 w-4 rounded border-slate-300 text-[#173569] focus:ring-[#173569]"
                            />
                            Dejar actividad activa
                          </label>

                          <label className="inline-flex items-center gap-3 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={row.actividadData.requiere_observacion}
                              onChange={(event) =>
                                handleActividadRowChange(row.localId, (current) => ({
                                  ...current,
                                  actividadData: {
                                    ...current.actividadData,
                                    requiere_observacion: event.target.checked,
                                  },
                                }))
                              }
                              disabled={saving}
                              className="h-4 w-4 rounded border-slate-300 text-[#173569] focus:ring-[#173569]"
                            />
                            Requiere observacion
                          </label>

                          <label className="inline-flex items-center gap-3 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={row.actividadData.requiere_evidencia}
                              onChange={(event) =>
                                handleActividadRowChange(row.localId, (current) => ({
                                  ...current,
                                  actividadData: {
                                    ...current.actividadData,
                                    requiere_evidencia: event.target.checked,
                                  },
                                }))
                              }
                              disabled={saving}
                              className="h-4 w-4 rounded border-slate-300 text-[#173569] focus:ring-[#173569]"
                            />
                            Requiere evidencia
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-5 rounded-[22px] border border-slate-200 bg-white p-4">
                    <div>
                      <label className="text-sm font-semibold text-slate-700">
                        Sistema asociado
                      </label>
                      <select
                        value={row.modeSistema}
                        onChange={(event) =>
                          handleSistemaModeChange(row.localId, event.target.value)
                        }
                        disabled={saving}
                        className={inputClassName}
                      >
                        <option value="none">Sin sistema</option>
                        <option value="existing">Usar sistema existente</option>
                        <option value="new">Crear nuevo sistema</option>
                      </select>
                    </div>

                    {row.modeSistema === "existing" ? (
                      <div>
                        <label className="text-sm font-semibold text-slate-700">
                          Sistema disponible
                        </label>
                        <select
                          value={row.sistemaId}
                          onChange={(event) =>
                            handleActividadRowChange(row.localId, (current) => ({
                              ...current,
                              sistemaId: event.target.value,
                            }))
                          }
                          disabled={saving}
                          className={inputClassName}
                        >
                          <option value="">Selecciona un sistema</option>
                          {sortedSistemas.map((sistema) => (
                            <option key={sistema.id} value={sistema.id}>
                              {sistema.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    {row.modeSistema === "new" ? (
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-semibold text-slate-700">
                            Nombre del sistema
                          </label>
                          <input
                            type="text"
                            value={row.sistemaData.nombre}
                            onChange={(event) =>
                              handleActividadRowChange(row.localId, (current) => ({
                                ...current,
                                sistemaData: {
                                  ...current.sistemaData,
                                  nombre: event.target.value,
                                },
                              }))
                            }
                            disabled={saving}
                            className={inputClassName}
                            placeholder="Ej: Sistema hidraulico"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-semibold text-slate-700">
                            Descripcion del sistema
                          </label>
                          <textarea
                            value={row.sistemaData.descripcion}
                            onChange={(event) =>
                              handleActividadRowChange(row.localId, (current) => ({
                                ...current,
                                sistemaData: {
                                  ...current.sistemaData,
                                  descripcion: event.target.value,
                                },
                              }))
                            }
                            disabled={saving}
                            rows={3}
                            className={`${inputClassName} resize-y`}
                            placeholder="Contexto tecnico del sistema"
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-[#173569] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(23,53,105,0.18)] transition hover:bg-[#0f2346] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Registrar checklist"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
