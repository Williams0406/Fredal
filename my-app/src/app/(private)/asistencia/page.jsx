"use client";

import { CalendarCheck2, Plus, Search, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import EventoTable from "@/components/asistencia/EventoTable";
import { eventoAPI, tareaPorEstandarizarAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

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
  return "No se pudo cargar la vista de asistencia.";
}

export default function AsistenciaPage() {
  const router = useRouter();
  const { roles = [] } = useAuth();
  const [eventos, setEventos] = useState([]);
  const [estandarizaciones, setEstandarizaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const canManage = useMemo(
    () => roles.some((role) => MANAGER_ROLES.includes(role)),
    [roles]
  );

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [eventosResponse, estandarizacionesResponse] = await Promise.all([
        eventoAPI.list(),
        tareaPorEstandarizarAPI.list(),
      ]);

      setEventos(normalizeCollection(eventosResponse));
      setEstandarizaciones(normalizeCollection(estandarizacionesResponse));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredEventos = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return eventos;

    return eventos.filter((evento) =>
      [
        evento.nombre,
        evento.clasificacion,
        evento.estandarizacion_codigo,
        evento.estandarizacion_nombre,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [eventos, search]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = eventos.filter((evento) => String(evento.fecha || "") >= today).length;

    return {
      eventos: eventos.length,
      tareas: new Set(eventos.map((evento) => evento.estandarizacion).filter(Boolean)).size,
      upcoming,
    };
  }, [eventos]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,35,70,0.08)]">
        <div className="relative overflow-hidden px-6 py-7 md:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,35,70,0.06),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(143,191,47,0.16),transparent_30%),linear-gradient(135deg,#ffffff_0%,#f7fafc_100%)]" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#d6e4ff] bg-[#eef4ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#173569]">
                <CalendarCheck2 className="h-3.5 w-3.5" />
                Asistencia
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
                Eventos y listas de asistencia
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Gestiona los eventos vinculados a tareas por estandarizar y entra a la lista
                de asistencia para marcar rapidamente a todos los trabajadores.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="Eventos" value={stats.eventos} />
              <StatCard label="Tareas activas" value={stats.tareas} />
              <StatCard label="Por realizar" value={stats.upcoming} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex items-center gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-3 shadow-[0_16px_34px_rgba(15,35,70,0.05)]">
          <Search className="h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por evento, clasificacion o tarea"
            className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
        </div>

        {canManage ? (
          <div className="rounded-[24px] border border-[#d6e4ff] bg-[#eef4ff] px-4 py-3 text-sm text-[#173569] shadow-[0_16px_34px_rgba(23,53,105,0.08)]">
            <div className="flex items-center gap-2 font-semibold">
              <Plus className="h-4 w-4" />
              Edicion inline activa
            </div>
            <div className="mt-1 text-xs leading-5 text-[#355181]">
              Crea o actualiza eventos desde la misma tabla y luego entra a cada lista.
            </div>
          </div>
        ) : null}
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <EventoTable
        eventos={filteredEventos}
        estandarizaciones={estandarizaciones}
        loading={loading}
        canManage={canManage}
        onChanged={loadData}
        onOpenList={(evento) => router.push(`/asistencia/${evento.id}`)}
      />
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-white/85 px-4 py-4 shadow-[0_18px_34px_rgba(15,35,70,0.06)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 flex items-center gap-2 text-2xl font-semibold text-slate-900">
        <UsersRound className="h-5 w-5 text-[#173569]" />
        {value}
      </div>
    </article>
  );
}
