"use client";

import { ArrowLeft, CalendarCheck2, UsersRound } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AsistenciaEventoTable from "@/components/asistencia/AsistenciaEventoTable";
import { asistenciaAPI, eventoAPI, trabajadorAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { formatDisplayDate } from "@/lib/utils";

const MANAGER_ROLES = [
  "admin",
  "Jefe de Tecnicos",
  "Jefe de Almaceneros",
  "Jefe de Mantenimiento",
  "ManageCompras",
];

function normalizeCollection(response) {
  const payload = response?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function getErrorMessage(error) {
  const data = error?.response?.data;
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data === "string") return data;
  return "No se pudo cargar la lista de asistencia.";
}

export default function AsistenciaDetallePage() {
  const router = useRouter();
  const params = useParams();
  const eventoId = params?.id;
  const { roles = [] } = useAuth();
  const [evento, setEvento] = useState(null);
  const [trabajadores, setTrabajadores] = useState([]);
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canManage = useMemo(
    () => roles.some((role) => MANAGER_ROLES.includes(role)),
    [roles]
  );

  const loadData = async () => {
    if (!eventoId) return;

    setLoading(true);
    setError("");

    try {
      const [eventoResponse, trabajadoresResponse, asistenciasResponse] = await Promise.all([
        eventoAPI.retrieve(eventoId),
        trabajadorAPI.list(),
        asistenciaAPI.list({ evento: eventoId }),
      ]);

      setEvento(eventoResponse?.data || null);
      setTrabajadores(normalizeCollection(trabajadoresResponse));
      setAsistencias(normalizeCollection(asistenciasResponse));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventoId]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,35,70,0.08)]">
        <div className="relative overflow-hidden px-6 py-7 md:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,35,70,0.06),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(143,191,47,0.16),transparent_30%),linear-gradient(135deg,#ffffff_0%,#f7fafc_100%)]" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <button
                type="button"
                onClick={() => router.push("/asistencia")}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:bg-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver a asistencia
              </button>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#d6e4ff] bg-[#eef4ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#173569]">
                <CalendarCheck2 className="h-3.5 w-3.5" />
                Lista del evento
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
                {evento?.nombre || "Asistencia del evento"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Marca la asistencia de todos los trabajadores asociados al evento en una sola tabla.
              </p>
            </div>

            {evento ? (
              <div className="grid gap-3 rounded-[26px] border border-slate-200 bg-white/85 p-4 shadow-[0_18px_34px_rgba(15,35,70,0.06)] sm:grid-cols-2">
                <InfoPill
                  label="Tarea base"
                  value={[evento.estandarizacion_codigo, evento.estandarizacion_nombre]
                    .filter(Boolean)
                    .join(" - ") || "-"}
                />
                <InfoPill
                  label="Fecha"
                  value={formatDisplayDate(evento.fecha) || "-"}
                />
                <InfoPill
                  label="Clasificacion"
                  value={evento.clasificacion || "-"}
                />
                <InfoPill
                  label="Trabajadores"
                  value={`${trabajadores.length || 0}`}
                  icon
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!error ? (
        <AsistenciaEventoTable
          evento={evento}
          trabajadores={trabajadores}
          asistencias={asistencias}
          loading={loading}
          canManage={canManage}
          onSaved={loadData}
        />
      ) : null}
    </div>
  );
}

function InfoPill({ label, value, icon = false }) {
  return (
    <article className="rounded-[20px] border border-slate-200 bg-slate-50/80 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 flex items-center gap-2 text-base font-semibold text-slate-800">
        {icon ? <UsersRound className="h-4 w-4 text-[#173569]" /> : null}
        {value}
      </div>
    </article>
  );
}
