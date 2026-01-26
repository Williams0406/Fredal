"use client";

import { useEffect, useState } from "react";
import { trabajoAPI } from "@/lib/api";

import KanbanBoard from "@/components/trabajos/KanbanBoard";
import TrabajoFormModal from "@/components/trabajos/TrabajoFormModal";
import TrabajoDetalleModal from "@/components/trabajos/TrabajoDetalleModal";

export default function TrabajosPage() {
  const [trabajos, setTrabajos] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleId, setDetalleId] = useState(null);

  const loadTrabajos = () =>
    trabajoAPI.list().then((res) =>
      setTrabajos(res.data)
    );

  useEffect(() => {
    loadTrabajos();
  }, []);

  const handleStatusChange = async (id, nuevoEstatus) => {
    // 1️⃣ Actualización optimista
    setTrabajos((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, estatus: nuevoEstatus } : t
      )
    );

    try {
      // 2️⃣ Persistir en backend
      await trabajoAPI.patch(id, { estatus: nuevoEstatus });
    } catch (error) {
      // 3️⃣ Revertir si falla
      console.error("Error actualizando estado", error);
      loadTrabajos();
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar orden de trabajo?")) return;
    await trabajoAPI.delete(id);
    loadTrabajos();
  };

  const handleEdit = (trabajo) => {
    setSelected(trabajo);
    setModalOpen(true);
  };

  const handleView = (trabajo) => {
    setDetalleId(trabajo.id);
    setDetalleOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h1 className="text-xl font-semibold">
          Órdenes de Trabajo
        </h1>

        <button
          className="btn-primary"
          onClick={() => {
            setSelected(null);
            setModalOpen(true);
          }}
        >
          + Nueva Orden
        </button>
      </div>

      <KanbanBoard
        trabajos={trabajos}
        onStatusChange={handleStatusChange}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
      />

      <TrabajoFormModal
        open={modalOpen}
        trabajo={selected}
        onClose={() => {
          setModalOpen(false);
          setSelected(null); // 👈 MUY importante
        }}
        onSaved={loadTrabajos}
      />

      <TrabajoDetalleModal
        open={detalleOpen}
        trabajoId={detalleId}
        onClose={() => {
          setDetalleOpen(false);
          setDetalleId(null);
        }}
        onUpdated={(trabajoActualizado) => {
          setTrabajos((prev) =>
            prev.map((t) =>
              t.id === trabajoActualizado.id ? trabajoActualizado : t
            )
          );
        }}
      />

    </div>
  );
}
