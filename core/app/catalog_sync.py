import json

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.management.color import no_style
from django.db import IntegrityError, connection, transaction
from django.http import JsonResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ParseError, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Cliente,
    Dimension,
    Item,
    Maquinaria,
    Proveedor,
    UbicacionCliente,
    UnidadMedida,
)
from .permissions import CatalogoPermission


TABLE_CONFIGS = (
    {
        "key": "maquinarias",
        "label": "Maquinaria",
        "model": Maquinaria,
        "fields": [
            "id",
            "codigo_maquina",
            "nombre",
            "descripcion",
            "observacion",
            "gasto",
        ],
    },
    {
        "key": "clientes",
        "label": "Cliente",
        "model": Cliente,
        "fields": ["id", "nombre", "ruc"],
    },
    {
        "key": "dimensiones",
        "label": "Dimension",
        "model": Dimension,
        "fields": ["id", "codigo", "nombre", "descripcion", "activo"],
    },
    {
        "key": "proveedores",
        "label": "Proveedor",
        "model": Proveedor,
        "fields": ["id", "nombre", "ruc", "direccion"],
    },
    {
        "key": "ubicaciones_cliente",
        "label": "Ubicacion Cliente",
        "model": UbicacionCliente,
        "fields": ["id", "cliente", "nombre", "direccion"],
        "foreign_keys": {
            "cliente": Cliente,
        },
    },
    {
        "key": "unidades_medida",
        "label": "UnidadMedida",
        "model": UnidadMedida,
        "fields": ["id", "nombre", "simbolo", "dimension", "es_base", "activo"],
        "foreign_keys": {
            "dimension": Dimension,
        },
    },
    {
        "key": "items",
        "label": "Item",
        "model": Item,
        "fields": [
            "id",
            "codigo",
            "nombre",
            "tipo_insumo",
            "dimension",
            "unidad_medida",
            "favorito",
            "volvo",
            "ultimo_correlativo",
        ],
        "foreign_keys": {
            "dimension": Dimension,
            "unidad_medida": UnidadMedida,
        },
    },
)

