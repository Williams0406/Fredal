"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, PencilLine, Plus, Save, Trash2, X } from "lucide-react";
import { useParams } from "next/navigation";
import {
  detalleSupervisorAPI,
  gestionCambioAPI,
  ipercRegistroAPI,
  medidaCorrectivaAPI,
  reporteIpercAPI,
  secuenciaControlRiesgoAPI,
} from "@/lib/api";
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

const inputClassName =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#173569] focus:ring-2 focus:ring-[#EAF1FF]";

const textareaClassName =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-[#173569] focus:ring-2 focus:ring-[#EAF1FF]";

const sectionTitleClassName =
  "text-base font-bold uppercase tracking-[0.08em] text-slate-900";

const tableTextareaClassName =
  "block h-full min-h-[168px] w-full resize-none border-0 bg-transparent px-3 py-3 text-sm leading-6 text-slate-700 outline-none focus:ring-0";

const controlTextareaClassName =
  "block min-h-[84px] w-full resize-none border-0 bg-transparent px-0 py-2 text-sm leading-6 text-slate-700 outline-none focus:ring-0";

const EVALUATION_OPTIONS = [
  {
    value: "ALTO",
    label: "ALTO",
    selectedClassName: "bg-red-500 text-white border-red-500",
    idleClassName: "bg-red-50 text-red-600 hover:bg-red-100",
  },
  {
    value: "MEDIO",
    label: "MEDIO",
    selectedClassName: "bg-amber-300 text-amber-950 border-amber-300",
    idleClassName: "bg-amber-50 text-amber-700 hover:bg-amber-100",
  },
  {
    value: "BAJO",
    label: "BAJO",
    selectedClassName: "bg-emerald-400 text-emerald-950 border-emerald-400",
    idleClassName: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  },
];

const matrixColumns = [
  { key: "A", title: "A", subtitle: "Comun" },
  { key: "B", title: "B", subtitle: "Ha sucedido" },
  { key: "C", title: "C", subtitle: "Podria suceder" },
  { key: "D", title: "D", subtitle: "Raro que suceda" },
  { key: "E", title: "E", subtitle: "Practicamente imposible que suceda" },
];

const matrixRows = [
  {
    severity: "Catastrofico",
    values: [
      { label: "1", tone: "red" },
      { label: "2", tone: "red" },
      { label: "4", tone: "red" },
      { label: "7", tone: "red" },
      { label: "11", tone: "amber" },
    ],
  },
  {
    severity: "Fatalidad",
    values: [
      { label: "3", tone: "red" },
      { label: "5", tone: "red" },
      { label: "8", tone: "red" },
      { label: "12", tone: "amber" },
      { label: "16", tone: "green" },
    ],
  },
  {
    severity: "Permanente",
    values: [
      { label: "6", tone: "red" },
      { label: "9", tone: "amber" },
      { label: "13", tone: "amber" },
      { label: "17", tone: "green" },
      { label: "20", tone: "green" },
    ],
  },
  {
    severity: "Temporal",
    values: [
      { label: "10", tone: "amber" },
      { label: "14", tone: "amber" },
      { label: "18", tone: "green" },
      { label: "21", tone: "green" },
      { label: "23", tone: "green" },
    ],
  },
  {
    severity: "Menor",
    values: [
      { label: "15", tone: "amber" },
      { label: "19", tone: "green" },
      { label: "22", tone: "green" },
      { label: "24", tone: "green" },
      { label: "25", tone: "green" },
    ],
  },
];

const riskLevels = [
  {
    title: "ALTO",
    tone: "red",
    description:
      "Riesgo intolerable, requiere controles inmediatos. Si no se controla, la tarea no debe continuar.",
    deadline: "0-24 HORAS",
  },
  {
    title: "MEDIO",
    tone: "amber",
    description:
      "Iniciar medidas para eliminar o reducir el riesgo. Evaluar y monitorear antes de continuar.",
    deadline: "0-72 HORAS",
  },
  {
    title: "BAJO",
    tone: "green",
    description:
      "Este riesgo puede ser tolerable con controles vigentes y seguimiento operativo.",
    deadline: "1 MES",
  },
];

function createSupervisorForm(supervisor = {}) {
  return {
    id: supervisor.id || null,
    hora: supervisor.hora || "",
    apellidos: supervisor.apellidos || "",
    nombres: supervisor.nombres || "",
    dni: supervisor.dni || "",
    observaciones: supervisor.observaciones || "",
    firmaUrl: supervisor.firma_url || null,
    firmaFile: null,
    reporteOrden: supervisor.reporte_orden || null,
  };
}

function hasSupervisorData(supervisor) {
  return [
    supervisor.hora,
    supervisor.apellidos,
    supervisor.nombres,
    supervisor.dni,
    supervisor.observaciones,
  ].some((value) => String(value || "").trim().length > 0) || Boolean(supervisor.firmaFile);
}

function createGestionRow(gestion = {}) {
  return {
    localId:
      gestion.id != null
        ? `gestion-${gestion.id}`
        : `gestion-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    id: gestion.id || null,
    implementacion: gestion.implementacion || "",
    estado: gestion.estado || "SUGERIDO",
    observacion: gestion.observacion || "",
  };
}

function hasGestionData(gestion) {
  return (
    String(gestion.implementacion || "").trim().length > 0 ||
    String(gestion.observacion || "").trim().length > 0 ||
    (gestion.estado && gestion.estado !== "SUGERIDO")
  );
}

function createIpercRow(iperc = {}) {
  const gestiones = Array.isArray(iperc.gestiones_cambio)
    ? iperc.gestiones_cambio.map((gestion) => createGestionRow(gestion))
    : [];

  return {
    localId:
      iperc.id != null
        ? `iperc-${iperc.id}`
        : `iperc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    id: iperc.id || null,
    descripcion_peligro: iperc.descripcion_peligro || "",
    consecuencia_peligro: iperc.consecuencia_peligro || "",
    evaluacion_iperc: normalizeEvaluationValue(iperc.evaluacion_iperc),
    evaluacion_riesgo_residual: normalizeEvaluationValue(iperc.evaluacion_riesgo_residual),
    gestiones: gestiones.length > 0 ? gestiones : [createGestionRow()],
  };
}

function normalizeEvaluationValue(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized.includes("ALTO")) return "ALTO";
  if (normalized.includes("MEDIO")) return "MEDIO";
  if (normalized.includes("BAJO")) return "BAJO";
  return "";
}

