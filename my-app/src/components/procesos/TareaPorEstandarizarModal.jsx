"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import { tareaPorEstandarizarAPI } from "@/lib/api";

const EMPTY_FORM = {
  codigo: "",
  nombre_tarea: "",
  nivel_criticidad: "MEDIO",
  area: "",
  item: "",
};

const inputClassName =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#173569] focus:ring-2 focus:ring-[#EAF1FF]";

function getApiErrorMessage(error) {
  const data = error?.response?.data;

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (typeof data === "string") {
    return data;
  }

  if (data && typeof data === "object") {
    const firstValue = Object.values(data)[0];
    if (Array.isArray(firstValue) && firstValue.length > 0) {
      return String(firstValue[0]);
    }
    if (typeof firstValue === "string") {
      return firstValue;
    }
  }

  return "No se pudo registrar la tarea por estandarizar.";
}

export default function TareaPorEstandarizarModal({
  open,
  onClose,
  onCreated,
  items = [],
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_FORM);
    setError("");
    setSaving(false);
  }, [open]);

  const sortedItems = useMemo(
    () =>
      [...items].sort((left, right) => {
        const leftLabel = `${left.codigo || ""} ${left.nombre || ""}`.trim();
        const rightLabel = `${right.codigo || ""} ${right.nombre || ""}`.trim();
        return leftLabel.localeCompare(rightLabel);
      }),
    [items]
  );

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]:
        type === "checkbox"
          ? checked
          : name === "codigo"
            ? value.toUpperCase()
            : value,
    }));
    if (error) setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await tareaPorEstandarizarAPI.create({
        codigo: form.codigo.trim(),
        nombre_tarea: form.nombre_tarea.trim(),
        nivel_criticidad: form.nivel_criticidad,
        area: form.area.trim(),
        item: form.item ? Number(form.item) : null,
      });
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
      title="Registrar tarea por estandarizar"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-700">
              Codigo
            </label>
            <input
              type="text"
              name="codigo"
              value={form.codigo}
              onChange={handleChange}
              placeholder="PROC-001"
              required
              disabled={saving}
              className={inputClassName}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Area
            </label>
            <input
              type="text"
              name="area"
              value={form.area}
              onChange={handleChange}
              placeholder="Taller"
              required
              disabled={saving}
              className={inputClassName}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-700">
            Nombre de la tarea
          </label>
          <input
            type="text"
            name="nombre_tarea"
            value={form.nombre_tarea}
            onChange={handleChange}
            placeholder="Ej: Cambio de filtro principal"
            required
            disabled={saving}
            className={inputClassName}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-700">
              Nivel de criticidad
            </label>
            <select
              name="nivel_criticidad"
              value={form.nivel_criticidad}
              onChange={handleChange}
              disabled={saving}
              className={inputClassName}
            >
              <option value="ALTO">Alto</option>
              <option value="MEDIO">Medio</option>
              <option value="BAJO">Bajo</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Item relacionado
            </label>
            <select
              name="item"
              value={form.item}
              onChange={handleChange}
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
            {saving ? "Guardando..." : "Registrar tarea"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
