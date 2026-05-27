"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import TableActionButton from "@/components/ui/TableActionButton";
import { reporteOrdenAPI } from "@/lib/api";
import { getTodayDateInputValue } from "@/lib/utils";

const inputClassName =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#173569] focus:ring-2 focus:ring-[#EAF1FF]";

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
  return "No se pudo crear el reporte.";
}

export default function ReporteOrdenModal({
  open,
  onClose,
  onCreated,
  trabajos = [],
}) {
  const [form, setForm] = useState({
    orden_trabajo: "",
    fecha: getTodayDateInputValue(),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const availableTrabajos = useMemo(
    () => (Array.isArray(trabajos) ? trabajos : []),
    [trabajos]
  );

  useEffect(() => {
    if (!open) return;
    setForm({
      orden_trabajo: availableTrabajos[0]?.id ? String(availableTrabajos[0].id) : "",
      fecha: availableTrabajos[0]?.fecha || getTodayDateInputValue(),
    });
    setSaving(false);
    setError("");
  }, [availableTrabajos, open]);

  const handleChange = (field, value) => {
    setForm((current) => {
      const next = {
        ...current,
        [field]: value,
      };

      if (field === "orden_trabajo") {
        const selectedTrabajo = availableTrabajos.find(
          (trabajo) => String(trabajo.id) === String(value)
        );
        if (selectedTrabajo?.fecha) {
          next.fecha = selectedTrabajo.fecha;
        }
      }

      return next;
    });
    if (error) setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.orden_trabajo) {
      setError("Selecciona una orden de trabajo.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await reporteOrdenAPI.create({
        orden_trabajo: Number(form.orden_trabajo),
        fecha: form.fecha,
      });
      onCreated?.();
      onClose?.();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo reporte" size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {availableTrabajos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            No hay ordenes de trabajo en campo disponibles sin reporte. Los reportes de campo se
            generan automaticamente cuando registras una OT nueva en Campo.
          </div>
        ) : (
          <>
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Orden de trabajo
              </label>
              <select
                value={form.orden_trabajo}
                onChange={(event) => handleChange("orden_trabajo", event.target.value)}
                className={inputClassName}
              >
                {availableTrabajos.map((trabajo) => (
                  <option key={trabajo.id} value={trabajo.id}>
                    {trabajo.codigo_orden} | {trabajo.ubicacion_detalle || trabajo.lugar}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">Fecha</label>
              <input
                type="date"
                value={form.fecha}
                onChange={(event) => handleChange("fecha", event.target.value)}
                className={inputClassName}
              />
            </div>
          </>
        )}

        <div className="flex justify-end gap-2">
          <TableActionButton onClick={onClose} tone="neutral" disabled={saving}>
            Cancelar
          </TableActionButton>
          <TableActionButton
            type="submit"
            tone="success"
            disabled={saving || availableTrabajos.length === 0}
          >
            {saving ? "Guardando..." : "Crear reporte"}
          </TableActionButton>
        </div>
      </form>
    </Modal>
  );
}
