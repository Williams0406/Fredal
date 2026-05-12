from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.db.models import Max
import uuid
from datetime import datetime, time, timedelta
from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction
from django.db.models import Avg
from zoneinfo import ZoneInfo


LIMA_TIME_ZONE = ZoneInfo("America/Lima")


def current_local_date():
    return datetime.now(LIMA_TIME_ZONE).date()

# =========================
# MODELOS BASE
# =========================

class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


# =========================
# CATÁLOGOS
# =========================

class Maquinaria(models.Model):
    codigo_maquina = models.CharField(
        max_length=50,
        unique=True
    )
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    observacion = models.TextField(blank=True)
    gasto = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    horometro_manual = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    horometro_manual_actualizado_en = models.DateTimeField(null=True, blank=True)

    def obtener_ultima_orden_con_horometro(self):
        if hasattr(self, "_ultima_orden_con_horometro_cache"):
            return self._ultima_orden_con_horometro_cache

        self._ultima_orden_con_horometro_cache = (
            OrdenTrabajo.objects
            .filter(maquinaria=self)
            .exclude(horometro__isnull=True)
            .order_by("-fecha", "-id")
            .only("horometro", "fecha", "hora_inicio", "hora_fin")
            .first()
        )
        return self._ultima_orden_con_horometro_cache

    def _orden_tiene_prioridad_sobre_manual(self, ultima_orden=None):
        ultima_orden = ultima_orden or self.obtener_ultima_orden_con_horometro()
        if not ultima_orden:
            return False
        if self.horometro_manual is None or not self.horometro_manual_actualizado_en:
            return True

        hora_orden = ultima_orden.hora_fin or ultima_orden.hora_inicio or time.max
        fecha_orden = datetime.combine(ultima_orden.fecha, hora_orden)
        if timezone.is_aware(self.horometro_manual_actualizado_en):
            fecha_orden = timezone.make_aware(
                fecha_orden,
                timezone.get_current_timezone(),
            )
        return fecha_orden >= self.horometro_manual_actualizado_en

    def obtener_fuente_horometro_actual(self):
        ultima_orden = self.obtener_ultima_orden_con_horometro()
        if ultima_orden and self._orden_tiene_prioridad_sobre_manual(ultima_orden):
            return "ORDEN_TRABAJO"
        if self.horometro_manual is not None:
            return "MANUAL"
        return None

    def obtener_horometro_actual(self):
        ultima_orden = self.obtener_ultima_orden_con_horometro()
        if ultima_orden and self._orden_tiene_prioridad_sobre_manual(ultima_orden):
            return ultima_orden.horometro
        return self.horometro_manual

    def obtener_fecha_ultimo_horometro(self):
        ultima_orden = self.obtener_ultima_orden_con_horometro()
        if ultima_orden and self._orden_tiene_prioridad_sobre_manual(ultima_orden):
            return ultima_orden.fecha
        if self.horometro_manual_actualizado_en:
            return self.horometro_manual_actualizado_en.date()
        return None

    def calcular_centro_costos(self):
        """Suma el centro de costos en PEN de repuestos y consumibles activos en la maquinaria."""

        def costo_unitario_pen(detalle):
            if not detalle:
                return Decimal("0.00")

            costo_unitario = Decimal(detalle.costo_unitario)
            if detalle.moneda == Compra.Moneda.PEN:
                return costo_unitario

            tipo_cambio = TipoCambioDiario.objects.filter(fecha=detalle.compra.fecha).first()
            if not tipo_cambio:
                return Decimal("0.00")

            if detalle.moneda == Compra.Moneda.USD and tipo_cambio.compra_usd > 0:
                return costo_unitario * Decimal(tipo_cambio.compra_usd)

            if detalle.moneda == Compra.Moneda.EUR and tipo_cambio.compra_eur > 0:
                return costo_unitario * Decimal(tipo_cambio.compra_eur)

            return Decimal("0.00")

        historiales_repuesto = (
            HistorialUbicacionItem.objects
            .select_related("item_unidad__compra_detalle", "item_unidad__compra_detalle__compra")
            .filter(
                maquinaria=self,
                fecha_fin__isnull=True,
                item_unidad__compra_detalle__isnull=False,
            )
        )

        historiales_consumible = (
            HistorialConsumible.objects
            .select_related("lote__compra_detalle", "lote__compra_detalle__compra")
            .filter(
                maquinaria=self,
                fecha_fin__isnull=True,
                lote__compra_detalle__isnull=False,
            )
        )

        total = Decimal("0.00")

        for h in historiales_repuesto:
            total += costo_unitario_pen(h.item_unidad.compra_detalle)

        for h in historiales_consumible:
            costo_unitario = costo_unitario_pen(h.lote.compra_detalle)
            total += Decimal(h.cantidad) * costo_unitario

        return total


