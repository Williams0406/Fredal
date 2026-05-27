"use client";

import TableActionButton from "@/components/ui/TableActionButton";

const cellInputClassName =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[#173569] focus:ring-2 focus:ring-[#EAF1FF]";

const cellTextareaClassName = `${cellInputClassName} min-h-[88px] resize-y`;

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

function RichCell({ value, emptyLabel }) {
  if (!value) {
    return <span className="text-slate-400">{emptyLabel}</span>;
  }

  return (
    <div
      className="prose prose-sm max-w-none min-w-[220px] text-slate-600"
      dangerouslySetInnerHTML={{ __html: value }}
    />
  );
}

function getFlowTone(tipoNodo = "actividad") {
  const toneMap = {
    inicio: {
      border: "border-emerald-300",
      bg: "bg-emerald-50",
      text: "text-emerald-900",
      badge: "border-emerald-200 bg-emerald-100 text-emerald-700",
      line: "bg-emerald-200",
      arrow: "border-t-emerald-500",
    },
    fin: {
      border: "border-slate-400",
      bg: "bg-slate-100",
      text: "text-slate-800",
      badge: "border-slate-200 bg-white text-slate-600",
      line: "bg-slate-300",
      arrow: "border-t-slate-500",
    },
    decision: {
      border: "border-amber-300",
      bg: "bg-amber-50",
      text: "text-amber-900",
      badge: "border-amber-200 bg-amber-100 text-amber-700",
      line: "bg-amber-200",
      arrow: "border-t-amber-500",
    },
    actividad: {
      border: "border-[#bfd2ff]",
      bg: "bg-[#eef4ff]",
      text: "text-[#173569]",
      badge: "border-[#d6e4ff] bg-white text-[#173569]",
      line: "bg-[#c5d8ff]",
      arrow: "border-t-[#173569]",
    },
  };

  return toneMap[tipoNodo] || toneMap.actividad;
}

function ActivityFlowLabel({ actividad }) {
  return (
    <span
      className="block text-center text-[12px] font-semibold uppercase leading-4"
      style={{
        display: "-webkit-box",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: 2,
        overflow: "hidden",
      }}
      title={actividad || "Sin actividad"}
    >
      {actividad || "Sin actividad"}
    </span>
  );
}

function ActivityFlowCell({ detalle, isFirst, isLast }) {
  const tone = getFlowTone(detalle.tipo_nodo);
  const isDecision = detalle.tipo_nodo === "decision";
  const isEvent = detalle.tipo_nodo === "inicio" || detalle.tipo_nodo === "fin";
  const isEnd = detalle.tipo_nodo === "fin";
  const nodeHalfHeight = isEvent ? 39 : 36;
  const topConnectorHeight = `calc(50% - ${nodeHalfHeight}px)`;
  const bottomConnectorOffset = `calc(50% + ${nodeHalfHeight}px)`;

  return (
    <div className="relative flex min-h-[112px] min-w-[248px] items-center justify-center py-2">
      {!isFirst ? (
        <div
          className="absolute left-1/2 top-0 flex -translate-x-1/2 flex-col items-center"
          style={{ height: topConnectorHeight }}
        >
          <div className={["w-px flex-1", tone.line].join(" ")} />
          <div
            className={[
              "h-0 w-0 border-l-[5px] border-r-[5px] border-t-[8px] border-l-transparent border-r-transparent",
              tone.arrow,
            ].join(" ")}
          />
        </div>
      ) : null}

      {!isLast ? (
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2"
          style={{ top: bottomConnectorOffset }}
        >
          <div className={["h-full w-px", tone.line].join(" ")} />
        </div>
      ) : null}

      <div className="relative z-10 flex items-center justify-center">
        {isDecision ? (
          <div className="relative flex h-[72px] w-[72px] items-center justify-center">
            <div
              className={[
                "absolute inset-0 rotate-45 rounded-[16px] border-2 shadow-[0_12px_26px_rgba(245,158,11,0.08)]",
                tone.border,
                tone.bg,
              ].join(" ")}
            />
            <div className={["relative z-10 w-[60%]", tone.text].join(" ")}>
              <ActivityFlowLabel actividad={detalle.actividad} />
            </div>
          </div>
        ) : null}

        {isEvent ? (
          <div className="relative flex h-[78px] w-[78px] items-center justify-center">
            <div
              className={[
                "absolute inset-0 rounded-full border-2 shadow-[0_12px_26px_rgba(15,23,42,0.08)]",
                tone.border,
                tone.bg,
              ].join(" ")}
            />
            {isEnd ? (
              <div className="absolute inset-[8px] rounded-full border-[3px] border-slate-500/80" />
            ) : null}
            <div className={["relative z-10 w-[62%]", tone.text].join(" ")}>
              <ActivityFlowLabel actividad={detalle.actividad} />
            </div>
          </div>
        ) : null}

        {!isDecision && !isEvent ? (
          <div
            className={[
              "relative flex h-[72px] w-[220px] items-center justify-center rounded-[22px] border-2 px-4 shadow-[0_12px_28px_rgba(23,53,105,0.08)]",
              tone.border,
              tone.bg,
            ].join(" ")}
          >
            <div className={["w-full", tone.text].join(" ")}>
              <ActivityFlowLabel actividad={detalle.actividad} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DraftActivityFlowCell({ draft, onDraftChange }) {
  return (
    <div className="flex min-h-[112px] min-w-[248px] items-center justify-center py-2">
      <div className="relative flex h-[72px] w-[220px] items-center justify-center rounded-[22px] border-2 border-dashed border-[#bfd2ff] bg-white px-4 shadow-[0_12px_28px_rgba(23,53,105,0.05)]">
        <input
          type="text"
          value={draft.actividad}
          onChange={(event) => onDraftChange?.(draft.clientId, "actividad", event.target.value)}
          placeholder="Actividad"
          className="w-full border-0 bg-transparent px-1 text-center text-sm font-semibold uppercase text-[#173569] outline-none placeholder:text-[#7a98d0]"
        />
      </div>
    </div>
  );
}

function DraftResponsableSelect({ draft, onDraftChange, responsableOptions = [] }) {
  const options = buildResponsableOptions(responsableOptions, draft.responsable);

  return (
    <select
      value={draft.responsable}
      onChange={(event) => onDraftChange?.(draft.clientId, "responsable", event.target.value)}
      className={`${cellInputClassName} min-w-[180px]`}
    >
      <option value="">Selecciona un responsable</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export default function DetalleDocumentoEstandarizadoTable({
  detalles = [],
  loading = false,
  canManage = false,
  responsableOptions = [],
  draftRows = [],
  savingDraftKey = null,
  onAddDraft,
  onDraftChange,
  onDraftFilesChange,
  onRemoveDraft,
  onSaveDraft,
}) {
  const hasDraftRows = draftRows.length > 0;

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,35,70,0.08)]">
      <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-6 py-5">
        <h2 className="text-lg font-semibold text-slate-900">Vista Documento</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50/90">
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <th className="px-6 py-4">Nro</th>
              <th className="px-6 py-4">Recurso</th>
              <th className="px-6 py-4">Actividad</th>
              <th className="px-6 py-4">Detalle de actividad</th>
              <th className="px-6 py-4">Soporte visual</th>
              <th className="px-6 py-4">Responsable</th>
              <th className="px-6 py-4">Nota importante</th>
              <th className="px-6 py-4">Consideraciones</th>
              <th className="px-6 py-4">Accion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-sm text-slate-500">
                  Cargando detalle del documento...
                </td>
              </tr>
            ) : null}

            {!loading && detalles.length === 0 && !hasDraftRows ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-sm text-slate-500">
                  No hay pasos registrados para este documento.
                </td>
              </tr>
            ) : null}

            {!loading
              ? detalles.map((detalle, index) => (
                  <tr key={detalle.id} className="align-top transition hover:bg-slate-50/70">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                      {detalle.numero}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{detalle.recurso}</td>
                    <td className="px-4 py-2">
                      <ActivityFlowCell
                        detalle={detalle}
                        isFirst={index === 0}
                        isLast={index === detalles.length - 1}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <RichCell value={detalle.detalle_actividad} emptyLabel="Sin detalle" />
                    </td>
                    <td className="px-6 py-4">
                      {detalle.soportes_visuales_count ? (
                        <div className="space-y-2">
                          <span className="inline-flex rounded-full border border-[#d6e4ff] bg-[#eef4ff] px-3 py-1 text-xs font-semibold text-[#173569]">
                            {detalle.soportes_visuales_count} imagen(es)
                          </span>
                          {Array.isArray(detalle.soportes_visuales) &&
                          detalle.soportes_visuales.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {detalle.soportes_visuales.slice(0, 3).map((soporte) => (
                                <img
                                  key={soporte.id}
                                  src={soporte.imagen_url || soporte.imagen}
                                  alt="Soporte visual"
                                  className="h-12 w-12 rounded-xl border border-slate-200 object-cover"
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">Sin imagenes</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {detalle.responsable || "Sin responsable"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <RichCell value={detalle.nota_importante} emptyLabel="Sin nota" />
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <RichCell
                        value={detalle.consideraciones}
                        emptyLabel="Sin consideraciones"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Registrado
                      </span>
                    </td>
                  </tr>
                ))
              : null}

            {!loading
              ? draftRows.map((draft) => {
                  const isSaving = savingDraftKey === draft.clientId;

                  return (
                    <tr key={draft.clientId} className="align-top bg-[#f8fbff]">
                      <td className="px-4 py-4">
                        <div className="inline-flex min-w-[88px] rounded-xl border border-[#d6e4ff] bg-white px-3 py-2 text-sm font-semibold text-[#173569]">
                          {draft.numero}
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          Secuencia automatica del flujo
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="text"
                          value={draft.recurso}
                          onChange={(event) =>
                            onDraftChange?.(draft.clientId, "recurso", event.target.value)
                          }
                          placeholder="Recurso"
                          className={`${cellInputClassName} min-w-[180px]`}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <DraftActivityFlowCell
                          draft={draft}
                          onDraftChange={onDraftChange}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <textarea
                          value={draft.detalle_actividad}
                          onChange={(event) =>
                            onDraftChange?.(
                              draft.clientId,
                              "detalle_actividad",
                              event.target.value
                            )
                          }
                          placeholder="Detalle de actividad"
                          className={`${cellTextareaClassName} min-w-[240px]`}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="min-w-[190px]">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(event) =>
                              onDraftFilesChange?.(
                                draft.clientId,
                                Array.from(event.target.files || [])
                              )
                            }
                            className="w-full text-xs text-slate-500 file:mr-2 file:rounded-xl file:border-0 file:bg-[#eef4ff] file:px-3 file:py-2 file:font-semibold file:text-[#173569]"
                          />
                          <p className="mt-2 text-xs text-slate-500">
                            {draft.files?.length
                              ? `${draft.files.length} imagen(es) seleccionada(s)`
                              : "Adjunta imagenes opcionales"}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <DraftResponsableSelect
                          draft={draft}
                          onDraftChange={onDraftChange}
                          responsableOptions={responsableOptions}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <textarea
                          value={draft.nota_importante}
                          onChange={(event) =>
                            onDraftChange?.(
                              draft.clientId,
                              "nota_importante",
                              event.target.value
                            )
                          }
                          placeholder="Nota importante"
                          className={`${cellTextareaClassName} min-w-[220px]`}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <textarea
                          value={draft.consideraciones}
                          onChange={(event) =>
                            onDraftChange?.(
                              draft.clientId,
                              "consideraciones",
                              event.target.value
                            )
                          }
                          placeholder="Consideraciones"
                          className={`${cellTextareaClassName} min-w-[220px]`}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex min-w-[140px] flex-col gap-2">
                          <TableActionButton
                            onClick={() => onSaveDraft?.(draft.clientId)}
                            disabled={isSaving}
                            tone="success"
                            className="justify-center"
                          >
                            {isSaving ? "Guardando..." : "Guardar"}
                          </TableActionButton>
                          <TableActionButton
                            onClick={() => onRemoveDraft?.(draft.clientId)}
                            disabled={isSaving}
                            tone="neutral"
                            className="justify-center"
                          >
                            Cancelar
                          </TableActionButton>
                        </div>
                      </td>
                    </tr>
                  );
                })
              : null}
          </tbody>
        </table>
      </div>

      {canManage ? (
        <div className="border-t border-slate-200 bg-slate-50/70 px-6 py-4">
          <button
            type="button"
            onClick={onAddDraft}
            className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-[#173569]/30 bg-white px-4 py-2.5 text-sm font-semibold text-[#173569] transition hover:border-[#173569] hover:bg-[#eef4ff]"
          >
            + Agregar nuevo registro
          </button>
        </div>
      ) : null}
    </div>
  );
}
