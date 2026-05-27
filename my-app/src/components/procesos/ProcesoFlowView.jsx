"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, PencilLine, Plus, Trash2, X } from "lucide-react";
import TableActionButton from "@/components/ui/TableActionButton";

const PLACEHOLDER_ACTIVITY = "Nuevo bloque";

const NODE_OPTIONS = [
  { value: "inicio", label: "Inicio", hint: "Evento" },
  { value: "actividad", label: "Actividad", hint: "Tarea" },
  { value: "decision", label: "Decision", hint: "Gateway" },
  { value: "fin", label: "Fin", hint: "Cierre" },
];

function getNodeTone(tipoNodo, selected = false) {
  const toneMap = {
    inicio: {
      border: "border-emerald-300",
      bg: "bg-emerald-50",
      text: "text-emerald-900",
      badge: "border-emerald-200 bg-emerald-100 text-emerald-700",
      surface: "bg-emerald-50",
      shadow: "shadow-[0_16px_32px_rgba(16,185,129,0.08)]",
    },
    fin: {
      border: "border-slate-400",
      bg: "bg-slate-100",
      text: "text-slate-800",
      badge: "border-slate-200 bg-white text-slate-600",
      surface: "bg-slate-100",
      shadow: "shadow-[0_16px_32px_rgba(15,23,42,0.08)]",
    },
    decision: {
      border: "border-amber-300",
      bg: "bg-amber-50",
      text: "text-amber-900",
      badge: "border-amber-200 bg-amber-100 text-amber-700",
      surface: "bg-amber-50",
      shadow: "shadow-[0_16px_32px_rgba(245,158,11,0.08)]",
    },
    actividad: {
      border: "border-[#bfd2ff]",
      bg: "bg-[#eef4ff]",
      text: "text-[#173569]",
      badge: "border-[#d6e4ff] bg-white text-[#173569]",
      surface: "bg-[#eef4ff]",
      shadow: "shadow-[0_16px_32px_rgba(23,53,105,0.08)]",
    },
  };

  const tone = toneMap[tipoNodo] || toneMap.actividad;
  return {
    ...tone,
    focus: selected ? "ring-2 ring-[#173569]/20" : "",
  };
}

function getConnectionLabel(connection) {
  if (!connection) return "";

  const parts = [];
  if (connection.tipo && connection.tipo !== "normal") {
    parts.push(connection.tipo_label || connection.tipo);
  }
  if (connection.condicion) {
    parts.push(connection.condicion);
  }

  return parts.join(" - ");
}

function FlowArrow({ label = "" }) {
  return (
    <div className="relative flex h-14 w-full items-start justify-center">
      <div className="absolute inset-x-0 top-0 bottom-[10px] flex justify-center">
        <div className="w-px bg-slate-300" />
      </div>
      {label ? (
        <span className="absolute top-1 rounded-full border border-[#d6e4ff] bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#173569]">
          {label}
        </span>
      ) : null}
      <div className="absolute bottom-0 h-0 w-0 border-l-[6px] border-r-[6px] border-t-[10px] border-l-transparent border-r-transparent border-t-[#173569]" />
    </div>
  );
}

