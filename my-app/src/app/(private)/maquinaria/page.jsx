"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { maquinariaAPI } from "@/lib/api";
import MaquinariaTable from "@/components/maquinaria/MaquinariaTable";
import MaquinariaFormModal from "@/components/maquinaria/MaquinariaFormModal";

export default function MaquinariaPage() {
  const { roles } = useAuth();
  const [maquinarias, setMaquinarias] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const canManage = roles.includes("admin");

  const load = async () => {
    try {
      setLoading(true);
      const res = await maquinariaAPI.list();
      setMaquinarias(res.data);
    } catch (error) {
      console.error("Error al cargar maquinarias:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <div className="hidden">
          <h1 className="text-2xl font-semibold text-[#1e3a8a]">
            Maquinarias
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {canManage
              ? "Gestion de flota y equipos Volvo"
              : "Consulta de flota, historial, resumen y observaciones por maquinaria"}
          </p>
        </div>

        {canManage ? (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a8a] px-4 py-2.5 font-medium text-white shadow-sm transition-colors duration-150 hover:bg-[#1e40af]"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Nueva Maquinaria
          </button>
        ) : null}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#1e3a8a]" />
            <p className="mt-3 text-sm text-gray-600">Cargando maquinarias...</p>
          </div>
        ) : (
          <MaquinariaTable
            maquinarias={maquinarias}
            onUpdate={load}
            canManage={canManage}
          />
        )}
      </div>

      {canManage ? (
        <MaquinariaFormModal
          open={open}
          onClose={() => setOpen(false)}
          onSaved={load}
        />
      ) : null}
    </div>
  );
}
