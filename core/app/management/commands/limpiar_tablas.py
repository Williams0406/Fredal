from django.contrib.admin.models import LogEntry
from django.contrib.sessions.models import Session
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from app.models import (
    ActividadTrabajo,
    ActividadTrabajoEvidencia,
    ActividadChecklist,
    Almacen,
    Asistencia,
    Auditoria,
    Checklist,
    ChecklistActividad,
    ChecklistEjecucion,
    ChecklistRespuesta,
    ChecklistTaller,
    Cliente,
    ConexionDetalleDocumento,
    CodigoRegistro,
    Compra,
    CompraDetalle,
    DetalleDocumentoEstandarizado,
    DetalleSupervisor,
    Dimension,
    EncabezadoDocumentoEstandarizacion,
    GestionCambio,
    HistorialConsumible,
    HistorialUbicacionItem,
    IPERC,
    Item,
    ItemGrupo,
    ItemGrupoDetalle,
    ItemProveedor,
    ItemUnidad,
    LoteConsumible,
    Maquinaria,
    MedidaCorrectiva,
    MovimientoConsumible,
    MovimientoRepuesto,
    OrdenCompra,
    OrdenCompraDetalle,
    OrdenRequerimiento,
    OrdenRequerimientoDetalle,
    OrdenTrabajo,
    Proveedor,
    ReporteIPERC,
    ReporteOrden,
    SecuenciaControlRiesgo,
    Sistema,
    SoporteVisualDocumentoEstandarizado,
    TareaPorEstandarizar,
    TecnicoAsignado,
    TipoCambioDiario,
    TraspasoItem,
    UbicacionCliente,
    UnidadMedida,
    UnidadRelacion,
    Evento,
)


class Command(BaseCommand):
    help = (
        "Limpia los datos operativos para probar el flujo de órdenes de trabajo, "
        "preservando usuarios, trabajadores, perfiles y grupos."
    )

    modelos_a_limpiar = [
        BlacklistedToken,
        OutstandingToken,
        Session,
        LogEntry,
        Auditoria,
        SoporteVisualDocumentoEstandarizado,
        ConexionDetalleDocumento,
        DetalleDocumentoEstandarizado,
        EncabezadoDocumentoEstandarizacion,
        Asistencia,
        Evento,
        ChecklistRespuesta,
        ChecklistEjecucion,
        ChecklistActividad,
        ActividadChecklist,
        Checklist,
        Sistema,
        TareaPorEstandarizar,
        ChecklistTaller,
        GestionCambio,
        SecuenciaControlRiesgo,
        MedidaCorrectiva,
        ReporteIPERC,
        DetalleSupervisor,
        ReporteOrden,
        IPERC,
        OrdenRequerimientoDetalle,
        OrdenRequerimiento,
        OrdenCompraDetalle,
        OrdenCompra,
        ActividadTrabajoEvidencia,
        MovimientoRepuesto,
        MovimientoConsumible,
        HistorialUbicacionItem,
        HistorialConsumible,
        TecnicoAsignado,
        ActividadTrabajo,
        OrdenTrabajo,
        ItemUnidad,
        LoteConsumible,
        CompraDetalle,
        Compra,
        TraspasoItem,
        ItemGrupoDetalle,
        ItemGrupo,
        ItemProveedor,
        CodigoRegistro,
        TipoCambioDiario,
        UbicacionCliente,
        Cliente,
        Item,
        Maquinaria,
        Proveedor,
        UnidadRelacion,
        UnidadMedida,
        Dimension,
        Almacen,
    ]

    def add_arguments(self, parser):
        parser.add_argument(
            "--yes",
            action="store_true",
            help="Ejecuta la limpieza sin pedir confirmación.",
        )

    def handle(self, *args, **options):
        total_registros = sum(model.objects.count() for model in self.modelos_a_limpiar)
        if total_registros == 0:
            self.stdout.write(self.style.WARNING("No hay registros operativos para limpiar."))
            return

        if not options["yes"]:
            self.stdout.write(
                self.style.WARNING(
                    "Se limpiarán los datos operativos y catálogos, pero se conservarán "
                    "usuarios, trabajadores, perfiles y grupos."
                )
            )
            confirmacion = input("Escribe LIMPIAR para continuar: ").strip()
            if confirmacion != "LIMPIAR":
                raise CommandError("Operación cancelada.")

        resumen = []
        with transaction.atomic():
            for model in self.modelos_a_limpiar:
                cantidad = model.objects.count()
                if not cantidad:
                    continue
                model.objects.all().delete()
                resumen.append((model._meta.label, cantidad))

        self.stdout.write(self.style.SUCCESS("Limpieza completada."))
        for etiqueta, cantidad in resumen:
            self.stdout.write(f"- {etiqueta}: {cantidad}")
