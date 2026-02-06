"use client";

const categoriaLabel = (value, categorias) =>
  categorias.find((item) => item.value === value)?.label ?? value;

export default function UnidadesTable({
  unidades,
  categorias,
  onEdit,
  onDelete,
}) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Unidades registradas</h2>
          <p className="text-xs text-gray-500">
            Define la dimensión de cada unidad antes de crear equivalencias.
          </p>
        </div>
        <span className="text-xs text-gray-400">
          Total: {unidades.length}
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th>Unidad</th>
              <th>Símbolo</th>
              <th>Dimensión</th>
              <th>Base</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {unidades.map((unidad) => (
              <tr key={unidad.id} className="border-t">
                <td className="py-2 font-medium">{unidad.nombre}</td>
                <td className="py-2">{unidad.simbolo || "-"}</td>
                <td className="py-2">
                  {categoriaLabel(unidad.categoria, categorias)}
                </td>
                <td className="py-2">
                  {unidad.unidad_base ? "Sí" : "No"}
                </td>
                <td className="py-2">
                  {unidad.activo ? "Activo" : "Inactivo"}
                </td>
                <td className="py-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="text-xs font-semibold text-[#1e3a8a]"
                      onClick={() => onEdit(unidad)}
                    >
                      Editar
                    </button>
                    <button
                      className="text-xs font-semibold text-rose-600"
                      onClick={() => onDelete(unidad)}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {unidades.length === 0 ? (
              <tr>
                <td className="py-6 text-center text-sm text-gray-500" colSpan={6}>
                  Aún no tienes unidades registradas.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}