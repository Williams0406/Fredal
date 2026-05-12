import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { almacenAPI, itemAPI, maquinariaAPI, trabajadorAPI } from '../../lib/api';
import { colors, radius, shadows } from '../../lib/theme';
import AppSelect from '../ui/AppSelect';
import AppSheet from '../ui/AppSheet';

const LOCATION_TYPE_OPTIONS = [
  { value: 'almacen', label: 'Almacen' },
  { value: 'trabajador', label: 'Trabajador' },
  { value: 'maquinaria', label: 'Maquinaria' },
];

const VIEW_TO_LOCATION_TYPE = {
  almacen: 'ALMACEN',
  tecnicos: 'TRABAJADOR',
  maquinaria: 'MAQUINARIA',
};

const UNIT_STATUS_LABELS = {
  NUEVO: 'Nuevo',
  USADO: 'Usado',
  REPARADO: 'Reparado',
  INOPERATIVO: 'Inoperativo',
};

const formatQuantity = (value, digits = 2) => {
  const numberValue = Number(value ?? 0);
  if (!Number.isFinite(numberValue)) return '0';
  return numberValue.toLocaleString('es-PE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
};

const formatDate = (value) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleDateString('es-PE');
};

const normalizeLocationType = (tipo) => {
  if (tipo === 'ALMACEN') return 'almacen';
  if (tipo === 'TRABAJADOR') return 'trabajador';
  if (tipo === 'MAQUINARIA') return 'maquinaria';
  return '';
};

const belongsToView = (tipo, viewKey) => VIEW_TO_LOCATION_TYPE[viewKey] === tipo;

const getRowLocationLabel = (row) => {
  if (!row) return 'Sin ubicacion';

  if (row.tipo === 'MAQUINARIA' || row.tipo_ubicacion === 'MAQUINARIA') {
    const maquinaria = row.maquinaria;
    if (maquinaria) {
      return `${maquinaria.codigo_maquina || maquinaria.codigo || 'MQ'} · ${maquinaria.nombre}`;
    }
  }

  if (row.tipo === 'TRABAJADOR' || row.tipo_ubicacion === 'TRABAJADOR') {
    const trabajador = row.trabajador;
    if (trabajador) {
      return `${trabajador.nombres || ''} ${trabajador.apellidos || ''}`.trim();
    }
  }

  if (row.tipo === 'ALMACEN' || row.tipo_ubicacion === 'ALMACEN') {
    if (row.almacen?.nombre) {
      return row.almacen.nombre;
    }
  }

  return row.nombre || row.ubicacion || 'Sin ubicacion';
};

const getRowLocationId = (row) =>
  row?.almacen_id || row?.trabajador_id || row?.maquinaria_id || null;

const getDestinationOptions = (type, almacenes, trabajadores, maquinarias) => {
  if (type === 'almacen') {
    return almacenes.map((almacen) => ({
      value: almacen.id,
      label: almacen.nombre,
    }));
  }

  if (type === 'trabajador') {
    return trabajadores.map((trabajador) => ({
      value: trabajador.id,
      label: `${trabajador.codigo || 'TR'} · ${trabajador.nombres} ${trabajador.apellidos}`.trim(),
    }));
  }

  if (type === 'maquinaria') {
    return maquinarias.map((maquinaria) => ({
      value: maquinaria.id,
      label: `${maquinaria.codigo_maquina || 'MQ'} · ${maquinaria.nombre}`,
    }));
  }

  return [];
};

