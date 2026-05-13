"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  HardHat,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const AUTH_HIGHLIGHTS = [
  {
    icon: ShieldCheck,
    title: "Acceso controlado",
    description: "Roles, permisos y trazabilidad alineados con la operacion diaria.",
  },
  {
    icon: Workflow,
    title: "Operacion conectada",
    description: "Trabajos, almacen y compras siguen un mismo flujo de plataforma.",
  },
  {
    icon: HardHat,
    title: "Contexto tecnico",
    description: "Diseno pensado para mantenimiento, ejecucion y seguimiento real.",
  },
];

function FredalLogoMark({ size = "lg", className = "" }) {
  const sizes = {
    lg: {
      frame: "h-14 w-14 rounded-[22px]",
      image: "h-full w-full object-contain p-2",
    },
    sm: {
      frame: "h-8 w-8 rounded-[12px]",
      image: "h-full w-full object-contain p-1.5",
    },
  };

  const current = sizes[size] || sizes.lg;

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-white/95 ring-1 ring-white/10 shadow-[0_12px_24px_rgba(15,35,70,0.18)]",
        current.frame,
        className
      )}
    >
      <img
        src="/logo/logo.png"
        alt="Fredal Logo"
        className={current.image}
      />
    </div>
  );
}

export function AuthShell({
  eyebrow,
  title,
  description,
  formTitle,
  formDescription,
  children,
  footer,
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eef3f9]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(143,191,47,0.16),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(23,53,105,0.16),transparent_34%),linear-gradient(180deg,#f6f9fc_0%,#edf2f8_48%,#e6edf6_100%)]" />
      <div className="absolute left-[-10rem] top-[-8rem] h-72 w-72 rounded-full bg-[#8FBF2F]/12 blur-3xl" />
      <div className="absolute bottom-[-10rem] right-[-6rem] h-80 w-80 rounded-full bg-[#173569]/14 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-white/70 bg-white/60 shadow-[0_32px_80px_rgba(20,43,82,0.16)] backdrop-blur xl:grid-cols-[1.08fr_minmax(380px,0.92fr)]">
          <section className="relative hidden min-h-[760px] overflow-hidden bg-[#0f2346] px-8 py-8 text-white xl:flex xl:flex-col xl:justify-between">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_30%),radial-gradient(circle_at_80%_24%,rgba(143,191,47,0.22),transparent_18%),linear-gradient(180deg,#0f2346_0%,#173569_100%)]" />

            <div className="relative">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-medium text-white/84 backdrop-blur">
                <span className="h-2.5 w-2.5 rounded-full bg-[#8FBF2F]" />
                Fredal Workspace
              </div>

              <div className="mt-8 flex items-center gap-4">
                <FredalLogoMark />

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.34em] text-white/52">
                    Plataforma integral
                  </p>
                  <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                    FREDAL
                  </h1>
                </div>
              </div>

              <div className="mt-14 max-w-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#B6D662]">
                  {eyebrow}
                </p>
                <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-white">
                  {title}
                </h2>
                <p className="mt-5 max-w-lg text-base leading-7 text-white/72">
                  {description}
                </p>
              </div>

              <div className="mt-10 grid gap-4">
                {AUTH_HIGHLIGHTS.map(({ icon: Icon, title: itemTitle, description: itemDescription }) => (
                  <div
                    key={itemTitle}
                    className="rounded-[24px] border border-white/10 bg-white/8 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-[#B6D662]">
                        <Icon className="h-5 w-5" strokeWidth={2.1} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{itemTitle}</p>
                        <p className="mt-2 text-sm leading-6 text-white/66">{itemDescription}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative flex items-center justify-between rounded-[24px] border border-white/10 bg-white/8 px-5 py-4 text-sm text-white/70 backdrop-blur">
              <div>
                <p className="font-semibold text-white">Peruvian Group</p>
                <p className="mt-1 text-white/60">Gestion operativa para maquinaria pesada</p>
              </div>
              <ArrowRight className="h-5 w-5 text-[#B6D662]" strokeWidth={2.1} />
            </div>
          </section>

          <section className="flex min-h-[760px] items-center justify-center px-4 py-6 sm:px-6 lg:px-10">
            <div className="w-full max-w-md">
              <div className="rounded-[30px] border border-slate-200/80 bg-white/88 p-6 shadow-[0_18px_42px_rgba(15,35,70,0.09)] backdrop-blur sm:p-8">
                <div className="mb-8 xl:hidden">
                  <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#173569] shadow-sm">
                    <FredalLogoMark size="sm" />
                    Fredal Workspace
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#6A7B92]">
                    {eyebrow}
                  </p>
                  <h3 className="mt-3 text-3xl font-semibold tracking-tight text-[#12233D]">
                    {formTitle}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#5F6C80]">
                    {formDescription}
                  </p>
                </div>

                <div className="mt-8">{children}</div>

                {footer ? <div className="mt-8 border-t border-slate-200 pt-6">{footer}</div> : null}
              </div>

              <div className="mt-5 text-center text-xs leading-6 text-[#728196]">
                Acceso empresarial para operacion, almacen, compras y analitica.
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export function AuthAlert({ tone = "error", children }) {
  const tones = {
    error: "border-red-200 bg-red-50/90 text-red-700",
    success: "border-[#CFE6A0] bg-[#F4F9E8] text-[#456021]",
  };
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div className={cn("rounded-2xl border px-4 py-3 text-sm leading-6", tones[tone])}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4.5 w-4.5 shrink-0" strokeWidth={2.2} />
        <div>{children}</div>
      </div>
    </div>
  );
}

export function AuthField({ id, label, helper, icon: Icon, className, ...props }) {
  return (
    <div className="space-y-2.5">
      <Label htmlFor={id} className="text-sm font-semibold text-[#22334F]">
        {label}
      </Label>
      <div className="relative">
        {Icon ? (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6A7B92]">
            <Icon className="h-4.5 w-4.5" strokeWidth={2.1} />
          </span>
        ) : null}
        <Input
          id={id}
          className={cn(
            "h-12 rounded-2xl border-slate-200 bg-[#F9FBFD] text-sm text-[#12233D] shadow-none placeholder:text-[#8A97AA] focus-visible:border-[#8FBF2F] focus-visible:ring-[#8FBF2F]/25",
            Icon ? "pl-11" : "",
            className
          )}
          {...props}
        />
      </div>
      {helper ? <p className="text-xs leading-5 text-[#728196]">{helper}</p> : null}
    </div>
  );
}

export function PasswordField({ id, label, helper, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2.5">
      <Label htmlFor={id} className="text-sm font-semibold text-[#22334F]">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          className="h-12 rounded-2xl border-slate-200 bg-[#F9FBFD] pr-11 text-sm text-[#12233D] shadow-none placeholder:text-[#8A97AA] focus-visible:border-[#8FBF2F] focus-visible:ring-[#8FBF2F]/25"
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#6A7B92] transition hover:bg-slate-200/70 hover:text-[#173569]"
          aria-label={visible ? "Ocultar contrasena" : "Mostrar contrasena"}
        >
          {visible ? <EyeOff className="h-4.5 w-4.5" strokeWidth={2.1} /> : <Eye className="h-4.5 w-4.5" strokeWidth={2.1} />}
        </button>
      </div>
      {helper ? <p className="text-xs leading-5 text-[#728196]">{helper}</p> : null}
    </div>
  );
}

export function AuthSubmitButton({ children, ...props }) {
  return (
    <Button
      className="h-12 w-full rounded-2xl bg-[#173569] text-sm font-semibold text-white shadow-[0_18px_36px_rgba(23,53,105,0.22)] transition hover:bg-[#10284E]"
      {...props}
    >
      {children}
    </Button>
  );
}

export function AuthFooterLink({ question, href, action }) {
  return (
    <p className="text-center text-sm leading-6 text-[#5F6C80]">
      {question}{" "}
      <Link
        href={href}
        className="font-semibold text-[#173569] transition hover:text-[#10284E]"
      >
        {action}
      </Link>
    </p>
  );
}
