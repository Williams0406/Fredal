from django.contrib.auth.models import User, Group
from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from .permissions import IsAdmin
from django.db.models import Avg, Count, Prefetch, Sum
from decimal import Decimal
from itertools import chain
from datetime import datetime, time
from django.db import transaction


from .models import (
    Item,
    Maquinaria,
    Compra,
    CompraDetalle,
    OrdenCompra,
    OrdenCompraDetalle,
    OrdenRequerimiento,
    OrdenRequerimientoDetalle,
    Trabajador,
    OrdenTrabajo,
    ActividadTrabajo,
    ActividadTrabajoEvidencia,
    MovimientoRepuesto,
    MovimientoConsumible,
    CodigoRegistro,
    PerfilUsuario,
    HistorialUbicacionItem,
    HistorialConsumible,
    ItemProveedor,
    Proveedor,
    ItemUnidad,
    Almacen,
    Cliente,
    UbicacionCliente,
    Dimension,
    UnidadMedida,
    UnidadRelacion,
    ItemGrupo,
    LoteConsumible,
    TipoCambioDiario,
)
from .serializers import (
    UserSerializer,
    ItemSerializer,
    MaquinariaSerializer,
    CompraCreateItemSerializer,
    CompraCreateSerializer,
    CompraDetalleListSerializer,
    OrdenCompraSerializer,
    OrdenRequerimientoSerializer,
    MeSerializer,
    OrdenTrabajoSerializer,
    ActividadTrabajoSerializer,
    ActividadTrabajoEvidenciaSerializer,
    MovimientoRepuestoSerializer,
    MovimientoConsumibleSerializer,
    MaquinariaDetalleSerializer,
    TrabajadorConCodigoSerializer,
    RegistroUsuarioSerializer,
    TrabajadorAdminSerializer,
    GroupSerializer,
    ItemDetalleSerializer,
    HistorialConsumibleActivoSerializer,
    HistorialConsumibleHistorialSerializer,
    HistorialUbicacionItemSerializer,
    KardexUnidadSerializer,
    ItemProveedorSerializer,
    ProveedorSerializer,
    KardexContableSerializer,
    AlmacenSerializer,
    ClienteSerializer,
    UbicacionClienteSerializer,
    DimensionSerializer,
    UnidadMedidaSerializer,
    UnidadRelacionSerializer,
    ItemGrupoSerializer,
    TipoCambioDiarioSerializer,
    convertir_cantidad_a_unidad_item,
    obtener_tecnico_responsable_planificado,
)
from .permissions import (
    IsAdmin,
    ItemPermission,
    CatalogoPermission,
    TrabajoPermission,
    CompraPermission,
    OrdenCompraPermission,
    OrdenRequerimientoPermission,
    CambioEquipoPermission,
    can_manage_planned_activities,
    is_compras_user,
    is_maintenance_boss,
    is_storage_user,
    is_tecnico_user,
)

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("username")
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"])
    def roles(self, request):
        roles = Group.objects.all()
        return Response(GroupSerializer(roles, many=True).data)

    @action(detail=True, methods=["post"])
    def set_roles(self, request, pk=None):
        user = self.get_object()
        roles = request.data.get("roles", [])

        groups = Group.objects.filter(name__in=roles)
        user.groups.set(groups)

        return Response({
            "status": "roles actualizados",
            "roles": roles
        })

