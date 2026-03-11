// app/trabajos/[id].jsx
import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePatchTrabajo, useTrabajo } from '../../hooks/useTrabajos';
import { useActividades, useDeleteActividad } from '../../hooks/useActividades';
import ActividadFormModal from '../../components/actividades/ActividadFormModal';
import FinalizarModal from '../../components/trabajos/FinalizarModal';
import MovimientoModal from '../../components/movimientos/MovimientoModal';

// ── Helpers ───────────────────────────────────────────────────────
const PRIORIDAD_STYLE = {
  REGULAR:    { bg: '#f3f4f6', text: '#374151' },
  URGENTE:    { bg: '#fefce8', text: '#a16207' },
  EMERGENCIA: { bg: '#fef2f2', text: '#b91c1c' },
};
const ESTATUS_STYLE = {
  PENDIENTE:  { bg: '#f3f4f6', text: '#374151' },
  EN_PROCESO: { bg: '#eff6ff', text: '#1e40af' },
  FINALIZADO: { bg: '#f0fdf4', text: '#15803d' },
};

function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
      <Text style={{ fontSize: 14, width: 20 }}>{icon}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#6b7280', width: 60 }}>{label}</Text>
      <Text style={{ fontSize: 13, color: '#1f2937', flex: 1 }}>{value}</Text>
    </View>
  );
}

