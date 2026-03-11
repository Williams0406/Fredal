// app/(auth)/login.jsx
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, TextInput, TouchableOpacity,
         Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuthStore } from '../../store/authStore';

export default function LoginScreen() {
  const { login } = useAuthStore();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
      router.replace('/(tabs)/');
    } catch {
      Alert.alert('Error', 'Credenciales inválidas');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView className='flex-1 bg-[#1e3a8a]'
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View className='flex-1 items-center justify-center px-8'>
        {/* Logo */}
        <View className='bg-white rounded-2xl px-8 py-3 mb-2'>
          <Text className='text-[#1e3a8a] text-3xl font-bold'>FREDAL</Text>
        </View>
        <Text className='text-[#84cc16] font-semibold mb-10 tracking-widest'>
          TÉCNICOS
        </Text>
        {/* Card */}
        <View className='w-full bg-white rounded-2xl p-6 shadow-xl'>
          <Text className='text-xl font-bold text-[#1e3a8a] mb-6'>
            Iniciar Sesión
          </Text>
          <TextInput
            className='border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-900'
            placeholder='Usuario' placeholderTextColor='#9ca3af'
            value={username} onChangeText={setUsername}
            autoCapitalize='none' autoCorrect={false} />
          <TextInput
            className='border border-gray-300 rounded-xl px-4 py-3 mb-6 text-gray-900'
            placeholder='Contraseña' placeholderTextColor='#9ca3af'
            value={password} onChangeText={setPassword}
            secureTextEntry />
          <TouchableOpacity
            className={`py-4 rounded-xl items-center ${loading ? 'bg-gray-400' : 'bg-[#1e3a8a]'}`}
            onPress={handleLogin} disabled={loading}>
            <Text className='text-white font-bold text-base'>
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
