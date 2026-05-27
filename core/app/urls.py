from rest_framework.routers import DefaultRouter
from django.urls import path, include

from .catalog_sync import CatalogoSyncView
from .views import (
    UserViewSet,
    ItemViewSet,
    MaquinariaViewSet,
    CompraViewSet,
    OrdenCompraViewSet,
    OrdenRequerimientoViewSet,
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
    ReporteOrdenViewSet,
    ReporteIPERCViewSet,
    IPERCViewSet,
    GestionCambioViewSet,
    SecuenciaControlRiesgoViewSet,
    MedidaCorrectivaViewSet,
    DetalleSupervisorViewSet,
    SistemaViewSet,
    ActividadChecklistViewSet,
    ChecklistViewSet,
    ChecklistActividadViewSet,
    ChecklistEjecucionViewSet,
    ChecklistRespuestaViewSet,
    EventoViewSet,
    AsistenciaViewSet,
    TareaPorEstandarizarViewSet,
    EncabezadoDocumentoEstandarizacionViewSet,
    DetalleDocumentoEstandarizadoViewSet,
    ConexionDetalleDocumentoViewSet,
    DimensionViewSet,
    UnidadMedidaViewSet,
    UnidadRelacionViewSet,
    ItemGrupoViewSet,
    TipoCambioDiarioViewSet,
)

router = DefaultRouter()
router.register(r"items", ItemViewSet)
router.register(r"maquinarias", MaquinariaViewSet)
router.register(r"compras", CompraViewSet)
router.register(r"ordenes-compra", OrdenCompraViewSet)
router.register(r"ordenes-requerimiento", OrdenRequerimientoViewSet)
router.register(r"tipos-cambio", TipoCambioDiarioViewSet)
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
router.register(r"reportes-orden", ReporteOrdenViewSet)
router.register(r"reportes-iperc", ReporteIPERCViewSet)
router.register(r"iperc-registros", IPERCViewSet)
router.register(r"gestiones-cambio", GestionCambioViewSet)
router.register(r"secuencias-control-riesgo", SecuenciaControlRiesgoViewSet)
router.register(r"medidas-correctivas", MedidaCorrectivaViewSet)
router.register(r"detalles-supervisor", DetalleSupervisorViewSet)
router.register(r"sistemas", SistemaViewSet)
router.register(r"actividades-checklist", ActividadChecklistViewSet)
router.register(r"checklists", ChecklistViewSet)
router.register(r"checklist-actividades", ChecklistActividadViewSet)
router.register(r"checklist-ejecuciones", ChecklistEjecucionViewSet)
router.register(r"checklist-respuestas", ChecklistRespuestaViewSet)
router.register(r"eventos", EventoViewSet)
router.register(r"asistencias", AsistenciaViewSet)
router.register(r"tareas-por-estandarizar", TareaPorEstandarizarViewSet)
router.register(r"encabezados-estandarizacion", EncabezadoDocumentoEstandarizacionViewSet)
router.register(r"detalles-estandarizacion", DetalleDocumentoEstandarizadoViewSet)
router.register(r"conexiones-estandarizacion", ConexionDetalleDocumentoViewSet)
router.register(r"dimensiones", DimensionViewSet)
router.register(r"unidades-medida", UnidadMedidaViewSet)
router.register(r"relaciones-unidad", UnidadRelacionViewSet)
router.register(r"item-grupos", ItemGrupoViewSet)

urlpatterns = [
    path("api/", include(router.urls)),
    path("api/registro/", RegistroUsuarioView.as_view()),
    path("api/me/", MeView.as_view(), name="me"),
    path("api/catalogos/", CatalogosView.as_view()),
    path("api/catalogo-sync/", CatalogoSyncView.as_view(), name="catalogo-sync"),
]
