// app/(tabs)/_layout.jsx
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1e3a8a',
          borderTopColor: '#172D6E',
        },
        tabBarActiveTintColor: '#84cc16',
        tabBarInactiveTintColor: '#93c5fd',
      }}
    >
      <Tabs.Screen
        name='index'
        options={{
          title: 'Trabajos',
          tabBarIcon: ({ color }) => (
            <TabIcon emoji='⚙️' color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='mi-perfil'
        options={{
          title: 'Mi Perfil',
          tabBarIcon: ({ color }) => (
            <TabIcon emoji='👤' color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({ emoji }) {
  return (
    <Text style={{ fontSize: 20 }}>{emoji}</Text>
  );
}

// Necesario para el Text dentro de TabIcon
import { Text } from 'react-native';