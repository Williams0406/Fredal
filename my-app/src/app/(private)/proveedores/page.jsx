"use client";

import { useEffect, useState } from "react";
import { proveedorAPI } from "@/lib/api";
import ProveedorForm from "@/components/proveedores/ProveedorForm";
import ProveedorTable from "@/components/proveedores/ProveedorTable";

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState([]);

  const loadData = async () => {
    const res = await proveedorAPI.list();
    setProveedores(res.data);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Proveedores</h1>

      <ProveedorForm onCreated={loadData} />
      <ProveedorTable proveedores={proveedores} />
    </div>
  );
}
