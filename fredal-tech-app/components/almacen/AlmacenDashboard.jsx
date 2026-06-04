import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { itemAPI, ordenCompraAPI, ordenRequerimientoAPI } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { colors, radius, shadows } from '../../lib/theme';
import ItemLocationSheet from './ItemLocationSheet';
import OrdenCompraSheet from './OrdenCompraSheet';

const SECTION_OPTIONS = [
  { key: 'requerimientos', label: 'Requerimientos', icon: 'list-outline' },
  { key: 'ordenes-compra', label: 'Ordenes compra', icon: 'cart-outline' },
  { key: 'ubicaciones', label: 'Ubicaciones', icon: 'swap-horizontal-outline' },
];

const ORDER_FILTERS = [
  { key: 'TODAS', label: 'Todas' },
  { key: 'POR_REVISAR', label: 'Por revisar' },
  { key: 'ENTREGADO', label: 'Entregadas' },
  { key: 'SIN_STOCK', label: 'Sin stock' },
];

const PURCHASE_ORDER_FILTERS = [
  { key: 'TODAS', label: 'Todas' },
  { key: 'PENDIENTE', label: 'Pendientes' },
  { key: 'REVISADO', label: 'Revisadas' },
  { key: 'EN_PROCESO', label: 'En proceso' },
  { key: 'RECIBIDO', label: 'Recibidas' },
];

const LOCATION_VIEWS = [
  { key: 'almacen', label: 'Almacen', icon: 'archive-outline' },
  { key: 'tecnicos', label: 'Tecnicos', icon: 'people-outline' },
  { key: 'maquinaria', label: 'Maquinaria', icon: 'hammer-outline' },
];

const ITEM_TYPE_LABELS = {
  REPUESTO: 'Repuesto',
  CONSUMIBLE: 'Consumible',
};

const ORDER_STATUS_LABELS = {
  POR_REVISAR: 'Por revisar',
  ENTREGADO: 'Entregado',
  SIN_STOCK: 'Sin stock',
};

const ORDER_STATUS_STYLES = {
  POR_REVISAR: { bg: colors.amberSoft, text: colors.amber },
  ENTREGADO: { bg: colors.greenSoft, text: colors.green },
  SIN_STOCK: { bg: colors.redSoft, text: colors.red },
};

const PURCHASE_STATUS_LABELS = {
  PENDIENTE: 'Pendiente',
  REVISADO: 'Revisado',
  EN_PROCESO: 'En proceso',
  RECIBIDO: 'Recibido',
};

const PURCHASE_STATUS_STYLES = {
  PENDIENTE: { bg: colors.surfaceMuted, text: colors.textMuted },
  REVISADO: { bg: colors.amberSoft, text: colors.amber },
  EN_PROCESO: { bg: colors.navySoft, text: colors.navy },
  RECIBIDO: { bg: colors.greenSoft, text: colors.green },
};

const parseCollection = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.results)) return value.results;
  return [];
};

