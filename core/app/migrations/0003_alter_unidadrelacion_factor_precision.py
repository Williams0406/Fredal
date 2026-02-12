from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0002_remove_unidadmedida_base_constraint"),
    ]

    operations = [
        migrations.AlterField(
            model_name="unidadrelacion",
            name="factor",
            field=models.DecimalField(max_digits=30, decimal_places=12),
        ),
    ]
