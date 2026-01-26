"use client";

import { useState } from "react";
import { cambioEquipoAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CambioEquipoForm({ onSuccess }) {
  const [form, setForm] = useState({
    item: "",
    trabajo: "",
    cantidad: 1,
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await cambioEquipoAPI.create(form);
      onSuccess?.();
      setForm({ item: "", trabajo: "", cantidad: 1 });
    } catch (err) {
      console.error("Error asignando repuesto", err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input name="item" placeholder="ID Item" onChange={handleChange} />
      <Input
        name="trabajo"
        placeholder="ID Trabajo"
        onChange={handleChange}
      />
      <Input
        type="number"
        name="cantidad"
        onChange={handleChange}
      />

      <Button type="submit">Asignar Repuesto</Button>
    </form>
  );
}
