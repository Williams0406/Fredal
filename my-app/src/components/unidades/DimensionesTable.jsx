"use client";

export default function DimensionesTable({ dimensiones, onEdit, onDelete }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Dimensiones registradas</h2>
          <p className="text-xs text-gray-500">
            Define dimensiones como Longitud, Volumen o Cantidad.
          </p>
        </div>
        <span className="text-xs text-gray-400">
          Total: {dimensiones.length}
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th>Código</th>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {dimensiones.map((dimension) => (
              <tr key={dimension.id} className="border-t">
                <td className="py-2 font-medium">{dimension.codigo}</td>
                <td className="py-2">{dimension.nombre}</td>
                <td className="py-2 text-xs text-gray-500">
                  {dimension.descripcion || "-"}
                </td>
                <td className="py-2">
                  {dimension.activo ? "Activo" : "Inactivo"}
                </td>
                <td className="py-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="text-xs font-semibold text-[#1e3a8a]"
                      onClick={() => onEdit(dimension)}
                    >
                      Editar
                    </button>
                    <button
                      className="text-xs font-semibold text-rose-600"
                      onClick={() => onDelete(dimension)}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {dimensiones.length === 0 ? (
              <tr>
                <td className="py-6 text-center text-sm text-gray-500" colSpan={5}>
                  Aún no tienes dimensiones registradas.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}