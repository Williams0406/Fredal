from django.db import migrations, models
import django.db.models.deletion


def poblar_ubicacion_actual_item_unidad(apps, schema_editor):
    ItemUnidad = apps.get_model("app", "ItemUnidad")
    HistorialUbicacionItem = apps.get_model("app", "HistorialUbicacionItem")

    for unidad in ItemUnidad.objects.all().iterator():
        historial_activo = (
            HistorialUbicacionItem.objects
            .filter(item_unidad_id=unidad.id, fecha_fin__isnull=True)
            .order_by("-fecha_inicio", "-id")
            .first()
        )

        ItemUnidad.objects.filter(pk=unidad.pk).update(
            almacen_actual_id=historial_activo.almacen_id if historial_activo else None,
            trabajador_actual_id=historial_activo.trabajador_id if historial_activo else None,
            maquinaria_actual_id=historial_activo.maquinaria_id if historial_activo else None,
        )


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0005_ordencompra_ordencompradetalle_ordenrequerimiento_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="itemunidad",
            name="almacen_actual",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="item_unidades_actuales",
                to="app.almacen",
            ),
        ),
        migrations.AddField(
            model_name="itemunidad",
            name="maquinaria_actual",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="item_unidades_actuales",
                to="app.maquinaria",
            ),
        ),
        migrations.AddField(
            model_name="itemunidad",
            name="trabajador_actual",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="item_unidades_actuales",
                to="app.trabajador",
            ),
        ),
        migrations.RunPython(
            poblar_ubicacion_actual_item_unidad,
            migrations.RunPython.noop,
        ),
    ]
