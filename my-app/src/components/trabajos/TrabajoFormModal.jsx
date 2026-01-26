"use client";

import { useEffect, useState } from "react";
import { maquinariaAPI, trabajoAPI } from "@/lib/api";

const ESTADOS = ["PENDIENTE", "EN_PROCESO", "FINALIZADO"];

export default function TrabajoFormModal({
  open,
  onClose,
  onSaved,
  trabajo,
}) {
  const isEdit = Boolean(trabajo);

  const [form, setForm] = useState({
    maquinaria: null,
    fecha: "",
    lugar: "TALLER",
    ubicacion_detalle: "",
    prioridad: "REGULAR",
    estatus: "PENDIENTE",

    // campos técnicos (solo al finalizar)
    hora_inicio: "",
    hora_fin: "",
    horometro: "",
    estado_equipo: "",
    observaciones: "",
  });

  const [maquinarias, setMaquinarias] = useState([]);

  useEffect(() => {
    if (open && !trabajo) {
      setForm({
        maquinaria: null,
        fecha: "",
        lugar: "TALLER",
        ubicacion_detalle: "",
        prioridad: "REGULAR",
        estatus: "PENDIENTE",

        hora_inicio: "",
        hora_fin: "",
        horometro: "",
        estado_equipo: "",
        observaciones: "",
      });
    }
  }, [open, trabajo]);

  useEffect(() => {
    maquinariaAPI.list().then((res) =>
      setMaquinarias(res.data)
    );
  }, []);

  useEffect(() => {
    if (trabajo) {
      setForm({
        maquinaria: trabajo.maquinaria || "",
        fecha: trabajo.fecha || "",
        lugar: trabajo.lugar || "TALLER",
        ubicacion_detalle: trabajo.ubicacion_detalle || "",
        prioridad: trabajo.prioridad || "REGULAR",
        estatus: trabajo.estatus || "PENDIENTE",

        hora_inicio: trabajo.hora_inicio || "",
        hora_fin: trabajo.hora_fin || "",
        horometro: trabajo.horometro || "",
        estado_equipo: trabajo.estado_equipo || "",
        observaciones: trabajo.observaciones || "",
      });
    }
  }, [trabajo]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = { ...form };

    Object.keys(payload).forEach((key) => {
      if (
        payload[key] === "" ||
        payload[key] === null
      ) {
        delete payload[key];
      }
    });

    if (isEdit) {
      await trabajoAPI.update(trabajo.id, payload);
    } else {
      await trabajoAPI.create(payload);
    }

    onSaved();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl p-6 w-full max-w-xl space-y-4"
      >
        <h2 className="text-lg font-semibold">
          {isEdit ? "Editar Orden de Trabajo" : "Nueva Orden de Trabajo"}
        </h2>

        {/* MAQUINARIA */}
        <select
          name="maquinaria"
          value={form.maquinaria ?? ""}
          required
          onChange={(e) =>
            setForm({
              ...form,
              maquinaria: Number(e.target.value),
            })
          }
        >
          <option value="">Seleccione maquinaria</option>
          {maquinarias.map((m) => (
            <option key={m.id} value={m.id}>
              {m.codigo_maquina} - {m.nombre}
            </option>
          ))}
        </select>

        {/* FECHA */}
        <input
          type="date"
          name="fecha"
          value={form.fecha}
          onChange={handleChange}
          required
          className="input w-full"
        />

        {/* LUGAR */}
        <select
          name="lugar"
          value={form.lugar}
          onChange={handleChange}
          className="input w-full"
        >
          <option value="TALLER">Taller</option>
          <option value="CAMPO">Campo</option>
        </select>

        {/* UBICACIÓN DETALLE */}
        <input
          name="ubicacion_detalle"
          placeholder="Ubicación exacta del trabajo"
          value={form.ubicacion_detalle}
          onChange={handleChange}
          required
          className="input w-full"
        />

        {/* PRIORIDAD */}
        <select
          name="prioridad"
          value={form.prioridad}
          onChange={handleChange}
          className="input w-full"
        >
          <option value="REGULAR">Regular</option>
          <option value="URGENTE">Urgente</option>
          <option value="EMERGENCIA">Emergencia</option>
        </select>

        {/* CAMPOS TÉCNICOS SOLO AL FINALIZAR */}
        {isEdit && form.estatus === "FINALIZADO" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="time"
                name="hora_inicio"
                value={form.hora_inicio}
                onChange={handleChange}
                className="input"
              />

              <input
                type="time"
                name="hora_fin"
                value={form.hora_fin}
                onChange={handleChange}
                className="input"
              />
            </div>

            <input
              type="number"
              name="horometro"
              value={form.horometro}
              onChange={handleChange}
              className="input w-full"
            />

            <select
              name="estado_equipo"
              value={form.estado_equipo}
              onChange={handleChange}
              className="input w-full"
            >
              <option value="">Estado del equipo</option>
              <option value="OPERATIVO">Operativo</option>
              <option value="INOPERATIVO">Inoperativo</option>
            </select>

            <textarea
              name="observaciones"
              value={form.observaciones}
              onChange={handleChange}
              className="input w-full"
              placeholder="Observaciones"
            />
          </>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Cancelar
          </button>

          <button type="submit" className="btn-primary">
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