class Almacen(models.Model):
    nombre = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.nombre


class Cliente(models.Model):
    nombre = models.CharField(max_length=150)
    ruc = models.CharField(max_length=20, unique=True)

    def __str__(self):
        return self.nombre


class UbicacionCliente(models.Model):
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.CASCADE,
        related_name="ubicaciones"
    )
    nombre = models.CharField(max_length=150)
    direccion = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        unique_together = ("cliente", "nombre")

    def __str__(self):
        return f"{self.cliente.nombre} - {self.nombre}"


class Dimension(models.Model):
    codigo = models.CharField(max_length=30, unique=True)
    nombre = models.CharField(max_length=60)
    descripcion = models.TextField(blank=True, default="")
    activo = models.BooleanField(default=True)

    def cambiar_unidad_base(self, nueva_unidad_base):
        if nueva_unidad_base.dimension_id != self.id:
            raise ValidationError("La unidad no pertenece a esta dimensión")
        return nueva_unidad_base

    def __str__(self):
        return self.nombre


class UnidadMedida(models.Model):
    nombre = models.CharField(max_length=30)
    simbolo = models.CharField(max_length=10, blank=True, default="")
    dimension = models.ForeignKey(
        Dimension,
        on_delete=models.PROTECT,
        related_name="unidades",
    )
    es_base = models.BooleanField(default=False)
    activo = models.BooleanField(default=True)

    class Meta:
        unique_together = ("dimension", "nombre")

    def __str__(self):
        return f"{self.nombre} ({self.dimension.codigo})"


class UnidadRelacion(models.Model):
    dimension = models.ForeignKey(
        Dimension,
        on_delete=models.CASCADE,
        related_name="relaciones",
    )
    unidad_base = models.ForeignKey(
        UnidadMedida,
        on_delete=models.PROTECT,
        related_name="relaciones_base",
    )
    unidad_relacionada = models.ForeignKey(
        UnidadMedida,
        on_delete=models.PROTECT,
        related_name="relaciones_relacionadas",
    )
    factor = models.DecimalField(max_digits=30, decimal_places=12)
    activo = models.BooleanField(default=True)

    class Meta:
        unique_together = ("unidad_base", "unidad_relacionada")

    def clean(self):
        if self.unidad_base_id == self.unidad_relacionada_id:
            raise ValidationError("La unidad base y la unidad relacionada deben ser distintas")
        if self.unidad_base.dimension_id != self.unidad_relacionada.dimension_id:
            raise ValidationError("Las unidades deben pertenecer a la misma dimensión")
        if self.dimension_id != self.unidad_base.dimension_id:
            raise ValidationError("La dimensión debe coincidir con la unidad base")
    
    def save(self, *args, **kwargs):
        crear_inversa = kwargs.pop("crear_inversa", True)
        self.full_clean()
        super().save(*args, **kwargs)

        if not crear_inversa:
            return

        if self.factor == 0:
            raise ValidationError("El factor de equivalencia no puede ser cero")

        factor_inverso = (Decimal("1") / Decimal(self.factor)).quantize(
            Decimal("0.000001"),
            rounding=ROUND_HALF_UP,
        )
        factor_field = self._meta.get_field("factor")
        try:
            factor_inverso = factor_field.clean(factor_inverso, self)
        except ValidationError:
            raise ValidationError(
                {
                    "factor": (
                        "No se puede crear la relación inversa porque 1/factor "
                        f"excede el límite permitido ({factor_field.max_digits} dígitos, "
                        f"{factor_field.decimal_places} decimales)."
                    )
                }
            )

        inversa = UnidadRelacion.objects.filter(
            unidad_base=self.unidad_relacionada,
            unidad_relacionada=self.unidad_base,
        )
        if inversa.exists():
            inversa.update(
                dimension=self.dimension,
                factor=factor_inverso,
                activo=self.activo,
            )
            return

        UnidadRelacion(
            dimension=self.dimension,
            unidad_base=self.unidad_relacionada,
            unidad_relacionada=self.unidad_base,
            factor=factor_inverso,
            activo=self.activo,
        ).save(crear_inversa=False)

    def __str__(self):
        return f"1 {self.unidad_base.nombre} = {self.factor} {self.unidad_relacionada.nombre}"
    
    
