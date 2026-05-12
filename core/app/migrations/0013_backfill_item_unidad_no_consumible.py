from django.db import migrations


def backfill_non_consumable_unit_config(apps, schema_editor):
    Item = apps.get_model("app", "Item")
    Dimension = apps.get_model("app", "Dimension")
    UnidadMedida = apps.get_model("app", "UnidadMedida")

    dimension = Dimension.objects.filter(codigo__iexact="UNIDAD").first()
    if not dimension:
        return

    unidad = (
        UnidadMedida.objects
        .filter(dimension=dimension, activo=True)
        .order_by("-es_base", "id")
        .first()
        or UnidadMedida.objects
        .filter(dimension=dimension)
        .order_by("-es_base", "id")
        .first()
    )
    if not unidad:
        return

    (
        Item.objects
        .filter(tipo_insumo__in=["REPUESTO", "HERRAMIENTA"])
        .exclude(dimension_id=dimension.id, unidad_medida_id=unidad.id)
        .update(dimension_id=dimension.id, unidad_medida_id=unidad.id)
    )


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0012_alter_item_tipo_insumo"),
    ]

    operations = [
        migrations.RunPython(
            backfill_non_consumable_unit_config,
            migrations.RunPython.noop,
        ),
    ]
