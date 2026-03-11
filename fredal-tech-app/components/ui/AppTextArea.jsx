// components/ui/AppTextArea.jsx
import { View, Text, TextInput } from 'react-native';

export default function AppTextArea({ label, value, onChange, placeholder, rows = 4 }) {
  return (
    <View className='mb-4'>
      {label && (
        <Text className='text-sm font-medium text-gray-700 mb-2'>{label}</Text>
      )}
      <TextInput
        className='border border-gray-300 rounded-xl px-4 py-3 text-gray-900'
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor='#9ca3af'
        multiline
        numberOfLines={rows}
        textAlignVertical='top'
        style={{ minHeight: rows * 24 }}
      />
    </View>
  );
}