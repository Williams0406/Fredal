"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, KeyRound, UserRound } from "lucide-react";
import { registroAPI } from "@/lib/api";
import {
  AuthAlert,
  AuthField,
  AuthFooterLink,
  AuthShell,
  AuthSubmitButton,
  PasswordField,
} from "@/components/auth/AuthShell";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    username: "",
    password: "",
    codigo: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.password !== confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    if (form.password.length < 6) {
      setError("La contrasena debe tener al menos 6 caracteres.");
      return;
    }

    if (!form.codigo.trim()) {
      setError("El codigo de registro es obligatorio.");
      return;
    }

    setIsSubmitting(true);

    try {
      await registroAPI.registerWithCode({
        ...form,
        codigo: form.codigo.trim().toUpperCase(),
      });
      router.push("/login?registered=1");
    } catch (err) {
      const responseData = err?.response?.data;
      const detail =
        responseData?.detail ||
        responseData?.error ||
        (typeof responseData === "string" ? responseData : null);

      if (detail) {
        setError(detail);
      } else {
        setError("No se pudo crear la cuenta. Verifica el codigo de registro.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Alta de usuarios"
      title="Activa accesos nuevos sin salir del ecosistema Fredal."
      description="Registra usuarios con codigo autorizado y manten la experiencia de ingreso alineada con la misma plataforma de trabajo."
      formTitle="Crear cuenta"
      formDescription="Completa tus datos, valida el codigo de registro y deja listo tu acceso al sistema."
      footer={<AuthFooterLink question="Ya tienes una cuenta?" href="/login" action="Iniciar sesion" />}
    >
      <div className="space-y-5">
        {error ? <AuthAlert>{error}</AuthAlert> : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <AuthField
            id="codigo"
            label="Codigo de registro"
            icon={BadgeCheck}
            value={form.codigo}
            onChange={(event) => handleInputChange("codigo", event.target.value)}
            placeholder="XXXX-XXXX-XXXX"
            autoCapitalize="characters"
            autoComplete="off"
            required
            disabled={isSubmitting}
            className="font-mono uppercase tracking-[0.2em]"
            helper="Codigo entregado por el administrador para habilitar una cuenta nueva."
          />

          <AuthField
            id="username"
            label="Nombre de usuario"
            icon={UserRound}
            value={form.username}
            onChange={(event) => handleInputChange("username", event.target.value)}
            placeholder="usuario123"
            autoComplete="username"
            required
            disabled={isSubmitting}
          />

          <PasswordField
            id="password"
            label="Contrasena"
            value={form.password}
            onChange={(event) => handleInputChange("password", event.target.value)}
            placeholder="Minimo 6 caracteres"
            autoComplete="new-password"
            required
            disabled={isSubmitting}
            helper="Usa una contrasena segura para tu acceso operativo."
          />

          <PasswordField
            id="confirmPassword"
            label="Confirmar contrasena"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              if (error) setError("");
            }}
            placeholder="Repite tu contrasena"
            autoComplete="new-password"
            required
            disabled={isSubmitting}
          />

          <div className="rounded-2xl border border-slate-200 bg-[#F7F9FC] px-4 py-3 text-sm leading-6 text-[#5F6C80]">
            <div className="flex items-start gap-3">
              <KeyRound className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[#173569]" strokeWidth={2.1} />
              <p>
                El codigo de registro define tu acceso inicial. Luego podras ingresar desde el
                login principal del workspace.
              </p>
            </div>
          </div>

          <AuthSubmitButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creando cuenta..." : "Crear acceso"}
          </AuthSubmitButton>
        </form>
      </div>
    </AuthShell>
  );
}
