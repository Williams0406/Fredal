"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  PencilLine,
  Save,
  Workflow,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  conexionEstandarizacionAPI,
  detalleEstandarizacionAPI,
  encabezadoEstandarizacionAPI,
  tareaPorEstandarizarAPI,
  trabajadorAPI,
} from "@/lib/api";
import DetalleDocumentoEstandarizadoTable from "@/components/procesos/DetalleDocumentoEstandarizadoTable";
import ProcesoFichaView from "@/components/procesos/ProcesoFichaView";
import ProcesoFlowView from "@/components/procesos/ProcesoFlowView";
import TableActionButton from "@/components/ui/TableActionButton";

const MANAGER_ROLES = [
  "admin",
  "Jefe de Tecnicos",
  "Jefe de Almaceneros",
  "Jefe de Mantenimiento",
  "ManageCompras",
];

const VIEW_OPTIONS = [
  {
    key: "proceso",
    label: "Vista Proceso",
    description: "Trabaja el flujo y la ficha tecnica en paralelo.",
    icon: Workflow,
  },
  {
    key: "documento",
    label: "Vista Documento",
    description: "Revisa el documento final y agrega registros desde la tabla.",
    icon: FileText,
  },
];

function normalizeCollection(response) {
  const payload = response?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function getTodayValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatDisplayDate(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getTrabajadorOption(trabajador) {
  const fullName = `${trabajador?.nombres || ""} ${trabajador?.apellidos || ""}`.trim();
  if (!fullName) return null;
  return {
    value: fullName,
    label: fullName,
  };
}

function createDraftRow(nextNumero = 1) {
  return {
    clientId: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    numero: String(nextNumero),
    recurso: "",
    actividad: "",
    detalle_actividad: "",
    responsable: "",
    nota_importante: "",
    consideraciones: "",
    files: [],
  };
}

function getApiErrorMessage(error, fallbackMessage) {
  const data = error?.response?.data;

  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "string") return data;

  if (data && typeof data === "object") {
    const firstValue = Object.values(data)[0];
    if (Array.isArray(firstValue) && firstValue.length > 0) {
      return String(firstValue[0]);
    }
    if (typeof firstValue === "string") {
      return firstValue;
    }
  }

  return fallbackMessage;
}

function resequenceDraftRows(rows, baseCount) {
  return rows.map((row, index) => ({
    ...row,
    numero: String(baseCount + index + 1),
  }));
}

export default function ProcesoDetallePage() {
  const params = useParams();
  const tareaId = params?.id;
  const { roles = [] } = useAuth();
  const [tarea, setTarea] = useState(null);
  const [encabezado, setEncabezado] = useState(null);
  const [detalles, setDetalles] = useState([]);
  const [conexiones, setConexiones] = useState([]);
  const [draftRows, setDraftRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingHeader, setSavingHeader] = useState(false);
  const [savingDraftKey, setSavingDraftKey] = useState(null);
  const [savingDetailId, setSavingDetailId] = useState(null);
  const [creatingFlowBlock, setCreatingFlowBlock] = useState(false);
  const [deletingDetailId, setDeletingDetailId] = useState(null);
  const [markingCompleted, setMarkingCompleted] = useState(false);
  const [error, setError] = useState("");
  const [headerForm, setHeaderForm] = useState({ fecha: "" });
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [activeView, setActiveView] = useState("proceso");
  const [selectedDetailId, setSelectedDetailId] = useState(null);
  const [trabajadores, setTrabajadores] = useState([]);

  const canManage = useMemo(
    () => roles.some((role) => MANAGER_ROLES.includes(role)),
    [roles]
  );

  const responsableOptions = useMemo(() => {
    const seen = new Set();
    return trabajadores
      .map(getTrabajadorOption)
      .filter((option) => option && !seen.has(option.value) && seen.add(option.value));
  }, [trabajadores]);

  const ensureEncabezado = async (currentTareaId) => {
    const existingResponse = await encabezadoEstandarizacionAPI.list({
      tarea_por_estandarizar: currentTareaId,
    });
    const existing = normalizeCollection(existingResponse)[0];
    if (existing) return existing;

    try {
      const createResponse = await encabezadoEstandarizacionAPI.create({
        tarea_por_estandarizar: Number(currentTareaId),
        fecha: getTodayValue(),
      });
      return createResponse.data;
    } catch (createError) {
      const fallbackResponse = await encabezadoEstandarizacionAPI.list({
        tarea_por_estandarizar: currentTareaId,
      });
      const fallback = normalizeCollection(fallbackResponse)[0];
      if (fallback) return fallback;
      throw createError;
    }
  };

  const refreshProcesoData = async (encabezadoId) => {
    const [detallesResponse, conexionesResponse] = await Promise.all([
      detalleEstandarizacionAPI.list({
        encabezado_documento: encabezadoId,
      }),
      conexionEstandarizacionAPI.list({
        documento: encabezadoId,
      }),
    ]);

    const nextDetalles = normalizeCollection(detallesResponse);
    const nextConexiones = normalizeCollection(conexionesResponse);
    setDetalles(nextDetalles);
    setConexiones(nextConexiones);
    return nextDetalles;
  };

  const loadDocumento = async () => {
    if (!tareaId) return;

    setLoading(true);
    setError("");

    try {
      const [tareaResponse, trabajadoresResponse] = await Promise.all([
        tareaPorEstandarizarAPI.retrieve(tareaId),
        trabajadorAPI.list().catch(() => ({ data: [] })),
      ]);
      const nextTarea = tareaResponse.data;
      const nextEncabezado = await ensureEncabezado(tareaId);
      const nextDetalles = await refreshProcesoData(nextEncabezado.id);

      setTarea(nextTarea);
      setEncabezado(nextEncabezado);
      setTrabajadores(normalizeCollection(trabajadoresResponse));
      setHeaderForm({ fecha: nextEncabezado.fecha || "" });
      setDraftRows([]);
      setIsEditingHeader(false);
      setSelectedDetailId((current) => {
        if (current && nextDetalles.some((detalle) => detalle.id === current)) {
          return current;
        }
        return nextDetalles[0]?.id || null;
      });
    } catch (loadError) {
      setError(
        getApiErrorMessage(
          loadError,
          "No se pudo cargar el documento de estandarizacion."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocumento();
  }, [tareaId]);

  useEffect(() => {
    if (detalles.length === 0) {
      setSelectedDetailId(null);
      return;
    }

    if (!selectedDetailId || !detalles.some((detalle) => detalle.id === selectedDetailId)) {
      setSelectedDetailId(detalles[0].id);
    }
  }, [detalles, selectedDetailId]);

  const handleHeaderChange = (event) => {
    const { name, value } = event.target;
    setHeaderForm((current) => ({
      ...current,
      [name]: value,
    }));
    if (error) setError("");
  };

  const handleEditHeader = () => {
    setHeaderForm({ fecha: encabezado?.fecha || "" });
    setIsEditingHeader(true);
    if (error) setError("");
  };

  const handleCancelHeaderEdit = () => {
    setHeaderForm({ fecha: encabezado?.fecha || "" });
    setIsEditingHeader(false);
    if (error) setError("");
  };

  const handleSaveHeader = async () => {
    if (!canManage || !encabezado?.id) return;

    setSavingHeader(true);
    setError("");

    try {
      const response = await encabezadoEstandarizacionAPI.patch(encabezado.id, {
        fecha: headerForm.fecha,
      });
      setEncabezado(response.data);
      setHeaderForm({ fecha: response.data.fecha || "" });
      setIsEditingHeader(false);
    } catch (saveError) {
      setError(
        getApiErrorMessage(saveError, "No se pudo actualizar el encabezado.")
      );
    } finally {
      setSavingHeader(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!canManage || !tarea?.id || tarea.desarrollado) return;

    setMarkingCompleted(true);
    setError("");

    try {
      const response = await tareaPorEstandarizarAPI.patch(tarea.id, {
        desarrollado: true,
      });
      setTarea(response.data);
    } catch (completeError) {
      setError(
        getApiErrorMessage(
          completeError,
          "No se pudo marcar la tarea como completada."
        )
      );
    } finally {
      setMarkingCompleted(false);
    }
  };

  const handleSelectDetail = (detailId) => {
    setSelectedDetailId(detailId);
  };

  const handleCreateFlowBlock = async ({ actividad, tipo_nodo }) => {
    if (!encabezado?.id || !canManage) return;

    setCreatingFlowBlock(true);
    setError("");

    try {
      const response = await detalleEstandarizacionAPI.createFlowBlock({
        encabezado_documento: encabezado.id,
        actividad,
        tipo_nodo,
      });
      const createdDetail = response.data;
      const nextDetalles = await refreshProcesoData(encabezado.id);
      setDraftRows((current) => resequenceDraftRows(current, nextDetalles.length));
      setSelectedDetailId(createdDetail.id);
      setActiveView("proceso");
      return createdDetail;
    } catch (createError) {
      setError(
        getApiErrorMessage(
          createError,
          "No se pudo crear el bloque del flujo."
        )
      );
      throw createError;
    } finally {
      setCreatingFlowBlock(false);
    }
  };

  const handleDeleteBlock = async (detailId) => {
    if (!encabezado?.id || !canManage) return;

    const detailToDelete = detalles.find((detalle) => detalle.id === detailId);
    if (!detailToDelete) return;

    const confirmDelete = window.confirm(
      `Se eliminara el bloque "${detailToDelete.actividad || `Nodo ${detailToDelete.numero}`}" y la secuencia se reordenara automaticamente.`
    );
    if (!confirmDelete) return;

    const orderedDetails = [...detalles].sort((left, right) => left.numero - right.numero);
    const deletedIndex = orderedDetails.findIndex((detalle) => detalle.id === detailId);
    const fallbackId =
      orderedDetails[deletedIndex + 1]?.id ||
      orderedDetails[deletedIndex - 1]?.id ||
      null;

    setDeletingDetailId(detailId);
    setError("");

    try {
      await detalleEstandarizacionAPI.delete(detailId);
      const nextDetalles = await refreshProcesoData(encabezado.id);
      setDraftRows((current) => resequenceDraftRows(current, nextDetalles.length));
      setSelectedDetailId(
        nextDetalles.some((detalle) => detalle.id === fallbackId)
          ? fallbackId
          : nextDetalles[0]?.id || null
      );
    } catch (deleteError) {
      setError(
        getApiErrorMessage(deleteError, "No se pudo eliminar el bloque del flujo.")
      );
    } finally {
      setDeletingDetailId(null);
    }
  };

  const handleSaveDetail = async (detailId, form, files) => {
    if (!canManage || !encabezado?.id) return;

    setSavingDetailId(detailId);
    setError("");

    try {
      const formData = new FormData();
      formData.append("tipo_nodo", form.tipo_nodo);
      formData.append("actividad", form.actividad.trim());
      formData.append("recurso", form.recurso.trim());
      formData.append("detalle_actividad", form.detalle_actividad.trim());
      formData.append("responsable", form.responsable.trim());
      formData.append("nota_importante", form.nota_importante.trim());
      formData.append("consideraciones", form.consideraciones.trim());
      formData.append("posicion_x", String(form.posicion_x ?? 0));
      formData.append("posicion_y", String(form.posicion_y ?? 0));
      (files || []).forEach((file) => {
        formData.append("nuevas_imagenes", file);
      });

      await detalleEstandarizacionAPI.patch(detailId, formData, true);
      const nextDetalles = await refreshProcesoData(encabezado.id);
      setDraftRows((current) => resequenceDraftRows(current, nextDetalles.length));
      setSelectedDetailId(detailId);
    } catch (saveError) {
      setError(
        getApiErrorMessage(
          saveError,
          "No se pudo actualizar la ficha del bloque."
        )
      );
      throw saveError;
    } finally {
      setSavingDetailId(null);
    }
  };

  const handleRenameFlowBlock = async (detailId, actividad) => {
    if (!canManage || !encabezado?.id) return;

    setSavingDetailId(detailId);
    setError("");

    try {
      await detalleEstandarizacionAPI.patch(detailId, {
        actividad,
      });
      const nextDetalles = await refreshProcesoData(encabezado.id);
      setDraftRows((current) => resequenceDraftRows(current, nextDetalles.length));
      setSelectedDetailId(detailId);
    } catch (saveError) {
      setError(
        getApiErrorMessage(
          saveError,
          "No se pudo actualizar el nombre del bloque."
        )
      );
      throw saveError;
    } finally {
      setSavingDetailId(null);
    }
  };

  const handleAddDraftRow = () => {
    setDraftRows((current) => [
      ...current,
      createDraftRow(detalles.length + current.length + 1),
    ]);
    if (error) setError("");
  };

  const handleDraftChange = (clientId, field, value) => {
    setDraftRows((current) =>
      current.map((row) =>
        row.clientId === clientId
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
    if (error) setError("");
  };

  const handleDraftFilesChange = (clientId, files) => {
    setDraftRows((current) =>
      current.map((row) =>
        row.clientId === clientId
          ? {
              ...row,
              files,
            }
          : row
      )
    );
    if (error) setError("");
  };

  const handleRemoveDraft = (clientId) => {
    setDraftRows((current) =>
      resequenceDraftRows(
        current.filter((row) => row.clientId !== clientId),
        detalles.length
      )
    );
  };

  const handleSaveDraft = async (clientId) => {
    const draft = draftRows.find((row) => row.clientId === clientId);
    if (!draft || !encabezado?.id) return;

    setSavingDraftKey(clientId);
    setError("");

    try {
      const formData = new FormData();
      formData.append("encabezado_documento", String(encabezado.id));
      formData.append("recurso", draft.recurso.trim());
      formData.append("actividad", draft.actividad.trim());
      formData.append("detalle_actividad", draft.detalle_actividad.trim());
      formData.append("responsable", draft.responsable.trim());
      formData.append("nota_importante", draft.nota_importante.trim());
      formData.append("consideraciones", draft.consideraciones.trim());

      (draft.files || []).forEach((file) => {
        formData.append("nuevas_imagenes", file);
      });

      await detalleEstandarizacionAPI.create(formData);
      const nextDetalles = await refreshProcesoData(encabezado.id);
      setDraftRows((current) =>
        resequenceDraftRows(
          current.filter((row) => row.clientId !== clientId),
          nextDetalles.length
        )
      );
      setActiveView("documento");
    } catch (saveError) {
      setError(
        getApiErrorMessage(
          saveError,
          "No se pudo guardar el detalle del documento."
        )
      );
    } finally {
      setSavingDraftKey(null);
    }
  };

  const sideBySidePanelHeight = "xl:h-[calc(100vh-10rem)]";
  const isProcesoView = activeView === "proceso";
  const isDocumentoView = activeView === "documento";
  const taskTitle = (tarea?.nombre_tarea || encabezado?.tarea_nombre || "Sin tarea asociada").toUpperCase();
  const taskArea = (encabezado?.area || tarea?.area || "-").toUpperCase();
  const headerCode = encabezado?.codigo || tarea?.codigo || "-";
  const headerRevision = encabezado?.revision_nombre || "Sin trabajador asociado";
  const headerDate = formatDisplayDate(headerForm.fecha || encabezado?.fecha || "");

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 shadow-[0_24px_60px_rgba(15,35,70,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/procesos"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#173569] transition hover:text-[#0f2346]"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a procesos
            </Link>

            <button
              type="button"
              className="inline-flex items-center justify-center rounded-2xl border border-[#173569]/12 bg-[#eef4ff] px-4 py-2.5 text-sm font-semibold text-[#173569]"
            >
              Realizar proceso
            </button>
          </div>

          {canManage ? (
            <TableActionButton
              onClick={handleMarkCompleted}
              tone={tarea?.desarrollado ? "success" : "primary"}
              disabled={loading || markingCompleted || Boolean(tarea?.desarrollado)}
              className="rounded-2xl px-4 py-2.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              {markingCompleted
                ? "Marcando..."
                : tarea?.desarrollado
                  ? "Completado"
                  : "Marcar Completado"}
            </TableActionButton>
          ) : null}
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="space-y-3">
        {canManage ? (
          <div className="flex justify-end gap-2">
            {!isEditingHeader ? (
              <TableActionButton
                onClick={handleEditHeader}
                tone="primary"
                disabled={loading || !encabezado}
                className="rounded-2xl px-4 py-2.5"
              >
                <PencilLine className="h-4 w-4" />
                Editar
              </TableActionButton>
            ) : (
              <>
                <TableActionButton
                  onClick={handleCancelHeaderEdit}
                  tone="neutral"
                  disabled={savingHeader}
                  className="rounded-2xl px-4 py-2.5"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </TableActionButton>
                <TableActionButton
                  onClick={handleSaveHeader}
                  tone="success"
                  disabled={savingHeader || loading || !encabezado}
                  className="rounded-2xl px-4 py-2.5"
                >
                  <Save className="h-4 w-4" />
                  {savingHeader ? "Guardando..." : "Guardar"}
                </TableActionButton>
              </>
            )}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_24px_60px_rgba(15,35,70,0.08)]">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Cargando documento de estandarizacion...
            </div>
          ) : (
            <div className="px-6 py-6">
              <div className="grid items-start gap-5 lg:grid-cols-[164px_minmax(0,1fr)_292px]">
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
                  <h3 className="text-2xl font-bold uppercase tracking-[0.02em] text-slate-900">
                    {taskTitle}
                  </h3>
                  <p className="pt-2 text-sm text-slate-600">Área: {taskArea}</p>
                </div>

                <div className="grid min-h-[148px] content-start gap-y-3 pt-1 text-sm text-slate-700">
                  <div className="grid grid-cols-[78px_minmax(0,1fr)] items-start gap-x-3">
                    <span className="font-semibold text-slate-900">Código:</span>
                    <span className="text-left">{headerCode}</span>
                  </div>
                  <div className="grid grid-cols-[78px_minmax(0,1fr)] items-start gap-x-3">
                    <span className="font-semibold text-slate-900">Revisión:</span>
                    <span className="text-left">{headerRevision}</span>
                  </div>
                  <div className="grid grid-cols-[78px_minmax(0,1fr)] items-start gap-x-3">
                    <span className="font-semibold text-slate-900">Fecha:</span>
                    {isEditingHeader ? (
                      <input
                        type="date"
                        name="fecha"
                        value={headerForm.fecha}
                        onChange={handleHeaderChange}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 outline-none transition focus:border-[#173569] focus:ring-2 focus:ring-[#EAF1FF]"
                      />
                    ) : (
                      <span className="text-left">{headerDate}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,35,70,0.08)]">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Espacio de trabajo</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Puedes combinar vistas. Cuando activas el flujo, se fija a la izquierda para que
                siempre tengas presente la secuencia mientras completas la ficha o el documento.
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              2 modos de trabajo
            </span>
          </div>
        </div>

        <div className="grid gap-3 p-4 lg:grid-cols-2">
          {VIEW_OPTIONS.map((view) => {
            const Icon = view.icon;
            const isSelected = activeView === view.key;
            return (
              <button
                key={view.key}
                type="button"
                onClick={() => setActiveView(view.key)}
                className={[
                  "rounded-[24px] border px-4 py-4 text-left transition",
                  isSelected
                    ? "border-[#173569] bg-[#eef4ff] text-[#173569] shadow-[0_16px_30px_rgba(23,53,105,0.08)]"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={[
                        "mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl border",
                        isSelected
                          ? "border-[#173569]/15 bg-white text-[#173569]"
                          : "border-slate-200 bg-slate-50 text-slate-500",
                      ].join(" ")}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-sm font-semibold">{view.label}</div>
                      <div className="mt-1 text-sm leading-6 opacity-80">{view.description}</div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {isProcesoView ? (
        <div
          className={[
            "grid gap-6 xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]",
            sideBySidePanelHeight,
          ].join(" ")}
        >
          <div className={sideBySidePanelHeight}>
            <ProcesoFlowView
              detalles={detalles}
              conexiones={conexiones}
              canManage={canManage && Boolean(encabezado?.id)}
              selectedDetailId={selectedDetailId}
              creatingFlowBlock={creatingFlowBlock}
              deletingDetailId={deletingDetailId}
              savingNameDetailId={savingDetailId}
              onSelectDetail={handleSelectDetail}
              onCreateBlock={handleCreateFlowBlock}
              onDeleteBlock={handleDeleteBlock}
              onRenameBlock={handleRenameFlowBlock}
              className="h-full"
            />
          </div>

          <div className={`space-y-6 overflow-y-auto pr-1 ${sideBySidePanelHeight}`}>
            <ProcesoFichaView
              detalles={detalles}
              selectedDetailId={selectedDetailId}
              canManage={canManage && Boolean(encabezado?.id)}
              savingDetailId={savingDetailId}
              responsableOptions={responsableOptions}
              onSelectDetail={handleSelectDetail}
              onSaveDetail={handleSaveDetail}
              showNavigator={false}
              className="h-full"
              bodyClassName="overflow-y-auto"
            />
          </div>
        </div>
      ) : null}

      {isDocumentoView ? (
        <div className="space-y-6">
          <DetalleDocumentoEstandarizadoTable
            detalles={detalles}
            loading={loading}
            canManage={canManage && Boolean(encabezado?.id)}
            responsableOptions={responsableOptions}
            draftRows={draftRows}
            savingDraftKey={savingDraftKey}
            onAddDraft={handleAddDraftRow}
            onDraftChange={handleDraftChange}
            onDraftFilesChange={handleDraftFilesChange}
            onRemoveDraft={handleRemoveDraft}
            onSaveDraft={handleSaveDraft}
          />
        </div>
      ) : null}
    </div>
  );
}