const formatNumber = (value, digits = 2) => {
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

const formatOrderUnit = (item) => {
  if (!item?.unidad_medida_nombre && !item?.unidad_medida_simbolo) return '';
  if (item.unidad_medida_nombre && item.unidad_medida_simbolo) {
    return `${item.unidad_medida_nombre} (${item.unidad_medida_simbolo})`;
  }
  return item.unidad_medida_nombre || item.unidad_medida_simbolo || '';
};

const getItemsSummary = (items = []) =>
  items
    .map((item) => `${item.item_codigo} - ${formatNumber(item.cantidad)}`)
    .join(', ');

export default function AlmacenDashboard() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeSection, setActiveSection] = useState('requerimientos');
  const [orderFilter, setOrderFilter] = useState('POR_REVISAR');
  const [purchaseFilter, setPurchaseFilter] = useState('TODAS');
  const [itemView, setItemView] = useState('almacen');
  const [orderQuery, setOrderQuery] = useState('');
  const [purchaseQuery, setPurchaseQuery] = useState('');
  const [itemQuery, setItemQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showPurchaseSheet, setShowPurchaseSheet] = useState(false);

  const firstName =
    user?.trabajador?.nombres?.split(' ')?.[0] ||
    user?.username ||
    'Almacen';

  const ordenesQuery = useQuery({
    queryKey: ['ordenes-requerimiento-mobile'],
    queryFn: async () => {
      const { data } = await ordenRequerimientoAPI.list();
      return parseCollection(data);
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  const ordenesCompraQuery = useQuery({
    queryKey: ['ordenes-compra-mobile'],
    queryFn: async () => {
      const { data } = await ordenCompraAPI.list();
      return parseCollection(data);
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  const itemsQuery = useQuery({
    queryKey: ['almacen-mobile-items', itemView],
    queryFn: async () => {
      const { data } = await itemAPI.list({ vista: itemView });
      return parseCollection(data);
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  const changeOrderState = useMutation({
    mutationFn: ({ id, estado, detalleId = null }) =>
      ordenRequerimientoAPI.cambiarEstado(id, estado, detalleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-requerimiento-mobile'] });
      queryClient.invalidateQueries({ queryKey: ['almacen-mobile-items'] });
    },
  });

  const confirmPurchaseReceipt = useMutation({
    mutationFn: (id) => ordenCompraAPI.confirmarRecepcion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordenes-compra-mobile'] });
    },
  });

  const ordenes = ordenesQuery.data || [];
  const ordenesCompra = ordenesCompraQuery.data || [];
  const items = itemsQuery.data || [];

  const orderStats = useMemo(
    () => ({
      porRevisar: ordenes.filter((orden) => orden.estado === 'POR_REVISAR').length,
      entregadas: ordenes.filter((orden) => orden.estado === 'ENTREGADO').length,
      pendientesTecnico: ordenes.filter((orden) => orden.pendiente_confirmacion_tecnico).length,
    }),
    [ordenes]
  );

  const purchaseStats = useMemo(
    () => ({
      pendientes: ordenesCompra.filter((orden) => orden.estado === 'PENDIENTE').length,
      enProceso: ordenesCompra.filter((orden) => orden.estado === 'EN_PROCESO').length,
      porConfirmar: ordenesCompra.filter((orden) => orden.pendiente_confirmacion_almacen).length,
    }),
    [ordenesCompra]
  );

  const locationStats = useMemo(
    () => ({
      total: items.length,
      repuestos: items.filter((item) => item.tipo_insumo === 'REPUESTO').length,
      consumibles: items.filter((item) => item.tipo_insumo === 'CONSUMIBLE').length,
    }),
    [items]
  );

  const filteredOrders = useMemo(() => {
    const needle = orderQuery.trim().toLowerCase();

    return ordenes
      .filter((orden) => (orderFilter === 'TODAS' ? true : orden.estado === orderFilter))
      .filter((orden) => {
        if (!needle) return true;

        const haystack = [
          orden.codigo,
          orden.trabajo_codigo,
          orden.tecnico_asignado_nombre,
          orden.observaciones,
          getItemsSummary(orden.items),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(needle);
      });
  }, [ordenes, orderFilter, orderQuery]);

  const filteredPurchaseOrders = useMemo(() => {
    const needle = purchaseQuery.trim().toLowerCase();

    return ordenesCompra
      .filter((orden) => (purchaseFilter === 'TODAS' ? true : orden.estado === purchaseFilter))
      .filter((orden) => {
        if (!needle) return true;

        const haystack = [
          orden.codigo,
          orden.emitido_por_nombre,
          orden.observaciones,
          getItemsSummary(orden.items),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(needle);
      });
  }, [ordenesCompra, purchaseFilter, purchaseQuery]);

  const filteredItems = useMemo(() => {
    const needle = itemQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (!needle) return true;

      const haystack = [
        item.codigo,
        item.nombre,
        ITEM_TYPE_LABELS[item.tipo_insumo],
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [items, itemQuery]);

  const heroSubtitle = useMemo(() => {
    if (activeSection === 'ordenes-compra') {
      return 'Emite ordenes de compra desde almacen y sigue el avance de compras hasta la recepcion final.';
    }
    if (activeSection === 'ubicaciones') {
      return 'Consulta stock por ubicacion y mueve items de forma simple para mantener la trazabilidad al dia.';
    }
    return 'Sigue las ordenes de requerimiento y valida las entregas del dia con contexto operativo.';
  }, [activeSection]);

  const heroCards = useMemo(() => {
    if (activeSection === 'ordenes-compra') {
      return [
        { label: 'Pendientes', value: purchaseStats.pendientes, icon: 'time-outline', tone: 'amber' },
        { label: 'En proceso', value: purchaseStats.enProceso, icon: 'sync-outline', tone: 'navy' },
        { label: 'Por confirmar', value: purchaseStats.porConfirmar, icon: 'checkmark-circle-outline', tone: 'lime' },
      ];
    }

    if (activeSection === 'ubicaciones') {
      return [
        { label: 'Total items', value: locationStats.total, icon: 'cube-outline', tone: 'navy' },
        { label: 'Repuestos', value: locationStats.repuestos, icon: 'cog-outline', tone: 'amber' },
        { label: 'Consumibles', value: locationStats.consumibles, icon: 'flask-outline', tone: 'lime' },
      ];
    }

    return [
      { label: 'Por revisar', value: orderStats.porRevisar, icon: 'time-outline', tone: 'amber' },
      { label: 'Entregadas', value: orderStats.entregadas, icon: 'checkmark-done-outline', tone: 'lime' },
      { label: 'Pend. tecnico', value: orderStats.pendientesTecnico, icon: 'shield-checkmark-outline', tone: 'navy' },
    ];
  }, [activeSection, locationStats, orderStats, purchaseStats]);

  const handleRefresh = () => {
    Promise.all([
      ordenesQuery.refetch(),
      ordenesCompraQuery.refetch(),
      itemsQuery.refetch(),
    ]);
  };

  const handleChangeOrderState = (orden, estado) => {
    const actionLabel =
      estado === 'ENTREGADO' ? 'marcar como entregada' : 'marcar sin stock';

    Alert.alert(
      'Actualizar orden',
      `Se registrara ${orden.codigo} como ${ORDER_STATUS_LABELS[estado].toLowerCase()}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () =>
            changeOrderState.mutate(
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

  const handleMarkOrderItemSinStock = (orden, item) => {
    Alert.alert(
      'Marcar item sin stock',
      `Se registrara ${item.item_codigo} como sin stock dentro de ${orden.codigo}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () =>
            changeOrderState.mutate(
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

  const handleConfirmPurchaseReceipt = (orden) => {
    Alert.alert(
      'Confirmar recepcion',
      `Se registrara ${orden.codigo} como recibida en almacen.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () =>
            confirmPurchaseReceipt.mutate(orden.id, {
              onError: (err) => {
                Alert.alert(
                  'No se pudo confirmar',
                  err?.response?.data?.detail ||
                    'No se pudo confirmar la recepcion de la orden.'
                );
              },
            }),
        },
      ]
    );
  };

  const isRefreshing =
    (ordenesQuery.isFetching && !ordenesQuery.isLoading) ||
    (ordenesCompraQuery.isFetching && !ordenesCompraQuery.isLoading) ||
    (itemsQuery.isFetching && !itemsQuery.isLoading);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style='light' />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.navy}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroGlowLeft} />
          <View style={styles.heroGlowRight} />

          <View style={styles.heroChip}>
            <Ionicons name='cube-outline' size={15} color={colors.navy} />
            <Text style={styles.heroChipText}>Panel movil de almacen</Text>
          </View>

          <Text style={styles.heroGreeting}>Hola, {firstName}</Text>
          <Text style={styles.heroTitle}>Control rapido del almacen</Text>
          <Text style={styles.heroSubtitle}>{heroSubtitle}</Text>

          <View style={styles.statsRow}>
            {heroCards.map((card) => (
              <StatCard
                key={card.label}
                label={card.label}
                value={card.value}
                icon={card.icon}
                tone={card.tone}
              />
            ))}
          </View>
        </View>

        <View style={styles.segmentCard}>
          <Text style={styles.sectionTitle}>Flujo de trabajo</Text>
          <View style={styles.segmentRow}>
            {SECTION_OPTIONS.map((section) => {
              const active = activeSection === section.key;
              return (
                <Pressable
                  key={section.key}
                  style={[styles.segmentButton, active ? styles.segmentButtonActive : null]}
                  onPress={() => setActiveSection(section.key)}
                >
                  <Ionicons
                    name={section.icon}
                    size={18}
                    color={active ? colors.navy : colors.textSoft}
                  />
                  <Text
                    style={[
                      styles.segmentButtonText,
                      active ? styles.segmentButtonTextActive : null,
                    ]}
                  >
                    {section.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {activeSection === 'requerimientos' ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ordenes emitidas</Text>
              <Text style={styles.sectionMeta}>
                {filteredOrders.length} {filteredOrders.length === 1 ? 'orden' : 'ordenes'}
              </Text>
            </View>

            <SearchBar
              value={orderQuery}
              onChangeText={setOrderQuery}
              placeholder='Buscar por codigo, trabajo o tecnico'
            />

            <View style={styles.filterWrap}>
              {ORDER_FILTERS.map((filter) => {
                const active = orderFilter === filter.key;
                return (
                  <Pressable
                    key={filter.key}
                    style={[styles.filterChip, active ? styles.filterChipActive : null]}
                    onPress={() => setOrderFilter(filter.key)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        active ? styles.filterChipTextActive : null,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {ordenesQuery.isLoading ? (
              <LoadingBlock text='Cargando ordenes de requerimiento...' />
            ) : filteredOrders.length ? (
              filteredOrders.map((orden) => {
                const isWorking =
                  changeOrderState.isPending &&
                  changeOrderState.variables?.id === orden.id;
                const canMarkDelivered = Boolean(orden.puede_marcar_entregado);

                return (
                  <View key={orden.id} style={styles.orderCard}>
                    <View style={styles.orderHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.orderCodeRow}>
                          <Text style={styles.orderCode}>{orden.codigo}</Text>
                          <RequerimientoStatusBadge status={orden.estado} />
                        </View>
                        <Text style={styles.orderMeta}>
                          Trabajo {orden.trabajo_codigo} - Emitida {formatDate(orden.created_at)}
                        </Text>
                        <Text style={styles.orderMeta}>
                          Tecnico: {orden.tecnico_asignado_nombre || 'Sin asignar'}
                        </Text>
                      </View>
                    </View>

                    {orden.pendiente_confirmacion_tecnico ? (
                      <View style={styles.infoPill}>
                        <Ionicons name='hourglass-outline' size={14} color={colors.navy} />
                        <Text style={styles.infoPillText}>
                          Pendiente de confirmacion del tecnico
                        </Text>
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
                      <View style={styles.noteCard}>
                        <Text style={styles.noteText}>{orden.observaciones}</Text>
                      </View>
                    ) : null}

                    <View style={styles.itemsCard}>
                      {(orden.items || []).map((item) => (
                        <View key={item.id} style={styles.orderItemRow}>
                          <View style={styles.orderItemDot} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.orderItemTitle}>
                              {item.item_codigo} - {item.item_nombre}
                            </Text>
                            <Text style={styles.orderItemMeta}>
                              {formatNumber(item.cantidad)}
                              {formatOrderUnit(item) ? ` ${formatOrderUnit(item)}` : ''} -{' '}
                              {ITEM_TYPE_LABELS[item.item_tipo_insumo] || item.item_tipo_insumo}
                            </Text>
                            {item.sin_stock ? (
                              <View style={styles.orderItemPill}>
                                <Ionicons name='close-circle-outline' size={12} color={colors.red} />
                                <Text style={styles.orderItemPillText}>Sin stock</Text>
                              </View>
                            ) : null}
                            {item.puede_marcar_sin_stock ? (
                              <Pressable
                                style={[
                                  styles.inlineDangerAction,
                                  isWorking && changeOrderState.variables?.detalleId === item.id
                                    ? styles.buttonDisabled
                                    : null,
                                ]}
                                onPress={() => handleMarkOrderItemSinStock(orden, item)}
                                disabled={isWorking}
                              >
                                {isWorking && changeOrderState.variables?.detalleId === item.id ? (
                                  <ActivityIndicator size='small' color={colors.red} />
                                ) : (
                                  <Ionicons name='close-circle-outline' size={14} color={colors.red} />
                                )}
                                <Text style={styles.inlineDangerActionText}>Marcar sin stock</Text>
                              </Pressable>
                            ) : null}
                          </View>
                        </View>
                      ))}
                    </View>

                    {canMarkDelivered ? (
                      <View style={styles.actionsRow}>
                        <Pressable
                          style={[
                            styles.primaryAction,
                            isWorking ? styles.buttonDisabled : null,
                          ]}
                          onPress={() => handleChangeOrderState(orden, 'ENTREGADO')}
                          disabled={isWorking}
                        >
                          {isWorking && !changeOrderState.variables?.detalleId ? (
                            <ActivityIndicator size='small' color={colors.white} />
                          ) : (
                            <Ionicons name='checkmark-done-outline' size={16} color={colors.white} />
                          )}
                          <Text style={styles.primaryActionText}>Marcar entregado</Text>
                        </Pressable>
                      </View>
                    ) : null}

                    {!orden.tecnico_asignado && orden.estado !== 'ENTREGADO' ? (
                      <Text style={styles.helperText}>
                        Esta orden aun no tiene tecnico asignado, por eso no puede marcarse como entregada.
                      </Text>
                    ) : null}
                  </View>
                );
              })
            ) : (
              <EmptyCard
                icon='document-text-outline'
                title='No hay ordenes en esta vista'
                text='Prueba con otro filtro o espera nuevas ordenes emitidas desde trabajos.'
              />
            )}
          </>
        ) : activeSection === 'ordenes-compra' ? (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderGroup}>
                <Text style={styles.sectionTitle}>Ordenes de compra</Text>
                <Text style={styles.sectionMeta}>
                  {filteredPurchaseOrders.length}{' '}
                  {filteredPurchaseOrders.length === 1 ? 'orden' : 'ordenes'}
                </Text>
              </View>

              <SectionActionButton
                label='Emitir orden'
                icon='add'
                onPress={() => setShowPurchaseSheet(true)}
              />
            </View>

            <SearchBar
              value={purchaseQuery}
              onChangeText={setPurchaseQuery}
              placeholder='Buscar por codigo, emisor o item'
            />

            <View style={styles.filterWrap}>
              {PURCHASE_ORDER_FILTERS.map((filter) => {
                const active = purchaseFilter === filter.key;
                return (
                  <Pressable
                    key={filter.key}
                    style={[styles.filterChip, active ? styles.filterChipActive : null]}
                    onPress={() => setPurchaseFilter(filter.key)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        active ? styles.filterChipTextActive : null,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {ordenesCompraQuery.isLoading ? (
              <LoadingBlock text='Cargando ordenes de compra...' />
            ) : filteredPurchaseOrders.length ? (
              filteredPurchaseOrders.map((orden) => {
                const isConfirming =
                  confirmPurchaseReceipt.isPending &&
                  confirmPurchaseReceipt.variables === orden.id;

                return (
                  <View key={orden.id} style={styles.orderCard}>
                    <View style={styles.orderHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.orderCodeRow}>
                          <Text style={styles.orderCode}>{orden.codigo}</Text>
                          <PurchaseStatusBadge status={orden.estado} />
                        </View>
                        <Text style={styles.orderMeta}>
                          Emitida por {orden.emitido_por_nombre || 'Sistema'} - {formatDate(orden.created_at)}
                        </Text>
                        <Text style={styles.orderMeta}>
                          {orden.items?.length || 0} {(orden.items?.length || 0) === 1 ? 'item' : 'items'}
                        </Text>
                      </View>
                    </View>

                    {orden.pendiente_confirmacion_almacen ? (
                      <View style={styles.infoPill}>
                        <Ionicons name='hourglass-outline' size={14} color={colors.navy} />
                        <Text style={styles.infoPillText}>
                          Pendiente de confirmacion en almacen
                        </Text>
                      </View>
                    ) : null}

                    {orden.recepcion_confirmada ? (
                      <View style={[styles.infoPill, styles.successPill]}>
                        <Ionicons name='checkmark-circle-outline' size={14} color={colors.green} />
                        <Text style={[styles.infoPillText, styles.successText]}>
                          Recepcion confirmada en almacen
                        </Text>
                      </View>
                    ) : null}

                    {orden.observaciones ? (
                      <View style={styles.noteCard}>
                        <Text style={styles.noteText}>{orden.observaciones}</Text>
                      </View>
                    ) : null}

                    <View style={styles.itemsCard}>
                      {(orden.items || []).map((item) => (
                        <View key={item.id} style={styles.orderItemRow}>
                          <View style={styles.orderItemDot} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.orderItemTitle}>
                              {item.item_codigo} - {item.item_nombre}
                            </Text>
                            <Text style={styles.orderItemMeta}>
                              {formatNumber(item.cantidad)}
                              {item.proveedor_nombre ? ` - ${item.proveedor_nombre}` : ''}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>

                    {orden.puede_confirmar_recepcion ? (
                      <View style={styles.actionsRow}>
                        <Pressable
                          style={[styles.successAction, isConfirming ? styles.buttonDisabled : null]}
                          onPress={() => handleConfirmPurchaseReceipt(orden)}
                          disabled={isConfirming}
                        >
                          {isConfirming ? (
                            <ActivityIndicator size='small' color={colors.white} />
                          ) : (
                            <Ionicons name='checkmark-circle-outline' size={16} color={colors.white} />
                          )}
                          <Text style={styles.successActionText}>Confirmar recepcion</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Text style={styles.helperText}>
                        Compras actualiza el avance de la orden. Desde almacen puedes seguir el estado y confirmar la recepcion final.
                      </Text>
                    )}
                  </View>
                );
              })
            ) : (
              <EmptyCard
                icon='cart-outline'
                title='No hay ordenes de compra'
                text='Emite una nueva orden desde almacen o revisa otro filtro para ver el estado actual.'
              />
            )}
          </>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ubicaciones por vista</Text>
              <Text style={styles.sectionMeta}>
                {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
              </Text>
            </View>

            <SearchBar
              value={itemQuery}
              onChangeText={setItemQuery}
              placeholder='Buscar item por codigo o nombre'
            />

            <View style={styles.filterWrap}>
              {LOCATION_VIEWS.map((view) => {
                const active = itemView === view.key;
                return (
                  <Pressable
                    key={view.key}
                    style={[styles.filterChip, active ? styles.filterChipActive : null]}
                    onPress={() => setItemView(view.key)}
                  >
                    <Ionicons
                      name={view.icon}
                      size={15}
                      color={active ? colors.navy : colors.textSoft}
                    />
                    <Text
                      style={[
                        styles.filterChipText,
                        active ? styles.filterChipTextActive : null,
                      ]}
                    >
                      {view.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {itemsQuery.isLoading ? (
              <LoadingBlock text='Cargando items de la vista seleccionada...' />
            ) : filteredItems.length ? (
              filteredItems.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.itemCard}
                  onPress={() => setSelectedItem(item)}
                >
                  <View style={styles.itemHeader}>
                    <View
                      style={[
                        styles.itemIconWrap,
                        item.tipo_insumo === 'CONSUMIBLE' ? styles.itemIconConsumible : null,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={item.tipo_insumo === 'CONSUMIBLE' ? 'flask-outline' : 'cog-outline'}
                        size={20}
                        color={item.tipo_insumo === 'CONSUMIBLE' ? colors.green : colors.navy}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemCode}>{item.codigo}</Text>
                      <Text style={styles.itemName}>{item.nombre}</Text>
                      <Text style={styles.itemMeta}>
                        {ITEM_TYPE_LABELS[item.tipo_insumo] || item.tipo_insumo}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.itemFooter}>
                    <View>
                      <Text style={styles.stockLabel}>Cantidad en la vista</Text>
                      <Text style={styles.stockValue}>
                        {formatNumber(item.stock)}
                        {item.unidad_medida_detalle?.simbolo
                          ? ` ${item.unidad_medida_detalle.simbolo}`
                          : ''}
                      </Text>
                    </View>

                    <View style={styles.inlineButton}>
                      <Ionicons name='swap-horizontal-outline' size={16} color={colors.navy} />
                      <Text style={styles.inlineButtonText}>Mover</Text>
                    </View>
                  </View>
                </Pressable>
              ))
            ) : (
              <EmptyCard
                icon='cube-outline'
                title='No hay items en esta vista'
                text='Cuando existan registros activos en esta ubicacion apareceran aqui con su cantidad contextual.'
              />
            )}
          </>
        )}
      </ScrollView>

      <ItemLocationSheet
        visible={Boolean(selectedItem)}
        item={selectedItem}
        viewKey={itemView}
        onClose={() => setSelectedItem(null)}
      />

      <OrdenCompraSheet
        visible={showPurchaseSheet}
        onClose={() => setShowPurchaseSheet(false)}
        onCreated={() => {
          setShowPurchaseSheet(false);
          Alert.alert('Orden emitida', 'La orden de compra ya aparece en el tablero de almacen.');
        }}
      />
    </SafeAreaView>
  );
}

function SearchBar({ value, onChangeText, placeholder }) {
  return (
    <View style={styles.searchWrap}>
      <Ionicons name='search-outline' size={18} color={colors.textSoft} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSoft}
        style={styles.searchInput}
      />
    </View>
  );
}

function StatCard({ label, value, icon, tone }) {
  const tones = {
    navy: { bg: colors.navySoft, text: colors.navy },
    amber: { bg: colors.amberSoft, text: colors.amber },
    lime: { bg: colors.limeSoft, text: colors.green },
  };

  const current = tones[tone] || tones.navy;

  return (
    <View style={[styles.statCard, { backgroundColor: current.bg }]}>
      <Ionicons name={icon} size={18} color={current.text} />
      <Text style={[styles.statValue, { color: current.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: current.text }]}>{label}</Text>
    </View>
  );
}

function SectionActionButton({ label, icon, onPress }) {
  return (
    <Pressable style={styles.sectionAction} onPress={onPress}>
      <Ionicons name={icon} size={16} color={colors.navy} />
      <Text style={styles.sectionActionText}>{label}</Text>
    </Pressable>
  );
}

function RequerimientoStatusBadge({ status }) {
  const current = ORDER_STATUS_STYLES[status] || ORDER_STATUS_STYLES.POR_REVISAR;
  return (
    <View style={[styles.statusBadge, { backgroundColor: current.bg }]}>
      <Text style={[styles.statusBadgeText, { color: current.text }]}>
        {ORDER_STATUS_LABELS[status] || status}
      </Text>
    </View>
  );
}

function PurchaseStatusBadge({ status }) {
  const current = PURCHASE_STATUS_STYLES[status] || PURCHASE_STATUS_STYLES.PENDIENTE;
  return (
    <View style={[styles.statusBadge, { backgroundColor: current.bg }]}>
      <Text style={[styles.statusBadgeText, { color: current.text }]}>
        {PURCHASE_STATUS_LABELS[status] || status}
      </Text>
    </View>
  );
}

function EmptyCard({ icon, title, text }) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={icon} size={28} color={colors.textSoft} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function LoadingBlock({ text }) {
  return (
    <View style={styles.loadingBlock}>
      <ActivityIndicator size='large' color={colors.navy} />
      <Text style={styles.loadingText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 122,
  },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 30,
    padding: 20,
    backgroundColor: colors.navyDeep,
    ...shadows.floating,
  },
  heroGlowLeft: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -40,
    left: -40,
  },
  heroGlowRight: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: 'rgba(143,191,47,0.18)',
    bottom: -30,
    right: -20,
  },
  heroChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
  heroChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
  },
  heroGreeting: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.72)',
  },
  heroTitle: {
    marginTop: 6,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    color: colors.white,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.72)',
  },
  statsRow: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    minWidth: '30%',
    flex: 1,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  statValue: {
    marginTop: 10,
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.85,
  },
  segmentCard: {
    marginTop: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    ...shadows.card,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  sectionMeta: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  segmentRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  segmentButton: {
    flex: 1,
    minHeight: 58,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  segmentButtonActive: {
    borderColor: '#BED2FF',
    backgroundColor: colors.navySoft,
  },
  segmentButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSoft,
    textAlign: 'center',
  },
  segmentButtonTextActive: {
    color: colors.navy,
  },
  sectionHeader: {
    marginTop: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionHeaderGroup: {
    flex: 1,
    gap: 2,
  },
  sectionAction: {
    minHeight: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#BED2FF',
    backgroundColor: colors.navySoft,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sectionActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.navy,
  },
  searchWrap: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    ...shadows.soft,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 14,
  },
  filterWrap: {
    marginTop: 12,
    marginBottom: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    minHeight: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  filterChipActive: {
    borderColor: '#BED2FF',
    backgroundColor: colors.navySoft,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  filterChipTextActive: {
    color: colors.navy,
  },
  loadingBlock: {
    paddingVertical: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
  orderCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    marginBottom: 12,
    ...shadows.card,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  orderCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  orderCode: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.navy,
  },
  statusBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  orderMeta: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  infoPill: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.navySoft,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  successPill: {
    backgroundColor: colors.greenSoft,
  },
  infoPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
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
  noteCard: {
    marginTop: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 12,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
  itemsCard: {
    marginTop: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 12,
    gap: 10,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  orderItemDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.lime,
    marginTop: 6,
  },
  orderItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  orderItemMeta: {
    marginTop: 3,
    fontSize: 12,
    color: colors.textMuted,
  },
  orderItemPill: {
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
  orderItemPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.red,
  },
  inlineDangerAction: {
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
  inlineDangerActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.red,
  },
  actionsRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  secondaryAction: {
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
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.red,
  },
  primaryAction: {
    flex: 1.35,
    minHeight: 46,
    borderRadius: radius.md,
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.white,
  },
  successAction: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.md,
    backgroundColor: colors.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  successActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.white,
  },
  helperText: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSoft,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  itemCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    marginBottom: 12,
    ...shadows.card,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  itemIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navySoft,
  },
  itemIconConsumible: {
    backgroundColor: colors.greenSoft,
  },
  itemCode: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy,
  },
  itemName: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  itemMeta: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  itemFooter: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  stockLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textSoft,
    fontWeight: '700',
  },
  stockValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  inlineButton: {
    minHeight: 42,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#CFE0FF',
    backgroundColor: colors.white,
    paddingHorizontal: 14,
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
  buttonDisabled: {
    opacity: 0.6,
  },
  emptyCard: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 24,
    paddingVertical: 32,
    ...shadows.card,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
