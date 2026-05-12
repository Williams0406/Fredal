from zoneinfo import ZoneInfo

from django.db import migrations


UTC = ZoneInfo("UTC")
LIMA = ZoneInfo("America/Lima")


def _utc_naive_to_lima_naive(value):
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(LIMA).replace(tzinfo=None)


def _lima_naive_to_utc_naive(value):
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=LIMA)
    return value.astimezone(UTC).replace(tzinfo=None)


def _convert_rows(apps, model_name, converter):
    Model = apps.get_model("app", model_name)
    updates = []

    for row in Model.objects.all().only("id", "fecha_inicio", "fecha_fin").iterator():
        row.fecha_inicio = converter(row.fecha_inicio)
        row.fecha_fin = converter(row.fecha_fin)
        updates.append(row)

    if updates:
        Model.objects.bulk_update(updates, ["fecha_inicio", "fecha_fin"], batch_size=500)


def forwards(apps, schema_editor):
    _convert_rows(apps, "HistorialUbicacionItem", _utc_naive_to_lima_naive)
    _convert_rows(apps, "HistorialConsumible", _utc_naive_to_lima_naive)


def backwards(apps, schema_editor):
    _convert_rows(apps, "HistorialUbicacionItem", _lima_naive_to_utc_naive)
    _convert_rows(apps, "HistorialConsumible", _lima_naive_to_utc_naive)


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0014_alter_ordentrabajo_fecha_default_localdate"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
