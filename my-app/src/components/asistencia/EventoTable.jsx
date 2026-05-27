"use client";

import { FilePenLine, Plus, Save, SquareArrowOutUpRight, X } from "lucide-react";
import { useState } from "react";
import { eventoAPI } from "@/lib/api";
import { formatDisplayDate, getTodayDateInputValue } from "@/lib/utils";

const cellInputClass =
  "w-full border-0 bg-transparent px-0 py-0 text-sm text-slate-700 outline-none placeholder:text-slate-400";

function getApiErrorMessage(error) {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const firstValue = Object.values(data)[0];
    if (Array.isArray(firstValue) && firstValue.length > 0) return String(firstValue[0]);
    if (typeof firstValue === "string") return firstValue;
  }
  return "No se pudo guardar el evento.";
}

function createDraft(source = {}) {
  return {
    id: source.id || null,
    fecha: source.fecha || getTodayDateInputValue(),
    nombre: source.nombre || "",
    clasificacion: source.clasificacion || "",
    estandarizacion: source.estandarizacion ? String(source.estandarizacion) : "",
  };
}

export default function EventoTable({
  eventos = [],
  estandarizaciones = [],
  loading = false,
  canManage = false,
  onChanged,
  onOpenList,
}) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(createDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const estandarizacionOptions = [...estandarizaciones]
    .sort((left, right) =>
      `${left.codigo || ""} ${left.nombre_tarea || ""}`.localeCompare(
        `${right.codigo || ""} ${right.nombre_tarea || ""}`
      )
    )
    .map((estandarizacion) => ({
      id: estandarizacion.id,
      label: [estandarizacion.codigo, estandarizacion.nombre_tarea]
        .filter(Boolean)
        .join(" - "),
    }));

  const beginCreate = () => {
    setCreating(true);
    setEditingId(null);
    setDraft(createDraft());
    setError("");
  };

  const beginEdit = (evento) => {
    setCreating(false);
    setEditingId(evento.id);
    setDraft(createDraft(evento));
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
    if (!draft.nombre.trim()) {
      setError("Escribe el nombre del evento.");
      return;
    }

    if (!draft.estandarizacion) {
      setError("Selecciona la tarea por estandarizar asociada.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        fecha: draft.fecha,
        nombre: draft.nombre.trim(),
        clasificacion: draft.clasificacion.trim(),
        estandarizacion: Number(draft.estandarizacion),
      };

      if (creating) {
        await eventoAPI.create(payload);
      } else if (editingId) {
        await eventoAPI.patch(editingId, payload);
      }

      cancelEdit();
      await onChanged?.();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const renderEditableRow = (key) => (
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
          value={draft.nombre}
          onChange={(event) => handleDraftChange("nombre", event.target.value)}
          disabled={saving}
          placeholder="Nombre del evento"
          className={cellInputClass}
        />
      </td>
      <td className="px-6 py-4">
        <input
          type="text"
          value={draft.clasificacion}
          onChange={(event) => handleDraftChange("clasificacion", event.target.value)}
          disabled={saving}
          placeholder="Clasificacion"
          className={cellInputClass}
        />
      </td>
      <td className="px-6 py-4">
        <select
          value={draft.estandarizacion}
          onChange={(event) => handleDraftChange("estandarizacion", event.target.value)}
          disabled={saving}
          className={cellInputClass}
        >
          <option value="">Selecciona una tarea</option>
          {estandarizacionOptions.map((estandarizacion) => (
            <option key={estandarizacion.id} value={estandarizacion.id}>
              {estandarizacion.label}
            </option>
          ))}
        </select>
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

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,35,70,0.08)]">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Eventos</h2>
          <p className="mt-1 text-sm text-slate-500">
            Registra capacitaciones, reuniones o hitos vinculados a una tarea estandarizada.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            {eventos.length} registros
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
              <th className="px-6 py-4">Evento</th>
              <th className="px-6 py-4">Clasificacion</th>
              <th className="px-6 py-4">Tarea base</th>
              <th className="px-6 py-4 text-right">Accion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {creating ? renderEditableRow("new-row") : null}

            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                  Cargando eventos...
                </td>
              </tr>
            ) : null}

            {!loading && eventos.length === 0 && !creating ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                  No hay eventos registrados todavia.
                </td>
              </tr>
            ) : null}

            {!loading
              ? eventos.map((evento) => {
                  const isEditing = editingId === evento.id;
                  if (isEditing) {
                    return renderEditableRow(`edit-${evento.id}`);
                  }

                  return (
                    <tr key={evento.id} className="align-top transition hover:bg-slate-50/70">
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDisplayDate(evento.fecha) || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-800">
                        {evento.nombre || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {evento.clasificacion || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {[evento.estandarizacion_codigo, evento.estandarizacion_nombre]
                          .filter(Boolean)
                          .join(" - ") || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenList?.(evento)}
                            className="inline-flex items-center gap-1.5 rounded-2xl border border-[#d6e4ff] bg-[#eef4ff] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#173569] transition hover:bg-[#e3eeff]"
                          >
                            <SquareArrowOutUpRight className="h-3.5 w-3.5" />
                            Ver lista
                          </button>
                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => beginEdit(evento)}
                              className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:bg-slate-50"
                            >
                              <FilePenLine className="h-3.5 w-3.5" />
                              Editar
                            </button>
                          ) : null}
                        </div>
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
