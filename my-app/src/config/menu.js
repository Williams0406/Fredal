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
    roles: ["Tecnico", "Jefe de Tecnicos", "admin", "ManageCompras", "Jefe de Almaceneros", "Almacenero"],
  },

  {
    label: "Compras",
    path: "/compras",
    roles: ["ManageCompras", "admin", "Jefe de Almaceneros", "Almacenero"],
  },

  {
    label: "Proveedores",
    path: "/proveedores",
    roles: ["ManageCompras", "admin"],
  },

  {
    label: "Almacén",
    path: "/almacen",
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
    label: "Importar / Exportar",
    path: "/catalogo-sync",
    roles: ["admin"],
  },
  {
    label: "Maquinarias",
    path: "/maquinaria",
    roles: ["admin", "Jefe de Tecnicos", "Jefe de Almaceneros", "ManageCompras"],
  },
  {
    label: "Gestion",
    path: "/gestion",
    roles: ["admin", "Jefe de Tecnicos", "Jefe de Almaceneros", "ManageCompras"],
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
