"use client";

export default function TrabajadorFormModal({
  open,
  onClose,
  form,
  setForm,
  onSubmit,
}) {
  if (!open) return null;

  const handleChange = (key, value) => {
    setForm({ ...form, [key]: value });
  };

  return (
    // Overlay con transición suave
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fadeIn"
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-xl animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del modal */}
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[22px] font-semibold text-[#1e3a5f]">
                Nuevo trabajador
              </h2>
              <p className="text-[13px] text-gray-500 mt-1">
                Complete la información del trabajador
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors duration-200"
            >
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={onSubmit} className="px-6 py-6">
          <div className="space-y-5">
            {/* Nombres */}
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-2">
                Nombres <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.nombres}
                onChange={(e) => handleChange("nombres", e.target.value)}
                className="w-full px-4 py-2.5 text-[14px] text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition-all duration-200"
                placeholder="Ingrese los nombres"
                required
              />
            </div>

            {/* Apellidos */}
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-2">
                Apellidos <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.apellidos}
                onChange={(e) => handleChange("apellidos", e.target.value)}
                className="w-full px-4 py-2.5 text-[14px] text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition-all duration-200"
                placeholder="Ingrese los apellidos"
                required
              />
            </div>

            {/* DNI */}
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-2">
                DNI <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.dni}
                onChange={(e) => handleChange("dni", e.target.value)}
                className="w-full px-4 py-2.5 text-[14px] text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition-all duration-200"
                placeholder="Ingrese el DNI"
                maxLength="8"
                pattern="[0-9]{8}"
                required
              />
              <p className="text-[12px] text-gray-500 mt-1.5">
                Debe contener 8 dígitos
              </p>
            </div>

            {/* Puesto */}
            <div>
              <label className="block text-[13px] font-medium text-gray-700 mb-2">
                Puesto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.puesto}
                onChange={(e) => handleChange("puesto", e.target.value)}
                className="w-full px-4 py-2.5 text-[14px] text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f] focus:border-transparent transition-all duration-200"
                placeholder="Ej: Técnico, Operador, etc."
                required
              />
            </div>
          </div>

          {/* Footer con botones */}
          <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-[14px] font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 text-[14px] font-medium text-white bg-[#1e3a5f] rounded-lg hover:bg-[#152d4a] transition-colors duration-200"
            >
              Guardar trabajador
            </button>
          </div>
        </form>
      </div>

      {/* Estilos de animación */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}