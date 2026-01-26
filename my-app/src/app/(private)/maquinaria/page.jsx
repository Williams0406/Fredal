"use client";

import { useEffect, useState } from "react";
import { maquinariaAPI } from "@/lib/api";
import MaquinariaTable from "@/components/maquinaria/MaquinariaTable";
import MaquinariaFormModal from "@/components/maquinaria/MaquinariaFormModal";

export default function MaquinariaPage() {
  const [maquinarias, setMaquinarias] = useState([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const res = await maquinariaAPI.list();
    setMaquinarias(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <div className="flex justify-between mb-4">
        <h1 className="text-xl font-semibold">Maquinarias</h1>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          + Nueva Maquinaria
        </button>
      </div>

      <MaquinariaTable maquinarias={maquinarias} />

      <MaquinariaFormModal
        open={open}
        onClose={() => setOpen(false)}
        onSaved={load}
      />
    </>
  );
}
