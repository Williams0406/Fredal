import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../../store/authStore';
import { colors, radius, shadows } from '../../lib/theme';

export default function LoginScreen() {
  const { login } = useAuthStore();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Completa usuario y contraseña');
      return;
    }

    setLoading(true);
    try {
      await login(username, password);
      router.replace('/(tabs)/');
    } catch {
      Alert.alert('Error', 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style='light' />

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.heroGlowTop} />
        <View style={styles.heroGlowBottom} />

        <View style={styles.header}>
          <View style={styles.brandChip}>
            <Ionicons name='shield-checkmark-outline' size={16} color={colors.navy} />
            <Text style={styles.brandChipText}>Fredal Mobile</Text>
          </View>

          <View style={styles.brandCard}>
            <Text style={styles.brandTitle}>FREDAL</Text>
            <Text style={styles.brandSubtitle}>Operación técnica en campo</Text>
          </View>

          <Text style={styles.heroTitle}>Acceso del equipo técnico</Text>
          <Text style={styles.heroText}>
            Ingresa para consultar tus órdenes, registrar actividades y cerrar trabajos desde el móvil.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Iniciar sesión</Text>
          <Text style={styles.formText}>
            Usa tus credenciales corporativas para entrar al panel operativo.
          </Text>

          <InputRow
            icon='person-outline'
            placeholder='Usuario'
            value={username}
            onChangeText={setUsername}
            autoCapitalize='none'
            autoCorrect={false}
          />

          <InputRow
            icon='lock-closed-outline'
            placeholder='Contraseña'
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Pressable
            style={[styles.submitButton, loading ? styles.submitButtonDisabled : null]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? <ActivityIndicator size='small' color={colors.white} /> : <Ionicons name='arrow-forward' size={18} color={colors.white} />}
            <Text style={styles.submitText}>{loading ? 'Ingresando...' : 'Entrar al panel'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InputRow({ icon, ...props }) {
  return (
    <View style={styles.inputWrap}>
      <View style={styles.inputIconWrap}>
        <Ionicons name={icon} size={18} color={colors.navy} />
      </View>
      <TextInput
        {...props}
        placeholderTextColor={colors.textSoft}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.navyDeep,
  },
  keyboard: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  heroGlowTop: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -70,
    left: -60,
  },
  heroGlowBottom: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(143,191,47,0.20)',
    bottom: -90,
    right: -40,
  },
  header: {
    paddingTop: 18,
  },
  brandChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  brandChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.navy,
  },
  brandCard: {
    marginTop: 20,
  },
  brandTitle: {
    fontSize: 38,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 2,
  },
  brandSubtitle: {
    marginTop: 6,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: colors.lime,
    fontWeight: '800',
  },
  heroTitle: {
    marginTop: 28,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    color: colors.white,
  },
  heroText: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.72)',
  },
  formCard: {
    borderRadius: 30,
    backgroundColor: colors.white,
    padding: 22,
    ...shadows.floating,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
  },
  formText: {
    marginTop: 8,
    marginBottom: 18,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
  },
  inputWrap: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  inputIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 15,
    color: colors.text,
  },
  submitButton: {
    marginTop: 6,
    minHeight: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.78,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.white,
  },
});