class CatalogoSyncView(APIView):
    permission_classes = [CatalogoPermission]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request):
        generated_at = timezone.localtime()
        tables = {}
        record_counts = {}

        for config in TABLE_CONFIGS:
            records = list(
                config["model"].objects.order_by("id").values(*config["fields"])
            )
            tables[config["key"]] = records
            record_counts[config["key"]] = len(records)

        payload = {
            "meta": {
                "format": "fredal.catalog-sync",
                "version": 1,
                "generated_at": generated_at.isoformat(),
                "table_order": [config["key"] for config in TABLE_CONFIGS],
                "record_counts": record_counts,
            },
            "tables": tables,
        }

        response = JsonResponse(
            payload,
            json_dumps_params={
                "ensure_ascii": False,
                "indent": 2,
            },
        )
        response["Content-Disposition"] = (
            f'attachment; filename="catalogos-sync-{generated_at.strftime("%Y%m%d-%H%M%S")}.json"'
        )
        return response

    def post(self, request):
        payload = self._parse_payload(request)
        tables_payload = self._extract_tables(payload)
        summary = self._import_tables(tables_payload)

        return Response(
            {
                "message": "Importacion completada correctamente.",
                "summary": summary,
            },
            status=status.HTTP_200_OK,
        )

    def _parse_payload(self, request):
        uploaded_file = request.FILES.get("file") or request.FILES.get("archivo")
        if uploaded_file:
            try:
                raw_payload = uploaded_file.read().decode("utf-8-sig")
            except UnicodeDecodeError as exc:
                raise ParseError("El archivo debe estar codificado en UTF-8.") from exc

            try:
                return json.loads(raw_payload)
            except json.JSONDecodeError as exc:
                raise ParseError("El archivo seleccionado no contiene un JSON valido.") from exc

        payload = request.data
        if hasattr(payload, "dict"):
            payload = payload.dict()

        if isinstance(payload, dict) and "payload" in payload:
            raw_payload = payload["payload"]
            if isinstance(raw_payload, str):
                try:
                    return json.loads(raw_payload)
                except json.JSONDecodeError as exc:
                    raise ParseError("El campo payload no contiene un JSON valido.") from exc

        if isinstance(payload, str):
            try:
                return json.loads(payload)
            except json.JSONDecodeError as exc:
                raise ParseError("El cuerpo de la solicitud no contiene un JSON valido.") from exc

        if not isinstance(payload, dict):
            raise ParseError("No se encontro informacion valida para importar.")

        return payload

    def _extract_tables(self, payload):
        if not isinstance(payload, dict):
            raise ValidationError(
                {"detail": "El contenido importado debe ser un objeto JSON."}
            )

        tables_payload = payload.get("tables", payload)
        if not isinstance(tables_payload, dict):
            raise ValidationError(
                {"detail": "La propiedad 'tables' debe ser un objeto JSON."}
            )

        selected_tables = {
            config["key"]: tables_payload.get(config["key"], [])
            for config in TABLE_CONFIGS
            if config["key"] in tables_payload
        }

        if not selected_tables:
            raise ValidationError(
                {
                    "detail": (
                        "No se encontraron tablas compatibles en el archivo. "
                        "Usa el formato exportado por esta vista."
                    )
                }
            )

        return selected_tables

    def _import_tables(self, tables_payload):
        summary = {
            "processed": 0,
            "created": 0,
            "updated": 0,
            "unchanged": 0,
            "tables": [],
        }
        models_to_reset = []

        with transaction.atomic():
            for config in TABLE_CONFIGS:
                rows = tables_payload.get(config["key"], [])
                if rows is None:
                    rows = []

                if not isinstance(rows, list):
                    raise ValidationError(
                        {
                            "detail": (
                                f"La tabla {config['label']} debe ser una lista de registros."
                            ),
                            "table": config["key"],
                            "label": config["label"],
                        }
                    )

                table_summary = {
                    "key": config["key"],
                    "label": config["label"],
                    "processed": 0,
                    "created": 0,
                    "updated": 0,
                    "unchanged": 0,
                }
                seen_ids = set()

                for row_index, row in enumerate(rows, start=1):
                    cleaned = self._clean_row(config, row, row_index, seen_ids)
                    record_id = cleaned["id"]
                    instance = config["model"].objects.filter(pk=record_id).first()

                    if instance is None:
                        instance = config["model"](id=record_id)
                        self._apply_changes(config, instance, cleaned)
                        self._save_instance(
                            config,
                            instance,
                            row_index=row_index,
                            record_id=record_id,
                            force_insert=True,
                        )
                        models_to_reset.append(config["model"])
                        table_summary["created"] += 1
                    else:
                        changed = self._apply_changes(config, instance, cleaned)
                        if changed:
                            self._save_instance(
                                config,
                                instance,
                                row_index=row_index,
                                record_id=record_id,
                            )
                            table_summary["updated"] += 1
                        else:
                            table_summary["unchanged"] += 1

                    table_summary["processed"] += 1

                summary["processed"] += table_summary["processed"]
                summary["created"] += table_summary["created"]
                summary["updated"] += table_summary["updated"]
                summary["unchanged"] += table_summary["unchanged"]
                summary["tables"].append(table_summary)

            if models_to_reset:
                self._reset_sequences(models_to_reset)

        return summary

    def _clean_row(self, config, row, row_index, seen_ids):
        if not isinstance(row, dict):
            raise ValidationError(
                {
                    "detail": "Cada registro importado debe ser un objeto JSON.",
                    "table": config["key"],
                    "label": config["label"],
                    "row": row_index,
                }
            )

        raw_id = row.get("id")
        if raw_id in (None, ""):
            raise ValidationError(
                {
                    "detail": "Cada registro debe incluir una clave primaria en el campo 'id'.",
                    "table": config["key"],
                    "label": config["label"],
                    "row": row_index,
                }
            )

        record_id = self._clean_field_value(
            config,
            field_name="id",
            raw_value=raw_id,
            row_index=row_index,
            record_id=raw_id,
        )

        if record_id in seen_ids:
            raise ValidationError(
                {
                    "detail": (
                        f"El id {record_id} esta duplicado dentro de la tabla importada."
                    ),
                    "table": config["key"],
                    "label": config["label"],
                    "row": row_index,
                    "id": record_id,
                }
            )
        seen_ids.add(record_id)

        cleaned = {"id": record_id}
        for field_name in config["fields"]:
            if field_name == "id" or field_name not in row:
                continue

            if field_name in config.get("foreign_keys", {}):
                cleaned[field_name] = self._resolve_related_instance(
                    config=config,
                    field_name=field_name,
                    raw_value=row[field_name],
                    row_index=row_index,
                    record_id=record_id,
                )
                continue

            cleaned[field_name] = self._clean_field_value(
                config=config,
                field_name=field_name,
                raw_value=row[field_name],
                row_index=row_index,
                record_id=record_id,
            )

        return cleaned

    def _clean_field_value(self, config, field_name, raw_value, row_index, record_id):
        model_field = config["model"]._meta.get_field(field_name)
        try:
            return model_field.clean(raw_value, None)
        except DjangoValidationError as exc:
            raise ValidationError(
                {
                    "detail": "Uno de los campos del registro importado no es valido.",
                    "table": config["key"],
                    "label": config["label"],
                    "row": row_index,
                    "id": record_id,
                    "field": field_name,
                    "errors": exc.messages,
                }
            ) from exc

    def _resolve_related_instance(
        self,
        config,
        field_name,
        raw_value,
        row_index,
        record_id,
    ):
        if raw_value in (None, ""):
            return None

        related_model = config["foreign_keys"][field_name]
        related_field = related_model._meta.pk

        try:
            related_id = related_field.clean(raw_value, None)
        except DjangoValidationError as exc:
            raise ValidationError(
                {
                    "detail": "La clave foranea enviada no es valida.",
                    "table": config["key"],
                    "label": config["label"],
                    "row": row_index,
                    "id": record_id,
                    "field": field_name,
                    "errors": exc.messages,
                }
            ) from exc

        related_instance = related_model.objects.filter(pk=related_id).first()
        if related_instance is None:
            raise ValidationError(
                {
                    "detail": (
                        f"No existe el registro relacionado {related_model.__name__} "
                        f"con id {related_id}."
                    ),
                    "table": config["key"],
                    "label": config["label"],
                    "row": row_index,
                    "id": record_id,
                    "field": field_name,
                }
            )

        return related_instance

    def _apply_changes(self, config, instance, cleaned):
        changed = instance.pk is None

        for field_name, value in cleaned.items():
            if field_name == "id":
                continue

            current_value = getattr(instance, field_name)
            if field_name in config.get("foreign_keys", {}):
                current_value = current_value.pk if current_value else None
                incoming_value = value.pk if value else None
            else:
                incoming_value = value

            if current_value != incoming_value:
                changed = True

            setattr(instance, field_name, value)

        return changed

    def _save_instance(
        self,
        config,
        instance,
        row_index,
        record_id,
        force_insert=False,
    ):
        try:
            instance.full_clean()
            instance.save(force_insert=force_insert)
        except DjangoValidationError as exc:
            raise ValidationError(
                {
                    "detail": "No se pudo validar el registro importado.",
                    "table": config["key"],
                    "label": config["label"],
                    "row": row_index,
                    "id": record_id,
                    "errors": getattr(exc, "message_dict", exc.messages),
                }
            ) from exc
        except IntegrityError as exc:
            raise ValidationError(
                {
                    "detail": "No se pudo guardar el registro importado.",
                    "table": config["key"],
                    "label": config["label"],
                    "row": row_index,
                    "id": record_id,
                    "errors": [str(exc)],
                }
            ) from exc

    def _reset_sequences(self, models_to_reset):
        unique_models = []
        seen = set()

        for model in models_to_reset:
            if model in seen:
                continue
            seen.add(model)
            unique_models.append(model)

        sql_statements = connection.ops.sequence_reset_sql(no_style(), unique_models)
        if not sql_statements:
            return

        with connection.cursor() as cursor:
            for sql in sql_statements:
                cursor.execute(sql)