class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.select_related("dimension", "unidad_medida").all().order_by("nombre")
    serializer_class = ItemSerializer
    permission_classes = [ItemPermission]

    @staticmethod
    def _estados_disponibles_unidad():
        return [
            ItemUnidad.Estado.NUEVO,
            ItemUnidad.Estado.USADO,
            ItemUnidad.Estado.REPARADO,
        ]

    def _get_trabajador_request(self):
        user = getattr(self.request, "user", None)
        if not user or not user.is_authenticated:
            return None

        try:
            return user.perfil.trabajador
        except (AttributeError, PerfilUsuario.DoesNotExist):
            return None

    def _get_actividad_request(self):
        actividad_id = self.request.query_params.get("actividad")
        if not actividad_id:
            return None

        return (
            ActividadTrabajo.objects
            .select_related("orden")
            .filter(id=actividad_id)
            .first()
        )

    def _get_tecnico_actividad_request(self, actividad):
        tecnico_id = self.request.query_params.get("tecnico")
        return obtener_tecnico_responsable_planificado(
            actividad,
            tecnico_id=tecnico_id,
        )

    def _get_tecnico_contexto_actividad(self, actividad):
        tecnico_id = self.request.query_params.get("tecnico")
        if tecnico_id:
            tecnico = actividad.orden.tecnicos.filter(id=tecnico_id).first()
            if tecnico:
                return tecnico

        trabajador = self._get_trabajador_request()
        if trabajador and actividad.orden.tecnicos.filter(id=trabajador.id).exists():
            return trabajador

        return actividad.orden.tecnicos.order_by("id").first()

    @staticmethod
    def _trabajador_es_tecnico(trabajador):
        if not trabajador:
            return False

        if "tecnico" in str(trabajador.puesto or "").lower():
            return True

        return PerfilUsuario.objects.filter(
            trabajador=trabajador,
            user__groups__name="Tecnico",
        ).exists()

    def _get_queryset_con_stock(self, queryset, proveedor_id=None):
        repuestos = queryset.filter(
            tipo_insumo__in=Item.tipos_con_unidades(),
            unidades__almacen_actual__isnull=False,
            unidades__estado__in=self._estados_disponibles_unidad(),
        )

        consumibles = queryset.filter(
            tipo_insumo=Item.TipoInsumo.CONSUMIBLE,
            loteconsumible__cantidad_disponible__gt=0,
        )

        if proveedor_id:
            repuestos = repuestos.filter(
                unidades__compra_detalle__compra__proveedor_id=proveedor_id
            )
            consumibles = consumibles.filter(
                loteconsumible__compra_detalle__compra__proveedor_id=proveedor_id
            )

        return (repuestos | consumibles).distinct()

    def _get_item_ids_asignados_usuario(self, trabajador=None):
        if not trabajador:
            return set()

        repuesto_ids = (
            ItemUnidad.objects
            .filter(
                trabajador_actual=trabajador,
                item__tipo_insumo=Item.TipoInsumo.REPUESTO,
                estado__in=self._estados_disponibles_unidad(),
            )
            .exclude(estado=ItemUnidad.Estado.INOPERATIVO)
            .values_list("item_id", flat=True)
            .distinct()
        )
        consumible_ids = (
            HistorialConsumible.objects
            .filter(
                trabajador=trabajador,
                fecha_fin__isnull=True,
                cantidad__gt=0,
            )
            .values_list("item_id", flat=True)
            .distinct()
        )
        return set(repuesto_ids).union(set(consumible_ids))

    def get_queryset(self):
        queryset = super().get_queryset()
        proveedor_id = self.request.query_params.get("proveedor")
        solo_disponibles = self.request.query_params.get("disponibles") == "1"
        vista = (self.request.query_params.get("vista") or "general").lower()
        actividad = self._get_actividad_request()

        if proveedor_id:
            queryset = queryset.filter(
                compradetalle__compra__proveedor_id=proveedor_id
            ).distinct()

        if vista in {"almacen", "tecnicos", "maquinaria"}:
            repuestos = queryset.filter(
                tipo_insumo__in=Item.tipos_con_unidades(),
                unidades__estado__in=self._estados_disponibles_unidad(),
            )
            consumibles = queryset.filter(
                tipo_insumo=Item.TipoInsumo.CONSUMIBLE,
                loteconsumible__historiales__fecha_fin__isnull=True,
                loteconsumible__historiales__cantidad__gt=0,
            )

            if vista == "almacen":
                repuestos = repuestos.filter(unidades__almacen_actual__isnull=False)
                consumibles = consumibles.filter(loteconsumible__historiales__almacen__isnull=False)
            elif vista == "tecnicos":
                repuestos = repuestos.filter(unidades__trabajador_actual__isnull=False)
                consumibles = consumibles.filter(loteconsumible__historiales__trabajador__isnull=False)
            elif vista == "maquinaria":
                repuestos = repuestos.exclude(
                    tipo_insumo=Item.TipoInsumo.HERRAMIENTA
                ).filter(unidades__maquinaria_actual__isnull=False)
                consumibles = consumibles.filter(loteconsumible__historiales__maquinaria__isnull=False)

            queryset = (repuestos | consumibles).distinct()

        if actividad:
            tecnico_actividad = self._get_tecnico_contexto_actividad(actividad)
            if not tecnico_actividad:
                return queryset.none()
            item_ids_asignados = self._get_item_ids_asignados_usuario(
                trabajador=tecnico_actividad,
            )

            queryset = queryset.filter(id__in=item_ids_asignados)
        elif solo_disponibles:
            queryset = self._get_queryset_con_stock(
                queryset,
                proveedor_id=proveedor_id,
            )

        return queryset

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ItemDetalleSerializer
        return ItemSerializer

    # 📜 HISTORIAL REAL
    @action(detail=True, methods=["get"])
    def historial(self, request, pk=None):
        item = self.get_object()

        qs = HistorialUbicacionItem.objects.filter(
            item_unidad__item=item
        ).order_by("-fecha_inicio")

        serializer = HistorialUbicacionItemSerializer(qs, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=["post"], permission_classes=[CambioEquipoPermission])
    def cambiar_ubicacion_consumible(self, request, pk=None):
        item = self.get_object()
        historial_id = request.data.get("historial_id")
        almacen_id = request.data.get("almacen_id")
        maquinaria_id = request.data.get("maquinaria_id")
        trabajador_id = request.data.get("trabajador_id")

        historial = HistorialConsumible.objects.filter(
            id=historial_id,
            item=item,
            fecha_fin__isnull=True,
        ).first()

        if not historial:
            return Response({"detail": "Historial consumible no encontrado"}, status=status.HTTP_404_NOT_FOUND)

        destinos = [bool(almacen_id), bool(maquinaria_id), bool(trabajador_id)]
        if sum(destinos) != 1:
            return Response({"detail": "Debe seleccionar un único destino"}, status=status.HTTP_400_BAD_REQUEST)

        data = {
            "lote": historial.lote,
            "item": historial.item,
            "cantidad": historial.cantidad,
            "unidad_medida": historial.unidad_medida,
            "orden_trabajo": historial.orden_trabajo,
        }

        if almacen_id:
            data["almacen"] = Almacen.objects.filter(id=almacen_id).first()
        if maquinaria_id:
            data["maquinaria"] = Maquinaria.objects.filter(id=maquinaria_id).first()
        if trabajador_id:
            data["trabajador"] = Trabajador.objects.filter(id=trabajador_id).first()

        if not any([data.get("almacen"), data.get("maquinaria"), data.get("trabajador")]):
            return Response({"detail": "Destino inválido"}, status=status.HTTP_400_BAD_REQUEST)

        historial.cerrar()

        nuevo_historial = HistorialConsumible.objects.create(**data)
        serializer = HistorialConsumibleActivoSerializer(nuevo_historial)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def ubicaciones_consumible(self, request, pk=None):
        item = self.get_object()

        historial = (
            HistorialConsumible.objects
            .filter(item=item, fecha_fin__isnull=True)
            .select_related("lote", "maquinaria", "almacen", "trabajador")
            .order_by("-fecha_inicio")
        )

        serializer = HistorialConsumibleActivoSerializer(historial, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=["get"])
    def historial_consumible(self, request, pk=None):
        item = self.get_object()

        historial = (
            HistorialConsumible.objects
            .filter(item=item)
            .select_related("lote", "maquinaria", "almacen", "trabajador", "orden_trabajo")
            .order_by("lote_id", "fecha_inicio", "id")
        )

        serializer = HistorialConsumibleHistorialSerializer(historial, many=True)
        return Response(serializer.data)
    

    # 📍 UBICACIÓN ACTUAL
    @action(detail=True, methods=["get"])
    def ubicacion_actual(self, request, pk=None):
        item = self.get_object()

        ubicacion = HistorialUbicacionItem.objects.filter(
            item_unidad__item=item,
            fecha_fin__isnull=True
        ).first()

        if not ubicacion:
            return Response(None)

        serializer = HistorialUbicacionItemSerializer(ubicacion)
        return Response(serializer.data)
    
    # 📦 KARDEX DEL ITEM
    @action(detail=True, methods=["get"])
    def kardex(self, request, pk=None):
        item = self.get_object()

        movimientos = HistorialUbicacionItem.objects.filter(
            item_unidad__item=item
        ).order_by("fecha_inicio")

        serializer = KardexUnidadSerializer(movimientos, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=["get"])
    def proveedores(self, request, pk=None):
        item = self.get_object()

        qs = (
            CompraDetalle.objects
            .filter(
                item=item,
                compra__proveedor__isnull=False
            )
            .values(
                "compra__proveedor_id",
                "compra__proveedor__nombre",
                "compra__proveedor__ruc",
                "compra__moneda",
            )
            .annotate(
                precio_promedio=Avg("valor_unitario")
            )
            .order_by(
                "compra__proveedor__nombre",
                "compra__moneda"
            )
        )

        data = [
            {
                "proveedor_nombre": r["compra__proveedor__nombre"],
                "proveedor_ruc": r["compra__proveedor__ruc"],
                "moneda": r["compra__moneda"],
                "precio": round(r["precio_promedio"], 2),
            }
            for r in qs
        ]

        return Response(data)
    
    @action(detail=False, methods=["get"])
    def proveedores_disponibles(self, request):
        proveedores_repuesto = Proveedor.objects.filter(
            compras__detalles__item__tipo_insumo=Item.TipoInsumo.REPUESTO,
            compras__detalles__item__unidades__almacen_actual__isnull=False,
            compras__detalles__item__unidades__estado__in=[
                ItemUnidad.Estado.NUEVO,
                ItemUnidad.Estado.USADO,
                ItemUnidad.Estado.REPARADO,
            ],
        )

        proveedores_consumible = Proveedor.objects.filter(
            compras__detalles__item__tipo_insumo=Item.TipoInsumo.CONSUMIBLE,
            compras__detalles__item__loteconsumible__cantidad_disponible__gt=0,
        )

        proveedores = (proveedores_repuesto | proveedores_consumible).distinct().order_by("nombre")

        return Response(
            [{"id": p.id, "nombre": p.nombre, "ruc": p.ruc} for p in proveedores]
        )
    
    @action(detail=False, methods=["get"])
    def por_maquinaria(self, request):
        maquinaria_id = request.query_params.get("maquinaria")

        if not maquinaria_id:
            return Response([])

        items = Item.objects.filter(
            unidades__maquinaria_actual_id=maquinaria_id,
        ).distinct()

        serializer = ItemSerializer(items, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=["get"])
    def unidades_asignables(self, request, pk=None):
        item = self.get_object()
        actividad_id = request.query_params.get("actividad")

        if not actividad_id:
            return Response([])

        if item.tipo_insumo != Item.TipoInsumo.REPUESTO:
            return Response([])

        actividad = (
            ActividadTrabajo.objects
            .select_related("orden")
            .filter(id=actividad_id)
            .first()
        )
        if not actividad:
            return Response([])

        tecnico = self._get_tecnico_contexto_actividad(actividad)
        if not tecnico:
            return Response([])

        unidades_qs = (
            ItemUnidad.objects
            .filter(
                item=item,
                trabajador_actual=tecnico,
                estado__in=self._estados_disponibles_unidad(),
            )
            .exclude(estado=ItemUnidad.Estado.INOPERATIVO)
            .order_by("serie", "id")
        )

        if actividad.es_planificada:
            unidades_planificadas = (
                MovimientoRepuesto.objects
                .filter(
                    actividad__orden=actividad.orden,
                    actividad__es_planificada=True,
                    item_unidad__item=item,
                )
                .values_list("item_unidad_id", flat=True)
            )
            unidades_qs = unidades_qs.exclude(id__in=unidades_planificadas)

        return Response([
            {
                "id": unidad.id,
                "serie": unidad.serie,
                "estado": unidad.estado,
            }
            for unidad in unidades_qs
        ])
    
    @action(detail=True, methods=["get"])
    def lotes_disponibles(self, request, pk=None):
        item = self.get_object()
        proveedor_id = request.query_params.get("proveedor")
        actividad_id = request.query_params.get("actividad")

        if item.tipo_insumo != Item.TipoInsumo.CONSUMIBLE:
            return Response({"cantidad_disponible": 0})

        actividad = None
        if actividad_id:
            actividad = (
                ActividadTrabajo.objects
                .select_related("orden")
                .filter(id=actividad_id)
                .first()
            )

        if actividad:
            tecnico = self._get_tecnico_contexto_actividad(actividad)
            if not tecnico:
                return Response({
                    "cantidad_disponible": Decimal("0"),
                    "unidad_medida": item.unidad_medida.nombre if item.unidad_medida else "",
                })

            total_asignado = (
                HistorialConsumible.objects
                .filter(
                    item=item,
                    trabajador=tecnico,
                    fecha_fin__isnull=True,
                    cantidad__gt=0,
                )
                .aggregate(total=Sum("cantidad"))
                .get("total")
                or Decimal("0")
            )

            cantidad_planificada = Decimal("0")
            if actividad.es_planificada:
                movimientos_planificados = (
                    MovimientoConsumible.objects
                    .select_related("unidad_medida")
                    .filter(
                        actividad__orden=actividad.orden,
                        actividad__es_planificada=True,
                        item=item,
                        tecnico=tecnico,
                    )
                )
                for movimiento in movimientos_planificados:
                    unidad_movimiento = movimiento.unidad_medida or item.unidad_medida
                    cantidad_planificada += convertir_cantidad_a_unidad_item(
                        item,
                        movimiento.cantidad,
                        unidad_movimiento,
                    )

            return Response({
                "cantidad_disponible": max(Decimal(total_asignado) - cantidad_planificada, Decimal("0")),
                "unidad_medida": item.unidad_medida.nombre if item.unidad_medida else "",
            })

        lotes = LoteConsumible.objects.filter(item=item, cantidad_disponible__gt=0)
        if proveedor_id:
            lotes = lotes.filter(compra_detalle__compra__proveedor_id=proveedor_id)

        total = lotes.aggregate(total=Sum("cantidad_disponible")).get("total") or Decimal("0")
        return Response({
            "cantidad_disponible": total,
            "unidad_medida": item.unidad_medida.nombre if item.unidad_medida else "",
        })

    @staticmethod
    def _costo_unitario_pen(detalle):
        costo_unitario = detalle.costo_unitario
        moneda = detalle.moneda

        if moneda == Compra.Moneda.PEN:
            return costo_unitario

        tipo_cambio = TipoCambioDiario.objects.filter(fecha=detalle.compra.fecha).first()
        if not tipo_cambio:
            return None

        if moneda == Compra.Moneda.USD:
            if tipo_cambio.compra_usd <= 0:
                return None
            return costo_unitario * tipo_cambio.compra_usd

        if moneda == Compra.Moneda.EUR:
            if tipo_cambio.compra_eur <= 0:
                return None
            return costo_unitario * tipo_cambio.compra_eur

        return None
    
    @action(detail=True, methods=["get"])
    def kardex_contable(self, request, pk=None):
        item = self.get_object()

        # 📥 Compras
        compras = (
            CompraDetalle.objects
            .filter(item=item)
            .select_related("compra")
            .order_by("compra__fecha")
        )

        # 📤 Salidas
        salidas = (
            MovimientoRepuesto.objects
            .filter(item_unidad__item=item)
            .filter(actividad__es_planificada=False)
            .select_related("actividad__orden")
            .order_by("fecha")
        )

        salidas_consumible = (
            MovimientoConsumible.objects
            .filter(item=item, actividad__es_planificada=False)
            .select_related("actividad__orden")
            .order_by("fecha")
        )

        eventos = []

        # ===== COMPRAS =====
        for c in compras:
            costo_unitario_pen = self._costo_unitario_pen(c)
            if costo_unitario_pen is None:
                continue

            fecha_compra = datetime.combine(c.compra.fecha, time.min)
            if timezone.is_aware(timezone.now()):
                fecha_compra = timezone.make_aware(
                    fecha_compra,
                    timezone.get_current_timezone()
                )

            eventos.append({
                "fecha": fecha_compra,
                "tipo": "COMPRA",
                "cantidad": c.cantidad,
                "costo_unitario": costo_unitario_pen,
                "registro": f"{c.compra.tipo_comprobante} {c.compra.codigo_comprobante}",
            })

        # ===== SALIDAS =====
        for s in salidas:
            unidad = s.item_unidad
            detalle = unidad.compra_detalle
            orden = s.actividad.orden if s.actividad else None
            maquinaria = orden.maquinaria if orden else None

            costo_unitario = self._costo_unitario_pen(detalle) if detalle else Decimal("0.00")
            if costo_unitario is None:
                continue

            eventos.append({
                "fecha": s.fecha,
                "tipo": "SALIDA_REPUESTO",
                "cantidad": 1,
                "costo_unitario": costo_unitario,
                "registro": orden.codigo_orden if orden else "OT",
                "maquinaria": (
                    {
                        "id": maquinaria.id,
                        "codigo": maquinaria.codigo_maquina,
                        "nombre": maquinaria.nombre,
                    }
                    if maquinaria else None
                ),
            })
        
        for s in salidas_consumible:
            orden = s.actividad.orden if s.actividad else None
            maquinaria = orden.maquinaria if orden else None

            eventos.append({
                "fecha": s.fecha,
                "tipo": "SALIDA_CONSUMIBLE",
                "cantidad": s.cantidad,
                "costo_unitario": None,
                "registro": orden.codigo_orden if orden else "OT",
                "maquinaria": (
                    {
                        "id": maquinaria.id,
                        "codigo": maquinaria.codigo_maquina,
                        "nombre": maquinaria.nombre,
                    }
                    if maquinaria else None
                ),
            })

        # ===== ORDEN CRONOLÓGICO =====
        eventos.sort(key=lambda x: x["fecha"])

        kardex = []
        stock = 0
        costo_total = Decimal("0.00")
        costo_promedio = Decimal("0.00")

        for e in eventos:
            inv_inicial = stock

            if e["tipo"] == "COMPRA":
                entrada = e["cantidad"]
                salida = 0

                total_entrada = e["cantidad"] * e["costo_unitario"]
                costo_total += total_entrada
                stock += entrada
                costo_promedio = costo_total / stock if stock > 0 else Decimal("0.00")

            else:
                entrada = 0
                salida = e["cantidad"]
                costo_salida = (
                    e["costo_unitario"]
                    if e["costo_unitario"] is not None
                    else costo_promedio
                )

                costo_total -= costo_salida * salida
                stock -= salida

            kardex.append({
                "fecha": e["fecha"],
                "registro": e["registro"],
                "inventario_inicial": inv_inicial,
                "entrada": entrada,
                "salida": salida,
                "costo_unitario": round(
                    e["costo_unitario"]
                    if e["tipo"] == "SALIDA_REPUESTO"
                    else costo_promedio,
                    2
                ),
                "inventario_final_cantidad": stock,
                "inventario_final_costo": round(costo_total, 2),
                "maquinaria": e.get("maquinaria"),
            })

        return Response(KardexContableSerializer(kardex, many=True).data)
    
    @action(detail=True, methods=["post"], permission_classes=[CambioEquipoPermission])
    def cambiar_estado_unidad(self, request, pk=None):
        """
        Cambia la ubicacion de una unidad y conserva el estado indicado.
        body: { "unidad_id": 1, "nuevo_estado": "USADO", "maquinaria_id": null, "almacen_id": null }
        """
        item = self.get_object()

        if item.tipo_insumo == Item.TipoInsumo.HERRAMIENTA and not is_storage_user(request.user):
            raise PermissionDenied("Solo el area de almacen puede cambiar la ubicacion de herramientas.")

        unidad_id = request.data.get("unidad_id")
        nuevo_estado = request.data.get("nuevo_estado")
        maquinaria_id = request.data.get("maquinaria_id")
        almacen_id = request.data.get("almacen_id")
        trabajador_id = request.data.get("trabajador_id")

        if not unidad_id or not nuevo_estado:
            return Response(
                {"detail": "unidad_id y nuevo_estado son requeridos"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            unidad = ItemUnidad.objects.get(id=unidad_id, item=item)
        except ItemUnidad.DoesNotExist:
            return Response({"detail": "Unidad no encontrada para este item"}, status=status.HTTP_404_NOT_FOUND)

        if nuevo_estado not in dict(ItemUnidad.Estado.choices):
            return Response(
                {"detail": f"Estado invalido: {nuevo_estado}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        destinos = [maquinaria_id, almacen_id, trabajador_id]
        if sum(bool(destino) for destino in destinos) != 1:
            return Response(
                {"detail": "Debe especificar una unica ubicacion."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        almacen = Almacen.objects.filter(id=almacen_id).first() if almacen_id else None
        maquinaria = Maquinaria.objects.filter(id=maquinaria_id).first() if maquinaria_id else None
        trabajador = Trabajador.objects.filter(id=trabajador_id).first() if trabajador_id else None

        if almacen_id and not almacen:
            return Response({"detail": "Almacen invalido"}, status=status.HTTP_400_BAD_REQUEST)
        if maquinaria_id and not maquinaria:
            return Response({"detail": "Maquinaria invalida"}, status=status.HTTP_400_BAD_REQUEST)
        if trabajador_id and not trabajador:
            return Response({"detail": "Trabajador invalido"}, status=status.HTTP_400_BAD_REQUEST)

        if item.tipo_insumo == Item.TipoInsumo.HERRAMIENTA:
            if maquinaria:
                return Response(
                    {"detail": "Las herramientas no se asignan a maquinaria."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if trabajador and not self._trabajador_es_tecnico(trabajador):
                return Response(
                    {"detail": "Las herramientas solo pueden asignarse a tecnicos."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        historial_actual = HistorialUbicacionItem.objects.filter(
            item_unidad=unidad,
            fecha_fin__isnull=True,
        ).first()
        if historial_actual:
            historial_actual.cerrar()

        unidad.estado = nuevo_estado
        unidad.save(update_fields=["estado"])

        HistorialUbicacionItem.objects.create(
            item_unidad=unidad,
            maquinaria=maquinaria,
            almacen=almacen,
            trabajador=trabajador,
            estado=nuevo_estado,
        )

        return Response({
            "unidad_id": unidad.id,
            "nuevo_estado": unidad.estado,
            "serie": unidad.serie,
        })
    def perform_update(self, serializer):
        serializer.save()
    


class MaquinariaViewSet(viewsets.ModelViewSet):
    queryset = Maquinaria.objects.all()
    serializer_class = MaquinariaSerializer
    permission_classes = [CatalogoPermission]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return MaquinariaDetalleSerializer
        return MaquinariaSerializer

    @staticmethod
    def _resolver_vida_util(inicio, siguiente_inicio=None, fin=None):
        if inicio is None:
            return None

        inicio = Decimal(inicio)
        fin_candidato = None

        if siguiente_inicio is not None:
            siguiente_inicio = Decimal(siguiente_inicio)
            if siguiente_inicio > inicio:
                fin_candidato = siguiente_inicio

        if fin_candidato is None and fin is not None:
            fin = Decimal(fin)
            if fin > inicio:
                fin_candidato = fin

        if fin_candidato is None:
            return None

        return fin_candidato - inicio

    @staticmethod
    def _registrar_vida_matriz(
        matriz,
        item_id,
        item_codigo,
        item_nombre,
        tipo_insumo,
        maquinaria_id,
        vida_util,
        costo_total=Decimal("0.00"),
    ):
        if vida_util is None or vida_util <= 0:
            return

        fila = matriz.setdefault(
            item_id,
            {
                "item_id": item_id,
                "item_codigo": item_codigo,
                "item_nombre": item_nombre,
                "tipo_insumo": tipo_insumo,
                "values": {},
            },
        )

        llave_maquinaria = str(maquinaria_id)
        celda = fila["values"].setdefault(
            llave_maquinaria,
            {
                "sum": Decimal("0.00"),
                "cost_sum": Decimal("0.00"),
                "count": 0,
            },
        )
        celda["sum"] += vida_util
        celda["cost_sum"] += Decimal(costo_total or 0)
        celda["count"] += 1

    @staticmethod
    def _puede_ver_gestion(user):
        return (
            user.is_staff
            or is_maintenance_boss(user)
            or is_compras_user(user)
            or user.groups.filter(name="Jefe de Almaceneros").exists()
        )

    @staticmethod
    def _parse_fecha_param(value, field_name):
        if not value:
            return None

        try:
            return datetime.strptime(value, "%Y-%m-%d").date()
        except ValueError as exc:
            raise ValidationError(
                {field_name: "La fecha debe tener formato YYYY-MM-DD."}
            ) from exc

    @staticmethod
    def _duracion_horas_orden(orden):
        hora_inicio = orden.get("hora_inicio")
        hora_fin = orden.get("hora_fin")

        if not hora_inicio or not hora_fin:
            return None

        minutos_inicio = hora_inicio.hour * 60 + hora_inicio.minute
        minutos_fin = hora_fin.hour * 60 + hora_fin.minute
        diferencia_minutos = minutos_fin - minutos_inicio

        if diferencia_minutos <= 0:
            return None

        return Decimal(diferencia_minutos) / Decimal("60")

    @action(detail=False, methods=["get"], url_path="gestion-matriz", permission_classes=[IsAuthenticated])
    def gestion_matriz(self, request):
        if not self._puede_ver_gestion(request.user):
            raise PermissionDenied("No tienes permisos para visualizar la matriz de gestion.")

        maquinarias_ot = (
            OrdenTrabajo.objects
            .filter(maquinaria__isnull=False)
            .values(
                "maquinaria_id",
                "maquinaria__codigo_maquina",
                "maquinaria__nombre",
            )
            .distinct()
            .order_by(
                "maquinaria__codigo_maquina",
                "maquinaria__nombre",
                "maquinaria_id",
            )
        )

        maquinarias = [
            {
                "id": maquinaria["maquinaria_id"],
                "codigo_maquina": maquinaria["maquinaria__codigo_maquina"],
                "nombre": maquinaria["maquinaria__nombre"],
            }
            for maquinaria in maquinarias_ot
        ]

        matriz = {}

        historiales_repuesto = list(
            HistorialUbicacionItem.objects
            .select_related(
                "item_unidad__item",
                "item_unidad__compra_detalle",
                "item_unidad__compra_detalle__compra",
            )
            .filter(
                maquinaria__isnull=False,
                estado=ItemUnidad.Estado.USADO,
            )
            .order_by("item_unidad_id", "fecha_inicio", "id")
        )

        grupo_repuesto = []
        unidad_actual = None
        for historial in historiales_repuesto:
            if unidad_actual is None:
                unidad_actual = historial.item_unidad_id

            if historial.item_unidad_id != unidad_actual:
                for index, actual in enumerate(grupo_repuesto):
                    siguiente = grupo_repuesto[index + 1] if index + 1 < len(grupo_repuesto) else None
                    vida_util = self._resolver_vida_util(
                        actual.horometro_inicio,
                        siguiente_inicio=getattr(siguiente, "horometro_inicio", None),
                        fin=actual.horometro_fin,
                    )
                    self._registrar_vida_matriz(
                        matriz=matriz,
                        item_id=actual.item_unidad.item_id,
                        item_codigo=actual.item_unidad.item.codigo,
                        item_nombre=actual.item_unidad.item.nombre,
                        tipo_insumo=actual.item_unidad.item.tipo_insumo,
                        maquinaria_id=actual.maquinaria_id,
                        vida_util=vida_util,
                        costo_total=self._costo_total_pen_asociado_a_unidad(
                            actual.item_unidad.compra_detalle
                        ),
                    )

                grupo_repuesto = []
                unidad_actual = historial.item_unidad_id

            grupo_repuesto.append(historial)

        if grupo_repuesto:
            for index, actual in enumerate(grupo_repuesto):
                siguiente = grupo_repuesto[index + 1] if index + 1 < len(grupo_repuesto) else None
                vida_util = self._resolver_vida_util(
                    actual.horometro_inicio,
                    siguiente_inicio=getattr(siguiente, "horometro_inicio", None),
                    fin=actual.horometro_fin,
                )
                self._registrar_vida_matriz(
                    matriz=matriz,
                    item_id=actual.item_unidad.item_id,
                    item_codigo=actual.item_unidad.item.codigo,
                    item_nombre=actual.item_unidad.item.nombre,
                    tipo_insumo=actual.item_unidad.item.tipo_insumo,
                    maquinaria_id=actual.maquinaria_id,
                    vida_util=vida_util,
                    costo_total=self._costo_total_pen_asociado_a_unidad(
                        actual.item_unidad.compra_detalle
                    ),
                )

        historiales_consumible = list(
            HistorialConsumible.objects
            .select_related(
                "item",
                "lote__compra_detalle",
                "lote__compra_detalle__compra",
            )
            .filter(maquinaria__isnull=False)
            .order_by("lote_id", "fecha_inicio", "id")
        )

        grupo_consumible = []
        lote_actual = None
        for historial in historiales_consumible:
            if lote_actual is None:
                lote_actual = historial.lote_id

            if historial.lote_id != lote_actual:
                for actual in grupo_consumible:
                    vida_util = self._resolver_vida_util(
                        actual.horometro_inicio,
                        fin=actual.horometro_fin,
                    )
                    self._registrar_vida_matriz(
                        matriz=matriz,
                        item_id=actual.item_id,
                        item_codigo=actual.item.codigo,
                        item_nombre=actual.item.nombre,
                        tipo_insumo=actual.item.tipo_insumo,
                        maquinaria_id=actual.maquinaria_id,
                        vida_util=vida_util,
                        costo_total=Decimal(actual.cantidad or 0)
                        * self._costo_unitario_pen_por_detalle(
                            actual.lote.compra_detalle if actual.lote_id else None
                        ),
                    )

                grupo_consumible = []
                lote_actual = historial.lote_id

            grupo_consumible.append(historial)

        if grupo_consumible:
            for actual in grupo_consumible:
                vida_util = self._resolver_vida_util(
                    actual.horometro_inicio,
                    fin=actual.horometro_fin,
                )
                self._registrar_vida_matriz(
                    matriz=matriz,
                    item_id=actual.item_id,
                    item_codigo=actual.item.codigo,
                    item_nombre=actual.item.nombre,
                    tipo_insumo=actual.item.tipo_insumo,
                    maquinaria_id=actual.maquinaria_id,
                    vida_util=vida_util,
                    costo_total=Decimal(actual.cantidad or 0)
                    * self._costo_unitario_pen_por_detalle(
                        actual.lote.compra_detalle if actual.lote_id else None
                    ),
                )

        filas = []
        total_muestras = 0

        for fila in sorted(matriz.values(), key=lambda row: (row["item_codigo"], row["item_nombre"])):
            valores = {}
            muestras_fila = 0

            for maquinaria in maquinarias:
                llave_maquinaria = str(maquinaria["id"])
                celda = fila["values"].get(llave_maquinaria)

                if not celda or not celda["count"]:
                    valores[llave_maquinaria] = None
                    continue

                promedio = round(celda["sum"] / Decimal(celda["count"]), 2)
                valores[llave_maquinaria] = {
                    "promedio_vida": float(promedio),
                    "costo_total": float(round(celda["cost_sum"], 2)),
                    "muestras": celda["count"],
                }
                muestras_fila += celda["count"]

            total_muestras += muestras_fila
            filas.append(
                {
                    "item_id": fila["item_id"],
                    "item_codigo": fila["item_codigo"],
                    "item_nombre": fila["item_nombre"],
                    "tipo_insumo": fila["tipo_insumo"],
                    "muestras": muestras_fila,
                    "values": valores,
                }
            )

        return Response(
            {
                "maquinarias": [
                    {
                        "id": maquinaria["id"],
                        "codigo": maquinaria["codigo_maquina"],
                        "nombre": maquinaria["nombre"],
                    }
                    for maquinaria in maquinarias
                ],
                "rows": filas,
                "meta": {
                    "total_items": len(filas),
                    "total_maquinarias": len(maquinarias),
                    "total_muestras": total_muestras,
                },
            }
        )

    @action(
        detail=False,
        methods=["get"],
        url_path="gestion-matriz-proveedores-repuestos",
        permission_classes=[IsAuthenticated],
    )
    def gestion_matriz_proveedores_repuestos(self, request):
        if not self._puede_ver_gestion(request.user):
            raise PermissionDenied("No tienes permisos para visualizar la matriz de proveedores por repuesto.")

        proveedores_qs = (
            Proveedor.objects
            .filter(compras__detalles__item__isnull=False)
            .distinct()
            .order_by("nombre", "id")
        )

        proveedores = [
            {
                "id": proveedor.id,
                "nombre": proveedor.nombre,
                "ruc": proveedor.ruc,
            }
            for proveedor in proveedores_qs
        ]

        matriz = {}

        historiales_repuesto = (
            HistorialUbicacionItem.objects
            .select_related(
                "item_unidad__item",
                "item_unidad__item__unidad_medida",
                "item_unidad__compra_detalle",
                "item_unidad__compra_detalle__compra",
                "item_unidad__compra_detalle__compra__proveedor",
            )
            .filter(
                item_unidad__item__tipo_insumo=Item.TipoInsumo.REPUESTO,
                item_unidad__compra_detalle__compra__proveedor__isnull=False,
                horometro_inicio__isnull=False,
                horometro_fin__isnull=False,
            )
            .order_by("item_unidad__item__codigo", "item_unidad__item__nombre", "id")
        )

        for historial in historiales_repuesto:
            vida_util = self._resolver_vida_util(
                historial.horometro_inicio,
                fin=historial.horometro_fin,
            )
            if vida_util is None or vida_util <= 0:
                continue

            detalle = historial.item_unidad.compra_detalle
            proveedor = detalle.compra.proveedor if detalle and detalle.compra_id else None
            if not proveedor:
                continue

            valor_unitario = self._valor_unitario_pen_por_detalle(detalle)
            item = historial.item_unidad.item

            fila = matriz.setdefault(
                item.id,
                {
                    "item_id": item.id,
                    "item_codigo": item.codigo,
                    "item_nombre": item.nombre,
                    "tipo_insumo": item.tipo_insumo,
                    "unidad_simbolo": item.unidad_medida.simbolo if item.unidad_medida_id else "",
                    "values": {},
                },
            )

            llave_proveedor = str(proveedor.id)
            celda = fila["values"].setdefault(
                llave_proveedor,
                {
                    "sum_valor_unitario": Decimal("0.00"),
                    "sum_vida_util": Decimal("0.00"),
                    "count": 0,
                },
            )
            celda["sum_valor_unitario"] += valor_unitario
            celda["sum_vida_util"] += vida_util
            celda["count"] += 1

        historiales_consumible = (
            HistorialConsumible.objects
            .select_related(
                "item",
                "item__unidad_medida",
                "lote__compra_detalle",
                "lote__compra_detalle__compra",
                "lote__compra_detalle__compra__proveedor",
            )
            .filter(
                item__tipo_insumo=Item.TipoInsumo.CONSUMIBLE,
                orden_trabajo__isnull=False,
                lote__compra_detalle__compra__proveedor__isnull=False,
                horometro_inicio__isnull=False,
                horometro_fin__isnull=False,
            )
            .order_by("item__codigo", "item__nombre", "id")
        )

        for historial in historiales_consumible:
            vida_util = self._resolver_vida_util(
                historial.horometro_inicio,
                fin=historial.horometro_fin,
            )
            if vida_util is None or vida_util <= 0:
                continue

            detalle = historial.lote.compra_detalle if historial.lote_id else None
            proveedor = detalle.compra.proveedor if detalle and detalle.compra_id else None
            if not proveedor:
                continue

            valor_unitario = self._valor_unitario_pen_por_detalle(detalle)
            item = historial.item

            fila = matriz.setdefault(
                item.id,
                {
                    "item_id": item.id,
                    "item_codigo": item.codigo,
                    "item_nombre": item.nombre,
                    "tipo_insumo": item.tipo_insumo,
                    "unidad_simbolo": item.unidad_medida.simbolo if item.unidad_medida_id else "",
                    "values": {},
                },
            )

            llave_proveedor = str(proveedor.id)
            celda = fila["values"].setdefault(
                llave_proveedor,
                {
                    "sum_valor_unitario": Decimal("0.00"),
                    "sum_vida_util": Decimal("0.00"),
                    "count": 0,
                },
            )
            celda["sum_valor_unitario"] += valor_unitario
            celda["sum_vida_util"] += vida_util
            celda["count"] += 1

        filas = []
        total_muestras = 0
        items = (
            Item.objects
            .select_related("unidad_medida")
            .order_by("codigo", "nombre", "id")
        )

        for item in items:
            fila = matriz.get(
                item.id,
                {
                    "item_id": item.id,
                    "item_codigo": item.codigo,
                    "item_nombre": item.nombre,
                    "tipo_insumo": item.tipo_insumo,
                    "unidad_simbolo": item.unidad_medida.simbolo if item.unidad_medida_id else "",
                    "values": {},
                },
            )
            muestras_fila = 0
            valores = {}

            for proveedor in proveedores:
                llave_proveedor = str(proveedor["id"])
                celda = fila["values"].get(llave_proveedor)

                if not celda or not celda["count"]:
                    valores[llave_proveedor] = None
                    continue

                promedio_valor_unitario = round(
                    celda["sum_valor_unitario"] / Decimal(celda["count"]),
                    2,
                )
                promedio_vida_util = round(
                    celda["sum_vida_util"] / Decimal(celda["count"]),
                    2,
                )
                valores[llave_proveedor] = {
                    "promedio_valor_unitario": float(promedio_valor_unitario),
                    "promedio_vida_util": float(promedio_vida_util),
                    "muestras": celda["count"],
                }
                muestras_fila += celda["count"]

            total_muestras += muestras_fila
            filas.append(
                {
                    "item_id": fila["item_id"],
                    "item_codigo": fila["item_codigo"],
                    "item_nombre": fila["item_nombre"],
                    "tipo_insumo": fila["tipo_insumo"],
                    "unidad_simbolo": fila["unidad_simbolo"],
                    "muestras": muestras_fila,
                    "values": valores,
                }
            )

        return Response(
            {
                "proveedores": proveedores,
                "rows": filas,
                "meta": {
                    "total_items": len(filas),
                    "total_proveedores": len(proveedores),
                    "total_muestras": total_muestras,
                },
            }
        )

    @action(detail=False, methods=["get"], url_path="gestion-historial-items", permission_classes=[IsAuthenticated])
    def gestion_historial_items(self, request):
        if not self._puede_ver_gestion(request.user):
            raise PermissionDenied("No tienes permisos para visualizar el resumen de gestion.")

        fecha_desde = self._parse_fecha_param(
            request.query_params.get("fecha_desde"),
            "fecha_desde",
        )
        fecha_hasta = self._parse_fecha_param(
            request.query_params.get("fecha_hasta"),
            "fecha_hasta",
        )

        if fecha_desde and fecha_hasta and fecha_desde > fecha_hasta:
            raise ValidationError(
                {"fecha_hasta": "La fecha hasta debe ser posterior o igual a la fecha desde."}
            )

        repuestos_qs = HistorialUbicacionItem.objects.filter(
            item_unidad__item__isnull=False,
            orden_trabajo__isnull=False,
            horometro_fin__isnull=False,
        )
        consumibles_qs = HistorialConsumible.objects.filter(
            item__isnull=False,
            orden_trabajo__isnull=False,
            horometro_fin__isnull=False,
        )

        if fecha_desde:
            repuestos_qs = repuestos_qs.filter(orden_trabajo__fecha__gte=fecha_desde)
            consumibles_qs = consumibles_qs.filter(orden_trabajo__fecha__gte=fecha_desde)

        if fecha_hasta:
            repuestos_qs = repuestos_qs.filter(orden_trabajo__fecha__lte=fecha_hasta)
            consumibles_qs = consumibles_qs.filter(orden_trabajo__fecha__lte=fecha_hasta)

        repuestos_cerrados = {}
        repuestos_valorizados = {}
        repuestos_duracion_horas = {}
        for historial in repuestos_qs.select_related(
            "item_unidad__item",
            "item_unidad__compra_detalle",
            "item_unidad__compra_detalle__compra",
            "orden_trabajo",
        ):
            item_id = historial.item_unidad.item_id
            repuestos_cerrados[item_id] = repuestos_cerrados.get(item_id, 0) + 1
            repuestos_valorizados[item_id] = repuestos_valorizados.get(
                item_id,
                Decimal("0.00"),
            ) + Decimal(
                self._costo_unitario_pen_por_detalle(historial.item_unidad.compra_detalle)
            )
            duracion_horas = self._duracion_horas_orden(
                {
                    "hora_inicio": historial.orden_trabajo.hora_inicio,
                    "hora_fin": historial.orden_trabajo.hora_fin,
                }
            )
            if duracion_horas is not None:
                repuestos_duracion_horas[item_id] = repuestos_duracion_horas.get(
                    item_id,
                    Decimal("0.00"),
                ) + Decimal(duracion_horas)

        consumibles_cerrados = {}
        consumibles_valorizados = {}
        for historial in consumibles_qs.select_related(
            "item",
            "lote__compra_detalle",
            "lote__compra_detalle__compra",
        ):
            item_id = historial.item_id
            cantidad = Decimal(historial.cantidad or 0)
            consumibles_cerrados[item_id] = consumibles_cerrados.get(
                item_id,
                Decimal("0"),
            ) + cantidad
            costo_unitario = self._costo_unitario_pen_por_detalle(
                historial.lote.compra_detalle if historial.lote else None
            )
            consumibles_valorizados[item_id] = consumibles_valorizados.get(
                item_id,
                Decimal("0.00"),
            ) + (cantidad * Decimal(costo_unitario))

        filas = []
        items_con_historial = 0

        for item in Item.objects.select_related("unidad_medida").order_by("codigo", "nombre", "id"):
            if item.tipo_insumo == Item.TipoInsumo.REPUESTO:
                cantidad_valor = repuestos_cerrados.get(item.id, 0)
                valor_monetario = repuestos_valorizados.get(item.id, Decimal("0.00"))
                duracion_horas_total = repuestos_duracion_horas.get(item.id, Decimal("0.00"))
            elif item.tipo_insumo == Item.TipoInsumo.CONSUMIBLE:
                cantidad_valor = consumibles_cerrados.get(item.id, Decimal("0"))
                valor_monetario = consumibles_valorizados.get(item.id, Decimal("0.00"))
                duracion_horas_total = Decimal("0.00")
            else:
                cantidad_valor = 0
                valor_monetario = Decimal("0.00")
                duracion_horas_total = Decimal("0.00")

            if cantidad_valor:
                items_con_historial += 1

            filas.append(
                {
                    "item_id": item.id,
                    "item_codigo": item.codigo,
                    "item_nombre": item.nombre,
                    "tipo_insumo": item.tipo_insumo,
                    "cantidad": (
                        int(cantidad_valor)
                        if item.tipo_insumo in Item.tipos_con_unidades()
                        else float(cantidad_valor)
                    ),
                    "valor_monetario": float(round(valor_monetario, 2)),
                    "duracion_horas_total": float(round(duracion_horas_total, 2)),
                    "unidad_simbolo": item.unidad_medida.simbolo if item.unidad_medida_id else "",
                }
            )

        return Response(
            {
                "rows": filas,
                "meta": {
                    "total_items": len(filas),
                    "items_con_historial": items_con_historial,
                    "total_repuestos_cerrados": sum(repuestos_cerrados.values()),
                    "total_consumibles_cerrados": float(
                        sum(consumibles_cerrados.values(), Decimal("0"))
                    ),
                    "total_valor_monetario": float(
                        round(
                            sum(repuestos_valorizados.values(), Decimal("0.00"))
                            + sum(consumibles_valorizados.values(), Decimal("0.00")),
                            2,
                        )
                    ),
                    "total_duracion_horas_repuestos": float(
                        round(sum(repuestos_duracion_horas.values(), Decimal("0.00")), 2)
                    ),
                    "fecha_desde": fecha_desde.isoformat() if fecha_desde else None,
                    "fecha_hasta": fecha_hasta.isoformat() if fecha_hasta else None,
                },
            }
        )

    @action(detail=False, methods=["get"], url_path="gestion-bubble-repuestos", permission_classes=[IsAuthenticated])
    def gestion_bubble_repuestos(self, request):
        if not self._puede_ver_gestion(request.user):
            raise PermissionDenied("No tienes permisos para visualizar el bubble chart de repuestos.")

        buckets = {}

        historiales = (
            HistorialUbicacionItem.objects
            .select_related(
                "item_unidad__item",
                "item_unidad__compra_detalle",
                "item_unidad__compra_detalle__compra",
                "orden_trabajo",
            )
            .filter(
                item_unidad__item__tipo_insumo=Item.TipoInsumo.REPUESTO,
                horometro_inicio__isnull=False,
                horometro_fin__isnull=False,
            )
            .order_by("item_unidad__item__codigo", "item_unidad__item__nombre", "id")
        )

        for historial in historiales:
            vida_util = self._resolver_vida_util(
                historial.horometro_inicio,
                fin=historial.horometro_fin,
            )
            if vida_util is None or vida_util <= 0:
                continue

            item = historial.item_unidad.item
            bucket = buckets.setdefault(
                item.id,
                {
                    "item_id": item.id,
                    "item_codigo": item.codigo,
                    "item_nombre": item.nombre,
                    "sum_vida_util": Decimal("0.00"),
                    "sum_costo_total_compra": Decimal("0.00"),
                    "sum_duracion_ot": Decimal("0.00"),
                    "muestras": 0,
                    "muestras_con_duracion": 0,
                },
            )

            bucket["sum_vida_util"] += vida_util
            bucket["sum_costo_total_compra"] += self._costo_total_pen_asociado_a_unidad(
                historial.item_unidad.compra_detalle
            )
            bucket["muestras"] += 1

            duracion_ot = None
            if historial.orden_trabajo_id:
                duracion_ot = self._duracion_horas_orden(
                    {
                        "hora_inicio": historial.orden_trabajo.hora_inicio,
                        "hora_fin": historial.orden_trabajo.hora_fin,
                    }
                )

            if duracion_ot is not None and duracion_ot > 0:
                bucket["sum_duracion_ot"] += duracion_ot
                bucket["muestras_con_duracion"] += 1

        rows = []
        total_muestras = 0

        for bucket in sorted(
            buckets.values(),
            key=lambda row: (row["item_codigo"], row["item_nombre"], row["item_id"]),
        ):
            if not bucket["muestras"]:
                continue

            promedio_vida_util = bucket["sum_vida_util"] / Decimal(bucket["muestras"])
            promedio_duracion_ot = (
                bucket["sum_duracion_ot"] / Decimal(bucket["muestras_con_duracion"])
                if bucket["muestras_con_duracion"]
                else Decimal("0.00")
            )

            total_muestras += bucket["muestras"]
            rows.append(
                {
                    "item_id": bucket["item_id"],
                    "item_codigo": bucket["item_codigo"],
                    "item_nombre": bucket["item_nombre"],
                    "costo_total_compra": float(round(bucket["sum_costo_total_compra"], 2)),
                    "vida_util_promedio": float(round(promedio_vida_util, 2)),
                    "duracion_ot_promedio": float(round(promedio_duracion_ot, 2)),
                    "muestras": bucket["muestras"],
                    "muestras_con_duracion": bucket["muestras_con_duracion"],
                }
            )

        return Response(
            {
                "rows": rows,
                "meta": {
                    "total_items": len(rows),
                    "total_muestras": total_muestras,
                    "items_con_duracion_ot": sum(
                        1 for row in rows if row["muestras_con_duracion"] > 0
                    ),
                },
            }
        )

    @action(detail=False, methods=["get"], url_path="gestion-supervivencia-repuestos", permission_classes=[IsAuthenticated])
    def gestion_supervivencia_repuestos(self, request):
        if not self._puede_ver_gestion(request.user):
            raise PermissionDenied("No tienes permisos para visualizar la curva de supervivencia.")

        historiales_base = (
            HistorialUbicacionItem.objects
            .filter(
                item_unidad__item__tipo_insumo=Item.TipoInsumo.REPUESTO,
                maquinaria__isnull=False,
                orden_trabajo__isnull=False,
                horometro_fin__isnull=False,
            )
        )

        items_disponibles_qs = (
            historiales_base
            .values(
                "item_unidad__item_id",
                "item_unidad__item__codigo",
                "item_unidad__item__nombre",
            )
            .annotate(total_registros=Count("id"))
            .order_by("item_unidad__item__codigo", "item_unidad__item__nombre", "item_unidad__item_id")
        )

        items_disponibles = [
            {
                "id": row["item_unidad__item_id"],
                "codigo": row["item_unidad__item__codigo"],
                "nombre": row["item_unidad__item__nombre"],
                "total_registros": row["total_registros"],
            }
            for row in items_disponibles_qs
        ]

        selected_item_id = request.query_params.get("item_id")
        if selected_item_id:
            try:
                selected_item_id = int(selected_item_id)
            except (TypeError, ValueError) as exc:
                raise ValidationError({"item_id": "El item seleccionado no es valido."}) from exc
        elif items_disponibles:
            selected_item_id = items_disponibles[0]["id"]
        else:
            selected_item_id = None

        if selected_item_id is not None and not any(
            item["id"] == selected_item_id for item in items_disponibles
        ):
            raise ValidationError(
                {"item_id": "El item seleccionado no tiene historiales de repuesto utilizables."}
            )

        curve = []
        total_registros = 0
        selected_item = next(
            (item for item in items_disponibles if item["id"] == selected_item_id),
            None,
        )

        if selected_item_id is not None:
            eventos = list(
                historiales_base
                .filter(item_unidad__item_id=selected_item_id)
                .values("horometro_fin")
                .annotate(fallas=Count("id"))
                .order_by("horometro_fin")
            )

            total_registros = sum(int(evento["fallas"] or 0) for evento in eventos)
            restantes = total_registros

            for evento in eventos:
                fallas = int(evento["fallas"] or 0)
                restantes = max(restantes - fallas, 0)
                porcentaje_supervivencia = (
                    (Decimal(restantes) / Decimal(total_registros)) * Decimal("100")
                    if total_registros > 0
                    else Decimal("0")
                )
                curve.append(
                    {
                        "horometro": float(evento["horometro_fin"]),
                        "fallas": fallas,
                        "cantidad_restante": restantes,
                        "porcentaje_supervivencia": float(round(porcentaje_supervivencia, 2)),
                    }
                )

        return Response(
            {
                "items": items_disponibles,
                "selected_item": selected_item,
                "curve": curve,
                "meta": {
                    "total_registros": total_registros,
                },
            }
        )

    @action(detail=False, methods=["get"], url_path="gestion-indicadores-maquinaria", permission_classes=[IsAuthenticated])
    def gestion_indicadores_maquinaria(self, request):
        if not self._puede_ver_gestion(request.user):
            raise PermissionDenied("No tienes permisos para visualizar los indicadores de maquinaria.")

        maquinarias = list(
            Maquinaria.objects.all().order_by("codigo_maquina", "nombre", "id")
        )
        ordenes = list(
            OrdenTrabajo.objects
            .filter(maquinaria__isnull=False)
            .values("id", "maquinaria_id", "fecha", "hora_inicio", "hora_fin")
            .order_by("maquinaria_id", "fecha", "id")
        )

        fechas_por_maquinaria = {}
        duraciones_por_maquinaria = {}

        for orden in ordenes:
            maquinaria_id = orden["maquinaria_id"]
            fechas_por_maquinaria.setdefault(maquinaria_id, []).append(orden["fecha"])

            duracion_horas = self._duracion_horas_orden(orden)
            if duracion_horas is not None:
                duraciones_por_maquinaria.setdefault(maquinaria_id, []).append(duracion_horas)

        rows = []
        for maquinaria in maquinarias:
            fechas = fechas_por_maquinaria.get(maquinaria.id, [])
            mtbf_dias = None
            if len(fechas) >= 2:
                diferencias = [
                    Decimal((fechas[index] - fechas[index - 1]).days)
                    for index in range(1, len(fechas))
                ]
                if diferencias:
                    mtbf_dias = round(
                        sum(diferencias, Decimal("0")) / Decimal(len(diferencias)),
                        2,
                    )

            duraciones = duraciones_por_maquinaria.get(maquinaria.id, [])
            mttr_horas = None
            if duraciones:
                mttr_horas = round(
                    sum(duraciones, Decimal("0")) / Decimal(len(duraciones)),
                    2,
                )

            centro_costos = round(maquinaria.calcular_centro_costos(), 2)

            rows.append(
                {
                    "maquinaria_id": maquinaria.id,
                    "codigo": maquinaria.codigo_maquina,
                    "nombre": maquinaria.nombre,
                    "mtbf_dias": float(mtbf_dias) if mtbf_dias is not None else None,
                    "mttr_horas": float(mttr_horas) if mttr_horas is not None else None,
                    "centro_costos": float(centro_costos),
                }
            )

        return Response(
            {
                "rows": rows,
                "meta": {
                    "total_maquinarias": len(rows),
                    "maquinarias_con_mtbf": sum(1 for row in rows if row["mtbf_dias"] is not None),
                    "maquinarias_con_mttr": sum(1 for row in rows if row["mttr_horas"] is not None),
                },
            }
        )
    
    @staticmethod
    def _monto_pen_por_detalle(monto, detalle):
        if not detalle:
            return Decimal("0.00")

        monto = Decimal(monto)
        if detalle.moneda == Compra.Moneda.PEN:
            return monto

        tipo_cambio = TipoCambioDiario.objects.filter(fecha=detalle.compra.fecha).first()
        if not tipo_cambio:
            return Decimal("0.00")

        if detalle.moneda == Compra.Moneda.USD:
            if tipo_cambio.compra_usd <= 0:
                return Decimal("0.00")
            return monto * tipo_cambio.compra_usd

        if detalle.moneda == Compra.Moneda.EUR:
            if tipo_cambio.compra_eur <= 0:
                return Decimal("0.00")
            return monto * tipo_cambio.compra_eur

        return Decimal("0.00")

    @classmethod
    def _costo_unitario_pen_por_detalle(cls, detalle):
        if not detalle:
            return Decimal("0.00")
        return cls._monto_pen_por_detalle(detalle.costo_unitario, detalle)

    @classmethod
    def _valor_unitario_pen_por_detalle(cls, detalle):
        if not detalle:
            return Decimal("0.00")
        return cls._monto_pen_por_detalle(detalle.valor_unitario, detalle)

    @classmethod
    def _costo_total_pen_por_detalle(cls, detalle):
        if not detalle:
            return Decimal("0.00")
        return cls._monto_pen_por_detalle(detalle.costo_total, detalle)

    @classmethod
    def _costo_total_pen_asociado_a_unidad(cls, detalle):
        if not detalle or not detalle.cantidad:
            return Decimal("0.00")

        costo_total = cls._costo_total_pen_por_detalle(detalle)
        cantidad = Decimal(detalle.cantidad)
        if cantidad <= 0:
            return Decimal("0.00")

        return costo_total / cantidad

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def detalle(self, request, pk=None):
        maquinaria = self.get_object()
        serializer = MaquinariaDetalleSerializer(maquinaria)
        return Response(serializer.data)
    
    @action(detail=True, methods=["get"])
    def unidades(self, request, pk=None):
        maquinaria = self.get_object()

        historiales = (
            HistorialUbicacionItem.objects
            .select_related(
                "item_unidad__item",
                "item_unidad__compra_detalle",
                "item_unidad__compra_detalle__compra",
            )
            .filter(
                maquinaria=maquinaria,
                fecha_fin__isnull=True
            )
            .order_by("item_unidad__item__codigo")
        )

        historiales_consumible = (
            HistorialConsumible.objects
            .select_related(
                "item",
                "lote",
                "lote__compra_detalle",
                "lote__compra_detalle__compra",
            )
            .filter(
                maquinaria=maquinaria,
                fecha_fin__isnull=True,
            )
            .order_by("item__codigo", "lote_id", "id")
        )

        unidades = []
        centro_costos = Decimal("0.00")

        for h in historiales:
            unidad = h.item_unidad
            detalle = unidad.compra_detalle
            costo = self._costo_unitario_pen_por_detalle(detalle)

            centro_costos += costo

            unidades.append({
                "unidad_id": unidad.id,
                "item_codigo": unidad.item.codigo,
                "item_nombre": unidad.item.nombre,
                "serie": unidad.serie,
                "estado": h.estado,
                "cantidad": Decimal("1"),
                "costo_unitario": round(costo, 2),
                "costo": round(costo, 2),
                "tipo_insumo": unidad.item.tipo_insumo,
            })

        for h in historiales_consumible:
            detalle = h.lote.compra_detalle if h.lote else None
            costo_unitario = self._costo_unitario_pen_por_detalle(detalle)
            costo_total = Decimal(costo_unitario) * Decimal(h.cantidad)
            centro_costos += costo_total

            unidades.append({
                "unidad_id": f"CONS-{h.id}",
                "item_codigo": h.item.codigo,
                "item_nombre": h.item.nombre,
                "serie": f"Lote #{h.lote_id}",
                "estado": "NUEVO",
                "cantidad": h.cantidad,
                "costo_unitario": round(costo_unitario, 2),
                "costo": round(costo_total, 2),
                "tipo_insumo": h.item.tipo_insumo,
            })

        return Response({
            "maquinaria": {
                "id": maquinaria.id,
                "codigo": maquinaria.codigo_maquina,
                "nombre": maquinaria.nombre,
            },
            "unidades": unidades,
            "centro_costos": round(centro_costos, 2),
        })


class TipoCambioDiarioViewSet(viewsets.ModelViewSet):
    queryset = TipoCambioDiario.objects.all().order_by("-fecha")
    serializer_class = TipoCambioDiarioSerializer
    permission_classes = [CompraPermission]

class CompraViewSet(viewsets.ModelViewSet):
    queryset = (
        CompraDetalle.objects
        .select_related("compra", "compra__proveedor", "item", "unidad_medida")
        .all()
        .order_by("-compra__fecha")
    )
    permission_classes = [CompraPermission]

    def get_serializer_class(self):
        if self.action in ["create", "batch"]:
            return CompraCreateSerializer
        return CompraDetalleListSerializer # Para el listado general

    @action(detail=False, methods=["post"])
    def batch(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


    @action(detail=False, methods=["post"], url_path="eliminar-registro")
    def eliminar_registro(self, request):
        compra_id = request.data.get("compra_id")
        if not compra_id:
            return Response({"detail": "Debes enviar compra_id."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            compra = Compra.objects.prefetch_related("detalles__item").get(pk=compra_id)
        except Compra.DoesNotExist:
            return Response({"detail": "Compra no encontrada."}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            detalles = list(compra.detalles.select_related("item"))

            for detalle in detalles:
                item = detalle.item

                if item.tipo_insumo in Item.tipos_con_unidades():
                    unidades = ItemUnidad.objects.filter(compra_detalle=detalle)
                    HistorialUbicacionItem.objects.filter(item_unidad__in=unidades).delete()
                    MovimientoRepuesto.objects.filter(item_unidad__in=unidades).delete()
                    unidades.delete()
                else:
                    lotes = LoteConsumible.objects.filter(compra_detalle=detalle)
                    HistorialConsumible.objects.filter(lote__in=lotes).delete()
                    MovimientoConsumible.objects.filter(item=item).delete()
                    lotes.delete()

                detalle.delete()

            compra.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


class OrdenCompraViewSet(viewsets.ModelViewSet):
    queryset = (
        OrdenCompra.objects
        .select_related("emitido_por", "confirmado_por")
        .prefetch_related("detalles__item", "detalles__proveedor")
        .all()
    )
    serializer_class = OrdenCompraSerializer
    permission_classes = [OrdenCompraPermission]

    def get_queryset(self):
        queryset = super().get_queryset()
        estado = self.request.query_params.get("estado")
        if estado:
            queryset = queryset.filter(estado=estado)
        return queryset

    def perform_create(self, serializer):
        if not is_storage_user(self.request.user):
            raise PermissionDenied("Solo el área de almacén puede emitir órdenes de compra.")
        serializer.save()

    @action(detail=True, methods=["post"])
    def cambiar_estado(self, request, pk=None):
        if not is_compras_user(request.user):
            raise PermissionDenied("Solo el área de compras puede cambiar el estado.")

        orden = self.get_object()
        nuevo_estado = request.data.get("estado")
        transiciones = {
            OrdenCompra.Estado.PENDIENTE: OrdenCompra.Estado.REVISADO,
            OrdenCompra.Estado.REVISADO: OrdenCompra.Estado.EN_PROCESO,
            OrdenCompra.Estado.EN_PROCESO: OrdenCompra.Estado.RECIBIDO,
        }

        esperado = transiciones.get(orden.estado)
        if nuevo_estado != esperado:
            return Response(
                {"detail": f"Transición inválida. El siguiente estado permitido es {esperado or 'ninguno'}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        orden.estado = nuevo_estado
        orden.save()
        return Response(self.get_serializer(orden).data)

    @action(detail=True, methods=["post"])
    def confirmar_recepcion(self, request, pk=None):
        if not is_storage_user(request.user):
            raise PermissionDenied("Solo el área de almacén puede confirmar la recepción final.")

        orden = self.get_object()
        if orden.estado != OrdenCompra.Estado.RECIBIDO:
            return Response(
                {"detail": "La orden debe estar en estado Recibido para confirmar la recepción."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if orden.recepcion_confirmada:
            return Response(
                {"detail": "La recepción ya fue confirmada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        orden.recepcion_confirmada = True
        orden.fecha_confirmacion_recepcion = timezone.now()
        orden.confirmado_por = request.user
        orden.save()
        return Response(self.get_serializer(orden).data)


class OrdenRequerimientoViewSet(viewsets.ModelViewSet):
    queryset = (
        OrdenRequerimiento.objects
        .select_related(
            "trabajo",
            "tecnico_asignado",
            "emitido_por",
            "confirmado_por_tecnico",
        )
        .prefetch_related("detalles__item", "detalles__proveedor")
        .all()
    )
    serializer_class = OrdenRequerimientoSerializer
    permission_classes = [OrdenRequerimientoPermission]

    @staticmethod
    def _estados_disponibles_unidad():
        return [
            ItemUnidad.Estado.NUEVO,
            ItemUnidad.Estado.USADO,
            ItemUnidad.Estado.REPARADO,
        ]

    def _get_trabajador_request(self):
        user = getattr(self.request, "user", None)
        if not user or not user.is_authenticated:
            return None

        try:
            return user.perfil.trabajador
        except (AttributeError, PerfilUsuario.DoesNotExist):
            return None

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        trabajo_id = self.request.query_params.get("trabajo")
        estado = self.request.query_params.get("estado")

        if trabajo_id:
            queryset = queryset.filter(trabajo_id=trabajo_id)
        if estado:
            queryset = queryset.filter(estado=estado)

        if is_tecnico_user(user) and not is_storage_user(user) and not is_maintenance_boss(user):
            trabajador = self._get_trabajador_request()
            if not trabajador:
                return queryset.none()
            return queryset.filter(tecnico_asignado=trabajador)

        return queryset

    def perform_create(self, serializer):
        if not is_maintenance_boss(self.request.user):
            raise PermissionDenied("Solo el jefe de mantenimiento puede emitir órdenes de requerimiento.")
        serializer.save()

    def partial_update(self, request, *args, **kwargs):
        if not is_maintenance_boss(request.user):
            raise PermissionDenied("Solo el jefe de mantenimiento puede actualizar esta orden.")

        permitidos = {"tecnico_asignado", "observaciones"}
        extras = set(request.data.keys()) - permitidos
        if extras:
            return Response(
                {"detail": "Solo se puede actualizar el técnico asignado u observaciones."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().partial_update(request, *args, **kwargs)

    def _entregar_repuestos(self, orden, detalle, tecnico):
        cantidad_decimal = Decimal(detalle.cantidad)
        cantidad_entera = int(cantidad_decimal)
        if Decimal(cantidad_entera) != cantidad_decimal:
            raise ValidationError(
                f"El item {detalle.item.codigo} requiere una cantidad entera para items por unidad."
            )

        historiales = list(
            HistorialUbicacionItem.objects
            .select_related("item_unidad")
            .filter(
                item_unidad__item=detalle.item,
                almacen__isnull=False,
                fecha_fin__isnull=True,
                item_unidad__estado__in=self._estados_disponibles_unidad(),
            )
            .exclude(item_unidad__estado=ItemUnidad.Estado.INOPERATIVO)
            .order_by("fecha_inicio", "id")[:cantidad_entera]
        )

        if len(historiales) < cantidad_entera:
            raise ValidationError(
                f"No hay suficientes unidades en almacén para {detalle.item.codigo}."
            )

        for historial in historiales:
            unidad = historial.item_unidad
            HistorialUbicacionItem.objects.create(
                item_unidad=unidad,
                trabajador=tecnico,
                orden_trabajo=orden.trabajo,
                estado=unidad.estado,
            )

    def _entregar_consumibles(self, orden, detalle, tecnico):
        restante = Decimal(detalle.cantidad)
        historiales = list(
            HistorialConsumible.objects
            .select_related("lote", "almacen", "item", "unidad_medida")
            .filter(
                item=detalle.item,
                almacen__isnull=False,
                fecha_fin__isnull=True,
                cantidad__gt=0,
            )
            .order_by("fecha_inicio", "id")
        )

        disponible_total = sum(Decimal(h.cantidad) for h in historiales)
        if disponible_total < restante:
            raise ValidationError(
                f"No hay stock suficiente en almacén para {detalle.item.codigo}."
            )

        now = timezone.now()
        for historial in historiales:
            if restante <= 0:
                break

            cantidad_historial = Decimal(historial.cantidad)
            mover = min(cantidad_historial, restante)

            historial.cerrar(fecha=now, cantidad=mover)

            sobrante = cantidad_historial - mover
            if sobrante > 0:
                historial_restante = HistorialConsumible.objects.create(
                    lote=historial.lote,
                    item=historial.item,
                    cantidad=sobrante,
                    unidad_medida=historial.unidad_medida,
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
                cantidad=mover,
                unidad_medida=historial.unidad_medida,
                trabajador=tecnico,
                orden_trabajo=orden.trabajo,
            )
            restante -= mover

    @action(detail=True, methods=["post"])
    def cambiar_estado(self, request, pk=None):
        orden = self.get_object()
        nuevo_estado = request.data.get("estado")
        trabajador = self._get_trabajador_request()
        es_storage = is_storage_user(request.user)
        es_tecnico_asignado = bool(
            trabajador
            and orden.tecnico_asignado_id
            and trabajador.id == orden.tecnico_asignado_id
        )

        if nuevo_estado not in {
            OrdenRequerimiento.Estado.SIN_STOCK,
            OrdenRequerimiento.Estado.ENTREGADO,
        }:
            return Response(
                {"detail": "Estado inválido para esta acción."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if nuevo_estado == OrdenRequerimiento.Estado.SIN_STOCK and not es_storage:
            raise PermissionDenied("Solo el área de almacén puede marcar la orden como sin stock.")

        if nuevo_estado == OrdenRequerimiento.Estado.ENTREGADO and not (es_storage or es_tecnico_asignado):
            raise PermissionDenied(
                "Solo el técnico asignado o el área de almacén pueden marcar la orden como entregada."
            )

        if orden.estado == OrdenRequerimiento.Estado.ENTREGADO:
            return Response(
                {"detail": "La orden ya fue entregada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if nuevo_estado == OrdenRequerimiento.Estado.ENTREGADO and not orden.tecnico_asignado:
            return Response(
                {"detail": "Debes asignar un técnico antes de marcar la orden como entregada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            if nuevo_estado == OrdenRequerimiento.Estado.ENTREGADO:
                tecnico = orden.tecnico_asignado
                for detalle in orden.detalles.select_related("item", "proveedor"):
                    if detalle.item.tipo_insumo in Item.tipos_con_unidades():
                        self._entregar_repuestos(orden, detalle, tecnico)
                    else:
                        self._entregar_consumibles(orden, detalle, tecnico)

            orden.estado = nuevo_estado
            orden.save()

        return Response(self.get_serializer(orden).data)

    @action(detail=True, methods=["post"])
    def confirmar_recepcion(self, request, pk=None):
        orden = self.get_object()
        trabajador = self._get_trabajador_request()

        if not trabajador or not orden.tecnico_asignado_id or trabajador.id != orden.tecnico_asignado_id:
            raise PermissionDenied("Solo el técnico asignado puede confirmar la recepción.")

        if orden.estado != OrdenRequerimiento.Estado.ENTREGADO:
            return Response(
                {"detail": "La orden debe estar entregada para confirmar la recepción."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if orden.recepcion_confirmada_tecnico:
            return Response(
                {"detail": "La recepción ya fue confirmada por el técnico."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        orden.recepcion_confirmada_tecnico = True
        orden.fecha_confirmacion_tecnico = timezone.now()
        orden.confirmado_por_tecnico = request.user
        orden.save()

        return Response(self.get_serializer(orden).data)


class TrabajadorViewSet(viewsets.ModelViewSet):
    queryset = Trabajador.objects.all()
    serializer_class = TrabajadorAdminSerializer
    permission_classes = [CatalogoPermission]

    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def generar_codigo(self, request, pk=None):
        trabajador = self.get_object()

        if PerfilUsuario.objects.filter(trabajador=trabajador).exists():
            return Response(
                {"detail": "Este trabajador ya tiene un usuario"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if hasattr(trabajador, "codigo_registro"):
            return Response(
                {"detail": "Este trabajador ya tiene un código"},
                status=status.HTTP_400_BAD_REQUEST
            )

        codigo = CodigoRegistro.objects.create(
            trabajador=trabajador,
            expira_en=timezone.now() + timedelta(days=7)
        )

        return Response({
            "codigo": str(codigo.codigo),
            "expira_en": codigo.expira_en
        })

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = MeSerializer(request.user)
        return Response(serializer.data)
    
class OrdenTrabajoViewSet(viewsets.ModelViewSet):
    queryset = OrdenTrabajo.objects.all()
    serializer_class = OrdenTrabajoSerializer
    permission_classes = [TrabajoPermission]

    def get_queryset(self):
        queryset = (
            OrdenTrabajo.objects
            .select_related("maquinaria")
            .prefetch_related(
                "tecnicos",
                Prefetch(
                    "actividades",
                    queryset=(
                        ActividadTrabajo.objects
                        .prefetch_related(
                            "evidencias",
                            Prefetch(
                                "repuestos",
                                queryset=MovimientoRepuesto.objects.select_related(
                                    "item_unidad__item",
                                    "tecnico",
                                ),
                            ),
                            Prefetch(
                                "consumibles",
                                queryset=MovimientoConsumible.objects.select_related(
                                    "item",
                                    "unidad_medida",
                                    "tecnico",
                                ),
                            ),
                        )
                        .order_by("id")
                    ),
                ),
            )
            .all()
        )
        user = self.request.user

        if user.groups.filter(name="Tecnico").exists():
            try:
                trabajador = user.perfil.trabajador
            except PerfilUsuario.DoesNotExist:
                return OrdenTrabajo.objects.none()

            return queryset.filter(tecnicos=trabajador)

        return queryset

class ActividadTrabajoViewSet(viewsets.ModelViewSet):
    queryset = ActividadTrabajo.objects.all()
    serializer_class = ActividadTrabajoSerializer
    permission_classes = [TrabajoPermission]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["orden"]

    @staticmethod
    def _planned_activity_message():
        return (
            "Solo Jefe de Tecnicos, Jefe de Almaceneros o admin pueden "
            "registrar o modificar actividades planificadas"
        )

    def perform_create(self, serializer):
        user = self.request.user
        es_planificada = serializer.validated_data.get("es_planificada", False)

        if es_planificada:
            if not can_manage_planned_activities(user):
                raise PermissionDenied(self._planned_activity_message())
            serializer.save()
            return

        if user.groups.filter(name="Tecnico").exists():
            try:
                trabajador = user.perfil.trabajador
            except PerfilUsuario.DoesNotExist:
                raise PermissionDenied("Usuario sin trabajador asociado")

            orden = serializer.validated_data["orden"]

            if not orden.tecnicos.filter(id=trabajador.id).exists():
                raise PermissionDenied(
                    "No puedes registrar actividades en esta orden"
                )

        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        actividad = serializer.instance
        target_es_planificada = serializer.validated_data.get(
            "es_planificada", actividad.es_planificada
        )

        if actividad.es_planificada or target_es_planificada:
            if not can_manage_planned_activities(user):
                raise PermissionDenied(self._planned_activity_message())

        serializer.save()

    def perform_destroy(self, instance):
        if instance.es_planificada and not can_manage_planned_activities(self.request.user):
            raise PermissionDenied(self._planned_activity_message())

        instance.delete()

    @action(
        detail=True,
        methods=["post"],
        url_path="subir-evidencias",
        parser_classes=[MultiPartParser, FormParser],
    )
    def subir_evidencias(self, request, pk=None):
        actividad = self.get_object()

        if actividad.es_planificada:
            return Response(
                {"detail": "Solo las actividades realizadas pueden guardar evidencias."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        imagenes = request.FILES.getlist("imagenes")
        if not imagenes:
            return Response(
                {"detail": "Debes adjuntar al menos una imagen."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            for imagen in imagenes:
                ActividadTrabajoEvidencia.objects.create(
                    actividad=actividad,
                    imagen=imagen,
                )

        serializer = self.get_serializer(actividad)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"evidencias/(?P<evidencia_id>[^/.]+)",
    )
    def eliminar_evidencia(self, request, pk=None, evidencia_id=None):
        actividad = self.get_object()

        if actividad.es_planificada:
            return Response(
                {"detail": "Solo las actividades realizadas pueden gestionar evidencias."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        evidencia = actividad.evidencias.filter(pk=evidencia_id).first()
        if not evidencia:
            return Response(
                {"detail": "La evidencia indicada no existe en esta actividad."},
                status=status.HTTP_404_NOT_FOUND,
            )

        with transaction.atomic():
            evidencia.imagen.delete(save=False)
            evidencia.delete()

        serializer = self.get_serializer(actividad)
        return Response(serializer.data, status=status.HTTP_200_OK)

class MovimientoRepuestoViewSet(viewsets.ModelViewSet):
    queryset = MovimientoRepuesto.objects.all()
    serializer_class = MovimientoRepuestoSerializer
    permission_classes = [CambioEquipoPermission]

    def get_queryset(self):
        queryset = MovimientoRepuesto.objects.select_related(
            "tecnico",
            "item_unidad__item",
            "actividad__orden",
        )
        actividad_id = self.request.query_params.get("actividad")
        tecnico_id = self.request.query_params.get("tecnico")

        if actividad_id:
            queryset = queryset.filter(actividad_id=actividad_id)
        if tecnico_id:
            queryset = queryset.filter(tecnico_id=tecnico_id)

        return queryset

class MovimientoConsumibleViewSet(viewsets.ModelViewSet):
    queryset = MovimientoConsumible.objects.all()
    serializer_class = MovimientoConsumibleSerializer
    permission_classes = [CambioEquipoPermission]

    def get_queryset(self):
        queryset = MovimientoConsumible.objects.select_related(
            "tecnico",
            "item",
            "actividad__orden",
            "unidad_medida",
        )
        actividad_id = self.request.query_params.get("actividad")
        tecnico_id = self.request.query_params.get("tecnico")

        if actividad_id:
            queryset = queryset.filter(actividad_id=actividad_id)
        if tecnico_id:
            queryset = queryset.filter(tecnico_id=tecnico_id)

        return queryset

class TrabajadorRegistroViewSet(viewsets.ModelViewSet):
    queryset = Trabajador.objects.all()
    serializer_class = TrabajadorConCodigoSerializer
    permission_classes = [IsAdmin]

    def perform_create(self, serializer):
        trabajador = serializer.save()

        CodigoRegistro.objects.create(
            trabajador=trabajador
        )

class RegistroUsuarioView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegistroUsuarioSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Usuario creado correctamente"})

class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer
    permission_classes = [CatalogoPermission]



class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all().order_by("nombre")
    serializer_class = ClienteSerializer
    permission_classes = [CatalogoPermission]


class UbicacionClienteViewSet(viewsets.ModelViewSet):
    queryset = UbicacionCliente.objects.select_related("cliente").all().order_by("cliente__nombre", "nombre")
    serializer_class = UbicacionClienteSerializer
    permission_classes = [CatalogoPermission]


class DimensionViewSet(viewsets.ModelViewSet):
    queryset = Dimension.objects.all().order_by("nombre")
    serializer_class = DimensionSerializer
    permission_classes = [CatalogoPermission]


class UnidadMedidaViewSet(viewsets.ModelViewSet):
    queryset = UnidadMedida.objects.select_related("dimension").all().order_by("nombre")
    serializer_class = UnidadMedidaSerializer
    permission_classes = [CatalogoPermission]


class UnidadRelacionViewSet(viewsets.ModelViewSet):
    queryset = UnidadRelacion.objects.select_related(
        "dimension",
        "unidad_base",
        "unidad_relacionada",
    ).all().order_by("dimension__nombre")
    serializer_class = UnidadRelacionSerializer
    permission_classes = [CatalogoPermission]

class CatalogosView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "orden_trabajo": {
                "prioridad": OrdenTrabajo._meta.get_field("prioridad").choices,
                "lugar": OrdenTrabajo.Lugar.choices,
                "estado_equipo": OrdenTrabajo.EstadoEquipo.choices,
                "estatus": OrdenTrabajo.Estatus.choices,
            },
            "actividad": {
                "tipo_actividad": ActividadTrabajo.TipoActividad.choices,
                "tipo_mantenimiento": ActividadTrabajo.TipoMantenimiento.choices,
                "subtipo": ActividadTrabajo.SubTipo.choices,
            },
            "item_unidad": {
                "estado": ItemUnidad.Estado.choices,
            },
            "dimensiones": DimensionSerializer(
                Dimension.objects.filter(activo=True),
                many=True
            ).data,
            "unidades_medida": UnidadMedidaSerializer(
                UnidadMedida.objects.all(),
                many=True
            ).data,
            "relaciones_unidad": UnidadRelacionSerializer(
                UnidadRelacion.objects.all(),
                many=True
            ).data,
        })



class ItemGrupoViewSet(viewsets.ModelViewSet):
    queryset = ItemGrupo.objects.all().prefetch_related("items__item", "items__unidad_medida").order_by("-created_at")
    serializer_class = ItemGrupoSerializer
    permission_classes = [ItemPermission]
    
class AlmacenViewSet(viewsets.ModelViewSet):
    queryset = Almacen.objects.all().order_by("nombre")
    serializer_class = AlmacenSerializer
    permission_classes = [IsAuthenticated]
