"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [loading, isAuthenticated, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(username, password);
    } catch (err) {
      setError("Credenciales incorrectas. Por favor, verifica tus datos.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

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
            Sistema de Gestión y Analítica
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Peruvian Group - Maquinaria Pesada
          </p>
        </div>

        {/* Formulario de login */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-8 py-10">
          <h2 className="text-xl font-semibold text-[#1e3a8a] mb-6">
            Iniciar sesión
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Usuario */}
            <div>
              <label 
                htmlFor="username" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Usuario
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                         transition-all duration-200 placeholder:text-gray-400"
                placeholder="Ingresa tu usuario"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent
                         transition-all duration-200 placeholder:text-gray-400"
                placeholder="Ingresa tu contraseña"
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
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>
          </form>

          {/* Link a registro */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              ¿Tienes un código de registro?{" "}
              <a 
                href="/register" 
                className="text-[#1e3a8a] font-medium hover:text-[#1e3a8a]/80 
                         transition-colors duration-200"
              >
                Crear cuenta
              </a>
            </p>
          </div>
        </div>

        {/* Footer informativo */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Sistema empresarial de gestión operativa
          </p>
        </div>
      </div>
    </div>
  );
}