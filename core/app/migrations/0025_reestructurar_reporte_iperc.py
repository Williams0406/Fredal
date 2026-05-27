from django.db import migrations, models
import django.db.models.deletion


MOTIVO_MAP = {
    "actividad nueva": "ACTIVIDAD_NUEVA",
    "cambio del proceso": "CAMBIO_PROCESO",
    "trabajo no rutinario": "TRABAJO_NO_RUTINARIO",
    "incidente / accidente": "INCIDENTE_ACCIDENTE",
    "incidente/accidente": "INCIDENTE_ACCIDENTE",
    "indicadores de deterioro operativo": "INDICADORES_DETERIORO",
    "frecuencia periodica": "FRECUENCIA_PERIODICA",
    "licitaciones o auditorias": "LICITACIONES_AUDITORIAS",
}


def _normalizar_motivo(valor):
    normalizado = str(valor or "").strip().lower()
    return MOTIVO_MAP.get(normalizado, "ACTIVIDAD_NUEVA")


def migrar_motivo_y_relacion_iperc(apps, schema_editor):
    ReporteIPERC = apps.get_model("app", "ReporteIPERC")

    for reporte in ReporteIPERC.objects.select_related("iperc").all().order_by("id"):
        iperc = getattr(reporte, "iperc", None)
        changed_fields = []

        if iperc is not None:
            motivo = _normalizar_motivo(getattr(iperc, "motivo", ""))
            if reporte.motivo != motivo:
                reporte.motivo = motivo
                changed_fields.append("motivo")

            if getattr(iperc, "reporte_iperc_id", None) != reporte.id:
                iperc.reporte_iperc_id = reporte.id
                iperc.save(update_fields=["reporte_iperc"])

        if changed_fields:
            reporte.save(update_fields=changed_fields)

    orden_ids = (
        ReporteIPERC.objects
        .order_by()
        .values_list("orden_trabajo_id", flat=True)
        .distinct()
    )
    for orden_id in orden_ids:
        reportes = list(
            ReporteIPERC.objects
            .filter(orden_trabajo_id=orden_id)
            .order_by("secuencia", "id")
        )
        for index, reporte in enumerate(reportes, start=1):
            if reporte.secuencia != index:
                reporte.secuencia = index
                reporte.save(update_fields=["secuencia"])


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0024_reporteiperc_codigo_fecha"),
    ]

    operations = [
        migrations.AddField(
            model_name="iperc",
            name="reporte_iperc",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="ipercs",
                to="app.reporteiperc",
            ),
        ),
        migrations.AddField(
            model_name="reporteiperc",
            name="motivo",
            field=models.CharField(
                choices=[
                    ("ACTIVIDAD_NUEVA", "Actividad nueva"),
                    ("CAMBIO_PROCESO", "Cambio del proceso"),
                    ("TRABAJO_NO_RUTINARIO", "Trabajo no rutinario"),
                    ("INCIDENTE_ACCIDENTE", "Incidente / accidente"),
                    ("INDICADORES_DETERIORO", "Indicadores de deterioro operativo"),
                    ("FRECUENCIA_PERIODICA", "Frecuencia periodica"),
                    ("LICITACIONES_AUDITORIAS", "Licitaciones o auditorias"),
                ],
                default="ACTIVIDAD_NUEVA",
                max_length=40,
            ),
        ),
        migrations.RunPython(migrar_motivo_y_relacion_iperc, migrations.RunPython.noop),
        migrations.AlterUniqueTogether(
            name="reporteiperc",
            unique_together={("orden_trabajo", "secuencia")},
        ),
        migrations.RemoveField(
            model_name="iperc",
            name="motivo",
        ),
        migrations.RemoveField(
            model_name="reporteiperc",
            name="iperc",
        ),
        migrations.RemoveField(
            model_name="reporteiperc",
            name="trabajador",
        ),
    ]