class Item(TimeStampedModel):

    class TipoInsumo(models.TextChoices):
        REPUESTO = "REPUESTO"
        CONSUMIBLE = "CONSUMIBLE"
        HERRAMIENTA = "HERRAMIENTA"

    codigo = models.CharField(max_length=50, unique=True)
    nombre = models.CharField(max_length=150)
    tipo_insumo = models.CharField(max_length=15, choices=TipoInsumo.choices)

    dimension = models.ForeignKey(
        Dimension,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="items",
    )
    unidad_medida = models.ForeignKey(
        UnidadMedida,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="items",
    )
    stock = models.DecimalField(
        max_digits=16,
        decimal_places=6,
        default=0,
    )
    favorito = models.BooleanField(default=False)
    volvo = models.BooleanField(default=False)
    ultimo_correlativo = models.PositiveIntegerField(default=0)

    @classmethod
    def tipos_con_unidades(cls):
        return [cls.TipoInsumo.REPUESTO, cls.TipoInsumo.HERRAMIENTA]

    def __str__(self):
        return f"{self.codigo} - {self.nombre}"

class ItemUnidad(models.Model):

    class Estado(models.TextChoices):
        NUEVO = "NUEVO"
        USADO = "USADO"
        INOPERATIVO = "INOPERATIVO"
        REPARADO = "REPARADO"

    item = models.ForeignKey(
        Item,
        on_delete=models.CASCADE,
        related_name="unidades"
    )

    compra_detalle = models.ForeignKey(
        "CompraDetalle",
        on_delete=models.PROTECT,
        related_name="unidades",
        null=True,
        blank=True
    )

    serie = models.CharField(max_length=50, null=True, blank=True, unique=True)
    estado = models.CharField(
        max_length=15,
        choices=Estado.choices,
        default=Estado.NUEVO
    )
    almacen_actual = models.ForeignKey(
        "Almacen",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="item_unidades_actuales",
    )
    trabajador_actual = models.ForeignKey(
        "Trabajador",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="item_unidades_actuales",
    )
    maquinaria_actual = models.ForeignKey(
        "Maquinaria",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="item_unidades_actuales",
    )

    creado_en = models.DateTimeField(auto_now_add=True)

    def sincronizar_ubicacion_actual(self):
        historial_activo = (
            self.historial
            .select_related("almacen", "trabajador", "maquinaria")
            .filter(fecha_fin__isnull=True)
            .order_by("-fecha_inicio", "-id")
            .first()
        )

        updates = {
            "almacen_actual": historial_activo.almacen if historial_activo else None,
            "trabajador_actual": historial_activo.trabajador if historial_activo else None,
            "maquinaria_actual": historial_activo.maquinaria if historial_activo else None,
        }

        changed_fields = [
            field_name
            for field_name, value in updates.items()
            if getattr(self, field_name) != value
        ]
        if not changed_fields:
            return

        for field_name, value in updates.items():
            setattr(self, field_name, value)

        self.__class__.objects.filter(pk=self.pk).update(
            almacen_actual=updates["almacen_actual"],
            trabajador_actual=updates["trabajador_actual"],
            maquinaria_actual=updates["maquinaria_actual"],
        )

    def save(self, *args, **kwargs):
        if not self.serie:
            with transaction.atomic():
                item = Item.objects.select_for_update().get(pk=self.item.pk)
                item.ultimo_correlativo += 1
                item.save(update_fields=["ultimo_correlativo"])

                self.serie = f"{item.codigo}-{item.ultimo_correlativo:05d}"

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.item.codigo} - {self.serie}"
    
class Proveedor(models.Model):
    nombre = models.CharField(max_length=150)
    ruc = models.CharField(max_length=20, unique=True)
    direccion = models.CharField(max_length=255, blank=True, default="")

    def __str__(self):
        return self.nombre

class ItemProveedor(models.Model):

    class Moneda(models.TextChoices):
        PEN = "PEN", "Soles"
        USD = "USD", "Dólares"
        EUR = "EUR", "Euros"

    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name="proveedores")
    proveedor = models.ForeignKey(Proveedor, on_delete=models.PROTECT)
    precio = models.DecimalField(max_digits=12, decimal_places=2)
    moneda = models.CharField(max_length=3, choices=Moneda.choices)

    class Meta:
        unique_together = ("item", "proveedor")




class ItemGrupo(TimeStampedModel):
    nombre = models.CharField(max_length=150, unique=True)

    def __str__(self):
        return self.nombre


