from decimal import Decimal, InvalidOperation

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from app.models import (
    Almacen,
    Compra,
    CompraDetalle,
    Dimension,
    HistorialConsumible,
    HistorialUbicacionItem,
    Item,
    ItemProveedor,
    ItemUnidad,
    LoteConsumible,
    Maquinaria,
    Proveedor,
    UnidadMedida,
    UnidadRelacion,
    current_local_date,
)
from app.serializers import actualizar_stock_item, convertir_cantidad_a_unidad_item


class Command(BaseCommand):
    help = (
        "Crea unidades, proveedores, maquinarias e items de inventario siguiendo "
        "la lógica actual de compras, lotes, unidades e historiales."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "recurso",
            choices=["unidad", "proveedor", "maquinaria", "repuesto", "consumible"],
            help="Tipo de registro a crear.",
        )
        parser.add_argument("--codigo", help="Código del item o maquinaria.")
        parser.add_argument("--nombre", help="Nombre del recurso.")
        parser.add_argument("--descripcion", default="", help="Descripción opcional.")
        parser.add_argument("--observacion", default="", help="Observación opcional para maquinaria.")
        parser.add_argument("--ruc", help="RUC del proveedor.")
        parser.add_argument("--direccion", default="", help="Dirección del proveedor.")
        parser.add_argument("--dimension-codigo", help="Código de la dimensión.")
        parser.add_argument("--dimension-nombre", help="Nombre de la dimensión.")
        parser.add_argument("--unidad-nombre", help="Nombre de la unidad de medida.")
        parser.add_argument("--simbolo", default="", help="Símbolo de la unidad de medida.")
        parser.add_argument(
            "--base",
            action="store_true",
            help="Marca la unidad como unidad base de la dimensión.",
        )
        parser.add_argument(
            "--factor",
            help="Factor para relación con la unidad base. Ej: 3.785 para galón si la base es litro.",
        )
        parser.add_argument(
            "--cantidad",
            default="0",
            help="Cantidad inicial a ingresar en inventario. Debe ser entera.",
        )
        parser.add_argument(
            "--precio",
            default="0",
            help="Precio unitario sin IGV para el ingreso inicial.",
        )
        parser.add_argument(
            "--moneda",
            default=Compra.Moneda.PEN,
            choices=[choice for choice, _ in Compra.Moneda.choices],
            help="Moneda del precio y la compra generada.",
        )
        parser.add_argument(
            "--tipo-comprobante",
            default=Compra.TipoComprobante.FACTURA,
            choices=[choice for choice, _ in Compra.TipoComprobante.choices],
            help="Tipo de comprobante para el ingreso inicial.",
        )
        parser.add_argument(
            "--codigo-comprobante",
            help="Código de comprobante. Si no se envía, se genera automáticamente.",
        )
        parser.add_argument(
            "--proveedor-ruc",
            help="RUC del proveedor a asociar al item o al ingreso inicial.",
        )
        parser.add_argument(
            "--proveedor-nombre",
            help="Nombre del proveedor a asociar al item o al ingreso inicial.",
        )
        parser.add_argument(
            "--proveedor-direccion",
            default="",
            help="Dirección del proveedor a crear si no existe.",
        )
        parser.add_argument(
            "--almacen",
            default="Almacén Central",
            help="Nombre del almacén para el historial inicial.",
        )
        parser.add_argument(
            "--series",
            help="Series separadas por coma para repuestos. Debe coincidir con la cantidad.",
        )
        parser.add_argument("--favorito", action="store_true", help="Marca el item como favorito.")
        parser.add_argument("--volvo", action="store_true", help="Marca el item como Volvo.")
        parser.add_argument(
            "--horometro",
            help="Horómetro manual inicial de la maquinaria.",
        )

    def handle(self, *args, **options):
        recurso = options["recurso"]
        if recurso == "unidad":
            return self._crear_unidad(options)
        if recurso == "proveedor":
            return self._crear_proveedor(options)
        if recurso == "maquinaria":
            return self._crear_maquinaria(options)
        if recurso == "repuesto":
            return self._crear_item(options, Item.TipoInsumo.REPUESTO)
        if recurso == "consumible":
            return self._crear_item(options, Item.TipoInsumo.CONSUMIBLE)
        raise CommandError("Recurso no soportado.")

    def _require(self, options, key, label):
        value = options.get(key)
        if value in (None, ""):
            raise CommandError(f"Debes enviar {label}.")
        return value

    def _parse_decimal(self, raw_value, label, allow_zero=True):
        try:
            value = Decimal(str(raw_value))
        except (InvalidOperation, TypeError):
            raise CommandError(f"{label} no es un decimal válido.")
        if value < 0 or (not allow_zero and value <= 0):
            operador = "mayor o igual a 0" if allow_zero else "mayor a 0"
            raise CommandError(f"{label} debe ser {operador}.")
        return value

    def _parse_int(self, raw_value, label, allow_zero=True):
        try:
            value = int(str(raw_value))
        except (TypeError, ValueError):
            raise CommandError(f"{label} no es un entero válido.")
        if value < 0 or (not allow_zero and value <= 0):
            operador = "mayor o igual a 0" if allow_zero else "mayor a 0"
            raise CommandError(f"{label} debe ser {operador}.")
        return value

    def _get_or_create_proveedor(self, options):
        ruc = options.get("proveedor_ruc") or options.get("ruc")
        nombre = options.get("proveedor_nombre") or options.get("nombre")
        direccion = options.get("proveedor_direccion") or options.get("direccion") or ""
        if not ruc:
            return None
        if not nombre:
            raise CommandError("Debes enviar --proveedor-nombre o --nombre junto con el RUC del proveedor.")
        proveedor, created = Proveedor.objects.get_or_create(
            ruc=ruc,
            defaults={
                "nombre": nombre,
                "direccion": direccion,
            },
        )
        if not created:
            cambios = []
            if nombre and proveedor.nombre != nombre:
                proveedor.nombre = nombre
                cambios.append("nombre")
            if direccion and proveedor.direccion != direccion:
                proveedor.direccion = direccion
                cambios.append("direccion")
            if cambios:
                proveedor.save(update_fields=cambios)
        return proveedor

    def _get_or_create_dimension(self, codigo, nombre=None):
        defaults = {
            "nombre": nombre or codigo.title(),
            "descripcion": "",
            "activo": True,
        }
        dimension, _ = Dimension.objects.get_or_create(codigo=codigo, defaults=defaults)
        return dimension

    def _get_or_create_unidad_base(self, dimension, nombre, simbolo=""):
        unidad_existente = UnidadMedida.objects.filter(dimension=dimension, es_base=True).first()
        if unidad_existente and unidad_existente.nombre != nombre:
            raise CommandError(
                f"La dimensión {dimension.codigo} ya tiene una unidad base distinta: {unidad_existente.nombre}."
            )

        unidad, created = UnidadMedida.objects.get_or_create(
            dimension=dimension,
            nombre=nombre,
            defaults={
                "simbolo": simbolo,
                "es_base": True,
                "activo": True,
            },
        )
        if not created:
            cambios = []
            if not unidad.es_base:
                unidad.es_base = True
                cambios.append("es_base")
            if simbolo and unidad.simbolo != simbolo:
                unidad.simbolo = simbolo
                cambios.append("simbolo")
            if cambios:
                unidad.save(update_fields=cambios)
        return unidad

    def _resolver_unidad_item(self, tipo_insumo, options):
        if tipo_insumo == Item.TipoInsumo.REPUESTO:
            dimension_codigo = options.get("dimension_codigo") or "UNIDAD"
            dimension_nombre = options.get("dimension_nombre") or "Unidad"
            unidad_nombre = options.get("unidad_nombre") or "Cantidad"
            simbolo = options.get("simbolo") or "und"
            dimension = self._get_or_create_dimension(dimension_codigo, dimension_nombre)
            unidad = self._get_or_create_unidad_base(dimension, unidad_nombre, simbolo)
            return dimension, unidad

        dimension_codigo = self._require(options, "dimension_codigo", "--dimension-codigo")
        dimension_nombre = options.get("dimension_nombre")
        unidad_nombre = self._require(options, "unidad_nombre", "--unidad-nombre")
        simbolo = options.get("simbolo") or ""
        dimension = self._get_or_create_dimension(dimension_codigo, dimension_nombre)
        unidad = UnidadMedida.objects.filter(dimension=dimension, nombre=unidad_nombre).first()
        if not unidad:
            unidad = self._get_or_create_unidad_base(dimension, unidad_nombre, simbolo)
        return dimension, unidad

    def _crear_unidad(self, options):
        dimension_codigo = self._require(options, "dimension_codigo", "--dimension-codigo")
        unidad_nombre = self._require(options, "unidad_nombre", "--unidad-nombre")
        simbolo = options.get("simbolo") or ""
        dimension = self._get_or_create_dimension(dimension_codigo, options.get("dimension_nombre"))

        if options["base"]:
            unidad = self._get_or_create_unidad_base(dimension, unidad_nombre, simbolo)
            self.stdout.write(
                self.style.SUCCESS(
                    f"Unidad base lista: {unidad.nombre} ({dimension.codigo})"
                )
            )
            return

        factor = self._parse_decimal(options.get("factor"), "--factor", allow_zero=False)
        unidad, created = UnidadMedida.objects.get_or_create(
            dimension=dimension,
            nombre=unidad_nombre,
            defaults={
                "simbolo": simbolo,
                "es_base": False,
                "activo": True,
            },
        )
        if not created and simbolo and unidad.simbolo != simbolo:
            unidad.simbolo = simbolo
            unidad.save(update_fields=["simbolo"])

        unidad_base = UnidadMedida.objects.filter(dimension=dimension, es_base=True).first()
        if not unidad_base:
            raise CommandError(
                f"La dimensión {dimension.codigo} no tiene unidad base. Crea primero una con --base."
            )
        if unidad_base.id == unidad.id:
            raise CommandError("La unidad relacionada no puede ser la misma unidad base.")

        relacion, created_rel = UnidadRelacion.objects.get_or_create(
            dimension=dimension,
            unidad_base=unidad_base,
            unidad_relacionada=unidad,
            defaults={
                "factor": factor,
                "activo": True,
            },
        )
        if not created_rel and relacion.factor != factor:
            relacion.factor = factor
            relacion.activo = True
            relacion.save()

        self.stdout.write(
            self.style.SUCCESS(
                f"Unidad lista: {unidad.nombre} ({dimension.codigo}) con factor {relacion.factor}."
            )
        )

    def _crear_proveedor(self, options):
        self._require(options, "ruc", "--ruc")
        self._require(options, "nombre", "--nombre")
        proveedor = self._get_or_create_proveedor(options)
        self.stdout.write(
            self.style.SUCCESS(f"Proveedor listo: {proveedor.nombre} ({proveedor.ruc})")
        )

    def _crear_maquinaria(self, options):
        codigo = self._require(options, "codigo", "--codigo")
        nombre = self._require(options, "nombre", "--nombre")
        defaults = {
            "nombre": nombre,
            "descripcion": options.get("descripcion") or "",
            "observacion": options.get("observacion") or "",
        }
        maquinaria, created = Maquinaria.objects.get_or_create(
            codigo_maquina=codigo,
            defaults=defaults,
        )
        if not created:
            cambios = []
            if maquinaria.nombre != nombre:
                maquinaria.nombre = nombre
                cambios.append("nombre")
            for field in ("descripcion", "observacion"):
                valor = defaults[field]
                if valor and getattr(maquinaria, field) != valor:
                    setattr(maquinaria, field, valor)
                    cambios.append(field)
            if options.get("horometro"):
                maquinaria.horometro_manual = self._parse_decimal(options["horometro"], "--horometro")
                maquinaria.horometro_manual_actualizado_en = timezone.now()
                cambios.extend(["horometro_manual", "horometro_manual_actualizado_en"])
            if cambios:
                maquinaria.save(update_fields=list(dict.fromkeys(cambios)))
        elif options.get("horometro"):
            maquinaria.horometro_manual = self._parse_decimal(options["horometro"], "--horometro")
            maquinaria.horometro_manual_actualizado_en = timezone.now()
            maquinaria.save(update_fields=["horometro_manual", "horometro_manual_actualizado_en"])
        else:
            maquinaria.nombre = nombre
            maquinaria.save(update_fields=["nombre"])

        self.stdout.write(
            self.style.SUCCESS(
                f"Maquinaria lista: {maquinaria.codigo_maquina} - {maquinaria.nombre}"
            )
        )

    def _crear_item(self, options, tipo_insumo):
        codigo = self._require(options, "codigo", "--codigo")
        nombre = self._require(options, "nombre", "--nombre")
        cantidad = self._parse_int(options.get("cantidad", "0"), "--cantidad")
        precio = self._parse_decimal(options.get("precio", "0"), "--precio")
        dimension, unidad = self._resolver_unidad_item(tipo_insumo, options)
        proveedor = self._get_or_create_proveedor(options)
        almacen, _ = Almacen.objects.get_or_create(nombre=options.get("almacen") or "Almacén Central")

        with transaction.atomic():
            item, created = Item.objects.get_or_create(
                codigo=codigo,
                defaults={
                    "nombre": nombre,
                    "tipo_insumo": tipo_insumo,
                    "dimension": dimension,
                    "unidad_medida": unidad,
                    "favorito": bool(options.get("favorito")),
                    "volvo": bool(options.get("volvo")),
                },
            )

            if not created:
                if item.tipo_insumo != tipo_insumo:
                    raise CommandError(
                        f"El item {codigo} ya existe con tipo {item.tipo_insumo}."
                    )
                cambios = []
                if item.nombre != nombre:
                    item.nombre = nombre
                    cambios.append("nombre")
                if item.dimension_id != dimension.id:
                    item.dimension = dimension
                    cambios.append("dimension")
                if item.unidad_medida_id != unidad.id:
                    item.unidad_medida = unidad
                    cambios.append("unidad_medida")
                if bool(options.get("favorito")) != item.favorito:
                    item.favorito = bool(options.get("favorito"))
                    cambios.append("favorito")
                if bool(options.get("volvo")) != item.volvo:
                    item.volvo = bool(options.get("volvo"))
                    cambios.append("volvo")
                if cambios:
                    item.save(update_fields=cambios)

            if proveedor:
                ItemProveedor.objects.update_or_create(
                    item=item,
                    proveedor=proveedor,
                    defaults={
                        "precio": precio,
                        "moneda": options["moneda"],
                    },
                )

            if cantidad > 0:
                self._crear_ingreso_inicial(
                    item=item,
                    cantidad=cantidad,
                    precio=precio,
                    moneda=options["moneda"],
                    proveedor=proveedor,
                    almacen=almacen,
                    tipo_comprobante=options["tipo_comprobante"],
                    codigo_comprobante=options.get("codigo_comprobante"),
                    series=options.get("series"),
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Item listo: {item.codigo} - {item.nombre} ({item.tipo_insumo})"
            )
        )
        if cantidad > 0:
            self.stdout.write(f"- Stock actual: {item.stock}")

    def _crear_ingreso_inicial(
        self,
        *,
        item,
        cantidad,
        precio,
        moneda,
        proveedor,
        almacen,
        tipo_comprobante,
        codigo_comprobante,
        series,
    ):
        codigo_comprobante = codigo_comprobante or (
            f"CMD-{item.codigo}-{timezone.now().strftime('%Y%m%d%H%M%S%f')}"
        )
        compra = Compra.objects.create(
            tipo_comprobante=tipo_comprobante,
            codigo_comprobante=codigo_comprobante,
            proveedor=proveedor,
            moneda=moneda,
            fecha=current_local_date(),
        )
        detalle = CompraDetalle.objects.create(
            compra=compra,
            item=item,
            cantidad=cantidad,
            unidad_medida=item.unidad_medida,
            moneda=moneda,
            valor_unitario=precio,
        )

        if item.tipo_insumo == Item.TipoInsumo.REPUESTO:
            series_list = []
            if series:
                series_list = [serie.strip() for serie in series.split(",") if serie.strip()]
                if len(series_list) != cantidad:
                    raise CommandError(
                        "La cantidad de series debe coincidir exactamente con --cantidad."
                    )

            for index in range(cantidad):
                unidad = ItemUnidad.objects.create(
                    item=item,
                    compra_detalle=detalle,
                    estado=ItemUnidad.Estado.NUEVO,
                    serie=series_list[index] if series_list else None,
                )
                HistorialUbicacionItem.objects.create(
                    item_unidad=unidad,
                    almacen=almacen,
                    estado=unidad.estado,
                )
        else:
            cantidad_convertida = convertir_cantidad_a_unidad_item(
                item,
                cantidad,
                item.unidad_medida,
            )
            lote = LoteConsumible.objects.create(
                compra_detalle=detalle,
                item=item,
                cantidad_inicial=cantidad_convertida,
                cantidad_disponible=cantidad_convertida,
                unidad_medida=item.unidad_medida,
                almacen=almacen,
            )
            HistorialConsumible.objects.create(
                lote=lote,
                item=item,
                cantidad=cantidad_convertida,
                unidad_medida=item.unidad_medida,
                almacen=almacen,
            )

        if hasattr(item, "_stock_calculado"):
            delattr(item, "_stock_calculado")
        actualizar_stock_item(item)
