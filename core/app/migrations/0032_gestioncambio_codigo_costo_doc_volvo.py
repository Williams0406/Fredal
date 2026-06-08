from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0031_gestioncambio_desaprobado_iperc_optional"),
    ]

    operations = [
        migrations.AddField(
            model_name="gestioncambio",
            name="codigo",
            field=models.CharField(blank=True, default="", max_length=50),
        ),
        migrations.AddField(
            model_name="gestioncambio",
            name="costo",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True),
        ),
        migrations.AddField(
            model_name="gestioncambio",
            name="doc",
            field=models.FileField(blank=True, null=True, upload_to="gestiones_cambio/docs/%Y/%m/"),
        ),
        migrations.AddField(
            model_name="gestioncambio",
            name="volvo",
            field=models.BooleanField(default=False),
        ),
    ]
