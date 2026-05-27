"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, GitBranch, Link2, Plus, Trash2 } from "lucide-react";
import { checklistAPI } from "@/lib/api";

function createRelationRow(index = 0, source = {}) {
  const localId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `checklist-rel-${Date.now()}-${Math.random()}`;

  return {
    localId,
    actividad: source.actividad ? String(source.actividad) : "",
    sistema: source.sistema ? String(source.sistema) : "",
    obligatorio:
      typeof source.obligatorio === "boolean" ? source.obligatorio : true,
    orden:
      typeof source.orden === "number" && Number.isFinite(source.orden)
        ? source.orden
        : index + 1,
  };
}

function normalizeRowsFromChecklist(checklist) {
  return (checklist?.actividades || [])
    .slice()
    .sort((left, right) => (left?.orden || 0) - (right?.orden || 0))
    .map((actividad, index) =>
      createRelationRow(index, {
        actividad: actividad.actividad,
        sistema: actividad.sistema,
        obligatorio: actividad.obligatorio,
        orden: actividad.orden,
      })
    );
}

function getApiErrorMessage(error) {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const firstValue = Object.values(data)[0];
    if (Array.isArray(firstValue) && firstValue.length > 0) return String(firstValue[0]);
    if (typeof firstValue === "string") return firstValue;
  }
  return "No se pudo actualizar la relacion del checklist.";
}

