from django.contrib.auth.models import User
from django.contrib.auth.models import Group
from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from decimal import Decimal
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
)

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

    class Meta:
        model = Item
        fields = [
            "id",
            "codigo",
            "nombre",
            "tipo_insumo",
            "unidad_medida",
            "volvo",
            "unidades_disponibles",
        ]

    def get_unidades_disponibles(self, obj):
        if obj.tipo_insumo == Item.TipoInsumo.CONSUMIBLE:
            total_compras = (
                CompraDetalle.objects
                .filter(item=obj)
                .aggregate(total=Sum("cantidad"))
                .get("total")
                or 0
            )
            total_salidas = (
                MovimientoConsumible.objects
                .filter(item=obj, actividad__es_planificada=False)
                .aggregate(total=Sum("cantidad"))
                .get("total")
                or 0
            )
            return max(total_compras - total_salidas, 0)

        return (
            obj.unidades
            .filter(
                estado=ItemUnidad.Estado.NUEVO,
                historial__fecha_fin__isnull=True,
                historial__almacen__isnull=False
            )
            .distinct()
            .count()
        )

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
                cantidad = data["cantidad"]
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
        ]

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

        return movimiento

class MovimientoConsumibleSerializer(serializers.ModelSerializer):
    item_id = serializers.IntegerField(source="item.id", read_only=True)
    item_codigo = serializers.CharField(source="item.codigo", read_only=True)
    item_nombre = serializers.CharField(source="item.nombre", read_only=True)
    unidad_medida = serializers.CharField(source="item.unidad_medida", read_only=True)

    class Meta:
        model = MovimientoConsumible
        fields = [
            "id",
            "actividad",
            "item",
            "cantidad",
            "fecha",
            "item_id",
            "item_codigo",
            "item_nombre",
            "unidad_medida",
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

        if data.get("cantidad", 0) <= 0:
            raise serializers.ValidationError(
                "La cantidad debe ser mayor a 0"
            )

        return data

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
