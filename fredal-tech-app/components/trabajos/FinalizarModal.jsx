// components/actividades/ActividadFormModal.jsx
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, ScrollView,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useCreateActividad } from '../../hooks/useActividades';

const TIPO_ACTIVIDAD = [
  { value: 'REVISION',     label: 'Revisión' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento' },
];

const TIPO_MANTENIMIENTO = [
  { value: 'PREVENTIVO', label: 'Preventivo' },
  { value: 'CORRECTIVO', label: 'Correctivo' },
  { value: 'PREDICTIVO', label: 'Predictivo' },
];

const SUBTIPOS = {
  PREVENTIVO: [
    { value: 'PM1', label: 'PM1' },
    { value: 'PM2', label: 'PM2' },
    { value: 'PM3', label: 'PM3' },
    { value: 'PM4', label: 'PM4' },
  ],
  CORRECTIVO: [
    { value: 'LEVE',    label: 'Leve' },
    { value: 'MEDIANO', label: 'Mediano' },
    { value: 'GRAVE',   label: 'Grave' },
  ],
  PREDICTIVO: [
    { value: 'LEVE',    label: 'Leve' },
    { value: 'MEDIANO', label: 'Mediano' },
    { value: 'GRAVE',   label: 'Grave' },
  ],
};

function SelectRow({ label, value, options, onChange, disabled }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map(opt => {
          const selected = value === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => !disabled && onChange(opt.value)}
              style={{
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
                borderWidth: 1.5,
                borderColor: selected ? '#1e3a8a' : '#d1d5db',
                backgroundColor: selected ? '#1e3a8a' : (disabled ? '#f3f4f6' : 'white'),
              }}
            >
              <Text style={{
                fontSize: 13, fontWeight: selected ? '700' : '400',
                color: selected ? 'white' : (disabled ? '#9ca3af' : '#374151'),
              }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function ActividadFormModal({ trabajoId, onClose }) {
  const createMut = useCreateActividad(trabajoId);

  const [form, setForm] = useState({
    tipo_actividad:     '',
    tipo_mantenimiento: '',
    subtipo:            '',
    descripcion:        '',
  });
  const [error, setError] = useState('');

  const esRevision     = form.tipo_actividad === 'REVISION';
  const esMantenimiento = form.tipo_actividad === 'MANTENIMIENTO';
  const subtipoOptions = SUBTIPOS[form.tipo_mantenimiento] || [];

  const handleTipoActividad = (val) => {
    setForm({ tipo_actividad: val, tipo_mantenimiento: '', subtipo: '', descripcion: form.descripcion });
    setError('');
  };

  const handleTipoMant = (val) => {
    setForm(prev => ({ ...prev, tipo_mantenimiento: val, subtipo: '' }));
    setError('');
  };

  const puedeGuardar =
    form.tipo_actividad &&
    (esRevision || (esMantenimiento && form.tipo_mantenimiento && form.subtipo));

  const handleSave = () => {
    setError('');
    if (!form.tipo_actividad) { setError('Selecciona un tipo de actividad'); return; }
    if (esMantenimiento && !form.tipo_mantenimiento) { setError('Selecciona un tipo de mantenimiento'); return; }
    if (esMantenimiento && !form.subtipo) { setError('Selecciona un subtipo'); return; }

    const payload = {
      tipo_actividad: form.tipo_actividad,
      descripcion: form.descripcion,
      orden: trabajoId,
      es_planificada: false,
    };
    if (esMantenimiento) {
      payload.tipo_mantenimiento = form.tipo_mantenimiento;
      payload.subtipo = form.subtipo;
    }

    createMut.mutate(payload, {
      onSuccess: () => onClose(),
      onError: (err) => {
        const msg = err?.response?.data?.detail || JSON.stringify(err?.response?.data) || 'Error al guardar';
        setError(msg);
      },
    });
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1e3a8a' }}>
              Nueva Actividad
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 22, color: '#6b7280' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            {/* Error */}
            {error ? (
              <View style={{ backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <Text style={{ color: '#b91c1c', fontSize: 13 }}>{error}</Text>
              </View>
            ) : null}

            {/* Tipo actividad */}
            <SelectRow
              label="Tipo de actividad *"
              value={form.tipo_actividad}
              options={TIPO_ACTIVIDAD}
              onChange={handleTipoActividad}
            />

            {/* Tipo mantenimiento */}
            <SelectRow
              label={`Tipo de mantenimiento${esMantenimiento ? ' *' : ''}`}
              value={form.tipo_mantenimiento}
              options={TIPO_MANTENIMIENTO}
              onChange={handleTipoMant}
              disabled={esRevision || !form.tipo_actividad}
            />
            {esRevision ? (
              <Text style={{ fontSize: 12, color: '#6b7280', marginTop: -10, marginBottom: 16 }}>
                Las revisiones no requieren tipo de mantenimiento
              </Text>
            ) : null}

            {/* Subtipo */}
            {subtipoOptions.length > 0 ? (
              <SelectRow
                label="Subtipo *"
                value={form.subtipo}
                options={subtipoOptions}
                onChange={(val) => setForm(prev => ({ ...prev, subtipo: val }))}
                disabled={!form.tipo_mantenimiento}
              />
            ) : (
              esMantenimiento && form.tipo_mantenimiento === '' ? (
                <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>
                  Selecciona un tipo de mantenimiento para ver los subtipos
                </Text>
              ) : null
            )}

            {/* Info revisión */}
            {esRevision ? (
              <View style={{ backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1e40af' }}>Actividad de Revisión</Text>
                <Text style={{ fontSize: 12, color: '#1d4ed8', marginTop: 4 }}>
                  En una revisión no se registra mantenimiento ni se asignan repuestos
                </Text>
              </View>
            ) : null}

            {/* Descripción */}
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                Descripción
              </Text>
              <TextInput
                style={{
                  borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10,
                  paddingHorizontal: 14, paddingVertical: 10,
                  fontSize: 14, color: '#1f2937',
                  minHeight: 80, textAlignVertical: 'top',
                }}
                multiline
                numberOfLines={3}
                placeholder="Describe los detalles de la actividad..."
                placeholderTextColor="#9ca3af"
                value={form.descripcion}
                onChangeText={t => setForm(prev => ({ ...prev, descripcion: t }))}
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={{ flexDirection: 'row', gap: 10, padding: 20, borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
            <TouchableOpacity
              style={{ flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#d1d5db' }}
              onPress={onClose}
              disabled={createMut.isPending}
            >
              <Text style={{ color: '#374151', fontWeight: '600' }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 2, paddingVertical: 14, borderRadius: 10, alignItems: 'center',
                backgroundColor: puedeGuardar && !createMut.isPending ? '#1e3a8a' : '#9ca3af',
                flexDirection: 'row', justifyContent: 'center', gap: 6,
              }}
              onPress={handleSave}
              disabled={!puedeGuardar || createMut.isPending}
            >
              {createMut.isPending ? (
                <ActivityIndicator size="small" color="white" />
              ) : null}
              <Text style={{ color: 'white', fontWeight: 'bold' }}>
                {createMut.isPending ? 'Guardando...' : 'Guardar Actividad'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}