import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePatchTrabajo, useTrabajo } from '../../hooks/useTrabajos';
import { useActividades, useDeleteActividad } from '../../hooks/useActividades';
import ActividadFormModal from '../../components/actividades/ActividadFormModal';
import OrdenRequerimientoSheet from '../../components/ordenes/OrdenRequerimientoSheet';
import FinalizarModal from '../../components/trabajos/FinalizarModal';
import TrabajoFormSheet from '../../components/trabajos/TrabajoFormSheet';
import MovimientoModal from '../../components/movimientos/MovimientoModal';
import { useAuthStore } from '../../store/authStore';
import { API_URL } from '../../lib/constants';
import { ordenRequerimientoAPI } from '../../lib/api';
import {
  canEditTrabajoData,
  canCreateRequirementOrders,
  canManagePlannedActivities,
} from '../../lib/permissions';
import {
  colors,
  formatStatusLabel,
  getPriorityPalette,
  getStatusPalette,
  radius,
  shadows,
} from '../../lib/theme';

const REQUERIMIENTO_STATUS_LABELS = {
  POR_REVISAR: 'Por revisar',
  ENTREGADO: 'Entregado',
  SIN_STOCK: 'Sin stock',
};

const REQUERIMIENTO_STATUS_STYLES = {
  POR_REVISAR: { bg: colors.amberSoft, text: colors.amber },
  ENTREGADO: { bg: colors.greenSoft, text: colors.green },
  SIN_STOCK: { bg: colors.redSoft, text: colors.red },
};

const resolveMediaUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://')) {
    return url;
  }

  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const parseCollection = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  return [];
};

const formatRequirementDate = (value) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleDateString('es-PE');
};