class ItemGrupoDetalle(models.Model):
    grupo = models.ForeignKey(
        ItemGrupo,
        on_delete=models.CASCADE,
        related_name="items",
    )
    item = models.ForeignKey(Item, on_delete=models.PROTECT, related_name="grupos")
    cantidad = models.DecimalField(max_digits=16, decimal_places=6, default=1)
    unidad_medida = models.ForeignKey(
        UnidadMedida,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="grupos_detalle",
    )

    class Meta:
        unique_together = ("grupo", "item")

    def clean(self):
        if self.cantidad <= 0:
            raise ValidationError("La cantidad debe ser mayor a cero")

        if self.unidad_medida and self.item.dimension_id != self.unidad_medida.dimension_id:
            raise ValidationError("La unidad seleccionada no corresponde a la dimensión del item")

    def __str__(self):
        return f"{self.grupo.nombre} - {self.item.codigo}"

class Trabajador(models.Model):
    codigo = models.CharField(
        max_length=50,
        unique=True,
        editable=False
    )
    nombres = models.CharField(max_length=100)
    apellidos = models.CharField(max_length=100)
    dni = models.CharField(max_length=8, unique=True)
    puesto = models.CharField(max_length=100)

    def save(self, *args, **kwargs):
        if not self.codigo:
            last = (
                Trabajador.objects
                .aggregate(max_id=Max("id"))
                ["max_id"]
            )
            next_id = (last or 0) + 1
            self.codigo = f"TRAB-{next_id:05d}"

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.codigo} - {self.nombres} {self.apellidos}"


class PerfilUsuario(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="perfil")
    trabajador = models.OneToOneField(Trabajador, on_delete=models.PROTECT)

    def __str__(self):
        return self.user.username


# =========================
# ORDEN DE TRABAJO
# =========================

class OrdenTrabajo(models.Model):

    class Lugar(models.TextChoices):
        TALLER = "TALLER", "Taller"
        CAMPO = "CAMPO", "Campo"

    class EstadoEquipo(models.TextChoices):
        OPERATIVO = "OPERATIVO", "Operativo"
        INOPERATIVO = "INOPERATIVO", "Inoperativo"

    class Estatus(models.TextChoices):
        PENDIENTE = "PENDIENTE", "Pendiente"
        EN_PROCESO = "EN_PROCESO", "En proceso"
        FINALIZADO = "FINALIZADO", "Finalizado"

    codigo_orden = models.CharField(max_length=50, unique=True, editable=False )
    maquinaria = models.ForeignKey(Maquinaria, on_delete=models.PROTECT)
    fecha = models.DateField(default=current_local_date)
    hora_inicio = models.TimeField(null=True, blank=True)
    hora_fin = models.TimeField(null=True, blank=True)
    horometro = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    prioridad = models.CharField(
        max_length=15,
        choices=[
            ("URGENTE", "Urgente"),
            ("EMERGENCIA", "Emergencia"),
            ("REGULAR", "Regular"),
        ]
    )

    lugar = models.CharField(max_length=10, choices=Lugar.choices)
    ubicacion_detalle = models.CharField(
        max_length=255,
        blank=True,
        help_text="Ubicación exacta donde se realizará el trabajo"
    )
    estado_equipo = models.CharField(max_length=15, choices=EstadoEquipo.choices, null=True, blank=True)
    estatus = models.CharField(max_length=15, choices=Estatus.choices, default=Estatus.PENDIENTE)

    observaciones = models.TextField(blank=True)

    tecnicos = models.ManyToManyField(
        Trabajador, through="TecnicoAsignado"
    )

    def save(self, *args, **kwargs):
        if not self.codigo_orden:
            year = timezone.now().year
            last = (
                OrdenTrabajo.objects
                .filter(codigo_orden__startswith=f"OT-{year}")
                .aggregate(max_code=Max("codigo_orden"))
                ["max_code"]
            )

            if last:
                seq = int(last.split("-")[-1]) + 1
            else:
                seq = 1

            self.codigo_orden = f"OT-{year}-{seq:05d}"

        super().save(*args, **kwargs)

    def __str__(self):
        return self.codigo_orden


class TecnicoAsignado(models.Model):
    orden = models.ForeignKey(OrdenTrabajo, on_delete=models.CASCADE)
    tecnico = models.ForeignKey(Trabajador, on_delete=models.CASCADE)

    class Meta:
        unique_together = ("orden", "tecnico")


# =========================
# ACTIVIDADES
# =========================

