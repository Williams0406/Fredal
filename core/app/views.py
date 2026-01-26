from django.contrib.auth.models import User, Group
from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from .permissions import IsAdmin
from django.db.models import Avg
from decimal import Decimal
from itertools import chain
from datetime import datetime, time


from .models import (
    Item,
    Maquinaria,
    Compra,
    Trabajador,
    OrdenTrabajo,
    ActividadTrabajo,
    MovimientoRepuesto,
    CodigoRegistro,
    PerfilUsuario,
    HistorialUbicacionItem,
    ItemProveedor,
    Proveedor,
    ItemUnidad,
    Almacen
)
from .serializers import (
    UserSerializer,
    ItemSerializer,
    MaquinariaSerializer,
    CompraSerializer,
    MeSerializer,
    OrdenTrabajoSerializer,
    ActividadTrabajoSerializer,
    MovimientoRepuestoSerializer,
    MaquinariaDetalleSerializer,
    TrabajadorConCodigoSerializer,
    RegistroUsuarioSerializer,
    TrabajadorAdminSerializer,
    GroupSerializer,
    ItemDetalleSerializer,
    HistorialUbicacionItemSerializer,
    KardexUnidadSerializer,
    ItemProveedorSerializer,
    ProveedorSerializer,
    KardexContableSerializer,
    AlmacenSerializer,
)
from .permissions import (
    IsAdmin,
    ItemPermission,
    CatalogoPermission,
    TrabajoPermission,
    CompraPermission,
    CambioEquipoPermission,
)

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("username")
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]

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
    queryset = Item.objects.all().order_by("nombre")
    serializer_class = ItemSerializer
    permission_classes = [ItemPermission]

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
            Compra.objects
            .filter(item=item, proveedor__isnull=False)
            .values(
                "proveedor_id",
                "proveedor__nombre",
                "proveedor__ruc",
                "moneda"
            )
            .annotate(
                precio_promedio=Avg("valor_unitario")
            )
            .order_by("proveedor__nombre", "moneda")
        )

        data = [
            {
                "proveedor_nombre": r["proveedor__nombre"],
                "proveedor_ruc": r["proveedor__ruc"],
                "moneda": r["moneda"],
                "precio": round(r["precio_promedio"], 2),
            }
            for r in qs
        ]

        return Response(data)
    
    @action(detail=False, methods=["get"])
    def por_maquinaria(self, request):
        maquinaria_id = request.query_params.get("maquinaria")

        if not maquinaria_id:
            return Response([])

        items = Item.objects.filter(
            unidades__historial__maquinaria_id=maquinaria_id,
            unidades__historial__fecha_fin__isnull=True
        ).distinct()

        serializer = ItemSerializer(items, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=["get"])
    def unidades_asignables(self, request, pk=None):
        item = self.get_object()
        actividad_id = request.query_params.get("actividad")

        if not actividad_id:
            return Response([])

        unidades = (
            ItemUnidad.objects
            .filter(
                item=item,
                estado=ItemUnidad.Estado.NUEVO,
                historial__almacen__isnull=False,
                historial__fecha_fin__isnull=True,
            )
            .exclude(
                estado=ItemUnidad.Estado.INOPERATIVO
            )
            .distinct()
        )

        return Response([
            {
                "id": u.id,
                "serie": u.serie,
                "estado": u.estado,
            }
            for u in unidades
        ])
    
    @action(detail=True, methods=["get"])
    def kardex_contable(self, request, pk=None):
        item = self.get_object()

        # 📥 Compras
        compras = Compra.objects.filter(item=item).order_by("fecha")

        # 📤 Salidas
        salidas = (
            MovimientoRepuesto.objects
            .filter(item_unidad__item=item)
            .select_related("actividad__orden")
            .order_by("fecha")
        )

        eventos = []

        for c in compras:
            eventos.append({
                "fecha": timezone.make_aware(
                    datetime.combine(c.fecha, time.min),
                    timezone.get_current_timezone()
                ),
                "tipo": "COMPRA",
                "cantidad": c.cantidad,
                "costo_unitario": c.costo_unitario,
                "registro": f"{c.tipo_comprobante} {c.codigo_comprobante}",
            })

        for s in salidas:
            unidad = s.item_unidad
            compra = unidad.compra
            orden = s.actividad.orden
            maquinaria = orden.maquinaria if orden else None

            # ⚠️ Seguridad: por si alguna unidad no tiene compra
            costo_unitario = (
                compra.costo_unitario
                if compra and compra.valor_unitario
                else Decimal("0.00")
            )

            eventos.append({
                "fecha": s.fecha,
                "tipo": "SALIDA",
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

        eventos.sort(key=lambda x: x["fecha"])

        kardex = []
        stock = 0
        costo_promedio = Decimal("0.00")
        costo_total = Decimal("0.00")

        for e in eventos:
            inv_inicial = stock

            if e["tipo"] == "COMPRA":
                entrada = e["cantidad"]
                salida = 0

                total_entrada = e["cantidad"] * e["costo_unitario"]
                costo_total += total_entrada
                stock += entrada
                costo_promedio = costo_total / stock

            else:
                entrada = 0
                salida = 1

                costo_salida = e["costo_unitario"]

                costo_total -= costo_salida
                stock -= 1

            kardex.append({
                "fecha": e["fecha"],
                "registro": e["registro"],
                "inventario_inicial": inv_inicial,
                "entrada": entrada,
                "salida": salida,
                "costo_unitario": round(
                    e["costo_unitario"] if e["tipo"] == "SALIDA" else costo_promedio,
                    2
                ),
                "inventario_final_cantidad": stock,
                "inventario_final_costo": round(costo_total, 2),
                "maquinaria": e.get("maquinaria"),
            })

        return Response(KardexContableSerializer(kardex, many=True).data)
    
    @action(detail=True, methods=["post"], permission_classes=[IsAdmin])
    def cambiar_estado_unidad(self, request, pk=None):
        """
        Cambia el estado de una unidad de un item y registra en historial.
        body: { "unidad_id": 1, "nuevo_estado": "USADO", "maquinaria_id": null, "almacen_id": null }
        """
        item = self.get_object()
        unidad_id = request.data.get("unidad_id")
        nuevo_estado = request.data.get("nuevo_estado")
        maquinaria_id = request.data.get("maquinaria_id")  # opcional
        almacen_id = request.data.get("almacen_id")        # opcional
        trabajador_id = request.data.get("trabajador_id")

        if not unidad_id or not nuevo_estado:
            return Response({"detail": "unidad_id y nuevo_estado son requeridos"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            unidad = ItemUnidad.objects.get(id=unidad_id, item=item)
        except ItemUnidad.DoesNotExist:
            return Response({"detail": "Unidad no encontrada para este item"}, status=status.HTTP_404_NOT_FOUND)

        if nuevo_estado not in dict(ItemUnidad.Estado.choices):
            return Response({"detail": f"Estado inválido: {nuevo_estado}"}, status=status.HTTP_400_BAD_REQUEST)

        # 🔹 Cierra el historial anterior si existe
        historial_actual = HistorialUbicacionItem.objects.filter(
            item_unidad=unidad,
            fecha_fin__isnull=True
        ).first()
        if historial_actual:
            historial_actual.fecha_fin = timezone.now()
            historial_actual.save()

        # 🔹 Actualiza el estado de la unidad
        unidad.estado = nuevo_estado
        unidad.save(update_fields=["estado"])

        destinos = [maquinaria_id, almacen_id, trabajador_id]
        if sum(bool(d) for d in destinos) != 1:
            return Response(
                {"detail": "Debe especificar SOLO una ubicación"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 🔹 Crea un nuevo historial reflejando la ubicación/estado actual
        HistorialUbicacionItem.objects.create(
            item_unidad=unidad,
            maquinaria_id=maquinaria_id if maquinaria_id else None,
            almacen_id=almacen_id if almacen_id else None,
            trabajador_id=trabajador_id if trabajador_id else None,
            estado=nuevo_estado
        )

        return Response({
            "unidad_id": unidad.id,
            "nuevo_estado": unidad.estado,
            "serie": unidad.serie
        })
    


class MaquinariaViewSet(viewsets.ModelViewSet):
    queryset = Maquinaria.objects.all()
    serializer_class = MaquinariaSerializer
    permission_classes = [CatalogoPermission]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return MaquinariaDetalleSerializer
        return MaquinariaSerializer

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
                "item_unidad__compra"
            )
            .filter(
                maquinaria=maquinaria,
                fecha_fin__isnull=True
            )
            .order_by("item_unidad__item__codigo")
        )

        unidades = []
        centro_costos = Decimal("0.00")

        for h in historiales:
            unidad = h.item_unidad
            compra = unidad.compra

            costo = (
                compra.costo_unitario
                if compra and compra.valor_unitario
                else Decimal("0.00")
            )

            centro_costos += costo

            unidades.append({
                "unidad_id": unidad.id,
                "item_codigo": unidad.item.codigo,
                "item_nombre": unidad.item.nombre,
                "serie": unidad.serie,
                "estado": h.estado,
                "costo_unitario": round(costo, 2),
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

class CompraViewSet(viewsets.ModelViewSet):
    queryset = Compra.objects.select_related(
        "item", "proveedor"
    ).all()
    serializer_class = CompraSerializer
    permission_classes = [CompraPermission]

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
    ]

    filterset_fields = [
        "tipo_comprobante",
        "fecha",
        "item__volvo",   # ✅ correcto
    ]

    search_fields = [
        "codigo_comprobante",
        "item__nombre",
        "item__codigo",
        "proveedor__nombre",
    ]

    def perform_create(self, serializer):
        serializer.save()

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

class ActividadTrabajoViewSet(viewsets.ModelViewSet):
    queryset = ActividadTrabajo.objects.all()
    serializer_class = ActividadTrabajoSerializer
    permission_classes = [TrabajoPermission]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["orden"]

class MovimientoRepuestoViewSet(viewsets.ModelViewSet):
    queryset = MovimientoRepuesto.objects.all()
    serializer_class = MovimientoRepuestoSerializer
    permission_classes = [CambioEquipoPermission]

    def get_queryset(self):
        queryset = MovimientoRepuesto.objects.all()
        actividad_id = self.request.query_params.get("actividad")

        if actividad_id:
            queryset = queryset.filter(actividad_id=actividad_id)

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
            }
        })

class AlmacenViewSet(viewsets.ModelViewSet):
    queryset = Almacen.objects.all().order_by("nombre")
    serializer_class = AlmacenSerializer
    permission_classes = [IsAuthenticated]