// ── Componente ActividadItem ──────────────────────────────────────
function ActividadItem({ actividad, trabajoId, readonly, onAddMovimiento }) {
  const deleteMut = useDeleteActividad(trabajoId);

  const tipoLabel = actividad.tipo_actividad === 'MANTENIMIENTO'
    ? `Mantenimiento · ${actividad.tipo_mantenimiento || ''} · ${actividad.subtipo || ''}`
    : 'Revisión';

  const totalItems =
    (actividad.repuestos?.length ?? 0) + (actividad.consumibles?.length ?? 0);

  const handleDelete = () => {
    Alert.alert(
      'Eliminar actividad',
      '¿Estás seguro de eliminar esta actividad?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive',
          onPress: () => deleteMut.mutate(actividad.id) },
      ]
    );
  };

  return (
    <View style={{
      backgroundColor: 'white', borderRadius: 10,
      borderWidth: 1, borderColor: '#e5e7eb',
      padding: 14, marginBottom: 10,
    }}>
      {/* Tipo */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, flex: 1, marginRight: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#1e3a8a' }} numberOfLines={1}>
            {tipoLabel}
          </Text>
        </View>
        {actividad.es_planificada ? (
          <View style={{ backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
            <Text style={{ fontSize: 11, color: '#15803d', fontWeight: '600' }}>Planificada</Text>
          </View>
        ) : null}
      </View>

      {/* Descripcion */}
      {actividad.descripcion ? (
        <Text style={{ fontSize: 13, color: '#4b5563', marginBottom: 8 }}>
          {actividad.descripcion}
        </Text>
      ) : null}

      {/* Repuestos/consumibles */}
      {(actividad.repuestos?.length > 0 || actividad.consumibles?.length > 0) ? (
        <View style={{ borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 8, marginBottom: 8 }}>
          {actividad.repuestos?.map(r => (
            <Text key={r.id} style={{ fontSize: 12, color: '#4b5563' }}>
              🔧 {r.item_nombre} {r.unidad_serie ? `(S/N: ${r.unidad_serie})` : ''}
            </Text>
          ))}
          {actividad.consumibles?.map(c => (
            <Text key={c.id} style={{ fontSize: 12, color: '#4b5563' }}>
              📦 {c.item_nombre} — {c.cantidad} {c.unidad_medida_simbolo || ''}
            </Text>
          ))}
        </View>
      ) : null}

      {/* Acciones */}
      {!readonly ? (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: '#eff6ff', paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}
            onPress={() => onAddMovimiento(actividad)}
          >
            <Text style={{ fontSize: 12, color: '#1e3a8a', fontWeight: '600' }}>
              + Repuesto/Consumible
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ backgroundColor: '#fef2f2', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}
            onPress={handleDelete}
            disabled={deleteMut.isPending}
          >
            <Text style={{ fontSize: 12, color: '#b91c1c', fontWeight: '600' }}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

// ── Pantalla principal ────────────────────────────────────────────
export default function TrabajoDetalleScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const trabajoId = Number(id);

  const { data: trabajo, isLoading } = useTrabajo(trabajoId);
  const { data: actividades = [] } = useActividades(trabajoId);
  const patchTrabajoMut = usePatchTrabajo();

  const [showActModal, setShowActModal]     = useState(false);
  const [showFinModal, setShowFinModal]     = useState(false);
  const [actividadSeleccionada, setActividadSeleccionada] = useState(null);

  const handleAddMovimiento = (actividad) => {
    setActividadSeleccionada(actividad);
  };

  const handleIniciarTrabajo = () => {
    patchTrabajoMut.mutate(
      { id: trabajoId, data: { estatus: 'EN_PROCESO' } },
      {
        onSuccess: () => {
          Alert.alert('Trabajo iniciado', 'La orden ahora está en proceso.');
        },
        onError: (err) => {
          Alert.alert(
            'Error',
            err?.response?.data?.detail || 'No se pudo iniciar el trabajo'
          );
        },
      }
    );
  };

  if (isLoading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
      <ActivityIndicator size="large" color="#1e3a8a" />
    </View>
  );

  if (!trabajo) return null;

  const esFinalizado = trabajo.estatus === 'FINALIZADO';
  const esPendiente = trabajo.estatus === 'PENDIENTE';
  const esEnProceso = trabajo.estatus === 'EN_PROCESO';
  const pStyle = PRIORIDAD_STYLE[trabajo.prioridad] || PRIORIDAD_STYLE.REGULAR;
  const eStyle = ESTATUS_STYLE[trabajo.estatus] || ESTATUS_STYLE.PENDIENTE;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#1e3a8a', paddingHorizontal: 16, paddingVertical: 16 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 8 }}>
          <Text style={{ color: '#bfdbfe', fontSize: 13 }}>← Volver</Text>
        </TouchableOpacity>
        <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
          {trabajo.codigo_orden}
        </Text>
        {trabajo.maquinaria_nombre ? (
          <Text style={{ color: '#bfdbfe', fontSize: 13, marginTop: 2 }}>
            {trabajo.maquinaria_nombre}
          </Text>
        ) : null}
      </View>

      <ScrollView style={{ flex: 1, padding: 14 }}>
        {/* Info Card */}
        <View style={{
          backgroundColor: 'white', borderRadius: 12, padding: 16,
          marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb',
          shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
            <View style={{ backgroundColor: pStyle.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: pStyle.text }}>
                {trabajo.prioridad}
              </Text>
            </View>
            <View style={{ backgroundColor: eStyle.bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: eStyle.text }}>
                {trabajo.estatus.replace('_', ' ')}
              </Text>
            </View>
          </View>

          <InfoRow icon="📅" label="Fecha"
            value={trabajo.fecha ? new Date(trabajo.fecha).toLocaleDateString('es-PE') : null} />
          <InfoRow icon="📍" label="Lugar" value={trabajo.lugar} />
          <InfoRow icon="🏭" label="Maquinaria" value={trabajo.maquinaria_nombre || null} />
          <InfoRow icon="📝" label="Obs." value={trabajo.observaciones || null} />

          {/* Info de cierre si está finalizado */}
          {esFinalizado ? (
            <View style={{ marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#15803d', marginBottom: 6 }}>
                ✓ Orden Finalizada
              </Text>
              <InfoRow icon="⏱" label="Inicio" value={trabajo.hora_inicio || null} />
              <InfoRow icon="⏱" label="Fin" value={trabajo.hora_fin || null} />
              <InfoRow icon="📊" label="Horóm." value={trabajo.horometro ? `${trabajo.horometro} h` : null} />
              <InfoRow icon="⚙️" label="Equipo" value={trabajo.estado_equipo || null} />
            </View>
          ) : null}
        </View>

        {/* Actividades */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#1e3a8a' }}>
            Actividades ({actividades.length})
          </Text>
          {esEnProceso ? (
            <TouchableOpacity
              style={{ backgroundColor: '#1e3a8a', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 }}
              onPress={() => setShowActModal(true)}
            >
              <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>+ Agregar</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {actividades.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 32, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>📋</Text>
            <Text style={{ color: '#6b7280' }}>Sin actividades registradas</Text>
            {esEnProceso ? (
              <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>
                Toca "+ Agregar" para registrar una actividad
              </Text>
            ) : null}
          </View>
        ) : (
          actividades.map(act => (
            <ActividadItem
              key={act.id}
              actividad={act}
              trabajoId={trabajoId}
              readonly={!esEnProceso}
              onAddMovimiento={handleAddMovimiento}
            />
          ))
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Footer: Acciones por estado */}
      {!esFinalizado ? (
        <View style={{ padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
          {esPendiente ? (
            <TouchableOpacity
              style={{ backgroundColor: '#84cc16', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }}
              onPress={handleIniciarTrabajo}
              disabled={patchTrabajoMut.isPending}
            >
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>
                {patchTrabajoMut.isPending ? 'Iniciando...' : '▶ Iniciar Trabajo'}
              </Text>
            </TouchableOpacity>
          ) : null}

          {esEnProceso ? (
            <TouchableOpacity
              style={{ backgroundColor: '#dc2626', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }}
              onPress={() => setShowFinModal(true)}
            >
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>
                ✓ Finalizar Orden
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* Modales */}
      {showActModal ? (
        <ActividadFormModal
          trabajoId={trabajoId}
          onClose={() => setShowActModal(false)}
        />
      ) : null}

      {showFinModal ? (
        <FinalizarModal
          trabajo={trabajo}
          onClose={() => setShowFinModal(false)}
        />
      ) : null}

      {actividadSeleccionada ? (
        <MovimientoModal
          actividad={actividadSeleccionada}
          trabajoId={trabajoId}
          onClose={() => setActividadSeleccionada(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}