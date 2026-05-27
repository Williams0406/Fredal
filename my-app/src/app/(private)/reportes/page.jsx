"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Plus, Search, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { reporteOrdenAPI, trabajoAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ReporteOrdenModal from "@/components/reportes/ReporteOrdenModal";
import ReporteOrdenTable from "@/components/reportes/ReporteOrdenTable";

const MANAGER_ROLES = [
  "admin",
  "Jefe de Tecnicos",
  "Jefe de Almaceneros",
  "Jefe de Mantenimiento",
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
  return "No se pudo cargar la vista de reportes.";
}

export default function ReportesPage() {
  const router = useRouter();
  const { roles = [] } = useAuth();
  const [reportes, setReportes] = useState([]);
  const [trabajos, setTrabajos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("TODOS");
  const [openModal, setOpenModal] = useState(false);

  const canManage = useMemo(
    () => roles.some((role) => MANAGER_ROLES.includes(role)),
    [roles]
  );

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [reportesResponse, trabajosResponse] = await Promise.all([
        reporteOrdenAPI.list(),
        trabajoAPI.list(),
      ]);

      setReportes(normalizeCollection(reportesResponse));
      setTrabajos(normalizeCollection(trabajosResponse));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const availableTrabajos = useMemo(() => {
    const reportesPorTrabajo = new Set(
      reportes
        .map((reporte) => reporte.orden_trabajo)
        .filter(Boolean)
        .map((id) => Number(id))
    );

    return trabajos
      .filter((trabajo) => trabajo.lugar === "CAMPO")
      .filter((trabajo) => !reportesPorTrabajo.has(Number(trabajo.id)));
  }, [reportes, trabajos]);

  const filteredReportes = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return reportes.filter((reporte) => {
      const matchesEstado = estado === "TODOS" || reporte.estado === estado;
      const searchableText = [
        reporte.codigo,
        reporte.orden_trabajo_codigo,
        reporte.orden_trabajo_display,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 || searchableText.includes(normalizedSearch);

      return matchesEstado && matchesSearch;
    });
  }, [estado, reportes, search]);

  const stats = useMemo(() => {
    const total = reportes.length;
    const realizados = reportes.filter((reporte) => reporte.estado === "REALIZADO").length;
    const pendientes = total - realizados;

    return {
      total,
      realizados,
      pendientes,
      disponibles: availableTrabajos.length,
    };
  }, [availableTrabajos.length, reportes]);

  const handleOpenReporte = (reporte) => {
    router.push(`/reportes/${reporte.id}`);
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,35,70,0.08)]">
        <div className="relative overflow-hidden px-6 py-7 md:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,35,70,0.06),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(143,191,47,0.16),transparent_30%),linear-gradient(135deg,#ffffff_0%,#f7fafc_100%)]" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#d6e4ff] bg-[#eef4ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#173569]">
                <ClipboardList className="h-3.5 w-3.5" />
                Reporte
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
                Reportes de trabajo en campo
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Supervisa, completa y revisa los reportes de trabajo vinculados a ordenes
                ejecutadas en campo.
              </p>
            </div>

            {canManage ? (
              <button
                type="button"
                onClick={() => setOpenModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#173569] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_38px_rgba(23,53,105,0.24)] transition hover:bg-[#0f2346]"
              >
                <Plus className="h-4.5 w-4.5" />
                Nuevo reporte
              </button>
            ) : null}
          </div>

          <div className="relative mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total"
              value={stats.total}
              tone="slate"
              icon={<ClipboardList className="h-4 w-4" />}
            />
            <StatCard
              label="Realizados"
              value={stats.realizados}
              tone="emerald"
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
            <StatCard
              label="Pendientes"
              value={stats.pendientes}
              tone="amber"
              icon={<ShieldAlert className="h-4 w-4" />}
            />
            <StatCard
              label="Sin reporte"
              value={stats.disponibles}
              tone="red"
              icon={<ShieldAlert className="h-4 w-4" />}
            />
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,35,70,0.06)]">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Buscar
            </span>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Codigo o orden de trabajo"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-[#173569] focus:ring-2 focus:ring-[#EAF1FF]"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Estado
            </span>
            <select
              value={estado}
              onChange={(event) => setEstado(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#173569] focus:ring-2 focus:ring-[#EAF1FF]"
            >
              <option value="TODOS">Todos</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="REALIZADO">Realizado</option>
            </select>
          </label>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </section>

      <ReporteOrdenTable
        reportes={filteredReportes}
        loading={loading}
        onOpenReporte={handleOpenReporte}
      />

      <ReporteOrdenModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onCreated={loadData}
        trabajos={availableTrabajos}
      />
    </div>
  );
}

function StatCard({ label, value, icon, tone = "slate" }) {
  const toneMap = {
    slate: "border-slate-200 bg-white/88 text-slate-700",
    emerald: "border-emerald-200 bg-emerald-50/80 text-emerald-700",
    amber: "border-amber-200 bg-amber-50/80 text-amber-700",
    red: "border-red-200 bg-red-50/80 text-red-700",
  };

  return (
    <article
      className={[
        "rounded-[24px] border px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]",
        toneMap[tone] || toneMap.slate,
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.18em]">
          {label}
        </span>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
          {icon}
        </span>
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-tight">{value}</div>
    </article>
  );
}
