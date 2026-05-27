from django.db import migrations, models
import django.db.models.deletion
from django.db.models import Max

import app.models


def _build_codigo(ReporteOrden, fecha):
    year = (fecha or app.models.current_local_date()).year
    prefix = f"RTO-{year}-"
    last = (
        ReporteOrden.objects
        .filter(codigo__startswith=prefix)
        .aggregate(max_code=Max("codigo"))
        .get("max_code")
    )
    seq = int(last.split("-")[-1]) + 1 if last else 1
    return f"{prefix}{seq:05d}"


def backfill_reportes_orden(apps, schema_editor):
    ReporteOrden = apps.get_model("app", "ReporteOrden")
    OrdenTrabajo = apps.get_model("app", "OrdenTrabajo")

    for reporte in ReporteOrden.objects.all().order_by("id"):
        changed_fields = []
        if not reporte.fecha:
            reporte.fecha = (
                reporte.created_at.date()
                if getattr(reporte, "created_at", None)
                else app.models.current_local_date()
            )
            changed_fields.append("fecha")
        if not reporte.estado:
            reporte.estado = "PENDIENTE"
            changed_fields.append("estado")
        if not reporte.codigo:
            reporte.codigo = _build_codigo(ReporteOrden, reporte.fecha)
            changed_fields.append("codigo")
        if changed_fields:
            reporte.save(update_fields=changed_fields)

    for orden in OrdenTrabajo.objects.filter(lugar="CAMPO").order_by("fecha", "id"):
        if ReporteOrden.objects.filter(orden_trabajo_id=orden.id).exists():
            continue

        ReporteOrden.objects.create(
            codigo=_build_codigo(ReporteOrden, orden.fecha),
            fecha=orden.fecha,
            orden_trabajo_id=orden.id,
            estado="PENDIENTE",
        )


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0020_detalledocumentoestandarizado_posicion_x_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="reporteorden",
            name="codigo",
            field=models.CharField(blank=True, editable=False, max_length=50, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="reporteorden",
            name="estado",
            field=models.CharField(
                choices=[("PENDIENTE", "Pendiente"), ("REALIZADO", "Realizado")],
                default="PENDIENTE",
                max_length=15,
            ),
        ),
        migrations.AddField(
            model_name="reporteorden",
            name="fecha",
            field=models.DateField(default=app.models.current_local_date),
        ),
        migrations.AddField(
            model_name="reporteorden",
            name="orden_trabajo",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="reportes_orden",
                to="app.ordentrabajo",
            ),
        ),
        migrations.RunPython(backfill_reportes_orden, migrations.RunPython.noop),
    ]
