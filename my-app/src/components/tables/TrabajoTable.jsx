"use client";

import { useEffect, useState } from "react";
import { trabajoAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function TrabajoTable() {
  const [trabajos, setTrabajos] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await trabajoAPI.list();
      setTrabajos(res.data);
    } catch (err) {
      console.error("Error cargando trabajos", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <p>Cargando trabajos...</p>;

  return (
    <div className="space-y-4">
      <table className="w-full border">
        <thead className="bg-muted">
          <tr>
            <th className="p-2">Código</th>
            <th className="p-2">Actividad</th>
            <th className="p-2">Estado</th>
            <th className="p-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {trabajos.map((t) => (
            <tr key={t.id} className="border-t">
              <td className="p-2">{t.codigo_actividad}</td>
              <td className="p-2">{t.actividad}</td>
              <td className="p-2">{t.estatus}</td>
              <td className="p-2">
                <Link href={`/trabajos/${t.id}`}>
                  <Button size="sm">Ver</Button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Link href="/trabajos/create">
        <Button>Nuevo trabajo</Button>
      </Link>
    </div>
  );
}