function normalizeIpercRows(reporte) {
  const rows = Array.isArray(reporte?.ipercs)
    ? reporte.ipercs.map((iperc) => createIpercRow(iperc))
    : [];
  return rows.length > 0 ? rows : [createIpercRow()];
}

function hasIpercData(iperc) {
  return (
    String(iperc.descripcion_peligro || "").trim().length > 0 ||
    String(iperc.consecuencia_peligro || "").trim().length > 0 ||
    String(iperc.evaluacion_iperc || "").trim().length > 0 ||
    String(iperc.evaluacion_riesgo_residual || "").trim().length > 0 ||
    iperc.gestiones.some((gestion) => hasGestionData(gestion))
  );
}

function createSecuenciaRow(secuencia = {}) {
  return {
    localId:
      secuencia.id != null
        ? `secuencia-${secuencia.id}`
        : `secuencia-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    id: secuencia.id || null,
    actividad: secuencia.actividad || "",
  };
}

function hasSecuenciaData(secuencia) {
  return String(secuencia.actividad || "").trim().length > 0;
}

function normalizeSecuencias(reporte) {
  const rows = Array.isArray(reporte?.secuencias_control_riesgo)
    ? reporte.secuencias_control_riesgo.map((item) => createSecuenciaRow(item))
    : [];
  return rows;
}

function createMedidaRow(medida = {}) {
  return {
    localId:
      medida.id != null
        ? `medida-${medida.id}`
        : `medida-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    id: medida.id || null,
    detalle: medida.detalle || "",
  };
}

function hasMedidaData(medida) {
  return String(medida.detalle || "").trim().length > 0;
}

function normalizeMedidas(reporte, supervisorId) {
  const measures = Array.isArray(reporte?.medidas_correctivas)
    ? reporte.medidas_correctivas.filter(
        (medida) => !supervisorId || Number(medida.supervisor) === Number(supervisorId)
      )
    : [];
  const rows = measures.map((medida) => createMedidaRow(medida));
  return rows;
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
  return "No se pudo guardar el reporte IPERC.";
}

function getToneClass(tone) {
  if (tone === "red") return "bg-red-500 text-white";
  if (tone === "amber") return "bg-amber-300 text-amber-950";
  return "bg-emerald-400 text-emerald-950";
}

function EvaluationCell({
  currentValue,
  option,
  disabled,
  onSelect,
}) {
  const isSelected = currentValue === option.value;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={[
        "flex h-full min-h-[168px] w-full items-center justify-center border-0 text-center text-xs font-bold uppercase tracking-[0.14em] transition",
        isSelected ? option.selectedClassName : option.idleClassName,
        disabled ? "cursor-default" : "cursor-pointer",
      ].join(" ")}
      aria-pressed={isSelected}
      title={option.label}
    >
      {isSelected ? option.label : ""}
    </button>
  );
}

function displayTextValue(value, fallback = "Sin registro.") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function ReadTextBlock({
  value,
  fallback = "Sin registro.",
  className = "",
}) {
  return (
    <div
      className={[
        "whitespace-pre-wrap text-sm leading-6 text-slate-700",
        className,
      ].join(" ")}
    >
      {displayTextValue(value, fallback)}
    </div>
  );
}