class ActividadTrabajo(models.Model):

    class TipoActividad(models.TextChoices):
        MANTENIMIENTO = "MANTENIMIENTO", "Mantenimiento"
        REVISION = "REVISION", "Revisión"

    class TipoMantenimiento(models.TextChoices):
        PREVENTIVO = "PREVENTIVO", "Preventivo"
        CORRECTIVO = "CORRECTIVO", "Correctivo"
        PREDICTIVO = "PREDICTIVO", "Predictivo"
        OVERHAUL = "OVERHAUL", "Overhaul"

    class SubTipo(models.TextChoices):
        PM1 = "PM1", "PM1"
        PM2 = "PM2", "PM2"
        PM3 = "PM3", "PM3"
        PM4 = "PM4", "PM4"
        LEVE = "LEVE", "Leve"
        MEDIANO = "MEDIANO", "Mediano"
        REGULAR = "REGULAR", "Regular"
        GRAVE = "GRAVE", "Grave"

    SUBTIPOS_POR_TIPO_MANTENIMIENTO = {
        TipoMantenimiento.PREVENTIVO: {
            SubTipo.PM1,
            SubTipo.PM2,
            SubTipo.PM3,
            SubTipo.PM4,
        },
        TipoMantenimiento.CORRECTIVO: {
            SubTipo.LEVE,
            SubTipo.MEDIANO,
            SubTipo.GRAVE,
        },
        TipoMantenimiento.PREDICTIVO: {
            SubTipo.LEVE,
            SubTipo.MEDIANO,
            SubTipo.GRAVE,
        },
        TipoMantenimiento.OVERHAUL: {
            SubTipo.LEVE,
            SubTipo.MEDIANO,
            SubTipo.REGULAR,
        },
    }

    orden = models.ForeignKey(
        OrdenTrabajo,
        on_delete=models.CASCADE,
        related_name="actividades"
    )

    tipo_actividad = models.CharField(
        max_length=20,
        choices=TipoActividad.choices
    )

    tipo_mantenimiento = models.CharField(
        max_length=20,
        choices=TipoMantenimiento.choices,
        null=True,
        blank=True
    )

    subtipo = models.CharField(
        max_length=10,
        choices=SubTipo.choices,
        null=True,
        blank=True
    )

    descripcion = models.TextField(blank=True)
    es_planificada = models.BooleanField(default=False)

    @classmethod
    def get_subtipos_validos(cls, tipo_mantenimiento):
        return cls.SUBTIPOS_POR_TIPO_MANTENIMIENTO.get(tipo_mantenimiento, set())

    def clean(self):
        # REVISION: no debe tener mantenimiento
        if self.tipo_actividad == self.TipoActividad.REVISION:
            if self.tipo_mantenimiento or self.subtipo:
                raise ValidationError(
                    "La revisión no debe tener tipo ni subtipo"
                )

        # MANTENIMIENTO: ambos son obligatorios
        if self.tipo_actividad == self.TipoActividad.MANTENIMIENTO:
            if not self.tipo_mantenimiento or not self.subtipo:
                raise ValidationError(
                    "El mantenimiento requiere tipo y subtipo"
                )

            subtipos_validos = self.get_subtipos_validos(self.tipo_mantenimiento)
            if self.subtipo not in subtipos_validos:
                raise ValidationError(
                    "El subtipo no es valido para el tipo de mantenimiento seleccionado"
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class ActividadTrabajoEvidencia(TimeStampedModel):
    actividad = models.ForeignKey(
        ActividadTrabajo,
        on_delete=models.CASCADE,
        related_name="evidencias",
    )
    imagen = models.ImageField(upload_to="actividades/evidencias/%Y/%m/")

    class Meta:
        ordering = ["created_at", "id"]

    def __str__(self):
        return f"Evidencia #{self.pk} - Actividad {self.actividad_id}"


# =========================
# REPUESTOS (CAMBIOS / REVISIONES)
# =========================

class MovimientoRepuesto(models.Model):

    actividad = models.ForeignKey(
        ActividadTrabajo,
        on_delete=models.CASCADE,
        related_name="repuestos"
    )

    item_unidad = models.ForeignKey(ItemUnidad, on_delete=models.PROTECT)
    tecnico = models.ForeignKey(
        Trabajador,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    fecha = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if self.item_unidad.estado == ItemUnidad.Estado.INOPERATIVO:
            raise ValidationError(
                "La unidad no puede estar en estado INOPERATIVO"
            )
        

class MovimientoConsumible(models.Model):

    actividad = models.ForeignKey(
        ActividadTrabajo,
        on_delete=models.CASCADE,
        related_name="consumibles"
    )

    item = models.ForeignKey(Item, on_delete=models.PROTECT)
    cantidad = models.DecimalField(max_digits=16, decimal_places=6)
    tecnico = models.ForeignKey(
        Trabajador,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    unidad_medida = models.ForeignKey(
        UnidadMedida,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    fecha = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if self.item.tipo_insumo != Item.TipoInsumo.CONSUMIBLE:
            raise ValidationError(
                "El item debe ser de tipo CONSUMIBLE"
            )
        
# =========================
# COMPRAS
# =========================

class TipoCambioDiario(models.Model):
    fecha = models.DateField(unique=True)
    compra_usd = models.DecimalField(max_digits=10, decimal_places=4)
    venta_usd = models.DecimalField(max_digits=10, decimal_places=4)
    compra_eur = models.DecimalField(max_digits=10, decimal_places=4)
    venta_eur = models.DecimalField(max_digits=10, decimal_places=4)

    class Meta:
        ordering = ["-fecha"]

    def __str__(self):
        return (
            f"{self.fecha} | USD C:{self.compra_usd} V:{self.venta_usd} | "
            f"EUR C:{self.compra_eur} V:{self.venta_eur}"
        )

class Compra(models.Model):

    class TipoComprobante(models.TextChoices):
        FACTURA = "FACTURA", "Factura"
        BOLETA = "BOLETA", "Boleta"
    
    class Moneda(models.TextChoices):
        PEN = "PEN", "Soles"
        USD = "USD", "Dólares"
        EUR = "EUR", "Euros"

    tipo_comprobante = models.CharField(
        max_length=10,
        choices=TipoComprobante.choices,
        null=True,
        blank=True,
    )
    codigo_comprobante = models.CharField(
        max_length=50,
        null=True,
        blank=True,
    )
    proveedor = models.ForeignKey(Proveedor, on_delete=models.PROTECT, related_name="compras", null=True, blank=True)
    moneda = models.CharField(
        max_length=3,
        choices=Moneda.choices,
        default=Moneda.PEN
    )
    fecha = models.DateField(default=current_local_date)
    
    class Meta:
        unique_together = ("tipo_comprobante", "codigo_comprobante")

class CompraDetalle(models.Model):
    IGV = Decimal("1.18")

    compra = models.ForeignKey(
        Compra,
        related_name="detalles",
        on_delete=models.CASCADE
    )

    item = models.ForeignKey(Item, on_delete=models.PROTECT)
    cantidad = models.PositiveIntegerField()
    unidad_medida = models.ForeignKey(
        UnidadMedida,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )

    moneda = models.CharField(
        max_length=3,
        choices=Compra.Moneda.choices,
        default=Compra.Moneda.PEN
    )

    valor_unitario = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Precio sin IGV"
    )

    class Meta:
        unique_together = ("compra", "item")

    @property
    def valor_total(self):
        return self.cantidad * self.valor_unitario

    @property
    def costo_unitario(self):
        return self.valor_unitario * self.IGV

    @property
    def costo_total(self):
        return self.valor_total * self.IGV


class OrdenCompra(TimeStampedModel):

    class Estado(models.TextChoices):
        PENDIENTE = "PENDIENTE", "Pendiente"
        REVISADO = "REVISADO", "Revisado"
        EN_PROCESO = "EN_PROCESO", "En proceso"
        RECIBIDO = "RECIBIDO", "Recibido"

    codigo = models.CharField(max_length=50, unique=True, editable=False)
    estado = models.CharField(
        max_length=20,
        choices=Estado.choices,
        default=Estado.PENDIENTE,
    )
    observaciones = models.TextField(blank=True, default="")
    emitido_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ordenes_compra_emitidas",
    )
    recepcion_confirmada = models.BooleanField(default=False)
    fecha_confirmacion_recepcion = models.DateTimeField(null=True, blank=True)
    confirmado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ordenes_compra_confirmadas",
    )

    class Meta:
        ordering = ["-created_at", "-id"]

    def save(self, *args, **kwargs):
        if not self.codigo:
            year = timezone.now().year
            last = (
                OrdenCompra.objects
                .filter(codigo__startswith=f"OC-{year}")
                .aggregate(max_code=Max("codigo"))
                ["max_code"]
            )
            seq = int(last.split("-")[-1]) + 1 if last else 1
            self.codigo = f"OC-{year}-{seq:05d}"

        super().save(*args, **kwargs)

    def __str__(self):
        return self.codigo


class OrdenCompraDetalle(models.Model):
    orden_compra = models.ForeignKey(
        OrdenCompra,
        on_delete=models.CASCADE,
        related_name="detalles",
    )
    item = models.ForeignKey(Item, on_delete=models.PROTECT)
    cantidad = models.DecimalField(max_digits=16, decimal_places=6)
    proveedor = models.ForeignKey(
        Proveedor,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="ordenes_compra_detalle",
    )

    class Meta:
        ordering = ["id"]

    def clean(self):
        if self.cantidad <= 0:
            raise ValidationError("La cantidad debe ser mayor a cero")

    def __str__(self):
        return f"{self.orden_compra.codigo} - {self.item.codigo}"


class OrdenRequerimiento(TimeStampedModel):

    class Estado(models.TextChoices):
        POR_REVISAR = "POR_REVISAR", "Por revisar"
        ENTREGADO = "ENTREGADO", "Entregado"
        SIN_STOCK = "SIN_STOCK", "Sin stock"

    codigo = models.CharField(max_length=50, unique=True, editable=False)
    trabajo = models.ForeignKey(
        OrdenTrabajo,
        on_delete=models.CASCADE,
        related_name="ordenes_requerimiento",
    )
    estado = models.CharField(
        max_length=20,
        choices=Estado.choices,
        default=Estado.POR_REVISAR,
    )
    tecnico_asignado = models.ForeignKey(
        Trabajador,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="ordenes_requerimiento_asignadas",
    )
    observaciones = models.TextField(blank=True, default="")
    emitido_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ordenes_requerimiento_emitidas",
    )
    recepcion_confirmada_tecnico = models.BooleanField(default=False)
    fecha_confirmacion_tecnico = models.DateTimeField(null=True, blank=True)
    confirmado_por_tecnico = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ordenes_requerimiento_confirmadas",
    )

    class Meta:
        ordering = ["-created_at", "-id"]

    def save(self, *args, **kwargs):
        if not self.codigo:
            year = timezone.now().year
            last = (
                OrdenRequerimiento.objects
                .filter(codigo__startswith=f"OR-{year}")
                .aggregate(max_code=Max("codigo"))
                ["max_code"]
            )
            seq = int(last.split("-")[-1]) + 1 if last else 1
            self.codigo = f"OR-{year}-{seq:05d}"

        super().save(*args, **kwargs)

    def __str__(self):
        return self.codigo


