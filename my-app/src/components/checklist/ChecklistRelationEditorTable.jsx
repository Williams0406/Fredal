"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Plus, Search, Trash2 } from "lucide-react";
import { checklistAPI } from "@/lib/api";

function createRelationRow(index = 0, source = {}) {
  const localId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `checklist-rel-${Date.now()}-${Math.random()}`;

  return {
    localId,
    actividadId: source.actividadId ? String(source.actividadId) : "",
    actividadQuery: source.actividadQuery || "",
    sistemaId: source.sistemaId ? String(source.sistemaId) : "",
    sistemaQuery: source.sistemaQuery || "",
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
        actividadId: actividad.actividad,
        actividadQuery: actividad?.actividad_detalle?.descripcion || "",
        sistemaId: actividad.sistema,
        sistemaQuery: actividad?.sistema_detalle?.nombre || "",
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
  return "No se pudo guardar la relacion del checklist.";
}

function SearchableCellSelect({
  value,
  selectedId,
  options,
  placeholder,
  disabled = false,
  emptyLabel = "Sin coincidencias",
  onChange,
  onSelect,
}) {
  const [open, setOpen] = useState(false);

  const filteredOptions = useMemo(() => {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) return options;

    return options.filter((option) =>
      String(option.label || "").toLowerCase().includes(normalized)
    );
  }, [options, value]);

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-3">
        <Search className="h-4 w-4 shrink-0 text-slate-300" />
        <input
          type="text"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
          }}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full border-0 bg-transparent px-0 py-0 text-sm text-slate-700 outline-none placeholder:text-slate-400"
        />
      </div>

      {open && !disabled ? (
        <div className="border-t border-slate-200 bg-white">
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">{emptyLabel}</div>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelect(option);
                  setOpen(false);
                }}
                className={[
                  "flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50",
                  String(selectedId || "") === String(option.id)
                    ? "bg-[#f3f7ff]"
                    : "",
                ].join(" ")}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-800">
                    {option.label}
                  </div>
                  {option.meta ? (
                    <div className="mt-1 truncate text-xs text-slate-500">
                      {option.meta}
                    </div>
                  ) : null}
                </div>
                {String(selectedId || "") === String(option.id) ? (
                  <span className="mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#173569] px-1 text-[10px] font-bold text-white">
                    OK
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function ChecklistRelationEditorTable({
  checklist,
  actividadesBase = [],
  sistemas = [],
  canManage = false,
  onSaved,
}) {
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const actividadOptions = useMemo(
    () =>
      [...actividadesBase]
        .filter((actividad) => actividad.activo !== false)
        .sort((left, right) =>
          String(left.descripcion || "").localeCompare(
            String(right.descripcion || "")
          )
        )
        .map((actividad) => ({
          id: actividad.id,
          label: actividad.descripcion || "",
          meta: [
            actividad.tipo_respuesta_label,
            actividad.item_codigo ? `Item ${actividad.item_codigo}` : null,
          ]
            .filter(Boolean)
            .join(" / "),
        })),
    [actividadesBase]
  );

  const sistemaOptions = useMemo(
    () =>
      [...sistemas]
        .sort((left, right) =>
          String(left.nombre || "").localeCompare(String(right.nombre || ""))
        )
        .map((sistema) => ({
          id: sistema.id,
          label: sistema.nombre || "",
          meta: sistema.descripcion || "",
        })),
    [sistemas]
  );

  useEffect(() => {
    setRows(normalizeRowsFromChecklist(checklist));
    setError("");
    setSuccessMessage("");
  }, [checklist]);

  const addRow = () => {
    setRows((current) => [...current, createRelationRow(current.length)]);
    setError("");
    setSuccessMessage("");
  };

  const updateRow = (localId, patch) => {
    setRows((current) =>
      current.map((row, index) =>
        row.localId === localId
          ? { ...row, ...patch, orden: index + 1 }
          : { ...row, orden: index + 1 }
      )
    );
    setError("");
    setSuccessMessage("");
  };

  const removeRow = (localId) => {
    setRows((current) =>
      current
        .filter((row) => row.localId !== localId)
        .map((row, index) => ({ ...row, orden: index + 1 }))
    );
    setError("");
    setSuccessMessage("");
  };

  const handleSave = async () => {
    const missingActividad = rows.find((row) => !row.actividadId);
    if (missingActividad) {
      setError("Cada fila debe tener una actividad checklist seleccionada.");
      return;
    }

    const unresolvedSistema = rows.find(
      (row) => row.sistemaQuery.trim().length > 0 && !row.sistemaId
    );
    if (unresolvedSistema) {
      setError(
        "Si escribes un sistema, selecciona una opcion valida de la lista filtrada."
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      await checklistAPI.patch(checklist.id, {
        actividades_payload: rows.map((row, index) => ({
          actividad: Number(row.actividadId),
          sistema: row.sistemaId ? Number(row.sistemaId) : null,
          obligatorio: Boolean(row.obligatorio),
          orden: index + 1,
        })),
      });

      setSuccessMessage("La relacion del checklist se guardo correctamente.");
      await onSaved?.();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,35,70,0.08)]">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Relacion de actividades y sistemas
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Edita la plantilla como una hoja de trabajo: escribe para filtrar
              actividades o sistemas, selecciona la opcion correcta y agrega
              nuevas filas desde la parte baja.
            </p>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <div className="font-semibold text-slate-800">{checklist.motivo}</div>
            <div className="mt-1">
              {rows.length} {rows.length === 1 ? "fila" : "filas"} en edicion
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-6 py-5">
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

        <div className="rounded-[24px] border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50/90">
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <th className="w-20 px-4 py-4">Paso</th>
                  <th className="min-w-[320px] px-4 py-4">Actividad checklist</th>
                  <th className="min-w-[280px] px-4 py-4">Sistema</th>
                  <th className="w-40 px-4 py-4">Obligatorio</th>
                  <th className="w-28 px-4 py-4 text-right">Accion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-10 text-center text-sm text-slate-500"
                    >
                      Este checklist aun no tiene relaciones. Agrega la primera
                      fila para comenzar.
                    </td>
                  </tr>
                ) : null}

                {rows.map((row, index) => (
                  <tr key={row.localId} className="align-top">
                    <td className="px-4 py-0">
                      <div className="px-0 py-3 text-sm font-semibold text-slate-700">
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-0 py-0">
                      <SearchableCellSelect
                        value={row.actividadQuery}
                        selectedId={row.actividadId}
                        options={actividadOptions}
                        placeholder="Escribe para filtrar actividad"
                        disabled={!canManage || saving}
                        onChange={(query) =>
                          updateRow(row.localId, {
                            actividadQuery: query,
                            actividadId: "",
                          })
                        }
                        onSelect={(option) =>
                          updateRow(row.localId, {
                            actividadId: String(option.id),
                            actividadQuery: option.label,
                          })
                        }
                      />
                    </td>
                    <td className="px-0 py-0">
                      <SearchableCellSelect
                        value={row.sistemaQuery}
                        selectedId={row.sistemaId}
                        options={sistemaOptions}
                        placeholder="Escribe para filtrar sistema"
                        disabled={!canManage || saving}
                        emptyLabel="Sin sistemas coincidentes"
                        onChange={(query) =>
                          updateRow(row.localId, {
                            sistemaQuery: query,
                            sistemaId: "",
                          })
                        }
                        onSelect={(option) =>
                          updateRow(row.localId, {
                            sistemaId: String(option.id),
                            sistemaQuery: option.label,
                          })
                        }
                      />
                    </td>
                    <td className="px-4 py-0">
                      <label className="inline-flex h-full items-center gap-3 px-0 py-3 text-sm text-slate-700">
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
                        Si
                      </label>
                    </td>
                    <td className="px-4 py-0 text-right">
                      {canManage ? (
                        <button
                          type="button"
                          onClick={() => removeRow(row.localId)}
                          disabled={saving}
                          className="inline-flex items-center gap-2 px-0 py-3 text-sm font-semibold text-rose-600 transition hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 className="h-4 w-4" />
                          Borrar
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
              {canManage ? (
                <tfoot className="border-t border-slate-200 bg-slate-50/70">
                  <tr>
                    <td colSpan={5} className="px-0 py-0">
                      <button
                        type="button"
                        onClick={addRow}
                        className="flex w-full items-center justify-center gap-2 px-4 py-4 text-sm font-semibold text-[#173569] transition hover:bg-[#eef4ff]"
                      >
                        <Plus className="h-4 w-4" />
                        Agregar fila
                      </button>
                    </td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </div>

        {canManage ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#173569] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(23,53,105,0.18)] transition hover:bg-[#0f2346] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
