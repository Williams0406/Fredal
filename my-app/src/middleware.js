// middleware.js

import { NextResponse } from "next/server";
import { jwtDecode } from "jwt-decode";

/* =========================
   CONFIGURACIÓN
========================= */

// Rutas públicas (no requieren login)
const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
];

// Dashboards por rol
const ROLE_REDIRECT = {
  ADMIN: "/dashboard/admin",
  JEFE_MANTENIMIENTO: "/dashboard/mantenimiento",
  JEFE_ALMACEN: "/dashboard/almacen",
  MANAGE_COMPRAS: "/dashboard/compras",
  TECNICO: "/dashboard/tecnico",
  ALMACENERO: "/dashboard/almacen",
};

/* =========================
   MIDDLEWARE
========================= */

export function middleware(request) {
  const { pathname } = request.nextUrl;

  /* =========================
     PERMITIR ARCHIVOS
  ========================= */

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  /* =========================
     TOKEN
  ========================= */

  const token = request.cookies.get("access_token")?.value;

  /* =========================
     RUTAS PÚBLICAS
  ========================= */

  if (PUBLIC_ROUTES.includes(pathname)) {
    // Si está logueado, no dejar volver al login
    if (token && pathname === "/login") {
      return redirectByRole(token, request);
    }
    return NextResponse.next();
  }

  /* =========================
     RUTAS PRIVADAS
  ========================= */

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  /* =========================
     VALIDAR TOKEN
  ========================= */

  try {
    jwtDecode(token);
  } catch (error) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  /* =========================
     ACCESO CORRECTO
  ========================= */

  return NextResponse.next();
}

/* =========================
   REDIRECCIÓN POR ROL
========================= */

function redirectByRole(token, request) {
  try {
    jwtDecode(token); // solo valida el token
    return NextResponse.redirect(
      new URL("/dashboard", request.url)
    );
  } catch {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }
}

/* =========================
   MATCHER
========================= */

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
