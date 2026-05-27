"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Plus, Save } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { detalleSupervisorAPI, reporteOrdenAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatDisplayDate } from "@/lib/utils";
import TableActionButton from "@/components/ui/TableActionButton";

const EDIT_ROLES = [
  "admin",
  "Jefe de Tecnicos",
  "Jefe de Almaceneros",
  "Jefe de Mantenimiento",
  "Tecnico",
];

const cardInputClassName =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#173569] focus:ring-2 focus:ring-[#EAF1FF]";

const questionButtonBaseClassName =
  "inline-flex min-w-[58px] items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold transition";

const noteItems = [
  "Para cualquier cambio de tarea se requerira un nuevo IPERC.",
  "Tomar como referencia el IPERC base, luego elaborar el IPERC Continuo (FP-CORP-04-03) antes de iniciar toda la tarea; donde se debe identificar todos los peligros presentes, evaluar riesgos y determinar los controles.",
  "Validar con el supervisor la informacion registrada en el IPERC Continuo (dentro de las 02 horas siguientes) y no iniciar la tarea cuando se identifiquen nuevos peligros y no se tengan los controles propuestos implementados.",
  'Cuando un trabajador se incorpore al trabajo iniciado, debe revisar el formato IPERC Continuo elaborado y registrar sus datos en la casilla "Datos de trabajadores" en conformidad de que ha tomado conocimiento de los peligros y riesgos de la tarea.',
  "Si es una tarea No Rutinaria se debera realizar un ATS.",
];

function createInitialForm(reporte = null) {
  return {
    epp: reporte?.epp || "",
    herramientas: reporte?.herramientas || "",
    pregunta_1: Boolean(reporte?.pregunta_1),
    pregunta_2: Boolean(reporte?.pregunta_2),
    pregunta_3: Boolean(reporte?.pregunta_3),
    pregunta_4: Boolean(reporte?.pregunta_4),
    pregunta_5: Boolean(reporte?.pregunta_5),
    pregunta_6: Boolean(reporte?.pregunta_6),
    descripcion_tarea: reporte?.descripcion_tarea || "",
  };
}

