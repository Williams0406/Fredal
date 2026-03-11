// components/trabajos/TrabajoCard.jsx
import { View, Text, TouchableOpacity } from 'react-native';

const PRIORIDAD_STYLE = {
  REGULAR:    { bg: '#f3f4f6', text: '#374151' },
  URGENTE:    { bg: '#fefce8', text: '#a16207' },
  EMERGENCIA: { bg: '#fef2f2', text: '#b91c1c' },
};

const BORDER_COLOR = {
  PENDIENTE:  '#9ca3af',
  EN_PROCESO: '#1e3a8a',
  FINALIZADO: '#84cc16',
};

export default function TrabajoCard({ trabajo, onPress }) {
  const pStyle = PRIORIDAD_STYLE[trabajo.prioridad] || PRIORIDAD_STYLE.REGULAR;
  const borderColor = BORDER_COLOR[trabajo.estatus] || '#9ca3af';

  const actividades = trabajo.actividades || [];
  const tiposActividad = [...new Set(actividades.map(a => a.tipo_actividad).filter(Boolean))];
  const tiposMant = [...new Set(actividades.map(a => a.tipo_mantenimiento).filter(Boolean))];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderLeftWidth: 4,
        borderLeftColor: borderColor,
        padding: 14,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ fontWeight: 'bold', color: '#1e3a8a', fontSize: 15 }}>
            {trabajo.codigo_orden}
          </Text>
          {trabajo.maquinaria_nombre ? (
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }} numberOfLines={1}>
              {trabajo.maquinaria_codigo ? `${trabajo.maquinaria_codigo} · ` : ''}{trabajo.maquinaria_nombre}
            </Text>
          ) : null}
        </View>
        <View style={{ backgroundColor: pStyle.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: pStyle.text }}>
            {trabajo.prioridad}
          </Text>
        </View>
      </View>

      {/* Meta */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
        {trabajo.fecha ? (
          <Text style={{ fontSize: 12, color: '#4b5563' }}>
            📅 {new Date(trabajo.fecha).toLocaleDateString('es-PE')}
          </Text>
        ) : null}
        {trabajo.lugar ? (
          <Text style={{ fontSize: 12, color: trabajo.lugar === 'CAMPO' ? '#1e3a8a' : '#4b5563', fontWeight: trabajo.lugar === 'CAMPO' ? '600' : '400' }}>
            📍 {trabajo.lugar === 'CAMPO' ? 'Campo' : 'Taller'}
          </Text>
        ) : null}
      </View>

      {/* Actividades badges */}
      {tiposActividad.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
          {tiposActividad.slice(0, 3).map(tipo => (
            <View key={tipo} style={{ backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#1e3a8a' }}>
                {tipo === 'MANTENIMIENTO' ? 'Mantenimiento' : 'Revisión'}
              </Text>
            </View>
          ))}
          {tiposMant.length > 0 ? (
            <View style={{ backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
              <Text style={{ fontSize: 11, color: '#15803d', fontWeight: '600' }}>
                {tiposMant.map(t => t[0] + t.slice(1).toLowerCase()).join(', ')}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Ver detalles hint */}
      <View style={{ marginTop: 10, alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 11, color: '#1e3a8a', fontWeight: '600' }}>
          Ver detalles →
        </Text>
      </View>
    </TouchableOpacity>
  );
}