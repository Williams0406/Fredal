"use client";

import { useEffect, useMemo, useState } from "react";
import { maquinariaAPI } from "@/lib/api";
import { buildMachineIndicators } from "./buildMachineIndicators";
import ManagementMTBFChart from "./ManagementMTBFChart";
import ManagementMTTRChart from "./ManagementMTTRChart";
import ManagementCECOChart from "./ManagementCECOChart";

export default function ManagementMachineIndicators() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const loadIndicators = async () => {
      try {
        setLoading(true);
        setLoadError("");
        const response = await maquinariaAPI.gestionIndicadoresMaquinaria();
        setPayload(response.data);
      } catch (error) {
        console.error("Error al cargar indicadores por maquinaria:", error);
        setPayload(null);
        setLoadError(
          error?.response?.data?.detail ||
            "No se pudieron cargar los indicadores por maquinaria."
        );
      } finally {
        setLoading(false);
      }
    };

    loadIndicators();
  }, []);

  const { rows, meta } = useMemo(() => buildMachineIndicators(payload), [payload]);

  if (loading) {
    return (
      <section className="py-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#1e3a8a]" />
        <p className="mt-3 text-sm text-gray-600">
          Cargando indicadores por maquinaria...
        </p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="py-12 text-center">
        <h2 className="text-base font-semibold text-gray-900">
          No se pudieron cargar los indicadores
        </h2>
        <p className="mt-2 text-sm text-red-600">{loadError}</p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-1 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
        <p>
          Maquinarias evaluadas:{" "}
          <span className="font-medium text-gray-900">{meta.totalMaquinarias}</span>
        </p>
        <p>
          Con MTBF:{" "}
          <span className="font-medium text-gray-900">{meta.maquinariasConMtbf}</span>
          {" · "}
          Con MTTR:{" "}
          <span className="font-medium text-gray-900">{meta.maquinariasConMttr}</span>
        </p>
      </div>

      <ManagementMTBFChart rows={rows} />
      <ManagementMTTRChart rows={rows} />
      <ManagementCECOChart rows={rows} />
    </section>
  );
}
