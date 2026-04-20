import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { registroAPI } from '../../lib/api';
import { colors, radius, shadows } from '../../lib/theme';

const getErrorMessage = (error) =>
  error?.response?.data?.detail ||
  error?.response?.data?.error ||
  'No se pudo crear el usuario. Verifica el codigo de registro.';

export default function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState({
    codigo: '',
    username: '',
    password: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (error) setError('');
  };

  const handleRegister = async () => {
    setError('');

    if (!form.codigo.trim()) {
      setError('El codigo de registro es obligatorio.');
      return;
    }

    if (!form.username.trim()) {
      setError('El nombre de usuario es obligatorio.');
      return;
    }

    if (form.password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres.');
      return;
    }

    if (form.password !== confirmPassword) {
      setError('Las contrasenas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await registroAPI.registerWithCode({
        codigo: form.codigo.trim(),
        username: form.username.trim(),
        password: form.password,
      });

      Alert.alert(
        'Cuenta creada',
        'Usuario creado exitosamente. Ahora puedes iniciar sesion.',
        [{ text: 'Ir a login', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (registerError) {
      setError(getErrorMessage(registerError));
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'
        >
          <View style={styles.heroGlowTop} />
          <View style={styles.heroGlowBottom} />

          <View style={styles.header}>
            <Pressable style={styles.backChip} onPress={() => router.back()}>
              <Ionicons name='arrow-back' size={16} color={colors.navy} />
              <Text style={styles.backChipText}>Volver</Text>
            </Pressable>

            <View style={styles.brandCard}>
              <Text style={styles.brandTitle}>FREDAL</Text>
              <Text style={styles.brandSubtitle}>Alta de usuario movil</Text>
            </View>

            <Text style={styles.heroTitle}>Crear cuenta con codigo</Text>
            <Text style={styles.heroText}>
              Usa el codigo entregado por administracion para activar tu acceso desde el telefono.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Registro de usuario</Text>
            <Text style={styles.formText}>
              Completa los datos y luego vuelve al login para ingresar al panel operativo.
            </Text>

            {error ? (
              <View style={styles.errorCard}>
                <Ionicons name='alert-circle-outline' size={18} color={colors.red} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <InputRow
              icon='key-outline'
              placeholder='Codigo de registro'
              value={form.codigo}
              onChangeText={(value) => updateField('codigo', value.toUpperCase())}
              autoCapitalize='characters'
              autoCorrect={false}
            />

            <InputRow
              icon='person-outline'
              placeholder='Nombre de usuario'
              value={form.username}
              onChangeText={(value) => updateField('username', value)}
              autoCapitalize='none'
              autoCorrect={false}
            />

            <InputRow
              icon='lock-closed-outline'
              placeholder='Contrasena'
              value={form.password}
              onChangeText={(value) => updateField('password', value)}
              secureTextEntry
            />

            <InputRow
              icon='shield-checkmark-outline'
              placeholder='Confirmar contrasena'
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(value);
                if (error) setError('');
              }}
              secureTextEntry
            />

            <Pressable
              style={[styles.submitButton, loading ? styles.submitButtonDisabled : null]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size='small' color={colors.white} />
              ) : (
                <Ionicons name='person-add-outline' size={18} color={colors.white} />
              )}
              <Text style={styles.submitText}>
                {loading ? 'Creando cuenta...' : 'Crear cuenta'}
              </Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.secondaryButtonText}>Ya tengo cuenta, ir a login</Text>
            </Pressable>
          </View>
        </ScrollView>
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
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 24,
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
  backChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  backChipText: {
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
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#F3C4C0',
    backgroundColor: colors.redSoft,
    padding: 14,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: colors.red,
    fontWeight: '600',
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
  secondaryButton: {
    marginTop: 12,
    minHeight: 50,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textMuted,
  },
});
