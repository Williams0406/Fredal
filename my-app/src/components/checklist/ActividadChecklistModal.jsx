"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import { actividadChecklistAPI } from "@/lib/api";

const inputClassName =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#173569] focus:ring-2 focus:ring-[#EAF1FF]";

const TIPO_RESPUESTA_OPTIONS = [
  { value: "TEXTO", label: "Texto" },
  { value: "NUMERO", label: "Numero" },
  { value: "BOOLEANO", label: "Si / No" },
  { value: "OPCION", label: "Opcion" },
];

function getApiErrorMessage(error) {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const firstValue = Object.values(data)[0];
    if (Array.isArray(firstValue) && firstValue.length > 0) return String(firstValue[0]);
    if (typeof firstValue === "string") return firstValue;
  }
  return "No se pudo registrar la actividad checklist.";
}

export default function ActividadChecklistModal({
  open,
  onClose,
  onCreated,
  items = [],
  actividad = null,
}) {
  const [form, setForm] = useState({
    descripcion: "",
    tipo_respuesta: "BOOLEANO",
    obligatorio: true,
    requiere_observacion: false,
    requiere_evidencia: false,
    item: "",
    activo: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm({
      descripcion: actividad?.descripcion || "",
      tipo_respuesta: actividad?.tipo_respuesta || "BOOLEANO",
      obligatorio:
        typeof actividad?.obligatorio === "boolean" ? actividad.obligatorio : true,
      requiere_observacion: Boolean(actividad?.requiere_observacion),
      requiere_evidencia: Boolean(actividad?.requiere_evidencia),
      item: actividad?.item ? String(actividad.item) : "",
      activo: typeof actividad?.activo === "boolean" ? actividad.activo : true,
    });
    setSaving(false);
    setError("");
  }, [actividad, open]);

  const sortedItems = useMemo(
    () =>
      [...items].sort((left, right) => {
        const leftLabel = `${left.codigo || ""} ${left.nombre || ""}`.trim();
        const rightLabel = `${right.codigo || ""} ${right.nombre || ""}`.trim();
        return leftLabel.localeCompare(rightLabel);
      }),
    [items]
  );

  const handleTextChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (error) setError("");
  };

  const handleCheckChange = (name, checked) => {
    setForm((current) => ({ ...current, [name]: checked }));
    if (error) setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.descripcion.trim()) {
      setError("Describe la actividad checklist.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        descripcion: form.descripcion.trim(),
        tipo_respuesta: form.tipo_respuesta,
        obligatorio: Boolean(form.obligatorio),
        requiere_observacion: Boolean(form.requiere_observacion),
        requiere_evidencia: Boolean(form.requiere_evidencia),
        item: form.item ? Number(form.item) : null,
        activo: Boolean(form.activo),
      };

      if (actividad?.id) {
        await actividadChecklistAPI.patch(actividad.id, payload);
      } else {
        await actividadChecklistAPI.create(payload);
      }
      onCreated?.();
      onClose?.();
    } catch (submitError) {
      setError(getApiErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!saving) onClose?.();
      }}
      title={actividad?.id ? "Editar actividad checklist" : "Nueva actividad checklist"}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
          <div>
            <label className="text-sm font-semibold text-slate-700">
              Descripcion de la actividad
            </label>
            <textarea
              name="descripcion"
              value={form.descripcion}
              onChange={handleTextChange}
              disabled={saving}
              rows={3}
              placeholder="Ej: Verificar presion de aceite antes del arranque"
              className={`${inputClassName} resize-y`}
            />
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Tipo de respuesta
              </label>
              <select
                name="tipo_respuesta"
                value={form.tipo_respuesta}
                onChange={handleTextChange}
                disabled={saving}
                className={inputClassName}
              >
                {TIPO_RESPUESTA_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Item relacionado
              </label>
              <select
                name="item"
                value={form.item}
                onChange={handleTextChange}
                disabled={saving}
                className={inputClassName}
              >
                <option value="">Sin item asociado</option>
                {sortedItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.codigo} - {item.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <label className="inline-flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.obligatorio}
                onChange={(event) => handleCheckChange("obligatorio", event.target.checked)}
                disabled={saving}
                className="h-4 w-4 rounded border-slate-300 text-[#173569] focus:ring-[#173569]"
              />
              Obligatoria por defecto
            </label>

            <label className="inline-flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(event) => handleCheckChange("activo", event.target.checked)}
                disabled={saving}
                className="h-4 w-4 rounded border-slate-300 text-[#173569] focus:ring-[#173569]"
              />
              Mantener activa
            </label>

            <label className="inline-flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.requiere_observacion}
                onChange={(event) =>
                  handleCheckChange("requiere_observacion", event.target.checked)
                }
                disabled={saving}
                className="h-4 w-4 rounded border-slate-300 text-[#173569] focus:ring-[#173569]"
              />
              Requiere observacion
            </label>

            <label className="inline-flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.requiere_evidencia}
                onChange={(event) =>
                  handleCheckChange("requiere_evidencia", event.target.checked)
                }
                disabled={saving}
                className="h-4 w-4 rounded border-slate-300 text-[#173569] focus:ring-[#173569]"
              />
              Requiere evidencia
            </label>
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-[#173569] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(23,53,105,0.18)] transition hover:bg-[#0f2346] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? "Guardando..."
              : actividad?.id
                ? "Guardar cambios"
                : "Crear actividad"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
