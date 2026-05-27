"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { checklistRespuestaAPI } from "@/lib/api";

function getApiErrorMessage(error) {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const firstValue = Object.values(data)[0];
    if (Array.isArray(firstValue) && firstValue.length > 0) return String(firstValue[0]);
    if (typeof firstValue === "string") return firstValue;
  }
  return "No se pudieron guardar las respuestas.";
}

function createResponseDraft(actividad, respuesta) {
  return {
    checklistActividadId: actividad.id,
    actividad: actividad,
    respuestaId: respuesta?.id || null,
    vb: Boolean(respuesta?.vb),
    valor_texto: respuesta?.valor_texto || "",
    valor_numero:
      respuesta?.valor_numero !== null && respuesta?.valor_numero !== undefined
        ? String(respuesta.valor_numero)
        : "",
    valor_booleano:
      typeof respuesta?.valor_booleano === "boolean"
        ? respuesta.valor_booleano
          ? "SI"
          : "NO"
        : "",
    valor_opcion: respuesta?.valor_opcion || "",
    observacion: respuesta?.observacion || "",
  };
}

function getDisplaySistemaName(actividad) {
  return actividad?.sistema_detalle?.nombre || "Sin sistema";
}

function buildRespuestaPayload(ejecucionId, row) {
  const tipo = row?.actividad?.actividad_detalle?.tipo_respuesta;
  const payload = {
    ejecucion: ejecucionId,
    checklist_actividad: row.checklistActividadId,
    vb: Boolean(row.vb),
    observacion: row.observacion.trim(),
    valor_texto: "",
    valor_numero: null,
    valor_booleano: null,
    valor_opcion: "",
  };

  if (tipo === "NUMERO") {
    payload.valor_numero = row.valor_numero === "" ? null : row.valor_numero;
  } else if (tipo === "BOOLEANO") {
    payload.valor_booleano =
      row.valor_booleano === "SI"
        ? true
        : row.valor_booleano === "NO"
          ? false
          : null;
  } else if (tipo === "OPCION") {
    payload.valor_opcion = row.valor_opcion.trim();
  } else {
    payload.valor_texto = row.valor_texto.trim();
  }

  return payload;
}

function RespuestaField({ row, disabled, onChange }) {
  const tipo = row?.actividad?.actividad_detalle?.tipo_respuesta;

  if (tipo === "NUMERO") {
    return (
      <input
        type="number"
        step="0.01"
        value={row.valor_numero}
        onChange={(event) => onChange("valor_numero", event.target.value)}
        disabled={disabled}
        placeholder="Numero"
        className="w-full border-0 bg-transparent px-0 py-0 text-sm text-slate-700 outline-none placeholder:text-slate-400"
      />
    );
  }

  if (tipo === "BOOLEANO") {
    return (
      <select
        value={row.valor_booleano}
        onChange={(event) => onChange("valor_booleano", event.target.value)}
        disabled={disabled}
        className="w-full border-0 bg-transparent px-0 py-0 text-sm text-slate-700 outline-none"
      >
        <option value="">Selecciona</option>
        <option value="SI">Si</option>
        <option value="NO">No</option>
      </select>
    );
  }

  if (tipo === "OPCION") {
    return (
      <input
        type="text"
        value={row.valor_opcion}
        onChange={(event) => onChange("valor_opcion", event.target.value)}
        disabled={disabled}
        placeholder="Opcion"
        className="w-full border-0 bg-transparent px-0 py-0 text-sm text-slate-700 outline-none placeholder:text-slate-400"
      />
    );
  }

  return (
    <input
      type="text"
      value={row.valor_texto}
      onChange={(event) => onChange("valor_texto", event.target.value)}
      disabled={disabled}
      placeholder="Respuesta"
      className="w-full border-0 bg-transparent px-0 py-0 text-sm text-slate-700 outline-none placeholder:text-slate-400"
    />
  );
}

