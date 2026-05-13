from django.contrib.auth.models import User
from django.contrib.auth.models import Group
from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import (
    Item,
    Maquinaria,
    Compra,
    CompraDetalle,
    OrdenCompra,
    OrdenCompraDetalle,
    OrdenRequerimiento,
    OrdenRequerimientoDetalle,
    Almacen,
    Trabajador,
    PerfilUsuario,
    ActividadTrabajo,
    ActividadTrabajoEvidencia,
    MovimientoRepuesto,
    MovimientoConsumible,
    OrdenTrabajo,
    CodigoRegistro,
    HistorialUbicacionItem,
    HistorialConsumible,
    ItemUnidad,
    ItemProveedor,
    Proveedor,
    Cliente,
    UbicacionCliente,
    Dimension,
    UnidadMedida,
    UnidadRelacion,
    ItemGrupo,
    ItemGrupoDetalle,
    LoteConsumible,
    TipoCambioDiario,
)
from .permissions import (
    can_manage_planned_activities,
    is_compras_user,
    is_maintenance_boss,
    is_storage_user,
    is_tecnico_user,
)

def obtener_unidad_base(dimension):
    return UnidadMedida.objects.filter(dimension=dimension).order_by("id").first()


def obtener_factor_entre_unidades(unidad_origen, unidad_destino, unidad_base=None):
    del unidad_base  # Compatibilidad con llamadas antiguas.

    if unidad_origen.id == unidad_destino.id:
        return Decimal("1")

    if unidad_origen.dimension_id != unidad_destino.dimension_id:
        raise ValidationError("Las unidades no pertenecen a la misma dimensión")

    relacion = UnidadRelacion.objects.filter(
        unidad_base=unidad_origen,
        unidad_relacionada=unidad_destino,
    ).first()
    if not relacion:
        raise ValidationError(
            "No existe relación de unidad entre la unidad origen y destino"
        )
    if relacion.factor == 0:
        raise ValidationError("El factor de equivalencia no puede ser cero")

    return Decimal(relacion.factor)

def calcular_stock_item(item):
    if item.tipo_insumo in Item.tipos_con_unidades():
        if (
            item.unidad_medida
            and item.dimension
            and item.unidad_medida.nombre.upper() == "CANTIDAD"
            and item.dimension.codigo.upper() == "UNIDAD"
        ):
            unidades_disponibles = (
                ItemUnidad.objects
                .filter(
                    item=item,
                    almacen_actual__isnull=False,
                )
                .exclude(estado=ItemUnidad.Estado.INOPERATIVO)
                .distinct()
                .count()
            )
            return Decimal(unidades_disponibles)

        total_compras = (
            CompraDetalle.objects
            .filter(item=item)
            .aggregate(total=Sum("cantidad"))
            .get("total")
            or 0
        )
        total_salidas = (
            MovimientoRepuesto.objects
            .filter(item_unidad__item=item, actividad__es_planificada=False)
            .count()
            if item.tipo_insumo == Item.TipoInsumo.REPUESTO
            else 0
        )
        return max(Decimal(total_compras) - Decimal(total_salidas), Decimal("0"))

    if not item.unidad_medida or not item.dimension:
        return Decimal("0")

    total_disponible = (
        LoteConsumible.objects
        .filter(item=item)
        .aggregate(total=Sum("cantidad_disponible"))
        .get("total")
        or Decimal("0")
    )
    return max(Decimal(total_disponible), Decimal("0"))

def actualizar_stock_item(item):
    if hasattr(item, "_stock_calculado"):
        return item._stock_calculado
    stock = calcular_stock_item(item)
    item._stock_calculado = stock
    if item.stock != stock:
        item.stock = stock
        item.save(update_fields=["stock"])
    return stock


def convertir_cantidad_a_unidad_item(item, cantidad, unidad_origen):
    if unidad_origen.id == item.unidad_medida_id:
        return Decimal(cantidad)
    factor = obtener_factor_entre_unidades(unidad_origen, item.unidad_medida)
    return Decimal(cantidad) * factor


def obtener_configuracion_unidad_por_defecto():
    dimension = Dimension.objects.filter(codigo__iexact="UNIDAD").first()
    if not dimension:
        raise ValidationError(
            "No existe la dimension UNIDAD para configurar repuestos y herramientas."
        )

    unidad = (
        UnidadMedida.objects
        .filter(dimension=dimension, activo=True)
        .order_by("-es_base", "id")
        .first()
        or UnidadMedida.objects
        .filter(dimension=dimension)
        .order_by("-es_base", "id")
        .first()
    )
    if not unidad:
        raise ValidationError(
            "No existe una unidad de medida para la dimension UNIDAD."
        )

    return dimension, unidad


def normalizar_item_con_unidades(item):
    if item.tipo_insumo not in Item.tipos_con_unidades():
        return item

    update_fields = []

    if item.unidad_medida_id and not item.dimension_id:
        item.dimension = item.unidad_medida.dimension
        update_fields.append("dimension")

    if (
        item.dimension_id
        and item.unidad_medida_id
        and item.dimension_id == item.unidad_medida.dimension_id
    ):
        if update_fields:
            item.save(update_fields=update_fields)
        return item

    dimension_default, unidad_default = obtener_configuracion_unidad_por_defecto()

    if item.dimension_id != dimension_default.id:
        item.dimension = dimension_default
        update_fields.append("dimension")

    if item.unidad_medida_id != unidad_default.id:
        item.unidad_medida = unidad_default
        update_fields.append("unidad_medida")

    if update_fields:
        item.save(update_fields=list(dict.fromkeys(update_fields)))

    return item


def obtener_tecnico_responsable_planificado(actividad, tecnico=None, tecnico_id=None):
    tecnicos = actividad.orden.tecnicos.order_by("id")

    if tecnico is not None:
        tecnico_id = getattr(tecnico, "id", tecnico)

    if tecnico_id:
        tecnico_resuelto = tecnicos.filter(id=tecnico_id).first()
        if tecnico_resuelto:
            return tecnico_resuelto

    return tecnicos.first()


def obtener_trabajador_request(request):
    user = getattr(request, "user", None)
    if not user or not user.is_authenticated:
        return None

    try:
        return user.perfil.trabajador
    except (AttributeError, PerfilUsuario.DoesNotExist):
        return None


def obtener_tecnico_contexto_actividad(actividad, request=None, tecnico=None, tecnico_id=None):
    tecnicos = actividad.orden.tecnicos.order_by("id")

    if tecnico is not None:
        tecnico_id = getattr(tecnico, "id", tecnico)

    if tecnico_id:
        tecnico_resuelto = tecnicos.filter(id=tecnico_id).first()
        if tecnico_resuelto:
            return tecnico_resuelto

    trabajador = obtener_trabajador_request(request)
    if trabajador and tecnicos.filter(id=trabajador.id).exists():
        return trabajador

    return tecnicos.first()


def calcular_stock_item_por_vista(item, vista="general"):
    vista_normalizada = (vista or "general").lower()
    if vista_normalizada == "general":
        return actualizar_stock_item(item)

    if item.tipo_insumo in Item.tipos_con_unidades():
        unidades = (
            ItemUnidad.objects
            .filter(
                item=item,
                estado__in=[
                    ItemUnidad.Estado.NUEVO,
                    ItemUnidad.Estado.USADO,
                    ItemUnidad.Estado.REPARADO,
                ],
            )
            .exclude(estado=ItemUnidad.Estado.INOPERATIVO)
        )

        if vista_normalizada == "almacen":
            unidades = unidades.filter(almacen_actual__isnull=False)
        elif vista_normalizada == "tecnicos":
            unidades = unidades.filter(trabajador_actual__isnull=False)
        elif vista_normalizada == "maquinaria":
            unidades = unidades.filter(maquinaria_actual__isnull=False)

        return Decimal(unidades.values("id").distinct().count())

    historiales = HistorialConsumible.objects.filter(
        item=item,
        fecha_fin__isnull=True,
        cantidad__gt=0,
    )

    if vista_normalizada == "almacen":
        historiales = historiales.filter(almacen__isnull=False)
    elif vista_normalizada == "tecnicos":
        historiales = historiales.filter(trabajador__isnull=False)
    elif vista_normalizada == "maquinaria":
        historiales = historiales.filter(maquinaria__isnull=False)

    total = historiales.aggregate(total=Sum("cantidad")).get("total") or Decimal("0")
    return max(Decimal(total), Decimal("0"))

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    groups = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Group.objects.all(), required=False
    )
    trabajador = serializers.PrimaryKeyRelatedField(
        queryset=Trabajador.objects.all(), write_only=True
    )
    trabajador_id = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "password",
            "is_active",
            "groups",
            "trabajador",
            "trabajador_id",
            "roles",
        ]
        
    def get_trabajador_id(self, obj):
        try:
            return obj.perfil.trabajador_id
        except (AttributeError, PerfilUsuario.DoesNotExist):
            return None

    def get_roles(self, obj):
        return list(obj.groups.values_list("name", flat=True))

    def create(self, validated_data):
        groups = validated_data.pop("groups", [])
        trabajador = validated_data.pop("trabajador")

        user = User.objects.create_user(**validated_data)
        user.groups.set(groups)

        PerfilUsuario.objects.create(
            user=user,
            trabajador=trabajador
        )

        return user

