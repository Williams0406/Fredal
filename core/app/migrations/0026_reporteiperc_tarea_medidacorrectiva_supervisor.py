from django.db import migrations, models
import django.db.models.deletion


def backfill_tarea(apps, schema_editor):
    ReporteIPERC = apps.get_model("app", "ReporteIPERC")

    for reporte in ReporteIPERC.objects.select_related("orden_trabajo", "orden_trabajo__maquinaria").all():
        if reporte.tarea or not reporte.orden_trabajo_id:
            continue

        maquinaria = getattr(reporte.orden_trabajo, "maquinaria", None)
        if maquinaria:
            reporte.tarea = f"{reporte.orden_trabajo.codigo_orden} - {maquinaria.nombre}"
        else:
            reporte.tarea = reporte.orden_trabajo.codigo_orden
        reporte.save(update_fields=["tarea"])


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0025_reestructurar_reporte_iperc"),
    ]

    operations = [
        migrations.AddField(
            model_name="reporteiperc",
            name="tarea",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="medidacorrectiva",
            name="supervisor",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="medidas_correctivas",
                to="app.detallesupervisor",
            ),
        ),
        migrations.RunPython(backfill_tarea, migrations.RunPython.noop),
    ]
