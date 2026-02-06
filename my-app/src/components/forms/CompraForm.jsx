"use client";

import { useState } from "react";
import { compraAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CompraForm({ onSuccess }) {
  const getToday = () => new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    codigo: "",
    codigo_comprobante: "",
    fecha: getToday(),
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await compraAPI.create(form);
      onSuccess?.();
      setForm({ codigo: "", codigo_comprobante: "", fecha: getToday() });
    } catch (err) {
      console.error("Error registrando compra", err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        name="codigo"
        placeholder="Código compra"
        onChange={handleChange}
      />
      <Input
        name="codigo_comprobante"
        placeholder="Comprobante"
        onChange={handleChange}
      />
      <Input type="date" name="fecha" value={form.fecha} onChange={handleChange} />

      <Button type="submit">Registrar Compra</Button>
    </form>
  );
}
