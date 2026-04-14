import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  colors,
  formatStatusLabel,
  getPriorityPalette,
  getStatusPalette,
  radius,
  shadows,
} from '../../lib/theme';

const prettyLabel = (value = '') =>
  value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export default function TrabajoCard({ trabajo, onPress }) {
  const prioridad = getPriorityPalette(trabajo.prioridad);
  const estatus = getStatusPalette(trabajo.estatus);

  const actividades = trabajo.actividades || [];
  const tecnicosCount = Array.isArray(trabajo.tecnicos) ? trabajo.tecnicos.length : 0;
  const tiposActividad = [...new Set(actividades.map((actividad) => actividad.tipo_actividad).filter(Boolean))];
  const tiposMantenimiento = [...new Set(actividades.map((actividad) => actividad.tipo_mantenimiento).filter(Boolean))];
  const itemsAsignados = [
    ...new Set(
      actividades
        .flatMap((actividad) => [
          ...(actividad.repuestos || []).map((item) => item.item_nombre),
          ...(actividad.consumibles || []).map((item) => item.item_nombre),
        ])
        .filter(Boolean)
    ),
  ];

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.accentBar, { backgroundColor: estatus.accent }]} />

      <View style={styles.headerRow}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={styles.eyebrow}>Orden de trabajo</Text>
          <Text style={styles.code}>{trabajo.codigo_orden}</Text>
          <Text style={styles.machine} numberOfLines={1}>
            {trabajo.maquinaria_codigo ? `${trabajo.maquinaria_codigo} · ` : ''}
            {trabajo.maquinaria_nombre || 'Maquinaria no disponible'}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <View style={[styles.pill, { backgroundColor: prioridad.bg }]}>
            <Ionicons name='alert-circle-outline' size={13} color={prioridad.icon} />
            <Text style={[styles.pillText, { color: prioridad.text }]}>{trabajo.prioridad}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: estatus.bg }]}>
            <Text style={[styles.pillText, { color: estatus.text }]}>{formatStatusLabel(trabajo.estatus)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.metaGrid}>
        <MetaItem icon='calendar-outline' value={trabajo.fecha ? new Date(trabajo.fecha).toLocaleDateString('es-PE') : 'Sin fecha'} />
        <MetaItem icon='location-outline' value={trabajo.lugar === 'CAMPO' ? 'Campo' : 'Taller'} />
        <MetaItem icon='people-outline' value={`${tecnicosCount} técnico${tecnicosCount === 1 ? '' : 's'}`} />
        <MetaItem icon='cube-outline' value={`${itemsAsignados.length} ítem${itemsAsignados.length === 1 ? '' : 's'}`} />
      </View>

      {(tiposActividad.length > 0 || tiposMantenimiento.length > 0 || itemsAsignados.length > 0) ? (
        <View style={styles.detailBlock}>
          {tiposActividad.length > 0 ? (
            <View style={styles.inlineRow}>
              <Ionicons name='list-outline' size={16} color={colors.textSoft} />
              <View style={styles.badgeWrap}>
                {tiposActividad.slice(0, 2).map((tipo) => (
                  <View key={tipo} style={styles.smallBadge}>
                    <Text style={styles.smallBadgeText}>
                      {tipo === 'MANTENIMIENTO' ? 'Mantenimiento' : 'Revisión'}
                    </Text>
                  </View>
                ))}
                {tiposActividad.length > 2 ? (
                  <View style={[styles.smallBadge, { backgroundColor: colors.surfaceMuted }]}>
                    <Text style={[styles.smallBadgeText, { color: colors.textMuted }]}>
                      +{tiposActividad.length - 2}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          {tiposMantenimiento.length > 0 ? (
            <View style={styles.inlineRow}>
              <MaterialCommunityIcons name='wrench-outline' size={16} color={colors.textSoft} />
              <Text style={styles.inlineText} numberOfLines={1}>
                {tiposMantenimiento.map(prettyLabel).join(', ')}
              </Text>
            </View>
          ) : null}

          {itemsAsignados.length > 0 ? (
            <View style={styles.inlineRow}>
              <Ionicons name='cube-outline' size={16} color={colors.textSoft} />
              <Text style={styles.inlineText} numberOfLines={1}>
                {itemsAsignados.slice(0, 2).join(', ')}
                {itemsAsignados.length > 2 ? ` +${itemsAsignados.length - 2}` : ''}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Abrir ficha operativa</Text>
        <Ionicons name='arrow-forward' size={16} color={colors.navy} />
      </View>
    </Pressable>
  );
}

function MetaItem({ icon, value }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={14} color={colors.textSoft} />
      <Text style={styles.metaValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    ...shadows.card,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 18,
    bottom: 18,
    width: 4,
    borderTopRightRadius: radius.pill,
    borderBottomRightRadius: radius.pill,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.textSoft,
  },
  code: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  machine: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  metaGrid: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
    columnGap: 10,
  },
  metaItem: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  metaValue: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  detailBlock: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
    gap: 10,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  smallBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.navySoft,
  },
  smallBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.navy,
  },
  inlineText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  footerRow: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
  },
});
