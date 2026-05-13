import csv
import json
from datetime import date, datetime
from decimal import Decimal
from io import BytesIO, StringIO

from django.contrib.auth.models import Group, User
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from openpyxl import Workbook, load_workbook
from rest_framework.test import APITestCase

from .models import (
    ActividadTrabajo,
    Almacen,
    Cliente,
    Compra,
    CompraDetalle,
    Dimension,
    HistorialConsumible,
    HistorialUbicacionItem,
    Item,
    ItemUnidad,
    LoteConsumible,
    Maquinaria,
    MovimientoConsumible,
    MovimientoRepuesto,
    OrdenRequerimiento,
    OrdenRequerimientoDetalle,
    OrdenTrabajo,
    PerfilUsuario,
    Proveedor,
    Trabajador,
    UbicacionCliente,
    UnidadMedida,
    current_local_date,
)
from .serializers import OrdenTrabajoSerializer


class TimezoneConfigurationTests(APITestCase):
    def test_backend_usa_zona_horaria_de_peru_y_fecha_local_en_ot(self):
        self.assertEqual(settings.TIME_ZONE, "America/Lima")
        self.assertFalse(settings.USE_TZ)
        self.assertIs(OrdenTrabajo._meta.get_field("fecha").default, current_local_date)


class CatalogoSyncViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="admin-test",
            password="secret123",
        )
        self.user.is_staff = True
        self.user.save(update_fields=["is_staff"])
        self.client.force_authenticate(user=self.user)

        self.dimension = Dimension.objects.create(
            id=1,
            codigo="LONG",
            nombre="Longitud",
            descripcion="Base",
            activo=True,
        )
        self.unidad = UnidadMedida.objects.create(
            id=1,
            nombre="METRO",
            simbolo="m",
            dimension=self.dimension,
            es_base=True,
            activo=True,
        )
        self.item = Item.objects.create(
            id=1,
            codigo="ITM-001",
            nombre="Manguera",
            tipo_insumo=Item.TipoInsumo.CONSUMIBLE,
            dimension=self.dimension,
            unidad_medida=self.unidad,
            favorito=False,
            volvo=False,
            ultimo_correlativo=3,
        )
        self.maquinaria = Maquinaria.objects.create(
            id=1,
            codigo_maquina="MQ-01",
            nombre="Excavadora",
            descripcion="Original",
            observacion="Inicial",
            gasto="12.50",
        )
        self.cliente = Cliente.objects.create(
            id=1,
            nombre="Cliente Uno",
            ruc="20111111111",
        )
        self.proveedor = Proveedor.objects.create(
            id=1,
            nombre="Proveedor Uno",
            ruc="20999999999",
            direccion="Av. Base",
        )

    def test_metadata_returns_supported_tables(self):
        response = self.client.get("/api/catalogo-sync/?metadata=1")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        keys = [table["key"] for table in payload["tables"]]

        self.assertIn("maquinarias", keys)
        self.assertIn("items", keys)
        self.assertIn("csv", payload["formats"])
        self.assertIn("xlsx", payload["formats"])

    def test_export_returns_configured_tables_with_primary_keys(self):
        response = self.client.get("/api/catalogo-sync/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertEqual(payload["meta"]["record_counts"]["maquinarias"], 1)
        self.assertEqual(payload["tables"]["maquinarias"][0]["id"], self.maquinaria.id)
        self.assertEqual(payload["tables"]["clientes"][0]["id"], self.cliente.id)
        self.assertEqual(payload["tables"]["items"][0]["dimension"], self.dimension.id)
        self.assertEqual(payload["tables"]["items"][0]["unidad_medida"], self.unidad.id)

    def test_export_specific_table_in_csv_and_xlsx(self):
        csv_response = self.client.get(
            "/api/catalogo-sync/",
            {"table": "maquinarias", "file_format": "csv"},
        )

        self.assertEqual(csv_response.status_code, 200)
        csv_text = csv_response.content.decode("utf-8-sig")
        csv_rows = list(csv.DictReader(StringIO(csv_text)))
        self.assertEqual(csv_rows[0]["codigo_maquina"], "MQ-01")
        self.assertEqual(csv_rows[0]["nombre"], "Excavadora")

        xlsx_response = self.client.get(
            "/api/catalogo-sync/",
            {"table": "clientes", "file_format": "xlsx"},
        )

        self.assertEqual(xlsx_response.status_code, 200)
        workbook = load_workbook(filename=BytesIO(xlsx_response.content))
        worksheet = workbook.active

        self.assertEqual(worksheet["A1"].value, "id")
        self.assertEqual(worksheet["B1"].value, "nombre")
        self.assertEqual(worksheet["B2"].value, "Cliente Uno")

    def test_import_upserts_records_by_primary_key(self):
        payload = {
            "tables": {
                "maquinarias": [
                    {
                        "id": 1,
                        "codigo_maquina": "MQ-01",
                        "nombre": "Excavadora 320",
                        "descripcion": "Actualizada",
                        "observacion": "Operativa",
                        "gasto": "22.50",
                    },
                    {
                        "id": 2,
                        "codigo_maquina": "MQ-02",
                        "nombre": "Motoniveladora",
                        "descripcion": "",
                        "observacion": "",
                        "gasto": "0.00",
                    },
                ],
                "clientes": [
                    {
                        "id": 1,
                        "nombre": "Cliente Uno",
                        "ruc": "20111111111",
                    },
                    {
                        "id": 2,
                        "nombre": "Cliente Dos",
                        "ruc": "20222222222",
                    },
                ],
                "dimensiones": [
                    {
                        "id": 1,
                        "codigo": "LONG",
                        "nombre": "Longitud",
                        "descripcion": "Base",
                        "activo": True,
                    },
                    {
                        "id": 2,
                        "codigo": "VOL",
                        "nombre": "Volumen",
                        "descripcion": "Nueva",
                        "activo": True,
                    },
                ],
                "proveedores": [
                    {
                        "id": 1,
                        "nombre": "Proveedor Uno",
                        "ruc": "20999999999",
                        "direccion": "Av. Nueva 123",
                    },
                    {
                        "id": 2,
                        "nombre": "Proveedor Dos",
                        "ruc": "20888888888",
                        "direccion": "Jr. Comercio",
                    },
                ],
                "ubicaciones_cliente": [
                    {
                        "id": 1,
                        "cliente": 1,
                        "nombre": "Taller Norte",
                        "direccion": "Zona 1",
                    }
                ],
                "unidades_medida": [
                    {
                        "id": 1,
                        "nombre": "METRO",
                        "simbolo": "m",
                        "dimension": 1,
                        "es_base": True,
                        "activo": True,
                    },
                    {
                        "id": 2,
                        "nombre": "LITRO",
                        "simbolo": "L",
                        "dimension": 2,
                        "es_base": True,
                        "activo": True,
                    },
                ],
                "items": [
                    {
                        "id": 1,
                        "codigo": "ITM-001",
                        "nombre": "Manguera Premium",
                        "tipo_insumo": "CONSUMIBLE",
                        "dimension": 1,
                        "unidad_medida": 1,
                        "favorito": True,
                        "volvo": False,
                        "ultimo_correlativo": 7,
                    },
                    {
                        "id": 2,
                        "codigo": "ITM-002",
                        "nombre": "Aceite Hidraulico",
                        "tipo_insumo": "CONSUMIBLE",
                        "dimension": 2,
                        "unidad_medida": 2,
                        "favorito": False,
                        "volvo": True,
                        "ultimo_correlativo": 0,
                    },
                ],
            }
        }
        upload = SimpleUploadedFile(
            "catalogos.json",
            json.dumps(payload).encode("utf-8"),
            content_type="application/json",
        )

        response = self.client.post(
            "/api/catalogo-sync/",
            {"file": upload},
            format="multipart",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"]["processed"], 13)
        self.assertEqual(response.data["summary"]["created"], 7)
        self.assertEqual(response.data["summary"]["updated"], 3)
        self.assertEqual(response.data["summary"]["unchanged"], 3)

        self.maquinaria.refresh_from_db()
        self.proveedor.refresh_from_db()
        self.item.refresh_from_db()

        self.assertEqual(self.maquinaria.nombre, "Excavadora 320")
        self.assertEqual(str(self.maquinaria.gasto), "22.50")
        self.assertEqual(self.proveedor.direccion, "Av. Nueva 123")
        self.assertEqual(self.item.nombre, "Manguera Premium")
        self.assertTrue(self.item.favorito)
        self.assertEqual(self.item.ultimo_correlativo, 7)

        self.assertTrue(Maquinaria.objects.filter(pk=2).exists())
        self.assertTrue(Cliente.objects.filter(pk=2).exists())
        self.assertTrue(Dimension.objects.filter(pk=2).exists())
        self.assertTrue(Proveedor.objects.filter(pk=2).exists())
        self.assertTrue(UbicacionCliente.objects.filter(pk=1).exists())
        self.assertTrue(UnidadMedida.objects.filter(pk=2).exists())
        self.assertTrue(Item.objects.filter(pk=2).exists())

    def test_import_selected_table_from_csv(self):
        csv_content = (
            "id,codigo_maquina,nombre,descripcion,observacion,gasto\n"
            "1,MQ-01,Excavadora 320,Actualizada,Operativa,22.50\n"
            "2,MQ-02,Motoniveladora,,,0.00\n"
        )
        upload = SimpleUploadedFile(
            "maquinarias.csv",
            csv_content.encode("utf-8"),
            content_type="text/csv",
        )

        response = self.client.post(
            "/api/catalogo-sync/",
            {"table": "maquinarias", "file": upload},
            format="multipart",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"]["processed"], 2)
        self.assertEqual(response.data["summary"]["created"], 1)
        self.assertEqual(response.data["summary"]["updated"], 1)
        self.assertEqual(response.data["summary"]["tables"][0]["key"], "maquinarias")

        self.maquinaria.refresh_from_db()
        self.assertEqual(self.maquinaria.nombre, "Excavadora 320")
        self.assertEqual(str(self.maquinaria.gasto), "22.50")
        self.assertTrue(Maquinaria.objects.filter(pk=2).exists())

    def test_import_selected_table_from_xlsx(self):
        workbook = Workbook()
        worksheet = workbook.active
        worksheet.append(["id", "nombre", "ruc"])
        worksheet.append([1, "Cliente Uno Premium", "20111111111"])
        worksheet.append([2, "Cliente Dos", "20222222222"])

        output = BytesIO()
        workbook.save(output)
        upload = SimpleUploadedFile(
            "clientes.xlsx",
            output.getvalue(),
            content_type=(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            ),
        )

        response = self.client.post(
            "/api/catalogo-sync/",
            {"table": "clientes", "file": upload},
            format="multipart",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"]["processed"], 2)
        self.assertEqual(response.data["summary"]["created"], 1)
        self.assertEqual(response.data["summary"]["updated"], 1)

        self.cliente.refresh_from_db()
        self.assertEqual(self.cliente.nombre, "Cliente Uno Premium")
        self.assertTrue(Cliente.objects.filter(pk=2, nombre="Cliente Dos").exists())


class ItemYCompraLegacyTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="admin-legacy",
            password="secret123",
        )
        self.user.is_staff = True
        self.user.save(update_fields=["is_staff"])
        self.client.force_authenticate(user=self.user)

        self.dimension_unidad = Dimension.objects.create(
            codigo="UNIDAD",
            nombre="Unidad",
            descripcion="Conteo unitario",
            activo=True,
        )
        self.unidad_cantidad = UnidadMedida.objects.create(
            nombre="Cantidad",
            simbolo="und",
            dimension=self.dimension_unidad,
            es_base=True,
            activo=True,
        )

    def test_crear_herramienta_asigna_unidad_por_defecto(self):
        response = self.client.post(
            "/api/items/",
            {
                "codigo": "TOOL-001",
                "nombre": "Llave Stilson",
                "tipo_insumo": Item.TipoInsumo.HERRAMIENTA,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)

        item = Item.objects.get(pk=response.data["id"])
        self.assertEqual(item.dimension_id, self.dimension_unidad.id)
        self.assertEqual(item.unidad_medida_id, self.unidad_cantidad.id)

    def test_compra_herramienta_legacy_sanea_configuracion_y_registra_unidades(self):
        item = Item.objects.create(
            codigo="TOOL-LEG-001",
            nombre="Martillo",
            tipo_insumo=Item.TipoInsumo.HERRAMIENTA,
            dimension=None,
            unidad_medida=None,
        )

        response = self.client.post(
            "/api/compras/batch/",
            {
                "fecha": "2026-05-11",
                "moneda": "PEN",
                "items": [
                    {
                        "item": item.id,
                        "cantidad": 2,
                        "unidad_medida": None,
                        "tipo_registro": "VALOR_UNITARIO",
                        "monto": "25.00",
                        "moneda": "PEN",
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)

        item.refresh_from_db()
        self.assertEqual(item.dimension_id, self.dimension_unidad.id)
        self.assertEqual(item.unidad_medida_id, self.unidad_cantidad.id)
        self.assertEqual(item.unidades.count(), 2)


class MaquinariaHorometroActualTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="admin-maq-horometro",
            password="secret123",
        )
        self.user.is_staff = True
        self.user.save(update_fields=["is_staff"])
        self.client.force_authenticate(user=self.user)

        self.maquinaria = Maquinaria.objects.create(
            codigo_maquina="MQ-HM-01",
            nombre="Excavadora HM",
            descripcion="Prueba",
            observacion="",
            gasto="0.00",
        )

    def _crear_orden(self, *, fecha, horometro, hora_inicio=None, hora_fin=None):
        return OrdenTrabajo.objects.create(
            maquinaria=self.maquinaria,
            fecha=fecha,
            horometro=horometro,
            hora_inicio=hora_inicio,
            hora_fin=hora_fin,
            prioridad="REGULAR",
            lugar=OrdenTrabajo.Lugar.TALLER,
            observaciones="",
        )

    def test_lista_maquinaria_usa_horometro_manual_si_es_mas_reciente_que_la_ot(self):
        self._crear_orden(
            fecha=date(2026, 5, 10),
            horometro=Decimal("120.00"),
        )
        self.maquinaria.horometro_manual = Decimal("135.50")
        self.maquinaria.horometro_manual_actualizado_en = datetime(2026, 5, 11, 8, 0, 0)
        self.maquinaria.save(update_fields=["horometro_manual", "horometro_manual_actualizado_en"])

        response = self.client.get("/api/maquinarias/")

        self.assertEqual(response.status_code, 200, response.data)
        maquinaria = response.data[0]
        self.assertEqual(Decimal(str(maquinaria["horometro_actual"])), Decimal("135.50"))
        self.assertEqual(maquinaria["horometro_fuente"], "MANUAL")
        self.assertEqual(str(maquinaria["fecha_ultimo_horometro"]), "2026-05-11")

    def test_lista_maquinaria_usa_horometro_de_ot_si_la_ot_tiene_fecha_mas_reciente(self):
        self.maquinaria.horometro_manual = Decimal("135.50")
        self.maquinaria.horometro_manual_actualizado_en = datetime(2026, 5, 11, 8, 0, 0)
        self.maquinaria.save(update_fields=["horometro_manual", "horometro_manual_actualizado_en"])
        self._crear_orden(
            fecha=date(2026, 5, 12),
            horometro=Decimal("148.00"),
        )

        response = self.client.get("/api/maquinarias/")

        self.assertEqual(response.status_code, 200, response.data)
        maquinaria = response.data[0]
        self.assertEqual(Decimal(str(maquinaria["horometro_actual"])), Decimal("148.00"))
        self.assertEqual(maquinaria["horometro_fuente"], "ORDEN_TRABAJO")
        self.assertEqual(str(maquinaria["fecha_ultimo_horometro"]), "2026-05-12")

    def test_put_maquinaria_permite_editar_horometro_manual_y_actualiza_fecha_manual(self):
        response = self.client.put(
            f"/api/maquinarias/{self.maquinaria.id}/",
            {
                "codigo_maquina": self.maquinaria.codigo_maquina,
                "nombre": self.maquinaria.nombre,
                "descripcion": self.maquinaria.descripcion,
                "observacion": self.maquinaria.observacion,
                "gasto": "0.00",
                "horometro_manual": "222.25",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        self.maquinaria.refresh_from_db()
        self.assertEqual(self.maquinaria.horometro_manual, Decimal("222.25"))
        self.assertIsNotNone(self.maquinaria.horometro_manual_actualizado_en)
        self.assertEqual(Decimal(str(response.data["horometro_actual"])), Decimal("222.25"))
        self.assertEqual(response.data["horometro_fuente"], "MANUAL")


class OrdenTrabajoHistorialConsumibleHorometroTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="admin-horometro-cons",
            password="secret123",
        )
        self.user.is_staff = True
        self.user.save(update_fields=["is_staff"])
        self.client.force_authenticate(user=self.user)

        self.dimension = Dimension.objects.create(
            codigo="VOL",
            nombre="Volumen",
            descripcion="Consumibles",
            activo=True,
        )
        self.unidad = UnidadMedida.objects.create(
            nombre="LITRO",
            simbolo="L",
            dimension=self.dimension,
            es_base=True,
            activo=True,
        )
        self.item = Item.objects.create(
            codigo="CONS-001",
            nombre="Aceite",
            tipo_insumo=Item.TipoInsumo.CONSUMIBLE,
            dimension=self.dimension,
            unidad_medida=self.unidad,
        )
        self.maquinaria = Maquinaria.objects.create(
            codigo_maquina="MQ-HT-01",
            nombre="Excavadora",
            descripcion="Prueba",
            observacion="",
            gasto="0.00",
        )
        self.trabajador = Trabajador.objects.create(
            nombres="Ana",
            apellidos="Perez",
            dni="12345678",
            puesto="Tecnico",
        )
        self.almacen = Almacen.objects.create(nombre="Principal")
        self.proveedor = Proveedor.objects.create(
            nombre="Proveedor HT",
            ruc="20123456789",
            direccion="Av. Test",
        )
        self.compra = Compra.objects.create(proveedor=self.proveedor)
        self.compra_detalle = CompraDetalle.objects.create(
            compra=self.compra,
            item=self.item,
            cantidad=100,
            unidad_medida=self.unidad,
            moneda=Compra.Moneda.PEN,
            valor_unitario="10.00",
        )

    def _crear_lote(self):
        return LoteConsumible.objects.create(
            compra_detalle=self.compra_detalle,
            item=self.item,
            cantidad_inicial=Decimal("100.000000"),
            cantidad_disponible=Decimal("100.000000"),
            unidad_medida=self.unidad,
            almacen=self.almacen,
        )

    def _crear_orden(self, fecha, horometro=None):
        orden = OrdenTrabajo.objects.create(
            maquinaria=self.maquinaria,
            fecha=fecha,
            horometro=horometro,
            prioridad="REGULAR",
            lugar=OrdenTrabajo.Lugar.TALLER,
            observaciones="",
        )
        orden.tecnicos.add(self.trabajador)
        return orden

    def _crear_actividad_registrada(self, orden):
        return ActividadTrabajo.objects.create(
            orden=orden,
            tipo_actividad=ActividadTrabajo.TipoActividad.MANTENIMIENTO,
            tipo_mantenimiento=ActividadTrabajo.TipoMantenimiento.PREVENTIVO,
            subtipo=ActividadTrabajo.SubTipo.PM1,
            descripcion="Registro",
            es_planificada=False,
        )

    def _actualizar_horometro(self, orden, horometro):
        serializer = OrdenTrabajoSerializer(
            instance=orden,
            data={"horometro": str(horometro)},
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

    def test_movimiento_consumible_registrado_crea_historial_en_maquinaria(self):
        lote = self._crear_lote()
        lote.cantidad_disponible = Decimal("10.000000")
        lote.save(update_fields=["cantidad_disponible"])

        historial_tecnico = HistorialConsumible.objects.create(
            lote=lote,
            item=self.item,
            cantidad=Decimal("10.000000"),
            unidad_medida=self.unidad,
            trabajador=self.trabajador,
        )

        orden = self._crear_orden(date(2026, 5, 2))
        actividad = self._crear_actividad_registrada(orden)

        response = self.client.post(
            "/api/movimientos-consumible/",
            {
                "actividad": actividad.id,
                "item": self.item.id,
                "cantidad": "5",
                "tecnico": self.trabajador.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)

        lote.refresh_from_db()
        historial_tecnico.refresh_from_db()
        historial_maquinaria = HistorialConsumible.objects.get(
            orden_trabajo=orden,
            maquinaria=self.maquinaria,
            item=self.item,
        )
        historial_tecnico_restante = HistorialConsumible.objects.get(
            trabajador=self.trabajador,
            item=self.item,
            fecha_fin__isnull=True,
        )

        self.assertIsNone(historial_maquinaria.trabajador)
        self.assertEqual(historial_maquinaria.maquinaria_id, self.maquinaria.id)
        self.assertIsNone(historial_maquinaria.horometro_inicio)
        self.assertEqual(historial_maquinaria.cantidad, Decimal("5.000000"))
        self.assertEqual(lote.cantidad_disponible, Decimal("10.000000"))
        self.assertFalse(historial_tecnico.fecha_fin is None)
        self.assertEqual(historial_tecnico.cantidad, Decimal("5.000000"))
        self.assertEqual(historial_tecnico_restante.cantidad, Decimal("5.000000"))

    def test_horometros_solo_afectan_historiales_consumibles_de_maquinaria_registrada(self):
        orden_muy_anterior = self._crear_orden(date(2026, 5, 1), horometro=Decimal("80.00"))
        orden_anterior = self._crear_orden(date(2026, 5, 2), horometro=Decimal("100.00"))
        orden_actual = self._crear_orden(date(2026, 5, 3))

        actividad_muy_anterior = self._crear_actividad_registrada(orden_muy_anterior)
        actividad_anterior = self._crear_actividad_registrada(orden_anterior)
        actividad_actual = self._crear_actividad_registrada(orden_actual)

        MovimientoConsumible.objects.create(
            actividad=actividad_muy_anterior,
            item=self.item,
            cantidad=Decimal("2.000000"),
            unidad_medida=self.unidad,
            tecnico=self.trabajador,
        )
        MovimientoConsumible.objects.create(
            actividad=actividad_anterior,
            item=self.item,
            cantidad=Decimal("5.000000"),
            unidad_medida=self.unidad,
            tecnico=self.trabajador,
        )
        MovimientoConsumible.objects.create(
            actividad=actividad_actual,
            item=self.item,
            cantidad=Decimal("3.000000"),
            unidad_medida=self.unidad,
            tecnico=self.trabajador,
        )

        historial_muy_anterior = HistorialConsumible.objects.create(
            lote=self._crear_lote(),
            item=self.item,
            cantidad=Decimal("2.000000"),
            unidad_medida=self.unidad,
            maquinaria=self.maquinaria,
            orden_trabajo=orden_muy_anterior,
            fecha_fin=timezone.now(),
            horometro_inicio=Decimal("80.00"),
        )
        historial_anterior_1 = HistorialConsumible.objects.create(
            lote=self._crear_lote(),
            item=self.item,
            cantidad=Decimal("4.000000"),
            unidad_medida=self.unidad,
            maquinaria=self.maquinaria,
            orden_trabajo=orden_anterior,
            fecha_fin=timezone.now(),
            horometro_inicio=Decimal("100.00"),
        )
        historial_anterior_2 = HistorialConsumible.objects.create(
            lote=self._crear_lote(),
            item=self.item,
            cantidad=Decimal("1.000000"),
            unidad_medida=self.unidad,
            maquinaria=self.maquinaria,
            orden_trabajo=orden_anterior,
            fecha_fin=timezone.now(),
            horometro_inicio=Decimal("100.00"),
        )
        historial_anterior_tecnico = HistorialConsumible.objects.create(
            lote=self._crear_lote(),
            item=self.item,
            cantidad=Decimal("1.500000"),
            unidad_medida=self.unidad,
            trabajador=self.trabajador,
            orden_trabajo=orden_anterior,
            fecha_fin=timezone.now(),
        )
        historial_actual_maquinaria = HistorialConsumible.objects.create(
            lote=self._crear_lote(),
            item=self.item,
            cantidad=Decimal("3.000000"),
            unidad_medida=self.unidad,
            maquinaria=self.maquinaria,
            orden_trabajo=orden_actual,
        )
        historial_actual_tecnico = HistorialConsumible.objects.create(
            lote=self._crear_lote(),
            item=self.item,
            cantidad=Decimal("2.000000"),
            unidad_medida=self.unidad,
            trabajador=self.trabajador,
            orden_trabajo=orden_actual,
        )

        self._actualizar_horometro(orden_actual, Decimal("150.00"))

        historial_muy_anterior.refresh_from_db()
        historial_anterior_1.refresh_from_db()
        historial_anterior_2.refresh_from_db()
        historial_anterior_tecnico.refresh_from_db()
        historial_actual_maquinaria.refresh_from_db()
        historial_actual_tecnico.refresh_from_db()

        self.assertIsNone(historial_muy_anterior.horometro_fin)
        self.assertEqual(historial_anterior_1.horometro_fin, Decimal("150.00"))
        self.assertEqual(historial_anterior_2.horometro_fin, Decimal("150.00"))
        self.assertIsNone(historial_anterior_tecnico.horometro_fin)
        self.assertEqual(historial_actual_maquinaria.horometro_inicio, Decimal("150.00"))
        self.assertIsNone(historial_actual_tecnico.horometro_inicio)

    def test_consumible_registrado_autocompleta_horometro_fin_en_historial_previo_abierto(self):
        lote = self._crear_lote()
        historial_tecnico = HistorialConsumible.objects.create(
            lote=lote,
            item=self.item,
            cantidad=Decimal("10.000000"),
            unidad_medida=self.unidad,
            trabajador=self.trabajador,
        )
        orden_anterior = self._crear_orden(date(2026, 5, 5), horometro=Decimal("100.00"))
        HistorialConsumible.objects.create(
            lote=self._crear_lote(),
            item=self.item,
            cantidad=Decimal("4.000000"),
            unidad_medida=self.unidad,
            maquinaria=self.maquinaria,
            orden_trabajo=orden_anterior,
            horometro_inicio=Decimal("100.00"),
        )
        orden_actual = self._crear_orden(date(2026, 5, 5), horometro=Decimal("150.00"))
        actividad_actual = self._crear_actividad_registrada(orden_actual)

        response = self.client.post(
            "/api/movimientos-consumible/",
            {
                "actividad": actividad_actual.id,
                "item": self.item.id,
                "cantidad": "5",
                "tecnico": self.trabajador.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)

        historial_tecnico.refresh_from_db()
        historial_anterior = HistorialConsumible.objects.get(
            orden_trabajo=orden_anterior,
            maquinaria=self.maquinaria,
            item=self.item,
        )
        historial_actual = HistorialConsumible.objects.get(
            orden_trabajo=orden_actual,
            maquinaria=self.maquinaria,
            item=self.item,
        )

        self.assertEqual(historial_anterior.horometro_fin, Decimal("150.00"))
        self.assertIsNone(historial_anterior.fecha_fin)
        self.assertEqual(historial_actual.horometro_inicio, Decimal("150.00"))
        self.assertEqual(historial_actual.cantidad, Decimal("5.000000"))
        self.assertEqual(historial_tecnico.cantidad, Decimal("5.000000"))


class OrdenTrabajoHistorialRepuestoHorometroTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="admin-ht-rep",
            password="secret123",
        )
        self.user.is_staff = True
        self.user.save(update_fields=["is_staff"])
        self.client.force_authenticate(user=self.user)

        self.maquinaria = Maquinaria.objects.create(
            codigo_maquina="MQ-HT-REP-01",
            nombre="Retroexcavadora",
            descripcion="Prueba",
            observacion="",
            gasto="0.00",
        )
        self.trabajador = Trabajador.objects.create(
            nombres="Jorge",
            apellidos="Rivas",
            dni="11223344",
            puesto="Tecnico",
        )
        self.item = Item.objects.create(
            codigo="REP-HT-001",
            nombre="Filtro de aceite",
            tipo_insumo=Item.TipoInsumo.REPUESTO,
        )

    def _crear_orden(self, fecha, horometro=None):
        orden = OrdenTrabajo.objects.create(
            maquinaria=self.maquinaria,
            fecha=fecha,
            horometro=horometro,
            prioridad="REGULAR",
            lugar=OrdenTrabajo.Lugar.TALLER,
            observaciones="",
        )
        orden.tecnicos.add(self.trabajador)
        return orden

    def _crear_actividad_registrada(self, orden):
        return ActividadTrabajo.objects.create(
            orden=orden,
            tipo_actividad=ActividadTrabajo.TipoActividad.MANTENIMIENTO,
            tipo_mantenimiento=ActividadTrabajo.TipoMantenimiento.PREVENTIVO,
            subtipo=ActividadTrabajo.SubTipo.PM1,
            descripcion="Registro repuesto",
            es_planificada=False,
        )

    def _crear_unidad_asignada_a_tecnico(self):
        unidad = ItemUnidad.objects.create(
            item=self.item,
            estado=ItemUnidad.Estado.NUEVO,
        )
        HistorialUbicacionItem.objects.create(
            item_unidad=unidad,
            trabajador=self.trabajador,
            estado=unidad.estado,
        )
        return unidad

    def _actualizar_horometro(self, orden, horometro):
        serializer = OrdenTrabajoSerializer(
            instance=orden,
            data={"horometro": str(horometro)},
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()

    def test_movimiento_repuesto_registrado_autocompleta_horometro_fin_previo_si_la_ot_ya_tiene_horometro(self):
        unidad_anterior = self._crear_unidad_asignada_a_tecnico()
        unidad_actual = self._crear_unidad_asignada_a_tecnico()

        orden_anterior = self._crear_orden(date(2026, 5, 5), horometro=Decimal("100.00"))
        actividad_anterior = self._crear_actividad_registrada(orden_anterior)
        response_anterior = self.client.post(
            "/api/movimientos-repuesto/",
            {
                "actividad": actividad_anterior.id,
                "item_unidad": unidad_anterior.id,
                "tecnico": self.trabajador.id,
            },
            format="json",
        )
        self.assertEqual(response_anterior.status_code, 201, response_anterior.data)

        historial_anterior = HistorialUbicacionItem.objects.get(
            orden_trabajo=orden_anterior,
            maquinaria=self.maquinaria,
            item_unidad=unidad_anterior,
        )
        self.assertEqual(historial_anterior.horometro_inicio, Decimal("100.00"))
        self.assertIsNone(historial_anterior.horometro_fin)

        orden_actual = self._crear_orden(date(2026, 5, 6), horometro=Decimal("150.00"))
        actividad_actual = self._crear_actividad_registrada(orden_actual)
        response_actual = self.client.post(
            "/api/movimientos-repuesto/",
            {
                "actividad": actividad_actual.id,
                "item_unidad": unidad_actual.id,
                "tecnico": self.trabajador.id,
            },
            format="json",
        )
        self.assertEqual(response_actual.status_code, 201, response_actual.data)

        historial_anterior.refresh_from_db()
        historial_actual = HistorialUbicacionItem.objects.get(
            orden_trabajo=orden_actual,
            maquinaria=self.maquinaria,
            item_unidad=unidad_actual,
        )

        self.assertEqual(historial_anterior.horometro_fin, Decimal("150.00"))
        self.assertEqual(historial_actual.horometro_inicio, Decimal("150.00"))

    def test_actualizar_horometro_de_ot_posterior_completa_horometro_fin_previo_de_repuesto(self):
        unidad_anterior = self._crear_unidad_asignada_a_tecnico()
        unidad_actual = self._crear_unidad_asignada_a_tecnico()

        orden_anterior = self._crear_orden(date(2026, 5, 10), horometro=Decimal("200.00"))
        actividad_anterior = self._crear_actividad_registrada(orden_anterior)
        response_anterior = self.client.post(
            "/api/movimientos-repuesto/",
            {
                "actividad": actividad_anterior.id,
                "item_unidad": unidad_anterior.id,
                "tecnico": self.trabajador.id,
            },
            format="json",
        )
        self.assertEqual(response_anterior.status_code, 201, response_anterior.data)

        orden_actual = self._crear_orden(date(2026, 5, 11))
        actividad_actual = self._crear_actividad_registrada(orden_actual)
        response_actual = self.client.post(
            "/api/movimientos-repuesto/",
            {
                "actividad": actividad_actual.id,
                "item_unidad": unidad_actual.id,
                "tecnico": self.trabajador.id,
            },
            format="json",
        )
        self.assertEqual(response_actual.status_code, 201, response_actual.data)

        historial_anterior = HistorialUbicacionItem.objects.get(
            orden_trabajo=orden_anterior,
            maquinaria=self.maquinaria,
            item_unidad=unidad_anterior,
        )
        historial_actual = HistorialUbicacionItem.objects.get(
            orden_trabajo=orden_actual,
            maquinaria=self.maquinaria,
            item_unidad=unidad_actual,
        )

        self.assertIsNone(historial_anterior.horometro_fin)
        self.assertIsNone(historial_actual.horometro_inicio)

        self._actualizar_horometro(orden_actual, Decimal("260.00"))

        historial_anterior.refresh_from_db()
        historial_actual.refresh_from_db()

        self.assertEqual(historial_anterior.horometro_fin, Decimal("260.00"))
        self.assertEqual(historial_actual.horometro_inicio, Decimal("260.00"))


class MovimientoConsumiblePlanificadoTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="admin-plan-cons",
            password="secret123",
        )
        self.user.is_staff = True
        self.user.save(update_fields=["is_staff"])
        self.client.force_authenticate(user=self.user)

        self.dimension = Dimension.objects.create(
            codigo="VOL-PLAN",
            nombre="Volumen plan",
            descripcion="Consumibles planificados",
            activo=True,
        )
        self.unidad = UnidadMedida.objects.create(
            nombre="LITRO-PLAN",
            simbolo="L",
            dimension=self.dimension,
            es_base=True,
            activo=True,
        )
        self.item = Item.objects.create(
            codigo="CONS-PLAN-001",
            nombre="Aceite planificado",
            tipo_insumo=Item.TipoInsumo.CONSUMIBLE,
            dimension=self.dimension,
            unidad_medida=self.unidad,
        )
        self.maquinaria = Maquinaria.objects.create(
            codigo_maquina="MQ-PLAN-01",
            nombre="Cargador frontal",
            descripcion="Prueba",
            observacion="",
            gasto="0.00",
        )
        self.tecnico = Trabajador.objects.create(
            nombres="Luis",
            apellidos="Ramos",
            dni="87654321",
            puesto="Tecnico",
        )
        self.almacen = Almacen.objects.create(nombre="Almacen Planificado")
        self.proveedor = Proveedor.objects.create(
            nombre="Proveedor Plan",
            ruc="20987654321",
            direccion="Av. Plan",
        )
        self.compra = Compra.objects.create(proveedor=self.proveedor)
        self.compra_detalle = CompraDetalle.objects.create(
            compra=self.compra,
            item=self.item,
            cantidad=50,
            unidad_medida=self.unidad,
            moneda=Compra.Moneda.PEN,
            valor_unitario="12.00",
        )
        self.lote = LoteConsumible.objects.create(
            compra_detalle=self.compra_detalle,
            item=self.item,
            cantidad_inicial=Decimal("50.000000"),
            cantidad_disponible=Decimal("50.000000"),
            unidad_medida=self.unidad,
            almacen=self.almacen,
        )
        self.orden = OrdenTrabajo.objects.create(
            maquinaria=self.maquinaria,
            fecha=date(2026, 5, 4),
            prioridad="REGULAR",
            lugar=OrdenTrabajo.Lugar.TALLER,
            observaciones="",
        )
        self.orden.tecnicos.add(self.tecnico)
        self.actividad = ActividadTrabajo.objects.create(
            orden=self.orden,
            tipo_actividad=ActividadTrabajo.TipoActividad.MANTENIMIENTO,
            tipo_mantenimiento=ActividadTrabajo.TipoMantenimiento.PREVENTIVO,
            subtipo=ActividadTrabajo.SubTipo.PM1,
            descripcion="Planificacion",
            es_planificada=True,
        )

    def test_movimiento_consumible_planificado_no_crea_historial(self):
        HistorialConsumible.objects.create(
            lote=self.lote,
            item=self.item,
            cantidad=Decimal("10.000000"),
            unidad_medida=self.unidad,
            trabajador=self.tecnico,
        )
        total_historiales_antes = HistorialConsumible.objects.count()

        response = self.client.post(
            "/api/movimientos-consumible/",
            {
                "actividad": self.actividad.id,
                "item": self.item.id,
                "cantidad": "5",
                "tecnico": self.tecnico.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(HistorialConsumible.objects.count(), total_historiales_antes)
        self.assertEqual(MovimientoConsumible.objects.count(), 1)

        movimiento = MovimientoConsumible.objects.get()
        self.assertEqual(movimiento.tecnico_id, self.tecnico.id)
        self.assertEqual(response.data["tecnico"], self.tecnico.id)
        self.assertEqual(response.data["tecnico_nombre"], "Luis Ramos")


class MovimientoRepuestoPlanificadoTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="admin-plan-rep",
            password="secret123",
        )
        self.user.is_staff = True
        self.user.save(update_fields=["is_staff"])
        self.client.force_authenticate(user=self.user)

        self.maquinaria = Maquinaria.objects.create(
            codigo_maquina="MQ-PLAN-REP-01",
            nombre="Excavadora plan",
            descripcion="Prueba",
            observacion="",
            gasto="0.00",
        )
        self.tecnico = Trabajador.objects.create(
            nombres="Mario",
            apellidos="Campos",
            dni="88776655",
            puesto="Tecnico",
        )
        self.almacen = Almacen.objects.create(nombre="Almacen Plan Repuesto")
        self.orden = OrdenTrabajo.objects.create(
            maquinaria=self.maquinaria,
            fecha=date(2026, 5, 6),
            prioridad="REGULAR",
            lugar=OrdenTrabajo.Lugar.TALLER,
            observaciones="",
        )
        self.orden.tecnicos.add(self.tecnico)
        self.actividad_planificada = ActividadTrabajo.objects.create(
            orden=self.orden,
            tipo_actividad=ActividadTrabajo.TipoActividad.MANTENIMIENTO,
            tipo_mantenimiento=ActividadTrabajo.TipoMantenimiento.PREVENTIVO,
            subtipo=ActividadTrabajo.SubTipo.PM1,
            descripcion="Planificacion repuestos",
            es_planificada=True,
        )
        self.actividad_real = ActividadTrabajo.objects.create(
            orden=self.orden,
            tipo_actividad=ActividadTrabajo.TipoActividad.MANTENIMIENTO,
            tipo_mantenimiento=ActividadTrabajo.TipoMantenimiento.PREVENTIVO,
            subtipo=ActividadTrabajo.SubTipo.PM1,
            descripcion="Ejecucion repuestos",
            es_planificada=False,
        )
        self.item = Item.objects.create(
            codigo="REP-PLAN-001",
            nombre="Filtro planificado",
            tipo_insumo=Item.TipoInsumo.REPUESTO,
        )
        self.unidad = ItemUnidad.objects.create(
            item=self.item,
            estado=ItemUnidad.Estado.NUEVO,
        )
        HistorialUbicacionItem.objects.create(
            item_unidad=self.unidad,
            trabajador=self.tecnico,
            estado=self.unidad.estado,
        )
        self.unidad_alterna = ItemUnidad.objects.create(
            item=self.item,
            estado=ItemUnidad.Estado.NUEVO,
        )
        HistorialUbicacionItem.objects.create(
            item_unidad=self.unidad_alterna,
            trabajador=self.tecnico,
            estado=self.unidad_alterna.estado,
        )

    def test_movimiento_repuesto_planificado_no_crea_historial(self):
        total_historiales_antes = HistorialUbicacionItem.objects.count()

        response = self.client.post(
            "/api/movimientos-repuesto/",
            {
                "actividad": self.actividad_planificada.id,
                "item_unidad": self.unidad.id,
                "tecnico": self.tecnico.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(HistorialUbicacionItem.objects.count(), total_historiales_antes)
        self.assertEqual(MovimientoRepuesto.objects.count(), 1)

        movimiento = MovimientoRepuesto.objects.get()
        self.assertEqual(movimiento.tecnico_id, self.tecnico.id)
        self.assertEqual(response.data["tecnico"], self.tecnico.id)
        self.assertEqual(response.data["tecnico_id"], self.tecnico.id)
        self.assertEqual(response.data["tecnico_nombre"], "Mario Campos")

    def test_movimiento_real_reutiliza_unidad_planificada_sin_historial_previsto(self):
        plan_response = self.client.post(
            "/api/movimientos-repuesto/",
            {
                "actividad": self.actividad_planificada.id,
                "item_unidad": self.unidad.id,
                "tecnico": self.tecnico.id,
            },
            format="json",
        )
        self.assertEqual(plan_response.status_code, 201, plan_response.data)

        historial_count_antes = HistorialUbicacionItem.objects.count()

        response = self.client.post(
            "/api/movimientos-repuesto/",
            {
                "actividad": self.actividad_real.id,
                "item_unidad": self.unidad_alterna.id,
                "tecnico": self.tecnico.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)

        movimiento_real = MovimientoRepuesto.objects.get(actividad=self.actividad_real)
        self.assertEqual(movimiento_real.item_unidad_id, self.unidad.id)
        self.assertEqual(HistorialUbicacionItem.objects.count(), historial_count_antes + 1)

        historial_real = HistorialUbicacionItem.objects.filter(
            item_unidad=self.unidad,
            orden_trabajo=self.orden,
        ).order_by("-id").first()
        self.assertIsNotNone(historial_real)
        self.assertEqual(historial_real.maquinaria_id, self.maquinaria.id)
        self.assertIsNone(historial_real.trabajador_id)
        self.assertEqual(historial_real.estado, ItemUnidad.Estado.USADO)

        self.unidad.refresh_from_db()
        self.assertEqual(self.unidad.maquinaria_actual_id, self.maquinaria.id)
        self.assertIsNone(self.unidad.trabajador_actual_id)


class OrdenRequerimientoPermisosTests(APITestCase):
    def setUp(self):
        self.jefe_tecnicos_group = Group.objects.create(name="Jefe de Tecnicos")
        self.jefe_almacen_group = Group.objects.create(name="Jefe de Almaceneros")
        self.almacenero_group = Group.objects.create(name="Almacenero")
        self.tecnico_group = Group.objects.create(name="Tecnico")

        self.jefe_tecnicos_user = User.objects.create_user(
            username="jefe-tecnicos",
            password="secret123",
        )
        self.jefe_tecnicos_user.groups.add(self.jefe_tecnicos_group)

        self.almacen_user = User.objects.create_user(
            username="jefe-almacen",
            password="secret123",
        )
        self.almacen_user.groups.add(self.jefe_almacen_group)

        self.tecnico = Trabajador.objects.create(
            nombres="Pedro",
            apellidos="Quispe",
            dni="44556677",
            puesto="Tecnico",
        )
        self.tecnico_user = User.objects.create_user(
            username="tecnico-asignado",
            password="secret123",
        )
        self.tecnico_user.groups.add(self.tecnico_group)
        PerfilUsuario.objects.create(user=self.tecnico_user, trabajador=self.tecnico)

        self.dimension = Dimension.objects.create(
            codigo="VOL-REQ",
            nombre="Volumen requerimiento",
            descripcion="Base",
            activo=True,
        )
        self.unidad = UnidadMedida.objects.create(
            nombre="LITRO-REQ",
            simbolo="L",
            dimension=self.dimension,
            es_base=True,
            activo=True,
        )
        self.item = Item.objects.create(
            codigo="CONS-REQ-001",
            nombre="Aceite motor",
            tipo_insumo=Item.TipoInsumo.CONSUMIBLE,
            dimension=self.dimension,
            unidad_medida=self.unidad,
        )
        self.almacen = Almacen.objects.create(nombre="Almacen Requerimientos")
        self.proveedor = Proveedor.objects.create(
            nombre="Proveedor Req",
            ruc="20123456789",
            direccion="Av. Requerimientos",
        )
        self.compra = Compra.objects.create(proveedor=self.proveedor)
        self.compra_detalle = CompraDetalle.objects.create(
            compra=self.compra,
            item=self.item,
            cantidad=10,
            unidad_medida=self.unidad,
            moneda=Compra.Moneda.PEN,
            valor_unitario="20.00",
        )
        self.lote = LoteConsumible.objects.create(
            compra_detalle=self.compra_detalle,
            item=self.item,
            cantidad_inicial=Decimal("10.000000"),
            cantidad_disponible=Decimal("10.000000"),
            unidad_medida=self.unidad,
            almacen=self.almacen,
        )
        HistorialConsumible.objects.create(
            lote=self.lote,
            item=self.item,
            cantidad=Decimal("10.000000"),
            unidad_medida=self.unidad,
            almacen=self.almacen,
        )

        self.maquinaria = Maquinaria.objects.create(
            codigo_maquina="MQ-REQ-01",
            nombre="Retroexcavadora",
            descripcion="Prueba",
            observacion="",
            gasto="0.00",
        )
        self.orden_trabajo = OrdenTrabajo.objects.create(
            maquinaria=self.maquinaria,
            fecha=date(2026, 5, 12),
            prioridad="REGULAR",
            lugar=OrdenTrabajo.Lugar.TALLER,
            observaciones="",
        )
        self.orden_trabajo.tecnicos.add(self.tecnico)

    def _crear_requerimiento(self, tecnico_asignado=None):
        orden = OrdenRequerimiento.objects.create(
            trabajo=self.orden_trabajo,
            tecnico_asignado=tecnico_asignado,
            observaciones="Materiales para la OT",
            emitido_por=self.jefe_tecnicos_user,
        )
        OrdenRequerimientoDetalle.objects.create(
            orden_requerimiento=orden,
            item=self.item,
            cantidad=Decimal("2.000000"),
            proveedor=self.proveedor,
        )
        return orden

    def test_jefe_tecnicos_puede_crear_orden_requerimiento(self):
        self.client.force_authenticate(user=self.jefe_tecnicos_user)

        response = self.client.post(
            "/api/ordenes-requerimiento/",
            {
                "trabajo": self.orden_trabajo.id,
                "tecnico_asignado": self.tecnico.id,
                "observaciones": "Solicitar aceite",
                "items": [
                    {
                        "item": self.item.id,
                        "cantidad": "2",
                        "proveedor": self.proveedor.id,
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["tecnico_asignado"], self.tecnico.id)
        self.assertEqual(OrdenRequerimiento.objects.count(), 1)

    def test_jefe_tecnicos_puede_listar_items_para_emitir_requerimientos(self):
        self.client.force_authenticate(user=self.jefe_tecnicos_user)

        response = self.client.get("/api/items/")

        self.assertEqual(response.status_code, 200, response.data)
        item_ids = [row["id"] for row in response.data]
        self.assertIn(self.item.id, item_ids)

    def test_jefe_tecnicos_puede_registrar_movimiento_consumible(self):
        actividad = ActividadTrabajo.objects.create(
            orden=self.orden_trabajo,
            tipo_actividad=ActividadTrabajo.TipoActividad.MANTENIMIENTO,
            tipo_mantenimiento=ActividadTrabajo.TipoMantenimiento.PREVENTIVO,
            subtipo=ActividadTrabajo.SubTipo.PM1,
            descripcion="Registro desde jefe de tecnicos",
            es_planificada=False,
        )
        HistorialConsumible.objects.create(
            lote=self.lote,
            item=self.item,
            cantidad=Decimal("5.000000"),
            unidad_medida=self.unidad,
            trabajador=self.tecnico,
        )

        self.client.force_authenticate(user=self.jefe_tecnicos_user)

        response = self.client.post(
            "/api/movimientos-consumible/",
            {
                "actividad": actividad.id,
                "item": self.item.id,
                "cantidad": "1",
                "tecnico": self.tecnico.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["tecnico"], self.tecnico.id)

    def test_tecnico_asignado_puede_marcar_entregado(self):
        orden = self._crear_requerimiento(tecnico_asignado=self.tecnico)
        self.client.force_authenticate(user=self.tecnico_user)

        response = self.client.post(
            f"/api/ordenes-requerimiento/{orden.id}/cambiar_estado/",
            {"estado": OrdenRequerimiento.Estado.ENTREGADO},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.data)
        orden.refresh_from_db()
        self.assertEqual(orden.estado, OrdenRequerimiento.Estado.ENTREGADO)

    def test_tecnico_asignado_no_puede_marcar_sin_stock(self):
        orden = self._crear_requerimiento(tecnico_asignado=self.tecnico)
        self.client.force_authenticate(user=self.tecnico_user)

        response = self.client.post(
            f"/api/ordenes-requerimiento/{orden.id}/cambiar_estado/",
            {"estado": OrdenRequerimiento.Estado.SIN_STOCK},
            format="json",
        )

        self.assertEqual(response.status_code, 403, response.data)
        orden.refresh_from_db()
        self.assertEqual(orden.estado, OrdenRequerimiento.Estado.POR_REVISAR)


class ActividadPlanificadaPermisosTests(APITestCase):
    def setUp(self):
        self.jefe_tecnicos_group = Group.objects.create(name="Jefe de Tecnicos")
        self.jefe_almacen_group = Group.objects.create(name="Jefe de Almaceneros")
        self.almacenero_group = Group.objects.create(name="Almacenero")

        self.jefe_tecnicos_user = User.objects.create_user(
            username="jefe-tecnicos-plan",
            password="secret123",
        )
        self.jefe_tecnicos_user.groups.add(self.jefe_tecnicos_group)

        self.jefe_almacen_user = User.objects.create_user(
            username="jefe-almacen-plan",
            password="secret123",
        )
        self.jefe_almacen_user.groups.add(self.jefe_almacen_group)

        self.almacenero_user = User.objects.create_user(
            username="almacenero-plan",
            password="secret123",
        )
        self.almacenero_user.groups.add(self.almacenero_group)

        self.maquinaria = Maquinaria.objects.create(
            codigo_maquina="MQ-ACT-01",
            nombre="Motoniveladora",
            descripcion="Prueba",
            observacion="",
            gasto="0.00",
        )
        self.orden = OrdenTrabajo.objects.create(
            maquinaria=self.maquinaria,
            fecha=date(2026, 5, 12),
            prioridad="REGULAR",
            lugar=OrdenTrabajo.Lugar.TALLER,
            observaciones="",
        )

    def test_jefe_tecnicos_puede_crear_actividad_planificada(self):
        self.client.force_authenticate(user=self.jefe_tecnicos_user)

        response = self.client.post(
            "/api/actividades/",
            {
                "orden": self.orden.id,
                "tipo_actividad": ActividadTrabajo.TipoActividad.REVISION,
                "descripcion": "Revision programada",
                "es_planificada": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(response.data["es_planificada"])

    def test_almacenero_no_puede_crear_actividad_planificada(self):
        self.client.force_authenticate(user=self.almacenero_user)

        response = self.client.post(
            "/api/actividades/",
            {
                "orden": self.orden.id,
                "tipo_actividad": ActividadTrabajo.TipoActividad.REVISION,
                "descripcion": "Revision programada",
                "es_planificada": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403, response.data)

    def test_jefe_almacen_puede_crear_actividad_planificada(self):
        self.client.force_authenticate(user=self.jefe_almacen_user)

        response = self.client.post(
            "/api/actividades/",
            {
                "orden": self.orden.id,
                "tipo_actividad": ActividadTrabajo.TipoActividad.REVISION,
                "descripcion": "Revision programada",
                "es_planificada": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
