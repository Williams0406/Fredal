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
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const [selectedItem, setSelectedItem] = useState(null);
  const [openHistorial, setOpenHistorial] = useState(false);
  const [openUbicacion, setOpenUbicacion] = useState(false);
  const [openKardex, setOpenKardex] = useState(false);
  const [openProveedores, setOpenProveedores] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await itemAPI.list();
      setItems(res.data);
    } catch (error) {
      console.error("Error loading items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-[#1e3a8a]">
            Inventario de Items
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Catálogo de repuestos y consumibles
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="bg-[#1e3a8a] text-white px-5 py-2.5 rounded-lg text-sm font-medium
                   hover:bg-[#1e3a8a]/90 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] 
                   focus:ring-offset-2 transition-all duration-200 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Item
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Cargando inventario...</p>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="text-sm text-gray-600 font-medium">
            No hay items registrados
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Comienza agregando tu primer item al inventario
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Disponibles
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors duration-150">
                    {/* Código */}
                    <td
                      className={`
                        px-4 py-3 text-sm font-mono font-semibold
                        ${item.volvo 
                          ? "bg-yellow-50 text-yellow-900" 
                          : "text-gray-900"
                        }
                      `}
                    >
                      {item.codigo}
                      {item.volvo && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-200 text-yellow-800 rounded font-sans">
                          VOLVO
                        </span>
                      )}
                    </td>

                    {/* Item */}
                    <td className="px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{item.nombre}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.unidad_medida}
                        </p>
                      </div>
                    </td>

                    {/* Disponibles */}
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-[#1e3a8a] font-semibold text-sm">
                        {item.unidades_disponibles}
                      </span>
                    </td>

                    {/* Tipo */}
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`
                          inline-flex px-2.5 py-1 rounded-full text-xs font-semibold
                          ${item.tipo_insumo === "REPUESTO" 
                            ? "bg-blue-100 text-blue-700" 
                            : "bg-purple-100 text-purple-700"
                          }
                        `}
                      >
                        {item.tipo_insumo}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <ActionButton
                          title="Ubicación de unidades"
                          icon="location"
                          onClick={() => {
                            setSelectedItem(item.id);
                            setOpenUbicacion(true);
                          }}
                        />

                        <ActionButton
                          title="Historial de movimientos"
                          icon="history"
                          onClick={() => {
                            setSelectedItem(item.id);
                            setOpenHistorial(true);
                          }}
                        />

                        <ActionButton
                          title="Kardex contable"
                          icon="chart"
                          onClick={() => {
                            setSelectedItem(item.id);
                            setOpenKardex(true);
                          }}
                        />

                        <ActionButton
                          title="Proveedores y precios"
                          icon="money"
                          onClick={() => {
                            setSelectedItem(item.id);
                            setOpenProveedores(true);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modales */}
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

// Componente de botón de acción
function ActionButton({ title, icon, onClick }) {
  const icons = {
    location: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    history: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    chart: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    money: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <button
      onClick={onClick}
      title={title}
      className="p-2 text-gray-600 hover:text-[#1e3a8a] hover:bg-blue-50 
               rounded-lg transition-all duration-200"
    >
      {icons[icon]}
    </button>
  );
}