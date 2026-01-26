"use client";

import { useState } from "react";
import { registroAPI } from "@/lib/api";

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: "",
    password: "",
    codigo: "",
  });

  const submit = async (e) => {
    e.preventDefault();
    await registroAPI.registerWithCode(form);
    alert("Usuario creado, ahora puedes iniciar sesión");
  };

  return (
    <form onSubmit={submit}>
      <input
        placeholder="Usuario"
        onChange={(e) => setForm({ ...form, username: e.target.value })}
      />
      <input
        type="password"
        placeholder="Contraseña"
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />
      <input
        placeholder="Código de registro"
        onChange={(e) => setForm({ ...form, codigo: e.target.value })}
      />

      <button type="submit">Registrarse</button>
    </form>
  );
}
