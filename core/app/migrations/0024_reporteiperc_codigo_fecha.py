from django.db import migrations, models
from django.db.models import Max

import app.models


def _build_codigo(ReporteIPERC, fecha):
    year = (fecha or app.models.current_local_date()).year
    prefix = f"RIPERC-{year}-"
    last = (
        ReporteIPERC.objects
        .filter(codigo__startswith=prefix)
        .aggregate(max_code=Max("codigo"))
        .get("max_code")
    )
    seq = int(last.split("-")[-1]) + 1 if last else 1
    return f"{prefix}{seq:05d}"


def backfill_reportes_iperc(apps, schema_editor):
    ReporteIPERC = apps.get_model("app", "ReporteIPERC")

    for reporte in ReporteIPERC.objects.select_related("orden_trabajo").all().order_by("id"):
        changed_fields = []
        fecha_objetivo = (
            getattr(reporte.orden_trabajo, "fecha", None)
            or reporte.fecha
            or app.models.current_local_date()
        )

        if reporte.fecha != fecha_objetivo:
            reporte.fecha = fecha_objetivo
            changed_fields.append("fecha")

        if not reporte.codigo:
            reporte.codigo = _build_codigo(ReporteIPERC, reporte.fecha)
            changed_fields.append("codigo")

        if changed_fields:
            reporte.save(update_fields=changed_fields)


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0023_alter_detallesupervisor_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="reporteiperc",
            name="codigo",
            field=models.CharField(blank=True, editable=False, max_length=50, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="reporteiperc",
            name="fecha",
            field=models.DateField(default=app.models.current_local_date),
        ),
        migrations.AlterModelOptions(
            name="reporteiperc",
            options={"ordering": ["-fecha", "orden_trabajo_id", "secuencia", "id"]},
        ),
        migrations.RunPython(backfill_reportes_iperc, migrations.RunPython.noop),
    ]
