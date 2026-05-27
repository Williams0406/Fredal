"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ClipboardCheck, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import ChecklistRespuestaEditorTable from "@/components/checklist/ChecklistRespuestaEditorTable";
import {
  checklistAPI,
  checklistEjecucionAPI,
  checklistRespuestaAPI,
  maquinariaAPI,
  ubicacionClienteAPI,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatDisplayDate } from "@/lib/utils";

const MANAGER_ROLES = [
  "admin",
  "Jefe de Tecnicos",
  "Jefe de Almaceneros",
  "Jefe de Mantenimiento",
  "ManageCompras",
];

const inputClassName =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#173569] focus:ring-2 focus:ring-[#EAF1FF]";

function normalizeCollection(response) {
  const payload = response?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function getErrorMessage(error) {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const firstValue = Object.values(data)[0];
    if (Array.isArray(firstValue) && firstValue.length > 0) return String(firstValue[0]);
    if (typeof firstValue === "string") return firstValue;
  }
  return "No se pudo cargar el detalle del checklist.";
}

function getSaveErrorMessage(error) {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const firstValue = Object.values(data)[0];
    if (Array.isArray(firstValue) && firstValue.length > 0) return String(firstValue[0]);
    if (typeof firstValue === "string") return firstValue;
  }
  return "No se pudieron guardar los datos de la ejecucion.";
}

function createFormState(ejecucion = null) {
  return {
    motivo: ejecucion?.motivo || "",
    estado: ejecucion?.estado || "PENDIENTE",
    maquinaria: ejecucion?.maquinaria ? String(ejecucion.maquinaria) : "",
    lugar: ejecucion?.lugar ? String(ejecucion.lugar) : "",
    horometro:
      ejecucion?.horometro !== null && ejecucion?.horometro !== undefined
        ? String(ejecucion.horometro)
        : "",
    fecha_inicio: ejecucion?.fecha_inicio || ejecucion?.fecha || "",
    fecha_fin: ejecucion?.fecha_fin || "",
    hora_inicio: ejecucion?.hora_inicio || "",
    hora_fin: ejecucion?.hora_fin || "",
  };
}

