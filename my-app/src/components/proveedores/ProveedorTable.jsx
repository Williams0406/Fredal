export default function ProveedorTable({ proveedores }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">Nombre</th>
            <th className="p-2 border">RUC</th>
            <th className="p-2 border">Dirección</th>
          </tr>
        </thead>
        <tbody>
          {proveedores.map((p) => (
            <tr key={p.id}>
              <td className="p-2 border">{p.nombre}</td>
              <td className="p-2 border">{p.ruc}</td>
              <td className="p-2 border">{p.direccion}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
