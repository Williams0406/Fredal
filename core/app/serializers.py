from django.contrib.auth.models import User
from django.contrib.auth.models import Group
from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import (
    Item,
    Maquinaria,
    Compra,
    CompraDetalle,
    Almacen,
    Trabajador,
    PerfilUsuario,
    ActividadTrabajo,
    MovimientoRepuesto,
    MovimientoConsumible,
    OrdenTrabajo,
    CodigoRegistro,
    HistorialUbicacionItem,
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
    if item.tipo_insumo == Item.TipoInsumo.REPUESTO:
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
                    historial__fecha_fin__isnull=True,
                    historial__almacen__isnull=False,
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
        )
        return max(Decimal(total_compras) - Decimal(total_salidas), Decimal("0"))

    if not item.unidad_medida or not item.dimension:
        return Decimal("0")

    total_compras = Decimal("0")
    detalles = (
        CompraDetalle.objects
        .filter(item=item)
        .select_related("unidad_medida")
    )
    for detalle in detalles:
        unidad_compra = detalle.unidad_medida or item.unidad_medida
        factor = obtener_factor_entre_unidades(
            unidad_compra,
            item.unidad_medida,
        )
        total_compras += Decimal(detalle.cantidad) * factor

    total_salidas = Decimal("0")
    movimientos = (
        MovimientoConsumible.objects
        .filter(item=item, actividad__es_planificada=False)
        .select_related("unidad_medida")
    )
    for movimiento in movimientos:
        unidad_mov = movimiento.unidad_medida or item.unidad_medida
        if unidad_mov.id == item.unidad_medida.id:
            total_salidas += Decimal(movimiento.cantidad)
            continue
        factor = obtener_factor_entre_unidades(unidad_mov, item.unidad_medida)
        total_salidas += Decimal(movimiento.cantidad) * factor

    return max(total_compras - total_salidas, Decimal("0"))

def actualizar_stock_item(item):
    if hasattr(item, "_stock_calculado"):
        return item._stock_calculado
    stock = calcular_stock_item(item)
    item._stock_calculado = stock
    if item.stock != stock:
        item.stock = stock
        item.save(update_fields=["stock"])
    return stock

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    groups = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Group.objects.all(), required=False
    )
    trabajador = serializers.PrimaryKeyRelatedField(
        queryset=Trabajador.objects.all(), write_only=True
    )
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
            "roles",
        ]
        
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

    def validate(self, data):
        tipo_insumo = data.get(
            "tipo_insumo",
            getattr(self.instance, "tipo_insumo", None),
        )
        dimension = data.get(
            "dimension",
            getattr(self.instance, "dimension", None),
        )
        unidad_medida = data.get(
            "unidad_medida",
            getattr(self.instance, "unidad_medida", None),
        )

        if tipo_insumo == Item.TipoInsumo.REPUESTO:
            dimension_cantidad = Dimension.objects.filter(codigo="CANTIDAD").first()
            if not dimension_cantidad:
                raise serializers.ValidationError(
                    "Debe existir la dimensión CANTIDAD para registrar repuestos"
                )
            unidad_base = UnidadMedida.objects.filter(
                dimension=dimension_cantidad,
                nombre__iexact="CANTIDAD",
            ).first() or obtener_unidad_base(dimension_cantidad)
            if not unidad_base:
                raise serializers.ValidationError(
                    "Debe existir al menos una unidad en la dimensión CANTIDAD"
                )
            if dimension and dimension.id != dimension_cantidad.id:
                raise serializers.ValidationError(
                    "La dimensión de un REPUESTO debe ser CANTIDAD"
                )
            if unidad_medida and unidad_medida.id != unidad_base.id:
                raise serializers.ValidationError(
                    "La unidad de un REPUESTO debe ser CANTIDAD"
                )
            data["dimension"] = dimension_cantidad
            data["unidad_medida"] = unidad_base
            return data

        if tipo_insumo == Item.TipoInsumo.CONSUMIBLE:
            if not dimension:
                raise serializers.ValidationError(
                    "El consumible debe tener una dimensión"
                )
            if not unidad_medida:
                raise serializers.ValidationError(
                    "El consumible debe tener una unidad de medida"
                )
            if unidad_medida.dimension_id != dimension.id:
                raise serializers.ValidationError(
                    "La unidad seleccionada no pertenece a la dimensión del item"
                )
            unidad_item_actual = getattr(self.instance, "unidad_medida", None)
            if unidad_item_actual and unidad_medida.id != unidad_item_actual.id:
                obtener_factor_entre_unidades(unidad_medida, unidad_item_actual)

        return data
    
    def get_unidades_disponibles(self, obj):
        return actualizar_stock_item(obj)

    def get_stock(self, obj):
        return actualizar_stock_item(obj)
    
    def update(self, instance, validated_data):
        nueva_unidad = validated_data.get('unidad_medida')
        unidad_anterior = instance.unidad_medida
        
        # 1. Verificamos si es CONSUMIBLE y si la unidad realmente cambió
        if instance.tipo_insumo == 'CONSUMIBLE' and nueva_unidad and unidad_anterior and nueva_unidad != unidad_anterior:
            
            # 2. Buscamos la relación de conversión (Base -> Relacionada)
            relacion = UnidadRelacion.objects.filter(
                unidad_base=unidad_anterior,
                unidad_relacionada=nueva_unidad,
            ).first()

            if relacion:
                # 3. ¡Aquí ocurre la magia! Actualizamos cada registro físico de stock
                factor = Decimal(str(relacion.factor))
                # Usamos el related_name 'unidades' que definiste en ItemUnidad
                unidades_fisicas = instance.unidades.all() 
                
                for unidad_fisica in unidades_fisicas:
                    unidad_fisica.cantidad_nominal = unidad_fisica.cantidad_nominal * factor
                    unidad_fisica.save()
            else:
                # Opcional: podrías lanzar un error si no existe la relación
                # raise serializers.ValidationError(f"No existe una relación de conversión entre {unidad_anterior.nombre} y {nueva_unidad.nombre}")
                pass

        instance = super().update(instance, validated_data)
        actualizar_stock_item(instance)
        return instance