class ItemSerializer(serializers.ModelSerializer):
    unidades_disponibles = serializers.SerializerMethodField()
    stock = serializers.SerializerMethodField()
    dimension_detalle = serializers.SerializerMethodField()
    unidad_medida_detalle = serializers.SerializerMethodField()

    class Meta:
        model = Item
        fields = [
            "id",
            "codigo",
            "nombre",
            "tipo_insumo",
            "dimension",
            "dimension_detalle",
            "unidad_medida",
            "unidad_medida_detalle",
            "favorito",
            "volvo",
            "unidades_disponibles",
            "stock",
        ]
        read_only_fields = ["stock"]

    def get_dimension_detalle(self, obj):
        if not obj.dimension:
            return None
        return DimensionSerializer(obj.dimension).data

    def get_unidad_medida_detalle(self, obj):
        if not obj.unidad_medida:
            return None
        return UnidadMedidaSerializer(obj.unidad_medida).data

    def _get_vista_contextual(self):
        request = self.context.get("request")
        if not request:
            return "general"

        if hasattr(request, "query_params"):
            return request.query_params.get("vista", "general")

        return request.GET.get("vista", "general")

    def _get_stock_contextual(self, obj):
        vista = self._get_vista_contextual()
        return calcular_stock_item_por_vista(obj, vista=vista)

    def get_unidades_disponibles(self, obj):
        if obj.tipo_insumo not in Item.tipos_con_unidades():
            return 0

        vista = self._get_vista_contextual()
        vista_normalizada = (vista or "general").lower()

        unidades = (
            ItemUnidad.objects
            .filter(item=obj)
            .exclude(estado=ItemUnidad.Estado.INOPERATIVO)
        )

        if vista_normalizada == "almacen":
            unidades = unidades.filter(almacen_actual__isnull=False)
        elif vista_normalizada == "tecnicos":
            unidades = unidades.filter(trabajador_actual__isnull=False)
        elif vista_normalizada == "maquinaria":
            unidades = unidades.filter(maquinaria_actual__isnull=False)
        else:
            unidades = unidades.filter(
                Q(almacen_actual__isnull=False)
                | Q(trabajador_actual__isnull=False)
                | Q(maquinaria_actual__isnull=False)
            )

        return unidades.distinct().count()

    def get_stock(self, obj):
        return self._get_stock_contextual(obj)

    def validate(self, attrs):
        tipo_insumo = attrs.get(
            "tipo_insumo",
            getattr(self.instance, "tipo_insumo", None),
        )
        dimension = attrs.get(
            "dimension",
            getattr(self.instance, "dimension", None),
        )
        unidad_medida = attrs.get(
            "unidad_medida",
            getattr(self.instance, "unidad_medida", None),
        )

        if tipo_insumo in Item.tipos_con_unidades():
            dimension_default, unidad_default = obtener_configuracion_unidad_por_defecto()
            attrs["dimension"] = dimension_default
            attrs["unidad_medida"] = unidad_default
            return attrs

        if tipo_insumo == Item.TipoInsumo.CONSUMIBLE:
            if not dimension:
                raise ValidationError({
                    "dimension": "Selecciona la dimension del consumible."
                })
            if not unidad_medida:
                raise ValidationError({
                    "unidad_medida": "Selecciona la unidad de medida del consumible."
                })
            if unidad_medida.dimension_id != dimension.id:
                raise ValidationError({
                    "unidad_medida": "La unidad de medida no coincide con la dimension seleccionada."
                })

        return attrs


class MaquinariaSerializer(serializers.ModelSerializer):
    centro_costos = serializers.SerializerMethodField()
    horometro_actual = serializers.SerializerMethodField()
    horometro_fuente = serializers.SerializerMethodField()
    fecha_ultimo_horometro = serializers.SerializerMethodField()

    class Meta:
        model = Maquinaria
        fields = [
            "id",
            "codigo_maquina",
            "nombre",
            "descripcion",
            "observacion",
            "gasto",
            "horometro_manual",
            "horometro_manual_actualizado_en",
            "horometro_actual",
            "horometro_fuente",
            "fecha_ultimo_horometro",
            "centro_costos",
        ]
        read_only_fields = [
            "horometro_manual_actualizado_en",
            "horometro_actual",
            "horometro_fuente",
            "fecha_ultimo_horometro",
            "centro_costos",
        ]

    def get_centro_costos(self, obj):
        return round(obj.calcular_centro_costos(), 2)

    def get_horometro_actual(self, obj):
        return obj.obtener_horometro_actual()

    def get_horometro_fuente(self, obj):
        return obj.obtener_fuente_horometro_actual()

    def get_fecha_ultimo_horometro(self, obj):
        return obj.obtener_fecha_ultimo_horometro()

    def create(self, validated_data):
        if validated_data.get("horometro_manual") is not None:
            validated_data["horometro_manual_actualizado_en"] = timezone.now()
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "horometro_manual" in validated_data:
            nuevo_horometro_manual = validated_data.get("horometro_manual")
            validated_data["horometro_manual_actualizado_en"] = (
                timezone.now() if nuevo_horometro_manual is not None else None
            )
        return super().update(instance, validated_data)

class CompraCreateItemSerializer(serializers.Serializer):
    item = serializers.PrimaryKeyRelatedField(queryset=Item.objects.all())
    cantidad = serializers.IntegerField(min_value=1)
    unidad_medida = serializers.PrimaryKeyRelatedField(
        queryset=UnidadMedida.objects.all(),
        required=False,
        allow_null=True,
    )
    tipo_registro = serializers.ChoiceField(
        choices=["VALOR_UNITARIO", "COSTO_UNITARIO", "VALOR_TOTAL", "COSTO_TOTAL"]
    )
    monto = serializers.DecimalField(max_digits=12, decimal_places=2)
    moneda = serializers.CharField(max_length=3)

class CompraCreateSerializer(serializers.ModelSerializer):
    items = CompraCreateItemSerializer(many=True, write_only=True)
    IGV_FACTOR = Decimal("1.18")

    class Meta:
        model = Compra
        fields = ["fecha", "proveedor", "tipo_comprobante", "codigo_comprobante", "moneda", "items"]
    
    @staticmethod
    def _cantidad_en_unidad_item(item, cantidad, unidad_origen):
        if unidad_origen.id == item.unidad_medida_id:
            return Decimal(cantidad)
        factor = obtener_factor_entre_unidades(unidad_origen, item.unidad_medida)
        return Decimal(cantidad) * factor

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        with transaction.atomic():
            # 1. Crear la cabecera de Compra
            compra = Compra.objects.create(**validated_data)
            
            # 2. Obtener almacén por defecto para el ingreso
            almacen_principal, _ = Almacen.objects.get_or_create(nombre="Almacén Central")

            for data in items_data:
                item = normalizar_item_con_unidades(data["item"])
                cantidad_original = data["cantidad"]
                unidad_medida = data.get("unidad_medida")
                cantidad = cantidad_original

                if unidad_medida and item.tipo_insumo != Item.TipoInsumo.CONSUMIBLE:
                    if item.unidad_medida_id != unidad_medida.id:
                        raise serializers.ValidationError(
                            f"El item {item.codigo} solo permite su unidad configurada"
                        )
                
                if item.tipo_insumo == Item.TipoInsumo.CONSUMIBLE and unidad_medida:
                    if not item.dimension:
                        raise serializers.ValidationError(
                            f"El item {data['item'].codigo} no tiene dimensión configurada"
                        )
                    if unidad_medida.dimension_id != item.dimension_id:
                        raise serializers.ValidationError(
                            "La unidad de medida no coincide con la dimensión del item"
                        )
                    if unidad_medida.id != item.unidad_medida_id:
                        obtener_factor_entre_unidades(unidad_medida, item.unidad_medida)
                elif item.tipo_insumo == Item.TipoInsumo.CONSUMIBLE:
                    unidad_medida = item.unidad_medida
                    if not unidad_medida:
                        raise serializers.ValidationError(
                            f"El item {data['item'].codigo} no tiene unidad de medida configurada"
                        )
                else:
                    unidad_medida = item.unidad_medida
                    if not unidad_medida:
                        raise serializers.ValidationError(
                            f"El item {data['item'].codigo} no tiene unidad de medida configurada"
                        )

                monto = data["monto"]
                tipo = data["tipo_registro"]
                
                # 3. Lógica de cálculo de Valor Unitario (Base Imponible)
                if tipo == "VALOR_UNITARIO":
                    valor_unitario = monto
                elif tipo == "COSTO_UNITARIO":
                    valor_unitario = monto / self.IGV_FACTOR
                elif tipo == "VALOR_TOTAL":
                    valor_unitario = monto / cantidad
                else: # COSTO_TOTAL
                    valor_unitario = (monto / self.IGV_FACTOR) / cantidad

                # 4. Crear el detalle
                detalle = CompraDetalle.objects.create(
                    compra=compra,
                    item=item,
                    cantidad=cantidad,
                    unidad_medida=unidad_medida,
                    moneda=data["moneda"],
                    valor_unitario=valor_unitario.quantize(Decimal("0.01"))
                )

                # 5. Generar unidades físicas en inventario e historial inicial
                if item.tipo_insumo in Item.tipos_con_unidades():
                    for _ in range(cantidad):
                        unidad = ItemUnidad.objects.create(
                            item=item,
                            compra_detalle=detalle,
                            estado=ItemUnidad.Estado.NUEVO
                        )
                        HistorialUbicacionItem.objects.create(
                            item_unidad=unidad,
                            almacen=almacen_principal,
                            estado=unidad.estado,
                            fecha_inicio=compra.fecha
                        )
                else:
                    cantidad_convertida = self._cantidad_en_unidad_item(
                        item,
                        cantidad_original,
                        unidad_medida,
                    )
                    lote = LoteConsumible.objects.create(
                        compra_detalle=detalle,
                        item=item,
                        cantidad_inicial=cantidad_convertida,
                        cantidad_disponible=cantidad_convertida,
                        unidad_medida=item.unidad_medida,
                        almacen=almacen_principal,
                    )
                    HistorialConsumible.objects.create(
                        lote=lote,
                        item=item,
                        cantidad=cantidad_convertida,
                        unidad_medida=item.unidad_medida,
                        almacen=almacen_principal,
                    )
                actualizar_stock_item(item)
            return compra

