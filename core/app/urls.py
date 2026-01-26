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
    TrabajadorViewSet,
    MeView,
    RegistroUsuarioView,
    TrabajadorRegistroViewSet,
    ProveedorViewSet,
    CatalogosView,
    AlmacenViewSet,
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
router.register(r"trabajadores-registro",TrabajadorRegistroViewSet,basename="trabajador-registro")
router.register(r"proveedores", ProveedorViewSet)
router.register(r"almacenes", AlmacenViewSet)

urlpatterns = [
    path("api/", include(router.urls)),
    path("api/registro/", RegistroUsuarioView.as_view()),
    path("api/me/", MeView.as_view(), name="me"),
    path("api/catalogos/", CatalogosView.as_view()),
]