class MaquinariaSerializer(serializers.ModelSerializer):
    centro_costos = serializers.SerializerMethodField()

    class Meta:
        model = Maquinaria
        fields = [
            "id",
            "codigo_maquina",
            "nombre",
            "centro_costos",
        ]

    def get_centro_costos(self, obj):
        return round(obj.calcular_centro_costos(), 2)

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

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        with transaction.atomic():
            # 1. Crear la cabecera de Compra
            compra = Compra.objects.create(**validated_data)
            
            # 2. Obtener almacén por defecto para el ingreso
            almacen_principal, _ = Almacen.objects.get_or_create(nombre="Almacén Central")

            for data in items_data:
                cantidad_original = data["cantidad"]
                unidad_medida = data.get("unidad_medida")
                cantidad = cantidad_original

                if unidad_medida and data["item"].tipo_insumo != Item.TipoInsumo.CONSUMIBLE:
                    if data["item"].unidad_medida_id != unidad_medida.id:
                        raise serializers.ValidationError(
                            f"El item {data['item'].codigo} solo permite su unidad configurada"
                        )
                
                if data["item"].tipo_insumo == Item.TipoInsumo.CONSUMIBLE and unidad_medida:
                    if not data["item"].dimension:
                        raise serializers.ValidationError(
                            f"El item {data['item'].codigo} no tiene dimensión configurada"
                        )
                    if unidad_medida.dimension_id != data["item"].dimension_id:
                        raise serializers.ValidationError(
                            "La unidad de medida no coincide con la dimensión del item"
                        )
                    if unidad_medida.id != data["item"].unidad_medida_id:
                        obtener_factor_entre_unidades(unidad_medida, data["item"].unidad_medida)
                elif data["item"].tipo_insumo == Item.TipoInsumo.CONSUMIBLE:
                    unidad_medida = data["item"].unidad_medida
                    if not unidad_medida:
                        raise serializers.ValidationError(
                            f"El item {data['item'].codigo} no tiene unidad de medida configurada"
                        )
                else:
                    unidad_medida = data["item"].unidad_medida
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
                    item=data["item"],
                    cantidad=cantidad,
                    unidad_medida=unidad_medida,
                    moneda=data["moneda"],
                    valor_unitario=valor_unitario.quantize(Decimal("0.01"))
                )

                # 5. Generar unidades físicas en inventario e historial inicial
                if data["item"].tipo_insumo == Item.TipoInsumo.REPUESTO:
                    for _ in range(cantidad):
                        unidad = ItemUnidad.objects.create(
                            item=data["item"],
                            compra_detalle=detalle,
                            estado=ItemUnidad.Estado.NUEVO
                        )
                        HistorialUbicacionItem.objects.create(
                            item_unidad=unidad,
                            almacen=almacen_principal,
                            estado=unidad.estado,
                            fecha_inicio=compra.fecha
                        )
                actualizar_stock_item(data["item"])
            return compra

