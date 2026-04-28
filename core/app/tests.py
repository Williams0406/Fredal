import json

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
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

    def test_export_returns_configured_tables_with_primary_keys(self):
        response = self.client.get("/api/catalogo-sync/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertEqual(payload["meta"]["record_counts"]["maquinarias"], 1)
        self.assertEqual(payload["tables"]["maquinarias"][0]["id"], self.maquinaria.id)
        self.assertEqual(payload["tables"]["clientes"][0]["id"], self.cliente.id)
        self.assertEqual(payload["tables"]["items"][0]["dimension"], self.dimension.id)
        self.assertEqual(payload["tables"]["items"][0]["unidad_medida"], self.unidad.id)

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