function NodeShape({
  detail,
  selected,
  isEditing,
  draftName,
  savingName,
  onSelect,
  onChangeName,
  onSaveName,
  onCancelEdit,
}) {
  const tone = getNodeTone(detail.tipo_nodo, selected);
  const isDecision = detail.tipo_nodo === "decision";
  const isEnd = detail.tipo_nodo === "fin";
  const isEvent = detail.tipo_nodo === "inicio" || detail.tipo_nodo === "fin";

  return (
    <div className="flex flex-col items-center">
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect?.();
          }
        }}
        className="relative h-[96px] w-[196px] cursor-pointer"
      >
        {isDecision ? (
          <div
            className={[
              "absolute left-1/2 top-1/2 h-[62px] w-[62px] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[16px] border-2 transition",
              tone.border,
              tone.bg,
              tone.shadow,
              tone.focus,
            ].join(" ")}
          />
        ) : null}

        {isEvent ? (
          <div
            className={[
              "absolute left-1/2 top-1/2 h-[82px] w-[82px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition",
              tone.border,
              tone.bg,
              tone.shadow,
              tone.focus,
            ].join(" ")}
          />
        ) : null}

        {isEnd ? (
          <div className="absolute left-1/2 top-1/2 h-[68px] w-[68px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-slate-500/80" />
        ) : null}

        {!isDecision && !isEvent ? (
          <div
            className={[
              "absolute inset-0 rounded-[22px] border-2 transition",
              tone.border,
              tone.bg,
              tone.shadow,
              tone.focus,
            ].join(" ")}
          />
        ) : null}

        <div
          className={[
            "relative z-10 flex h-full w-full items-center justify-center p-3 text-center",
            tone.text,
          ].join(" ")}
        >
          {!isEditing ? (
            <span
              className={[
                "absolute left-3 top-3 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                tone.badge,
              ].join(" ")}
            >
              Nro {detail.numero}
            </span>
          ) : null}
          {isEditing ? (
            <div className="w-full rounded-[20px] border border-white/70 bg-white/92 p-3 shadow-[0_14px_30px_rgba(15,35,70,0.08)]">
              <textarea
                autoFocus
                rows={2}
                value={draftName}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => onChangeName?.(event.target.value)}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400"
                placeholder="Nombre del bloque"
              />
              <div className="mt-3 flex justify-end gap-2">
                <TableActionButton
                  onClick={(event) => {
                    event.stopPropagation();
                    onCancelEdit?.();
                  }}
                  tone="neutral"
                  disabled={savingName}
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </TableActionButton>
                <TableActionButton
                  onClick={(event) => {
                    event.stopPropagation();
                    onSaveName?.();
                  }}
                  tone="success"
                  disabled={savingName || !draftName.trim()}
                >
                  <Check className="h-4 w-4" />
                  {savingName ? "Guardando..." : "Guardar"}
                </TableActionButton>
              </div>
            </div>
          ) : (
            <div className={isDecision ? "w-[64%]" : isEvent ? "w-[64%]" : "w-full"}>
              <div className="text-sm font-semibold leading-5">
                {detail.actividad || "Sin nombre"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BpmnNode({
  detail,
  selected,
  isEditing,
  draftName,
  canManage,
  savingName,
  deleting,
  onSelect,
  onStartEdit,
  onChangeName,
  onSaveName,
  onCancelEdit,
  onDelete,
}) {
  return (
    <div className="group relative flex flex-col items-center">
      {canManage && !isEditing ? (
        <div className="absolute right-2 top-2 z-20 flex gap-1 opacity-0 transition duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
          <TableActionButton
            onClick={(event) => {
              event.stopPropagation();
              onStartEdit?.();
            }}
            tone="neutral"
            iconOnly
            title="Editar nombre"
          >
            <PencilLine className="h-4 w-4" />
          </TableActionButton>
          <TableActionButton
            onClick={(event) => {
              event.stopPropagation();
              onDelete?.();
            }}
            tone="danger"
            iconOnly
            disabled={deleting}
            title="Eliminar bloque"
          >
            <Trash2 className="h-4 w-4" />
          </TableActionButton>
        </div>
      ) : null}

      <NodeShape
        detail={detail}
        selected={selected}
        isEditing={isEditing}
        draftName={draftName}
        savingName={savingName}
        onSelect={onSelect}
        onChangeName={onChangeName}
        onSaveName={onSaveName}
        onCancelEdit={onCancelEdit}
      />
    </div>
  );
}

export default function ProcesoFlowView({
  detalles = [],
  conexiones = [],
  canManage = false,
  selectedDetailId = null,
  creatingFlowBlock = false,
  deletingDetailId = null,
  savingNameDetailId = null,
  onSelectDetail,
  onCreateBlock,
  onDeleteBlock,
  onRenameBlock,
  className = "",
}) {
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [editingDetailId, setEditingDetailId] = useState(null);
  const [nameDrafts, setNameDrafts] = useState({});

  const sortedDetalles = useMemo(
    () =>
      [...detalles].sort((left, right) => {
        if (left.numero !== right.numero) {
          return left.numero - right.numero;
        }
        return left.id - right.id;
      }),
    [detalles]
  );

  const sequentialConnectionMap = useMemo(() => {
    const map = new Map();
    conexiones.forEach((conexion) => {
      const key = `${conexion.origen}-${conexion.destino}`;
      map.set(key, conexion);
    });
    return map;
  }, [conexiones]);

  useEffect(() => {
    setNameDrafts((current) => {
      const next = {};
      sortedDetalles.forEach((detalle) => {
        next[detalle.id] = current[detalle.id] ?? detalle.actividad ?? "";
      });
      return next;
    });
  }, [sortedDetalles]);

  useEffect(() => {
    if (!editingDetailId) return;
    if (!sortedDetalles.some((detalle) => detalle.id === editingDetailId)) {
      setEditingDetailId(null);
    }
  }, [editingDetailId, sortedDetalles]);

  useEffect(() => {
    const selectedDetail = sortedDetalles.find((detalle) => detalle.id === selectedDetailId);
    if (
      selectedDetail &&
      (selectedDetail.actividad === PLACEHOLDER_ACTIVITY || !selectedDetail.actividad?.trim())
    ) {
      setEditingDetailId(selectedDetail.id);
      setIsCreateMenuOpen(false);
    }
  }, [selectedDetailId, sortedDetalles]);

  const handleCreateBlock = async (tipoNodo) => {
    const createdDetail = await onCreateBlock?.({
      actividad: PLACEHOLDER_ACTIVITY,
      tipo_nodo: tipoNodo,
    });

    if (createdDetail?.id) {
      setNameDrafts((current) => ({
        ...current,
        [createdDetail.id]: createdDetail.actividad || PLACEHOLDER_ACTIVITY,
      }));
      setEditingDetailId(createdDetail.id);
      setIsCreateMenuOpen(false);
      onSelectDetail?.(createdDetail.id);
    }
  };

  const handleSaveName = async (detailId) => {
    const nextName = (nameDrafts[detailId] || "").trim();
    if (!nextName) return;

    await onRenameBlock?.(detailId, nextName);
    setEditingDetailId(null);
  };

  return (
    <section
      className={[
        "flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,35,70,0.08)]",
        className,
      ].join(" ")}
    >
      <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 py-5">
        <h2 className="text-lg font-semibold text-slate-900">Vista Flujo</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="mb-4 flex flex-col items-center gap-3">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setIsCreateMenuOpen((current) => !current)}
              disabled={!canManage}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/80 bg-white px-4 py-2.5 text-sm font-semibold text-[#173569] shadow-[0_10px_22px_rgba(23,53,105,0.06)] transition hover:border-[#173569]/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Nuevo bloque
              {isCreateMenuOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>

          {isCreateMenuOpen ? (
            <div className="flex flex-wrap justify-center gap-2">
              {NODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleCreateBlock(option.value)}
                  disabled={!canManage || creatingFlowBlock}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#173569]/30 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>{option.label}</span>
                  <span className="text-xs font-medium text-slate-400">{option.hint}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {sortedDetalles.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm leading-6 text-slate-500">
            Aun no hay nodos en el flujo. Crea el primero y nombra el bloque dentro de su propia
            figura.
          </div>
        ) : (
          <div className="space-y-0">
            {sortedDetalles.map((detalle, index) => {
              const nextDetail = sortedDetalles[index + 1];
              const connection = nextDetail
                ? sequentialConnectionMap.get(`${detalle.id}-${nextDetail.id}`)
                : null;
              const isEditing = editingDetailId === detalle.id;
              const isSavingName = savingNameDetailId === detalle.id;
              const isDeleting = deletingDetailId === detalle.id;

              return (
                <div key={detalle.id} className="flex flex-col items-center">
                  <BpmnNode
                    detail={detalle}
                    selected={selectedDetailId === detalle.id}
                    isEditing={isEditing}
                    draftName={nameDrafts[detalle.id] ?? detalle.actividad ?? ""}
                    canManage={canManage}
                    savingName={isSavingName}
                    deleting={isDeleting}
                    onSelect={() => onSelectDetail?.(detalle.id)}
                    onStartEdit={() => {
                      setEditingDetailId(detalle.id);
                      onSelectDetail?.(detalle.id);
                    }}
                    onChangeName={(value) =>
                      setNameDrafts((current) => ({
                        ...current,
                        [detalle.id]: value,
                      }))
                    }
                    onSaveName={() => handleSaveName(detalle.id)}
                    onCancelEdit={() => {
                      setNameDrafts((current) => ({
                        ...current,
                        [detalle.id]: detalle.actividad || "",
                      }));
                      setEditingDetailId(null);
                    }}
                    onDelete={() => {
                      if (isDeleting) return;
                      onDeleteBlock?.(detalle.id);
                    }}
                  />

                  {index < sortedDetalles.length - 1 ? (
                    <FlowArrow label={getConnectionLabel(connection)} />
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
