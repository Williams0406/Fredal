"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, PencilLine, Save, X } from "lucide-react";
import RichTextEditor from "@/components/ui/RichTextEditor";
import TableActionButton from "@/components/ui/TableActionButton";

function getApiErrorMessage(error) {
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

  return "No se pudo actualizar la ficha del bloque.";
}

const inputClassName =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#173569] focus:ring-2 focus:ring-[#EAF1FF]";

function buildResponsableOptions(options = [], currentValue = "") {
  const normalized = Array.isArray(options) ? [...options] : [];
  if (
    currentValue &&
    !normalized.some((option) => option.value === currentValue)
  ) {
    normalized.unshift({
      value: currentValue,
      label: currentValue,
    });
  }
  return normalized;
}

function LabeledLine({ label, value }) {
  return (
    <div className="flex items-start gap-4 text-sm leading-7 text-slate-700">
      <span className="w-32 shrink-0 text-left font-semibold text-slate-900">
        {label}:
      </span>
      <span className="min-w-0 flex-1 text-left">{value || "-"}</span>
    </div>
  );
}

function ContentSection({
  title,
  children,
  className = "",
  titleClassName = "",
  bodyClassName = "",
}) {
  return (
    <section
      className={[
        "rounded-[24px] px-5 py-5",
        className,
      ].join(" ")}
    >
      <h3 className={["text-base font-bold text-slate-900", titleClassName].join(" ")}>
        {title}
      </h3>
      <div className={["mt-4", bodyClassName].join(" ")}>{children}</div>
    </section>
  );
}

