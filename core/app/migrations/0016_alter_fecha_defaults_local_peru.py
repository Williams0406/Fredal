import app.models
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0015_backfill_historial_fechas_local_peru"),
    ]

    operations = [
        migrations.AlterField(
            model_name="compra",
            name="fecha",
            field=models.DateField(default=app.models.current_local_date),
        ),
        migrations.AlterField(
            model_name="ordentrabajo",
            name="fecha",
            field=models.DateField(default=app.models.current_local_date),
        ),
    ]