const formatRequirementQty = (value) => {
  const numberValue = Number(value ?? 0);
  if (!Number.isFinite(numberValue)) return '0';
  return numberValue.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatRequirementUnit = (item) => {
  if (!item?.unidad_medida_nombre && !item?.unidad_medida_simbolo) return '';
  if (item.unidad_medida_nombre && item.unidad_medida_simbolo) {
    return `${item.unidad_medida_nombre} (${item.unidad_medida_simbolo})`;
  }
  return item.unidad_medida_nombre || item.unidad_medida_simbolo || '';
};

function InfoRow({ icon, label, value }) {
  if (!value) return null;

  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color={colors.navy} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function EmptySection({ title, subtitle }) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconWrap}>
        <MaterialCommunityIcons name='clipboard-text-outline' size={28} color={colors.textSoft} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

function AccessNote({ text }) {
  return (
    <View style={styles.accessNote}>
      <View style={styles.accessNoteIcon}>
        <Ionicons name='lock-closed-outline' size={16} color={colors.navy} />
      </View>
      <Text style={styles.accessNoteText}>{text}</Text>
    </View>
  );
}

function RequirementStatusBadge({ status }) {
  const current =
    REQUERIMIENTO_STATUS_STYLES[status] || REQUERIMIENTO_STATUS_STYLES.POR_REVISAR;

  return (
    <View style={[styles.requirementStatusBadge, { backgroundColor: current.bg }]}>
      <Text style={[styles.requirementStatusText, { color: current.text }]}>
        {REQUERIMIENTO_STATUS_LABELS[status] || status}
      </Text>
    </View>
  );
}

function RequirementCard({
  orden,
  onChangeEstado,
  onMarkItemSinStock,
  onConfirmarRecepcion,
  isChanging,
  changingDetailId,
  isConfirming,
}) {
  return (
    <View style={styles.requirementCard}>
      <View style={styles.requirementHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.requirementTitleRow}>
            <Text style={styles.requirementCode}>{orden.codigo}</Text>
            <RequirementStatusBadge status={orden.estado} />
          </View>
          <Text style={styles.requirementMeta}>
            Trabajo {orden.trabajo_codigo} • Emitida {formatRequirementDate(orden.created_at)}
          </Text>
          <Text style={styles.requirementMeta}>
            Técnico: {orden.tecnico_asignado_nombre || 'Sin asignar'}
          </Text>
        </View>
      </View>

      {orden.pendiente_confirmacion_tecnico ? (
        <View style={styles.infoPill}>
          <Ionicons name='hourglass-outline' size={14} color={colors.navy} />
          <Text style={styles.infoPillText}>Pendiente de confirmacion del tecnico</Text>
        </View>
      ) : null}

      {orden.recepcion_confirmada_tecnico ? (
        <View style={[styles.infoPill, styles.successPill]}>
          <Ionicons name='checkmark-circle-outline' size={14} color={colors.green} />
          <Text style={[styles.infoPillText, styles.successText]}>
            Recepcion validada por tecnico
          </Text>
        </View>
      ) : null}

      {orden.tiene_items_sin_stock && orden.estado !== 'ENTREGADO' ? (
        <View style={[styles.infoPill, styles.warningPill]}>
          <Ionicons name='alert-circle-outline' size={14} color={colors.red} />
          <Text style={[styles.infoPillText, styles.warningText]}>
            Este requerimiento tiene items marcados sin stock.
          </Text>
        </View>
      ) : null}

      {orden.observaciones ? (
        <View style={styles.requirementNoteCard}>
          <Text style={styles.requirementNoteText}>{orden.observaciones}</Text>
        </View>
      ) : null}

      <View style={styles.requirementItemsCard}>
        {(orden.items || []).map((item) => (
          <View key={item.id} style={styles.requirementItemRow}>
            <View style={styles.requirementItemDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.requirementItemTitle}>
                {item.item_codigo} - {item.item_nombre}
              </Text>
              <Text style={styles.requirementItemMeta}>
                {formatRequirementQty(item.cantidad)}
                {formatRequirementUnit(item) ? ` ${formatRequirementUnit(item)}` : ''}
                {item.proveedor_nombre ? ` • ${item.proveedor_nombre}` : ''}
              </Text>
              {item.sin_stock ? (
                <View style={styles.requirementItemPill}>
                  <Ionicons name='close-circle-outline' size={12} color={colors.red} />
                  <Text style={styles.requirementItemPillText}>Sin stock</Text>
                </View>
              ) : null}
              {item.puede_marcar_sin_stock ? (
                <Pressable
                  style={[
                    styles.requirementItemAction,
                    isChanging && changingDetailId === item.id ? styles.buttonDisabled : null,
                  ]}
                  onPress={() => onMarkItemSinStock(orden, item)}
                  disabled={isChanging}
                >
                  {isChanging && changingDetailId === item.id ? (
                    <ActivityIndicator size='small' color={colors.red} />
                  ) : (
                    <Ionicons name='close-circle-outline' size={14} color={colors.red} />
                  )}
                  <Text style={styles.requirementItemActionText}>Marcar sin stock</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}
      </View>

      {orden.puede_marcar_entregado ? (
        <View style={styles.requirementActions}>
          <Pressable
            style={[
              styles.requirementPrimaryAction,
              isChanging ? styles.buttonDisabled : null,
            ]}
            onPress={() => onChangeEstado(orden, 'ENTREGADO')}
            disabled={isChanging}
          >
            {isChanging && !changingDetailId ? (
              <ActivityIndicator size='small' color={colors.white} />
            ) : (
              <Ionicons name='checkmark-done-outline' size={16} color={colors.white} />
            )}
            <Text style={styles.requirementPrimaryActionText}>Marcar entregado</Text>
          </Pressable>
        </View>
      ) : null}

      {orden.puede_confirmar_tecnico ? (
        <View style={styles.requirementActions}>
          <Pressable
            style={[
              styles.requirementSuccessAction,
              isConfirming ? styles.buttonDisabled : null,
            ]}
            onPress={() => onConfirmarRecepcion(orden)}
            disabled={isConfirming}
          >
            {isConfirming ? (
              <ActivityIndicator size='small' color={colors.white} />
            ) : (
              <Ionicons name='checkmark-circle-outline' size={16} color={colors.white} />
            )}
            <Text style={styles.requirementSuccessActionText}>Confirmar recepcion</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function ActivityCard({ actividad, readonly, onAddMovimiento }) {
  const deleteMut = useDeleteActividad(actividad.orden);
  const isMaintenance = actividad.tipo_actividad === 'MANTENIMIENTO';
  const movementCount = (actividad.repuestos?.length ?? 0) + (actividad.consumibles?.length ?? 0);
  const evidenceCount = actividad.evidencias?.length ?? 0;

  const handleDelete = () => {
    Alert.alert('Eliminar actividad', '¿Seguro que deseas eliminar esta actividad?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => deleteMut.mutate(actividad.id),
      },
    ]);
  };

  return (
    <View style={styles.activityCard}>
      <View style={styles.activityHeader}>
        <View style={[styles.activityIconWrap, isMaintenance ? styles.activityIconMaintenance : styles.activityIconReview]}>
          {isMaintenance && (
            <MaterialCommunityIcons
              name='wrench-outline'
              size={20}
              color={colors.navy}
            />
          )}
          {!isMaintenance && (
            <Ionicons name='search-outline' size={20} color={colors.textMuted} />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.activityType}>
            {isMaintenance ? 'Mantenimiento' : 'Revisión'}
          </Text>
          <Text style={styles.activityMeta}>
            {isMaintenance
              ? `${actividad.tipo_mantenimiento || 'Sin tipo'} · ${actividad.subtipo || 'Sin subtipo'}`
              : 'Actividad de inspección'}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <View
            style={[
              styles.inlinePill,
              actividad.es_planificada ? styles.planPill : styles.realPill,
            ]}
          >
            <Text
              style={[
                styles.inlinePillText,
                actividad.es_planificada ? styles.planPillText : styles.realPillText,
              ]}
            >
              {actividad.es_planificada ? 'Planificada' : 'Registrada'}
            </Text>
          </View>
          <View style={[styles.inlinePill, styles.countPill]}>
            <Ionicons name='cube-outline' size={12} color={colors.textMuted} />
            <Text style={[styles.inlinePillText, { color: colors.textMuted }]}>
              {movementCount}
            </Text>
          </View>
          {evidenceCount > 0 ? (
            <View style={[styles.inlinePill, styles.countPill]}>
              <Ionicons name='images-outline' size={12} color={colors.textMuted} />
              <Text style={[styles.inlinePillText, { color: colors.textMuted }]}>
                {evidenceCount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {actividad.descripcion ? (
        <Text style={styles.activityDescription}>{actividad.descripcion}</Text>
      ) : null}

      {evidenceCount > 0 ? (
        <View style={styles.evidenceBlock}>
          <Text style={styles.evidenceTitle}>
            {evidenceCount === 1 ? '1 evidencia fotografica' : `${evidenceCount} evidencias fotograficas`}
          </Text>
          <View style={styles.evidenceGrid}>
            {actividad.evidencias.map((evidencia) => {
              const uri = resolveMediaUrl(evidencia.url);
              if (!uri) return null;

              return (
                <Image
                  key={evidencia.id}
                  source={{ uri }}
                  style={styles.evidenceImage}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      {(actividad.repuestos?.length > 0 || actividad.consumibles?.length > 0) ? (
        <View style={styles.materialBlock}>
          {actividad.repuestos?.map((repuesto) => (
            <View key={repuesto.id} style={styles.materialRow}>
              <MaterialCommunityIcons name='cog-outline' size={16} color={colors.navy} />
              <Text style={styles.materialText}>
                {repuesto.item_nombre}
                {repuesto.unidad_serie ? ` · S/N ${repuesto.unidad_serie}` : ''}
              </Text>
            </View>
          ))}

          {actividad.consumibles?.map((consumible) => (
            <View key={consumible.id} style={styles.materialRow}>
              <Ionicons name='flask-outline' size={15} color={colors.green} />
              <Text style={styles.materialText}>
                {consumible.item_nombre} · {consumible.cantidad} {consumible.unidad_medida_simbolo || ''}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {!readonly ? (
        <View style={styles.activityActions}>
            <Pressable style={[styles.secondaryAction, { flex: 1 }]} onPress={() => onAddMovimiento(actividad)}>
              <Ionicons name={isMaintenance ? 'cube-outline' : 'images-outline'} size={16} color={colors.navy} />
              <Text style={styles.secondaryActionText}>
                {isMaintenance ? 'Materiales y evidencias' : 'Registrar evidencias'}
              </Text>
            </Pressable>
          {false && (
            <View style={[styles.secondaryAction, { flex: 1, opacity: 0.7 }]}>
              <Text style={[styles.secondaryActionText, { color: colors.textMuted }]}>
                La revisión no usa materiales
              </Text>
            </View>
          )}

          <Pressable style={styles.deleteAction} onPress={handleDelete} disabled={deleteMut.isPending}>
            <Ionicons name='trash-outline' size={16} color={colors.red} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default function TrabajoDetalleScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const trabajoId = Number(id);
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: trabajo, isLoading } = useTrabajo(trabajoId);
  const { data: actividades = [] } = useActividades(trabajoId);
  const { data: requerimientos = [], isLoading: isLoadingRequerimientos } = useQuery({
    queryKey: ['ordenes-requerimiento-mobile', trabajoId],
    queryFn: async () => {
      const { data } = await ordenRequerimientoAPI.list({ trabajo: trabajoId });
      return parseCollection(data);
    },
    enabled: Boolean(trabajoId),
  });
  const patchTrabajoMut = usePatchTrabajo();

  const changeRequirementStateMut = useMutation({
    mutationFn: ({ id: requirementId, estado, detalleId = null }) =>
      ordenRequerimientoAPI.cambiarEstado(requirementId, estado, detalleId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['ordenes-requerimiento-mobile', trabajoId],
      });
      queryClient.invalidateQueries({ queryKey: ['ordenes-requerimiento-mobile'] });
    },
  });

  const confirmRequirementReceiptMut = useMutation({
    mutationFn: (requirementId) => ordenRequerimientoAPI.confirmarRecepcion(requirementId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['ordenes-requerimiento-mobile', trabajoId],
      });
      queryClient.invalidateQueries({ queryKey: ['ordenes-requerimiento-mobile'] });
    },
  });

  const [showActModal, setShowActModal] = useState(false);
  const [isPlanningActivity, setIsPlanningActivity] = useState(false);
  const [showReqModal, setShowReqModal] = useState(false);
  const [showFinModal, setShowFinModal] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [actividadSeleccionada, setActividadSeleccionada] = useState(null);

  const esFinalizado = trabajo?.estatus === 'FINALIZADO';
  const esPendiente = trabajo?.estatus === 'PENDIENTE';
  const esEnProceso = trabajo?.estatus === 'EN_PROCESO';
  const canEditTrabajo = canEditTrabajoData(user) && !esFinalizado;
  const canCreateRequirements = canCreateRequirementOrders(user);
  const canManagePlanned = canManagePlannedActivities(user);
  const plannedReadonly = esFinalizado || !canManagePlanned;

  const priority = getPriorityPalette(trabajo?.prioridad);
  const status = getStatusPalette(trabajo?.estatus);

  const planificadas = useMemo(
    () => actividades.filter((actividad) => actividad.es_planificada),
    [actividades]
  );
  const registradas = useMemo(
    () => actividades.filter((actividad) => !actividad.es_planificada),
    [actividades]
  );

  const materialCount = useMemo(
    () =>
      actividades.reduce(
        (acc, actividad) =>
          acc + (actividad.repuestos?.length || 0) + (actividad.consumibles?.length || 0),
        0
      ),
    [actividades]
  );

  const handleAddMovimiento = (actividad) => setActividadSeleccionada(actividad);

  const handleChangeRequirementState = (orden, estado) => {
    const actionLabel =
      estado === 'ENTREGADO' ? 'marcar como entregada' : 'marcar como sin stock';

    Alert.alert(
      'Actualizar requerimiento',
      `Se registrara ${orden.codigo} como ${REQUERIMIENTO_STATUS_LABELS[estado].toLowerCase()}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () =>
            changeRequirementStateMut.mutate(
              { id: orden.id, estado },
              {
                onError: (err) => {
                  Alert.alert(
                    'No se pudo actualizar',
                    err?.response?.data?.detail ||
                      `No se pudo ${actionLabel} desde el movil.`
                  );
                },
              }
            ),
        },
      ]
    );
  };

  const handleMarkRequirementItemSinStock = (orden, item) => {
    Alert.alert(
      'Marcar item sin stock',
      `Se registrara ${item.item_codigo} como sin stock dentro de ${orden.codigo}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () =>
            changeRequirementStateMut.mutate(
              {
                id: orden.id,
                estado: 'SIN_STOCK',
                detalleId: item.id,
              },
              {
                onError: (err) => {
                  Alert.alert(
                    'No se pudo actualizar',
                    err?.response?.data?.detail ||
                      'No se pudo marcar el item como sin stock.'
                  );
                },
              }
            ),
        },
      ]
    );
  };

  const handleConfirmRequirementReceipt = (orden) => {
    Alert.alert(
      'Confirmar recepcion',
      `Se validara la recepcion del requerimiento ${orden.codigo}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () =>
            confirmRequirementReceiptMut.mutate(orden.id, {
              onError: (err) => {
                Alert.alert(
                  'No se pudo confirmar',
                  err?.response?.data?.detail ||
                    'No se pudo confirmar la recepcion del requerimiento.'
                );
              },
            }),
        },
      ]
    );
  };

  const handleIniciarTrabajo = () => {
    patchTrabajoMut.mutate(
      { id: trabajoId, data: { estatus: 'EN_PROCESO' } },
      {
        onSuccess: () => {
          Alert.alert('Trabajo iniciado', 'La orden ya está en ejecución.');
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

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar style='light' />
        <ActivityIndicator size='large' color={colors.navy} />
        <Text style={styles.loadingText}>Cargando orden de trabajo...</Text>
      </View>
    );
  }

  if (!trabajo) return null;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style='light' />

      <View style={styles.heroHeader}>
        <View style={styles.heroGlowLeft} />
        <View style={styles.heroGlowRight} />

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name='arrow-back' size={18} color={colors.white} />
          <Text style={styles.backButtonText}>Volver</Text>
        </Pressable>

        <Text style={styles.heroCode}>{trabajo.codigo_orden}</Text>
        <Text style={styles.heroMachine}>
          {trabajo.maquinaria_codigo ? `${trabajo.maquinaria_codigo} · ` : ''}
          {trabajo.maquinaria_nombre || 'Maquinaria no disponible'}
        </Text>

        <View style={styles.heroPillsRow}>
          <View style={[styles.heroPill, { backgroundColor: priority.bg }]}>
            <Ionicons name='alert-circle-outline' size={14} color={priority.icon} />
            <Text style={[styles.heroPillText, { color: priority.text }]}>{trabajo.prioridad}</Text>
          </View>
          <View style={[styles.heroPill, { backgroundColor: status.bg }]}>
            <Text style={[styles.heroPillText, { color: status.text }]}>
              {formatStatusLabel(trabajo.estatus)}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Resumen operativo</Text>
              <Text style={styles.sectionMeta}>OT activa</Text>
            </View>
            {canEditTrabajo ? (
              <Pressable
                style={styles.summaryEditButton}
                onPress={() => setShowEditSheet(true)}
              >
                <Ionicons name='create-outline' size={15} color={colors.navy} />
                <Text style={styles.summaryEditButtonText}>Editar</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.metricsRow}>
            <MetricCard label='Plan' value={planificadas.length} tone='muted' />
            <MetricCard label='Real' value={registradas.length} tone='navy' />
            <MetricCard label='Materiales' value={materialCount} tone='lime' />
          </View>

          <View style={styles.infoGrid}>
            <InfoRow
              icon='calendar-outline'
              label='Fecha'
              value={trabajo.fecha ? new Date(trabajo.fecha).toLocaleDateString('es-PE') : null}
            />
            <InfoRow
              icon='location-outline'
              label='Lugar'
              value={trabajo.lugar === 'CAMPO' ? 'Campo' : trabajo.lugar === 'TALLER' ? 'Taller' : trabajo.lugar}
            />
            <InfoRow icon='business-outline' label='Ubicación' value={trabajo.ubicacion_detalle || null} />
            <InfoRow icon='document-text-outline' label='Observaciones' value={trabajo.observaciones || null} />
          </View>

          {esFinalizado ? (
            <View style={styles.closingBlock}>
              <View style={styles.closingBanner}>
                <Ionicons name='checkmark-done-circle' size={18} color={colors.green} />
                <Text style={styles.closingBannerText}>Orden finalizada</Text>
              </View>

              <InfoRow icon='time-outline' label='Inicio' value={trabajo.hora_inicio || null} />
              <InfoRow icon='timer-outline' label='Fin' value={trabajo.hora_fin || null} />
              <InfoRow icon='speedometer-outline' label='Horómetro' value={trabajo.horometro ? `${trabajo.horometro} h` : null} />
              <InfoRow icon='construct-outline' label='Equipo' value={trabajo.estado_equipo || null} />
            </View>
          ) : null}
        </View>

        <SectionHeader
          title='Ordenes de requerimiento'
          count={requerimientos.length}
          subtitle='Solicitudes de materiales asociadas a esta orden de trabajo.'
          action={
            canCreateRequirements && esPendiente ? (
              <Pressable
                style={styles.primaryMiniButton}
                onPress={() => setShowReqModal(true)}
              >
                <Ionicons name='add' size={16} color={colors.white} />
                <Text style={styles.primaryMiniButtonText}>Nueva orden</Text>
              </Pressable>
            ) : null
          }
        />
        {canCreateRequirements && !esPendiente ? (
          <AccessNote text='Los requerimientos se emiten solo mientras la OT está en estado pendiente.' />
        ) : null}
        {isLoadingRequerimientos ? (
          <View style={styles.loadingInlineCard}>
            <ActivityIndicator size='small' color={colors.navy} />
            <Text style={styles.loadingInlineText}>Cargando requerimientos...</Text>
          </View>
        ) : requerimientos.length === 0 ? (
          <EmptySection
            title='Sin ordenes de requerimiento'
            subtitle='Cuando se emitan materiales para esta OT aparecerán aquí con su estado y seguimiento.'
          />
        ) : (
          requerimientos.map((orden) => (
            <RequirementCard
              key={orden.id}
              orden={orden}
              onChangeEstado={handleChangeRequirementState}
              onMarkItemSinStock={handleMarkRequirementItemSinStock}
              onConfirmarRecepcion={handleConfirmRequirementReceipt}
              isChanging={
                changeRequirementStateMut.isPending &&
                changeRequirementStateMut.variables?.id === orden.id
              }
              changingDetailId={changeRequirementStateMut.variables?.detalleId || null}
              isConfirming={
                confirmRequirementReceiptMut.isPending &&
                confirmRequirementReceiptMut.variables === orden.id
              }
            />
          ))
        )}

        <SectionHeader
          title='Actividades planificadas'
          count={planificadas.length}
          subtitle={
            canManagePlanned
              ? 'Plan de trabajo y materiales previstos para esta orden'
              : 'Vista referencial. Solo Jefe de Tecnicos y Jefe de Almaceneros pueden registrar o modificar el plan.'
          }
          action={
            canManagePlanned && !esFinalizado ? (
              <Pressable
                style={styles.primaryMiniButton}
                onPress={() => {
                  setIsPlanningActivity(true);
                  setShowActModal(true);
                }}
              >
                <Ionicons name='add' size={16} color={colors.white} />
                <Text style={styles.primaryMiniButtonText}>Agregar</Text>
              </Pressable>
            ) : null
          }
        />
        {!canManagePlanned ? (
          <AccessNote text='Esta seccion es solo de consulta. La gestion del plan le corresponde al jefe de tecnicos o al jefe de almaceneros.' />
        ) : null}
        {planificadas.length === 0 ? (
          <EmptySection
            title='Sin actividades planificadas'
            subtitle='Si fueron creadas desde web, las verás aquí como referencia del plan.'
          />
        ) : (
          planificadas.map((actividad) => (
            <ActivityCard
              key={actividad.id}
              actividad={actividad}
              readonly={plannedReadonly}
              onAddMovimiento={handleAddMovimiento}
            />
          ))
        )}

        <SectionHeader
          title='Actividades registradas'
          count={registradas.length}
          subtitle='Ejecución real realizada por el técnico'
          action={
            esEnProceso ? (
              <Pressable
                style={styles.primaryMiniButton}
                onPress={() => {
                  setIsPlanningActivity(false);
                  setShowActModal(true);
                }}
              >
                <Ionicons name='add' size={16} color={colors.white} />
                <Text style={styles.primaryMiniButtonText}>Agregar</Text>
              </Pressable>
            ) : null
          }
        />

        {registradas.length === 0 ? (
          <EmptySection
            title='Aún no registras actividades'
            subtitle={
              esEnProceso
                ? 'Empieza agregando la primera actividad ejecutada para documentar el trabajo.'
                : 'Las actividades registradas aparecerán aquí cuando la orden esté en ejecución.'
            }
          />
        ) : (
          registradas.map((actividad) => (
            <ActivityCard
              key={actividad.id}
              actividad={actividad}
              readonly={!esEnProceso}
              onAddMovimiento={handleAddMovimiento}
            />
          ))
        )}
      </ScrollView>

      {!esFinalizado ? (
        <View style={styles.bottomBar}>
          {esPendiente ? (
            <Pressable
              style={[styles.primaryButton, styles.startButton]}
              onPress={handleIniciarTrabajo}
              disabled={patchTrabajoMut.isPending}
            >
              {patchTrabajoMut.isPending ? (
                <ActivityIndicator size='small' color={colors.white} />
              ) : (
                <Ionicons name='play-circle-outline' size={18} color={colors.white} />
              )}
              <Text style={styles.primaryButtonText}>
                {patchTrabajoMut.isPending ? 'Iniciando...' : 'Iniciar trabajo'}
              </Text>
            </Pressable>
          ) : null}

          {esEnProceso ? (
            <Pressable style={[styles.primaryButton, styles.finishButton]} onPress={() => setShowFinModal(true)}>
              <Ionicons name='checkmark-done-outline' size={18} color={colors.white} />
              <Text style={styles.primaryButtonText}>Finalizar orden</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {showActModal ? (
        <ActividadFormModal
          trabajoId={trabajoId}
          esPlanificada={isPlanningActivity}
          onClose={() => {
            setShowActModal(false);
            setIsPlanningActivity(false);
          }}
        />
      ) : null}

      {showReqModal ? (
        <OrdenRequerimientoSheet
          visible={showReqModal}
          trabajoId={trabajoId}
          tecnicosIds={trabajo?.tecnicos || []}
          onClose={() => setShowReqModal(false)}
          onCreated={() => {
            setShowReqModal(false);
            Alert.alert('Requerimiento emitido', 'La orden de requerimiento ya aparece en esta OT.');
          }}
        />
      ) : null}

      {showFinModal ? (
        <FinalizarModal trabajo={trabajo} onClose={() => setShowFinModal(false)} />
      ) : null}

      {showEditSheet ? (
        <TrabajoFormSheet
          visible={showEditSheet}
          trabajo={trabajo}
          onClose={() => setShowEditSheet(false)}
          onSaved={() => {
            setShowEditSheet(false);
            Alert.alert(
              'Orden actualizada',
              'Los datos de la orden de trabajo se actualizaron correctamente.'
            );
          }}
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

function SectionHeader({ title, count, subtitle, action }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <View style={styles.sectionHeaderTop}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <View style={styles.counterPill}>
            <Text style={styles.counterPillText}>{count}</Text>
          </View>
        </View>
        <Text style={styles.sectionDescription}>{subtitle}</Text>
      </View>
      {action}
    </View>
  );
}

function MetricCard({ label, value, tone }) {
  const tones = {
    muted: { bg: colors.surfaceMuted, text: colors.textMuted },
    navy: { bg: colors.navySoft, text: colors.navy },
    lime: { bg: colors.limeSoft, text: '#5E7C1A' },
  };

  const current = tones[tone] || tones.muted;

  return (
    <View style={[styles.metricCard, { backgroundColor: current.bg }]}>
      <Text style={[styles.metricCardLabel, { color: current.text }]}>{label}</Text>
      <Text style={[styles.metricCardValue, { color: current.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
  heroHeader: {
    position: 'relative',
    overflow: 'hidden',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 22,
    backgroundColor: colors.navyDeep,
  },
  heroGlowLeft: {
    position: 'absolute',
    left: -32,
    top: -26,
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroGlowRight: {
    position: 'absolute',
    right: -18,
    bottom: -38,
    width: 130,
    height: 130,
    borderRadius: 999,
    backgroundColor: 'rgba(143,191,47,0.18)',
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  backButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  heroCode: {
    marginTop: 18,
    fontSize: 28,
    fontWeight: '800',
    color: colors.white,
  },
  heroMachine: {
    marginTop: 8,
    fontSize: 14,
    color: 'rgba(255,255,255,0.72)',
    fontWeight: '500',
  },
  heroPillsRow: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heroPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
  },
  summaryCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    ...shadows.card,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  summaryEditButton: {
    minHeight: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#CFE0FF',
    backgroundColor: colors.navySoft,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  summaryEditButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.navy,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  sectionMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSoft,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  metricCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    opacity: 0.8,
  },
  metricCardValue: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '800',
  },
  infoGrid: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navySoft,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: colors.textSoft,
  },
  infoValue: {
    marginTop: 3,
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
    fontWeight: '600',
  },
  closingBlock: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
    gap: 12,
  },
  closingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.md,
    backgroundColor: colors.greenSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  closingBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.green,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionDescription: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
  counterPill: {
    minWidth: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceStrong,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  counterPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
  },
  accessNote: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#CFE0FF',
    backgroundColor: colors.navySoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  accessNoteIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  accessNoteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: colors.navy,
    fontWeight: '600',
  },
  primaryMiniButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.navy,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  primaryMiniButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.white,
  },
  loadingInlineCard: {
    minHeight: 68,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 12,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...shadows.card,
  },
  loadingInlineText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  requirementCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    marginBottom: 12,
    ...shadows.card,
  },
  requirementHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  requirementTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  requirementCode: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy,
  },
  requirementMeta: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  requirementStatusBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  requirementStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  requirementNoteCard: {
    marginTop: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 12,
  },
  requirementNoteText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
  requirementItemsCard: {
    marginTop: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 12,
    gap: 10,
  },
  requirementItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  requirementItemDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.lime,
    marginTop: 6,
  },
  requirementItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  requirementItemMeta: {
    marginTop: 3,
    fontSize: 12,
    color: colors.textMuted,
  },
  requirementItemPill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.redSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  requirementItemPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.red,
  },
  requirementItemAction: {
    alignSelf: 'flex-start',
    marginTop: 8,
    minHeight: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#F0C3BB',
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  requirementItemActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.red,
  },
  requirementActions: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  requirementSecondaryAction: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#F0C3BB',
    backgroundColor: colors.redSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  requirementSecondaryActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.red,
  },
  requirementPrimaryAction: {
    flex: 1.2,
    minHeight: 46,
    borderRadius: radius.md,
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  requirementPrimaryActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.white,
  },
  requirementSuccessAction: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.md,
    backgroundColor: colors.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  requirementSuccessActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.white,
  },
  infoPill: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.navySoft,
    alignSelf: 'flex-start',
  },
  infoPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
  },
  successPill: {
    backgroundColor: colors.greenSoft,
  },
  successText: {
    color: colors.green,
  },
  warningPill: {
    backgroundColor: colors.redSoft,
  },
  warningText: {
    color: colors.red,
  },
  buttonDisabled: {
    opacity: 0.6,
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
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
  },
  activityCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    marginBottom: 12,
    ...shadows.card,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  activityIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIconMaintenance: {
    backgroundColor: colors.navySoft,
  },
  activityIconReview: {
    backgroundColor: colors.surfaceMuted,
  },
  activityType: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  activityMeta: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  inlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  inlinePillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  planPill: {
    backgroundColor: colors.limeSoft,
  },
  planPillText: {
    color: colors.green,
  },
  realPill: {
    backgroundColor: colors.navySoft,
  },
  realPillText: {
    color: colors.navy,
  },
  countPill: {
    backgroundColor: colors.surfaceMuted,
  },
  activityDescription: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
  },
  evidenceBlock: {
    marginTop: 14,
    gap: 10,
  },
  evidenceTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: colors.textSoft,
  },
  evidenceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  evidenceImage: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  materialBlock: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    gap: 10,
  },
  materialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  materialText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  activityActions: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    gap: 10,
  },
  secondaryAction: {
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
  },
  deleteAction: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#F3C5C0',
    backgroundColor: colors.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...shadows.floating,
  },
  startButton: {
    backgroundColor: colors.lime,
  },
  finishButton: {
    backgroundColor: colors.red,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.white,
  },
});
