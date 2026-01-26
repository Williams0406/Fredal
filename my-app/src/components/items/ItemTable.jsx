"use client";

import { useEffect, useState } from "react";
import { itemAPI } from "@/lib/api";
import ItemFormModal from "./ItemFormModal";
import ItemHistorialModal from "./ItemHistorialModal";
import ItemUbicacionModal from "./ItemUbicacionModal";
import ItemKardexModal from "./ItemKardexModal";
import ItemProveedoresModal from "./ItemProveedoresModal";

export default function ItemTable() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  const [selectedItem, setSelectedItem] = useState(null);
  const [openHistorial, setOpenHistorial] = useState(false);
  const [openUbicacion, setOpenUbicacion] = useState(false);
  const [openKardex, setOpenKardex] = useState(false);
  const [openProveedores, setOpenProveedores] = useState(false);

  const loadItems = async () => {
    const res = await itemAPI.list();
    setItems(res.data);
  };

  useEffect(() => {
    loadItems();
  }, []);

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Inventario</h2>
        <button
          onClick={() => setOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          ➕ Nuevo Item
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3 text-left">Código</th>
              <th className="p-3 text-left">Item</th>
              <th className="p-3 text-center">Disponibles</th>
              <th className="p-3 text-center">Tipo</th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b hover:bg-gray-50">
                <td
                  className={`p-3 font-mono font-semibold ${
                    item.volvo ? "bg-yellow-200 text-yellow-900" : ""
                  }`}
                >
                  {item.codigo}
                </td>

                <td className="p-3">
                  <p className="font-medium">{item.nombre}</p>
                  <p className="text-xs text-gray-500">
                    {item.unidad_medida}
                  </p>
                </td>

                <td className="p-3 text-center font-semibold">
                  {item.unidades_disponibles}
                </td>

                <td className="p-3 text-center">
                  <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs">
                    {item.tipo_insumo}
                  </span>
                </td>

                <td className="p-3 text-center space-x-2">

                  <button
                    title="Ubicación"
                    onClick={() => {
                      setSelectedItem(item.id);
                      setOpenUbicacion(true);
                    }}
                  >
                    📍
                  </button>

                  <button
                    title="Historial"
                    onClick={() => {
                      setSelectedItem(item.id);
                      setOpenHistorial(true);
                    }}
                  >
                    📜
                  </button>

                  <button
                    title="Kardex"
                    onClick={() => {
                      setSelectedItem(item.id);
                      setOpenKardex(true);
                    }}
                  >
                    📊
                  </button>

                  <button
                    title="Proveedores"
                    onClick={() => {
                      setSelectedItem(item.id);
                      setOpenProveedores(true);
                    }}
                  >
                    💰
                  </button>

                </td>
              </tr>
            ))}

            {items.length === 0 && (
              <tr>
                <td colSpan="5" className="p-6 text-center text-gray-500">
                  No hay items registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODALES */}
      <ItemFormModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={loadItems}
      />

      <ItemHistorialModal
        open={openHistorial}
        itemId={selectedItem}
        onClose={() => setOpenHistorial(false)}
      />

      <ItemUbicacionModal
        open={openUbicacion}
        itemId={selectedItem}
        onClose={() => setOpenUbicacion(false)}
      />

      <ItemKardexModal
        open={openKardex}
        itemId={selectedItem}
        onClose={() => setOpenKardex(false)}
      />

      <ItemProveedoresModal
        open={openProveedores}
        itemId={selectedItem}
        onClose={() => setOpenProveedores(false)}
      />
      
    </div>
  );
}
