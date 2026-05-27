from django.db import migrations, models


def ensure_supervisor_slots(apps, schema_editor):
    ReporteOrden = apps.get_model("app", "ReporteOrden")
    DetalleSupervisor = apps.get_model("app", "DetalleSupervisor")

    for reporte in ReporteOrden.objects.all().order_by("id"):
        if not DetalleSupervisor.objects.filter(
            reporte_orden_id=reporte.id,
            tipo="AUTORIZA",
        ).exists():
            DetalleSupervisor.objects.create(
                reporte_orden_id=reporte.id,
                tipo="AUTORIZA",
            )

        if not DetalleSupervisor.objects.filter(
            reporte_orden_id=reporte.id,
            tipo="VERIFICA",
        ).exists():
            DetalleSupervisor.objects.create(
                reporte_orden_id=reporte.id,
                tipo="VERIFICA",
            )

        if not DetalleSupervisor.objects.filter(
            reporte_orden_id=reporte.id,
            tipo="",
        ).exists():
            DetalleSupervisor.objects.create(
                reporte_orden_id=reporte.id,
                tipo="",
            )


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0022_alter_reporteorden_options"),
    ]

    operations = [
        migrations.AlterField(
            model_name="detallesupervisor",
            name="apellidos",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AlterField(
            model_name="detallesupervisor",
            name="dni",
            field=models.CharField(blank=True, default="", max_length=20),
        ),
        migrations.AlterField(
            model_name="detallesupervisor",
            name="hora",
            field=models.TimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="detallesupervisor",
            name="nombres",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AlterField(
            model_name="detallesupervisor",
            name="tipo",
            field=models.CharField(
                blank=True,
                choices=[("AUTORIZA", "Autoriza"), ("VERIFICA", "Verifica")],
                default="",
                max_length=10,
            ),
        ),
        migrations.RunPython(ensure_supervisor_slots, migrations.RunPython.noop),
    ]