function RemoveInlineButton({
  label,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-red-600 transition hover:text-red-700"
    >
      <Trash2 className="h-4 w-4" />
      {label}
    </button>
  );
}

export default function IpercDetallePage() {
  const params = useParams();
  const reporteId = params?.id;
  const { roles = [] } = useAuth();
  const [reporte, setReporte] = useState(null);
  const [tarea, setTarea] = useState("");
  const [ipercRows, setIpercRows] = useState([createIpercRow()]);
  const [secuencias, setSecuencias] = useState([createSecuenciaRow()]);
  const [supervisorPendiente, setSupervisorPendiente] = useState(createSupervisorForm());
  const [medidas, setMedidas] = useState([createMedidaRow()]);
  const [isEditing, setIsEditing] = useState(false);
  const [deletedIpercIds, setDeletedIpercIds] = useState([]);
  const [deletedGestionIds, setDeletedGestionIds] = useState([]);
  const [deletedSecuenciaIds, setDeletedSecuenciaIds] = useState([]);
  const [deletedMedidaIds, setDeletedMedidaIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canEdit = useMemo(
    () => roles.some((role) => EDIT_ROLES.includes(role)),
    [roles]
  );
  const isManualReporte = !reporte?.orden_trabajo;
  const canEditTarea = canEdit && isEditing && isManualReporte;

  const applyReporteState = (data, nextEditing = false) => {
    setReporte(data);
    setTarea(data.tarea || "");
    setIpercRows(normalizeIpercRows(data));
    setSecuencias(normalizeSecuencias(data));
    const supervisor = createSupervisorForm(data.supervisor_pendiente || {});
    setSupervisorPendiente(supervisor);
    setMedidas(normalizeMedidas(data, supervisor.id));
    setDeletedIpercIds([]);
    setDeletedGestionIds([]);
    setDeletedSecuenciaIds([]);
    setDeletedMedidaIds([]);
    setIsEditing(nextEditing);
  };

  const loadReporte = async () => {
    if (!reporteId) return;

    setLoading(true);
    setError("");

    try {
      const response = await reporteIpercAPI.retrieve(reporteId);
      const data = response.data;
      applyReporteState(data, false);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReporte();
  }, [reporteId]);

  const resumenItems = useMemo(() => {
    if (!reporte) return [];

    return [
      { label: "Orden de trabajo", value: reporte.orden_trabajo_display || "-" },
      { label: "Motivo", value: reporte.motivo_label || reporte.motivo || "-" },
      { label: "Codigo", value: reporte.codigo || "-" },
      { label: "Vigente", value: formatDisplayDate(reporte.fecha) || "-" },
    ];
  }, [reporte]);

  const handleStartEditing = () => {
    if (!canEdit || !reporte) return;
    applyReporteState(reporte, true);
    if (error) setError("");
  };

  const handleCancelEditing = () => {
    if (!reporte) return;
    applyReporteState(reporte, false);
    if (error) setError("");
  };

  const handleIpercChange = (localId, field, value) => {
    setIpercRows((current) =>
      current.map((row) =>
        row.localId === localId
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
    if (error) setError("");
  };

  const handleGestionChange = (ipercLocalId, gestionLocalId, field, value) => {
    setIpercRows((current) =>
      current.map((row) => {
        if (row.localId !== ipercLocalId) return row;
        return {
          ...row,
          gestiones: row.gestiones.map((gestion) =>
            gestion.localId === gestionLocalId
              ? {
                  ...gestion,
                  [field]: value,
                }
              : gestion
          ),
        };
      })
    );
    if (error) setError("");
  };

  const handleAddIpercRow = () => {
    setIpercRows((current) => [...current, createIpercRow()]);
  };

  const handleRemoveIpercRow = (localId) => {
    const row = ipercRows.find((current) => current.localId === localId);
    if (!row) return;

    if (row.id) {
      setDeletedIpercIds((current) =>
        current.includes(row.id) ? current : [...current, row.id]
      );
    }

    setIpercRows((current) => current.filter((item) => item.localId !== localId));
    if (error) setError("");
  };

  const handleAddGestion = (ipercLocalId) => {
    setIpercRows((current) =>
      current.map((row) =>
        row.localId === ipercLocalId
          ? {
              ...row,
              gestiones: [...row.gestiones, createGestionRow()],
            }
          : row
      )
    );
  };

  const handleRemoveGestion = (ipercLocalId, gestionLocalId) => {
    const targetRow = ipercRows.find((row) => row.localId === ipercLocalId);
    const targetGestion = targetRow?.gestiones.find(
      (gestion) => gestion.localId === gestionLocalId
    );
    if (!targetRow || !targetGestion) return;

    if (targetGestion.id) {
      setDeletedGestionIds((current) =>
        current.includes(targetGestion.id) ? current : [...current, targetGestion.id]
      );
    }

    setIpercRows((current) =>
      current.map((row) =>
        row.localId === ipercLocalId
          ? {
              ...row,
              gestiones: row.gestiones.filter(
                (gestion) => gestion.localId !== gestionLocalId
              ),
            }
          : row
      )
    );
    if (error) setError("");
  };

  const handleSecuenciaChange = (localId, value) => {
    setSecuencias((current) =>
      current.map((row) =>
        row.localId === localId
          ? {
              ...row,
              actividad: value,
            }
          : row
      )
    );
    if (error) setError("");
  };

  const handleAddSecuencia = () => {
    setSecuencias((current) => [...current, createSecuenciaRow()]);
  };

  const handleRemoveSecuencia = (localId) => {
    const row = secuencias.find((current) => current.localId === localId);
    if (!row) return;

    if (row.id) {
      setDeletedSecuenciaIds((current) =>
        current.includes(row.id) ? current : [...current, row.id]
      );
    }

    setSecuencias((current) => current.filter((item) => item.localId !== localId));
    if (error) setError("");
  };

  const handleSupervisorChange = (field, value) => {
    setSupervisorPendiente((current) => ({
      ...current,
      [field]: value,
    }));
    if (error) setError("");
  };

  const handleMedidaChange = (localId, value) => {
    setMedidas((current) =>
      current.map((row) =>
        row.localId === localId
          ? {
              ...row,
              detalle: value,
            }
          : row
      )
    );
    if (error) setError("");
  };

  const handleAddMedida = () => {
    setMedidas((current) => [...current, createMedidaRow()]);
  };

  const handleRemoveMedida = (localId) => {
    const row = medidas.find((current) => current.localId === localId);
    if (!row) return;

    if (row.id) {
      setDeletedMedidaIds((current) =>
        current.includes(row.id) ? current : [...current, row.id]
      );
    }

    setMedidas((current) => current.filter((item) => item.localId !== localId));
    if (error) setError("");
  };

  const persistSupervisor = async () => {
    const shouldPersist = Boolean(supervisorPendiente.id) || hasSupervisorData(supervisorPendiente);

    if (!shouldPersist) {
      return supervisorPendiente.id || null;
    }

    const formData = new FormData();
    formData.append("reporte_iperc", String(reporte.id));
    if (supervisorPendiente.reporteOrden) {
      formData.append("reporte_orden", String(supervisorPendiente.reporteOrden));
    }
    formData.append("tipo", "");
    formData.append("hora", supervisorPendiente.hora || "");
    formData.append("apellidos", supervisorPendiente.apellidos || "");
    formData.append("nombres", supervisorPendiente.nombres || "");
    formData.append("dni", supervisorPendiente.dni || "");
    formData.append("observaciones", supervisorPendiente.observaciones || "");
    if (supervisorPendiente.firmaFile) {
      formData.append("firma", supervisorPendiente.firmaFile);
    }

    const response = supervisorPendiente.id
      ? await detalleSupervisorAPI.patch(supervisorPendiente.id, formData, true)
      : await detalleSupervisorAPI.create(formData, true);

    return response.data.id;
  };

  const handleSave = async () => {
    if (!reporte?.id || !canEdit || !isEditing) return;

    setSaving(true);
    setError("");

    try {
      if (isManualReporte) {
        await reporteIpercAPI.patch(reporte.id, {
          tarea,
        });
      }

      const supervisorId = await persistSupervisor();

      for (const ipercId of deletedIpercIds) {
        await ipercRegistroAPI.delete(ipercId);
      }

      for (const gestionId of deletedGestionIds) {
        await gestionCambioAPI.delete(gestionId);
      }

      for (const row of ipercRows) {
        const shouldPersistRow = Boolean(row.id) || hasIpercData(row);
        if (!shouldPersistRow) continue;

        const ipercPayload = {
          reporte_iperc: reporte.id,
          descripcion_peligro: row.descripcion_peligro || "",
          consecuencia_peligro: row.consecuencia_peligro || "",
          evaluacion_iperc: row.evaluacion_iperc || "",
          evaluacion_riesgo_residual: row.evaluacion_riesgo_residual || "",
        };

        const ipercResponse = row.id
          ? await ipercRegistroAPI.patch(row.id, ipercPayload)
          : await ipercRegistroAPI.create(ipercPayload);

        for (const gestion of row.gestiones) {
          const shouldPersistGestion = Boolean(gestion.id) || hasGestionData(gestion);
          if (!shouldPersistGestion) continue;

          const gestionPayload = {
            iperc: ipercResponse.data.id,
            implementacion: gestion.implementacion || "",
            estado: gestion.estado || "SUGERIDO",
            observacion: gestion.observacion || "",
          };

          if (gestion.id) {
            await gestionCambioAPI.patch(gestion.id, gestionPayload);
          } else {
            await gestionCambioAPI.create(gestionPayload);
          }
        }
      }

      for (const secuenciaId of deletedSecuenciaIds) {
        await secuenciaControlRiesgoAPI.delete(secuenciaId);
      }

      for (const secuencia of secuencias) {
        const shouldPersistSecuencia = Boolean(secuencia.id) || hasSecuenciaData(secuencia);
        if (!shouldPersistSecuencia) continue;

        const secuenciaPayload = {
          reporte_iperc: reporte.id,
          actividad: secuencia.actividad || "",
        };

        if (secuencia.id) {
          await secuenciaControlRiesgoAPI.patch(secuencia.id, secuenciaPayload);
        } else {
          await secuenciaControlRiesgoAPI.create(secuenciaPayload);
        }
      }

      for (const medidaId of deletedMedidaIds) {
        await medidaCorrectivaAPI.delete(medidaId);
      }

      for (const medida of medidas) {
        const shouldPersistMedida = Boolean(medida.id) || hasMedidaData(medida);
        if (!shouldPersistMedida) continue;

        const medidaPayload = {
          reporte_iperc: reporte.id,
          supervisor: supervisorId,
          detalle: medida.detalle || "",
        };

        if (medida.id) {
          await medidaCorrectivaAPI.patch(medida.id, medidaPayload);
        } else {
          await medidaCorrectivaAPI.create(medidaPayload);
        }
      }

      await loadReporte();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500 shadow-[0_24px_60px_rgba(15,35,70,0.08)]">
        Cargando reporte IPERC...
      </div>
    );
  }

  if (!reporte) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500 shadow-[0_24px_60px_rgba(15,35,70,0.08)]">
        No se encontro el reporte solicitado.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/iperc"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a IPERC
        </Link>

        {canEdit ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {!isEditing ? (
              <TableActionButton
                onClick={handleStartEditing}
                tone="primary"
                disabled={loading}
                className="rounded-2xl px-5 py-3"
              >
                <PencilLine className="h-4 w-4" />
                Editar
              </TableActionButton>
            ) : (
              <>
                <TableActionButton
                  onClick={handleCancelEditing}
                  tone="neutral"
                  disabled={saving}
                  className="rounded-2xl px-5 py-3"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </TableActionButton>
                <TableActionButton
                  onClick={handleSave}
                  tone="success"
                  disabled={saving}
                  className="rounded-2xl px-5 py-3"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Guardando..." : "Guardar"}
                </TableActionButton>
              </>
            )}
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_24px_60px_rgba(15,35,70,0.08)]">
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
                REPORTE IPERC CONTINUO
              </h1>
              <p className="pt-2 text-sm text-slate-600">
                {reporte.orden_trabajo_display || "Sin orden asociada"}
              </p>
              <p className="pt-1 text-sm text-slate-500">
                Motivo: {reporte.motivo_label || reporte.motivo || "-"}
              </p>
            </div>

            <div className="grid min-h-[148px] content-start gap-y-3 pt-1 text-sm text-slate-700">
              <div className="grid grid-cols-[88px_minmax(0,1fr)] items-start gap-x-3">
                <span className="font-semibold text-slate-900">CODIGO:</span>
                <span className="text-left">{reporte.codigo || "-"}</span>
              </div>
              <div className="grid grid-cols-[88px_minmax(0,1fr)] items-start gap-x-3">
                <span className="font-semibold text-slate-900">VERSION:</span>
                <span className="text-left">1.0</span>
              </div>
              <div className="grid grid-cols-[88px_minmax(0,1fr)] items-start gap-x-3">
                <span className="font-semibold text-slate-900">VIGENTE:</span>
                <span className="text-left">{formatDisplayDate(reporte.fecha) || "-"}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,35,70,0.08)]">
        <div className="border-b border-slate-200 px-6 py-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {resumenItems.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
              >
                <span className="font-semibold text-slate-900">{item.label}:</span> {item.value}
              </div>
            ))}
          </div>
        </div>

        <div className="border-b border-slate-200 px-6 py-6">
          <h2 className={sectionTitleClassName}>MATRIZ DE EVALUACION DE RIESGOS</h2>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
            <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full table-fixed border-collapse">
                  <thead>
                    <tr className="align-middle bg-slate-100/90 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                      <th className="w-[170px] border-b border-r border-slate-200 px-4 py-3">
                        Severidad
                      </th>
                      {matrixColumns.map((column) => (
                        <th
                          key={column.key}
                          className="w-[118px] border-b border-r border-slate-200 px-3 py-3 text-center last:border-r-0"
                        >
                          <div className="text-sm font-semibold text-slate-900">{column.title}</div>
                          <div className="mt-1 text-[10px] normal-case leading-4 tracking-normal text-slate-500">
                            {column.subtitle}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixRows.map((row) => (
                      <tr key={row.severity} className="align-middle text-sm text-slate-800">
                        <td className="h-14 border-b border-r border-slate-200 bg-slate-50/80 px-4 py-2.5 font-semibold">
                          {row.severity}
                        </td>
                        {row.values.map((cell, index) => (
                          <td
                            key={`${row.severity}-${index}`}
                            className={`h-14 border-b border-r border-slate-200 px-3 py-2 text-center align-middle text-base font-bold last:border-r-0 ${getToneClass(cell.tone)}`}
                          >
                            {cell.label}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
              <div className="grid grid-cols-[138px_minmax(0,1fr)_136px] border-b border-slate-200 bg-slate-100/90 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                <div className="border-r border-slate-200 px-4 py-3">Nivel de riesgo</div>
                <div className="border-r border-slate-200 px-4 py-3">Descripcion</div>
                <div className="px-4 py-3">Plazo de correccion</div>
              </div>

              <div className="divide-y divide-slate-200">
                {riskLevels.map((level) => (
                  <div
                    key={level.title}
                    className="grid grid-cols-[138px_minmax(0,1fr)_136px] items-stretch"
                  >
                    <div
                      className={`flex min-h-[84px] items-center justify-center border-r border-slate-200 px-4 py-3 text-sm font-bold uppercase ${getToneClass(level.tone)}`}
                    >
                      {level.title}
                    </div>
                    <div className="flex min-h-[84px] items-center border-r border-slate-200 px-4 py-3 text-sm leading-5 text-slate-700">
                      {level.description}
                    </div>
                    <div className="flex min-h-[84px] items-center px-4 py-3 text-sm font-semibold text-slate-800">
                      {level.deadline}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-slate-200 px-6 py-6">
          <h3 className={sectionTitleClassName}>TAREA</h3>
          {canEditTarea ? (
            <textarea
              value={tarea}
              onChange={(event) => {
                setTarea(event.target.value);
                if (error) setError("");
              }}
              disabled={!canEditTarea}
              className={`${textareaClassName} mt-3 min-h-[116px] resize-y`}
              placeholder="Describe la tarea asociada al reporte IPERC."
            />
          ) : (
            <ReadTextBlock value={tarea} className="mt-3" />
          )}
        </div>

        <div className="border-b border-slate-200">
          <div className="px-6 py-6">
            <h3 className={sectionTitleClassName}>IPERC CONTINUO</h3>
          </div>

          <div className="px-4 pb-4">
            <div className="overflow-x-auto">
              <table className="min-w-[1440px] w-full border-collapse border-y border-slate-300">
              <thead className="bg-slate-50/90">
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                  <th
                    rowSpan={2}
                    className="border-b border-r border-slate-300 px-4 py-4 align-middle"
                  >
                    Descripcion del peligro
                  </th>
                  <th
                    rowSpan={2}
                    className="border-b border-r border-slate-300 px-4 py-4 align-middle"
                  >
                    Consecuencia (riesgo)
                  </th>
                  <th
                    colSpan={3}
                    className="border-b border-r border-slate-300 px-4 py-4 text-center"
                  >
                    Evaluacion IPERC
                  </th>
                  <th
                    rowSpan={2}
                    className="border-b border-r border-slate-300 px-4 py-4 align-middle"
                  >
                    Medidas de control a implementar
                  </th>
                  <th
                    colSpan={3}
                    className="border-b border-slate-300 px-4 py-4 text-center"
                  >
                    Evaluacion residual riesgo
                  </th>
                </tr>
                <tr className="text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                  {EVALUATION_OPTIONS.map((option) => (
                    <th
                      key={`eval-iperc-${option.value}`}
                      className="border-b border-r border-slate-300 px-2 py-3"
                    >
                      {option.label}
                    </th>
                  ))}
                  {EVALUATION_OPTIONS.map((option, index) => (
                    <th
                      key={`eval-residual-${option.value}`}
                      className={[
                        "border-b border-slate-300 px-2 py-3",
                        index < EVALUATION_OPTIONS.length - 1 ? "border-r" : "",
                      ].join(" ")}
                    >
                      {option.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ipercRows.map((row) => (
                  <tr key={row.localId} className="align-top">
                    <td className="border-b border-r border-slate-300 p-0 align-top">
                      <div className="min-h-[168px]">
                        {isEditing ? (
                          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                              Registro
                            </span>
                            <RemoveInlineButton
                              label="Borrar fila"
                              onClick={() => handleRemoveIpercRow(row.localId)}
                            />
                          </div>
                        ) : null}
                        <textarea
                          value={row.descripcion_peligro}
                          onChange={(event) =>
                            handleIpercChange(row.localId, "descripcion_peligro", event.target.value)
                          }
                          disabled={!canEdit || !isEditing}
                          className={tableTextareaClassName}
                          placeholder="Describe el peligro identificado."
                        />
                      </div>
                    </td>
                    <td className="border-b border-r border-slate-300 p-0 align-top">
                      <textarea
                        value={row.consecuencia_peligro}
                        onChange={(event) =>
                          handleIpercChange(row.localId, "consecuencia_peligro", event.target.value)
                        }
                        disabled={!canEdit || !isEditing}
                        className={tableTextareaClassName}
                        placeholder="Describe la consecuencia o riesgo."
                      />
                    </td>
                    {EVALUATION_OPTIONS.map((option) => (
                      <td
                        key={`${row.localId}-eval-iperc-${option.value}`}
                        className="border-b border-r border-slate-300 p-0 align-middle"
                      >
                        <EvaluationCell
                          currentValue={row.evaluacion_iperc}
                          option={option}
                          disabled={!canEdit || !isEditing}
                          onSelect={() =>
                            handleIpercChange(row.localId, "evaluacion_iperc", option.value)
                          }
                        />
                      </td>
                    ))}
                    <td className="border-b border-r border-slate-300 p-0 align-top">
                      <div className="min-h-[168px] divide-y divide-slate-200">
                        {row.gestiones.map((gestion, index) => (
                          <div key={gestion.localId} className="px-3 py-2">
                            <div className="mb-1 flex items-center justify-between gap-3">
                              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                Medida {String(index + 1).padStart(2, "0")}
                              </span>
                              {isEditing ? (
                                <RemoveInlineButton
                                  label="Borrar"
                                  onClick={() =>
                                    handleRemoveGestion(row.localId, gestion.localId)
                                  }
                                />
                              ) : null}
                            </div>
                            <textarea
                              value={gestion.implementacion}
                              onChange={(event) =>
                                handleGestionChange(
                                  row.localId,
                                  gestion.localId,
                                  "implementacion",
                                  event.target.value
                                )
                              }
                              disabled={!canEdit || !isEditing}
                              className={controlTextareaClassName}
                              placeholder="Describe la medida de control a implementar."
                            />
                          </div>
                        ))}

                        {canEdit && isEditing ? (
                          <div className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => handleAddGestion(row.localId)}
                              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#173569] transition hover:text-[#0f2346]"
                            >
                              <Plus className="h-4 w-4" />
                              Agregar medida
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </td>
                    {EVALUATION_OPTIONS.map((option, index) => (
                      <td
                        key={`${row.localId}-eval-residual-${option.value}`}
                        className={[
                          "border-b border-slate-300 p-0 align-middle",
                          index < EVALUATION_OPTIONS.length - 1 ? "border-r" : "",
                        ].join(" ")}
                      >
                        <EvaluationCell
                          currentValue={row.evaluacion_riesgo_residual}
                          option={option}
                          disabled={!canEdit || !isEditing}
                          onSelect={() =>
                            handleIpercChange(
                              row.localId,
                              "evaluacion_riesgo_residual",
                              option.value
                            )
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>

          {canEdit && isEditing ? (
            <div className="px-6 py-4">
              <TableActionButton
                onClick={handleAddIpercRow}
                tone="primary"
                className="rounded-2xl px-5 py-2.5"
              >
                <Plus className="h-4 w-4" />
                Agregar fila IPERC
              </TableActionButton>
            </div>
          ) : null}
        </div>

        <div className="border-b border-slate-200 px-6 py-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className={sectionTitleClassName}>
              SECUENCIA PARA CONTROLAR EL PELIGRO Y REDUCIR EL RIESGO
            </h3>

            {canEdit && isEditing ? (
              <TableActionButton
                onClick={handleAddSecuencia}
                tone="primary"
                className="rounded-2xl px-4 py-2"
              >
                <Plus className="h-4 w-4" />
                Agregar secuencia
              </TableActionButton>
            ) : null}
          </div>

          <div className="mt-4 space-y-3">
            {secuencias.length === 0 && !isEditing ? (
              <ReadTextBlock value="" />
            ) : null}
            {secuencias.map((secuencia, index) => (
              <div key={secuencia.localId} className="border-b border-slate-200 py-3 last:border-b-0">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Actividad {String(index + 1).padStart(2, "0")}
                  </div>
                  {isEditing ? (
                    <RemoveInlineButton
                      label="Borrar secuencia"
                      onClick={() => handleRemoveSecuencia(secuencia.localId)}
                    />
                  ) : null}
                </div>
                {isEditing ? (
                  <textarea
                    value={secuencia.actividad}
                    onChange={(event) => handleSecuenciaChange(secuencia.localId, event.target.value)}
                    disabled={!canEdit || !isEditing}
                    className={`${textareaClassName} mt-0 min-h-[88px] resize-y`}
                    placeholder="Describe la secuencia o accion para controlar el peligro."
                  />
                ) : (
                  <ReadTextBlock value={secuencia.actividad} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-6">
          <h3 className={sectionTitleClassName}>DATOS DE LOS SUPERVISORES</h3>

          {isEditing ? (
            <>
              <div className="mt-4 grid gap-4 xl:grid-cols-4">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Hora
                  </span>
                  <input
                    type="time"
                    value={supervisorPendiente.hora}
                    onChange={(event) => handleSupervisorChange("hora", event.target.value)}
                    disabled={!canEdit || !isEditing}
                    className={inputClassName}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Apellidos
                  </span>
                  <input
                    type="text"
                    value={supervisorPendiente.apellidos}
                    onChange={(event) => handleSupervisorChange("apellidos", event.target.value)}
                    disabled={!canEdit || !isEditing}
                    className={inputClassName}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Nombres
                  </span>
                  <input
                    type="text"
                    value={supervisorPendiente.nombres}
                    onChange={(event) => handleSupervisorChange("nombres", event.target.value)}
                    disabled={!canEdit || !isEditing}
                    className={inputClassName}
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    DNI
                  </span>
                  <input
                    type="text"
                    value={supervisorPendiente.dni}
                    onChange={(event) => handleSupervisorChange("dni", event.target.value)}
                    disabled={!canEdit || !isEditing}
                    className={inputClassName}
                  />
                </label>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Observaciones
                  </span>
                  <textarea
                    value={supervisorPendiente.observaciones}
                    onChange={(event) => handleSupervisorChange("observaciones", event.target.value)}
                    disabled={!canEdit || !isEditing}
                    className={`${inputClassName} min-h-[120px] resize-y`}
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
                        handleSupervisorChange("firmaFile", event.target.files?.[0] || null)
                      }
                      disabled={!canEdit || !isEditing}
                      className="w-full text-sm text-slate-500 file:mr-2 file:rounded-xl file:border-0 file:bg-[#eef4ff] file:px-3 file:py-2 file:font-semibold file:text-[#173569]"
                    />

                    {supervisorPendiente.firmaFile ? (
                      <p className="mt-3 text-xs text-slate-500">
                        Archivo preparado: {supervisorPendiente.firmaFile.name}
                      </p>
                    ) : supervisorPendiente.firmaUrl ? (
                      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                        <img
                          src={supervisorPendiente.firmaUrl}
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
            </>
          ) : (
            <>
              <div className="mt-4 grid gap-4 xl:grid-cols-4">
                {[
                  { label: "Hora", value: supervisorPendiente.hora },
                  { label: "Apellidos", value: supervisorPendiente.apellidos },
                  { label: "Nombres", value: supervisorPendiente.nombres },
                  { label: "DNI", value: supervisorPendiente.dni },
                ].map((field) => (
                  <div key={field.label}>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {field.label}
                    </div>
                    <div className="mt-2 text-sm text-slate-700">
                      {displayTextValue(field.value)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Observaciones
                  </div>
                  <div className="mt-2">
                    <ReadTextBlock value={supervisorPendiente.observaciones} />
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Firma
                  </div>
                  {supervisorPendiente.firmaUrl ? (
                    <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200">
                      <img
                        src={supervisorPendiente.firmaUrl}
                        alt="Firma del supervisor"
                        className="h-32 w-full object-contain bg-white"
                      />
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-slate-700">Sin firma registrada.</div>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="mt-6 flex items-center justify-between gap-4">
            <h4 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-900">
              Medidas correctivas
            </h4>

            {canEdit && isEditing ? (
              <TableActionButton
                onClick={handleAddMedida}
                tone="success"
                className="rounded-2xl px-4 py-2"
              >
                <Plus className="h-4 w-4" />
                Agregar medida correctiva
              </TableActionButton>
            ) : null}
          </div>

          <div className="mt-4 space-y-3">
            {medidas.length === 0 && !isEditing ? (
              <ReadTextBlock value="" />
            ) : null}
            {medidas.map((medida, index) => (
              <div key={medida.localId} className="border-b border-slate-200 py-3 last:border-b-0">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Detalle {String(index + 1).padStart(2, "0")}
                  </div>
                  {isEditing ? (
                    <RemoveInlineButton
                      label="Borrar medida"
                      onClick={() => handleRemoveMedida(medida.localId)}
                    />
                  ) : null}
                </div>
                {isEditing ? (
                  <textarea
                    value={medida.detalle}
                    onChange={(event) => handleMedidaChange(medida.localId, event.target.value)}
                    disabled={!canEdit || !isEditing}
                    className={`${textareaClassName} mt-0 min-h-[96px] resize-y`}
                    placeholder="Registra la medida correctiva asociada al supervisor."
                  />
                ) : (
                  <ReadTextBlock value={medida.detalle} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
