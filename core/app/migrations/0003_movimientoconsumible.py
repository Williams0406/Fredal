from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0002_remove_compra_cantidad_remove_compra_client_uid_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="MovimientoConsumible",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("cantidad", models.PositiveIntegerField()),
                ("fecha", models.DateTimeField(auto_now_add=True)),
                ("actividad", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="consumibles", to="app.actividadtrabajo")),
                ("item", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to="app.item")),
            ],
        ),
    ]
