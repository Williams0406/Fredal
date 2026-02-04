from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.db.models import Max
import uuid
from datetime import timedelta
from decimal import Decimal
from django.db import transaction
from django.db.models import Avg

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

    def calcular_centro_costos(self):
        """
        Suma el costo unitario real (con IGV)
        de todas las unidades activas en la maquinaria
        """

        from .models import HistorialUbicacionItem

        historiales = (
            HistorialUbicacionItem.objects
            .select_related("item_unidad__compra_detalle")
            .filter(
                maquinaria=self,
                fecha_fin__isnull=True,
                item_unidad__compra_detalle__isnull=False
            )
        )

        total = Decimal("0.00")

        for h in historiales:
            detalle = h.item_unidad.compra_detalle
            total += detalle.costo_unitario

        return total


class Almacen(models.Model):
    nombre = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.nombre


class Item(TimeStampedModel):

    class TipoInsumo(models.TextChoices):
        REPUESTO = "REPUESTO"
        CONSUMIBLE = "CONSUMIBLE"

    codigo = models.CharField(max_length=50, unique=True)
    nombre = models.CharField(max_length=150)
    tipo_insumo = models.CharField(max_length=15, choices=TipoInsumo.choices)

    unidad_medida = models.CharField(max_length=20, default="UNIDAD")
    volvo = models.BooleanField(default=False)
    ultimo_correlativo = models.PositiveIntegerField(default=0)

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

    creado_en = models.DateTimeField(auto_now_add=True)

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
    fecha = models.DateField(default=timezone.now)
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

    class SubTipo(models.TextChoices):
        PM1 = "PM1", "PM1"
        PM2 = "PM2", "PM2"
        PM3 = "PM3", "PM3"
        PM4 = "PM4", "PM4"
        LEVE = "LEVE", "Leve"
        MEDIANO = "MEDIANO", "Mediano"
        GRAVE = "GRAVE", "Grave"

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

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


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
    cantidad = models.PositiveIntegerField()
    fecha = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if self.item.tipo_insumo != Item.TipoInsumo.CONSUMIBLE:
            raise ValidationError(
                "El item debe ser de tipo CONSUMIBLE"
            )
        
# =========================
# COMPRAS
# =========================

class Compra(models.Model):

    class TipoComprobante(models.TextChoices):
        FACTURA = "FACTURA", "Factura"
        BOLETA = "BOLETA", "Boleta"
    
    class Moneda(models.TextChoices):
        PEN = "PEN", "Soles"
        USD = "USD", "Dólares"
        EUR = "EUR", "Euros"

    tipo_comprobante = models.CharField(max_length=10, choices=TipoComprobante.choices)
    codigo_comprobante = models.CharField(max_length=50)
    proveedor = models.ForeignKey(Proveedor, on_delete=models.PROTECT, related_name="compras", null=True, blank=True)
    moneda = models.CharField(
        max_length=3,
        choices=Moneda.choices,
        default=Moneda.PEN
    )
    fecha = models.DateField(default=timezone.localdate)
    
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
    estado = models.CharField(
        max_length=15,
        choices=ItemUnidad.Estado.choices,
        default=ItemUnidad.Estado.NUEVO
    )

    def clean(self):
        destinos = [self.maquinaria, self.almacen, self.trabajador]
        if sum(bool(d) for d in destinos) != 1:
            raise ValidationError("Debe existir un único destino")
    
    def save(self, *args, **kwargs):
        from django.utils import timezone

        is_new = self.pk is None

        if is_new:
            # 🔒 Cerrar ubicación activa anterior
            (
                HistorialUbicacionItem.objects
                .filter(
                    item_unidad=self.item_unidad,
                    fecha_fin__isnull=True
                )
                .update(fecha_fin=timezone.now())
            )

        self.full_clean()
        
        super().save(*args, **kwargs)