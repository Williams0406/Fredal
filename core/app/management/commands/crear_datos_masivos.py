from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import time, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.contrib.auth.models import User
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from app.models import (
    ActividadTrabajo,
    Almacen,
    Cliente,
    Compra,
    CompraDetalle,
    HistorialConsumible,
    HistorialUbicacionItem,
    Item,
    ItemGrupo,
    ItemGrupoDetalle,
    ItemUnidad,
    LoteConsumible,
    Maquinaria,
    MovimientoConsumible,
    MovimientoRepuesto,
    OrdenCompra,
    OrdenRequerimiento,
    OrdenTrabajo,
    PerfilUsuario,
    Proveedor,
    TecnicoAsignado,
    TipoCambioDiario,
    Trabajador,
    UbicacionCliente,
    current_local_date,
)
from app.serializers import (
    MovimientoConsumibleSerializer,
    MovimientoRepuestoSerializer,
    OrdenCompraSerializer,
    OrdenRequerimientoSerializer,
    OrdenTrabajoSerializer,
    actualizar_stock_item,
)


@dataclass
class ItemSeed:
    item: Item
    proveedor: Proveedor


class Command(BaseCommand):
    help = (
        "Limpia los datos operativos actuales y crea un dataset masivo para "
        "probar indicadores, ordenes de trabajo, materiales e historiales, "
        "preservando usuarios y trabajadores."
    )

    CLIENTES_BASE = [
        "Mineria Andina",
        "Servicios del Pacifico",
        "Energia del Sur",
        "Logistica Sierra",
        "Obras del Centro",
        "Proyecto Horizonte",
        "Canteras del Norte",
        "Infraestructura Nacional",
        "Transportes del Valle",
        "Metalurgia Costera",
    ]

    UBICACIONES_BASE = [
        "Patio principal",
        "Campamento norte",
        "Zona de chancado",
        "Taller de linea amarilla",
        "Frente de carga",
        "Base operativa",
        "Planta concentradora",
        "Area de servicios",
    ]

    PROVEEDORES_BASE = [
        "Suministros Industriales",
        "Lubricantes del Peru",
        "Partes Hidraulicas",
        "Motores y Equipos",
        "Ferreteria Tecnica",
        "Insumos de Campo",
        "Rodamientos Andinos",
        "Fluidos y Filtros",
    ]

    MAQUINARIAS_BASE = [
        "Excavadora 320D",
        "Cargador frontal 950H",
        "Volquete FMX 8x4",
        "Retroexcavadora 420F",
        "Motoniveladora 140K",
        "Rodillo CS54B",
        "Tractor D6R",
        "Camion cisterna 6x4",
        "Compresor portatil XRVS",
        "Grua articulada 25T",
    ]

    REPUESTOS_BASE = [
        "Filtro de aceite",
        "Filtro de aire primario",
        "Filtro de combustible",
        "Correa de alternador",
        "Kit de sellos hidraulicos",
        "Bomba de agua",
        "Sensor de presion",
        "Manguera hidraulica",
        "Juego de pastillas de freno",
        "Rodamiento de rueda",
        "Buje de brazo",
        "Terminal de direccion",
    ]

    CONSUMIBLES_BASE = [
        ("Aceite 15W40", "VOLUMEN", "Volumen", "Litro", "L"),
        ("Refrigerante", "VOLUMEN", "Volumen", "Litro", "L"),
        ("Grasa multiproposito", "PESO", "Peso", "Kilogramo", "kg"),
        ("Aceite hidraulico ISO 46", "VOLUMEN", "Volumen", "Litro", "L"),
        ("Desengrasante industrial", "VOLUMEN", "Volumen", "Litro", "L"),
        ("Limpiador de frenos", "VOLUMEN", "Volumen", "Litro", "L"),
        ("Pasta antiadherente", "PESO", "Peso", "Kilogramo", "kg"),
        ("Aditivo para combustible", "VOLUMEN", "Volumen", "Litro", "L"),
    ]

    PRIORIDADES = ["URGENTE", "EMERGENCIA", "REGULAR"]
    LUGARES = ["TALLER", "CAMPO"]
    ESTADOS_EQUIPO = ["OPERATIVO", "INOPERATIVO"]
    TIPOS_MANTENIMIENTO = [
        ("PREVENTIVO", ["PM1", "PM2", "PM3", "PM4"]),
        ("CORRECTIVO", ["LEVE", "MEDIANO", "GRAVE"]),
        ("PREDICTIVO", ["LEVE", "MEDIANO", "GRAVE"]),
        ("OVERHAUL", ["LEVE", "MEDIANO", "REGULAR"]),
    ]

    def add_arguments(self, parser):
        parser.add_argument("--prefijo", default="MASIVO", help="Prefijo para codigos demo.")
        parser.add_argument("--seed", type=int, default=20260507, help="Semilla para generar datos reproducibles.")
        parser.add_argument("--clientes", type=int, default=8, help="Cantidad de clientes demo.")
        parser.add_argument(
            "--ubicaciones-por-cliente",
            type=int,
            default=3,
            help="Cantidad de ubicaciones por cliente.",
        )
        parser.add_argument("--proveedores", type=int, default=6, help="Cantidad de proveedores demo.")
        parser.add_argument("--maquinarias", type=int, default=10, help="Cantidad de maquinarias demo.")
        parser.add_argument("--repuestos", type=int, default=10, help="Cantidad de items repuesto.")
        parser.add_argument("--consumibles", type=int, default=6, help="Cantidad de items consumible.")
        parser.add_argument("--ordenes", type=int, default=120, help="Cantidad total de ordenes de trabajo.")
        parser.add_argument(
            "--actividades-min",
            type=int,
            default=2,
            help="Cantidad minima de actividades registradas por orden.",
        )
        parser.add_argument(
            "--actividades-max",
            type=int,
            default=4,
            help="Cantidad maxima de actividades registradas por orden.",
        )
        parser.add_argument(
            "--ordenes-compra",
            type=int,
            default=16,
            help="Cantidad de ordenes de compra demo.",
        )
        parser.add_argument(
            "--ordenes-requerimiento-fraccion",
            type=float,
            default=0.35,
            help="Fraccion de ordenes de trabajo que recibiran orden de requerimiento.",
        )
        parser.add_argument(
            "--yes",
            action="store_true",
            help="Confirma la limpieza y generacion sin pedir texto adicional.",
        )

    def handle(self, *args, **options):
        self.prefijo = self._normalizar_prefijo(options["prefijo"])
        self.random = random.Random(options["seed"])
        self.actividades_min = options["actividades_min"]
        self.actividades_max = options["actividades_max"]
        self.today = current_local_date()
        self.user_emisor = User.objects.order_by("id").first()

        if self.actividades_min <= 0 or self.actividades_max < self.actividades_min:
            raise CommandError("Los limites de actividades no son validos.")

        if options["ordenes"] <= 0:
            raise CommandError("Debes solicitar al menos una orden de trabajo.")
        if options["maquinarias"] <= 0:
            raise CommandError("Debes solicitar al menos una maquinaria.")
        if options["proveedores"] <= 0:
            raise CommandError("Debes solicitar al menos un proveedor.")
        if options["clientes"] <= 0 or options["ubicaciones_por_cliente"] <= 0:
            raise CommandError("Clientes y ubicaciones por cliente deben ser mayores a cero.")
        if options["repuestos"] <= 0 or options["consumibles"] <= 0:
            raise CommandError("Debes solicitar al menos un repuesto y un consumible.")

        if not options["yes"]:
            self.stdout.write(
                self.style.WARNING(
                    "Se eliminaran los datos operativos actuales y se generara "
                    "un dataset masivo nuevo. Usuarios y trabajadores se conservaran."
                )
            )
            confirmacion = input("Escribe MASIVO para continuar: ").strip().upper()
            if confirmacion != "MASIVO":
                raise CommandError("Operacion cancelada.")

        self.tecnicos = self._obtener_tecnicos()
        if not self.tecnicos:
            raise CommandError(
                "No hay trabajadores tecnicos disponibles. Conserva o crea al menos uno antes de ejecutar este comando."
            )

        self.stdout.write(self.style.WARNING("Limpiando datos operativos actuales..."))
        call_command("limpiar_tablas", yes=True, stdout=self.stdout)

        self.stdout.write(self.style.WARNING("Creando catalogos base..."))
        self._crear_unidades_base()
        self.almacen_central = Almacen.objects.get_or_create(nombre="Almacen Central")[0]
        self.proveedores = self._crear_proveedores(options["proveedores"])
        self.clientes, self.ubicaciones = self._crear_clientes_y_ubicaciones(
            options["clientes"],
            options["ubicaciones_por_cliente"],
        )
        self.maquinarias = self._crear_maquinarias(options["maquinarias"])
        self.repuestos = self._crear_repuestos(options["repuestos"], options["ordenes"])
        self.consumibles = self._crear_consumibles(options["consumibles"], options["ordenes"])
        self._crear_item_grupos()
        self._crear_tipos_cambio()

        self.stdout.write(self.style.WARNING("Generando ordenes, actividades y materiales..."))
        self._crear_ordenes_trabajo(
            total_ordenes=options["ordenes"],
            fraccion_requerimientos=options["ordenes_requerimiento_fraccion"],
        )

        self.stdout.write(self.style.WARNING("Generando ordenes de compra demo..."))
        self._crear_ordenes_compra(options["ordenes_compra"])

        self._mostrar_resumen()

    def _normalizar_prefijo(self, prefijo):
        prefijo = (prefijo or "MASIVO").strip().upper().replace(" ", "-")
        return prefijo or "MASIVO"

    def _run_crear_catalogo(self, recurso, **kwargs):
        call_command("crear_catalogo", recurso, stdout=self.stdout, **kwargs)

    def _obtener_tecnicos(self):
        trabajadores_ids = list(
            PerfilUsuario.objects.filter(user__groups__name="Tecnico")
            .values_list("trabajador_id", flat=True)
            .distinct()
        )
        tecnicos = list(Trabajador.objects.filter(id__in=trabajadores_ids).order_by("id"))
        if tecnicos:
            return tecnicos
        tecnicos = list(Trabajador.objects.filter(puesto__icontains="tecnico").order_by("id"))
        if tecnicos:
            return tecnicos
        return []

    def _crear_unidades_base(self):
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
            payload = dict(unidad)
            recurso = payload.pop("recurso")
            self._run_crear_catalogo(recurso, **payload)

    def _crear_proveedores(self, cantidad):
        proveedores = []
        for index in range(cantidad):
            base = self.PROVEEDORES_BASE[index % len(self.PROVEEDORES_BASE)]
            nombre = f"{self.prefijo} {base} {index + 1:02d}"
            ruc = f"20{700000000 + index:09d}"
            direccion = f"Av. Industrial {index + 1:03d} - Lima"
            self._run_crear_catalogo(
                "proveedor",
                ruc=ruc,
                nombre=nombre,
                direccion=direccion,
            )
            proveedores.append(Proveedor.objects.get(ruc=ruc))
        return proveedores

    def _crear_clientes_y_ubicaciones(self, cantidad_clientes, ubicaciones_por_cliente):
        clientes = []
        ubicaciones = []

        for index in range(cantidad_clientes):
            nombre_base = self.CLIENTES_BASE[index % len(self.CLIENTES_BASE)]
            cliente = Cliente.objects.create(
                nombre=f"{self.prefijo} {nombre_base} {index + 1:02d}",
                ruc=f"10{800000000 + index:09d}",
            )
            clientes.append(cliente)

            for ubicacion_index in range(ubicaciones_por_cliente):
                nombre_ubicacion = self.UBICACIONES_BASE[
                    (index + ubicacion_index) % len(self.UBICACIONES_BASE)
                ]
                ubicacion = UbicacionCliente.objects.create(
                    cliente=cliente,
                    nombre=f"{nombre_ubicacion} {ubicacion_index + 1}",
                    direccion=f"Sector {index + 1:02d} - Zona {ubicacion_index + 1:02d}",
                )
                ubicaciones.append(ubicacion)

        return clientes, ubicaciones

    def _crear_maquinarias(self, cantidad):
        maquinarias = []
        for index in range(cantidad):
            nombre = self.MAQUINARIAS_BASE[index % len(self.MAQUINARIAS_BASE)]
            codigo = f"{self.prefijo}-MQ-{index + 1:03d}"
            horometro = Decimal("950.00") + Decimal(index * 425) + Decimal(self.random.randint(0, 90))
            self._run_crear_catalogo(
                "maquinaria",
                codigo=codigo,
                nombre=nombre,
                descripcion=f"Unidad demo {index + 1:03d} para pruebas de indicadores.",
                observacion=f"Creada por el comando {self.prefijo}.",
                horometro=str(horometro),
            )
            maquinarias.append(Maquinaria.objects.get(codigo_maquina=codigo))
        return maquinarias

    def _crear_repuestos(self, cantidad, total_ordenes):
        seeds = []
        unidades_por_item = max(30, (total_ordenes // max(cantidad, 1)) * 3)

        for index in range(cantidad):
            proveedor = self.proveedores[index % len(self.proveedores)]
            nombre = self.REPUESTOS_BASE[index % len(self.REPUESTOS_BASE)]
            codigo = f"{self.prefijo}-REP-{index + 1:03d}"
            series = ",".join(
                f"{codigo}-S{serie_index + 1:04d}"
                for serie_index in range(unidades_por_item)
            )
            precio = Decimal("85.00") + Decimal(index * 22)

            self._run_crear_catalogo(
                "repuesto",
                codigo=codigo,
                nombre=nombre,
                cantidad=str(unidades_por_item),
                precio=str(precio),
                proveedor_ruc=proveedor.ruc,
                proveedor_nombre=proveedor.nombre,
                series=series,
                favorito=index % 4 == 0,
                volvo=index % 5 == 0,
            )
            seeds.append(
                ItemSeed(
                    item=Item.objects.get(codigo=codigo),
                    proveedor=proveedor,
                )
            )
        return seeds

    def _crear_consumibles(self, cantidad, total_ordenes):
        seeds = []
        cantidad_base = max(180, total_ordenes * 6)

        for index in range(cantidad):
            proveedor = self.proveedores[(index + 1) % len(self.proveedores)]
            nombre, dimension_codigo, dimension_nombre, unidad_nombre, simbolo = self.CONSUMIBLES_BASE[
                index % len(self.CONSUMIBLES_BASE)
            ]
            codigo = f"{self.prefijo}-CON-{index + 1:03d}"
            precio = Decimal("14.50") + Decimal(index * 5)

            self._run_crear_catalogo(
                "consumible",
                codigo=codigo,
                nombre=nombre,
                dimension_codigo=dimension_codigo,
                dimension_nombre=dimension_nombre,
                unidad_nombre=unidad_nombre,
                simbolo=simbolo,
                cantidad=str(cantidad_base),
                precio=str(precio),
                proveedor_ruc=proveedor.ruc,
                proveedor_nombre=proveedor.nombre,
                favorito=index % 3 == 0,
                volvo=index % 4 == 0,
            )
            seeds.append(
                ItemSeed(
                    item=Item.objects.get(codigo=codigo),
                    proveedor=proveedor,
                )
            )
        return seeds

    def _crear_item_grupos(self):
        items = [seed.item for seed in self.repuestos[:4] + self.consumibles[:4]]
        if len(items) < 4:
            return

        grupos = [
            ("Kit PM1", items[:3]),
            ("Kit PM2", items[1:5]),
            ("Kit Campo", items[::2]),
        ]
        for nombre, grupo_items in grupos:
            grupo = ItemGrupo.objects.create(nombre=f"{self.prefijo} {nombre}")
            for item in grupo_items:
                ItemGrupoDetalle.objects.create(
                    grupo=grupo,
                    item=item,
                    cantidad=Decimal("1"),
                    unidad_medida=item.unidad_medida,
                )

    def _crear_tipos_cambio(self):
        fecha_inicio = self.today - timedelta(days=240)
        for day_offset in range(241):
            fecha_actual = fecha_inicio + timedelta(days=day_offset)
            base_usd = Decimal("3.55") + Decimal((day_offset % 9)) / Decimal("100")
            base_eur = Decimal("3.85") + Decimal((day_offset % 7)) / Decimal("100")
            TipoCambioDiario.objects.create(
                fecha=fecha_actual,
                compra_usd=base_usd,
                venta_usd=base_usd + Decimal("0.03"),
                compra_eur=base_eur,
                venta_eur=base_eur + Decimal("0.04"),
            )

    def _crear_ordenes_trabajo(self, *, total_ordenes, fraccion_requerimientos):
        ordenes_por_maquina = total_ordenes // len(self.maquinarias)
        remanente = total_ordenes % len(self.maquinarias)
        fecha_base = self.today - timedelta(days=max(total_ordenes * 3 // max(len(self.maquinarias), 1), 180))
        requerimientos_meta = max(1, int(total_ordenes * max(0, min(fraccion_requerimientos, 1))))
        requerimientos_creados = 0

        for maquina_index, maquinaria in enumerate(self.maquinarias):
            cantidad = ordenes_por_maquina + (1 if maquina_index < remanente else 0)
            if cantidad <= 0:
                continue

            fecha_cursor = fecha_base + timedelta(days=maquina_index)
            horometro_cursor = maquinaria.obtener_horometro_actual() or Decimal("1000.00")
            repuestos_pool = self._pool_por_maquina(self.repuestos, maquina_index, minimo=3)
            consumibles_pool = self._pool_por_maquina(self.consumibles, maquina_index * 2, minimo=2)

            for orden_index in range(cantidad):
                fecha_cursor += timedelta(days=self.random.randint(2, 7))
                tecnicos = self._seleccionar_tecnicos()
                orden = self._crear_orden_trabajo(
                    maquinaria=maquinaria,
                    fecha_orden=fecha_cursor,
                    tecnicos=tecnicos,
                )

                if orden_index % 4 == 0:
                    self._crear_actividad(
                        orden=orden,
                        es_planificada=True,
                        indice=orden_index,
                        descripcion_base="Planificacion de recursos y tareas previas",
                    )

                actividades_registradas = [
                    self._crear_actividad(
                        orden=orden,
                        es_planificada=False,
                        indice=actividad_index,
                        descripcion_base=f"Intervencion tecnica {actividad_index + 1}",
                    )
                    for actividad_index in range(
                        self.random.randint(self.actividades_min, self.actividades_max)
                    )
                ]

                repuestos_usados = self._seleccionar_items_para_orden(
                    repuestos_pool,
                    orden_index,
                    minimo=1,
                    maximo=min(2, len(repuestos_pool)),
                )
                consumibles_usados = self._seleccionar_items_para_orden(
                    consumibles_pool,
                    orden_index,
                    minimo=1,
                    maximo=min(2, len(consumibles_pool)),
                )

                detalle_materiales = []
                tecnico_principal = tecnicos[0]

                for repuesto_seed in repuestos_usados:
                    self._asegurar_stock_repuesto(repuesto_seed)
                    unidad = (
                        ItemUnidad.objects.filter(
                            item=repuesto_seed.item,
                            almacen_actual__isnull=False,
                        )
                        .exclude(estado=ItemUnidad.Estado.INOPERATIVO)
                        .order_by("id")
                        .first()
                    )
                    if not unidad:
                        raise CommandError(
                            f"No se encontro una unidad disponible para el repuesto {repuesto_seed.item.codigo}."
                        )

                    actividad = self.random.choice(actividades_registradas)
                    serializer = MovimientoRepuestoSerializer(
                        data={
                            "actividad": actividad.id,
                            "item_unidad": unidad.id,
                        }
                    )
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                    detalle_materiales.append((repuesto_seed.item, Decimal("1"), repuesto_seed.proveedor))

                for consumible_seed in consumibles_usados:
                    cantidad_consumo = Decimal(self.random.randint(1, 6))
                    self._asegurar_stock_consumible(consumible_seed, cantidad_consumo * Decimal("4"))
                    self._asignar_consumible_a_tecnico(
                        item=consumible_seed.item,
                        tecnico=tecnico_principal,
                        cantidad=cantidad_consumo,
                    )
                    actividad = self.random.choice(actividades_registradas)
                    serializer = MovimientoConsumibleSerializer(
                        data={
                            "actividad": actividad.id,
                            "item": consumible_seed.item.id,
                            "cantidad": str(cantidad_consumo),
                            "unidad_medida": consumible_seed.item.unidad_medida_id,
                        }
                    )
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                    detalle_materiales.append(
                        (consumible_seed.item, cantidad_consumo, consumible_seed.proveedor)
                    )

                if requerimientos_creados < requerimientos_meta and self.random.random() < 0.58:
                    self._crear_orden_requerimiento(
                        orden=orden,
                        tecnico=tecnico_principal,
                        detalle_materiales=detalle_materiales,
                    )
                    requerimientos_creados += 1

                hora_inicio, hora_fin = self._generar_horas_trabajo()
                horometro_cursor = (horometro_cursor + Decimal(self.random.randint(35, 180))).quantize(
                    Decimal("0.01")
                )

                serializer_final = OrdenTrabajoSerializer(
                    orden,
                    data={
                        "hora_inicio": hora_inicio.strftime("%H:%M:%S"),
                        "hora_fin": hora_fin.strftime("%H:%M:%S"),
                        "horometro": str(horometro_cursor),
                        "estado_equipo": self.random.choice(self.ESTADOS_EQUIPO),
                        "estatus": OrdenTrabajo.Estatus.FINALIZADO,
                        "observaciones": self._observacion_final_orden(
                            maquinaria=maquinaria,
                            repuestos=len(repuestos_usados),
                            consumibles=len(consumibles_usados),
                        ),
                    },
                    partial=True,
                )
                serializer_final.is_valid(raise_exception=True)
                serializer_final.save()

    def _pool_por_maquina(self, seeds, inicio, minimo):
        if not seeds:
            return []
        cantidad = min(max(minimo, 1), len(seeds))
        return [seeds[(inicio + offset) % len(seeds)] for offset in range(cantidad)]

    def _seleccionar_tecnicos(self):
        cantidad = min(len(self.tecnicos), self.random.randint(1, min(3, len(self.tecnicos))))
        return self.random.sample(self.tecnicos, cantidad)

    def _crear_orden_trabajo(self, *, maquinaria, fecha_orden, tecnicos):
        ubicacion = self.random.choice(self.ubicaciones)
        serializer = OrdenTrabajoSerializer(
            data={
                "maquinaria": maquinaria.id,
                "fecha": fecha_orden.isoformat(),
                "prioridad": self.random.choice(self.PRIORIDADES),
                "lugar": self.random.choice(self.LUGARES),
                "ubicacion_detalle": f"{ubicacion.cliente.nombre} - {ubicacion.nombre}",
                "tecnicos": [tecnico.id for tecnico in tecnicos],
                "observaciones": "",
            }
        )
        serializer.is_valid(raise_exception=True)
        return serializer.save()

    def _crear_actividad(self, *, orden, es_planificada, indice, descripcion_base):
        if indice % 3 == 0:
            return ActividadTrabajo.objects.create(
                orden=orden,
                tipo_actividad=ActividadTrabajo.TipoActividad.REVISION,
                descripcion=f"{descripcion_base} para {orden.maquinaria.nombre}",
                es_planificada=es_planificada,
            )

        tipo_mantenimiento, subtipos = self.random.choice(self.TIPOS_MANTENIMIENTO)
        return ActividadTrabajo.objects.create(
            orden=orden,
            tipo_actividad=ActividadTrabajo.TipoActividad.MANTENIMIENTO,
            tipo_mantenimiento=tipo_mantenimiento,
            subtipo=self.random.choice(subtipos),
            descripcion=f"{descripcion_base} - {tipo_mantenimiento.lower()}",
            es_planificada=es_planificada,
        )

    def _seleccionar_items_para_orden(self, pool, indice, minimo, maximo):
        if not pool:
            return []
        cantidad = self.random.randint(minimo, maximo)
        candidatos = []
        for offset in range(cantidad):
            candidatos.append(pool[(indice + offset) % len(pool)])
        vistos = set()
        resultado = []
        for seed in candidatos:
            if seed.item.id in vistos:
                continue
            vistos.add(seed.item.id)
            resultado.append(seed)
        return resultado

    def _crear_orden_requerimiento(self, *, orden, tecnico, detalle_materiales):
        if not detalle_materiales:
            return None

        items_payload = []
        vistos = set()
        for item, cantidad, proveedor in detalle_materiales:
            if item.id in vistos:
                continue
            vistos.add(item.id)
            items_payload.append(
                {
                    "item": item.id,
                    "cantidad": str(max(Decimal("1"), cantidad)),
                    "proveedor": proveedor.id if proveedor else None,
                }
            )

        serializer = OrdenRequerimientoSerializer(
            data={
                "trabajo": orden.id,
                "tecnico_asignado": tecnico.id,
                "observaciones": f"Requerimiento generado por {self.prefijo} para {orden.codigo_orden}.",
                "items": items_payload,
            }
        )
        serializer.is_valid(raise_exception=True)
        requerimiento = serializer.save()

        if self.user_emisor:
            requerimiento.emitido_por = self.user_emisor

        estado = self.random.choice(
            [
                OrdenRequerimiento.Estado.POR_REVISAR,
                OrdenRequerimiento.Estado.ENTREGADO,
                OrdenRequerimiento.Estado.SIN_STOCK,
            ]
        )
        requerimiento.estado = estado
        if estado == OrdenRequerimiento.Estado.ENTREGADO and self.random.random() < 0.55:
            requerimiento.recepcion_confirmada_tecnico = True
            requerimiento.fecha_confirmacion_tecnico = timezone.now()
            requerimiento.confirmado_por_tecnico = self.user_emisor
        requerimiento.save(
            update_fields=[
                field
                for field in [
                    "emitido_por",
                    "estado",
                    "recepcion_confirmada_tecnico",
                    "fecha_confirmacion_tecnico",
                    "confirmado_por_tecnico",
                ]
                if getattr(requerimiento, field, None) is not None or field in {"estado", "recepcion_confirmada_tecnico"}
            ]
        )
        return requerimiento

    def _generar_horas_trabajo(self):
        inicio_minutos = self.random.choice(range(6 * 60, 15 * 60, 15))
        duracion = self.random.randint(90, 480)
        fin_minutos = min(inicio_minutos + duracion, 23 * 60 + 45)
        hora_inicio = time(inicio_minutos // 60, inicio_minutos % 60)
        hora_fin = time(fin_minutos // 60, fin_minutos % 60)
        if hora_fin <= hora_inicio:
            fin_minutos = min(inicio_minutos + 60, 23 * 60 + 45)
            hora_fin = time(fin_minutos // 60, fin_minutos % 60)
        return hora_inicio, hora_fin

    def _observacion_final_orden(self, *, maquinaria, repuestos, consumibles):
        return (
            f"Intervencion finalizada en {maquinaria.nombre}. "
            f"Repuestos usados: {repuestos}. Consumibles usados: {consumibles}."
        )

    def _asegurar_stock_repuesto(self, seed):
        disponibles = (
            ItemUnidad.objects.filter(
                item=seed.item,
                almacen_actual__isnull=False,
            )
            .exclude(estado=ItemUnidad.Estado.INOPERATIVO)
            .count()
        )
        if disponibles >= 4:
            return
        self._ingresar_stock_repuesto(seed.item, seed.proveedor, cantidad=max(12, 18 - disponibles))

    def _asegurar_stock_consumible(self, seed, cantidad_minima):
        disponible = (
            LoteConsumible.objects.filter(item=seed.item)
            .aggregate(total=Sum("cantidad_disponible"))
            .get("total")
        )
        if disponible is None:
            disponible = Decimal("0")
        if Decimal(disponible) >= Decimal(cantidad_minima):
            return
        self._ingresar_stock_consumible(
            seed.item,
            seed.proveedor,
            cantidad=max(Decimal("120"), Decimal(cantidad_minima) * Decimal("3")),
        )

    def _ingresar_stock_repuesto(self, item, proveedor, cantidad):
        with transaction.atomic():
            compra = Compra.objects.create(
                tipo_comprobante=Compra.TipoComprobante.FACTURA,
                codigo_comprobante=(
                    f"MAS-{item.codigo}-{timezone.now().strftime('%Y%m%d%H%M%S%f')}"
                ),
                proveedor=proveedor,
                moneda=Compra.Moneda.PEN,
                fecha=self.today,
            )
            detalle = CompraDetalle.objects.create(
                compra=compra,
                item=item,
                cantidad=int(cantidad),
                unidad_medida=item.unidad_medida,
                moneda=Compra.Moneda.PEN,
                valor_unitario=self._precio_base_item(item),
            )
            for _ in range(int(cantidad)):
                unidad = ItemUnidad.objects.create(
                    item=item,
                    compra_detalle=detalle,
                    estado=ItemUnidad.Estado.NUEVO,
                )
                HistorialUbicacionItem.objects.create(
                    item_unidad=unidad,
                    almacen=self.almacen_central,
                    estado=unidad.estado,
                )
            actualizar_stock_item(item)

    def _ingresar_stock_consumible(self, item, proveedor, cantidad):
        cantidad = Decimal(cantidad).quantize(Decimal("0.000001"))
        with transaction.atomic():
            compra = Compra.objects.create(
                tipo_comprobante=Compra.TipoComprobante.FACTURA,
                codigo_comprobante=(
                    f"MAS-{item.codigo}-{timezone.now().strftime('%Y%m%d%H%M%S%f')}"
                ),
                proveedor=proveedor,
                moneda=Compra.Moneda.PEN,
                fecha=self.today,
            )
            detalle = CompraDetalle.objects.create(
                compra=compra,
                item=item,
                cantidad=max(1, int(cantidad.quantize(Decimal("1"), rounding=ROUND_HALF_UP))),
                unidad_medida=item.unidad_medida,
                moneda=Compra.Moneda.PEN,
                valor_unitario=self._precio_base_item(item),
            )
            lote = LoteConsumible.objects.create(
                compra_detalle=detalle,
                item=item,
                cantidad_inicial=cantidad,
                cantidad_disponible=cantidad,
                unidad_medida=item.unidad_medida,
                almacen=self.almacen_central,
            )
            HistorialConsumible.objects.create(
                lote=lote,
                item=item,
                cantidad=cantidad,
                unidad_medida=item.unidad_medida,
                almacen=self.almacen_central,
            )
            actualizar_stock_item(item)

    def _precio_base_item(self, item):
        proveedor_rel = item.proveedores.order_by("id").first()
        if proveedor_rel:
            return proveedor_rel.precio
        return Decimal("25.00")

    def _asignar_consumible_a_tecnico(self, *, item, tecnico, cantidad):
        restante = Decimal(cantidad)
        now = timezone.now()

        while restante > 0:
            historial_almacen = (
                HistorialConsumible.objects.select_for_update()
                .filter(
                    item=item,
                    almacen__isnull=False,
                    fecha_fin__isnull=True,
                    cantidad__gt=0,
                )
                .order_by("fecha_inicio", "id")
                .first()
            )

            if not historial_almacen:
                raise CommandError(
                    f"No hay historial activo en almacen para asignar el consumible {item.codigo}."
                )

            cantidad_historial = Decimal(historial_almacen.cantidad)
            asignar = min(cantidad_historial, restante)
            historial_almacen.cerrar(fecha=now, cantidad=asignar)
            historial_almacen.lote.cantidad_disponible = max(
                Decimal(historial_almacen.lote.cantidad_disponible) - asignar,
                Decimal("0"),
            )
            historial_almacen.lote.save(update_fields=["cantidad_disponible"])

            sobrante = cantidad_historial - asignar
            if sobrante > 0:
                historial_restante = HistorialConsumible.objects.create(
                    lote=historial_almacen.lote,
                    item=historial_almacen.item,
                    cantidad=sobrante,
                    unidad_medida=historial_almacen.unidad_medida,
                    almacen=historial_almacen.almacen,
                    orden_trabajo=historial_almacen.orden_trabajo,
                    horometro_inicio=historial_almacen.horometro_inicio,
                )
                HistorialConsumible.objects.filter(pk=historial_restante.pk).update(
                    fecha_inicio=historial_almacen.fecha_inicio,
                    fecha_fin=None,
                )

            HistorialConsumible.objects.create(
                lote=historial_almacen.lote,
                item=item,
                cantidad=asignar,
                unidad_medida=historial_almacen.unidad_medida,
                trabajador=tecnico,
            )

            restante -= asignar

    def _crear_ordenes_compra(self, cantidad):
        seeds = self.repuestos + self.consumibles
        if not seeds:
            return

        for index in range(cantidad):
            proveedores = self.random.sample(
                self.proveedores,
                min(len(self.proveedores), self.random.randint(1, min(3, len(self.proveedores)))),
            )
            items_payload = []
            usados = set()
            for proveedor in proveedores:
                candidatos = [seed for seed in seeds if seed.proveedor.id == proveedor.id]
                if not candidatos:
                    continue
                elegido = self.random.choice(candidatos)
                if elegido.item.id in usados:
                    continue
                usados.add(elegido.item.id)
                items_payload.append(
                    {
                        "item": elegido.item.id,
                        "cantidad": str(Decimal(self.random.randint(1, 12))),
                        "proveedor": proveedor.id,
                    }
                )

            if not items_payload:
                continue

            serializer = OrdenCompraSerializer(
                data={
                    "observaciones": f"Orden de compra demo {index + 1:03d} generada por {self.prefijo}.",
                    "items": items_payload,
                }
            )
            serializer.is_valid(raise_exception=True)
            orden_compra = serializer.save()

            update_fields = []
            if self.user_emisor:
                orden_compra.emitido_por = self.user_emisor
                update_fields.append("emitido_por")

            orden_compra.estado = self.random.choice(
                [
                    OrdenCompra.Estado.PENDIENTE,
                    OrdenCompra.Estado.REVISADO,
                    OrdenCompra.Estado.EN_PROCESO,
                    OrdenCompra.Estado.RECIBIDO,
                ]
            )
            update_fields.append("estado")

            if orden_compra.estado == OrdenCompra.Estado.RECIBIDO and self.random.random() < 0.5:
                orden_compra.recepcion_confirmada = True
                orden_compra.fecha_confirmacion_recepcion = timezone.now()
                orden_compra.confirmado_por = self.user_emisor
                update_fields.extend(
                    [
                        "recepcion_confirmada",
                        "fecha_confirmacion_recepcion",
                        "confirmado_por",
                    ]
                )

            orden_compra.save(update_fields=update_fields)

    def _mostrar_resumen(self):
        resumen = {
            "Clientes": Cliente.objects.count(),
            "Ubicaciones": UbicacionCliente.objects.count(),
            "Proveedores": Proveedor.objects.count(),
            "Maquinarias": Maquinaria.objects.count(),
            "Items": Item.objects.count(),
            "Unidades de repuesto": ItemUnidad.objects.count(),
            "Lotes de consumible": LoteConsumible.objects.count(),
            "Ordenes de trabajo": OrdenTrabajo.objects.count(),
            "Tecnicos asignados": TecnicoAsignado.objects.count(),
            "Actividades": ActividadTrabajo.objects.count(),
            "Movimientos de repuesto": MovimientoRepuesto.objects.count(),
            "Movimientos de consumible": MovimientoConsumible.objects.count(),
            "Ordenes de requerimiento": OrdenRequerimiento.objects.count(),
            "Ordenes de compra": OrdenCompra.objects.count(),
        }

        self.stdout.write(self.style.SUCCESS("Dataset masivo creado correctamente."))
        for etiqueta, cantidad in resumen.items():
            self.stdout.write(f"- {etiqueta}: {cantidad}")
