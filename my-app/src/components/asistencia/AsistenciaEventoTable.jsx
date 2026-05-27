"use client";

import { Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { asistenciaAPI } from "@/lib/api";

function getApiErrorMessage(error) {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const firstValue = Object.values(data)[0];
    if (Array.isArray(firstValue) && firstValue.length > 0) return String(firstValue[0]);
    if (typeof firstValue === "string") return firstValue;
  }
  return "No se pudo guardar la asistencia.";
}

export default function AsistenciaEventoTable({
  evento,
  trabajadores = [],
  asistencias = [],
  loading = false,
  canManage = false,
  onSaved,
}) {
  const [search, setSearch] = useState("");
  const [draftMap, setDraftMap] = useState({});
  const [touchedMap, setTouchedMap] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const asistenciaByTrabajador = useMemo(() => {
    const nextMap = new Map();
    asistencias.forEach((asistencia) => {
      nextMap.set(asistencia.trabajador, asistencia);
    });
    return nextMap;
  }, [asistencias]);

  const sortedTrabajadores = useMemo(
    () =>
      [...trabajadores].sort((left, right) =>
        `${left.apellidos || ""} ${left.nombres || ""}`.localeCompare(
          `${right.apellidos || ""} ${right.nombres || ""}`
        )
      ),
    [trabajadores]
  );

  useEffect(() => {
    const nextDraftMap = {};
    sortedTrabajadores.forEach((trabajador) => {
      const asistencia = asistenciaByTrabajador.get(trabajador.id);
      nextDraftMap[trabajador.id] = asistencia ? Boolean(asistencia.asistencia) : false;
    });
    setDraftMap(nextDraftMap);
    setTouchedMap({});
  }, [sortedTrabajadores, asistenciaByTrabajador]);

  const filteredTrabajadores = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return sortedTrabajadores;

    return sortedTrabajadores.filter((trabajador) =>
      [
        trabajador.nombres,
        trabajador.apellidos,
        trabajador.dni,
        trabajador.codigo_trabajador,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [search, sortedTrabajadores]);

  const isRowDirty = (trabajadorId) => {
    const asistencia = asistenciaByTrabajador.get(trabajadorId);
    const currentValue = Boolean(draftMap[trabajadorId]);
    const originalValue = asistencia ? Boolean(asistencia.asistencia) : false;

    if (asistencia) {
      return currentValue !== originalValue;
    }

    return Boolean(touchedMap[trabajadorId]);
  };

  const dirtyCount = sortedTrabajadores.reduce(
    (count, trabajador) => count + (isRowDirty(trabajador.id) ? 1 : 0),
    0
  );

  const presentCount = sortedTrabajadores.reduce(
    (count, trabajador) => count + (draftMap[trabajador.id] ? 1 : 0),
    0
  );

  const handleAttendanceChange = (trabajadorId, value) => {
    setDraftMap((current) => ({
      ...current,
      [trabajadorId]: value,
    }));
    setTouchedMap((current) => ({
      ...current,
      [trabajadorId]: true,
    }));
    if (error) setError("");
    if (successMessage) setSuccessMessage("");
  };

  const handleSave = async () => {
    if (!evento?.id) return;

    const pendingRequests = sortedTrabajadores
      .filter((trabajador) => isRowDirty(trabajador.id))
      .map((trabajador) => {
        const asistencia = asistenciaByTrabajador.get(trabajador.id);
        const payload = {
          trabajador: trabajador.id,
          evento: evento.id,
          asistencia: Boolean(draftMap[trabajador.id]),
        };

        return asistencia
          ? asistenciaAPI.patch(asistencia.id, payload)
          : asistenciaAPI.create(payload);
      });

    if (pendingRequests.length === 0) {
      setSuccessMessage("No hay cambios pendientes por guardar.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      await Promise.all(pendingRequests);
      setSuccessMessage("La lista de asistencia se guardo correctamente.");
      await onSaved?.();
    } catch (saveError) {
      setError(getApiErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,35,70,0.08)]">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Lista de asistencia</h2>
          <p className="mt-1 text-sm text-slate-500">
            Marca rapidamente quien asistio al evento y guarda toda la lista en un solo paso.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-2 text-sm text-slate-600">
            <span className="font-semibold text-slate-800">{presentCount}</span> asistentes
            confirmados de {sortedTrabajadores.length}
          </div>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar trabajador"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-[#173569]"
          />
          {canManage ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || dirtyCount === 0}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#173569] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(23,53,105,0.2)] transition hover:bg-[#0f2346] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? "Guardando..." : `Guardar${dirtyCount ? ` (${dirtyCount})` : ""}`}
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="border-b border-emerald-200 bg-emerald-50 px-6 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50/90">
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <th className="px-6 py-4">Trabajador</th>
              <th className="px-6 py-4">DNI</th>
              <th className="px-6 py-4 text-right">Asistencia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-sm text-slate-500">
                  Cargando lista de trabajadores...
                </td>
              </tr>
            ) : null}

            {!loading && filteredTrabajadores.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-sm text-slate-500">
                  No se encontraron trabajadores para mostrar en esta lista.
                </td>
              </tr>
            ) : null}

            {!loading
              ? filteredTrabajadores.map((trabajador) => {
                  const asistencia = Boolean(draftMap[trabajador.id]);
                  const hasRecord = asistenciaByTrabajador.has(trabajador.id);
                  const dirty = isRowDirty(trabajador.id);

                  return (
                    <tr key={trabajador.id} className="align-top transition hover:bg-slate-50/70">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-800">
                          {[trabajador.nombres, trabajador.apellidos].filter(Boolean).join(" ")}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {trabajador.codigo_trabajador || "Sin codigo"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {trabajador.dni || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-3">
                          {canManage ? (
                            <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                              <button
                                type="button"
                                onClick={() => handleAttendanceChange(trabajador.id, true)}
                                className={[
                                  "rounded-xl px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition",
                                  asistencia
                                    ? "bg-emerald-500 text-white shadow-[0_10px_20px_rgba(16,185,129,0.22)]"
                                    : "text-slate-600 hover:bg-white",
                                ].join(" ")}
                              >
                                Si
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAttendanceChange(trabajador.id, false)}
                                className={[
                                  "rounded-xl px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition",
                                  !asistencia
                                    ? "bg-slate-700 text-white shadow-[0_10px_20px_rgba(15,23,42,0.18)]"
                                    : "text-slate-600 hover:bg-white",
                                ].join(" ")}
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <span
                              className={[
                                "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                                asistencia
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-slate-50 text-slate-600",
                              ].join(" ")}
                            >
                              {asistencia ? "Asistio" : "No asistio"}
                            </span>
                          )}

                          <div className="w-24 text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                            {dirty ? "Pendiente" : hasRecord ? "Guardado" : "Sin marcar"}
                          </div>
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
