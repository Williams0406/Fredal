"use client";

export default function UnidadesRelacionTable({
  relaciones,
  dimensiones,
  onEdit,
  onDelete,
}) {
  const nombreDimension = (dimensionId) =>
    dimensiones.find((d) => d.id === dimensionId)?.nombre || "-";

  const agrupadas = relaciones.reduce((acc, relacion) => {
    if (!acc[relacion.dimension]) {
      acc[relacion.dimension] = [];
    }
    acc[relacion.dimension].push(relacion);
    return acc;
  }, {});

  return (
    <div className="rounded-lg border bg-white p-4">
      <div>
        <h2 className="font-semibold">Relaciones por dimensión</h2>
        <p className="text-xs text-gray-500">
          Define equivalencias entre unidades de la misma dimensión.
        </p>
      </div>

      {Object.keys(agrupadas).length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          Crea unidades para visualizar relaciones.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {Object.entries(agrupadas).map(([dimensionId, relacionesDimension]) => (
            <div key={dimensionId} className="rounded-lg border border-gray-100 p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#1e3a8a]">
                  {nombreDimension(Number(dimensionId))}
                </h3>
                <span className="text-xs text-gray-500">
                  Total relaciones: {relacionesDimension.length}
                </span>
              </div>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500">
                      <th>Relación</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relacionesDimension.map((relacion) => (
                      <tr key={relacion.id} className="border-t">
                        <td className="py-2 font-medium">
                          1 {relacion.unidad_base_detalle?.nombre} ={" "}
                          {relacion.factor}{" "}
                          {relacion.unidad_relacionada_detalle?.nombre}
                        </td>
                        <td className="py-2">
                          {relacion.activo ? "Activo" : "Inactivo"}
                        </td>
                        <td className="py-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              className="text-xs font-semibold text-[#1e3a8a]"
                              onClick={() => onEdit(relacion)}
                            >
                              Editar
                            </button>
                            <button
                              className="text-xs font-semibold text-rose-600"
                              onClick={() => onDelete(relacion)}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}