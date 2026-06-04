from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0030_checklistejecucion_codigo_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="gestioncambio",
            name="estado",
            field=models.CharField(
                choices=[
                    ("SUGERIDO", "Sugerido"),
                    ("APROBADO", "Aprobado"),
                    ("DESAPROBADO", "Desaprobado"),
                    ("EN_PROCESO", "En proceso"),
                    ("TERMINADO", "Terminado"),
                ],
                default="SUGERIDO",
                max_length=15,
            ),
        ),
        migrations.AlterField(
            model_name="gestioncambio",
            name="iperc",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="gestiones_cambio",
                to="app.iperc",
            ),
        ),
    ]
