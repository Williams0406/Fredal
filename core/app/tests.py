import csv
import json
from io import BytesIO, StringIO

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from openpyxl import Workbook, load_workbook
from rest_framework.test import APITestCase

from .models import (
    Cliente,
    Dimension,
    Item,
    Maquinaria,
    Proveedor,
    UbicacionCliente,
    UnidadMedida,
)


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
