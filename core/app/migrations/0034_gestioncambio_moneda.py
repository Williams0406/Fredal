from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0033_gestioncambio_creado_por"),
    ]

    operations = [
        migrations.AddField(
            model_name="gestioncambio",
            name="moneda",
            field=models.CharField(
                choices=[("PEN", "Soles"), ("USD", "Dolares")],
                default="PEN",
                max_length=3,
            ),
        ),
    ]
