export const MENU_ITEMS = [
  {
    label: "Dashboard",
    path: "/dashboard",
    roles: [
      "Tecnico",
      "Jefe de Tecnicos",
      "Almacenero",
      "Jefe de Almaceneros",
      "ManageCompras",
      "admin",
    ],
  },

  {
    label: "Trabajos",
    path: "/trabajos",
    roles: ["Tecnico", "Jefe de Tecnicos", "admin"],
  },

  {
    label: "Compras",
    path: "/compras",
    roles: ["ManageCompras", "admin"],
  },

  {
    label: "Proveedores",
    path: "/proveedores",
    roles: ["ManageCompras", "admin"],
  },

  {
    label: "Items",
    path: "/items",
    roles: [
      "Almacenero",
      "Jefe de Almaceneros",
      "admin",
    ],
  },


  {
    label: "Clientes",
    path: "/clientes",
    roles: ["admin", "Jefe de Tecnicos", "ManageCompras"],
  },

  {
    label: "Unidades",
    path: "/unidades",
    roles: ["admin", "Almacenero", "Jefe de Almaceneros", "ManageCompras"],
  },
  {
    label: "Maquinarias",
    path: "/maquinaria",
    roles: ["admin"],
  },

  {
    label: "Trabajadores",
    path: "/trabajadores",
    roles: ["admin"],
  },

  {
    label: "Usuarios",
    path: "/usuarios",
    roles: ["admin"],
  },
];