class OrdenRequerimientoDetalle(models.Model):
    orden_requerimiento = models.ForeignKey(
        OrdenRequerimiento,
        on_delete=models.CASCADE,
        related_name="detalles",
    )
    item = models.ForeignKey(Item, on_delete=models.PROTECT)
    cantidad = models.DecimalField(max_digits=16, decimal_places=6)
    proveedor = models.ForeignKey(
        Proveedor,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="ordenes_requerimiento_detalle",
    )

    class Meta:
        ordering = ["id"]

    def clean(self):
        if self.cantidad <= 0:
            raise ValidationError("La cantidad debe ser mayor a cero")

    def __str__(self):
        return f"{self.orden_requerimiento.codigo} - {self.item.codigo}"


class LoteConsumible(models.Model):

    compra_detalle = models.ForeignKey(
        CompraDetalle,
        on_delete=models.PROTECT,
        related_name="lotes"
    )

    item = models.ForeignKey(
        Item,
        on_delete=models.PROTECT,
        limit_choices_to={"tipo_insumo": Item.TipoInsumo.CONSUMIBLE}
    )

    cantidad_inicial = models.DecimalField(
        max_digits=16,
        decimal_places=6
    )

    cantidad_disponible = models.DecimalField(
        max_digits=16,
        decimal_places=6
    )

    unidad_medida = models.ForeignKey(
        UnidadMedida,
        on_delete=models.PROTECT
    )

    almacen = models.ForeignKey(
        Almacen,
        on_delete=models.PROTECT
    )

    fecha_ingreso = models.DateTimeField(auto_now_add=True)


