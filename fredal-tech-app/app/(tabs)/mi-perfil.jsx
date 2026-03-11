// app/(tabs)/mi-perfil.jsx
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { useAuthStore } from '../../store/authStore';

export default function MiPerfilScreen() {
  const { user, logout } = useAuthStore();

  return (
    <SafeAreaView className='flex-1 bg-gray-50'>
      <View className='bg-[#1e3a8a] px-4 py-6'>
        <Text className='text-white text-xl font-bold'>Mi Perfil</Text>
      </View>

      <View className='p-4'>
        <View className='bg-white rounded-xl p-5 border border-gray-200 mb-4'>
          <View className='items-center mb-4'>
            <View className='w-20 h-20 rounded-full bg-blue-100 items-center justify-center mb-3'>
              <Text className='text-4xl'>👤</Text>
            </View>
            <Text className='text-lg font-bold text-gray-900'>
              {user?.trabajador
                ? `${user.trabajador.nombres} ${user.trabajador.apellidos}`
                : user?.username}
            </Text>
            <Text className='text-sm text-gray-500 mt-1'>
              {user?.roles?.join(', ') || 'Sin rol asignado'}
            </Text>
          </View>

          <View className='border-t border-gray-100 pt-4 space-y-2'>
            <View className='flex-row justify-between'>
              <Text className='text-sm text-gray-500'>Usuario</Text>
              <Text className='text-sm font-medium text-gray-800'>
                {user?.username}
              </Text>
            </View>
            <View className='flex-row justify-between'>
              <Text className='text-sm text-gray-500'>Email</Text>
              <Text className='text-sm font-medium text-gray-800'>
                {user?.email || '—'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          className='bg-red-500 py-4 rounded-xl items-center'
          onPress={logout}
        >
          <Text className='text-white font-bold text-base'>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}