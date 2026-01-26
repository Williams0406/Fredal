"use client";

import { useEffect, useState } from "react";
import { maquinariaAPI } from "@/lib/api";

export default function MaquinariaFormModal({
  open,
  onClose,
  onSaved,
  maquinaria = null,
}) {
  const isEdit = Boolean(maquinaria);

  const [form, setForm] = useState({
    codigo_maquina: "",
    nombre: "",
    descripcion: "",
    observacion: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (maquinaria) {
      setForm({
        codigo_maquina: maquinaria.codigo_maquina || "",
        nombre: maquinaria.nombre || "",
        descripcion: maquinaria.descripcion || "",
        observacion: maquinaria.observacion || "",
      });
    }
  }, [maquinaria]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEdit) {
        await maquinariaAPI.update(maquinaria.id, form);
      } else {
        await maquinariaAPI.create(form);
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error al guardar maquinaria");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl p-6 w-full max-w-md space-y-4"
      >
        <h2 className="text-lg font-semibold">
          {isEdit ? "Editar Maquinaria" : "Nueva Maquinaria"}
        </h2>

        <input
          name="codigo_maquina"
          placeholder="Código"
          value={form.codigo_maquina}
          onChange={handleChange}
          required
          disabled={isEdit}
          className={`input w-full ${isEdit ? "bg-gray-100 cursor-not-allowed" : ""}`}
        />

        <input
          name="nombre"
          placeholder="Nombre"
          value={form.nombre}
          onChange={handleChange}
          required
          className="input w-full"
        />

        <textarea
          name="descripcion"
          placeholder="Descripción"
          value={form.descripcion}
          onChange={handleChange}
          className="input w-full"
        />

        <textarea
          name="observacion"
          placeholder="Observaciones"
          value={form.observacion}
          onChange={handleChange}
          className="input w-full"
        />

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={loading}
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
