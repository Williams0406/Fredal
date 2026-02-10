from rest_framework.routers import DefaultRouter
from django.urls import path, include

from .views import (
    UserViewSet,
    ItemViewSet,
    MaquinariaViewSet,
    CompraViewSet,
    OrdenTrabajoViewSet,
    ActividadTrabajoViewSet,
    MovimientoRepuestoViewSet,
    MovimientoConsumibleViewSet,
    TrabajadorViewSet,
    MeView,
    RegistroUsuarioView,
    TrabajadorRegistroViewSet,
    ProveedorViewSet,
    CatalogosView,
    AlmacenViewSet,
    ClienteViewSet,
    UbicacionClienteViewSet,
    DimensionViewSet,
    UnidadMedidaViewSet,
    UnidadRelacionViewSet,
    ItemGrupoViewSet,
)

router = DefaultRouter()
router.register(r"items", ItemViewSet)
router.register(r"maquinarias", MaquinariaViewSet)
router.register(r"compras", CompraViewSet)
router.register(r"trabajadores", TrabajadorViewSet)
router.register(r"users", UserViewSet)
router.register(r"trabajos", OrdenTrabajoViewSet)
router.register(r"actividades", ActividadTrabajoViewSet)
router.register(r"movimientos-repuesto", MovimientoRepuestoViewSet)
router.register(r"movimientos-consumible", MovimientoConsumibleViewSet)
router.register(r"trabajadores-registro",TrabajadorRegistroViewSet,basename="trabajador-registro")
router.register(r"proveedores", ProveedorViewSet)
router.register(r"almacenes", AlmacenViewSet)
router.register(r"clientes", ClienteViewSet)
router.register(r"ubicaciones-cliente", UbicacionClienteViewSet)
router.register(r"dimensiones", DimensionViewSet)
router.register(r"unidades-medida", UnidadMedidaViewSet)
router.register(r"relaciones-unidad", UnidadRelacionViewSet)
router.register(r"item-grupos", ItemGrupoViewSet)

urlpatterns = [
    path("api/", include(router.urls)),
    path("api/registro/", RegistroUsuarioView.as_view()),
    path("api/me/", MeView.as_view(), name="me"),
    path("api/catalogos/", CatalogosView.as_view()),
]
