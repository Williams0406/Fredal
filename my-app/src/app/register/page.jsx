"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registroAPI } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  
  const [form, setForm] = useState({
    username: "",
    password: "",
    codigo: "",
  });
  
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validaciones
    if (form.password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (!form.codigo.trim()) {
      setError("El código de registro es obligatorio");
      return;
    }

    setIsSubmitting(true);

    try {
      await registroAPI.registerWithCode(form);
      
      // Mostrar mensaje de éxito más elegante
      alert("✓ Usuario creado exitosamente. Ahora puedes iniciar sesión.");
      router.push("/");
      
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 
                       err.response?.data?.error || 
                       "Error al crear el usuario. Verifica el código de registro.";
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setForm({ ...form, [field]: value });
    if (error) setError(""); // Limpiar error al escribir
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        
        {/* Header de marca */}
        <div className="text-center mb-8">
          <div className="inline-block bg-[#1e3a8a] text-white px-6 py-3 rounded-lg mb-4">
            <h1 className="text-2xl font-semibold tracking-tight">
              FREDAL
            </h1>
          </div>
          <p className="text-base text-gray-600 font-medium">
            Registro de nuevo usuario
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Usa tu código de registro para crear una cuenta
          </p>
        </div>

        {/* Formulario de registro */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-8 py-10">
          <h2 className="text-xl font-semibold text-[#1e3a8a] mb-6">
            Crear cuenta
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Código de registro */}
            <div>
              <label 
                htmlFor="codigo" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Código de registro
              </label>
              <input
                id="codigo"
                type="text"
                value={form.codigo}
                onChange={(e) => handleInputChange("codigo", e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                         transition-all duration-200 placeholder:text-gray-400
                         uppercase tracking-wider font-mono"
                placeholder="XXXX-XXXX-XXXX"
                disabled={isSubmitting}
              />
              <p className="mt-2 text-xs text-gray-500">
                Código proporcionado por el administrador
              </p>
            </div>

            {/* Usuario */}
            <div>
              <label 
                htmlFor="username" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Nombre de usuario
              </label>
              <input
                id="username"
                type="text"
                value={form.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                         transition-all duration-200 placeholder:text-gray-400"
                placeholder="usuario123"
                disabled={isSubmitting}
              />
            </div>

            {/* Contraseña */}
            <div>
              <label 
                htmlFor="password" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                         transition-all duration-200 placeholder:text-gray-400"
                placeholder="Mínimo 6 caracteres"
                disabled={isSubmitting}
              />
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label 
                htmlFor="confirmPassword" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError("");
                }}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                         transition-all duration-200 placeholder:text-gray-400"
                placeholder="Repite tu contraseña"
                disabled={isSubmitting}
              />
            </div>

            {/* Botón de submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#1e3a8a] text-white py-3 px-4 rounded-lg text-sm font-medium
                       hover:bg-[#1e3a8a]/90 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] 
                       focus:ring-offset-2 transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>

          {/* Link a login */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              ¿Ya tienes una cuenta?{" "}
              <a 
                href="/" 
                className="text-[#1e3a8a] font-medium hover:text-[#1e3a8a]/80 
                         transition-colors duration-200"
              >
                Iniciar sesión
              </a>
            </p>
          </div>
        </div>

        {/* Footer informativo */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            El código de registro es proporcionado por el administrador del sistema
          </p>
        </div>
      </div>
    </div>
  );
}