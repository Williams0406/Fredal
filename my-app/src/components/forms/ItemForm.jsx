"use client";

import { useState } from "react";
import { itemAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ItemForm({ onSuccess }) {
  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    cantidad: 0,
    valor: 0,
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await itemAPI.create(form);
      onSuccess?.();
      setForm({ codigo: "", nombre: "", cantidad: 0, valor: 0 });
    } catch (err) {
      console.error("Error creando item", err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input name="codigo" placeholder="Código" onChange={handleChange} />
      <Input name="nombre" placeholder="Nombre" onChange={handleChange} />
      <Input
        type="number"
        name="cantidad"
        placeholder="Cantidad"
        onChange={handleChange}
      />
      <Input
        type="number"
        name="valor"
        placeholder="Valor"
        onChange={handleChange}
      />

      <Button type="submit">Guardar Item</Button>
    </form>
  );
}
