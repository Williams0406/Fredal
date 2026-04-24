import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { colors, radius, shadows } from '../../lib/theme';

export default function MiPerfilScreen() {
  const { user, logout } = useAuthStore();
  const insets = useSafeAreaInsets();

  const displayName = user?.trabajador
    ? `${user.trabajador.nombres} ${user.trabajador.apellidos}`
    : user?.username || 'Usuario';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style='light' />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 110 + insets.bottom },
        ]}
      >
        <View style={styles.hero}>
          <View style={styles.heroGlowLeft} />
          <View style={styles.heroGlowRight} />

          <Text style={styles.heroEyebrow}>Mi perfil</Text>
          <Text style={styles.heroTitle}>Cuenta técnica</Text>
          <Text style={styles.heroSubtitle}>
            Consulta tu identidad operativa y cierra sesión de forma segura.
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.profileCard}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>
                {(user?.username || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>

            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.roles}>{user?.roles?.join(', ') || 'Sin rol asignado'}</Text>

            <View style={styles.infoStack}>
              <InfoTile
                icon='person-outline'
                label='Usuario'
                value={user?.username || '-'}
              />
              <InfoTile
                icon='mail-outline'
                label='Email'
                value={user?.email || 'No disponible'}
              />
              <InfoTile
                icon='shield-checkmark-outline'
                label='Rol principal'
                value={user?.roles?.[0] || 'Sin rol'}
              />
            </View>
          </View>

          <View style={styles.tipCard}>
            <Ionicons name='shield-checkmark-outline' size={22} color={colors.navy} />
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>Sesión segura</Text>
              <Text style={styles.tipText}>
                Cierra sesión cuando termines tu jornada o si cambias de dispositivo.
              </Text>
            </View>
          </View>

          <Pressable style={styles.logoutButton} onPress={logout}>
            <Ionicons name='log-out-outline' size={18} color={colors.white} />
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoTile({ icon, label, value }) {
  return (
    <View style={styles.infoTile}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={18} color={colors.navy} />
      </View>
      <View style={styles.infoBody}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.navyDeep,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 28,
  },
  heroGlowLeft: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -40,
    left: -30,
  },
  heroGlowRight: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: 'rgba(143,191,47,0.18)',
    right: -20,
    bottom: -30,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.68)',
  },
  heroTitle: {
    marginTop: 10,
    fontSize: 30,
    fontWeight: '900',
    color: colors.white,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.72)',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  profileCard: {
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 22,
    ...shadows.card,
  },
  avatarWrap: {
    width: 86,
    height: 86,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navySoft,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.navy,
  },
  name: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },
  roles: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    color: colors.textMuted,
    fontWeight: '600',
  },
  infoStack: {
    width: '100%',
    marginTop: 20,
    gap: 12,
  },
  infoTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    padding: 14,
  },
  infoIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  infoBody: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.textSoft,
  },
  infoValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  tipCard: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.navySoft,
    padding: 16,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.navy,
  },
  tipText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: colors.navy,
  },
  logoutButton: {
    marginTop: 18,
    minHeight: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    ...shadows.card,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.white,
  },
});
