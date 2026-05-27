"use client";

import { useMemo, useState } from "react";
import { FilePenLine, Plus, Save, SquareArrowOutUpRight, X } from "lucide-react";
import { checklistEjecucionAPI } from "@/lib/api";
import { formatDisplayDate, getTodayDateInputValue } from "@/lib/utils";

function EstadoBadge({ estado, label }) {
  const toneMap = {
    PENDIENTE: "border-amber-200 bg-amber-50 text-amber-700",
    EN_PROCESO: "border-sky-200 bg-sky-50 text-sky-700",
    COMPLETADO: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  return (
    <span
      className={[
        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
        toneMap[estado] || "border-slate-200 bg-slate-50 text-slate-600",
      ].join(" ")}
    >
      {label || estado || "-"}
    </span>
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
  return "No se pudo guardar la ejecucion del checklist.";
}

function createDraft(source = {}) {
  return {
    id: source.id || null,
    fecha: source.fecha || getTodayDateInputValue(),
    motivo: source.motivo || "",
    checklist: source.checklist ? String(source.checklist) : "",
    estado: source.estado || "PENDIENTE",
    respuestas_count: source.respuestas_count ?? 0,
  };
}

const cellInputClass =
  "w-full border-0 bg-transparent px-0 py-0 text-sm text-slate-700 outline-none placeholder:text-slate-400";

export default function ChecklistEjecucionTable({
  ejecuciones = [],
  checklists = [],
  loading = false,
  canManage = false,
  onChanged,
  onOpenRespuestas,
}) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(createDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const checklistOptions = useMemo(
    () =>
      [...checklists]
        .sort((left, right) =>
          String(left.motivo || "").localeCompare(String(right.motivo || ""))
        )
        .map((checklist) => ({
          id: checklist.id,
          label: checklist.motivo || `Checklist ${checklist.id}`,
          estado: checklist.estado_label || checklist.estado,
        })),
    [checklists]
  );

  const beginCreate = () => {
    setCreating(true);
    setEditingId(null);
    setDraft(createDraft());
    setError("");
  };

  const beginEdit = (ejecucion) => {
    setCreating(false);
    setEditingId(ejecucion.id);
    setDraft(createDraft(ejecucion));
    setError("");
  };

  const cancelEdit = () => {
    setCreating(false);
    setEditingId(null);
    setDraft(createDraft());
    setError("");
  };

  const handleDraftChange = (name, value) => {
    setDraft((current) => ({
      ...current,
      [name]: value,
    }));
    if (error) setError("");
  };

  const handleSave = async () => {
    if (!draft.checklist) {
      setError("Selecciona el checklist base para la ejecucion.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        fecha: draft.fecha,
        motivo: draft.motivo.trim(),
        checklist: Number(draft.checklist),
        estado: draft.estado,
      };

      if (creating) {
        await checklistEjecucionAPI.create(payload);
      } else if (editingId) {
        await checklistEjecucionAPI.patch(editingId, payload);
      }

      cancelEdit();
      await onChanged?.();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const renderEditableRow = (key) => {
    const disableChecklist =
      !creating && Number(draft.respuestas_count || 0) > 0;

    return (
      <tr key={key} className="bg-[#f8fbff] align-top">
        <td className="px-6 py-4">
          <input
            type="date"
            value={draft.fecha}
            onChange={(event) => handleDraftChange("fecha", event.target.value)}
            disabled={saving}
            className={cellInputClass}
          />
        </td>
        <td className="px-6 py-4">
          <input
            type="text"
            value={draft.motivo}
            onChange={(event) => handleDraftChange("motivo", event.target.value)}
            disabled={saving}
            placeholder="Motivo de la ejecucion"
            className={cellInputClass}
          />
        </td>
        <td className="px-6 py-4">
          <select
            value={draft.checklist}
            onChange={(event) => handleDraftChange("checklist", event.target.value)}
            disabled={saving || disableChecklist}
            className={cellInputClass}
          >
            <option value="">Selecciona un checklist</option>
            {checklistOptions.map((checklist) => (
              <option key={checklist.id} value={checklist.id}>
                {checklist.label}
              </option>
            ))}
          </select>
          {disableChecklist ? (
            <div className="mt-2 text-xs text-amber-700">
              No se puede cambiar el checklist cuando ya existen respuestas.
            </div>
          ) : null}
        </td>
        <td className="px-6 py-4">
          <select
            value={draft.estado}
            onChange={(event) => handleDraftChange("estado", event.target.value)}
            disabled={saving}
            className={cellInputClass}
          >
            <option value="PENDIENTE">Pendiente</option>
            <option value="EN_PROCESO">En proceso</option>
            <option value="COMPLETADO">Completado</option>
          </select>
        </td>
        <td className="px-6 py-4 text-sm text-slate-500">
          {creating ? "Se asigna al guardar" : "Sin cambios"}
        </td>
        <td className="px-6 py-4 text-sm text-slate-500">
          Guarda la fila para responder
        </td>
        <td className="px-6 py-4">
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Guardando" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X className="h-3.5 w-3.5" />
              Cancelar
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,35,70,0.08)]">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Checklist realizados
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Seguimiento de las ejecuciones registradas en la operacion.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            {ejecuciones.length} registros
          </span>
          {canManage ? (
            <button
              type="button"
              onClick={beginCreate}
              disabled={creating || editingId !== null}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#173569] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#0f2346] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-3.5 w-3.5" />
              Nuevo
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50/90">
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <th className="px-6 py-4">Fecha</th>
              <th className="px-6 py-4">Motivo</th>
              <th className="px-6 py-4">Checklist base</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Realizado por</th>
              <th className="px-6 py-4">Respuestas</th>
              <th className="px-6 py-4 text-right">Accion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {creating ? renderEditableRow("new-row") : null}

            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                  Cargando ejecuciones de checklist...
                </td>
              </tr>
            ) : null}

            {!loading && ejecuciones.length === 0 && !creating ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                  No hay checklist ejecutados registrados.
                </td>
              </tr>
            ) : null}

            {!loading
              ? ejecuciones.map((ejecucion) => {
                  const isEditing = editingId === ejecucion.id;
                  if (isEditing) {
                    return renderEditableRow(`edit-${ejecucion.id}`);
                  }

                  return (
                    <tr key={ejecucion.id} className="align-top transition hover:bg-slate-50/70">
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDisplayDate(ejecucion.fecha) || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {ejecucion.motivo || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-800">
                        {ejecucion.checklist_motivo || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <EstadoBadge
                          estado={ejecucion.estado}
                          label={ejecucion.estado_label}
                        />
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {ejecucion.realizado_por_username || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => onOpenRespuestas?.(ejecucion)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-[#173569]/12 bg-[#eef4ff] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#173569] transition hover:bg-[#e2edff]"
                        >
                          <SquareArrowOutUpRight className="h-3.5 w-3.5" />
                          {ejecucion.respuestas_count ?? 0} respuestas
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => beginEdit(ejecucion)}
                            disabled={creating || editingId !== null}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <FilePenLine className="h-3.5 w-3.5" />
                            Editar
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