export default function ChecklistRespuestaEditorTable({
  ejecucion,
  actividades = [],
  respuestas = [],
  canManage = false,
  onSaved,
}) {
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const groupedRows = useMemo(() => {
    const groups = new Map();

    rows.forEach((row) => {
      const key = getDisplaySistemaName(row.actividad);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });

    return Array.from(groups.entries());
  }, [rows]);

  useEffect(() => {
    const respuestasPorActividad = new Map(
      respuestas.map((respuesta) => [respuesta.checklist_actividad, respuesta])
    );

    const nextRows = actividades
      .slice()
      .sort((left, right) => (left?.orden || 0) - (right?.orden || 0))
      .map((actividad) =>
        createResponseDraft(actividad, respuestasPorActividad.get(actividad.id))
      );

    setRows(nextRows);
    setError("");
    setSuccessMessage("");
  }, [actividades, respuestas]);

  const updateRow = (checklistActividadId, field, value) => {
    setRows((current) =>
      current.map((row) =>
        row.checklistActividadId === checklistActividadId
          ? { ...row, [field]: value }
          : row
      )
    );
    if (error) setError("");
    if (successMessage) setSuccessMessage("");
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      for (const row of rows) {
        const payload = buildRespuestaPayload(ejecucion.id, row);
        if (row.respuestaId) {
          await checklistRespuestaAPI.patch(row.respuestaId, payload);
        } else {
          const hasContent =
            payload.vb ||
            payload.valor_texto ||
            payload.valor_opcion ||
            payload.valor_numero !== null ||
            payload.valor_booleano !== null ||
            payload.observacion;

          if (!hasContent) {
            continue;
          }

          const response = await checklistRespuestaAPI.create(payload);
          row.respuestaId = response?.data?.id || row.respuestaId;
        }
      }

      setSuccessMessage("Las respuestas del checklist se guardaron correctamente.");
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
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Respuestas por actividad
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Las actividades se agrupan por sistema para que el registro siga el
          mismo orden operativo del checklist.
        </p>
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
                  <th className="w-24 px-4 py-4">VB</th>
                  <th className="px-4 py-4">Actividad</th>
                  <th className="px-4 py-4">Respuesta</th>
                  <th className="px-4 py-4">Observacion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {groupedRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-500">
                      Este checklist no tiene actividades relacionadas.
                    </td>
                  </tr>
                ) : null}

                {groupedRows.map(([sistema, groupRows]) => (
                  <FragmentGroup key={sistema}>
                    <tr className="bg-[#f7faff]">
                      <td colSpan={4} className="px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-[#173569]">
                        {sistema}
                      </td>
                    </tr>

                    {groupRows.map((row) => (
                      <tr key={row.checklistActividadId} className="align-top">
                        <td className="px-4 py-4">
                          <label className="inline-flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={Boolean(row.vb)}
                              onChange={(event) =>
                                updateRow(
                                  row.checklistActividadId,
                                  "vb",
                                  event.target.checked
                                )
                              }
                              disabled={!canManage || saving}
                              className="h-4 w-4 rounded border-slate-300 text-[#173569] focus:ring-[#173569]"
                            />
                          </label>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-800">
                          {row.actividad?.actividad_detalle?.descripcion || "-"}
                        </td>
                        <td className="px-4 py-4">
                          <RespuestaField
                            row={row}
                            disabled={!canManage || saving}
                            onChange={(field, value) =>
                              updateRow(row.checklistActividadId, field, value)
                            }
                          />
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="text"
                            value={row.observacion}
                            onChange={(event) =>
                              updateRow(
                                row.checklistActividadId,
                                "observacion",
                                event.target.value
                              )
                            }
                            disabled={!canManage || saving}
                            placeholder="Observacion"
                            className="w-full border-0 bg-transparent px-0 py-0 text-sm text-slate-700 outline-none placeholder:text-slate-400"
                          />
                        </td>
                      </tr>
                    ))}
                  </FragmentGroup>
                ))}
              </tbody>
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
              {saving ? "Guardando..." : "Guardar respuestas"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FragmentGroup({ children }) {
  return <>{children}</>;
}