export default function ItemLocationSheet({ visible, item, viewKey = 'almacen', onClose }) {
  const queryClient = useQueryClient();
  const [itemDetail, setItemDetail] = useState(null);
  const [consumibleRows, setConsumibleRows] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [maquinarias, setMaquinarias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingKey, setEditingKey] = useState('');
  const [editor, setEditor] = useState({
    mode: '',
    rowId: null,
    estado: '',
    tipoUbicacion: '',
    ubicacionId: null,
  });

  const loadData = async () => {
    if (!item?.id) return;

    setLoading(true);
    setError('');

    try {
      const requests = [
        itemAPI.retrieve(item.id),
        almacenAPI.list(),
        trabajadorAPI.list(),
        maquinariaAPI.list(),
      ];

      if (item.tipo_insumo === 'CONSUMIBLE') {
        requests.push(itemAPI.ubicacionesConsumible(item.id));
      }

      const [
        itemRes,
        almacenesRes,
        trabajadoresRes,
        maquinariasRes,
        consumiblesRes,
      ] = await Promise.all(requests);

      setItemDetail(itemRes.data);
      setAlmacenes(almacenesRes.data || []);
      setTrabajadores(trabajadoresRes.data || []);
      setMaquinarias(maquinariasRes.data || []);
      setConsumibleRows(consumiblesRes?.data || []);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          'No se pudo cargar el detalle del item para mover ubicaciones.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible || !item?.id) return;

    setEditingKey('');
    setEditor({
      mode: '',
      rowId: null,
      estado: '',
      tipoUbicacion: '',
      ubicacionId: null,
    });
    loadData();
  }, [visible, item?.id]);

  const repuestoRows = useMemo(() => {
    const rows = Array.isArray(itemDetail?.unidades) ? itemDetail.unidades : [];
    return rows.filter(
      (unidad) =>
        unidad?.ubicacion_actual &&
        belongsToView(unidad.ubicacion_actual.tipo, viewKey)
    );
  }, [itemDetail, viewKey]);

  const consumibleRowsInView = useMemo(
    () =>
      consumibleRows.filter((row) =>
        belongsToView(row.tipo_ubicacion, viewKey)
      ),
    [consumibleRows, viewKey]
  );

  const destinationOptions = useMemo(
    () =>
      getDestinationOptions(
        editor.tipoUbicacion,
        almacenes,
        trabajadores,
        maquinarias
      ),
    [editor.tipoUbicacion, almacenes, trabajadores, maquinarias]
  );

  const startEditUnit = (unidad) => {
    const ubicacionActual = unidad?.ubicacion_actual || {};
    setEditingKey(`unidad-${unidad.id}`);
    setEditor({
      mode: 'unidad',
      rowId: unidad.id,
      estado: unidad.estado,
      tipoUbicacion: normalizeLocationType(ubicacionActual.tipo),
      ubicacionId: getRowLocationId(ubicacionActual),
    });
    setError('');
  };

  const startEditConsumible = (row) => {
    setEditingKey(`consumible-${row.id}`);
    setEditor({
      mode: 'consumible',
      rowId: row.id,
      estado: '',
      tipoUbicacion: normalizeLocationType(row.tipo_ubicacion),
      ubicacionId: getRowLocationId(row),
    });
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingKey('');
    setEditor({
      mode: '',
      rowId: null,
      estado: '',
      tipoUbicacion: '',
      ubicacionId: null,
    });
    setError('');
  };

  const handleSave = async () => {
    if (!editor.tipoUbicacion || !editor.ubicacionId) {
      setError('Selecciona un destino para continuar.');
      return;
    }

    let currentType = '';
    let currentLocationId = null;

    if (editor.mode === 'unidad') {
      const currentRow = repuestoRows.find((row) => row.id === editor.rowId);
      currentType = normalizeLocationType(currentRow?.ubicacion_actual?.tipo);
      currentLocationId = getRowLocationId(currentRow?.ubicacion_actual);
    } else {
      const currentRow = consumibleRowsInView.find((row) => row.id === editor.rowId);
      currentType = normalizeLocationType(currentRow?.tipo_ubicacion);
      currentLocationId = getRowLocationId(currentRow);
    }

    if (
      currentType === editor.tipoUbicacion &&
      Number(currentLocationId) === Number(editor.ubicacionId)
    ) {
      setError('Selecciona una ubicacion diferente para registrar el movimiento.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      if (editor.mode === 'unidad') {
        await itemAPI.cambiarEstadoUnidad(item.id, {
          unidad_id: editor.rowId,
          nuevo_estado: editor.estado,
          almacen_id:
            editor.tipoUbicacion === 'almacen' ? Number(editor.ubicacionId) : null,
          trabajador_id:
            editor.tipoUbicacion === 'trabajador' ? Number(editor.ubicacionId) : null,
          maquinaria_id:
            editor.tipoUbicacion === 'maquinaria' ? Number(editor.ubicacionId) : null,
        });
      } else {
        await itemAPI.cambiarUbicacionConsumible(item.id, {
          historial_id: editor.rowId,
          almacen_id:
            editor.tipoUbicacion === 'almacen' ? Number(editor.ubicacionId) : null,
          trabajador_id:
            editor.tipoUbicacion === 'trabajador' ? Number(editor.ubicacionId) : null,
          maquinaria_id:
            editor.tipoUbicacion === 'maquinaria' ? Number(editor.ubicacionId) : null,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['almacen-mobile-items'] });
      await loadData();
      handleCancelEdit();
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          'No se pudo guardar el cambio de ubicacion.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <AppSheet
      visible={visible}
      onClose={onClose}
      icon={item?.tipo_insumo === 'CONSUMIBLE' ? 'flask-outline' : 'cube-outline'}
      title='Mover ubicacion'
      subtitle={item ? `${item.codigo} · ${item.nombre}` : 'Detalle del item'}
    >
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size='large' color={colors.navy} />
          <Text style={styles.loadingText}>Cargando ubicaciones activas...</Text>
        </View>
      ) : (
        <>
          <View style={styles.infoBanner}>
            <Ionicons name='swap-horizontal-outline' size={18} color={colors.navy} />
            <Text style={styles.infoBannerText}>
              Se muestran solo las ubicaciones activas de la vista actual para que el registro desde almacen sea rapido.
            </Text>
          </View>

          {error ? (
            <View style={styles.errorCard}>
              <Ionicons name='alert-circle-outline' size={18} color={colors.red} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {item?.tipo_insumo === 'CONSUMIBLE' ? (
            consumibleRowsInView.length ? (
              consumibleRowsInView.map((row) => {
                const isEditing = editingKey === `consumible-${row.id}`;

                return (
                  <View key={row.id} style={styles.rowCard}>
                    <View style={styles.rowHeader}>
                      <View style={[styles.rowIconWrap, styles.consumibleIconWrap]}>
                        <Ionicons name='flask-outline' size={18} color={colors.green} />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>
                          {formatQuantity(row.cantidad_ubicacion)}{' '}
                          {itemDetail?.unidad_medida?.simbolo ||
                            itemDetail?.unidad_medida_detalle?.simbolo ||
                            ''}
                        </Text>
                        <Text style={styles.rowMeta}>
                          Ubicacion actual: {getRowLocationLabel(row)}
                        </Text>
                        <Text style={styles.rowSubmeta}>
                          Desde {formatDate(row.fecha_inicio)}
                        </Text>
                      </View>

                      <Pressable
                        style={styles.inlineButton}
                        onPress={() => startEditConsumible(row)}
                      >
                        <Ionicons name='swap-horizontal-outline' size={16} color={colors.navy} />
                        <Text style={styles.inlineButtonText}>Mover</Text>
                      </Pressable>
                    </View>

                    {isEditing ? (
                      <View style={styles.editorCard}>
                        <AppSelect
                          label='Tipo de destino'
                          value={editor.tipoUbicacion}
                          options={LOCATION_TYPE_OPTIONS}
                          onChange={(value) =>
                            setEditor((current) => ({
                              ...current,
                              tipoUbicacion: value,
                              ubicacionId: null,
                            }))
                          }
                        />
                        <AppSelect
                          label='Destino'
                          value={editor.ubicacionId}
                          options={destinationOptions}
                          onChange={(value) =>
                            setEditor((current) => ({ ...current, ubicacionId: value }))
                          }
                          placeholder='Selecciona un destino'
                        />

                        <View style={styles.editorActions}>
                          <Pressable style={styles.cancelButton} onPress={handleCancelEdit}>
                            <Text style={styles.cancelButtonText}>Cancelar</Text>
                          </Pressable>
                          <Pressable
                            style={[styles.saveButton, saving ? styles.buttonDisabled : null]}
                            onPress={handleSave}
                            disabled={saving}
                          >
                            {saving ? (
                              <ActivityIndicator size='small' color={colors.white} />
                            ) : (
                              <Ionicons name='save-outline' size={16} color={colors.white} />
                            )}
                            <Text style={styles.saveButtonText}>Guardar</Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })
            ) : (
              <EmptyState message='No hay consumibles activos en esta vista.' />
            )
          ) : repuestoRows.length ? (
            repuestoRows.map((unidad) => {
              const isEditing = editingKey === `unidad-${unidad.id}`;

              return (
                <View key={unidad.id} style={styles.rowCard}>
                  <View style={styles.rowHeader}>
                    <View style={styles.rowIconWrap}>
                      <MaterialCommunityIcons name='cog-outline' size={19} color={colors.navy} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>
                        {unidad.serie ? `S/N ${unidad.serie}` : `Unidad ${unidad.id}`}
                      </Text>
                      <Text style={styles.rowMeta}>
                        Estado: {UNIT_STATUS_LABELS[unidad.estado] || unidad.estado}
                      </Text>
                      <Text style={styles.rowSubmeta}>
                        Ubicacion actual: {getRowLocationLabel(unidad.ubicacion_actual)}
                      </Text>
                    </View>

                    <Pressable
                      style={styles.inlineButton}
                      onPress={() => startEditUnit(unidad)}
                    >
                      <Ionicons name='swap-horizontal-outline' size={16} color={colors.navy} />
                      <Text style={styles.inlineButtonText}>Mover</Text>
                    </Pressable>
                  </View>

                  {isEditing ? (
                    <View style={styles.editorCard}>
                      <AppSelect
                        label='Tipo de destino'
                        value={editor.tipoUbicacion}
                        options={LOCATION_TYPE_OPTIONS}
                        onChange={(value) =>
                          setEditor((current) => ({
                            ...current,
                            tipoUbicacion: value,
                            ubicacionId: null,
                          }))
                        }
                      />
                      <AppSelect
                        label='Destino'
                        value={editor.ubicacionId}
                        options={destinationOptions}
                        onChange={(value) =>
                          setEditor((current) => ({ ...current, ubicacionId: value }))
                        }
                        placeholder='Selecciona un destino'
                      />

                      <View style={styles.editorActions}>
                        <Pressable style={styles.cancelButton} onPress={handleCancelEdit}>
                          <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.saveButton, saving ? styles.buttonDisabled : null]}
                          onPress={handleSave}
                          disabled={saving}
                        >
                          {saving ? (
                            <ActivityIndicator size='small' color={colors.white} />
                          ) : (
                            <Ionicons name='save-outline' size={16} color={colors.white} />
                          )}
                          <Text style={styles.saveButtonText}>Guardar</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })
          ) : (
            <EmptyState message='No hay repuestos activos en esta vista.' />
          )}
        </>
      )}
    </AppSheet>
  );
}

function EmptyState({ message }) {
  return (
    <View style={styles.emptyCard}>
      <Ionicons name='archive-outline' size={26} color={colors.textSoft} />
      <Text style={styles.emptyTitle}>Sin movimientos activos</Text>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    paddingVertical: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.navySoft,
    padding: 14,
    marginBottom: 16,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: colors.navy,
    fontWeight: '600',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.md,
    backgroundColor: colors.redSoft,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: colors.red,
    fontWeight: '700',
  },
  rowCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    marginBottom: 12,
    ...shadows.card,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  rowIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navySoft,
  },
  consumibleIconWrap: {
    backgroundColor: colors.greenSoft,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  rowMeta: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  rowSubmeta: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSoft,
  },
  inlineButton: {
    minHeight: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#CFE0FF',
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  inlineButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.navy,
  },
  editorCard: {
    marginTop: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 14,
  },
  editorActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  saveButton: {
    flex: 1.25,
    minHeight: 46,
    borderRadius: radius.md,
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.white,
  },
  buttonDisabled: {
    opacity: 0.72,
  },
  emptyCard: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 28,
    ...shadows.card,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
