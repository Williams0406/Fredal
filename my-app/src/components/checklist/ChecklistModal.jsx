"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { checklistAPI } from "@/lib/api";
import { getTodayDateInputValue } from "@/lib/utils";

const inputClassName =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#173569] focus:ring-2 focus:ring-[#EAF1FF]";

function getApiErrorMessage(error) {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const firstValue = Object.values(data)[0];
    if (Array.isArray(firstValue) && firstValue.length > 0) return String(firstValue[0]);
    if (typeof firstValue === "string") return firstValue;
  }
  return "No se pudo registrar el checklist.";
}

export default function ChecklistModal({
  open,
  onClose,
  onCreated,
  checklist = null,
}) {
  const [form, setForm] = useState({
    motivo: "",
    fecha: getTodayDateInputValue(),
    estado: "BORRADOR",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm({
      motivo: checklist?.motivo || "",
      fecha: checklist?.fecha || getTodayDateInputValue(),
      estado: checklist?.estado || "BORRADOR",
    });
    setSaving(false);
    setError("");
  }, [checklist, open]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.motivo.trim()) {
      setError("Escribe el motivo del checklist.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        motivo: form.motivo.trim(),
        fecha: form.fecha,
        estado: form.estado,
      };

      if (checklist?.id) {
        await checklistAPI.patch(checklist.id, payload);
      } else {
        await checklistAPI.create(payload);
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
      title={checklist?.id ? "Editar checklist" : "Nuevo checklist"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-5">
          <div className="grid gap-5 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-slate-700">
                Motivo del checklist
              </label>
              <input
                type="text"
                name="motivo"
                value={form.motivo}
                onChange={handleChange}
                disabled={saving}
                placeholder="Ej: Checklist de arranque diario"
                className={inputClassName}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">Fecha</label>
              <input
                type="date"
                name="fecha"
                value={form.fecha}
                onChange={handleChange}
                disabled={saving}
                className={inputClassName}
              />
            </div>
          </div>

          <div className="mt-5 max-w-xs">
            <label className="text-sm font-semibold text-slate-700">Estado inicial</label>
            <select
              name="estado"
              value={form.estado}
              onChange={handleChange}
              disabled={saving}
              className={inputClassName}
            >
              <option value="BORRADOR">Borrador</option>
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
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
              : checklist?.id
                ? "Guardar cambios"
                : "Crear checklist"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
