"use client";

import { useState } from "react";
import CompraTable from "@/components/compras/CompraTable";
import CompraForm from "@/components/compras/CompraForm";

export default function ComprasPage() {
  const [refresh, setRefresh] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Compras</h1>

      <CompraForm onCreated={() => setRefresh(r => !r)} />
      <CompraTable refresh={refresh} />
    </div>
  );
}
