import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../../lib/theme';
import { useAuthStore } from '../../store/authStore';
import { isStorageUser as isStorageUserByRole } from '../../lib/permissions';

export default function TabsLayout() {
  const { user } = useAuthStore();
  const isStorageUser = isStorageUserByRole(user);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.lime,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.62)',
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 14,
          height: 74,
          borderTopWidth: 0,
          borderRadius: 26,
          paddingTop: 10,
          paddingBottom: 10,
          backgroundColor: colors.navyDeep,
          ...shadows.floating,
        },
        tabBarItemStyle: {
          marginHorizontal: 4,
          borderRadius: 18,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name='index'
        options={{
          title: isStorageUser ? 'Almacen' : 'Trabajos',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={
                isStorageUser
                  ? focused
                    ? 'cube'
                    : 'cube-outline'
                  : focused
                    ? 'clipboard'
                    : 'clipboard-outline'
              }
              size={20}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name='mi-perfil'
        options={{
          title: 'Mi perfil',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person-circle' : 'person-circle-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
