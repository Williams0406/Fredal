import { useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, ScrollView,
  TextInput, ActivityIndicator,
} from 'react-native';
import { useFinalizarTrabajo } from '../../hooks/useTrabajos';

const ESTADOS_EQUIPO = [
  { value: 'OPERATIVO', label: '✓ Operativo' },
  { value: 'INOPERATIVO', label: '✗ Inoperativo' },
];

const getCurrentTime = () => new Date().toTimeString().slice(0, 5);

function calcularDuracion(inicio, fin) {
  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = fin.split(':').map(Number);

  const totalMinutos = (h2 * 60 + m2) - (h1 * 60 + m1);
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;

  return `${horas}h ${minutos}m`;
}

export default function FinalizarModal({ trabajo, onClose, onFinalizado }) {
  const finalizarMut = useFinalizarTrabajo();

  const [form, setForm] = useState({
    hora_inicio: trabajo?.hora_inicio || getCurrentTime(),
    hora_fin: trabajo?.hora_fin || '',
    horometro: trabajo?.horometro ? String(trabajo.horometro) : '',
    estado_equipo: trabajo?.estado_equipo || '',
  });
  const [error, setError] = useState('');

  const saving = finalizarMut.isPending;

  const duracion = useMemo(() => {
    if (!form.hora_inicio || !form.hora_fin) return '';
    if (form.hora_inicio >= form.hora_fin) return '';
    return calcularDuracion(form.hora_inicio, form.hora_fin);
  }, [form.hora_inicio, form.hora_fin]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleSubmit = () => {
    if (!form.hora_inicio || !form.hora_fin) {
      setError('Las horas de inicio y fin son obligatorias');
      return;
    }

    if (!form.horometro) {
      setError('El horómetro es obligatorio');
      return;
    }

    if (!form.estado_equipo) {
      setError('El estado del equipo es obligatorio');
      return;
    }

    if (form.hora_inicio >= form.hora_fin) {
      setError('La hora de fin debe ser posterior a la hora de inicio');
      return;
    }

    finalizarMut.mutate(
      {
        id: trabajo.id,
        data: {
          hora_inicio: form.hora_inicio,
          hora_fin: form.hora_fin,
          horometro: Number(form.horometro),
          estado_equipo: form.estado_equipo,
        },
      },
      {
        onSuccess: (res) => {
          onFinalizado?.(res?.data);
          onClose();
        },
        onError: (err) => {
          setError(err?.response?.data?.detail || 'Error al finalizar la orden');
        },
      }
    );
  };

  return (
    <Modal visible transparent animationType='slide' onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1e3a8a' }}>
                Finalizar Orden de Trabajo
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                {trabajo?.codigo_orden}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} disabled={saving}>
              <Text style={{ fontSize: 22, color: '#6b7280' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps='handled'>
            <View style={{ backgroundColor: '#fefce8', borderWidth: 1, borderColor: '#fde68a', padding: 12, borderRadius: 10, marginBottom: 14 }}>
              <Text style={{ color: '#854d0e', fontWeight: '700', fontSize: 13 }}>⚠ Acción irreversible</Text>
              <Text style={{ color: '#a16207', fontSize: 12, marginTop: 4 }}>
                Una vez finalizada la orden, no podrás modificar ni agregar actividades.
              </Text>
            </View>

            {error ? (
              <View style={{ backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', padding: 12, borderRadius: 10, marginBottom: 14 }}>
                <Text style={{ color: '#b91c1c', fontSize: 13 }}>{error}</Text>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Hora de inicio *</Text>
                <TextInput
                  value={form.hora_inicio}
                  onChangeText={(v) => handleChange('hora_inicio', v)}
                  placeholder='HH:MM'
                  placeholderTextColor='#9ca3af'
                  style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#111827' }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Hora de fin *</Text>
                <TextInput
                  value={form.hora_fin}
                  onChangeText={(v) => handleChange('hora_fin', v)}
                  placeholder='HH:MM'
                  placeholderTextColor='#9ca3af'
                  style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#111827' }}
                />
              </View>
            </View>

            {duracion ? (
              <View style={{ backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', padding: 10, borderRadius: 10, marginBottom: 14 }}>
                <Text style={{ color: '#1e3a8a', fontSize: 13 }}>
                  <Text style={{ fontWeight: '700' }}>Duración:</Text> {duracion}
                </Text>
              </View>
            ) : null}

            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Horómetro (horas) *</Text>
              <TextInput
                value={form.horometro}
                onChangeText={(v) => handleChange('horometro', v)}
                keyboardType='numeric'
                placeholder='Ej: 1250.5'
                placeholderTextColor='#9ca3af'
                style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#111827' }}
              />
              <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 5 }}>Horas acumuladas de uso del equipo</Text>
            </View>

            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Estado del equipo *</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {ESTADOS_EQUIPO.map((opt) => {
                  const selected = form.estado_equipo === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => handleChange('estado_equipo', opt.value)}
                      style={{
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 10,
                        borderWidth: 1.5,
                        borderColor: selected ? '#1e3a8a' : '#d1d5db',
                        backgroundColor: selected ? '#1e3a8a' : 'white',
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: selected ? 'white' : '#374151', fontWeight: selected ? '700' : '500' }}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {form.estado_equipo === 'OPERATIVO' ? (
              <View style={{ backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', padding: 10, borderRadius: 10, marginBottom: 14 }}>
                <Text style={{ color: '#166534', fontSize: 13 }}>✓ El equipo quedará disponible para nuevas asignaciones.</Text>
              </View>
            ) : null}

            {form.estado_equipo === 'INOPERATIVO' ? (
              <View style={{ backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', padding: 10, borderRadius: 10, marginBottom: 14 }}>
                <Text style={{ color: '#991b1b', fontSize: 13 }}>✗ El equipo no estará disponible hasta nueva revisión.</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 10, padding: 20, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
            <TouchableOpacity
              onPress={onClose}
              disabled={saving}
              style={{ flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#d1d5db' }}
            >
              <Text style={{ color: '#374151', fontWeight: '600' }}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={saving}
              style={{
                flex: 1.6,
                paddingVertical: 14,
                borderRadius: 10,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                backgroundColor: saving ? '#9ca3af' : '#dc2626',
              }}
            >
              {saving ? <ActivityIndicator size='small' color='white' /> : null}
              <Text style={{ color: 'white', fontWeight: '700' }}>
                {saving ? 'Finalizando...' : 'Finalizar Orden'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}