function SupportImageCarousel({ images = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
  }, [images]);

  if (!images.length) {
    return (
      <div className="rounded-2xl bg-white/65 px-4 py-10 text-center text-sm text-slate-500">
        Este bloque todavia no tiene soportes visuales.
      </div>
    );
  }

  if (images.length === 1) {
    const image = images[0];
    return (
      <img
        src={image.imagen_url || image.imagen}
        alt="Soporte visual"
        className="h-56 w-full rounded-2xl object-cover"
      />
    );
  }

  const currentImage = images[currentIndex];

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl">
        <img
          src={currentImage.imagen_url || currentImage.imagen}
          alt={`Soporte visual ${currentIndex + 1}`}
          className="h-56 w-full object-cover"
        />

        <button
          type="button"
          onClick={() =>
            setCurrentIndex((current) => (current === 0 ? images.length - 1 : current - 1))
          }
          className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/88 text-slate-700 shadow-[0_10px_22px_rgba(15,35,70,0.12)] transition hover:bg-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() =>
            setCurrentIndex((current) => (current === images.length - 1 ? 0 : current + 1))
          }
          className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/88 text-slate-700 shadow-[0_10px_22px_rgba(15,35,70,0.12)] transition hover:bg-white"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center justify-center gap-2">
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setCurrentIndex(index)}
            className={[
              "h-2.5 rounded-full transition",
              index === currentIndex ? "w-8 bg-[#173569]" : "w-2.5 bg-slate-300 hover:bg-slate-400",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}

export default function ProcesoFichaView({
  detalles = [],
  selectedDetailId = null,
  canManage = false,
  savingDetailId = null,
  responsableOptions = [],
  onSelectDetail,
  onSaveDetail,
  showNavigator = true,
  className = "",
  bodyClassName = "",
}) {
  const selectedDetail = useMemo(
    () => detalles.find((detalle) => detalle.id === selectedDetailId) || null,
    [detalles, selectedDetailId]
  );

  const [form, setForm] = useState(null);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!selectedDetail) {
      setForm(null);
      setFiles([]);
      setError("");
      setIsEditing(false);
      return;
    }

    setForm({
      numero: selectedDetail.numero ?? "",
      tipo_nodo: selectedDetail.tipo_nodo || "actividad",
      actividad: selectedDetail.actividad || "",
      recurso: selectedDetail.recurso || "",
      detalle_actividad: selectedDetail.detalle_actividad || "",
      responsable: selectedDetail.responsable || "",
      nota_importante: selectedDetail.nota_importante || "",
      consideraciones: selectedDetail.consideraciones || "",
    });
    setFiles([]);
    setError("");
    setIsEditing(false);
  }, [selectedDetail]);

  const stepTitle = useMemo(() => {
    if (!form) return "Paso --";
    return `Paso ${String(form.numero || "").padStart(2, "0")} - ${form.actividad || "Sin actividad"}`;
  }, [form]);

  const responsableSelectOptions = useMemo(
    () => buildResponsableOptions(responsableOptions, form?.responsable || ""),
    [form?.responsable, responsableOptions]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
    if (error) setError("");
  };

  const handleRichTextChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    if (error) setError("");
  };

  const handleCancelEdit = () => {
    if (!selectedDetail) return;

    setForm({
      numero: selectedDetail.numero ?? "",
      tipo_nodo: selectedDetail.tipo_nodo || "actividad",
      actividad: selectedDetail.actividad || "",
      recurso: selectedDetail.recurso || "",
      detalle_actividad: selectedDetail.detalle_actividad || "",
      responsable: selectedDetail.responsable || "",
      nota_importante: selectedDetail.nota_importante || "",
      consideraciones: selectedDetail.consideraciones || "",
    });
    setFiles([]);
    setError("");
    setIsEditing(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedDetail || !form || !isEditing) return;

    try {
      await onSaveDetail?.(selectedDetail.id, form, files);
      setFiles([]);
      setError("");
      setIsEditing(false);
    } catch (saveError) {
      setError(getApiErrorMessage(saveError));
    }
  };

  if (detalles.length === 0) {
    return (
      <section
        className={[
          "rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,35,70,0.06)]",
          className,
        ].join(" ")}
      >
        <h2 className="text-lg font-semibold text-slate-900">Vista Ficha</h2>
        <p className="mt-3 text-sm text-slate-500">
          Primero crea al menos un bloque en la vista flujo para poder completar su ficha.
        </p>
      </section>
    );
  }

  return (
    <section
      className={[
        "flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,35,70,0.08)]",
        className,
      ].join(" ")}
    >
      <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-6 py-5">
        <h2 className="text-lg font-semibold text-slate-900">Vista Ficha</h2>
      </div>

      <div
        className={[
          "min-h-0 flex-1 gap-6 p-6",
          showNavigator ? "grid xl:grid-cols-[280px_minmax(0,1fr)]" : "space-y-6",
          bodyClassName,
        ].join(" ")}
      >
        {showNavigator ? (
          <aside className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Bloques del proceso
            </h3>
            <div className="mt-4 space-y-2">
              {detalles.map((detalle) => {
                const isSelected = detalle.id === selectedDetailId;
                return (
                  <button
                    key={detalle.id}
                    type="button"
                    onClick={() => onSelectDetail?.(detalle.id)}
                    className={[
                      "w-full rounded-2xl border px-4 py-3 text-left transition",
                      isSelected
                        ? "border-[#173569] bg-[#eef4ff] text-[#173569]"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
                      Nodo {detalle.numero}
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {detalle.actividad || "Sin actividad"}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        ) : null}

        {selectedDetail && form ? (
          <form
            id={`ficha-form-${selectedDetail.id}`}
            onSubmit={handleSubmit}
            className="space-y-6 pb-2"
          >
            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="space-y-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[#173569]">
                        {`Paso ${String(form.numero || "").padStart(2, "0")} -`}
                      </div>
                      <input
                        type="text"
                        name="actividad"
                        value={form.actividad}
                        onChange={handleChange}
                        className={`${inputClassName} mt-0 text-lg font-semibold`}
                      />
                    </div>
                  ) : (
                    <div className="text-2xl font-semibold tracking-tight text-slate-900">
                      {stepTitle}
                    </div>
                  )}
                </div>

                {canManage ? (
                  <div className="shrink-0">
                    {!isEditing ? (
                      <TableActionButton
                        onClick={() => setIsEditing(true)}
                        tone="primary"
                        className="rounded-2xl px-4 py-2.5"
                      >
                        <PencilLine className="h-4 w-4" />
                        Editar
                      </TableActionButton>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <TableActionButton
                          onClick={handleCancelEdit}
                          tone="neutral"
                          disabled={savingDetailId === selectedDetail.id}
                          className="rounded-2xl px-4 py-2.5"
                        >
                          <X className="h-4 w-4" />
                          Cancelar
                        </TableActionButton>
                        <TableActionButton
                          type="submit"
                          form={`ficha-form-${selectedDetail.id}`}
                          tone="success"
                          disabled={savingDetailId === selectedDetail.id}
                          className="rounded-2xl px-4 py-2.5"
                        >
                          <Save className="h-4 w-4" />
                          {savingDetailId === selectedDetail.id ? "Guardando..." : "Guardar"}
                        </TableActionButton>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {isEditing ? (
                <div className="grid gap-5 xl:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Responsable</label>
                    <select
                      name="responsable"
                      value={form.responsable}
                      onChange={handleChange}
                      className={inputClassName}
                    >
                      <option value="">Selecciona un responsable</option>
                      {responsableSelectOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-700">Recursos/EPP</label>
                    <input
                      type="text"
                      name="recurso"
                      value={form.recurso}
                      onChange={handleChange}
                      className={inputClassName}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <LabeledLine label="Responsable" value={form.responsable || "Sin asignar"} />
                  <LabeledLine
                    label="Recursos/EPP"
                    value={form.recurso || "Sin recurso definido"}
                  />
                </div>
              )}

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(290px,0.88fr)]">
                <ContentSection title="Que hacer? (Paso a Paso)" className="bg-slate-50/75">
                  <RichTextEditor
                    value={form.detalle_actividad}
                    onChange={(value) => handleRichTextChange("detalle_actividad", value)}
                    editable={isEditing}
                    showToolbar={isEditing}
                    minHeightClassName="min-h-[180px]"
                    containerClassName="border-0 bg-transparent"
                    toolbarClassName="rounded-2xl border border-slate-200 bg-white/70"
                    contentClassName="rounded-2xl border border-slate-200 bg-white/70"
                  />
                </ContentSection>

                <ContentSection title="Imagen de Referencia" className="bg-slate-50/75">
                  <SupportImageCarousel
                    images={Array.isArray(selectedDetail.soportes_visuales) ? selectedDetail.soportes_visuales : []}
                  />

                  {canManage && isEditing ? (
                    <div className="mt-4">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(event) => setFiles(Array.from(event.target.files || []))}
                        className="w-full text-sm text-slate-500 file:mr-2 file:rounded-xl file:border-0 file:bg-[#eef4ff] file:px-3 file:py-2 file:font-semibold file:text-[#173569]"
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        {files.length > 0
                          ? `${files.length} imagen(es) preparada(s) para subir`
                          : "Puedes adjuntar nuevas imagenes de referencia."}
                      </p>
                    </div>
                  ) : null}
                </ContentSection>
              </div>

              <ContentSection
                title="Punto Critico / Criterio de aceptacion"
                className="bg-amber-100"
                titleClassName="text-amber-950"
              >
                <RichTextEditor
                  value={form.nota_importante}
                  onChange={(value) => handleRichTextChange("nota_importante", value)}
                  editable={isEditing}
                  showToolbar={isEditing}
                  minHeightClassName="min-h-[120px]"
                  containerClassName="border-0 bg-amber-100"
                  toolbarClassName="border-0 bg-amber-100 px-0 pt-0 pb-3"
                  contentClassName="bg-amber-100 px-0 py-0"
                  editorSpacingClassName="mt-0"
                />
              </ContentSection>

              <ContentSection
                title="Seguridad y medio ambiente"
                className="bg-rose-100"
                titleClassName="text-rose-950"
              >
                <RichTextEditor
                  value={form.consideraciones}
                  onChange={(value) => handleRichTextChange("consideraciones", value)}
                  editable={isEditing}
                  showToolbar={isEditing}
                  minHeightClassName="min-h-[120px]"
                  containerClassName="border-0 bg-rose-100"
                  toolbarClassName="border-0 bg-rose-100 px-0 pt-0 pb-3"
                  contentClassName="bg-rose-100 px-0 py-0"
                  editorSpacingClassName="mt-0"
                />
              </ContentSection>
            </div>
          </form>
        ) : (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
            Selecciona un bloque para ver su ficha.
          </div>
        )}
      </div>
    </section>
  );
}
