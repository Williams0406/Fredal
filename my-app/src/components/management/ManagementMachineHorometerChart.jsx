"use client";

import { useEffect, useMemo, useState } from "react";
import { maquinariaAPI } from "@/lib/api";
import ManagementMachineBarChart from "./ManagementMachineBarChart";

function formatHorometer(value) {
  const numericValue = Number(value ?? 0);
  if (!Number.isFinite(numericValue)) {
    return "0.00";
  }
  return numericValue.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizeMachines(payload) {
  const rows = Array.isArray(payload) ? payload : [];

  return rows
    .map((machine) => ({
      maquinariaId: machine.id,
      codigo: machine.codigo_maquina || `MQ-${machine.id}`,
      nombre: machine.nombre || "Maquinaria",
      horometroActual:
        machine.horometro_actual === null || machine.horometro_actual === undefined
          ? null
          : Number(machine.horometro_actual),
      fuenteHorometro: machine.horometro_fuente || null,
      fechaUltimoHorometro: machine.fecha_ultimo_horometro || null,
    }))
    .sort((left, right) => {
      const rightValue = right.horometroActual ?? -1;
      const leftValue = left.horometroActual ?? -1;
      if (rightValue !== leftValue) {
        return rightValue - leftValue;
      }
      return left.codigo.localeCompare(right.codigo);
    });
}

export default function ManagementMachineHorometerChart() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const loadMachines = async () => {
      try {
        setLoading(true);
        setLoadError("");
        const response = await maquinariaAPI.list();
        setMachines(normalizeMachines(response.data));
      } catch (error) {
        console.error("Error al cargar horometros de maquinarias:", error);
        setMachines([]);
        setLoadError(
          error?.response?.data?.detail ||
            "No se pudieron cargar los horometros actuales por maquinaria."
        );
      } finally {
        setLoading(false);
      }
    };

    loadMachines();
  }, []);

  const meta = useMemo(() => {
    return machines.reduce(
      (accumulator, row) => {
        if (row.horometroActual !== null && row.horometroActual !== undefined) {
          accumulator.totalConHorometro += 1;
        }
        if (row.fuenteHorometro === "MANUAL") {
          accumulator.totalManual += 1;
        }
        if (row.fuenteHorometro === "ORDEN_TRABAJO") {
          accumulator.totalOt += 1;
        }
        return accumulator;
      },
      {
        totalConHorometro: 0,
        totalManual: 0,
        totalOt: 0,
      }
    );
  }, [machines]);

  if (loading) {
    return (
      <section className="py-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#1e3a8a]" />
        <p className="mt-3 text-sm text-gray-600">
          Cargando horometros actuales por maquinaria...
        </p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="py-12 text-center">
        <h2 className="text-base font-semibold text-gray-900">
          No se pudo cargar el grafico de horometros
        </h2>
        <p className="mt-2 text-sm text-red-600">{loadError}</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-1 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
        <p>
          Maquinarias con horometro actual:{" "}
          <span className="font-medium text-gray-900">{meta.totalConHorometro}</span>
        </p>
        <p>
          Fuente manual:{" "}
          <span className="font-medium text-gray-900">{meta.totalManual}</span>
          {" · "}
          Fuente OT:{" "}
          <span className="font-medium text-gray-900">{meta.totalOt}</span>
        </p>
      </div>

      <ManagementMachineBarChart
        title="Horometro actual por maquinaria"
        subtitle="Cada barra usa el horometro actual resuelto por backend: valor manual si es el mas reciente o la ultima OT con fecha posterior."
        rows={machines}
        yLabel="Horometro"
        color="#0f766e"
        getValue={(row) => row.horometroActual}
        formatValue={(value) => formatHorometer(value)}
        noDataTitle="No hay horometros disponibles para graficar"
        noDataDescription="Cuando las maquinarias tengan un horometro actual calculable, apareceran aqui."
      />
    </section>
  );
}
