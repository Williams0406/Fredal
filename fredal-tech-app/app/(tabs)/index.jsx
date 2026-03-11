// app/(tabs)/index.jsx
import { useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  RefreshControl, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTrabajos } from '../../hooks/useTrabajos';
import TrabajoCard from '../../components/trabajos/TrabajoCard';

const TABS = [
  { key: 'PENDIENTE',  label: 'Pendiente',  icon: '⏳' },
  { key: 'EN_PROCESO', label: 'En Proceso', icon: '⚙️' },
  { key: 'FINALIZADO', label: 'Finalizado', icon: '✓'  },
];

const TAB_ACTIVE = {
  PENDIENTE:  'border-gray-500',
  EN_PROCESO: 'border-[#1e3a8a]',
  FINALIZADO: 'border-[#84cc16]',
};

export default function KanbanScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('EN_PROCESO');
  const { data: trabajos = [], isLoading, refetch, isFetching } = useTrabajos();

  const filtered = trabajos.filter(t => t.estatus === activeTab);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#1e3a8a', paddingHorizontal: 16, paddingVertical: 16 }}>
        <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
          Órdenes de Trabajo
        </Text>
        <Text style={{ color: '#bfdbfe', fontSize: 13, marginTop: 2 }}>
          {isLoading ? 'Cargando...' : `${trabajos.length} órdenes asignadas`}
        </Text>
      </View>

      {/* Tab Bar */}
      <View style={{ flexDirection: 'row', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
        {TABS.map(tab => {
          const count = trabajos.filter(t => t.estatus === tab.key).length;
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={{
                flex: 1, alignItems: 'center', paddingVertical: 10,
                borderBottomWidth: 2,
                borderBottomColor: isActive
                  ? (tab.key === 'PENDIENTE' ? '#6b7280' : tab.key === 'EN_PROCESO' ? '#1e3a8a' : '#84cc16')
                  : 'transparent',
              }}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={{ fontSize: 18 }}>{tab.icon}</Text>
              <Text style={{
                fontSize: 10, fontWeight: 'bold',
                color: isActive ? (tab.key === 'EN_PROCESO' ? '#1e3a8a' : tab.key === 'FINALIZADO' ? '#4d7c0f' : '#374151') : '#6b7280',
              }}>
                {tab.label}
              </Text>
              <View style={{ backgroundColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 6, marginTop: 2 }}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#374151' }}>{count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Lista */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#1e3a8a" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <TrabajoCard
              trabajo={item}
              onPress={() => router.push(`/trabajos/${item.id}`)}
            />
          )}
          contentContainerStyle={{ padding: 12, gap: 10 }}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingVertical: 64 }}>
              <Text style={{ fontSize: 40, marginBottom: 10 }}>📋</Text>
              <Text style={{ color: '#6b7280', fontWeight: '500' }}>
                Sin trabajos en {activeTab.replace('_', ' ').toLowerCase()}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}