class CompraDetalleListSerializer(serializers.ModelSerializer):
    compra_id = serializers.IntegerField(source="compra.id", read_only=True)

    # Item
    item_nombre = serializers.CharField(source="item.nombre", read_only=True)
    item_codigo = serializers.CharField(source="item.codigo", read_only=True)
    item_volvo = serializers.BooleanField(source="item.volvo", read_only=True)

    # Proveedor
    proveedor_nombre = serializers.CharField(
        source="compra.proveedor.nombre",
        read_only=True,
        default=None
    )

    # Cabecera
    fecha = serializers.DateField(source="compra.fecha", read_only=True)
    tipo_comprobante = serializers.CharField(
        source="compra.tipo_comprobante",
        read_only=True
    )
    codigo_comprobante = serializers.CharField(
        source="compra.codigo_comprobante",
        read_only=True
    )

    # Cálculos (idénticos a los que usabas)
    valor_total = serializers.SerializerMethodField()
    costo_unitario = serializers.SerializerMethodField()
    costo_total = serializers.SerializerMethodField()
    costo_total_pen = serializers.SerializerMethodField()
    valor_unitario_usd = serializers.SerializerMethodField()
    valor_total_usd = serializers.SerializerMethodField()
    costo_unitario_usd = serializers.SerializerMethodField()
    costo_total_usd = serializers.SerializerMethodField()
    valor_unitario_eur = serializers.SerializerMethodField()
    valor_total_eur = serializers.SerializerMethodField()
    costo_unitario_eur = serializers.SerializerMethodField()
    costo_total_eur = serializers.SerializerMethodField()
    tipo_cambio_usado = serializers.SerializerMethodField()
    unidad_medida_nombre = serializers.CharField(
        source="unidad_medida.nombre",
        read_only=True,
        default=None,
    )
    unidad_medida_simbolo = serializers.CharField(
        source="unidad_medida.simbolo",
        read_only=True,
        default="",
    )

    class Meta:
        model = CompraDetalle
        fields = [
            "id",
            "compra_id",
            "fecha",
            "item_nombre",
            "item_codigo",
            "item_volvo",
            "proveedor_nombre",
            "cantidad",
            "unidad_medida_nombre",
            "unidad_medida_simbolo",
            "valor_unitario",
            "valor_total",
            "costo_unitario",
            "costo_total",
            "costo_total_pen",
            "valor_unitario_usd",
            "valor_total_usd",
            "costo_unitario_usd",
            "costo_total_usd",
            "valor_unitario_eur",
            "valor_total_eur",
            "costo_unitario_eur",
            "costo_total_eur",
            "tipo_cambio_usado",
            "moneda",
            "tipo_comprobante",
            "codigo_comprobante",
        ]

    def _obtener_tipo_cambio(self, obj):
        return TipoCambioDiario.objects.filter(fecha=obj.compra.fecha).first()

    def _a_pen(self, monto, obj):
        if obj.moneda == Compra.Moneda.PEN:
            return monto.quantize(Decimal("0.01"))

        tipo_cambio = self._obtener_tipo_cambio(obj)
        if not tipo_cambio:
            return None

        if obj.moneda == Compra.Moneda.USD:
            if tipo_cambio.compra_usd <= 0:
                return None
            return (monto * tipo_cambio.compra_usd).quantize(Decimal("0.01"))

        if obj.moneda == Compra.Moneda.EUR:
            if tipo_cambio.compra_eur <= 0:
                return None
            return (monto * tipo_cambio.compra_eur).quantize(Decimal("0.01"))

        return None

    def _a_usd(self, monto, obj):
        if obj.moneda == Compra.Moneda.USD:
            return monto.quantize(Decimal("0.01"))

        tipo_cambio = self._obtener_tipo_cambio(obj)
        if not tipo_cambio:
            return None

        if obj.moneda == Compra.Moneda.PEN:
            if tipo_cambio.compra_usd <= 0:
                return None
            return (monto / tipo_cambio.compra_usd).quantize(Decimal("0.01"))

        if obj.moneda == Compra.Moneda.EUR:
            if tipo_cambio.compra_eur <= 0 or tipo_cambio.compra_usd <= 0:
                return None
            monto_pen = monto * tipo_cambio.compra_eur
            return (monto_pen / tipo_cambio.compra_usd).quantize(Decimal("0.01"))

        return None

    def _a_eur(self, monto, obj):
        if obj.moneda == Compra.Moneda.EUR:
            return monto.quantize(Decimal("0.01"))

        tipo_cambio = self._obtener_tipo_cambio(obj)
        if not tipo_cambio:
            return None

        if obj.moneda == Compra.Moneda.PEN:
            if tipo_cambio.compra_eur <= 0:
                return None
            return (monto / tipo_cambio.compra_eur).quantize(Decimal("0.01"))

        if obj.moneda == Compra.Moneda.USD:
            if tipo_cambio.compra_usd <= 0 or tipo_cambio.compra_eur <= 0:
                return None
            monto_pen = monto * tipo_cambio.compra_usd
            return (monto_pen / tipo_cambio.compra_eur).quantize(Decimal("0.01"))

        return None

    def get_valor_total(self, obj):
        return obj.valor_unitario * obj.cantidad

    def get_costo_unitario(self, obj):
        return obj.valor_unitario * Decimal("1.18")

    def get_costo_total(self, obj):
        return self.get_costo_unitario(obj) * obj.cantidad
    
    def get_costo_total_pen(self, obj):
        return self._a_pen(self.get_costo_total(obj), obj)

    def get_valor_unitario_usd(self, obj):
        return self._a_usd(obj.valor_unitario, obj)

    def get_valor_total_usd(self, obj):
        return self._a_usd(self.get_valor_total(obj), obj)

    def get_costo_unitario_usd(self, obj):
        return self._a_usd(self.get_costo_unitario(obj), obj)

    def get_costo_total_usd(self, obj):
        return self._a_usd(self.get_costo_total(obj), obj)

    def get_valor_unitario_eur(self, obj):
        return self._a_eur(obj.valor_unitario, obj)

    def get_valor_total_eur(self, obj):
        return self._a_eur(self.get_valor_total(obj), obj)

    def get_costo_unitario_eur(self, obj):
        return self._a_eur(self.get_costo_unitario(obj), obj)

    def get_costo_total_eur(self, obj):
        return self._a_eur(self.get_costo_total(obj), obj)

    def get_tipo_cambio_usado(self, obj):
        tipo_cambio = self._obtener_tipo_cambio(obj)
        if not tipo_cambio:
            return None
        return {
            "fecha": tipo_cambio.fecha,
            "compra_usd": tipo_cambio.compra_usd,
            "venta_usd": tipo_cambio.venta_usd,
            "compra_eur": tipo_cambio.compra_eur,
            "venta_eur": tipo_cambio.venta_eur,
        }


class TipoCambioDiarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoCambioDiario
        fields = ["id", "fecha", "compra_usd", "venta_usd", "compra_eur", "venta_eur"]


class AlmacenSerializer(serializers.ModelSerializer):

    class Meta:
        model = Almacen
        fields = ["id", "nombre"]

class TrabajadorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trabajador
        fields = [
            "id",
            "codigo",
            "nombres",
            "apellidos",
            "dni",
            "puesto",
        ]
        read_only_fields = ["codigo"]

class OrdenCompraDetalleSerializer(serializers.ModelSerializer):
    item_codigo = serializers.CharField(source="item.codigo", read_only=True)
    item_nombre = serializers.CharField(source="item.nombre", read_only=True)
    proveedor_nombre = serializers.CharField(source="proveedor.nombre", read_only=True, default=None)

    class Meta:
        model = OrdenCompraDetalle
        fields = ["id", "item", "item_codigo", "item_nombre", "cantidad", "proveedor", "proveedor_nombre"]


