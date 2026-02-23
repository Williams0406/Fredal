"use client";

import { useState, useEffect } from "react";
import { compraAPI } from "@/lib/api";
import CompraTable from "@/components/compras/CompraTable";
import CompraForm from "@/components/compras/CompraForm";
import TipoCambioModal from "@/components/compras/TipoCambioModal";
import {
  Package,
  Coins,
  DollarSign,
  Wrench,
  Building2,
} from "lucide-react";

export default function ComprasPage() {
  const [refresh, setRefresh] = useState(false);
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompras();
  }, [refresh]);

  const loadCompras = async () => {
    setLoading(true);
    try {
      const res = await compraAPI.list();
      setCompras(res.data);
    } catch (error) {
      console.error("Error cargando compras:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calcular estadísticas
  const stats = {
    total: compras.length,
    totalCostoSoles: compras
      .filter((c) => c.moneda === "PEN")
      .reduce((sum, c) => sum + Number(c.costo_total), 0),
    totalCostoDolares: compras
      .reduce((sum, c) => sum + Number(c.costo_total_usd || 0), 0),
    totalCostoEuros: compras
      .reduce((sum, c) => sum + Number(c.costo_total_eur || 0), 0),
    itemsUnicos: new Set(compras.map((c) => c.item_codigo)).size,
    proveedoresUnicos: new Set(
      compras.filter((c) => c.proveedor_nombre).map((c) => c.proveedor_nombre)
    ).size,
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1e3a8a]">
            Gestión de Compras
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Registro y seguimiento de adquisiciones
          </p>
        </div>

        <div className="flex items-center gap-2">
          <TipoCambioModal onCreated={() => setRefresh((r) => !r)} />
          <CompraForm onCreated={() => setRefresh((r) => !r)} />
        </div>
      </div>

      {/* KPIs */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <KPICard
            label="Total Compras"
            value={stats.total}
            icon={Package}
            color="blue"
          />
          <KPICard
            label="Costo Total (S/)"
            value={`S/ ${stats.totalCostoSoles.toFixed(2)}`}
            icon={Coins}
            color="green"
            size="small"
          />
          <KPICard
            label="Costo Total ($)"
            value={`$ ${stats.totalCostoDolares.toFixed(2)}`}
            icon={DollarSign}
            color="green"
            size="small"
          />
          <KPICard
            label="Costo Total (€)"
            value={`€ ${stats.totalCostoEuros.toFixed(2)}`}
            icon={DollarSign}
            color="green"
            size="small"
          />
          <KPICard
            label="Items Únicos"
            value={stats.itemsUnicos}
            icon={Wrench}
            color="gray"
          />
          <KPICard
            label="Proveedores"
            value={stats.proveedoresUnicos}
            icon={Building2}
            color="gray"
          />
        </div>
      )}

      {/* Tabla de compras */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Cargando compras...</p>
          </div>
        </div>
      ) : (
        <CompraTable refresh={refresh} compras={compras} />
      )}
    </div>
  );
}

// Componente KPI Card
function KPICard({ label, value, icon: Icon, color, size = "normal" }) {
  const colorClasses = {
    blue: "text-[#1e3a8a]",
    green: "text-[#84cc16]",
    gray: "text-gray-600",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 rounded-lg bg-gray-100">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>

        <span
          className={`${
            size === "small" ? "text-lg" : "text-3xl"
          } font-semibold ${colorClasses[color]}`}
        >
          {value}
        </span>
      </div>

      <p className="text-sm text-gray-600 font-medium">{label}</p>
    </div>
  );
}