class CompraDetalleListSerializer(serializers.ModelSerializer):
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
            "moneda",
            "tipo_comprobante",
            "codigo_comprobante",
        ]

    def get_valor_total(self, obj):
        return obj.valor_unitario * obj.cantidad

    def get_costo_unitario(self, obj):
        return obj.valor_unitario * Decimal("1.18")

    def get_costo_total(self, obj):
        return self.get_costo_unitario(obj) * obj.cantidad


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
        ]

    def get_estado_previo(self, obj):
        historial_previo = (
            HistorialUbicacionItem.objects
            .filter(item_unidad=obj.item_unidad, fecha_inicio__lt=obj.fecha)
            .order_by("-fecha_inicio")
            .first()
        )
        if historial_previo:
            return historial_previo.estado
        return obj.item_unidad.estado
    def validate(self, data):
        unidad = data["item_unidad"]
        actividad = data["actividad"]

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

        return data

    def create(self, validated_data):
        actividad = validated_data["actividad"]
        unidad_nueva = validated_data["item_unidad"]
        maquinaria = actividad.orden.maquinaria
        item = unidad_nueva.item

        with transaction.atomic():

            if actividad.es_planificada:
                return super().create(validated_data)

            # 🔎 1️⃣ Buscar unidad(es) ACTUAL(ES) del mismo item en la maquinaria
            unidades_en_actividad = (
                MovimientoRepuesto.objects
                .filter(actividad=actividad)
                .values_list("item_unidad_id", flat=True)
            )
            historiales_actuales = (
                HistorialUbicacionItem.objects
                .select_related("item_unidad")
                .filter(
                    maquinaria=maquinaria,
                    fecha_fin__isnull=True,
                    item_unidad__item=item,
                )
                .exclude(item_unidad_id__in=unidades_en_actividad)
                .order_by("fecha_inicio")
            )

            # 🔁 2️⃣ Si existe, marcar UNA como INOPERATIVO
            historial_actual = historiales_actuales.first()
            if historial_actual:
                unidad_anterior = historial_actual.item_unidad
                unidad_anterior.estado = ItemUnidad.Estado.INOPERATIVO
                unidad_anterior.save(update_fields=["estado"])

                HistorialUbicacionItem.objects.create(
                    item_unidad=unidad_anterior,
                    maquinaria=maquinaria,
                    orden_trabajo=actividad.orden,
                    estado=ItemUnidad.Estado.INOPERATIVO
                )


            # ✅ 3️⃣ Asignar nueva unidad
            if unidad_nueva.estado == ItemUnidad.Estado.NUEVO:
                unidad_nueva.estado = ItemUnidad.Estado.USADO
                unidad_nueva.save(update_fields=["estado"])

            HistorialUbicacionItem.objects.create(
                item_unidad=unidad_nueva,
                maquinaria=maquinaria,
                orden_trabajo=actividad.orden,
                estado=unidad_nueva.estado   # estado en ese momento
            )

            # 📦 4️⃣ Registrar movimiento
            movimiento = super().create(validated_data)
            actualizar_stock_item(item)

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

    class Meta:
        model = MovimientoConsumible
        fields = [
            "id",
            "actividad",
            "item",
            "cantidad",
            "unidad_medida",
            "unidad_medida_detalle",
            "fecha",
            "item_id",
            "item_codigo",
            "item_nombre",
        ]
        read_only_fields = ["fecha"]

    def validate(self, data):
        actividad = data["actividad"]
        item = data["item"]

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

        stock_actual = item.stock
        if unidad_medida.id != item.unidad_medida_id:
            factor = obtener_factor_entre_unidades(item.unidad_medida, unidad_medida)
            stock_actual = Decimal(item.stock) * factor

        if Decimal(cantidad) > Decimal(stock_actual):
            raise serializers.ValidationError(
                "La cantidad excede el stock disponible en la unidad seleccionada"
            )

        return data
    
    def create(self, validated_data):
        movimiento = super().create(validated_data)
        actualizar_stock_item(movimiento.item)
        return movimiento