export default function ChecklistEjecucionDetailView({
  ejecucionId,
  backPath = "/checklist",
}) {
  const router = useRouter();
  const { roles = [] } = useAuth();
  const [ejecucion, setEjecucion] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const [respuestas, setRespuestas] = useState([]);
  const [maquinarias, setMaquinarias] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [form, setForm] = useState(createFormState());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const canManage = useMemo(
    () => roles.some((role) => MANAGER_ROLES.includes(role)),
    [roles]
  );

  const loadData = async () => {
    if (!ejecucionId) return;

    setLoading(true);
    setError("");

    try {
      const ejecucionResponse = await checklistEjecucionAPI.retrieve(ejecucionId);
      const ejecucionData = ejecucionResponse?.data || null;
      setEjecucion(ejecucionData);
      setForm(createFormState(ejecucionData));

      const [checklistResponse, respuestasResponse, maquinariasResponse, ubicacionesResponse] =
        await Promise.all([
          checklistAPI.retrieve(ejecucionData.checklist),
          checklistRespuestaAPI.list({ ejecucion: ejecucionId }),
          maquinariaAPI.list(),
          ubicacionClienteAPI.list(),
        ]);

      setChecklist(checklistResponse?.data || null);
      setRespuestas(normalizeCollection(respuestasResponse));
      setMaquinarias(normalizeCollection(maquinariasResponse));
      setUbicaciones(normalizeCollection(ubicacionesResponse));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [ejecucionId]);

  const handleFormChange = (name, value) => {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
    if (error) setError("");
    if (saveMessage) setSaveMessage("");
  };

  const handleSave = async () => {
    if (!ejecucion?.id) return;

    setSaving(true);
    setError("");
    setSaveMessage("");

    try {
      await checklistEjecucionAPI.patch(ejecucion.id, {
        motivo: form.motivo.trim(),
        estado: form.estado,
        maquinaria: form.maquinaria ? Number(form.maquinaria) : null,
        lugar: form.lugar ? Number(form.lugar) : null,
        horometro: form.horometro === "" ? null : form.horometro,
        fecha_inicio: form.fecha_inicio || null,
        fecha_fin: form.fecha_fin || null,
        hora_inicio: form.hora_inicio || null,
        hora_fin: form.hora_fin || null,
      });
      setSaveMessage("Los datos de la ejecucion se guardaron correctamente.");
      await loadData();
    } catch (saveError) {
      setError(getSaveErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,35,70,0.08)]">
        <div className="relative overflow-hidden px-6 py-7 md:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,35,70,0.06),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(143,191,47,0.16),transparent_30%),linear-gradient(135deg,#ffffff_0%,#f7fafc_100%)]" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <button
                type="button"
                onClick={() => router.push(backPath)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:bg-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver a checklist
              </button>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#d6e4ff] bg-[#eef4ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#173569]">
                <ClipboardCheck className="h-3.5 w-3.5" />
                Ejecucion de checklist
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
                {ejecucion?.codigo || "Detalle de ejecucion"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Completa la cabecera operativa y registra el visto bueno y las respuestas
                de cada actividad en una sola vista.
              </p>
            </div>

            {ejecucion ? (
              <div className="grid gap-3 rounded-[26px] border border-slate-200 bg-white/85 p-4 shadow-[0_18px_34px_rgba(15,35,70,0.06)] sm:grid-cols-2">
                <InfoPill label="Checklist base" value={ejecucion.checklist_motivo || "-"} />
                <InfoPill label="Estado" value={ejecucion.estado_label || "-"} />
                <InfoPill label="Codigo" value={ejecucion.codigo || "-"} />
                <InfoPill
                  label="Fecha de registro"
                  value={formatDisplayDate(ejecucion.fecha) || "-"}
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {saveMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {saveMessage}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500 shadow-[0_20px_50px_rgba(15,35,70,0.06)]">
          Cargando detalle del checklist...
        </div>
      ) : null}

      {!loading && ejecucion ? (
        <>
          <section className="rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,35,70,0.08)]">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                    Datos de la ejecucion
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Ajusta la maquinaria, el lugar, las fechas y los tiempos antes de
                    responder el checklist.
                  </p>
                </div>
                {canManage ? (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#173569] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(23,53,105,0.18)] transition hover:bg-[#0f2346] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Guardando..." : "Guardar datos"}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-5 px-6 py-5 md:grid-cols-2 xl:grid-cols-4">
              <ReadOnlyField label="Codigo" value={ejecucion.codigo || "-"} />
              <ReadOnlyField label="Checklist base" value={ejecucion.checklist_motivo || "-"} />

              <EditableField
                label="Motivo"
                canManage={canManage}
                value={form.motivo}
                onChange={(value) => handleFormChange("motivo", value)}
                input={
                  <input
                    type="text"
                    value={form.motivo}
                    onChange={(event) => handleFormChange("motivo", event.target.value)}
                    disabled={!canManage || saving}
                    className={inputClassName}
                  />
                }
              />

              <EditableField
                label="Estado"
                canManage={canManage}
                value={ejecucion.estado_label || "-"}
                onChange={null}
                input={
                  <select
                    value={form.estado}
                    onChange={(event) => handleFormChange("estado", event.target.value)}
                    disabled={!canManage || saving}
                    className={inputClassName}
                  >
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="EN_PROCESO">En proceso</option>
                    <option value="COMPLETADO">Completado</option>
                  </select>
                }
              />

              <EditableField
                label="Maquinaria"
                canManage={canManage}
                value={ejecucion.maquinaria_nombre || "-"}
                onChange={null}
                input={
                  <select
                    value={form.maquinaria}
                    onChange={(event) => handleFormChange("maquinaria", event.target.value)}
                    disabled={!canManage || saving}
                    className={inputClassName}
                  >
                    <option value="">Selecciona maquinaria</option>
                    {maquinarias.map((maquinaria) => (
                      <option key={maquinaria.id} value={maquinaria.id}>
                        {[maquinaria.codigo_maquina, maquinaria.nombre].filter(Boolean).join(" - ")}
                      </option>
                    ))}
                  </select>
                }
              />

              <EditableField
                label="Lugar"
                canManage={canManage}
                value={ejecucion.lugar_nombre || "-"}
                onChange={null}
                input={
                  <select
                    value={form.lugar}
                    onChange={(event) => handleFormChange("lugar", event.target.value)}
                    disabled={!canManage || saving}
                    className={inputClassName}
                  >
                    <option value="">Sin lugar especifico</option>
                    {ubicaciones.map((ubicacion) => (
                      <option key={ubicacion.id} value={ubicacion.id}>
                        [ubicacion.cliente_nombre, ubicacion.nombre].filter(Boolean).join(" - ")
                      </option>
                    ))}
                  </select>
                }
              />

              <EditableField
                label="Horometro"
                canManage={canManage}
                value={
                  ejecucion.horometro !== null && ejecucion.horometro !== undefined
                    ? String(ejecucion.horometro)
                    : "-"
                }
                onChange={null}
                input={
                  <input
                    type="number"
                    step="0.01"
                    value={form.horometro}
                    onChange={(event) => handleFormChange("horometro", event.target.value)}
                    disabled={!canManage || saving}
                    className={inputClassName}
                  />
                }
              />

              <EditableField
                label="Fecha inicio"
                canManage={canManage}
                value={formatDisplayDate(ejecucion.fecha_inicio) || "-"}
                onChange={null}
                input={
                  <input
                    type="date"
                    value={form.fecha_inicio}
                    onChange={(event) => handleFormChange("fecha_inicio", event.target.value)}
                    disabled={!canManage || saving}
                    className={inputClassName}
                  />
                }
              />

              <EditableField
                label="Fecha fin"
                canManage={canManage}
                value={formatDisplayDate(ejecucion.fecha_fin) || "-"}
                onChange={null}
                input={
                  <input
                    type="date"
                    value={form.fecha_fin}
                    onChange={(event) => handleFormChange("fecha_fin", event.target.value)}
                    disabled={!canManage || saving}
                    className={inputClassName}
                  />
                }
              />

              <EditableField
                label="Hora inicio"
                canManage={canManage}
                value={ejecucion.hora_inicio || "-"}
                onChange={null}
                input={
                  <input
                    type="time"
                    value={form.hora_inicio}
                    onChange={(event) => handleFormChange("hora_inicio", event.target.value)}
                    disabled={!canManage || saving}
                    className={inputClassName}
                  />
                }
              />

              <EditableField
                label="Hora fin"
                canManage={canManage}
                value={ejecucion.hora_fin || "-"}
                onChange={null}
                input={
                  <input
                    type="time"
                    value={form.hora_fin}
                    onChange={(event) => handleFormChange("hora_fin", event.target.value)}
                    disabled={!canManage || saving}
                    className={inputClassName}
                  />
                }
              />
            </div>
          </section>

          {checklist ? (
            <ChecklistRespuestaEditorTable
              ejecucion={ejecucion}
              actividades={checklist.actividades || []}
              respuestas={respuestas}
              canManage={canManage}
              onSaved={loadData}
            />
          ) : null}
        </>
      ) : null}

      {!loading && !ejecucion && !error ? (
        <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500 shadow-[0_20px_50px_rgba(15,35,70,0.06)]">
          No se encontro la ejecucion solicitada.
        </div>
      ) : null}
    </div>
  );
}

function InfoPill({ label, value }) {
  return (
    <article className="rounded-[20px] border border-slate-200 bg-slate-50/80 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-base font-semibold text-slate-800">{value}</div>
    </article>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div>
      <div className="text-sm font-semibold text-slate-700">{label}</div>
      <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        {value}
      </div>
    </div>
  );
}

function EditableField({ label, canManage, value, input }) {
  return (
    <div>
      <div className="text-sm font-semibold text-slate-700">{label}</div>
      {canManage ? input : (
        <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {value}
        </div>
      )}
    </div>
  );
}