# =========================
# AUDITORÍA
# =========================

class Auditoria(models.Model):
    usuario = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    accion = models.CharField(max_length=100)
    modelo = models.CharField(max_length=100)
    objeto_id = models.PositiveIntegerField()
    fecha = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.fecha} - {self.usuario} - {self.accion}"
    
class CodigoRegistro(models.Model):
    trabajador = models.OneToOneField(
        Trabajador,
        on_delete=models.CASCADE,
        related_name="codigo_registro"
    )

    codigo = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False
    )

    usado = models.BooleanField(default=False)
    creado_en = models.DateTimeField(auto_now_add=True)
    expira_en = models.DateTimeField()

    def save(self, *args, **kwargs):
        if not self.expira_en:
            self.expira_en = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)

    def es_valido(self):
        return (not self.usado) and timezone.now() < self.expira_en

    def __str__(self):
        return f"{self.trabajador} - {self.codigo}"
    
class TraspasoItem(models.Model):
    item = models.ForeignKey(Item, on_delete=models.PROTECT)

    origen = models.ForeignKey(
        Almacen,
        related_name="traspasos_salida",
        on_delete=models.PROTECT
    )
    destino = models.ForeignKey(
        Almacen,
        related_name="traspasos_entrada",
        on_delete=models.PROTECT
    )

    fecha = models.DateTimeField(auto_now_add=True)

