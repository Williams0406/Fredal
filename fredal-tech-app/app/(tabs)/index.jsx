import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useTrabajos } from '../../hooks/useTrabajos';
import TrabajoCard from '../../components/trabajos/TrabajoCard';
import { useAuthStore } from '../../store/authStore';
import { colors, formatStatusLabel, getStatusPalette, radius, shadows } from '../../lib/theme';

const TABS = [
  { key: 'PENDIENTE', label: 'Pendientes', icon: 'time-outline' },
  { key: 'EN_PROCESO', label: 'En curso', icon: 'construct-outline' },
  { key: 'FINALIZADO', label: 'Cerradas', icon: 'checkmark-done-outline' },
];

export default function TrabajosScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('EN_PROCESO');
  const [query, setQuery] = useState('');
  const { data: trabajos = [], isLoading, refetch, isFetching } = useTrabajos();

  const summary = useMemo(() => {
    const pendientes = trabajos.filter((trabajo) => trabajo.estatus === 'PENDIENTE').length;
    const enProceso = trabajos.filter((trabajo) => trabajo.estatus === 'EN_PROCESO').length;
    const finalizados = trabajos.filter((trabajo) => trabajo.estatus === 'FINALIZADO').length;
    const urgentes = trabajos.filter(
      (trabajo) => trabajo.prioridad === 'URGENTE' || trabajo.prioridad === 'EMERGENCIA'
    ).length;

    return { pendientes, enProceso, finalizados, urgentes };
  }, [trabajos]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return trabajos
      .filter((trabajo) => trabajo.estatus === activeTab)
      .filter((trabajo) => {
        if (!needle) return true;
        const haystack = [
          trabajo.codigo_orden,
          trabajo.maquinaria_nombre,
          trabajo.maquinaria_codigo,
          trabajo.ubicacion_detalle,
          trabajo.prioridad,
          trabajo.lugar,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(needle);
      });
  }, [trabajos, activeTab, query]);

  const currentStatus = getStatusPalette(activeTab);
  const firstName =
    user?.trabajador?.nombres?.split(' ')?.[0] ||
    user?.username ||
    'Técnico';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style='light' />

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TrabajoCard trabajo={item} onPress={() => router.push(`/trabajos/${item.id}`)} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={refetch}
            tintColor={colors.navy}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <View style={styles.hero}>
              <View style={styles.heroGlowLeft} />
              <View style={styles.heroGlowRight} />

              <View style={styles.heroTopRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.heroChip}>
                    <Ionicons name='flash-outline' size={15} color={colors.navy} />
                    <Text style={styles.heroChipText}>Vista operativa móvil</Text>
                  </View>

                  <Text style={styles.heroGreeting}>Hola, {firstName}</Text>
                  <Text style={styles.heroTitle}>Tus órdenes de trabajo</Text>
                  <Text style={styles.heroSubtitle}>
                    Seguimiento claro de lo pendiente, lo que está en curso y lo que ya cerraste.
                  </Text>
                </View>
              </View>

              <View style={styles.searchWrap}>
                <Ionicons name='search-outline' size={18} color={colors.textSoft} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder='Buscar por OT, máquina o ubicación'
                  placeholderTextColor={colors.textSoft}
                  style={styles.searchInput}
                />
              </View>

              <View style={styles.statsRow}>
                <StatCard label='Total' value={trabajos.length} tone='navy' icon='clipboard-outline' />
                <StatCard label='Urgentes' value={summary.urgentes} tone='amber' icon='alert-circle-outline' />
                <StatCard label='En curso' value={summary.enProceso} tone='navy' icon='build-outline' />
                <StatCard label='Cerradas' value={summary.finalizados} tone='lime' icon='checkmark-done-outline' />
              </View>
            </View>

            <View style={styles.segmentCard}>
              <View style={styles.segmentHeader}>
                <Text style={styles.sectionTitle}>Estado de las órdenes</Text>
                <Text style={[styles.sectionMeta, { color: currentStatus.text }]}>
                  {formatStatusLabel(activeTab)}
                </Text>
              </View>

              <View style={styles.segmentRow}>
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.key;
                  const palette = getStatusPalette(tab.key);
                  const count = trabajos.filter((trabajo) => trabajo.estatus === tab.key).length;

                  return (
                    <View key={tab.key} style={styles.segmentCell}>
                      <Pressable
                        style={[
                          styles.segmentButton,
                          isActive
                            ? { backgroundColor: palette.bg, borderColor: palette.accent }
                            : null,
                        ]}
                        onPress={() => setActiveTab(tab.key)}
                      >
                        <Ionicons
                          name={tab.icon}
                          size={18}
                          color={isActive ? palette.text : colors.textSoft}
                        />
                        <Text style={[styles.segmentLabel, isActive ? { color: palette.text } : null]}>
                          {tab.label}
                        </Text>
                        <Text
                          style={[
                            styles.segmentCount,
                            isActive
                              ? { color: palette.text, backgroundColor: colors.white }
                              : null,
                          ]}
                        >
                          {count}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.listHeading}>
              <Text style={styles.sectionTitle}>Resultado actual</Text>
              <Text style={styles.sectionMeta}>
                {filtered.length} {filtered.length === 1 ? 'orden' : 'órdenes'}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingBlock}>
              <ActivityIndicator size='large' color={colors.navy} />
              <Text style={styles.loadingText}>Cargando tu tablero...</Text>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name='documents-outline' size={28} color={colors.textSoft} />
              </View>
              <Text style={styles.emptyTitle}>Sin órdenes en esta vista</Text>
              <Text style={styles.emptyText}>
                {query
                  ? 'Prueba con otra búsqueda o cambia el estado seleccionado.'
                  : 'Cuando tengas órdenes en este estado aparecerán aquí con contexto operativo.'}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingBottom: 122,
  },
  headerBlock: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
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
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
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
  searchWrap: {
    marginTop: 18,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 14,
  },
  statsRow: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    minWidth: '47%',
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
  segmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
    flexDirection: 'row',
    gap: 8,
  },
  segmentCell: {
    flex: 1,
  },
  segmentButton: {
    minHeight: 88,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 8,
  },
  segmentLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.textMuted,
    textAlign: 'center',
  },
  segmentCount: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    textAlign: 'center',
    backgroundColor: colors.surfaceStrong,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  listHeading: {
    marginTop: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
