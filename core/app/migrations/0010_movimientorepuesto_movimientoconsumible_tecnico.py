from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0009_historialconsumible_horometro_fin_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="movimientoconsumible",
            name="tecnico",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                to="app.trabajador",
            ),
        ),
        migrations.AddField(
            model_name="movimientorepuesto",
            name="tecnico",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                to="app.trabajador",
            ),
        ),
    ]
