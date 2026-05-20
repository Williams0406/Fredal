from django.db import migrations, models
import django.db.models.deletion


def backfill_requerimiento_detalle_unidad(apps, schema_editor):
    OrdenRequerimientoDetalle = apps.get_model("app", "OrdenRequerimientoDetalle")

    for detalle in (
        OrdenRequerimientoDetalle.objects
        .select_related("item")
        .filter(unidad_medida__isnull=True, item__unidad_medida__isnull=False)
    ):
        detalle.unidad_medida_id = detalle.item.unidad_medida_id
        detalle.save(update_fields=["unidad_medida"])


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0016_alter_fecha_defaults_local_peru"),
    ]

    operations = [
        migrations.AddField(
            model_name="ordenrequerimientodetalle",
            name="sin_stock",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="ordenrequerimientodetalle",
            name="unidad_medida",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                to="app.unidadmedida",
            ),
        ),
        migrations.RunPython(
            backfill_requerimiento_detalle_unidad,
            migrations.RunPython.noop,
        ),
    ]
