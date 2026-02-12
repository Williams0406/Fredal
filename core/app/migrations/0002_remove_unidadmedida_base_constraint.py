from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0001_initial"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="unidadmedida",
            name="unique_unidad_base_por_dimension",
        ),
    ]
