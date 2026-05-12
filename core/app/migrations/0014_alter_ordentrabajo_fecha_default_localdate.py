import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0013_backfill_item_unidad_no_consumible"),
    ]

    operations = [
        migrations.AlterField(
            model_name="ordentrabajo",
            name="fecha",
            field=models.DateField(default=django.utils.timezone.localdate),
        ),
    ]
