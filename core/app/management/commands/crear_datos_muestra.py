from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError

from app.models import Cliente, Item, UbicacionCliente


class Command(BaseCommand):
    help = (
        "Crea un set de datos de muestra para testear la plataforma: "
        "unidades, proveedores, clientes, ubicaciones, maquinarias, "
        "repuestos y consumibles."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--prefijo",
            default="DEMO",
            help="Prefijo para los códigos y nombres de los datos de muestra.",
        )
        parser.add_argument(
            "--limpiar-antes",
            action="store_true",
            help="Limpia los datos operativos antes de crear la muestra.",
        )
        parser.add_argument(
            "--yes",
            action="store_true",
            help="Confirma la limpieza previa cuando se usa --limpiar-antes.",
        )

    def handle(self, *args, **options):
        prefijo = self._normalizar_prefijo(options["prefijo"])

        if options["limpiar_antes"]:
            if not options["yes"]:
                raise CommandError(
                    "Usa --yes junto con --limpiar-antes para confirmar la limpieza."
                )
            self.stdout.write(self.style.WARNING("Limpiando datos operativos previos..."))
            call_command("limpiar_tablas", yes=True, stdout=self.stdout)

        self.stdout.write(f"Creando datos de muestra con prefijo {prefijo}...")

        self._crear_unidades()
        proveedores = self._crear_proveedores(prefijo)
        self._crear_clientes_y_ubicaciones(prefijo)
        self._crear_maquinarias(prefijo)
        self._crear_repuestos(prefijo, proveedores)
        self._crear_consumibles(prefijo, proveedores)

        self.stdout.write(
            self.style.SUCCESS(
                "Datos de muestra creados. Ya puedes usar la plataforma con inventario demo."
            )
        )

    @staticmethod
    def _normalizar_prefijo(prefijo):
        prefijo = (prefijo or "DEMO").strip().upper()
        prefijo = prefijo.replace(" ", "-")
        if not prefijo:
            return "DEMO"
        return prefijo

    def _run_crear_catalogo(self, recurso, **kwargs):
        call_command(
            "crear_catalogo",
            recurso,
            stdout=self.stdout,
            **kwargs,
        )

    def _crear_unidades(self):
        unidades = [
            {
                "recurso": "unidad",
                "dimension_codigo": "UNIDAD",
                "dimension_nombre": "Unidad",
                "unidad_nombre": "Cantidad",
                "simbolo": "und",
                "base": True,
            },
            {
                "recurso": "unidad",
                "dimension_codigo": "VOLUMEN",
                "dimension_nombre": "Volumen",
                "unidad_nombre": "Litro",
                "simbolo": "L",
                "base": True,
            },
            {
                "recurso": "unidad",
                "dimension_codigo": "VOLUMEN",
                "unidad_nombre": "Galon",
                "simbolo": "gal",
                "factor": "3.785000",
            },
            {
                "recurso": "unidad",
                "dimension_codigo": "PESO",
                "dimension_nombre": "Peso",
                "unidad_nombre": "Kilogramo",
                "simbolo": "kg",
                "base": True,
            },
            {
                "recurso": "unidad",
                "dimension_codigo": "PESO",
                "unidad_nombre": "Gramo",
                "simbolo": "g",
                "factor": "1000",
            },
        ]

        for unidad in unidades:
            recurso = unidad.pop("recurso")
            self._run_crear_catalogo(recurso, **unidad)

    def _crear_proveedores(self, prefijo):
        proveedores = [
            {
                "ruc": f"{prefijo}-PROV-001",
                "nombre": f"{prefijo} Suministros Industriales",
                "direccion": "Av. Industrial 100 - Lima",
            },
            {
                "ruc": f"{prefijo}-PROV-002",
                "nombre": f"{prefijo} Lubricantes del Peru",
                "direccion": "Av. Logistica 245 - Callao",
            },
        ]

        for proveedor in proveedores:
            self._run_crear_catalogo("proveedor", **proveedor)
        return proveedores

    def _crear_clientes_y_ubicaciones(self, prefijo):
        clientes = [
            {
                "ruc": f"{prefijo}-CLI-001",
                "nombre": f"{prefijo} Mineria del Norte",
                "ubicaciones": [
                    {
                        "nombre": "Unidad Trujillo",
                        "direccion": "Km 24 Carretera Industrial - Trujillo",
                    },
                    {
                        "nombre": "Campamento Patio Equipos",
                        "direccion": "Sector Mantenimiento Mina Norte",
                    },
                ],
            },
            {
                "ruc": f"{prefijo}-CLI-002",
                "nombre": f"{prefijo} Obras y Servicios",
                "ubicaciones": [
                    {
                        "nombre": "Proyecto Callao",
                        "direccion": "Av. Portuaria 820 - Callao",
                    },
                    {
                        "nombre": "Base Lima Sur",
                        "direccion": "Parque Industrial Lurin - Lima",
                    },
                ],
            },
        ]

        for payload in clientes:
            ubicaciones = payload.pop("ubicaciones", [])
            cliente, _ = Cliente.objects.update_or_create(
                ruc=payload["ruc"],
                defaults={"nombre": payload["nombre"]},
            )
            for ubicacion in ubicaciones:
                UbicacionCliente.objects.update_or_create(
                    cliente=cliente,
                    nombre=ubicacion["nombre"],
                    defaults={"direccion": ubicacion.get("direccion", "")},
                )

    def _crear_maquinarias(self, prefijo):
        maquinarias = [
            {
                "codigo": f"{prefijo}-MQ-001",
                "nombre": "Excavadora 320",
                "descripcion": "Equipo demo para trabajos en campo",
                "observacion": "Unidad de muestra para mantenimiento correctivo",
                "horometro": "12450.5",
            },
            {
                "codigo": f"{prefijo}-MQ-002",
                "nombre": "Cargador Frontal 950",
                "descripcion": "Equipo demo para pruebas de repuestos",
                "observacion": "Unidad de muestra para mantenimiento preventivo",
                "horometro": "8720.0",
            },
            {
                "codigo": f"{prefijo}-MQ-003",
                "nombre": "Volquete FMX",
                "descripcion": "Equipo demo para pruebas de consumibles",
                "observacion": "Unidad de muestra para revisiones",
                "horometro": "15680.2",
            },
        ]

        for maquinaria in maquinarias:
            self._run_crear_catalogo("maquinaria", **maquinaria)

    def _crear_repuestos(self, prefijo, proveedores):
        proveedor_1 = proveedores[0]
        proveedor_2 = proveedores[1]
        repuestos = [
            {
                "codigo": f"{prefijo}-REP-001",
                "nombre": "Filtro de aceite",
                "cantidad": "4",
                "precio": "120.00",
                "proveedor_ruc": proveedor_1["ruc"],
                "proveedor_nombre": proveedor_1["nombre"],
                "series": ",".join(
                    [
                        f"{prefijo}-FOA-001",
                        f"{prefijo}-FOA-002",
                        f"{prefijo}-FOA-003",
                        f"{prefijo}-FOA-004",
                    ]
                ),
                "favorito": True,
            },
            {
                "codigo": f"{prefijo}-REP-002",
                "nombre": "Correa de alternador",
                "cantidad": "3",
                "precio": "210.00",
                "proveedor_ruc": proveedor_1["ruc"],
                "proveedor_nombre": proveedor_1["nombre"],
                "series": ",".join(
                    [
                        f"{prefijo}-COR-001",
                        f"{prefijo}-COR-002",
                        f"{prefijo}-COR-003",
                    ]
                ),
            },
            {
                "codigo": f"{prefijo}-REP-003",
                "nombre": "Kit de sellos hidráulicos",
                "cantidad": "2",
                "precio": "580.00",
                "proveedor_ruc": proveedor_2["ruc"],
                "proveedor_nombre": proveedor_2["nombre"],
                "series": ",".join(
                    [
                        f"{prefijo}-KSH-001",
                        f"{prefijo}-KSH-002",
                    ]
                ),
                "volvo": True,
            },
        ]

        for repuesto in repuestos:
            payload = dict(repuesto)
            if Item.objects.filter(codigo=payload["codigo"]).exists():
                payload["cantidad"] = "0"
            self._run_crear_catalogo("repuesto", **payload)

    def _crear_consumibles(self, prefijo, proveedores):
        proveedor_1 = proveedores[0]
        proveedor_2 = proveedores[1]
        consumibles = [
            {
                "codigo": f"{prefijo}-CON-001",
                "nombre": "Aceite 15W40",
                "dimension_codigo": "VOLUMEN",
                "unidad_nombre": "Litro",
                "cantidad": "40",
                "precio": "18.50",
                "proveedor_ruc": proveedor_2["ruc"],
                "proveedor_nombre": proveedor_2["nombre"],
                "favorito": True,
            },
            {
                "codigo": f"{prefijo}-CON-002",
                "nombre": "Refrigerante",
                "dimension_codigo": "VOLUMEN",
                "unidad_nombre": "Litro",
                "cantidad": "25",
                "precio": "22.00",
                "proveedor_ruc": proveedor_2["ruc"],
                "proveedor_nombre": proveedor_2["nombre"],
            },
            {
                "codigo": f"{prefijo}-CON-003",
                "nombre": "Grasa multiproposito",
                "dimension_codigo": "PESO",
                "unidad_nombre": "Kilogramo",
                "cantidad": "15",
                "precio": "16.75",
                "proveedor_ruc": proveedor_1["ruc"],
                "proveedor_nombre": proveedor_1["nombre"],
                "volvo": True,
            },
        ]

        for consumible in consumibles:
            payload = dict(consumible)
            if Item.objects.filter(codigo=payload["codigo"]).exists():
                payload["cantidad"] = "0"
            self._run_crear_catalogo("consumible", **payload)