class HistorialUbicacionItem(models.Model):
    item_unidad = models.ForeignKey(
        ItemUnidad,
        on_delete=models.PROTECT,
        related_name="historial"
    )

    maquinaria = models.ForeignKey(
        Maquinaria, null=True, blank=True, on_delete=models.PROTECT
    )
    almacen = models.ForeignKey(
        Almacen, null=True, blank=True, on_delete=models.PROTECT
    )
    trabajador = models.ForeignKey(
        Trabajador, null=True, blank=True, on_delete=models.PROTECT
    )

    orden_trabajo = models.ForeignKey(
        OrdenTrabajo, null=True, blank=True, on_delete=models.SET_NULL
    )

    fecha_inicio = models.DateTimeField(auto_now_add=True)
    fecha_fin = models.DateTimeField(null=True, blank=True)
    horometro_inicio = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    horometro_fin = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    estado = models.CharField(
        max_length=15,
        choices=ItemUnidad.Estado.choices,
        default=ItemUnidad.Estado.NUEVO
    )

    def clean(self):
        destinos = [self.maquinaria, self.almacen, self.trabajador]
        if sum(bool(d) for d in destinos) != 1:
            raise ValidationError("Debe existir un único destino")
    
    def _obtener_horometro_maquinaria(self):
        if not self.maquinaria:
            return None
        return self.maquinaria.obtener_horometro_actual()

    def cerrar(self, fecha=None, horometro_fin=None):
        if self.fecha_fin:
            return

        self.fecha_fin = fecha or timezone.now()
        update_fields = ["fecha_fin"]
        if (
            horometro_fin is not None
            and self.maquinaria_id
            and self.orden_trabajo_id
        ):
            self.horometro_fin = horometro_fin
            update_fields.append("horometro_fin")
        self.save(update_fields=update_fields)

    def save(self, *args, **kwargs):

        is_new = self.pk is None

        if is_new:
            historiales_activos = list(
                HistorialUbicacionItem.objects
                .filter(
                    item_unidad=self.item_unidad,
                    fecha_fin__isnull=True
                )
            )
            for historial_activo in historiales_activos:
                historial_activo.cerrar()

        self.full_clean()
        
        super().save(*args, **kwargs)
        self.item_unidad.sincronizar_ubicacion_actual()

class HistorialConsumible(models.Model):

    lote = models.ForeignKey(
        LoteConsumible,
        on_delete=models.PROTECT,
        related_name="historiales"
    )

    item = models.ForeignKey(
        Item,
        on_delete=models.PROTECT
    )

    cantidad = models.DecimalField(
        max_digits=16,
        decimal_places=6
    )

    unidad_medida = models.ForeignKey(
        UnidadMedida,
        on_delete=models.PROTECT
    )

    maquinaria = models.ForeignKey(
        Maquinaria,
        null=True,
        blank=True,
        on_delete=models.PROTECT
    )

    trabajador = models.ForeignKey(
        Trabajador,
        null=True,
        blank=True,
        on_delete=models.PROTECT
    )

    almacen = models.ForeignKey(
        Almacen,
        null=True,
        blank=True,
        on_delete=models.PROTECT
    )

    orden_trabajo = models.ForeignKey(
        OrdenTrabajo,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    fecha_inicio = models.DateTimeField(auto_now_add=True)
    fecha_fin = models.DateTimeField(null=True, blank=True)
    horometro_inicio = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    horometro_fin = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    def clean(self):
        destinos = [self.maquinaria, self.trabajador, self.almacen]
        if sum(bool(d) for d in destinos) != 1:
            raise ValidationError("Debe existir un único destino")

        if self.cantidad > self.lote.cantidad_disponible:
            raise ValidationError("No hay suficiente cantidad disponible en el lote")

    def _obtener_horometro_maquinaria(self):
        if not self.maquinaria:
            return None
        return self.maquinaria.obtener_horometro_actual()

    def cerrar(self, fecha=None, cantidad=None, horometro_fin=None):
        if self.fecha_fin:
            return

        self.fecha_fin = fecha or timezone.now()
        if cantidad is not None:
            self.cantidad = cantidad

        update_fields = ["fecha_fin"]
        if (
            horometro_fin is not None
            and self.maquinaria_id
            and self.orden_trabajo_id
        ):
            self.horometro_fin = horometro_fin
            update_fields.append("horometro_fin")
        if cantidad is not None:
            update_fields.append("cantidad")
        self.save(update_fields=update_fields)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