class OrdenCompraSerializer(serializers.ModelSerializer):
    items = OrdenCompraDetalleSerializer(source="detalles", many=True)
    emitido_por_nombre = serializers.SerializerMethodField()
    pendiente_confirmacion_almacen = serializers.SerializerMethodField()
    puede_cambiar_estado = serializers.SerializerMethodField()
    puede_confirmar_recepcion = serializers.SerializerMethodField()

    class Meta:
        model = OrdenCompra
        fields = [
            "id",
            "codigo",
            "estado",
            "observaciones",
            "created_at",
            "recepcion_confirmada",
            "fecha_confirmacion_recepcion",
            "emitido_por",
            "emitido_por_nombre",
            "confirmado_por",
            "items",
            "pendiente_confirmacion_almacen",
            "puede_cambiar_estado",
            "puede_confirmar_recepcion",
        ]
        read_only_fields = [
            "codigo",
            "estado",
            "created_at",
            "recepcion_confirmada",
            "fecha_confirmacion_recepcion",
            "emitido_por",
            "confirmado_por",
            "emitido_por_nombre",
            "pendiente_confirmacion_almacen",
            "puede_cambiar_estado",
            "puede_confirmar_recepcion",
        ]

    def get_emitido_por_nombre(self, obj):
        if not obj.emitido_por:
            return "Sistema"
        return obj.emitido_por.get_full_name() or obj.emitido_por.username

    def get_pendiente_confirmacion_almacen(self, obj):
        return obj.estado == OrdenCompra.Estado.RECIBIDO and not obj.recepcion_confirmada

    def get_puede_cambiar_estado(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return is_compras_user(user) and obj.estado != OrdenCompra.Estado.RECIBIDO

    def get_puede_confirmar_recepcion(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return is_storage_user(user) and obj.estado == OrdenCompra.Estado.RECIBIDO and not obj.recepcion_confirmada

    def create(self, validated_data):
        items_data = validated_data.pop("detalles", [])
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data.setdefault("emitido_por", request.user)

        with transaction.atomic():
            orden = OrdenCompra.objects.create(**validated_data)
            for item_data in items_data:
                OrdenCompraDetalle.objects.create(orden_compra=orden, **item_data)
        return orden


class OrdenRequerimientoDetalleSerializer(serializers.ModelSerializer):
    item_codigo = serializers.CharField(source="item.codigo", read_only=True)
    item_nombre = serializers.CharField(source="item.nombre", read_only=True)
    proveedor_nombre = serializers.CharField(source="proveedor.nombre", read_only=True, default=None)

    class Meta:
        model = OrdenRequerimientoDetalle
        fields = ["id", "item", "item_codigo", "item_nombre", "cantidad", "proveedor", "proveedor_nombre"]


class OrdenRequerimientoSerializer(serializers.ModelSerializer):
    items = OrdenRequerimientoDetalleSerializer(source="detalles", many=True)
    trabajo_codigo = serializers.CharField(source="trabajo.codigo_orden", read_only=True)
    tecnico_asignado_nombre = serializers.SerializerMethodField()
    pendiente_confirmacion_tecnico = serializers.SerializerMethodField()
    puede_cambiar_estado = serializers.SerializerMethodField()
    puede_marcar_entregado = serializers.SerializerMethodField()
    puede_marcar_sin_stock = serializers.SerializerMethodField()
    puede_confirmar_tecnico = serializers.SerializerMethodField()
    puede_asignar_tecnico = serializers.SerializerMethodField()

    class Meta:
        model = OrdenRequerimiento
        fields = [
            "id",
            "codigo",
            "trabajo",
            "trabajo_codigo",
            "estado",
            "tecnico_asignado",
            "tecnico_asignado_nombre",
            "observaciones",
            "created_at",
            "recepcion_confirmada_tecnico",
            "fecha_confirmacion_tecnico",
            "emitido_por",
            "items",
            "pendiente_confirmacion_tecnico",
            "puede_cambiar_estado",
            "puede_marcar_entregado",
            "puede_marcar_sin_stock",
            "puede_confirmar_tecnico",
            "puede_asignar_tecnico",
        ]
        read_only_fields = [
            "codigo",
            "created_at",
            "recepcion_confirmada_tecnico",
            "fecha_confirmacion_tecnico",
            "emitido_por",
            "trabajo_codigo",
            "tecnico_asignado_nombre",
            "pendiente_confirmacion_tecnico",
            "puede_cambiar_estado",
            "puede_marcar_entregado",
            "puede_marcar_sin_stock",
            "puede_confirmar_tecnico",
            "puede_asignar_tecnico",
        ]

    def get_tecnico_asignado_nombre(self, obj):
        if not obj.tecnico_asignado:
            return None
        return f"{obj.tecnico_asignado.nombres} {obj.tecnico_asignado.apellidos}".strip()

    def get_pendiente_confirmacion_tecnico(self, obj):
        return obj.estado == OrdenRequerimiento.Estado.ENTREGADO and not obj.recepcion_confirmada_tecnico

    def get_puede_cambiar_estado(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return is_storage_user(user) and obj.estado != OrdenRequerimiento.Estado.ENTREGADO

    def get_puede_marcar_entregado(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if (
            not user
            or not user.is_authenticated
            or obj.estado == OrdenRequerimiento.Estado.ENTREGADO
            or not obj.tecnico_asignado_id
        ):
            return False

        if is_storage_user(user):
            return True

        trabajador = obtener_trabajador_request(request) if request else None
        return bool(
            trabajador
            and obj.tecnico_asignado_id
            and trabajador.id == obj.tecnico_asignado_id
        )

    def get_puede_marcar_sin_stock(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return is_storage_user(user) and obj.estado != OrdenRequerimiento.Estado.ENTREGADO

    def get_puede_confirmar_tecnico(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        trabajador = obtener_trabajador_request(request) if request else None
        return bool(
            trabajador
            and obj.tecnico_asignado_id
            and trabajador.id == obj.tecnico_asignado_id
            and obj.estado == OrdenRequerimiento.Estado.ENTREGADO
            and not obj.recepcion_confirmada_tecnico
        )

    def get_puede_asignar_tecnico(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return is_storage_user(user) and obj.estado != OrdenRequerimiento.Estado.ENTREGADO

    def create(self, validated_data):
        items_data = validated_data.pop("detalles", [])
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data.setdefault("emitido_por", request.user)

        with transaction.atomic():
            orden = OrdenRequerimiento.objects.create(**validated_data)
            for item_data in items_data:
                OrdenRequerimientoDetalle.objects.create(orden_requerimiento=orden, **item_data)
        return orden

class MeSerializer(serializers.ModelSerializer):
    trabajador = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "is_active",
            "is_staff",
            "roles",
            "trabajador",
        ]
    def get_roles(self, obj):
        roles = [group.name for group in obj.groups.all()]

        if obj.is_staff:
            roles.append("admin")

        return roles

    def get_trabajador(self, obj):
        if hasattr(obj, "perfil"):
            trabajador = obj.perfil.trabajador
            return {
                "id": trabajador.id,
                "codigo": trabajador.codigo,
                "nombres": trabajador.nombres,
                "apellidos": trabajador.apellidos,
                "puesto": trabajador.puesto,
            }
        return None


class MovimientoRepuestoSerializer(serializers.ModelSerializer):
    item_id = serializers.IntegerField(
        source="item_unidad.item.id", read_only=True
    )
    item_codigo = serializers.CharField(
        source="item_unidad.item.codigo", read_only=True
    )
    item_nombre = serializers.CharField(
        source="item_unidad.item.nombre", read_only=True
    )
    unidad_serie = serializers.CharField(
        source="item_unidad.serie", read_only=True
    )
    estado = serializers.CharField(
        source="item_unidad.estado", read_only=True
    )
    estado_previo = serializers.SerializerMethodField()
    tecnico = serializers.PrimaryKeyRelatedField(
        queryset=Trabajador.objects.all(),
        required=False,
        allow_null=True,
    )
    tecnico_id = serializers.SerializerMethodField()
    tecnico_nombre = serializers.SerializerMethodField()

    class Meta:
        model = MovimientoRepuesto
        fields = [
            "id",
            "actividad",
            "item_unidad",

            "item_id",
            "item_codigo",
            "item_nombre",
            "unidad_serie",
            "estado",
            "estado_previo",
            "tecnico",
            "tecnico_id",
            "tecnico_nombre",
        ]

    def get_estado_previo(self, obj):
        historial_previo = (
            HistorialUbicacionItem.objects
            .filter(item_unidad=obj.item_unidad, fecha_inicio__lt=obj.fecha)
            .exclude(orden_trabajo_id=obj.actividad.orden_id)
            .order_by("-fecha_inicio")
            .first()
        )
        if historial_previo:
            return historial_previo.estado

        historial_cercano = (
            HistorialUbicacionItem.objects
            .filter(item_unidad=obj.item_unidad, fecha_inicio__lt=obj.fecha)
            .order_by("-fecha_inicio")
            .first()
        )
        if historial_cercano:
            return historial_cercano.estado
        
        return obj.item_unidad.estado
    
    def get_tecnico_id(self, obj):
        if obj.tecnico_id:
            return obj.tecnico_id
        historial = (
            HistorialUbicacionItem.objects
            .filter(item_unidad=obj.item_unidad, trabajador__isnull=False)
            .order_by("-fecha_inicio")
            .first()
        )
        return historial.trabajador_id if historial else None

    def get_tecnico_nombre(self, obj):
        if obj.tecnico:
            return f"{obj.tecnico.nombres} {obj.tecnico.apellidos}".strip()
        historial = (
            HistorialUbicacionItem.objects
            .select_related("trabajador")
            .filter(item_unidad=obj.item_unidad, trabajador__isnull=False)
            .order_by("-fecha_inicio")
            .first()
        )
        if not historial or not historial.trabajador:
            return ""
        return f"{historial.trabajador.nombres} {historial.trabajador.apellidos}".strip()
    def validate(self, data):
        unidad = data["item_unidad"]
        actividad = data["actividad"]
        request = self.context.get("request")
        if actividad.es_planificada and not can_manage_planned_activities(getattr(request, "user", None)):
            raise serializers.ValidationError(
                "Solo Jefe de Tecnicos, Jefe de Almaceneros o admin pueden registrar materiales en actividades planificadas"
            )

        if actividad.orden.estatus == OrdenTrabajo.Estatus.FINALIZADO:
            raise serializers.ValidationError(
                "No se pueden agregar repuestos a una orden finalizada"
            )

        if unidad.estado not in [
            ItemUnidad.Estado.NUEVO,
            ItemUnidad.Estado.USADO,
            ItemUnidad.Estado.REPARADO,
        ]:
            raise serializers.ValidationError(
                "Solo se pueden asignar unidades NUEVAS, USADAS o REPARADAS"
            )

        if unidad.item.tipo_insumo != Item.TipoInsumo.REPUESTO:
            raise serializers.ValidationError(
                "Solo se pueden asignar unidades de items REPUESTO"
            )
        
        tecnico = data.get("tecnico")
        if actividad.es_planificada and not tecnico:
            raise serializers.ValidationError("Debe seleccionar un técnico asignado")
        if tecnico and not actividad.orden.tecnicos.filter(id=tecnico.id).exists():
            raise serializers.ValidationError(
                "El técnico seleccionado no está asignado a esta orden"
            )

        return data

    def create(self, validated_data):
        actividad = validated_data["actividad"]
        unidad_nueva = validated_data["item_unidad"]
        tecnico = validated_data.get("tecnico")
        maquinaria = actividad.orden.maquinaria
        item = unidad_nueva.item

        with transaction.atomic():

            if actividad.es_planificada:
                # Las actividades planificadas solo reservan una referencia de trabajo;
                # no deben mover stock ni generar historial real de ubicacion.
                return super().create(validated_data)

            unidades_planificadas = list(
                MovimientoRepuesto.objects
                .filter(
                    actividad__orden=actividad.orden,
                    actividad__es_planificada=True,
                    item_unidad__item=item,
                )
                .order_by("fecha", "id")
                .values_list("item_unidad_id", flat=True)
            )

            if unidades_planificadas:
                unidades_registradas = set(
                    MovimientoRepuesto.objects
                    .filter(
                        actividad__orden=actividad.orden,
                        actividad__es_planificada=False,
                        item_unidad__item=item,
                    )
                    .values_list("item_unidad_id", flat=True)
                )

                unidades_planificadas_ordenadas = []
                vistos = set()
                for unidad_id in unidades_planificadas:
                    if unidad_id in vistos:
                        continue
                    vistos.add(unidad_id)
                    unidades_planificadas_ordenadas.append(unidad_id)

                unidad_disponible_id = next(
                    (
                        unidad_id
                        for unidad_id in unidades_planificadas_ordenadas
                        if unidad_id not in unidades_registradas
                    ),
                    None,
                )

                if unidad_disponible_id:
                    unidad_nueva = ItemUnidad.objects.select_related("item").get(
                        id=unidad_disponible_id
                    )
                    validated_data["item_unidad"] = unidad_nueva
                    item = unidad_nueva.item

            if not tecnico:
                unidades_en_actividad = (
                    MovimientoRepuesto.objects
                    .filter(actividad=actividad)
                    .values_list("item_unidad_id", flat=True)
                )

                historial_previo = (
                    HistorialUbicacionItem.objects
                    .select_related("item_unidad")
                    .filter(
                        maquinaria=maquinaria,
                        fecha_fin__isnull=True,
                        item_unidad__item=item,
                    )
                    .exclude(item_unidad=unidad_nueva)
                    .exclude(item_unidad_id__in=unidades_en_actividad)
                    .order_by("fecha_inicio", "id")
                    .first()
                )

                if historial_previo:
                    tecnico_resguardo = (
                        actividad.orden.tecnicos
                        .order_by("id")
                        .first()
                    )
                    if not tecnico_resguardo:
                        raise serializers.ValidationError(
                            "La orden debe tener al menos un técnico asignado para reasignar unidades previas"
                        )

                    unidad_anterior = historial_previo.item_unidad
                    if unidad_anterior.estado != ItemUnidad.Estado.INOPERATIVO:
                        unidad_anterior.estado = ItemUnidad.Estado.INOPERATIVO
                        unidad_anterior.save(update_fields=["estado"])

                    HistorialUbicacionItem.objects.create(
                        item_unidad=unidad_anterior,
                        orden_trabajo=actividad.orden,
                        trabajador=tecnico_resguardo,
                        estado=ItemUnidad.Estado.INOPERATIVO,
                    )

            # ✅ 3️⃣ En actividades registradas la unidad pasa a estado USADO
            if unidad_nueva.estado != ItemUnidad.Estado.USADO:
                unidad_nueva.estado = ItemUnidad.Estado.USADO
                unidad_nueva.save(update_fields=["estado"])

            # En actividades registradas el repuesto queda aplicado a la maquinaria
            # de la OT, aunque el movimiento conserve el tecnico para trazabilidad.
            HistorialUbicacionItem.objects.create(
                item_unidad=unidad_nueva,
                orden_trabajo=actividad.orden,
                estado=ItemUnidad.Estado.USADO,
                maquinaria=maquinaria,
            )

            # 📦 4️⃣ Registrar movimiento
            movimiento = super().create(validated_data)
            actualizar_stock_item(item)
            OrdenTrabajoSerializer.sincronizar_horometros_relacionados(actividad.orden)

        return movimiento

class MovimientoConsumibleSerializer(serializers.ModelSerializer):
    item_id = serializers.IntegerField(source="item.id", read_only=True)
    item_codigo = serializers.CharField(source="item.codigo", read_only=True)
    item_nombre = serializers.CharField(source="item.nombre", read_only=True)
    unidad_medida = serializers.PrimaryKeyRelatedField(
        queryset=UnidadMedida.objects.all(),
        required=False,
        allow_null=True,
    )
    unidad_medida_detalle = serializers.CharField(
        source="unidad_medida.nombre",
        read_only=True,
    )
    unidad_medida_simbolo = serializers.CharField(
        source="unidad_medida.simbolo",
        read_only=True,
    )
    proveedor = serializers.PrimaryKeyRelatedField(
        queryset=Proveedor.objects.all(),
        required=False,
        allow_null=True,
        write_only=True,
    )
    tecnico = serializers.PrimaryKeyRelatedField(
        queryset=Trabajador.objects.all(),
        required=False,
        allow_null=True,
    )
    tecnico_nombre = serializers.SerializerMethodField()

    class Meta:
        model = MovimientoConsumible
        fields = [
            "id",
            "actividad",
            "item",
            "cantidad",
            "unidad_medida",
            "unidad_medida_detalle",
            "unidad_medida_simbolo",
            "fecha",
            "item_id",
            "item_codigo",
            "item_nombre",
            "proveedor",
            "tecnico",
            "tecnico_nombre",
        ]
        read_only_fields = ["fecha"]
    
    def get_tecnico_nombre(self, obj):
        if obj.tecnico:
            return f"{obj.tecnico.nombres} {obj.tecnico.apellidos}".strip()

        historial = (
            HistorialConsumible.objects
            .select_related("trabajador")
            .filter(
                item=obj.item,
                orden_trabajo=obj.actividad.orden,
                trabajador__isnull=False,
            )
            .order_by("-fecha_inicio")
            .first()
        )
        if not historial or not historial.trabajador:
            return ""
        return f"{historial.trabajador.nombres} {historial.trabajador.apellidos}".strip()

    @staticmethod
    def _cantidad_en_unidad_item(item, cantidad, unidad_origen):
        if unidad_origen.id == item.unidad_medida_id:
            return Decimal(cantidad)
        factor = obtener_factor_entre_unidades(unidad_origen, item.unidad_medida)
        return Decimal(cantidad) * factor

    def validate(self, data):
        actividad = data["actividad"]
        item = data["item"]
        request = self.context.get("request")
        if actividad.es_planificada and not can_manage_planned_activities(getattr(request, "user", None)):
            raise serializers.ValidationError(
                "Solo Jefe de Tecnicos, Jefe de Almaceneros o admin pueden registrar materiales en actividades planificadas"
            )

        if actividad.orden.estatus == OrdenTrabajo.Estatus.FINALIZADO:
            raise serializers.ValidationError(
                "No se pueden agregar consumibles a una orden finalizada"
            )

        if item.tipo_insumo != Item.TipoInsumo.CONSUMIBLE:
            raise serializers.ValidationError(
                "Solo se pueden registrar items CONSUMIBLE"
            )

        cantidad = data.get("cantidad", 0)
        if cantidad <= 0:
            raise serializers.ValidationError(
                "La cantidad debe ser mayor a 0"
            )

        unidad_medida = data.get("unidad_medida") or item.unidad_medida
        if not unidad_medida:
            raise serializers.ValidationError(
                "El item no tiene unidad de medida configurada"
            )
        if not item.dimension:
            raise serializers.ValidationError(
                "El item no tiene dimensión configurada"
            )
        if unidad_medida.dimension_id != item.dimension_id:
            raise serializers.ValidationError(
                "La unidad de medida no coincide con la dimensión del item"
            )
        data["unidad_medida"] = unidad_medida

        proveedor = data.get("proveedor")
        tecnico = data.get("tecnico")
        if actividad.es_planificada and not tecnico:
            raise serializers.ValidationError("Debe seleccionar un técnico asignado")
        if tecnico and not actividad.orden.tecnicos.filter(id=tecnico.id).exists():
            raise serializers.ValidationError(
                "El técnico seleccionado no está asignado a esta orden"
            )

        tecnico_contexto = obtener_tecnico_contexto_actividad(
            actividad,
            request=request,
            tecnico=tecnico,
        )

        if not actividad.es_planificada and not tecnico_contexto:
            raise serializers.ValidationError(
                "La orden debe tener un técnico asignado para registrar consumibles."
            )

        if tecnico_contexto:
            historiales_tecnico = HistorialConsumible.objects.filter(
                item=item,
                trabajador=tecnico_contexto,
                fecha_fin__isnull=True,
                cantidad__gt=0,
            )
            if proveedor:
                historiales_tecnico = historiales_tecnico.filter(
                    lote__compra_detalle__compra__proveedor=proveedor
                )

            stock_base = (
                historiales_tecnico.aggregate(total=Sum("cantidad")).get("total")
                or Decimal("0")
            )

            if actividad.es_planificada:
                movimientos_planificados = (
                    MovimientoConsumible.objects
                    .select_related("unidad_medida")
                    .filter(
                        actividad__orden=actividad.orden,
                        actividad__es_planificada=True,
                        item=item,
                        tecnico=tecnico_contexto,
                    )
                )
                for movimiento in movimientos_planificados:
                    unidad_movimiento = movimiento.unidad_medida or item.unidad_medida
                    stock_base -= self._cantidad_en_unidad_item(
                        item,
                        movimiento.cantidad,
                        unidad_movimiento,
                    )
                stock_base = max(Decimal(stock_base), Decimal("0"))
        else:
            lotes = LoteConsumible.objects.filter(item=item, cantidad_disponible__gt=0)
            if proveedor:
                lotes = lotes.filter(compra_detalle__compra__proveedor=proveedor)
            stock_base = lotes.aggregate(total=Sum("cantidad_disponible")).get("total") or Decimal("0")

        stock_actual = Decimal(stock_base)
        if unidad_medida.id != item.unidad_medida_id:
            factor = obtener_factor_entre_unidades(item.unidad_medida, unidad_medida)
            stock_actual = Decimal(stock_actual) * factor

        if Decimal(cantidad) > Decimal(stock_actual):
            raise serializers.ValidationError(
                "La cantidad excede el stock disponible en la unidad seleccionada"
            )

        return data
    
    def create(self, validated_data):
        with transaction.atomic():
            item = validated_data["item"]
            actividad = validated_data["actividad"]
            proveedor = validated_data.pop("proveedor", None)
            tecnico = validated_data.pop("tecnico", None)
            request = self.context.get("request")
            tecnico_contexto = obtener_tecnico_contexto_actividad(
                actividad,
                request=request,
                tecnico=tecnico,
            )

            if tecnico is not None:
                validated_data["tecnico"] = tecnico

            if actividad.es_planificada:
                return super().create(validated_data)

            if not tecnico_contexto:
                raise serializers.ValidationError(
                    "La orden debe tener un técnico asignado para registrar consumibles."
                )

            validated_data["tecnico"] = tecnico_contexto

            unidad_mov = validated_data.get("unidad_medida") or item.unidad_medida
            cantidad_requerida = self._cantidad_en_unidad_item(
                item,
                validated_data["cantidad"],
                unidad_mov,
            )

            historiales_qs = (
                HistorialConsumible.objects
                .select_for_update()
                .filter(
                    item=item,
                    trabajador=tecnico_contexto,
                    fecha_fin__isnull=True,
                    cantidad__gt=0,
                )
                .order_by("fecha_inicio", "id")
            )
            if proveedor:
                historiales_qs = historiales_qs.filter(
                    lote__compra_detalle__compra__proveedor=proveedor
                )

            historiales_asignados = list(historiales_qs)
            disponible_total = sum(Decimal(historial.cantidad) for historial in historiales_asignados)
            if disponible_total < Decimal(cantidad_requerida):
                raise serializers.ValidationError(
                    "No hay suficiente cantidad asignada al técnico para registrar este consumible."
                )

            now = timezone.now()
            restante_asignado = Decimal(cantidad_requerida)

            for historial in historiales_asignados:
                if restante_asignado <= 0:
                    break

                cantidad_historial = Decimal(historial.cantidad)
                consumido = min(cantidad_historial, restante_asignado)

                historial.cerrar(fecha=now, cantidad=consumido)

                sobrante = cantidad_historial - consumido
                if sobrante > 0:
                    historial_restante = HistorialConsumible.objects.create(
                        lote=historial.lote,
                        item=historial.item,
                        cantidad=sobrante,
                        unidad_medida=historial.unidad_medida,
                        trabajador=historial.trabajador,
                        maquinaria=historial.maquinaria,
                        almacen=historial.almacen,
                        orden_trabajo=historial.orden_trabajo,
                        horometro_inicio=historial.horometro_inicio,
                    )
                    HistorialConsumible.objects.filter(pk=historial_restante.pk).update(
                        fecha_inicio=historial.fecha_inicio,
                        fecha_fin=None,
                    )

                HistorialConsumible.objects.create(
                    lote=historial.lote,
                    item=historial.item,
                    cantidad=consumido,
                    unidad_medida=historial.unidad_medida,
                    maquinaria=actividad.orden.maquinaria,
                    orden_trabajo=actividad.orden,
                    horometro_inicio=actividad.orden.horometro,
                )

                restante_asignado -= consumido

            movimiento = super().create(validated_data)
            actualizar_stock_item(item)
            OrdenTrabajoSerializer.sincronizar_horometros_relacionados(actividad.orden)
            return movimiento
        
    @staticmethod
    def _descontar_historial_almacen(item, lote, cantidad):
        restante = Decimal(cantidad)
        now = timezone.now()

        while restante > 0:
            historial_almacen = (
                HistorialConsumible.objects
                .select_for_update()
                .filter(
                    item=item,
                    lote=lote,
                    almacen__isnull=False,
                    fecha_fin__isnull=True,
                )
                .order_by("fecha_inicio", "id")
                .first()
            )

            if not historial_almacen:
                raise serializers.ValidationError(
                    "No existe historial activo en almacén para asignar este consumible"
                )

            cantidad_historial = Decimal(historial_almacen.cantidad)
            descontar = min(cantidad_historial, restante)

            historial_almacen.fecha_fin = now
            historial_almacen.cantidad = descontar
            historial_almacen.save(update_fields=["fecha_fin", "cantidad"])

            sobrante = cantidad_historial - descontar
            if sobrante > 0:
                historial_restante = HistorialConsumible.objects.create(
                    lote=historial_almacen.lote,
                    item=historial_almacen.item,
                    cantidad=sobrante,
                    unidad_medida=historial_almacen.unidad_medida,
                    almacen=historial_almacen.almacen,
                    orden_trabajo=historial_almacen.orden_trabajo,
                )
                HistorialConsumible.objects.filter(pk=historial_restante.pk).update(
                    fecha_inicio=historial_almacen.fecha_inicio,
                    fecha_fin=None,
                )

            restante -= descontar


class ActividadTrabajoEvidenciaSerializer(serializers.ModelSerializer):
    url = serializers.ImageField(source="imagen", read_only=True)
    nombre = serializers.SerializerMethodField()

    class Meta:
        model = ActividadTrabajoEvidencia
        fields = ["id", "url", "nombre", "created_at"]
        read_only_fields = fields

    def get_nombre(self, obj):
        return obj.imagen.name.split("/")[-1]

class ActividadTrabajoSerializer(serializers.ModelSerializer):
    evidencias = ActividadTrabajoEvidenciaSerializer(many=True, read_only=True)
    repuestos = MovimientoRepuestoSerializer(many=True, read_only=True)
    consumibles = MovimientoConsumibleSerializer(many=True, read_only=True)

    class Meta:
        model = ActividadTrabajo
        fields = "__all__"

    def validate(self, data):
        instance = getattr(self, "instance", None)
        tipo = data.get("tipo_actividad", getattr(instance, "tipo_actividad", None))
        tipo_mantenimiento = data.get(
            "tipo_mantenimiento",
            getattr(instance, "tipo_mantenimiento", None),
        )
        subtipo = data.get("subtipo", getattr(instance, "subtipo", None))

        if tipo == ActividadTrabajo.TipoActividad.REVISION:
            data["tipo_mantenimiento"] = None
            data["subtipo"] = None

        elif tipo == ActividadTrabajo.TipoActividad.MANTENIMIENTO:
            if not tipo_mantenimiento or not subtipo:
                raise serializers.ValidationError(
                    "El mantenimiento requiere tipo y subtipo"
                )

            subtipos_validos = ActividadTrabajo.get_subtipos_validos(tipo_mantenimiento)
            if subtipo not in subtipos_validos:
                raise serializers.ValidationError(
                    "El subtipo no es valido para el tipo de mantenimiento seleccionado"
                )

        return data
    
class OrdenTrabajoSerializer(serializers.ModelSerializer):
    actividades = ActividadTrabajoSerializer(many=True, read_only=True)

    tecnicos = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Trabajador.objects.all(),
        required=False
    )

    class Meta:
        model = OrdenTrabajo
        fields = "__all__"
        read_only_fields = ["codigo_orden"]

    @staticmethod
    def _get_items_repuestos_registrados(orden):
        return (
            MovimientoRepuesto.objects
            .filter(
                actividad__orden=orden,
                actividad__es_planificada=False,
            )
            .values_list("item_unidad__item_id", flat=True)
            .distinct()
        )

    @staticmethod
    def _get_items_consumibles_registrados(orden):
        return (
            MovimientoConsumible.objects
            .filter(
                actividad__orden=orden,
                actividad__es_planificada=False,
            )
            .values_list("item_id", flat=True)
            .distinct()
        )

    @classmethod
    def sincronizar_horometros_relacionados(cls, orden):
        serializer = cls()
        serializer._autocompletar_horometro_inicio_historiales(orden)
        serializer._autocompletar_horometro_fin_historiales_previos(orden)
        serializer._autocompletar_horometro_fin_consumibles_previos(orden)

    def _autocompletar_horometro_inicio_historiales(self, orden):
        if orden.horometro is None:
            return

        HistorialUbicacionItem.objects.filter(
            orden_trabajo=orden,
            maquinaria__isnull=False,
            horometro_inicio__isnull=True,
        ).update(horometro_inicio=orden.horometro)

        item_ids = self._get_items_consumibles_registrados(orden)
        HistorialConsumible.objects.filter(
            orden_trabajo=orden,
            item_id__in=item_ids,
            maquinaria=orden.maquinaria,
            trabajador__isnull=True,
            almacen__isnull=True,
            horometro_inicio__isnull=True,
        ).update(horometro_inicio=orden.horometro)

    def _autocompletar_horometro_fin_historiales_previos(self, orden):
        if orden.horometro is None or not orden.maquinaria_id:
            return

        item_ids = self._get_items_repuestos_registrados(orden)

        for item_id in item_ids:
            historial_previo = (
                HistorialUbicacionItem.objects
                .filter(
                    item_unidad__item_id=item_id,
                    orden_trabajo__isnull=False,
                    maquinaria=orden.maquinaria,
                    trabajador__isnull=True,
                    almacen__isnull=True,
                    estado=ItemUnidad.Estado.USADO,
                    horometro_inicio__isnull=False,
                    horometro_fin__isnull=True,
                )
                .exclude(
                    Q(orden_trabajo=orden)
                )
                .filter(
                    Q(orden_trabajo__fecha__lt=orden.fecha)
                    | Q(
                        orden_trabajo__fecha=orden.fecha,
                        orden_trabajo_id__lt=orden.id,
                    )
                )
                .order_by("-orden_trabajo__fecha", "-orden_trabajo_id", "-id")
                .first()
            )

            if not historial_previo or not historial_previo.orden_trabajo_id:
                continue

            HistorialUbicacionItem.objects.filter(
                item_unidad__item_id=item_id,
                orden_trabajo_id=historial_previo.orden_trabajo_id,
                maquinaria=orden.maquinaria,
                trabajador__isnull=True,
                almacen__isnull=True,
                estado=ItemUnidad.Estado.USADO,
                horometro_fin__isnull=True,
            ).update(horometro_fin=orden.horometro)

    def _autocompletar_horometro_fin_consumibles_previos(self, orden):
        if orden.horometro is None or not orden.maquinaria_id:
            return

        item_ids = self._get_items_consumibles_registrados(orden)

        for item_id in item_ids:
            historial_previo = (
                HistorialConsumible.objects
                .filter(
                    item_id=item_id,
                    orden_trabajo__isnull=False,
                    maquinaria=orden.maquinaria,
                    trabajador__isnull=True,
                    almacen__isnull=True,
                    horometro_inicio__isnull=False,
                    horometro_fin__isnull=True,
                )
                .exclude(
                    Q(orden_trabajo=orden)
                )
                .filter(
                    Q(orden_trabajo__fecha__lt=orden.fecha)
                    | Q(
                        orden_trabajo__fecha=orden.fecha,
                        orden_trabajo_id__lt=orden.id,
                    )
                )
                .order_by("-orden_trabajo__fecha", "-orden_trabajo_id", "-id")
                .first()
            )

            if not historial_previo or not historial_previo.orden_trabajo_id:
                continue

            HistorialConsumible.objects.filter(
                item_id=item_id,
                orden_trabajo_id=historial_previo.orden_trabajo_id,
                maquinaria=orden.maquinaria,
                trabajador__isnull=True,
                almacen__isnull=True,
                horometro_fin__isnull=True,
            ).update(horometro_fin=orden.horometro)
    
    def update(self, instance, validated_data):
        tecnicos = validated_data.pop("tecnicos", None)

        # 🔹 1️⃣ Guardar estatus anterior
        estatus_anterior = instance.estatus

        instance = super().update(instance, validated_data)

        if tecnicos is not None:
            instance.tecnicos.set(tecnicos)

        self.sincronizar_horometros_relacionados(instance)

        # 🔹 2️⃣ Detectar transición a FINALIZADO
        if (
            estatus_anterior != OrdenTrabajo.Estatus.FINALIZADO
            and instance.estatus == OrdenTrabajo.Estatus.FINALIZADO
        ):
            instance._finalizada = True  # bandera interna (no se guarda en DB)

        return instance
    
    def validate(self, data):
        lugar = data.get("lugar", self.instance.lugar if self.instance else None)
        ubicacion_detalle = data.get(
            "ubicacion_detalle",
            self.instance.ubicacion_detalle if self.instance else "",
        )
        estatus = data.get("estatus", self.instance.estatus if self.instance else "PENDIENTE")

        if lugar == OrdenTrabajo.Lugar.TALLER:
            data["ubicacion_detalle"] = ""
        elif lugar == OrdenTrabajo.Lugar.CAMPO and not str(ubicacion_detalle or "").strip():
            raise serializers.ValidationError(
                {"ubicacion_detalle": "Campo obligatorio cuando el trabajo se realiza en campo."}
            )

        if estatus == "FINALIZADO":
            required = [
                "hora_inicio",
                "hora_fin",
                "horometro",
                "estado_equipo",
            ]

            for field in required:
                if not data.get(field):
                    raise serializers.ValidationError(
                        {field: "Campo obligatorio para finalizar la orden"}
                    )

        return data

class MaquinariaDetalleSerializer(MaquinariaSerializer):
    ordenes = serializers.SerializerMethodField()
    repuestos = serializers.SerializerMethodField()
    consumibles = serializers.SerializerMethodField()

    class Meta(MaquinariaSerializer.Meta):
        fields = MaquinariaSerializer.Meta.fields + [
            "ordenes",
            "repuestos",
            "consumibles",
        ]

    def get_ordenes(self, obj):
        ordenes = OrdenTrabajo.objects.filter(maquinaria=obj)
        return OrdenTrabajoSerializer(ordenes, many=True).data

    def get_repuestos(self, obj):
        movimientos = MovimientoRepuesto.objects.filter(
            actividad__orden__maquinaria=obj,
            actividad__es_planificada=False,
        ).select_related("item_unidad__item")

        return [
            {
                "item": m.item_unidad.item.nombre,
                "codigo": m.item_unidad.item.codigo,
                "serie": m.item_unidad.serie,
                "estado": m.item_unidad.estado,
                "fecha": m.fecha,
            }
            for m in movimientos
        ]
    
    def get_consumibles(self, obj):
        movimientos = MovimientoConsumible.objects.filter(
            actividad__orden__maquinaria=obj,
            actividad__es_planificada=False,
        ).select_related("item")

        return [
            {
                "item": m.item.nombre,
                "codigo": m.item.codigo,
                "cantidad": m.cantidad,
                "fecha": m.fecha,
            }
            for m in movimientos
        ]

class TrabajadorConCodigoSerializer(serializers.ModelSerializer):
    codigo_registro = serializers.SerializerMethodField()

    class Meta:
        model = Trabajador
        fields = [
            "id",
            "codigo",
            "nombres",
            "apellidos",
            "dni",
            "puesto",
            "codigo_registro",
        ]

    def get_codigo_registro(self, obj):
        if hasattr(obj, "codigo_registro"):
            return obj.codigo_registro.codigo
        return None

class RegistroUsuarioSerializer(serializers.Serializer):
    codigo = serializers.UUIDField()
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    email = serializers.EmailField(required=False)

    def validate_codigo(self, value):
        try:
            codigo = CodigoRegistro.objects.select_related("trabajador").get(codigo=value)
        except CodigoRegistro.DoesNotExist:
            raise serializers.ValidationError("Código inválido")

        if not codigo.es_valido():
            raise serializers.ValidationError("Código expirado o ya usado")

        return codigo
    

    def create(self, validated_data):
        codigo = validated_data["codigo"]
        username = validated_data["username"]
        password = validated_data["password"]
        email = validated_data.get("email", "")

        user = User.objects.create_user(
            username=username,
            password=password,
            email=email,
        )

        PerfilUsuario.objects.create(
            user=user,
            trabajador=codigo.trabajador
        )

        codigo.usado = True
        codigo.save(update_fields=["usado"])
        codigo.delete()

        return user

class TrabajadorAdminSerializer(serializers.ModelSerializer):
    codigo_registro = serializers.SerializerMethodField()
    tiene_usuario = serializers.SerializerMethodField()

    class Meta:
        model = Trabajador
        fields = [
            "id",
            "codigo",
            "nombres",
            "apellidos",
            "dni",
            "puesto",
            "codigo_registro",
            "tiene_usuario",
        ]

    def get_codigo_registro(self, obj):
        if hasattr(obj, "codigo_registro"):
            return str(obj.codigo_registro.codigo)
        return None

    def get_tiene_usuario(self, obj):
        return PerfilUsuario.objects.filter(trabajador=obj).exists()


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ["id", "name"]


def serializar_ubicacion_item_unidad_actual(unidad):
    historial_activo = (
        unidad.historial
        .select_related("almacen", "maquinaria", "trabajador")
        .filter(fecha_fin__isnull=True)
        .order_by("-fecha_inicio", "-id")
        .first()
    )

    almacen = unidad.almacen_actual or (historial_activo.almacen if historial_activo else None)
    maquinaria = unidad.maquinaria_actual or (historial_activo.maquinaria if historial_activo else None)
    trabajador = unidad.trabajador_actual or (historial_activo.trabajador if historial_activo else None)

    if not any([almacen, maquinaria, trabajador]):
        return None

    if almacen:
        return {
            "tipo": "ALMACEN",
            "nombre": almacen.nombre,
            "almacen": {
                "id": almacen.id,
                "nombre": almacen.nombre,
            },
            "maquinaria": None,
            "trabajador": None,
            "almacen_id": almacen.id,
            "maquinaria_id": None,
            "trabajador_id": None,
            "fecha_inicio": historial_activo.fecha_inicio if historial_activo else None,
            "fecha_fin": historial_activo.fecha_fin if historial_activo else None,
            "horometro_inicio": historial_activo.horometro_inicio if historial_activo else None,
            "horometro_fin": historial_activo.horometro_fin if historial_activo else None,
        }

    if maquinaria:
        return {
            "tipo": "MAQUINARIA",
            "nombre": f"{maquinaria.codigo_maquina} - {maquinaria.nombre}",
            "almacen": None,
            "maquinaria": {
                "id": maquinaria.id,
                "codigo": maquinaria.codigo_maquina,
                "codigo_maquina": maquinaria.codigo_maquina,
                "nombre": maquinaria.nombre,
            },
            "trabajador": None,
            "almacen_id": None,
            "maquinaria_id": maquinaria.id,
            "trabajador_id": None,
            "fecha_inicio": historial_activo.fecha_inicio if historial_activo else None,
            "fecha_fin": historial_activo.fecha_fin if historial_activo else None,
            "horometro_inicio": historial_activo.horometro_inicio if historial_activo else None,
            "horometro_fin": historial_activo.horometro_fin if historial_activo else None,
        }

    return {
        "tipo": "TRABAJADOR",
        "nombre": f"{trabajador.nombres} {trabajador.apellidos}".strip(),
        "almacen": None,
        "maquinaria": None,
        "trabajador": {
            "id": trabajador.id,
            "codigo": trabajador.codigo,
            "nombres": trabajador.nombres,
            "apellidos": trabajador.apellidos,
        },
        "almacen_id": None,
        "maquinaria_id": None,
        "trabajador_id": trabajador.id,
        "fecha_inicio": historial_activo.fecha_inicio if historial_activo else None,
        "fecha_fin": historial_activo.fecha_fin if historial_activo else None,
        "horometro_inicio": historial_activo.horometro_inicio if historial_activo else None,
        "horometro_fin": historial_activo.horometro_fin if historial_activo else None,
    }


class HistorialUbicacionItemSerializer(serializers.ModelSerializer):
    tipo = serializers.SerializerMethodField()
    nombre = serializers.SerializerMethodField()
    almacen = serializers.SerializerMethodField()
    maquinaria = serializers.SerializerMethodField()
    trabajador = serializers.SerializerMethodField()
    almacen_id = serializers.IntegerField(source="almacen.id", read_only=True, default=None)
    maquinaria_id = serializers.IntegerField(source="maquinaria.id", read_only=True, default=None)
    trabajador_id = serializers.IntegerField(source="trabajador.id", read_only=True, default=None)
    item_unidad = serializers.IntegerField(source="item_unidad.id", read_only=True)
    item_unidad_serie = serializers.CharField(source="item_unidad.serie", read_only=True)
    item_unidad_estado = serializers.CharField(source="item_unidad.estado", read_only=True)

    class Meta:
        model = HistorialUbicacionItem
        fields = [
            "id",
            "item_unidad",
            "item_unidad_serie",
            "item_unidad_estado",
            "tipo",
            "nombre",
            "almacen",
            "maquinaria",
            "trabajador",
            "almacen_id",
            "maquinaria_id",
            "trabajador_id",
            "orden_trabajo",
            "fecha_inicio",
            "fecha_fin",
            "horometro_inicio",
            "horometro_fin",
        ]

    def get_tipo(self, obj):
        if obj.almacen:
            return "ALMACEN"
        if obj.maquinaria:
            return "MAQUINARIA"
        if obj.trabajador:
            return "TRABAJADOR"

    def get_nombre(self, obj):
        return str(obj.almacen or obj.maquinaria or obj.trabajador)

    def get_almacen(self, obj):
        if not obj.almacen:
            return None

        return {
            "id": obj.almacen.id,
            "nombre": obj.almacen.nombre,
        }
    
    def get_maquinaria(self, obj):
        if not obj.maquinaria:
            return None

        return {
            "id": obj.maquinaria.id,
            "codigo": obj.maquinaria.codigo_maquina,
            "codigo_maquina": obj.maquinaria.codigo_maquina,
            "nombre": obj.maquinaria.nombre,
        }

    def get_trabajador(self, obj):
        if not obj.trabajador:
            return None

        return {
            "id": obj.trabajador.id,
            "codigo": obj.trabajador.codigo,
            "nombres": obj.trabajador.nombres,
            "apellidos": obj.trabajador.apellidos,
        }



class HistorialConsumibleActivoSerializer(serializers.ModelSerializer):
    lote = serializers.IntegerField(source="lote.id", read_only=True)
    cantidad_ubicacion = serializers.DecimalField(source="cantidad", max_digits=16, decimal_places=6, read_only=True)
    ubicacion = serializers.SerializerMethodField()
    tipo_ubicacion = serializers.SerializerMethodField()
    almacen_id = serializers.IntegerField(source="almacen.id", read_only=True, default=None)
    maquinaria_id = serializers.IntegerField(source="maquinaria.id", read_only=True, default=None)
    trabajador_id = serializers.IntegerField(source="trabajador.id", read_only=True, default=None)

    class Meta:
        model = HistorialConsumible
        fields = [
            "id",
            "lote",
            "cantidad_ubicacion",
            "tipo_ubicacion",
            "ubicacion",
            "almacen_id",
            "maquinaria_id",
            "trabajador_id",
            "fecha_inicio",
            "horometro_inicio",
        ]

    def get_tipo_ubicacion(self, obj):
        if obj.maquinaria:
            return "MAQUINARIA"
        if obj.almacen:
            return "ALMACEN"
        if obj.trabajador:
            return "TRABAJADOR"
        return "SIN_UBICACION"

    def get_ubicacion(self, obj):
        if obj.maquinaria:
            return f"MAQUINARIA - {obj.maquinaria.codigo_maquina} - {obj.maquinaria.nombre}"
        if obj.almacen:
            return f"ALMACEN - {obj.almacen.nombre}"
        if obj.trabajador:
            return f"TRABAJADOR - {obj.trabajador.nombres} {obj.trabajador.apellidos}".strip()
        return "SIN UBICACION"

class HistorialConsumibleHistorialSerializer(serializers.ModelSerializer):
    lote = serializers.IntegerField(source="lote.id", read_only=True)
    lote_fecha_ingreso = serializers.DateTimeField(source="lote.fecha_ingreso", read_only=True)
    orden_trabajo = serializers.CharField(source="orden_trabajo.codigo_orden", read_only=True)
    ubicacion = serializers.SerializerMethodField()
    tipo_ubicacion = serializers.SerializerMethodField()

    class Meta:
        model = HistorialConsumible
        fields = [
            "id",
            "lote",
            "lote_fecha_ingreso",
            "cantidad",
            "tipo_ubicacion",
            "ubicacion",
            "orden_trabajo",
            "fecha_inicio",
            "fecha_fin",
            "horometro_inicio",
            "horometro_fin",
        ]

    def get_tipo_ubicacion(self, obj):
        if obj.maquinaria:
            return "MAQUINARIA"
        if obj.almacen:
            return "ALMACEN"
        if obj.trabajador:
            return "TRABAJADOR"
        return "SIN_UBICACION"

    def get_ubicacion(self, obj):
        if obj.maquinaria:
            return f"{obj.maquinaria.codigo_maquina} - {obj.maquinaria.nombre}"
        if obj.almacen:
            return obj.almacen.nombre
        if obj.trabajador:
            return f"{obj.trabajador.nombres} {obj.trabajador.apellidos}".strip()
        return "SIN UBICACION"

class ItemDetalleSerializer(serializers.ModelSerializer):
    unidades = serializers.SerializerMethodField()
    stock = serializers.SerializerMethodField()

    class Meta:
        model = Item
        fields = "__all__"

    def get_unidades(self, obj):
        if obj.tipo_insumo == Item.TipoInsumo.CONSUMIBLE:
            return []
        
        data = []

        for u in obj.unidades.all():
            data.append({
                "id": u.id,
                "serie": u.serie,
                "estado": u.estado,
                "almacen_actual_id": u.almacen_actual_id,
                "trabajador_actual_id": u.trabajador_actual_id,
                "maquinaria_actual_id": u.maquinaria_actual_id,
                "ubicacion_actual": serializar_ubicacion_item_unidad_actual(u),
            })

        return data
    
    def get_stock(self, obj):
        return actualizar_stock_item(obj)

class KardexUnidadSerializer(serializers.ModelSerializer):
    item = serializers.CharField(source="item_unidad.item.nombre")
    codigo = serializers.CharField(source="item_unidad.item.codigo")
    serie = serializers.CharField(source="item_unidad.serie")
    estado = serializers.CharField(source="item_unidad.estado")

    class Meta:
        model = HistorialUbicacionItem
        fields = [
            "item",
            "codigo",
            "serie",
            "estado",
            "almacen",
            "maquinaria",
            "orden_trabajo",
            "fecha_inicio",
            "fecha_fin",
            "horometro_inicio",
            "horometro_fin",
        ]

class ItemProveedorSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.CharField(source="proveedor.nombre")
    proveedor_ruc = serializers.CharField(source="proveedor.ruc")

    class Meta:
        model = ItemProveedor
        fields = [
            "id",
            "proveedor_nombre",
            "proveedor_ruc",
            "precio",
            "moneda",
        ]

class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = ["id", "nombre", "ruc", "direccion"]


class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = ["id", "nombre", "ruc"]


class UbicacionClienteSerializer(serializers.ModelSerializer):
    cliente_nombre = serializers.CharField(source="cliente.nombre", read_only=True)

    class Meta:
        model = UbicacionCliente
        fields = ["id", "cliente", "cliente_nombre", "nombre", "direccion"]


class DimensionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dimension
        fields = [
            "id",
            "codigo",
            "nombre",
            "descripcion",
            "activo",
        ]


class UnidadMedidaSerializer(serializers.ModelSerializer):
    dimension_detalle = DimensionSerializer(source="dimension", read_only=True)

    class Meta:
        model = UnidadMedida
        fields = [
            "id",
            "nombre",
            "simbolo",
            "dimension",
            "dimension_detalle",
            "es_base",
            "activo",
        ]


class UnidadRelacionSerializer(serializers.ModelSerializer):
    unidad_base_detalle = UnidadMedidaSerializer(source="unidad_base", read_only=True)
    unidad_relacionada_detalle = UnidadMedidaSerializer(
        source="unidad_relacionada",
        read_only=True,
    )
    dimension_detalle = DimensionSerializer(source="dimension", read_only=True)

    class Meta:
        model = UnidadRelacion
        fields = [
            "id",
            "dimension",
            "dimension_detalle",
            "unidad_base",
            "unidad_base_detalle",
            "unidad_relacionada",
            "unidad_relacionada_detalle",
            "factor",
            "activo",
        ]

    def validate(self, data):
        unidad_base = data.get("unidad_base", getattr(self.instance, "unidad_base", None))
        unidad_relacionada = data.get(
            "unidad_relacionada",
            getattr(self.instance, "unidad_relacionada", None),
        )
        dimension = data.get(
            "dimension",
            getattr(self.instance, "dimension", None),
        )

        if unidad_base and unidad_relacionada and unidad_base.id == unidad_relacionada.id:
            raise serializers.ValidationError(
                "La unidad base y la unidad relacionada deben ser distintas"
            )
        if unidad_base and unidad_relacionada and unidad_base.dimension_id != unidad_relacionada.dimension_id:
            raise serializers.ValidationError(
                "Las unidades deben pertenecer a la misma dimensión"
            )
        if dimension and unidad_base and dimension.id != unidad_base.dimension_id:
            raise serializers.ValidationError(
                "La dimensión debe coincidir con la unidad base"
            )
        if dimension and unidad_relacionada and dimension.id != unidad_relacionada.dimension_id:
            raise serializers.ValidationError(
                "La dimensión debe coincidir con la unidad relacionada"
            )
        
        factor = data.get("factor", getattr(self.instance, "factor", None))
        if factor in (None, 0):
            return data

        factor_inverso = (Decimal("1") / Decimal(factor)).quantize(
            Decimal("0.000001"),
            rounding=ROUND_HALF_UP,
        )
        factor_field = UnidadRelacion._meta.get_field("factor")
        factor_validator = serializers.DecimalField(
            max_digits=factor_field.max_digits,
            decimal_places=factor_field.decimal_places,
        )
        try:
            factor_validator.run_validation(str(factor_inverso))
        except serializers.ValidationError:
            raise serializers.ValidationError(
                {
                    "factor": (
                        "No se puede guardar esta relación porque su inversa (1/factor) "
                        f"excede el límite permitido ({factor_field.max_digits} dígitos y "
                        f"{factor_field.decimal_places} decimales)."
                    )
                }
            )

        return data
        
class KardexContableSerializer(serializers.Serializer):
    fecha = serializers.DateTimeField()
    registro = serializers.CharField()
    inventario_inicial = serializers.IntegerField()
    entrada = serializers.IntegerField()
    salida = serializers.IntegerField()
    costo_unitario = serializers.DecimalField(max_digits=12, decimal_places=2)
    inventario_final_cantidad = serializers.IntegerField()
    inventario_final_costo = serializers.DecimalField(max_digits=14, decimal_places=2)
    maquinaria = serializers.DictField(required=False, allow_null=True)

class ItemGrupoDetalleSerializer(serializers.ModelSerializer):
    item_nombre = serializers.CharField(source="item.nombre", read_only=True)
    item_codigo = serializers.CharField(source="item.codigo", read_only=True)
    item_tipo_insumo = serializers.CharField(source="item.tipo_insumo", read_only=True)
    unidad_nombre = serializers.CharField(source="unidad_medida.nombre", read_only=True)
    unidad_simbolo = serializers.CharField(source="unidad_medida.simbolo", read_only=True)

    class Meta:
        model = ItemGrupoDetalle
        fields = [
            "id",
            "item",
            "item_nombre",
            "item_codigo",
            "item_tipo_insumo",
            "cantidad",
            "unidad_medida",
            "unidad_nombre",
            "unidad_simbolo",
        ]

    def validate(self, data):
        item = data.get("item", getattr(self.instance, "item", None))
        unidad_medida = data.get("unidad_medida", getattr(self.instance, "unidad_medida", None))
        cantidad = data.get("cantidad", getattr(self.instance, "cantidad", None))

        if cantidad is not None and cantidad <= 0:
            raise serializers.ValidationError({"cantidad": "La cantidad debe ser mayor a cero."})

        if unidad_medida and item and item.dimension_id != unidad_medida.dimension_id:
            raise serializers.ValidationError({
                "unidad_medida": "La unidad no coincide con la dimensión del item."
            })

        return data


class ItemGrupoSerializer(serializers.ModelSerializer):
    items = ItemGrupoDetalleSerializer(many=True)

    class Meta:
        model = ItemGrupo
        fields = ["id", "nombre", "created_at", "updated_at", "items"]

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Debes agregar al menos un item.")

        item_ids = [item["item"].id for item in value]
        if len(item_ids) != len(set(item_ids)):
            raise serializers.ValidationError("No se puede repetir el mismo item en el grupo.")

        return value

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])

        with transaction.atomic():
            grupo = ItemGrupo.objects.create(**validated_data)
            detalles = [
                ItemGrupoDetalle(
                    grupo=grupo,
                    item=item_data["item"],
                    cantidad=item_data.get("cantidad"),
                    unidad_medida=item_data.get("unidad_medida") or item_data["item"].unidad_medida,
                )
                for item_data in items_data
            ]
            ItemGrupoDetalle.objects.bulk_create(detalles)

        return grupo

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            with transaction.atomic():
                instance.items.all().delete()
                detalles = [
                    ItemGrupoDetalle(
                        grupo=instance,
                        item=item_data["item"],
                        cantidad=item_data.get("cantidad"),
                        unidad_medida=item_data.get("unidad_medida") or item_data["item"].unidad_medida,
                    )
                    for item_data in items_data
                ]
                ItemGrupoDetalle.objects.bulk_create(detalles)

        return instance
