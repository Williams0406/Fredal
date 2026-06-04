"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Plus, RefreshCw, Save, Search, X } from "lucide-react";
import { gestionCambioAPI } from "@/lib/api";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

const ESTADOS = [
  { value: "SUGERIDO", label: "Sugerido", badge: "bg-slate-100 text-slate-700 border-slate-200" },
  { value: "APROBADO", label: "Aprobado", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "DESAPROBADO", label: "Desaprobado", badge: "bg-red-50 text-red-700 border-red-200" },
  { value: "EN_PROCESO", label: "En proceso", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "TERMINADO", label: "Terminado", badge: "bg-lime-50 text-lime-700 border-lime-200" },
];

const ESTADO_BY_VALUE = ESTADOS.reduce((acc, estado) => {
  acc[estado.value] = estado;
  return acc;
}, {});

const normalizeCollection = (value) => {
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.results)) return value.data.results;
  if (Array.isArray(value)) return value;
  return [];
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

export default function GestionCambioPage() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingNew, setSavingNew] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [newRow, setNewRow] = useState({
    implementacion: "",
    estado: "SUGERIDO",
    observacion: "",
  });
  const [drafts, setDrafts] = useState({});

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const response = await gestionCambioAPI.list();
      const data = normalizeCollection(response);
      setRegistros(data);
      setDrafts((current) => {
        const next = {};
        data.forEach((registro) => {
          next[registro.id] = current[registro.id] || {
            estado: registro.estado || "SUGERIDO",
            observacion: registro.observacion || "",
          };
        });
        return next;
      });
      setError("");
    } catch (loadError) {
      console.error("Error cargando gestion de cambio:", loadError);
      setError("No se pudo cargar la gestión de cambio.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useAutoRefresh(
    () => loadData({ silent: true }),
    5000,
    !savingNew && !savingId
  );

  const filteredRegistros = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return registros;
    return registros.filter((registro) =>
      [
        registro.implementacion,
        registro.estado_label,
        registro.estado,
        registro.observacion,
        registro.iperc_label,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [registros, search]);

  const stats = useMemo(
    () =>
      ESTADOS.map((estado) => ({
        ...estado,
        count: registros.filter((registro) => registro.estado === estado.value).length,
      })),
    [registros]
  );

  const handleCreate = async () => {
    const implementacion = newRow.implementacion.trim();
    if (!implementacion || savingNew) return;

    setSavingNew(true);
    try {
      const response = await gestionCambioAPI.create({
        implementacion,
        estado: "SUGERIDO",
        observacion: newRow.observacion.trim(),
      });
      const created = response.data;
      setRegistros((current) => [created, ...current]);
      setDrafts((current) => ({
        ...current,
        [created.id]: {
          estado: created.estado || "SUGERIDO",
          observacion: created.observacion || "",
        },
      }));
      setNewRow({ implementacion: "", estado: "SUGERIDO", observacion: "" });
      setError("");
    } catch (createError) {
      console.error("Error creando gestion de cambio:", createError);
      setError(
        createError?.response?.data?.implementacion?.[0] ||
          createError?.response?.data?.detail ||
          "No se pudo registrar la gestión de cambio."
      );
    } finally {
      setSavingNew(false);
    }
  };

  const handleDraftChange = (id, field, value) => {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...(current[id] || {}),
        [field]: value,
      },
    }));
  };

  const hasChanges = (registro) => {
    const draft = drafts[registro.id];
    if (!draft) return false;
    return (
      draft.estado !== registro.estado ||
      (draft.observacion || "") !== (registro.observacion || "")
    );
  };

  const handleSave = async (registro) => {
    const draft = drafts[registro.id];
    if (!draft || savingId) return;

    setSavingId(registro.id);
    try {
      const response = await gestionCambioAPI.patch(registro.id, {
        estado: draft.estado || "SUGERIDO",
        observacion: draft.observacion || "",
      });
      const updated = response.data;
      setRegistros((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      setDrafts((current) => ({
        ...current,
        [updated.id]: {
          estado: updated.estado || "SUGERIDO",
          observacion: updated.observacion || "",
        },
      }));
      setError("");
    } catch (saveError) {
      console.error("Error actualizando gestion de cambio:", saveError);
      setError("No se pudo actualizar el registro.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1e3a8a]">
              Gestión Cambio
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">
              Registro de cambios sugeridos
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Controla implementaciones, aprobación y seguimiento de cambios.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {stats.map((stat) => (
              <div
                key={stat.value}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center"
              >
                <div className="text-lg font-bold text-slate-900">{stat.count}</div>
                <div className="text-[11px] font-semibold uppercase text-slate-500">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar implementación, estado u observación"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
            />
          </label>
          <button
            type="button"
            onClick={() => loadData()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="min-w-[340px] px-4 py-3">Implementación</th>
                <th className="px-4 py-3">Estado</th>
                <th className="min-w-[260px] px-4 py-3">Observación</th>
                <th className="px-4 py-3">IPERC</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="bg-[#f8fbff]">
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">Nuevo</td>
                <td className="px-4 py-3">
                  <textarea
                    value={newRow.implementacion}
                    onChange={(event) =>
                      setNewRow((current) => ({
                        ...current,
                        implementacion: event.target.value,
                      }))
                    }
                    placeholder="Describe la implementación propuesta"
                    rows={2}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                  />
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    Sugerido
                  </span>
                </td>
                <td className="px-4 py-3">
                  <input
                    value={newRow.observacion}
                    onChange={(event) =>
                      setNewRow((current) => ({
                        ...current,
                        observacion: event.target.value,
                      }))
                    }
                    placeholder="Observación opcional"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                  />
                </td>
                <td className="px-4 py-3 text-slate-400">Sin IPERC</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={!newRow.implementacion.trim() || savingNew}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1e3a8a] px-4 text-sm font-semibold text-white transition hover:bg-[#173569] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Plus className="h-4 w-4" />
                    {savingNew ? "Registrando..." : "Registrar"}
                  </button>
                </td>
              </tr>

              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    Cargando registros...
                  </td>
                </tr>
              ) : filteredRegistros.length ? (
                filteredRegistros.map((registro) => {
                  const draft = drafts[registro.id] || {
                    estado: registro.estado || "SUGERIDO",
                    observacion: registro.observacion || "",
                  };
                  const estado = ESTADO_BY_VALUE[registro.estado] || ESTADO_BY_VALUE.SUGERIDO;
                  const changed = hasChanges(registro);

                  return (
                    <tr key={registro.id} className="align-top hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-4 py-4 text-slate-500">
                        {formatDate(registro.created_at)}
                      </td>
                      <td className="px-4 py-4 text-slate-800">
                        <div className="max-w-xl whitespace-pre-wrap leading-6">
                          {registro.implementacion}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <span
                            className={[
                              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
                              estado.badge,
                            ].join(" ")}
                          >
                            {estado.label}
                          </span>
                          <select
                            value={draft.estado}
                            onChange={(event) =>
                              handleDraftChange(registro.id, "estado", event.target.value)
                            }
                            className="block h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                          >
                            {ESTADOS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <textarea
                          value={draft.observacion}
                          onChange={(event) =>
                            handleDraftChange(registro.id, "observacion", event.target.value)
                          }
                          rows={2}
                          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                        />
                      </td>
                      <td className="px-4 py-4 text-slate-500">
                        {registro.iperc_label || "Sin IPERC"}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {changed ? (
                          <button
                            type="button"
                            onClick={() => handleSave(registro)}
                            disabled={savingId === registro.id}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#84cc16] px-3 text-sm font-semibold text-white transition hover:bg-[#76b914] disabled:opacity-60"
                          >
                            <Save className="h-4 w-4" />
                            {savingId === registro.id ? "Guardando..." : "Guardar"}
                          </button>
                        ) : (
                          <span className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-400">
                            <Check className="h-4 w-4" />
                            Sin cambios
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <X className="h-5 w-5" />
                      No hay registros de gestión de cambio.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
