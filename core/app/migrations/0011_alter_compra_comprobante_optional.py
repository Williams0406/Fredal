from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0010_movimientorepuesto_movimientoconsumible_tecnico"),
    ]

    operations = [
        migrations.AlterField(
            model_name="compra",
            name="codigo_comprobante",
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AlterField(
            model_name="compra",
            name="tipo_comprobante",
            field=models.CharField(
                blank=True,
                choices=[("FACTURA", "Factura"), ("BOLETA", "Boleta")],
                max_length=10,
                null=True,
            ),
        ),
    ]
