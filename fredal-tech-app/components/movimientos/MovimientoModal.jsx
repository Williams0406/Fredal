import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  itemAPI,
  movimientoConsumibleAPI,
  movimientoRepuestoAPI,
  trabajoAPI,
  trabajadorAPI,
} from '../../lib/api';
import AppSheet from '../ui/AppSheet';
import { colors, radius } from '../../lib/theme';

const TYPE_OPTIONS = [
  {
    value: 'REPUESTO',
    label: 'Repuesto',
    icon: 'cog-outline',
    description: 'Selecciona una unidad física con serie o identificador.',
  },
  {
    value: 'CONSUMIBLE',
    label: 'Consumible',
    icon: 'flask-outline',
    description: 'Registra cantidad utilizada desde el stock disponible.',
  },
];

export default function MovimientoModal({ actividad, trabajoId, onClose }) {
  const qc = useQueryClient();

  const [tipo, setTipo] = useState('REPUESTO');
  const [items, setItems] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [stockConsumible, setStockConsumible] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    item: '',
    item_unidad: '',
    cantidad: '1',
    tecnico: '',
  });

  const esActPlanificada = Boolean(actividad?.es_planificada);
  const selectedItem = items.find((item) => String(item.id) === String(form.item));

  useEffect(() => {
    setLoading(true);
    Promise.all([
      itemAPI.list({ actividad: actividad?.id, disponibles: 1 }),
      trabajoAPI.retrieve(trabajoId),
      trabajadorAPI.list(),
    ])
      .then(([itemsRes, trabajoRes, trabRes]) => {
        setItems(itemsRes.data || []);
        const ids = trabajoRes.data?.tecnicos || [];
        setTecnicos((trabRes.data || []).filter((trabajador) => ids.includes(trabajador.id)));
      })
      .catch(() => setError('No se pudieron cargar los materiales disponibles'))
      .finally(() => setLoading(false));
  }, [actividad?.id, trabajoId]);

  useEffect(() => {
    setError('');
    setForm((prev) => ({ ...prev, item_unidad: '', cantidad: '1' }));

    if (!form.item) {
      setUnidades([]);
      setStockConsumible(0);
      return;
    }

    if (tipo === 'REPUESTO') {
      itemAPI
        .unidadesAsignables(form.item, { actividad: actividad.id })
        .then((response) => setUnidades(response.data || []))
        .catch(() => setUnidades([]));
      setStockConsumible(0);
      return;
    }

    itemAPI
      .lotesDisponibles(form.item, { actividad: actividad.id })
      .then((response) => setStockConsumible(Number(response.data?.cantidad_disponible || 0)))
      .catch(() => setStockConsumible(0));
    setUnidades([]);
  }, [actividad?.id, form.item, tipo]);

  const filteredItems = useMemo(
    () => items.filter((item) => item.tipo_insumo === tipo),
    [items, tipo]
  );

  const helperText = esActPlanificada
    ? 'Esta actividad es planificada: el técnico es obligatorio para registrar el movimiento.'
    : 'Puedes registrar el movimiento directamente sobre la actividad ejecutada.';

  const handleSave = async () => {
    setError('');

    if (!form.item) {
      setError('Selecciona un material');
      return;
    }

    if (tipo === 'REPUESTO' && !form.item_unidad) {
      setError('Selecciona una unidad disponible');
      return;
    }

    if (tipo === 'CONSUMIBLE') {
      const cantidad = Number(form.cantidad);
      if (!cantidad || cantidad <= 0) {
        setError('Ingresa una cantidad válida');
        return;
      }
      if (cantidad > stockConsumible) {
        setError('La cantidad excede el stock disponible');
        return;
      }
    }

    if (esActPlanificada && !form.tecnico) {
      setError('Selecciona el técnico responsable');
      return;
    }

    setSaving(true);
    try {
      if (tipo === 'REPUESTO') {
        const payload = {
          actividad: actividad.id,
          item_unidad: Number(form.item_unidad),
        };
        if (form.tecnico) payload.tecnico = Number(form.tecnico);
        await movimientoRepuestoAPI.create(payload);
      } else {
        const payload = {
          actividad: actividad.id,
          item: Number(form.item),
          cantidad: Number(form.cantidad),
        };
        if (form.tecnico) payload.tecnico = Number(form.tecnico);
        await movimientoConsumibleAPI.create(payload);
      }

      qc.invalidateQueries({ queryKey: ['actividades', trabajoId] });
      qc.invalidateQueries({ queryKey: ['trabajo', trabajoId] });
      onClose();
    } catch (err) {
      const data = err?.response?.data;
      const message =
        data?.detail ||
        (typeof data === 'object' ? Object.values(data).flat().join(' ') : '') ||
        'No se pudo guardar el movimiento';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppSheet
      visible
      onClose={onClose}
      icon='cube-outline'
      title='Registrar material'
      subtitle={
        actividad?.tipo_actividad === 'MANTENIMIENTO'
          ? `${actividad.tipo_mantenimiento || 'Mantenimiento'} · ${actividad.subtipo || 'Sin subtipo'}`
          : 'Actividad'
      }
      footer={
        !loading ? (
          <View style={styles.footerRow}>
            <Pressable style={styles.cancelButton} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable style={[styles.submitButton, saving ? styles.submitButtonDisabled : null]} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size='small' color={colors.white} />
              ) : (
                <Ionicons name='add-circle-outline' size={17} color={colors.white} />
              )}
              <Text style={styles.submitText}>
                {saving ? 'Guardando...' : 'Registrar material'}
              </Text>
            </Pressable>
          </View>
        ) : null
      }
    >
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size='large' color={colors.navy} />
          <Text style={styles.loadingText}>Cargando materiales disponibles...</Text>
        </View>
      ) : (
        <>
          <View style={styles.infoBanner}>
            <Ionicons name='information-circle-outline' size={18} color={colors.navy} />
            <Text style={styles.infoBannerText}>{helperText}</Text>
          </View>

          {error ? (
            <View style={styles.errorCard}>
              <Ionicons name='close-circle-outline' size={18} color={colors.red} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.block}>
            <Text style={styles.blockTitle}>Tipo de material</Text>
            <View style={styles.typeStack}>
              {TYPE_OPTIONS.map((option) => {
                const selected = tipo === option.value;
                return (
                  <Pressable
                    key={option.value}
                    style={[styles.typeCard, selected ? styles.typeCardSelected : null]}
                    onPress={() => {
                      setTipo(option.value);
                      setForm((prev) => ({ ...prev, item: '', item_unidad: '', cantidad: '1' }));
                    }}
                  >
                    <View style={[styles.typeIconWrap, selected ? styles.typeIconWrapSelected : null]}>
                      <Ionicons
                        name={option.icon}
                        size={20}
                        color={selected ? colors.white : colors.navy}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.typeTitle, selected ? styles.typeTitleSelected : null]}>
                        {option.label}
                      </Text>
                      <Text style={[styles.typeDescription, selected ? styles.typeDescriptionSelected : null]}>
                        {option.description}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.block}>
            <Text style={styles.blockTitle}>Selecciona el material</Text>
            {filteredItems.length === 0 ? (
              <View style={styles.emptyListCard}>
                <Ionicons name='cube-outline' size={26} color={colors.textSoft} />
                <Text style={styles.emptyListTitle}>No hay materiales disponibles</Text>
                <Text style={styles.emptyListText}>
                  No encontramos {tipo === 'REPUESTO' ? 'repuestos' : 'consumibles'} listos para usar.
                </Text>
              </View>
            ) : (
              filteredItems.map((item) => {
                const selected = String(form.item) === String(item.id);
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.materialCard, selected ? styles.materialCardSelected : null]}
                    onPress={() => setForm((prev) => ({ ...prev, item: String(item.id), item_unidad: '', cantidad: '1' }))}
                  >
                    <View style={[styles.materialIconWrap, selected ? styles.materialIconWrapSelected : null]}>
                      <MaterialCommunityIcons
                        name={tipo === 'REPUESTO' ? 'cog-outline' : 'flask-outline'}
                        size={18}
                        color={selected ? colors.white : colors.navy}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.materialTitle, selected ? styles.materialTitleSelected : null]}>
                        {item.codigo} · {item.nombre}
                      </Text>
                      <Text style={[styles.materialMeta, selected ? styles.materialMetaSelected : null]}>
                        {tipo === 'REPUESTO'
                          ? 'Material serializado listo para asignar'
                          : `Unidad base: ${item.unidad_medida_simbolo || item.unidad_medida_detalle?.nombre || 'configurada'}`}
                      </Text>
                    </View>
                    {selected ? <Ionicons name='checkmark-circle' size={18} color={colors.navy} /> : null}
                  </Pressable>
                );
              })
            )}
          </View>

          {tipo === 'REPUESTO' && form.item ? (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Unidad disponible</Text>
              {unidades.length === 0 ? (
                <View style={styles.errorCard}>
                  <Ionicons name='alert-circle-outline' size={18} color={colors.red} />
                  <Text style={styles.errorText}>No hay unidades disponibles para este repuesto.</Text>
                </View>
              ) : (
                unidades.map((unidad) => {
                  const selected = String(form.item_unidad) === String(unidad.id);
                  return (
                    <Pressable
                      key={unidad.id}
                      style={[styles.unitCard, selected ? styles.unitCardSelected : null]}
                      onPress={() => setForm((prev) => ({ ...prev, item_unidad: String(unidad.id) }))}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.unitTitle, selected ? styles.unitTitleSelected : null]}>
                          {unidad.serie ? `S/N ${unidad.serie}` : `Unidad ${unidad.id}`}
                        </Text>
                        <Text style={[styles.unitMeta, selected ? styles.unitMetaSelected : null]}>
                          Estado: {unidad.estado}
                        </Text>
                      </View>
                      {selected ? <Ionicons name='checkmark-circle' size={18} color={colors.navy} /> : null}
                    </Pressable>
                  );
                })
              )}
            </View>
          ) : null}

          {tipo === 'CONSUMIBLE' && form.item ? (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Cantidad consumida</Text>
              <TextInput
                value={form.cantidad}
                onChangeText={(value) => setForm((prev) => ({ ...prev, cantidad: value }))}
                keyboardType='decimal-pad'
                placeholder='0'
                placeholderTextColor={colors.textSoft}
                style={styles.input}
              />
              <Text style={styles.helperText}>
                Stock disponible: {stockConsumible.toFixed(2)} {selectedItem?.unidad_medida_simbolo || ''}
              </Text>
            </View>
          ) : null}

          {esActPlanificada && tecnicos.length > 0 ? (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Técnico *</Text>
              <View style={styles.typeStack}>
                {tecnicos.map((tecnico) => {
                  const selected = String(form.tecnico) === String(tecnico.id);
                  return (
                    <Pressable
                      key={tecnico.id}
                      style={[styles.techCard, selected ? styles.techCardSelected : null]}
                      onPress={() =>
                        setForm((prev) => ({
                          ...prev,
                          tecnico: selected ? '' : String(tecnico.id),
                        }))
                      }
                    >
                      <View style={styles.techAvatar}>
                        <Ionicons name='person-outline' size={16} color={selected ? colors.white : colors.navy} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.techTitle, selected ? styles.techTitleSelected : null]}>
                          {tecnico.nombres} {tecnico.apellidos}
                        </Text>
                        <Text style={[styles.techMeta, selected ? styles.techMetaSelected : null]}>
                          Técnico asignado a la orden
                        </Text>
                      </View>
                      {selected ? <Ionicons name='checkmark-circle' size={18} color={colors.navy} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </>
      )}
    </AppSheet>
  );
}

const styles = StyleSheet.create({
  footerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
  },
  submitButton: {
    flex: 1.65,
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
  },
  loadingWrap: {
    paddingVertical: 40,
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
  block: {
    marginBottom: 18,
  },
  blockTitle: {
    marginBottom: 10,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  typeStack: {
    gap: 10,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 16,
  },
  typeCardSelected: {
    borderColor: '#BFD2FF',
    backgroundColor: colors.navySoft,
  },
  typeIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  typeIconWrapSelected: {
    backgroundColor: colors.navy,
  },
  typeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  typeTitleSelected: {
    color: colors.navy,
  },
  typeDescription: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  typeDescriptionSelected: {
    color: colors.navy,
  },
  emptyListCard: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  emptyListTitle: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  emptyListText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
  },
  materialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 14,
    marginBottom: 10,
  },
  materialCardSelected: {
    borderColor: '#BFD2FF',
    backgroundColor: colors.navySoft,
  },
  materialIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  materialIconWrapSelected: {
    backgroundColor: colors.navy,
  },
  materialTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  materialTitleSelected: {
    color: colors.navy,
  },
  materialMeta: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  materialMetaSelected: {
    color: colors.navy,
  },
  unitCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  unitCardSelected: {
    borderColor: '#BFD2FF',
    backgroundColor: colors.navySoft,
  },
  unitTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  unitTitleSelected: {
    color: colors.navy,
  },
  unitMeta: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
  },
  unitMetaSelected: {
    color: colors.navy,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.text,
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
    color: colors.textMuted,
  },
  techCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 14,
  },
  techCardSelected: {
    borderColor: '#BFD2FF',
    backgroundColor: colors.navySoft,
  },
  techAvatar: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  techTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  techTitleSelected: {
    color: colors.navy,
  },
  techMeta: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
  },
  techMetaSelected: {
    color: colors.navy,
  },
});
