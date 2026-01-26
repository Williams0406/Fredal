export const ROUTE_PERMISSIONS = [
  {
    path: "/dashboard",
    roles: [
      "admin",
      "Tecnico",
      "Jefe de Tecnicos",
      "Almacenero",
      "Jefe de Almaceneros",
      "ManageCompras",
    ],
  },
  {
    path: "/trabajos",
    roles: ["Tecnico", "Jefe de Tecnicos", "admin"],
  },
  {
    path: "/items",
    roles: ["Almacenero", "Jefe de Almaceneros", "admin"],
  },
  {
    path: "/usuarios",
    roles: ["admin"],
  },
];
