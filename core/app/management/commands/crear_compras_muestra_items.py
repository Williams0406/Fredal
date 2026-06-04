from decimal import Decimal
import re

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from app.models import Compra, Item, Proveedor, current_local_date
from app.serializers import CompraCreateSerializer


class Command(BaseCommand):
    help = (
        "Crea compras de muestra para los items existentes usando el mismo flujo "
        "de CompraCreateSerializer, incluyendo ItemUnidad, lotes e historiales."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--prefijo",
            default="MUESTRA-COMPRA",
            help="Prefijo para codigo_comprobante. Default: MUESTRA-COMPRA.",
        )
        parser.add_argument(
            "--proveedor-ruc",
            default="99999999999",
            help="RUC del proveedor de muestra. Default: 99999999999.",
        )
        parser.add_argument(
            "--proveedor-nombre",
            default="Proveedor de muestra",
            help="Nombre del proveedor de muestra.",
        )
        parser.add_argument(
            "--cantidad-unidades",
            type=int,
            default=2,
            help="Cantidad para items con unidades fisicas: REPUESTO/HERRAMIENTA.",
        )
        parser.add_argument(
            "--cantidad-consumible",
            type=int,
            default=25,
            help="Cantidad para items CONSUMIBLE.",
        )
        parser.add_argument(
            "--precio",
            default="25.00",
            help="Precio unitario base si el item no tiene proveedor/precio configurado.",
        )
        parser.add_argument(
            "--moneda",
            default=Compra.Moneda.PEN,
            choices=[choice[0] for choice in Compra.Moneda.choices],
            help="Moneda de las compras de muestra.",
        )
        parser.add_argument(
            "--tipo-comprobante",
            default=Compra.TipoComprobante.FACTURA,
            choices=[choice[0] for choice in Compra.TipoComprobante.choices],
            help="Tipo de comprobante de las compras de muestra.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Limita la cantidad de items a procesar.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Crea una nueva compra aunque ya exista una muestra para el item.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Muestra lo que se crearia sin escribir en la base de datos.",
        )

    def handle(self, *args, **options):
        cantidad_unidades = options["cantidad_unidades"]
        cantidad_consumible = options["cantidad_consumible"]
        if cantidad_unidades < 1 or cantidad_consumible < 1:
            raise CommandError("Las cantidades deben ser mayores o iguales a 1.")

        try:
            precio_default = Decimal(str(options["precio"])).quantize(Decimal("0.01"))
        except Exception as exc:
            raise CommandError("--precio debe ser un decimal valido.") from exc

        if options["dry_run"]:
            proveedor = Proveedor.objects.filter(ruc=options["proveedor_ruc"]).first()
            if not proveedor:
                proveedor = Proveedor.objects.order_by("id").first()
        else:
            proveedor, _ = Proveedor.objects.get_or_create(
                ruc=options["proveedor_ruc"],
                defaults={"nombre": options["proveedor_nombre"]},
            )

        items = (
            Item.objects
            .select_related("unidad_medida")
            .prefetch_related("proveedores")
            .order_by("id")
        )
        if options["limit"]:
            items = items[: options["limit"]]

        creadas = 0
        omitidas = 0
        errores = 0

        for item in items:
            if not item.unidad_medida_id:
                omitidas += 1
                self.stdout.write(
                    self.style.WARNING(
                        f"Omitido {item.codigo}: no tiene unidad de medida configurada."
                    )
                )
                continue

            if not options["force"] and self._existe_muestra(item, options["prefijo"]):
                omitidas += 1
                self.stdout.write(f"Omitido {item.codigo}: ya tiene compra de muestra.")
                continue

            cantidad = (
                cantidad_unidades
                if item.tipo_insumo in Item.tipos_con_unidades()
                else cantidad_consumible
            )
            monto = self._precio_item(item, proveedor, precio_default)
            codigo_comprobante = self._codigo_comprobante(options["prefijo"], item)

            payload = {
                "fecha": current_local_date(),
                "proveedor": proveedor.id if proveedor else None,
                "tipo_comprobante": options["tipo_comprobante"],
                "codigo_comprobante": codigo_comprobante,
                "moneda": options["moneda"],
                "items": [
                    {
                        "item": item.id,
                        "cantidad": cantidad,
                        "unidad_medida": item.unidad_medida_id,
                        "tipo_registro": "VALOR_UNITARIO",
                        "monto": str(monto),
                        "moneda": options["moneda"],
                    }
                ],
            }

            if options["dry_run"]:
                creadas += 1
                self.stdout.write(
                    f"[dry-run] Compra {codigo_comprobante}: {item.codigo} x {cantidad}"
                )
                continue

            serializer = CompraCreateSerializer(data=payload)
            if not serializer.is_valid():
                errores += 1
                self.stdout.write(
                    self.style.ERROR(
                        f"Error en {item.codigo}: {serializer.errors}"
                    )
                )
                continue

            serializer.save()
            creadas += 1
            self.stdout.write(
                self.style.SUCCESS(
                    f"Compra creada {codigo_comprobante}: {item.codigo} x {cantidad}"
                )
            )

        resumen = (
            f"Compras {'simuladas' if options['dry_run'] else 'creadas'}: {creadas}. "
            f"Omitidas: {omitidas}. Errores: {errores}."
        )
        if errores:
            self.stdout.write(self.style.WARNING(resumen))
        else:
            self.stdout.write(self.style.SUCCESS(resumen))

    def _existe_muestra(self, item, prefijo):
        return Compra.objects.filter(
            codigo_comprobante__startswith=self._prefijo_seguro(prefijo),
            detalles__item=item,
        ).exists()

    def _precio_item(self, item, proveedor, precio_default):
        relacion = None
        if proveedor:
            relacion = (
                item.proveedores
                .filter(proveedor=proveedor)
                .order_by("id")
                .first()
            )
        if not relacion:
            relacion = item.proveedores.order_by("id").first()
        if relacion and relacion.precio:
            return Decimal(relacion.precio).quantize(Decimal("0.01"))
        return precio_default

    def _codigo_comprobante(self, prefijo, item):
        base = self._prefijo_seguro(prefijo)
        item_code = re.sub(r"[^A-Z0-9-]+", "-", item.codigo.upper()).strip("-")
        timestamp = timezone.now().strftime("%H%M%S%f")
        codigo = f"{base}-{item.id}-{item_code}-{timestamp}"
        return codigo[:50]

    def _prefijo_seguro(self, prefijo):
        return re.sub(r"[^A-Z0-9-]+", "-", str(prefijo).upper()).strip("-")[:24]