export default function ChecklistRelationStudio({
  checklists = [],
  actividadesBase = [],
  sistemas = [],
  selectedChecklistId,
  onSelectChecklistId,
  onSaved,
  canManage = false,
}) {
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedChecklist = useMemo(
    () =>
      checklists.find(
        (checklist) => String(checklist.id) === String(selectedChecklistId)
      ) || null,
    [checklists, selectedChecklistId]
  );

  const sortedChecklists = useMemo(
    () =>
      [...checklists].sort((left, right) =>
        String(left.motivo || "").localeCompare(String(right.motivo || ""))
      ),
    [checklists]
  );

  const sortedActividades = useMemo(
    () =>
      [...actividadesBase]
        .filter((actividad) => actividad.activo !== false)
        .sort((left, right) =>
          String(left.descripcion || "").localeCompare(
            String(right.descripcion || "")
          )
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

  useEffect(() => {
    if (!selectedChecklist) {
      setRows([]);
      setError("");
      setSuccessMessage("");
      return;
    }

    const nextRows = normalizeRowsFromChecklist(selectedChecklist);
    setRows(nextRows);
    setError("");
    setSuccessMessage("");
  }, [selectedChecklist]);

  const addRow = () => {
    setRows((current) => [...current, createRelationRow(current.length)]);
    setSuccessMessage("");
    setError("");
  };

  const removeRow = (localId) => {
    setRows((current) =>
      current
        .filter((row) => row.localId !== localId)
        .map((row, index) => ({
          ...row,
          orden: index + 1,
        }))
    );
    setSuccessMessage("");
    setError("");
  };

  const updateRow = (localId, patch) => {
    setRows((current) =>
      current.map((row, index) =>
        row.localId === localId
          ? {
              ...row,
              ...patch,
              orden: index + 1,
            }
          : {
              ...row,
              orden: index + 1,
            }
      )
    );
    setSuccessMessage("");
    setError("");
  };

  const handleSave = async () => {
    if (!selectedChecklist) {
      setError("Selecciona un checklist para relacionar.");
      return;
    }

    const missingActividad = rows.find((row) => !row.actividad);
    if (missingActividad) {
      setError("Cada bloque debe tener una actividad checklist seleccionada.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      await checklistAPI.patch(selectedChecklist.id, {
        actividades_payload: rows.map((row, index) => ({
          actividad: Number(row.actividad),
          sistema: row.sistema ? Number(row.sistema) : null,
          obligatorio: Boolean(row.obligatorio),
          orden: index + 1,
        })),
      });
      setSuccessMessage("Relacion guardada correctamente.");
      await onSaved?.();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,35,70,0.08)]">
      <div className="border-b border-slate-200 px-6 py-5 md:px-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#d6e4ff] bg-[#eef4ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#173569]">
              <Link2 className="h-3.5 w-3.5" />
              Relacion dinamica
            </span>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
              Disena la secuencia de cada checklist
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Crea primero tus catalogos y luego arma la plantilla conectando
              actividades y sistemas paso a paso. El orden se toma de la
              secuencia visual de los bloques.
            </p>
          </div>

          <div className="w-full max-w-sm rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Checklist en diseno
            </label>
            <select
              value={selectedChecklistId || ""}
              onChange={(event) => onSelectChecklistId?.(event.target.value || null)}
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#173569] focus:ring-2 focus:ring-[#EAF1FF]"
            >
              <option value="">Selecciona un checklist</option>
              {sortedChecklists.map((checklist) => (
                <option key={checklist.id} value={checklist.id}>
                  {checklist.motivo}
                </option>
              ))}
            </select>

            {selectedChecklist ? (
              <div className="mt-4 rounded-2xl border border-white/80 bg-white px-4 py-3 text-sm text-slate-600 shadow-[0_12px_24px_rgba(15,35,70,0.04)]">
                <div className="font-semibold text-slate-800">
                  {selectedChecklist.motivo}
                </div>
                <div className="mt-1">
                  {selectedChecklist.actividades_count ?? 0} bloques actuales
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-5 px-6 py-6 md:px-7">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        {!selectedChecklist ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
            <GitBranch className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-4 text-lg font-semibold text-slate-800">
              Elige un checklist para empezar
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Cuando selecciones una plantilla, aqui podras definir su secuencia
              con actividades base y sistemas asociados.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Bloques del checklist
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Cada bloque representa una relacion dentro de la plantilla.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {canManage ? (
                  <>
                    <button
                      type="button"
                      onClick={addRow}
                      className="inline-flex items-center gap-2 rounded-2xl border border-[#173569]/12 bg-[#eef4ff] px-4 py-2.5 text-sm font-semibold text-[#173569] transition hover:bg-[#e2edff]"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar bloque
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-2xl bg-[#173569] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(23,53,105,0.18)] transition hover:bg-[#0f2346] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Check className="h-4 w-4" />
                      {saving ? "Guardando..." : "Guardar relacion"}
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="rounded-[26px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                Este checklist aun no tiene bloques relacionados. Agrega el
                primero para comenzar su secuencia.
              </div>
            ) : (
              <div className="space-y-4">
                {rows.map((row, index) => {
                  const actividadSeleccionada = sortedActividades.find(
                    (actividad) => String(actividad.id) === String(row.actividad)
                  );
                  const sistemaSeleccionado = sortedSistemas.find(
                    (sistema) => String(sistema.id) === String(row.sistema)
                  );

                  return (
                    <article
                      key={row.localId}
                      className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-5 shadow-[0_18px_36px_rgba(15,35,70,0.05)]"
                    >
                      <div className="grid gap-5 xl:grid-cols-[88px_minmax(0,1fr)_minmax(0,0.9fr)_auto]">
                        <div className="rounded-[22px] border border-[#d6e4ff] bg-[#eef4ff] px-4 py-4 text-center">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#173569]/70">
                            Paso
                          </div>
                          <div className="mt-2 text-3xl font-semibold tracking-tight text-[#173569]">
                            {index + 1}
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-semibold text-slate-700">
                            Actividad checklist
                          </label>
                          <select
                            value={row.actividad}
                            onChange={(event) =>
                              updateRow(row.localId, {
                                actividad: event.target.value,
                              })
                            }
                            disabled={!canManage || saving}
                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#173569] focus:ring-2 focus:ring-[#EAF1FF]"
                          >
                            <option value="">Selecciona una actividad</option>
                            {sortedActividades.map((actividad) => (
                              <option key={actividad.id} value={actividad.id}>
                                {actividad.descripcion}
                              </option>
                            ))}
                          </select>

                          <div className="mt-3 text-sm text-slate-500">
                            {actividadSeleccionada
                              ? [
                                  actividadSeleccionada.tipo_respuesta_label,
                                  actividadSeleccionada.item_codigo
                                    ? `Item ${actividadSeleccionada.item_codigo}`
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")
                              : "Sin actividad seleccionada"}
                          </div>
                        </div>

                        <div>
                          <label className="text-sm font-semibold text-slate-700">
                            Sistema asociado
                          </label>
                          <select
                            value={row.sistema}
                            onChange={(event) =>
                              updateRow(row.localId, {
                                sistema: event.target.value,
                              })
                            }
                            disabled={!canManage || saving}
                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#173569] focus:ring-2 focus:ring-[#EAF1FF]"
                          >
                            <option value="">Sin sistema</option>
                            {sortedSistemas.map((sistema) => (
                              <option key={sistema.id} value={sistema.id}>
                                {sistema.nombre}
                              </option>
                            ))}
                          </select>

                          <div className="mt-3 text-sm text-slate-500">
                            {sistemaSeleccionado?.descripcion || "Relacion opcional"}
                          </div>
                        </div>

                        <div className="flex flex-col justify-between gap-4">
                          <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                            <input
                              type="checkbox"
                              checked={row.obligatorio}
                              onChange={(event) =>
                                updateRow(row.localId, {
                                  obligatorio: event.target.checked,
                                })
                              }
                              disabled={!canManage || saving}
                              className="h-4 w-4 rounded border-slate-300 text-[#173569] focus:ring-[#173569]"
                            />
                            Obligatorio
                          </label>

                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => removeRow(row.localId)}
                              disabled={saving}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Trash2 className="h-4 w-4" />
                              Quitar
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
