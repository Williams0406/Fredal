"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, FileText, Plus, RefreshCw, Save, Search, Upload, X } from "lucide-react";
import { gestionCambioAPI } from "@/lib/api";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useAuth } from "@/context/AuthContext";

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

const MONEDAS = [
  { value: "PEN", label: "Soles", symbol: "S/" },
  { value: "USD", label: "Dólares", symbol: "US$" },
];

const MONEDA_BY_VALUE = MONEDAS.reduce((acc, moneda) => {
  acc[moneda.value] = moneda;
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

const getEmptyNewRow = () => ({
  codigo: "",
  implementacion: "",
  estado: "SUGERIDO",
  costo: "",
  moneda: "PEN",
  doc: null,
  volvo: false,
  observacion: "",
});

const getDraftFromRegistro = (registro) => ({
  codigo: registro.codigo || "",
  implementacion: registro.implementacion || "",
  estado: registro.estado || "SUGERIDO",
  costo: registro.costo ?? "",
  moneda: registro.moneda || "PEN",
  doc: null,
  docEliminar: false,
  volvo: Boolean(registro.volvo),
  observacion: registro.observacion || "",
});

const appendGestionCambioPayload = (formData, data, { includeDoc = true, includeEstado = true } = {}) => {
  formData.append("codigo", data.codigo?.trim?.() || "");
  formData.append("implementacion", data.implementacion?.trim?.() || "");
  if (includeEstado) {
    formData.append("estado", data.estado || "SUGERIDO");
  }
  formData.append("costo", data.costo === "" || data.costo == null ? "" : String(data.costo));
  formData.append("moneda", data.moneda || "PEN");
  formData.append("volvo", data.volvo ? "true" : "false");
  formData.append("observacion", data.observacion?.trim?.() || "");
  if (includeDoc && data.doc) {
    formData.append("doc", data.doc);
  }
  if (data.docEliminar) {
    formData.append("doc_eliminar", "true");
  }
  return formData;
};

const formatMoney = (value, moneda = "PEN") => {
  if (value === "" || value == null || Number.isNaN(Number(value))) return "-";
  const config = MONEDA_BY_VALUE[moneda] || MONEDA_BY_VALUE.PEN;
  return `${config.symbol} ${Number(value).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export default function GestionCambioPage() {
  const { user, roles = [] } = useAuth();
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingNew, setSavingNew] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    fecha: "",
    codigo: "",
    estado: "",
    costo: "",
    volvo: "",
    iperc: "",
  });
  const [showNewRow, setShowNewRow] = useState(false);
  const [newRow, setNewRow] = useState(getEmptyNewRow);
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
          next[registro.id] = current[registro.id] || getDraftFromRegistro(registro);
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
    const fecha = filters.fecha;
    const codigo = filters.codigo.trim().toLowerCase();
    const estado = filters.estado;
    const costo = filters.costo.trim();
    const volvo = filters.volvo;
    const iperc = filters.iperc.trim().toLowerCase();

    return registros.filter((registro) => {
      const registroFecha = registro.created_at ? String(registro.created_at).slice(0, 10) : "";
      const registroCodigo = String(registro.codigo || "").toLowerCase();
      const registroCosto = String(registro.costo ?? "");
      const registroIperc = String(registro.iperc_label || "").toLowerCase();
      const registroVolvo = Boolean(registro.volvo);
      const searchable = [
        registro.implementacion,
        registro.codigo,
        registro.estado_label,
        registro.estado,
        registro.costo,
        registro.moneda,
        registro.doc_nombre,
        registro.observacion,
        registro.iperc_label,
        registro.volvo ? "volvo" : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!term || searchable.includes(term)) &&
        (!fecha || registroFecha === fecha) &&
        (!codigo || registroCodigo.includes(codigo)) &&
        (!estado || registro.estado === estado) &&
        (!costo || registroCosto.includes(costo)) &&
        (!volvo || (volvo === "SI" ? registroVolvo : !registroVolvo)) &&
        (!iperc || registroIperc.includes(iperc))
      );
    });
  }, [registros, search, filters]);

  const stats = useMemo(
    () =>
      ESTADOS.map((estado) => ({
        ...estado,
        count: registros.filter((registro) => registro.estado === estado.value).length,
      })),
    [registros]
  );

  const isAdmin = roles.includes("admin");

  const canEditRegistro = (registro) =>
    Boolean(registro.can_edit) ||
    isAdmin ||
    (registro.creado_por && user?.id && Number(registro.creado_por) === Number(user.id));

  const canEditEstado = (registro) => Boolean(registro.can_edit_estado) || isAdmin;

  const handleCreate = async () => {
    const implementacion = newRow.implementacion.trim();
    if (!implementacion || savingNew) return;

    setSavingNew(true);
    try {
      const payload = appendGestionCambioPayload(new FormData(), {
        ...newRow,
        implementacion,
        estado: "SUGERIDO",
      });
      const response = await gestionCambioAPI.create(payload, true);
      const created = response.data;
      setRegistros((current) => [created, ...current]);
      setDrafts((current) => ({
        ...current,
        [created.id]: getDraftFromRegistro(created),
      }));
      setNewRow(getEmptyNewRow());
      setShowNewRow(false);
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
      (draft.codigo || "") !== (registro.codigo || "") ||
      (draft.implementacion || "") !== (registro.implementacion || "") ||
      draft.estado !== registro.estado ||
      String(draft.costo ?? "") !== String(registro.costo ?? "") ||
      (draft.moneda || "PEN") !== (registro.moneda || "PEN") ||
      Boolean(draft.volvo) !== Boolean(registro.volvo) ||
      Boolean(draft.doc) ||
      Boolean(draft.docEliminar) ||
      (draft.observacion || "") !== (registro.observacion || "")
    );
  };

  const handleSave = async (registro) => {
    const draft = drafts[registro.id];
    if (!draft || savingId) return;
    const canEdit = canEditRegistro(registro);
    const canEditState = canEditEstado(registro);
    if (!canEdit) return;

    setSavingId(registro.id);
    try {
      const payload = appendGestionCambioPayload(new FormData(), {
        estado: canEditState ? draft.estado || "SUGERIDO" : registro.estado || "SUGERIDO",
        codigo: draft.codigo || "",
        implementacion: draft.implementacion || "",
        costo: draft.costo ?? "",
        moneda: draft.moneda || "PEN",
        doc: draft.doc || null,
        docEliminar: Boolean(draft.docEliminar),
        volvo: Boolean(draft.volvo),
        observacion: draft.observacion || "",
      }, { includeEstado: canEditState });
      const response = await gestionCambioAPI.patch(registro.id, payload, true);
      const updated = response.data;
      setRegistros((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      setDrafts((current) => ({
        ...current,
        [updated.id]: getDraftFromRegistro(updated),
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
              placeholder="Buscar código, implementación, estado, documento u observación"
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

        <div className="mt-3 grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <input
            type="date"
            value={filters.fecha}
            onChange={(event) => setFilters((current) => ({ ...current, fecha: event.target.value }))}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
          />
          <input
            value={filters.codigo}
            onChange={(event) => setFilters((current) => ({ ...current, codigo: event.target.value }))}
            placeholder="Código"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
          />
          <select
            value={filters.estado}
            onChange={(event) => setFilters((current) => ({ ...current, estado: event.target.value }))}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
          >
            <option value="">Estado</option>
            {ESTADOS.map((estado) => (
              <option key={estado.value} value={estado.value}>
                {estado.label}
              </option>
            ))}
          </select>
          <input
            value={filters.costo}
            onChange={(event) => setFilters((current) => ({ ...current, costo: event.target.value }))}
            placeholder="Costo"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
          />
          <select
            value={filters.volvo}
            onChange={(event) => setFilters((current) => ({ ...current, volvo: event.target.value }))}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
          >
            <option value="">Volvo</option>
            <option value="SI">Sí</option>
            <option value="NO">No</option>
          </select>
          <input
            value={filters.iperc}
            onChange={(event) => setFilters((current) => ({ ...current, iperc: event.target.value }))}
            placeholder="IPERC"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
          />
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1500px] border-collapse text-sm">
            <thead className="bg-slate-100 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="w-[112px] border border-slate-200 px-3 py-2">Fecha</th>
                <th className="w-[130px] border border-slate-200 px-3 py-2">Código</th>
                <th className="min-w-[320px] border border-slate-200 px-3 py-2">Implementación</th>
                <th className="w-[180px] border border-slate-200 px-3 py-2">Estado</th>
                <th className="w-[116px] border border-slate-200 px-3 py-2">Moneda</th>
                <th className="w-[130px] border border-slate-200 px-3 py-2">Costo</th>
                <th className="w-[220px] border border-slate-200 px-3 py-2">Doc</th>
                <th className="w-[88px] border border-slate-200 px-3 py-2 text-center">Volvo</th>
                <th className="min-w-[260px] border border-slate-200 px-3 py-2">Observación</th>
                <th className="w-[128px] border border-slate-200 px-3 py-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="border border-slate-200 px-4 py-10 text-center text-slate-500">
                    Cargando registros...
                  </td>
                </tr>
              ) : filteredRegistros.length ? (
                filteredRegistros.map((registro) => {
                  const draft = drafts[registro.id] || getDraftFromRegistro(registro);
                  const estadoDraft = ESTADO_BY_VALUE[draft.estado] || ESTADO_BY_VALUE.SUGERIDO;
                  const changed = hasChanges(registro);
                  const canEdit = canEditRegistro(registro);
                  const canEditState = canEditEstado(registro);

                  return (
                    <tr key={registro.id} className="align-middle transition hover:bg-slate-50">
                      <td className="whitespace-nowrap border border-slate-200 px-3 py-2 align-middle text-slate-500">
                        {formatDate(registro.created_at)}
                      </td>
                      <td className="border border-slate-200 p-0 align-middle">
                        <input
                          value={draft.codigo}
                          disabled={!canEdit}
                          onChange={(event) =>
                            handleDraftChange(registro.id, "codigo", event.target.value)
                          }
                          placeholder="GC-001"
                          className="h-12 w-full border-0 bg-transparent px-3 text-sm font-semibold text-slate-800 outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-[#1e3a8a]/20 disabled:text-slate-500"
                        />
                      </td>
                      <td className="border border-slate-200 p-0 align-middle">
                        <textarea
                          value={draft.implementacion}
                          disabled={!canEdit}
                          onChange={(event) =>
                            handleDraftChange(registro.id, "implementacion", event.target.value)
                          }
                          rows={1}
                          className="block min-h-12 w-full resize-y border-0 bg-transparent px-3 py-3 text-sm leading-5 text-slate-800 outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-[#1e3a8a]/20 disabled:resize-none disabled:text-slate-700"
                        />
                      </td>
                      <td className="border border-slate-200 p-0 align-middle">
                        <select
                          value={draft.estado}
                          disabled={!canEditState}
                          onChange={(event) =>
                            handleDraftChange(registro.id, "estado", event.target.value)
                          }
                          className={[
                            "h-12 w-full border-0 bg-transparent px-3 text-sm font-semibold outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-[#1e3a8a]/20 disabled:opacity-100",
                            estadoDraft.badge,
                          ].join(" ")}
                        >
                          {ESTADOS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border border-slate-200 p-0 align-middle">
                        <select
                          value={draft.moneda || "PEN"}
                          disabled={!canEdit}
                          onChange={(event) =>
                            handleDraftChange(registro.id, "moneda", event.target.value)
                          }
                          className="h-12 w-full border-0 bg-transparent px-3 text-sm font-semibold text-slate-700 outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-[#1e3a8a]/20 disabled:opacity-100"
                        >
                          {MONEDAS.map((moneda) => (
                            <option key={moneda.value} value={moneda.value}>
                              {moneda.value}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="border border-slate-200 p-0 align-middle">
                        {canEdit ? (
                          <div className="flex h-12 items-center">
                            <span className="shrink-0 pl-3 text-xs font-semibold text-slate-500">
                              {MONEDA_BY_VALUE[draft.moneda || "PEN"]?.symbol || "S/"}
                            </span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={draft.costo}
                              onChange={(event) =>
                                handleDraftChange(registro.id, "costo", event.target.value)
                              }
                              placeholder="0.00"
                              className="h-full min-w-0 flex-1 border-0 bg-transparent px-2 text-right text-sm font-medium text-slate-800 outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-[#1e3a8a]/20"
                            />
                          </div>
                        ) : (
                          <div className="flex h-12 items-center justify-end px-3 text-sm font-semibold text-slate-600">
                            {formatMoney(registro.costo, registro.moneda)}
                          </div>
                        )}
                      </td>
                      <td className="border border-slate-200 p-0 align-middle">
                        <div className="flex min-h-12 items-center gap-2 px-3">
                          <div className="min-w-0 flex-1">
                            {draft.docEliminar ? (
                              <span className="block truncate text-xs font-semibold text-red-600">
                                Se eliminará al guardar
                              </span>
                            ) : draft.doc ? (
                              <span className="block truncate text-xs font-semibold text-[#1e3a8a]">
                                {draft.doc.name}
                              </span>
                            ) : registro.doc ? (
                              <a
                                href={registro.doc}
                                target="_blank"
                                rel="noreferrer"
                                className="flex min-w-0 items-center gap-1 text-xs font-semibold text-[#1e3a8a] hover:underline"
                              >
                                <FileText className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{registro.doc_nombre || "Ver documento"}</span>
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400">Sin doc</span>
                            )}
                          </div>
                          {canEdit ? (
                            <>
                              {(registro.doc || draft.doc) && !draft.docEliminar ? (
                                <button
                                  type="button"
                                  onClick={() => handleDraftChange(registro.id, "docEliminar", true)}
                                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50"
                                  title="Eliminar documento"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              ) : null}
                              {draft.docEliminar ? (
                                <button
                                  type="button"
                                  onClick={() => handleDraftChange(registro.id, "docEliminar", false)}
                                  className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 px-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
                                >
                                  Deshacer
                                </button>
                              ) : null}
                              <label
                                htmlFor={`gestion-doc-${registro.id}`}
                                className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-[#1e3a8a]"
                                title="Adjuntar documento"
                              >
                                <Upload className="h-4 w-4" />
                              </label>
                              <input
                                id={`gestion-doc-${registro.id}`}
                                type="file"
                                className="hidden"
                                onChange={(event) =>
                                  setDrafts((current) => ({
                                    ...current,
                                    [registro.id]: {
                                      ...(current[registro.id] || {}),
                                      doc: event.target.files?.[0] || null,
                                      docEliminar: false,
                                    },
                                  }))
                                }
                              />
                            </>
                          ) : null}
                        </div>
                      </td>
                      <td className="border border-slate-200 p-0 text-center align-middle">
                        <label className="flex min-h-12 cursor-pointer items-center justify-center">
                          <input
                            type="checkbox"
                            checked={Boolean(draft.volvo)}
                            disabled={!canEdit}
                            onChange={(event) =>
                              handleDraftChange(registro.id, "volvo", event.target.checked)
                            }
                            className="h-4 w-4 rounded border-slate-300 text-[#1e3a8a] focus:ring-[#1e3a8a] disabled:opacity-60"
                          />
                        </label>
                      </td>
                      <td className="border border-slate-200 p-0 align-middle">
                        <textarea
                          value={draft.observacion}
                          disabled={!canEdit}
                          onChange={(event) =>
                            handleDraftChange(registro.id, "observacion", event.target.value)
                          }
                          rows={1}
                          className="block min-h-12 w-full resize-y border-0 bg-transparent px-3 py-3 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-inset focus:ring-[#1e3a8a]/20 disabled:resize-none disabled:text-slate-500"
                        />
                      </td>
                      <td className="border border-slate-200 px-2 py-2 align-middle text-right">
                        {!canEdit ? (
                          <span className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-400">
                            Solo lectura
                          </span>
                        ) : changed ? (
                          <button
                            type="button"
                            onClick={() => handleSave(registro)}
                            disabled={savingId === registro.id}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#1e3a8a] px-3 text-sm font-semibold text-white transition hover:bg-[#173569] disabled:opacity-60"
                          >
                            <Save className="h-4 w-4" />
                            {savingId === registro.id ? "Guardando..." : "Guardar"}
                          </button>
                        ) : (
                          <span className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-400">
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
                  <td colSpan={10} className="border border-slate-200 px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <X className="h-5 w-5" />
                      No hay registros de gestión de cambio.
                    </div>
                  </td>
                </tr>
              )}

              {showNewRow ? (
                <tr className="bg-[#f8fbff] align-top">
                  <td className="whitespace-nowrap border border-slate-200 px-3 py-2 text-slate-500">
                    Nuevo
                  </td>
                  <td className="border border-slate-200 p-0">
                    <input
                      value={newRow.codigo}
                      onChange={(event) =>
                        setNewRow((current) => ({
                          ...current,
                          codigo: event.target.value,
                        }))
                      }
                      placeholder="GC-001"
                      className="h-16 w-full border-0 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-inset focus:ring-[#1e3a8a]/20"
                    />
                  </td>
                  <td className="border border-slate-200 p-0">
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
                      autoFocus
                      className="block min-h-16 w-full resize-y border-0 bg-white px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-inset focus:ring-[#1e3a8a]/20"
                    />
                  </td>
                  <td className="border border-slate-200 p-0">
                    <div className="flex h-full min-h-16 items-center px-3 text-sm font-semibold text-slate-700">
                      Sugerido
                    </div>
                  </td>
                  <td className="border border-slate-200 p-0">
                    <select
                      value={newRow.moneda}
                      onChange={(event) =>
                        setNewRow((current) => ({
                          ...current,
                          moneda: event.target.value,
                        }))
                      }
                      className="h-16 w-full border-0 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-inset focus:ring-[#1e3a8a]/20"
                    >
                      {MONEDAS.map((moneda) => (
                        <option key={moneda.value} value={moneda.value}>
                          {moneda.value}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border border-slate-200 p-0">
                    <div className="flex h-16 items-center bg-white">
                      <span className="shrink-0 pl-3 text-xs font-semibold text-slate-500">
                        {MONEDA_BY_VALUE[newRow.moneda]?.symbol || "S/"}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newRow.costo}
                        onChange={(event) =>
                          setNewRow((current) => ({
                            ...current,
                            costo: event.target.value,
                          }))
                        }
                        placeholder="0.00"
                        className="h-full min-w-0 flex-1 border-0 bg-transparent px-2 text-right text-sm font-medium outline-none focus:ring-2 focus:ring-inset focus:ring-[#1e3a8a]/20"
                      />
                    </div>
                  </td>
                  <td className="border border-slate-200 p-0">
                    <div className="flex min-h-16 items-center gap-2 px-3">
                      <span className="min-w-0 flex-1 truncate text-xs text-slate-500">
                        {newRow.doc?.name || "Adjuntar cotización"}
                      </span>
                      <label
                        htmlFor="gestion-doc-new"
                        className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-[#1e3a8a]"
                        title="Adjuntar documento"
                      >
                        <Upload className="h-4 w-4" />
                      </label>
                      <input
                        id="gestion-doc-new"
                        type="file"
                        className="hidden"
                        onChange={(event) =>
                          setNewRow((current) => ({
                            ...current,
                            doc: event.target.files?.[0] || null,
                          }))
                        }
                      />
                    </div>
                  </td>
                  <td className="border border-slate-200 p-0 text-center">
                    <label className="flex min-h-16 cursor-pointer items-center justify-center">
                      <input
                        type="checkbox"
                        checked={Boolean(newRow.volvo)}
                        onChange={(event) =>
                          setNewRow((current) => ({
                            ...current,
                            volvo: event.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-300 text-[#1e3a8a] focus:ring-[#1e3a8a]"
                      />
                    </label>
                  </td>
                  <td className="border border-slate-200 p-0">
                    <input
                      value={newRow.observacion}
                      onChange={(event) =>
                        setNewRow((current) => ({
                          ...current,
                          observacion: event.target.value,
                        }))
                      }
                      placeholder="Observación opcional"
                      className="h-16 w-full border-0 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-inset focus:ring-[#1e3a8a]/20"
                    />
                  </td>
                  <td className="border border-slate-200 px-2 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewRow(false);
                          setNewRow(getEmptyNewRow());
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                        title="Cancelar"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCreate}
                        disabled={!newRow.implementacion.trim() || savingNew}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#1e3a8a] px-3 text-sm font-semibold text-white transition hover:bg-[#173569] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Plus className="h-4 w-4" />
                        {savingNew ? "Registrando..." : "Registrar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={10} className="border border-dashed border-slate-300 bg-slate-50 p-0">
                    <button
                      type="button"
                      onClick={() => setShowNewRow(true)}
                      className="flex h-12 w-full items-center justify-center gap-2 text-sm font-semibold text-[#1e3a8a] transition hover:bg-blue-50"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar nuevo registro
                    </button>
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
