from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0003_movimientoconsumible"),
    ]

    operations = [
        migrations.AddField(
            model_name="actividadtrabajo",
            name="es_planificada",
            field=models.BooleanField(default=False),
        ),
    ]