function createSupervisorForm(supervisor = {}, overrides = {}) {
  return {
    localId:
      supervisor.id != null
        ? `supervisor-${supervisor.id}`
        : `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    id: supervisor.id || null,
    hora: supervisor.hora || "",
    nombres: supervisor.nombres || "",
    apellidos: supervisor.apellidos || "",
    dni: supervisor.dni || "",
    tipo: supervisor.tipo || "",
    observaciones: supervisor.observaciones || "",
    firmaFile: null,
    firmaUrl: supervisor.firma_url || null,
    isPlaceholder: supervisor.tipo === "" || overrides.isPlaceholder || false,
    ...overrides,
  };
}

function hasSupervisorData(supervisor) {
  return [
    supervisor.hora,
    supervisor.nombres,
    supervisor.apellidos,
    supervisor.dni,
    supervisor.observaciones,
  ].some((value) => String(value || "").trim().length > 0) || Boolean(supervisor.firmaFile);
}

function buildSupervisorState(reporte) {
  const detalles = Array.isArray(reporte?.detalles_supervisor)
    ? [...reporte.detalles_supervisor].sort((left, right) => (left.id || 0) - (right.id || 0))
    : [];

  const autoriza =
    detalles.find((detalle) => detalle.tipo === "AUTORIZA") ||
    createSupervisorForm({ tipo: "AUTORIZA" });

  const verifica = detalles
    .filter((detalle) => detalle.tipo === "VERIFICA")
    .map((detalle) => createSupervisorForm(detalle));

  const placeholder = detalles.find((detalle) => detalle.tipo === "");

  const verifyForms = [
    ...verifica,
    createSupervisorForm(
      placeholder || { tipo: "" },
      {
        isPlaceholder: true,
      }
    ),
  ];

  return {
    autoriza: createSupervisorForm(autoriza, { tipo: "AUTORIZA" }),
    verifica: verifyForms,
  };
}

function getErrorMessage(error) {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const firstValue = Object.values(data)[0];
    if (Array.isArray(firstValue) && firstValue.length > 0) {
      return String(firstValue[0]);
    }
    if (typeof firstValue === "string") return firstValue;
  }
  return "No se pudo guardar el reporte.";
}

function InlinePromptField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  minHeightClassName = "min-h-[88px]",
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
      <div className="pt-3 text-sm font-semibold text-slate-900">{label}</div>
      <textarea
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`${cardInputClassName} mt-0 resize-y ${minHeightClassName}`}
        placeholder={placeholder}
      />
    </div>
  );
}

function QuestionRow({
  label,
  value,
  disabled,
  onSelectYes,
  onSelectNo,
}) {
  return (
    <div className="flex h-full min-h-[148px] flex-col justify-between rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-4">
      <div className="text-sm font-medium leading-6 text-slate-800">{label}</div>
      <div className="flex shrink-0 items-center justify-end gap-2 pt-4">
        <button
          type="button"
          onClick={onSelectYes}
          disabled={disabled}
          className={[
            questionButtonBaseClassName,
            value
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-600",
          ].join(" ")}
        >
          Si
        </button>
        <button
          type="button"
          onClick={onSelectNo}
          disabled={disabled}
          className={[
            questionButtonBaseClassName,
            !value
              ? "border-amber-300 bg-amber-50 text-amber-700"
              : "border-slate-200 bg-white text-slate-600",
          ].join(" ")}
        >
          No
        </button>
      </div>
    </div>
  );
}

function SupervisorCard({
  title,
  supervisor,
  disabled,
  onChange,
  onFileChange,
}) {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
      {title ? (
        <div className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          {title}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-4">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Hora
          </span>
          <input
            type="time"
            value={supervisor.hora}
            onChange={(event) => onChange("hora", event.target.value)}
            disabled={disabled}
            className={cardInputClassName}
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Nombres
          </span>
          <input
            type="text"
            value={supervisor.nombres}
            onChange={(event) => onChange("nombres", event.target.value)}
            disabled={disabled}
            className={cardInputClassName}
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Apellidos
          </span>
          <input
            type="text"
            value={supervisor.apellidos}
            onChange={(event) => onChange("apellidos", event.target.value)}
            disabled={disabled}
            className={cardInputClassName}
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            DNI
          </span>
          <input
            type="text"
            value={supervisor.dni}
            onChange={(event) => onChange("dni", event.target.value)}
            disabled={disabled}
            className={cardInputClassName}
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Observaciones
          </span>
          <textarea
            value={supervisor.observaciones}
            onChange={(event) => onChange("observaciones", event.target.value)}
            disabled={disabled}
            className={`${cardInputClassName} min-h-[120px] resize-y`}
          />
        </label>

        <div className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Firma
          </span>
          <div className="mt-2 rounded-[22px] border border-dashed border-slate-300 bg-white px-4 py-4">
            <input
              type="file"
              accept="image/*"
              onChange={(event) =>
                onFileChange(event.target.files?.[0] || null)
              }
              disabled={disabled}
              className="w-full text-sm text-slate-500 file:mr-2 file:rounded-xl file:border-0 file:bg-[#eef4ff] file:px-3 file:py-2 file:font-semibold file:text-[#173569]"
            />

            {supervisor.firmaFile ? (
              <p className="mt-3 text-xs text-slate-500">
                Archivo preparado: {supervisor.firmaFile.name}
              </p>
            ) : supervisor.firmaUrl ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <img
                  src={supervisor.firmaUrl}
                  alt="Firma del supervisor"
                  className="h-32 w-full object-contain bg-white"
                />
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-500">
                Sin firma registrada.
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function ReporteDetallePage() {
  const params = useParams();
  const router = useRouter();
  const reporteId = params?.id;
  const { roles = [] } = useAuth();
  const [reporte, setReporte] = useState(null);
  const [form, setForm] = useState(createInitialForm());
  const [autorizaSupervisor, setAutorizaSupervisor] = useState(
    createSupervisorForm({ tipo: "AUTORIZA" })
  );
  const [verificaSupervisores, setVerificaSupervisores] = useState([
    createSupervisorForm({ tipo: "" }, { isPlaceholder: true }),
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingIperc, setCreatingIperc] = useState(false);
  const [error, setError] = useState("");

  const canEdit = useMemo(
    () => roles.some((role) => EDIT_ROLES.includes(role)),
    [roles]
  );

  const questionColumns = [
    [
      {
        key: "pregunta_1",
        label: "Es una tarea rutinaria?",
      },
      {
        key: "pregunta_2",
        label: "Se cuenta con procedimiento?",
      },
      {
        key: "pregunta_3",
        label: "Se requiere del Permiso de Trabajo de Alto Riesgo (PETAR)?",
      },
    ],
    [
      {
        key: "pregunta_4",
        label: "Los trabajadores han sido capacitados en los procedimientos?",
      },
      {
        key: "pregunta_5",
        label: "Se encuentran todos los controles implementados para iniciar la tarea?",
      },
      {
        key: "pregunta_6",
        label: "Se tiene supervision permanente en la tarea de Alto Riesgo?",
      },
    ],
  ];

  const loadReporte = async () => {
    if (!reporteId) return;

    setLoading(true);
    setError("");

    try {
      const response = await reporteOrdenAPI.retrieve(reporteId);
      const nextReporte = response.data;
      const supervisorState = buildSupervisorState(nextReporte);
      setReporte(nextReporte);
      setForm(createInitialForm(nextReporte));
      setAutorizaSupervisor(supervisorState.autoriza);
      setVerificaSupervisores(supervisorState.verifica);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReporte();
  }, [reporteId]);

  const metadata = useMemo(
    () => ({
      codigo: reporte?.codigo || "-",
      vigente: formatDisplayDate(reporte?.fecha) || "-",
      ordenTrabajo: reporte?.orden_trabajo_display || "Sin orden asociada",
      estado: reporte?.estado_label || reporte?.estado || "Pendiente",
    }),
    [reporte]
  );

  const handleChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    if (error) setError("");
  };

  const handleAutorizaChange = (field, value) => {
    setAutorizaSupervisor((current) => ({
      ...current,
      [field]: value,
    }));
    if (error) setError("");
  };

  const handleVerificaChange = (localId, field, value) => {
    setVerificaSupervisores((current) =>
      current.map((supervisor) =>
        supervisor.localId === localId
          ? {
              ...supervisor,
              [field]: value,
            }
          : supervisor
      )
    );
    if (error) setError("");
  };

  const handleVerificaFileChange = (localId, file) => {
    setVerificaSupervisores((current) =>
      current.map((supervisor) =>
        supervisor.localId === localId
          ? {
              ...supervisor,
              firmaFile: file,
            }
          : supervisor
      )
    );
    if (error) setError("");
  };

  const handleAddSupervisor = () => {
    setVerificaSupervisores((current) => [
      ...current,
      createSupervisorForm({ tipo: "VERIFICA" }),
    ]);
  };

  const persistSupervisor = async (supervisor, reporteOrdenId, forcedTipo) => {
    const shouldPersist =
      Boolean(supervisor.id) || hasSupervisorData(supervisor);

    if (!shouldPersist) {
      return null;
    }

    if (supervisor.isPlaceholder && !hasSupervisorData(supervisor)) {
      return null;
    }

    const formData = new FormData();
    formData.append("reporte_orden", String(reporteOrdenId));
    formData.append("tipo", forcedTipo);
    formData.append("hora", supervisor.hora || "");
    formData.append("nombres", supervisor.nombres || "");
    formData.append("apellidos", supervisor.apellidos || "");
    formData.append("dni", supervisor.dni || "");
    formData.append("observaciones", supervisor.observaciones || "");
    if (supervisor.firmaFile) {
      formData.append("firma", supervisor.firmaFile);
    }

    if (supervisor.id) {
      return detalleSupervisorAPI.patch(supervisor.id, formData, true);
    }

    return detalleSupervisorAPI.create(formData, true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!reporte?.id || !canEdit) return;

    setSaving(true);
    setError("");

    try {
      const payload = {
        ...form,
        estado: reporte.estado === "PENDIENTE" ? "REALIZADO" : reporte.estado,
      };
      const reportResponse = await reporteOrdenAPI.patch(reporte.id, payload);

      const supervisorRequests = [
        persistSupervisor(
          autorizaSupervisor,
          reportResponse.data.id,
          "AUTORIZA"
        ),
        ...verificaSupervisores.map((supervisor) =>
          persistSupervisor(supervisor, reportResponse.data.id, "VERIFICA")
        ),
      ].filter(Boolean);

      await Promise.all(supervisorRequests);
      await loadReporte();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateIperc = async () => {
    if (!reporte?.id) return;

    setCreatingIperc(true);
    setError("");

    try {
      const response = await reporteOrdenAPI.createIperc(reporte.id);
      router.push(`/iperc/${response.data.id}`);
    } catch (createError) {
      setError(getErrorMessage(createError));
    } finally {
      setCreatingIperc(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-[0_24px_60px_rgba(15,35,70,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Link
            href="/reportes"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#173569] transition hover:text-[#0f2346]"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a reportes
          </Link>

          {canEdit ? (
            <TableActionButton
              type="submit"
              form="reporte-orden-form"
              tone={reporte?.estado === "REALIZADO" ? "primary" : "success"}
              disabled={loading || saving}
              className="rounded-2xl px-4 py-2.5"
            >
              {reporte?.estado === "REALIZADO" ? (
                <Save className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {saving
                ? "Guardando..."
                : reporte?.estado === "REALIZADO"
                  ? "Guardar cambios"
                  : "Completar reporte"}
            </TableActionButton>
          ) : null}
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_24px_60px_rgba(15,35,70,0.08)]">
        {loading ? (
          <div className="py-12 text-center text-sm text-slate-500">Cargando reporte...</div>
        ) : (
          <div className="px-6 py-6">
            <div className="grid items-start gap-5 lg:grid-cols-[164px_minmax(0,1fr)_280px]">
              <div className="relative min-h-[148px]">
                <Image
                  src="/logo/logo.png"
                  alt="Fredal"
                  fill
                  sizes="164px"
                  className="object-contain p-1"
                />
              </div>

              <div className="flex min-h-[148px] flex-col justify-start pt-1">
                <h1 className="text-2xl font-bold uppercase tracking-[0.02em] text-slate-900">
                  Reporte de Trabajo
                </h1>
                <p className="pt-2 text-sm text-slate-600">{metadata.ordenTrabajo}</p>
                <p className="pt-1 text-sm text-slate-500">Estado: {metadata.estado}</p>
              </div>

              <div className="grid min-h-[148px] content-start gap-y-3 pt-1 text-sm text-slate-700">
                <div className="grid grid-cols-[88px_minmax(0,1fr)] items-start gap-x-3">
                  <span className="font-semibold text-slate-900">CODIGO:</span>
                  <span className="text-left">{metadata.codigo}</span>
                </div>
                <div className="grid grid-cols-[88px_minmax(0,1fr)] items-start gap-x-3">
                  <span className="font-semibold text-slate-900">VERSION:</span>
                  <span className="text-left">1.0</span>
                </div>
                <div className="grid grid-cols-[88px_minmax(0,1fr)] items-start gap-x-3">
                  <span className="font-semibold text-slate-900">VIGENTE:</span>
                  <span className="text-left">{metadata.vigente}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <form id="reporte-orden-form" onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,35,70,0.08)]">
          <div className="space-y-5">
            <InlinePromptField
              label="EPP Basico/Especifico:"
              value={form.epp}
              onChange={(event) => handleChange("epp", event.target.value)}
              disabled={!canEdit || loading}
              placeholder="Detalla el equipo de proteccion personal basico y especifico"
            />

            <InlinePromptField
              label="Equipos y/o herramientas a utilizar:"
              value={form.herramientas}
              onChange={(event) => handleChange("herramientas", event.target.value)}
              disabled={!canEdit || loading}
              placeholder="Registra los equipos y herramientas a utilizar"
            />

            <div className="border-t border-slate-200 pt-3">
              <h2 className="text-lg font-semibold uppercase tracking-[0.04em] text-slate-900">
                Analisis de la labor
              </h2>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {questionColumns.map((column, columnIndex) => (
                <div key={`column-${columnIndex}`} className="grid auto-rows-fr gap-4">
                  {column.map((question) => (
                    <QuestionRow
                      key={question.key}
                      label={question.label}
                      value={Boolean(form[question.key])}
                      disabled={!canEdit || loading}
                      onSelectYes={() => handleChange(question.key, true)}
                      onSelectNo={() => handleChange(question.key, false)}
                    />
                  ))}
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 pt-3">
              <h2 className="text-lg font-semibold uppercase tracking-[0.04em] text-slate-900">
                Descripcion de la tarea
              </h2>
            </div>

            <textarea
              value={form.descripcion_tarea}
              onChange={(event) => handleChange("descripcion_tarea", event.target.value)}
              disabled={!canEdit || loading}
              className={`${cardInputClassName} mt-0 min-h-[180px] resize-y`}
              placeholder="Resume el trabajo realizado, hallazgos y cierre operativo"
            />
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,35,70,0.08)]">
          <h2 className="text-lg font-semibold uppercase tracking-[0.04em] text-slate-900">
            Supervisor que autoriza la ejecucion de la tarea
          </h2>
          <div className="mt-5">
            <SupervisorCard
              supervisor={autorizaSupervisor}
              disabled={!canEdit || loading}
              onChange={(field, value) => handleAutorizaChange(field, value)}
              onFileChange={(file) => handleAutorizaChange("firmaFile", file)}
            />
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,35,70,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-lg font-semibold uppercase tracking-[0.04em] text-slate-900">
              Supervisores que verifican la ejecucion segura de la tarea
            </h2>

            {canEdit ? (
              <TableActionButton
                onClick={handleAddSupervisor}
                tone="primary"
                className="rounded-2xl px-4 py-2.5"
              >
                <Plus className="h-4 w-4" />
                Agregar supervisor
              </TableActionButton>
            ) : null}
          </div>

          <div className="mt-5 space-y-4">
            {verificaSupervisores.map((supervisor, index) => (
              <SupervisorCard
                key={supervisor.localId}
                title={`Supervisor ${String(index + 1).padStart(2, "0")}`}
                supervisor={supervisor}
                disabled={!canEdit || loading}
                onChange={(field, value) =>
                  handleVerificaChange(supervisor.localId, field, value)
                }
                onFileChange={(file) =>
                  handleVerificaFileChange(supervisor.localId, file)
                }
              />
            ))}
          </div>
        </section>

        {canEdit ? (
          <section className="flex items-center justify-start">
            <TableActionButton
              type="button"
              onClick={handleCreateIperc}
              tone="primary"
              disabled={creatingIperc || loading || !reporte?.orden_trabajo}
              className="rounded-2xl px-5 py-3"
            >
              {creatingIperc ? "Generando IPERC..." : "Hacer IPERC"}
            </TableActionButton>
          </section>
        ) : null}

        <section className="rounded-[28px] border border-amber-200 bg-amber-50/80 p-6 shadow-[0_18px_40px_rgba(180,140,30,0.08)]">
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-amber-950 underline underline-offset-4">
            Nota
          </h2>
          <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-7 text-amber-950">
            {noteItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </form>
    </div>
  );
}
