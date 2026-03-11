// components/movimientos/MovimientoModal.jsx
// Permite al técnico agregar repuestos (ItemUnidad) o consumibles (LoteConsumible)
// a una actividad de una OT. Modela el flujo del MovimientoRepuestoModal web.
import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Modal, ScrollView,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  itemAPI, movimientoRepuestoAPI, movimientoConsumibleAPI,
  trabajoAPI, trabajadorAPI,
} from '../../lib/api';

const TIPO_OPTS = [
  { value: 'REPUESTO',   label: '🔧 Repuesto' },
  { value: 'CONSUMIBLE', label: '📦 Consumible' },
];

export default function MovimientoModal({ actividad, trabajoId, onClose }) {
  const qc = useQueryClient();

  const [tipo, setTipo]           = useState('REPUESTO');
  const [items, setItems]         = useState([]);
  const [unidades, setUnidades]   = useState([]);    // para repuestos
  const [lotes, setLotes]         = useState([]);    // para consumibles
  const [tecnicos, setTecnicos]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const [form, setForm] = useState({
    item:           '',
    item_unidad:    '',  // repuesto
    lote:           '',  // consumible
    cantidad:       '1',
    tecnico:        '',
  });

  const esActPlanificada = Boolean(actividad?.es_planificada);
  const selectedItem = items.find(i => String(i.id) === String(form.item));
  const esConsumible = selectedItem?.tipo_insumo === 'CONSUMIBLE';

  // Carga items disponibles + técnicos
  useEffect(() => {
    setLoading(true);
    Promise.all([
      itemAPI.list({ disponibles: 1 }),
      trabajoAPI.retrieve(trabajoId),
      trabajadorAPI.list(),
    ])
      .then(([itemsRes, trabajoRes, trabRes]) => {
        setItems(itemsRes.data || []);
        const ids = trabajoRes.data?.tecnicos || [];
        setTecnicos((trabRes.data || []).filter(t => ids.includes(t.id)));
      })
      .catch(() => setError('Error cargando datos'))
      .finally(() => setLoading(false));
  }, [trabajoId]);

  // Carga unidades/lotes cuando cambia el item
  useEffect(() => {
    if (!form.item) { setUnidades([]); setLotes([]); return; }
    if (!esConsumible) {
      itemAPI.unidadesAsignables(form.item, { orden: trabajoId })
        .then(r => setUnidades(r.data || []))
        .catch(() => setUnidades([]));
    } else {
      itemAPI.lotesDisponibles(form.item, { orden: trabajoId })
        .then(r => setLotes(r.data || []))
        .catch(() => setLotes([]));
    }
  }, [form.item, esConsumible, trabajoId]);

  const handleSave = async () => {
    setError('');
    if (!form.item) { setError('Selecciona un item'); return; }
    if (!esConsumible && !form.item_unidad) { setError('Selecciona una unidad'); return; }
    if (esConsumible && (!form.cantidad || parseFloat(form.cantidad) <= 0)) { setError('Ingresa una cantidad válida'); return; }
    if (esActPlanificada && !form.tecnico) { setError('Selecciona un técnico para la actividad planificada'); return; }

    setSaving(true);
    try {
      if (!esConsumible) {
        const payload = { actividad: actividad.id, item_unidad: Number(form.item_unidad) };
        if (form.tecnico) payload.tecnico = Number(form.tecnico);
        await movimientoRepuestoAPI.create(payload);
      } else {
        const payload = {
          actividad: actividad.id,
          item: Number(form.item),
          cantidad: parseFloat(form.cantidad),
        };
        if (form.tecnico) payload.tecnico = Number(form.tecnico);
        if (form.lote)    payload.lote    = Number(form.lote);
        await movimientoConsumibleAPI.create(payload);
      }
      qc.invalidateQueries({ queryKey: ['actividades', trabajoId] });
      qc.invalidateQueries({ queryKey: ['trabajo', trabajoId] });
      onClose();
    } catch (err) {
      const data = err?.response?.data;
      const msg = data?.detail || (typeof data === 'object' ? Object.values(data).flat().join(' ') : 'Error al guardar');
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Filtrar items por tipo
  const itemsFiltrados = items.filter(i =>
    tipo === 'REPUESTO' ? i.tipo_insumo === 'REPUESTO' : i.tipo_insumo === 'CONSUMIBLE'
  );

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
            <View>
              <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#1e3a8a' }}>
                Agregar Insumo
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {actividad?.tipo_actividad === 'MANTENIMIENTO'
                  ? `Mant. ${actividad.tipo_mantenimiento || ''} · ${actividad.subtipo || ''}`
                  : 'Revisión'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 22, color: '#6b7280' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#1e3a8a" />
              <Text style={{ color: '#6b7280', marginTop: 8 }}>Cargando datos...</Text>
            </View>
          ) : (
            <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
              {/* Error */}
              {error ? (
                <View style={{ backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                  <Text style={{ color: '#b91c1c', fontSize: 13 }}>{error}</Text>
                </View>
              ) : null}

              {/* Tipo: Repuesto / Consumible */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Tipo de insumo</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {TIPO_OPTS.map(opt => {
                    const sel = tipo === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={{
                          flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center',
                          backgroundColor: sel ? '#1e3a8a' : '#f3f4f6',
                          borderWidth: 1.5, borderColor: sel ? '#1e3a8a' : '#e5e7eb',
                        }}
                        onPress={() => { setTipo(opt.value); setForm(p => ({ ...p, item: '', item_unidad: '', lote: '', cantidad: '1' })); }}
                      >
                        <Text style={{ color: sel ? 'white' : '#374151', fontWeight: '700', fontSize: 13 }}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Selección de item */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                  {tipo === 'REPUESTO' ? 'Repuesto' : 'Consumible'} *
                </Text>
                {itemsFiltrados.length === 0 ? (
                  <View style={{ backgroundColor: '#f9fafb', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' }}>
                    <Text style={{ color: '#6b7280', textAlign: 'center', fontSize: 13 }}>
                      No hay {tipo === 'REPUESTO' ? 'repuestos' : 'consumibles'} disponibles
                    </Text>
                  </View>
                ) : (
                  itemsFiltrados.map(item => {
                    const sel = String(form.item) === String(item.id);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={{
                          paddingHorizontal: 14, paddingVertical: 12, borderRadius: 8, marginBottom: 6,
                          backgroundColor: sel ? '#eff6ff' : '#f9fafb',
                          borderWidth: 1.5, borderColor: sel ? '#1e3a8a' : '#e5e7eb',
                        }}
                        onPress={() => setForm(p => ({ ...p, item: String(item.id), item_unidad: '', lote: '' }))}
                      >
                        <Text style={{ fontWeight: sel ? '700' : '400', color: sel ? '#1e3a8a' : '#1f2937', fontSize: 13 }}>
                          {item.codigo} — {item.nombre}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

              {/* Unidades (repuesto) */}
              {tipo === 'REPUESTO' && form.item ? (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                    Unidad disponible *
                  </Text>
                  {unidades.length === 0 ? (
                    <View style={{ backgroundColor: '#fef2f2', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' }}>
                      <Text style={{ color: '#b91c1c', fontSize: 13 }}>
                        No hay unidades disponibles para este repuesto
                      </Text>
                    </View>
                  ) : (
                    unidades.map(u => {
                      const sel = String(form.item_unidad) === String(u.id);
                      return (
                        <TouchableOpacity
                          key={u.id}
                          style={{
                            paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, marginBottom: 6,
                            backgroundColor: sel ? '#eff6ff' : '#f9fafb',
                            borderWidth: 1.5, borderColor: sel ? '#1e3a8a' : '#e5e7eb',
                          }}
                          onPress={() => setForm(p => ({ ...p, item_unidad: String(u.id) }))}
                        >
                          <Text style={{ fontWeight: sel ? '700' : '400', color: sel ? '#1e3a8a' : '#1f2937', fontSize: 13 }}>
                            {u.serie ? `S/N: ${u.serie}` : `ID: ${u.id}`} — {u.estado}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              ) : null}

              {/* Cantidad (consumible) */}
              {tipo === 'CONSUMIBLE' && form.item ? (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                    Cantidad *
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10,
                      paddingHorizontal: 14, paddingVertical: 12,
                      fontSize: 15, color: '#1f2937',
                    }}
                    value={form.cantidad}
                    onChangeText={v => setForm(p => ({ ...p, cantidad: v }))}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#9ca3af"
                  />
                  {lotes.length > 0 ? (
                    <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
                      Stock disponible: {lotes.reduce((a, l) => a + (l.cantidad_disponible || 0), 0)} {selectedItem?.unidad_medida_simbolo || ''}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {/* Técnico (obligatorio si actividad planificada) */}
              {tecnicos.length > 0 ? (
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                    Técnico{esActPlanificada ? ' *' : ' (opcional)'}
                  </Text>
                  {tecnicos.map(t => {
                    const sel = String(form.tecnico) === String(t.id);
                    return (
                      <TouchableOpacity
                        key={t.id}
                        style={{
                          paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, marginBottom: 6,
                          backgroundColor: sel ? '#eff6ff' : '#f9fafb',
                          borderWidth: 1.5, borderColor: sel ? '#1e3a8a' : '#e5e7eb',
                        }}
                        onPress={() => setForm(p => ({ ...p, tecnico: sel ? '' : String(t.id) }))}
                      >
                        <Text style={{ fontWeight: sel ? '700' : '400', color: sel ? '#1e3a8a' : '#1f2937', fontSize: 13 }}>
                          {t.nombres} {t.apellidos}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}
            </ScrollView>
          )}

          {/* Footer */}
          {!loading ? (
            <View style={{ flexDirection: 'row', gap: 10, padding: 20, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#d1d5db' }}
                onPress={onClose} disabled={saving}
              >
                <Text style={{ color: '#374151', fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 2, paddingVertical: 14, borderRadius: 10, alignItems: 'center',
                  backgroundColor: saving ? '#9ca3af' : '#1e3a8a',
                  flexDirection: 'row', justifyContent: 'center', gap: 6,
                }}
                onPress={handleSave} disabled={saving}
              >
                {saving ? <ActivityIndicator size="small" color="white" /> : null}
                <Text style={{ color: 'white', fontWeight: 'bold' }}>
                  {saving ? 'Guardando...' : 'Agregar Insumo'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}