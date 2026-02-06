from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0004_actividadtrabajo_es_planificada"),
    ]

    operations = [
        migrations.CreateModel(
            name="Cliente",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("nombre", models.CharField(max_length=150)),
                ("ruc", models.CharField(max_length=20, unique=True)),
            ],
        ),
        migrations.CreateModel(
            name="UnidadEquivalencia",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("nombre", models.CharField(max_length=30, unique=True)),
                ("factor_a_unidad", models.DecimalField(decimal_places=4, max_digits=12)),
                ("activo", models.BooleanField(default=True)),
            ],
        ),
        migrations.CreateModel(
            name="UbicacionCliente",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("nombre", models.CharField(max_length=150)),
                ("direccion", models.CharField(blank=True, default="", max_length=255)),
                ("cliente", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="ubicaciones", to="app.cliente")),
            ],
            options={"unique_together": {("cliente", "nombre")}},
        ),
    ]
