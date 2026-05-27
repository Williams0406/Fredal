"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Link2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import ChecklistRelationEditorTable from "@/components/checklist/ChecklistRelationEditorTable";
import {
  actividadChecklistAPI,
  checklistAPI,
  sistemaAPI,
} from "@/lib/api";
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
  return "No se pudo cargar el editor de relaciones.";
}

export default function ChecklistPlantillaRelacionPage() {
  const router = useRouter();
  const params = useParams();
  const checklistId = params?.id;
  const { roles = [] } = useAuth();
  const [checklist, setChecklist] = useState(null);
  const [actividadesBase, setActividadesBase] = useState([]);
  const [sistemas, setSistemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canManage = useMemo(
    () => roles.some((role) => MANAGER_ROLES.includes(role)),
    [roles]
  );

  const loadData = async () => {
    if (!checklistId) return;

    setLoading(true);
    setError("");

    try {
      const [checklistResponse, actividadesResponse, sistemasResponse] =
        await Promise.all([
          checklistAPI.retrieve(checklistId),
          actividadChecklistAPI.list(),
          sistemaAPI.list(),
        ]);

      setChecklist(checklistResponse?.data || null);
      setActividadesBase(normalizeCollection(actividadesResponse));
      setSistemas(normalizeCollection(sistemasResponse));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [checklistId]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,35,70,0.08)]">
        <div className="relative overflow-hidden px-6 py-7 md:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,35,70,0.06),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(143,191,47,0.16),transparent_30%),linear-gradient(135deg,#ffffff_0%,#f7fafc_100%)]" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <button
                type="button"
                onClick={() => router.push("/checklist")}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:bg-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver a checklist
              </button>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#d6e4ff] bg-[#eef4ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#173569]">
                <Link2 className="h-3.5 w-3.5" />
                Edicion de relacion
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
                {checklist?.motivo || "Checklist en configuracion"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Ajusta la secuencia de actividades y sistemas directamente en
                tabla, con filtros inline por celda y alta de nuevas filas desde
                el pie.
              </p>
            </div>

            {checklist ? (
              <div className="grid gap-3 rounded-[26px] border border-slate-200 bg-white/85 p-4 shadow-[0_18px_34px_rgba(15,35,70,0.06)] sm:grid-cols-2">
                <InfoPill
                  label="Estado"
                  value={checklist.estado_label || checklist.estado || "-"}
                />
                <InfoPill
                  label="Filas actuales"
                  value={String(checklist.actividades_count ?? 0)}
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

      {loading ? (
        <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500 shadow-[0_20px_50px_rgba(15,35,70,0.06)]">
          Cargando editor de plantilla...
        </div>
      ) : null}

      {!loading && checklist ? (
        <ChecklistRelationEditorTable
          checklist={checklist}
          actividadesBase={actividadesBase}
          sistemas={sistemas}
          canManage={canManage}
          onSaved={loadData}
        />
      ) : null}

      {!loading && !checklist && !error ? (
        <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500 shadow-[0_20px_50px_rgba(15,35,70,0.06)]">
          No se encontro el checklist solicitado.
        </div>
      ) : null}
    </div>
  );
}

function InfoPill({ label, value }) {
  return (
    <article className="rounded-[20px] border border-slate-200 bg-slate-50/80 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-base font-semibold text-slate-800">{value}</div>
    </article>
  );
}
