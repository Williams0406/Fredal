from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("app", "0021_reporteorden_codigo_fecha_ordentrabajo_estado"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="reporteorden",
            options={"ordering": ["-fecha", "-created_at", "-id"]},
        ),
    ]
