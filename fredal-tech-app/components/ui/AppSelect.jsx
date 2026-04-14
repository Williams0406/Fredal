import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows } from '../../lib/theme';

export default function AppSelect({ label, value, options, onChange, disabled, placeholder = 'Selecciona una opción' }) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => options.find((option) => option.value === value), [options, value]);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Pressable
        disabled={disabled}
        style={[
          styles.trigger,
          disabled ? styles.triggerDisabled : null,
          open ? styles.triggerOpen : null,
        ]}
        onPress={() => setOpen(true)}
      >
        <Text style={[styles.triggerText, !selected ? styles.placeholder : null]}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name='chevron-down' size={18} color={colors.textSoft} />
      </Pressable>

      <Modal visible={open} transparent animationType='fade' onRequestClose={() => setOpen(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{label || 'Selecciona una opción'}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => String(item.value)}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    style={[styles.option, isSelected ? styles.optionSelected : null]}
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                  >
                    <Text style={[styles.optionText, isSelected ? styles.optionTextSelected : null]}>
                      {item.label}
                    </Text>
                    {isSelected ? (
                      <Ionicons name='checkmark-circle' size={18} color={colors.navy} />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
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
  trigger: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    ...shadows.soft,
  },
  triggerDisabled: {
    backgroundColor: colors.surfaceMuted,
  },
  triggerOpen: {
    borderColor: colors.navy,
  },
  triggerText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
  placeholder: {
    color: colors.textSoft,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  sheet: {
    maxHeight: 360,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
    paddingTop: 10,
    paddingBottom: 18,
    ...shadows.floating,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 54,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
    marginBottom: 12,
  },
  sheetTitle: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  option: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.surfaceMuted,
  },
  optionSelected: {
    backgroundColor: colors.navySoft,
    borderColor: '#BED2FF',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: colors.navy,
  },
});
