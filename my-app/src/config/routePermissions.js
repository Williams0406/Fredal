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
    roles: ["Tecnico", "Jefe de Tecnicos", "admin", "ManageCompras", "Jefe de Almaceneros", "Almacenero"],
  },
  {
    path: "/items",
    roles: ["Almacenero", "Jefe de Almaceneros", "admin", "ManageCompras"],
  },
  {
    path: "/usuarios",
    roles: ["admin"],
  },
];