class ActividadTrabajoSerializer(serializers.ModelSerializer):
    repuestos = MovimientoRepuestoSerializer(many=True, read_only=True)
    consumibles = MovimientoConsumibleSerializer(many=True, read_only=True)

    class Meta:
        model = ActividadTrabajo
        fields = "__all__"

    def validate(self, data):
        tipo = data.get("tipo_actividad")
        tipo_mantenimiento = data.get("tipo_mantenimiento")
        subtipo = data.get("subtipo")

        if tipo == ActividadTrabajo.TipoActividad.REVISION:
            data["tipo_mantenimiento"] = None
            data["subtipo"] = None

        elif tipo == ActividadTrabajo.TipoActividad.MANTENIMIENTO:
            if not tipo_mantenimiento or not subtipo:
                raise serializers.ValidationError(
                    "El mantenimiento requiere tipo y subtipo"
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
    
    def update(self, instance, validated_data):
        tecnicos = validated_data.pop("tecnicos", None)

        # 🔹 1️⃣ Guardar estatus anterior
        estatus_anterior = instance.estatus

        instance = super().update(instance, validated_data)

        if tecnicos is not None:
            instance.tecnicos.set(tecnicos)

        # 🔹 2️⃣ Detectar transición a FINALIZADO
        if (
            estatus_anterior != OrdenTrabajo.Estatus.FINALIZADO
            and instance.estatus == OrdenTrabajo.Estatus.FINALIZADO
        ):
            instance._finalizada = True  # bandera interna (no se guarda en DB)

        return instance
    
    def validate(self, data):
        estatus = data.get("estatus", self.instance.estatus if self.instance else "PENDIENTE")

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

class MaquinariaDetalleSerializer(serializers.ModelSerializer):
    ordenes = serializers.SerializerMethodField()
    repuestos = serializers.SerializerMethodField()
    consumibles = serializers.SerializerMethodField()

    class Meta:
        model = Maquinaria
        fields = [
            "id",
            "codigo_maquina",
            "nombre",
            "gasto",
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

class HistorialUbicacionItemSerializer(serializers.ModelSerializer):
    tipo = serializers.SerializerMethodField()
    nombre = serializers.SerializerMethodField()
    maquinaria = serializers.SerializerMethodField()

    class Meta:
        model = HistorialUbicacionItem
        fields = [
            "id",
            "tipo",
            "nombre",
            "maquinaria",
            "orden_trabajo",
            "fecha_inicio",
            "fecha_fin",
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
    
    def get_maquinaria(self, obj):
        if not obj.maquinaria:
            return None

        return {
            "id": obj.maquinaria.id,
            "codigo": obj.maquinaria.codigo_maquina,
            "nombre": obj.maquinaria.nombre,
        }

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
            ubicacion = (
                u.historial
                .filter(fecha_fin__isnull=True)
                .order_by("-fecha_inicio")
                .first()
            )

            data.append({
                "id": u.id,
                "serie": u.serie,
                "estado": u.estado,
                "ubicacion_actual": (
                    HistorialUbicacionItemSerializer(ubicacion).data
                    if ubicacion else None
                )
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