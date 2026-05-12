import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { itemAPI, ordenCompraAPI, proveedorAPI } from '../../lib/api';
import { colors, radius, shadows } from '../../lib/theme';
import AppSheet from '../ui/AppSheet';
import AppSelect from '../ui/AppSelect';
import AppTextArea from '../ui/AppTextArea';

const createRowKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const buildEmptyRow = () => ({
  key: createRowKey(),
  item: null,
  cantidad: '1',
  proveedor: null,
});

const parseOptions = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  return [];
};

const normalizeCantidad = (value) =>
  value.replace(',', '.').replace(/[^0-9.]/g, '').replace(/^(\d*\.?\d*).*$/, '$1');

export default function OrdenCompraSheet({ visible, onClose, onCreated }) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState([buildEmptyRow()]);
  const [observaciones, setObservaciones] = useState('');
  const [error, setError] = useState('');

  const itemsQuery = useQuery({
    queryKey: ['orden-compra-mobile-form-items'],
    queryFn: async () => {
      const { data } = await itemAPI.list();
      return parseOptions(data).filter((item) => item?.activo !== false);
    },
    enabled: visible,
    staleTime: 5 * 60 * 1000,
  });

  const proveedoresQuery = useQuery({
    queryKey: ['orden-compra-mobile-form-proveedores'],
    queryFn: async () => {
      const { data } = await proveedorAPI.list();
      return parseOptions(data);
    },
    enabled: visible,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!visible) {
      setRows([buildEmptyRow()]);
      setObservaciones('');
      setError('');
    }
  }, [visible]);

  const createOrdenCompra = useMutation({
    mutationFn: (payload) => ordenCompraAPI.create(payload),
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-compra-mobile'] });
      onCreated?.(data);
    },
    onError: (err) => {
      setError(err?.response?.data?.detail || 'No se pudo emitir la orden de compra.');
    },
  });

  const itemOptions = useMemo(
    () =>
      (itemsQuery.data || []).map((item) => ({
        value: item.id,
        label: `${item.codigo || 'ITEM'} - ${item.nombre || 'Sin nombre'}`,
      })),
    [itemsQuery.data]
  );

  const proveedorOptions = useMemo(() => {
    const base = [{ value: null, label: 'Sin proveedor definido' }];
    const proveedores = (proveedoresQuery.data || []).map((proveedor) => ({
      value: proveedor.id,
      label: proveedor.nombre || `Proveedor ${proveedor.id}`,
    }));
    return [...base, ...proveedores];
  }, [proveedoresQuery.data]);

  const isCatalogLoading = itemsQuery.isLoading || proveedoresQuery.isLoading;

  const updateRow = (rowKey, field, value) => {
    setRows((prev) =>
      prev.map((row) => (row.key === rowKey ? { ...row, [field]: value } : row))
    );
  };

  const addRow = () => setRows((prev) => [...prev, buildEmptyRow()]);

  const removeRow = (rowKey) => {
    setRows((prev) =>
      prev.length === 1 ? prev : prev.filter((row) => row.key !== rowKey)
    );
  };

  const handleClose = () => {
    if (createOrdenCompra.isPending) return;
    onClose?.();
  };

  const handleSubmit = () => {
    setError('');

    const items = rows
      .map((row) => ({
        item: Number(row.item),
        cantidad: Number(row.cantidad),
        proveedor: row.proveedor ? Number(row.proveedor) : null,
      }))
      .filter((row) => row.item && row.cantidad > 0);

    if (!items.length) {
      setError('Debes agregar al menos un item valido.');
      return;
    }

    createOrdenCompra.mutate({
      observaciones: observaciones.trim(),
      items,
    });
  };

  const footer = (
    <View style={styles.footerRow}>
      <Pressable
        style={[styles.footerButton, styles.footerButtonSecondary]}
        onPress={handleClose}
        disabled={createOrdenCompra.isPending}
      >
        <Text style={styles.footerButtonSecondaryText}>Cancelar</Text>
      </Pressable>

      <Pressable
        style={[
          styles.footerButton,
          styles.footerButtonPrimary,
          createOrdenCompra.isPending ? styles.buttonDisabled : null,
        ]}
        onPress={handleSubmit}
        disabled={createOrdenCompra.isPending}
      >
        {createOrdenCompra.isPending ? (
          <ActivityIndicator size='small' color={colors.white} />
        ) : (
          <Ionicons name='send-outline' size={16} color={colors.white} />
        )}
        <Text style={styles.footerButtonPrimaryText}>Emitir orden</Text>
      </Pressable>
    </View>
  );

  return (
    <AppSheet
      visible={visible}
      onClose={handleClose}
      title='Nueva orden de compra'
      subtitle='Almacen puede emitir la solicitud y seguir su estado desde el movil.'
      icon='cart-outline'
      footer={footer}
    >
      {error ? (
        <View style={styles.errorCard}>
          <Ionicons name='alert-circle-outline' size={18} color={colors.red} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <AppTextArea
        label='Observaciones'
        value={observaciones}
        onChange={setObservaciones}
        placeholder='Notas para el area de compras'
        rows={3}
      />

      {isCatalogLoading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size='small' color={colors.navy} />
          <Text style={styles.loadingText}>Cargando items y proveedores...</Text>
        </View>
      ) : null}

      {!isCatalogLoading && !itemOptions.length ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No hay items disponibles</Text>
          <Text style={styles.emptyText}>
            Cuando existan items activos podras agregarlos a la orden de compra.
          </Text>
        </View>
      ) : null}

      {!isCatalogLoading
        ? rows.map((row, index) => {
            const selectedItem = (itemsQuery.data || []).find((item) => item.id === row.item);

            return (
              <View key={row.key} style={styles.rowCard}>
                <View style={styles.rowHeader}>
                  <Text style={styles.rowTitle}>Item #{index + 1}</Text>
                  <Pressable
                    style={styles.removeButton}
                    onPress={() => removeRow(row.key)}
                    disabled={rows.length === 1}
                  >
                    <Ionicons
                      name='trash-outline'
                      size={16}
                      color={rows.length === 1 ? colors.textSoft : colors.red}
                    />
                    <Text
                      style={[
                        styles.removeButtonText,
                        rows.length === 1 ? styles.removeButtonTextDisabled : null,
                      ]}
                    >
                      Quitar
                    </Text>
                  </Pressable>
                </View>

                <AppSelect
                  label='Item'
                  value={row.item}
                  options={itemOptions}
                  onChange={(value) => updateRow(row.key, 'item', value)}
                  placeholder='Selecciona un item'
                />

                <View style={styles.fieldBlock}>
                  <Text style={styles.fieldLabel}>Cantidad</Text>
                  <TextInput
                    value={row.cantidad}
                    onChangeText={(value) => updateRow(row.key, 'cantidad', normalizeCantidad(value))}
                    placeholder='0.00'
                    placeholderTextColor={colors.textSoft}
                    keyboardType='decimal-pad'
                    style={styles.input}
                  />
                </View>

                <AppSelect
                  label='Proveedor'
                  value={row.proveedor}
                  options={proveedorOptions}
                  onChange={(value) => updateRow(row.key, 'proveedor', value)}
                  placeholder='Selecciona un proveedor'
                />

                {selectedItem ? (
                  <View style={styles.summaryCard}>
                    <View style={styles.summaryCell}>
                      <Text style={styles.summaryLabel}>Codigo</Text>
                      <Text style={styles.summaryValue}>{selectedItem.codigo || '-'}</Text>
                    </View>
                    <View style={styles.summaryCell}>
                      <Text style={styles.summaryLabel}>Nombre</Text>
                      <Text style={styles.summaryValue}>{selectedItem.nombre || '-'}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })
        : null}

      <Pressable
        style={[
          styles.addButton,
          isCatalogLoading || !itemOptions.length ? styles.buttonDisabled : null,
        ]}
        onPress={addRow}
        disabled={isCatalogLoading || !itemOptions.length}
      >
        <Ionicons name='add-circle-outline' size={18} color={colors.navy} />
        <Text style={styles.addButtonText}>Agregar item</Text>
      </Pressable>
    </AppSheet>
  );
}

const styles = StyleSheet.create({
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#F0C3BB',
    backgroundColor: colors.redSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: colors.red,
    fontWeight: '700',
  },
  loadingCard: {
    minHeight: 62,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  emptyCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 18,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
  rowCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    marginBottom: 14,
    ...shadows.card,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.red,
  },
  removeButtonTextDisabled: {
    color: colors.textSoft,
  },
  fieldBlock: {
    marginBottom: 16,
  },
  fieldLabel: {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.text,
    ...shadows.soft,
  },
  summaryCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 14,
    gap: 12,
  },
  summaryCell: {
    gap: 4,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: colors.textSoft,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  addButton: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#BED2FF',
    borderStyle: 'dashed',
    backgroundColor: colors.navySoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  footerButton: {
    minHeight: 50,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  footerButtonSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  footerButtonSecondaryText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textMuted,
  },
  footerButtonPrimary: {
    flex: 1.3,
    backgroundColor: colors.navy,
  },
  footerButtonPrimaryText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
