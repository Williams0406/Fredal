"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockKeyhole, UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  AuthAlert,
  AuthField,
  AuthFooterLink,
  AuthShell,
  AuthSubmitButton,
  PasswordField,
} from "@/components/auth/AuthShell";

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRegisteredMessage, setShowRegisteredMessage] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setShowRegisteredMessage(params.get("registered") === "1");
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(username, password);
    } catch {
      setError("Credenciales incorrectas. Verifica tu usuario y contrasena.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef3f9]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#173569] border-t-transparent" />
          <p className="text-sm text-[#5F6C80]">Cargando acceso...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthShell
      eyebrow="Acceso operativo"
      title="La operacion tecnica en un solo entorno."
      description="Ingresa al workspace para supervisar trabajos, stock, compras y analitica con el mismo lenguaje visual de la plataforma."
      formTitle="Iniciar sesion"
      formDescription="Accede con tus credenciales para continuar en el panel de gestion Fredal."
      footer={<AuthFooterLink question="Tienes un codigo de registro?" href="/register" action="Crear cuenta" />}
    >
      <div className="space-y-5">
        {showRegisteredMessage ? (
          <AuthAlert tone="success">
            Tu cuenta fue creada correctamente. Ahora ya puedes iniciar sesion.
          </AuthAlert>
        ) : null}

        {error ? <AuthAlert>{error}</AuthAlert> : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <AuthField
            id="username"
            label="Usuario"
            icon={UserRound}
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              if (error) setError("");
            }}
            placeholder="Ingresa tu usuario"
            autoComplete="username"
            required
            disabled={isSubmitting}
          />

          <PasswordField
            id="password"
            label="Contrasena"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (error) setError("");
            }}
            placeholder="Ingresa tu contrasena"
            autoComplete="current-password"
            required
            disabled={isSubmitting}
          />

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-[#F7F9FC] px-4 py-3 text-sm text-[#5F6C80]">
            <div className="flex items-center gap-2">
              <LockKeyhole className="h-4.5 w-4.5 text-[#173569]" strokeWidth={2.1} />
              <span>Acceso protegido por rol y permisos.</span>
            </div>
            <Link
              href="/register"
              className="shrink-0 font-semibold text-[#173569] transition hover:text-[#10284E]"
            >
              Registrarme
            </Link>
          </div>

          <AuthSubmitButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Ingresando..." : "Entrar al workspace"}
          </AuthSubmitButton>
        </form>
      </div>
    </AuthShell>
  );
}
