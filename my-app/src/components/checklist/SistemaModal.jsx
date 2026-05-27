"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { sistemaAPI } from "@/lib/api";

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
  return "No se pudo registrar el sistema.";
}

export default function SistemaModal({
  open,
  onClose,
  onCreated,
  sistema = null,
}) {
  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm({
      nombre: sistema?.nombre || "",
      descripcion: sistema?.descripcion || "",
    });
    setSaving(false);
    setError("");
  }, [open, sistema]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.nombre.trim()) {
      setError("Escribe el nombre del sistema.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim(),
      };

      if (sistema?.id) {
        await sistemaAPI.patch(sistema.id, payload);
      } else {
        await sistemaAPI.create(payload);
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
      title={sistema?.id ? "Editar sistema" : "Nuevo sistema"}
      size="lg"
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
              Nombre del sistema
            </label>
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              disabled={saving}
              placeholder="Ej: Sistema de lubricacion"
              className={inputClassName}
            />
          </div>

          <div className="mt-5">
            <label className="text-sm font-semibold text-slate-700">
              Descripcion
            </label>
            <textarea
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              disabled={saving}
              rows={4}
              placeholder="Contexto operativo del sistema"
              className={`${inputClassName} resize-y`}
            />
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
              : sistema?.id
                ? "Guardar cambios"
                : "Crear sistema"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
