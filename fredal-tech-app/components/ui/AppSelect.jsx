// components/ui/AppSelect.jsx
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { useState } from 'react';

// Props: { label, value, options: [{value, label}], onChange, disabled }

export default function AppSelect({ label, value, options, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <View className='mb-4'>
      <Text className='text-sm font-medium text-gray-700 mb-2'>{label}</Text>
      <TouchableOpacity
        className={`flex-row items-center justify-between border rounded-xl px-4 py-3
          ${disabled ? 'bg-gray-100 border-gray-200' : 'bg-white border-gray-300'}`}
        onPress={() => !disabled && setOpen(true)}>
        <Text className={selected ? 'text-gray-900' : 'text-gray-400'}>
          {selected ? selected.label : 'Seleccione una opción'}
        </Text>
        <Text className='text-gray-400'>▾</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType='fade'>
        <TouchableOpacity className='flex-1 bg-black/30 justify-end'
          onPress={() => setOpen(false)}>
          <View className='bg-white rounded-t-3xl max-h-80'>
            <FlatList data={options} keyExtractor={o => o.value}
              renderItem={({ item }) => (
                <TouchableOpacity className='px-5 py-4 border-b border-gray-100'
                  onPress={() => { onChange(item.value); setOpen(false); }}>
                  <Text className={`text-base
                    ${item.value === value ? 'font-bold text-[#1e3a8a]' : 'text-gray-800'}`}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )} />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
