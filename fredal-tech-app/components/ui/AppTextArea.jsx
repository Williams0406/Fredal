import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, shadows } from '../../lib/theme';

export default function AppTextArea({ label, value, onChange, placeholder, rows = 4 }) {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, { minHeight: rows * 28 }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textSoft}
        multiline
        numberOfLines={rows}
        textAlignVertical='top'
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 15,
    ...shadows.soft,
  },
});
