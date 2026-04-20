from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0003_actividadtrabajoevidencia"),
    ]

    operations = [
        migrations.AlterField(
            model_name="actividadtrabajo",
            name="tipo_mantenimiento",
            field=models.CharField(
                blank=True,
                choices=[
                    ("PREVENTIVO", "Preventivo"),
                    ("CORRECTIVO", "Correctivo"),
                    ("PREDICTIVO", "Predictivo"),
                    ("OVERHAUL", "Overhaul"),
                ],
                max_length=20,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="actividadtrabajo",
            name="subtipo",
            field=models.CharField(
                blank=True,
                choices=[
                    ("PM1", "PM1"),
                    ("PM2", "PM2"),
                    ("PM3", "PM3"),
                    ("PM4", "PM4"),
                    ("LEVE", "Leve"),
                    ("MEDIANO", "Mediano"),
                    ("REGULAR", "Regular"),
                    ("GRAVE", "Grave"),
                ],
                max_length=10,
                null=True,
            ),
        ),
    ]
