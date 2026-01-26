"use client";

import { useState } from "react";
import { trabajoAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default function TrabajoForm({ onSuccess }) {
  const [form, setForm] = useState({
    actividad: "",
    tipo_mantenimiento: "",
    prioridad: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await trabajoAPI.create(form);
      onSuccess?.();
      setForm({
        actividad: "",
        tipo_mantenimiento: "",
        prioridad: "",
      });
    } catch (err) {
      console.error("Error creando trabajo", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        name="actividad"
        placeholder="Actividad"
        value={form.actividad}
        onChange={handleChange}
        required
      />

      <Input
        name="tipo_mantenimiento"
        placeholder="Tipo de mantenimiento"
        value={form.tipo_mantenimiento}
        onChange={handleChange}
        required
      />

      <Select
        name="prioridad"
        value={form.prioridad}
        onChange={handleChange}
      >
        <option value="">Prioridad</option>
        <option value="BAJA">Baja</option>
        <option value="MEDIA">Media</option>
        <option value="ALTA">Alta</option>
      </Select>

      <Button type="submit" disabled={loading}>
        {loading ? "Guardando..." : "Guardar Trabajo"}
      </Button>
    </form>
  );
}
