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
    path: "/almacen",
    roles: ["Almacenero", "Jefe de Almaceneros", "admin", "ManageCompras"],
  },
  {
    path: "/items",
    roles: ["Almacenero", "Jefe de Almaceneros", "admin", "ManageCompras"],
  },
  {
    path: "/maquinaria",
    roles: ["admin", "Jefe de Tecnicos", "Jefe de Almaceneros", "ManageCompras"],
  },
  {
    path: "/gestion",
    roles: ["admin", "Jefe de Tecnicos", "Jefe de Almaceneros", "ManageCompras"],
  },
  {
    path: "/usuarios",
    roles: ["admin"],
  },
  {
    path: "/catalogo-sync",
    roles: ["admin"],
  },
];
