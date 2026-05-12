import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCreateActividad } from '../../hooks/useActividades';
import AppSelect from '../ui/AppSelect';
import AppTextArea from '../ui/AppTextArea';
import AppSheet from '../ui/AppSheet';
import { colors, radius } from '../../lib/theme';

const TIPO_ACT = [
  { value: 'REVISION', label: 'Revision' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento' },
];

const TIPO_MANT = [
  { value: 'PREVENTIVO', label: 'Preventivo' },
  { value: 'CORRECTIVO', label: 'Correctivo' },
  { value: 'PREDICTIVO', label: 'Predictivo' },
  { value: 'OVERHAUL', label: 'Overhaul' },
];

const SUB_PREV = ['PM1', 'PM2', 'PM3', 'PM4'].map((value) => ({ value, label: value }));
const SUB_CORR = ['LEVE', 'MEDIANO', 'GRAVE'].map((value) => ({ value, label: value }));
const SUB_OVERHAUL = ['LEVE', 'MEDIANO', 'REGULAR'].map((value) => ({ value, label: value }));

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.detail ||
  error?.response?.data?.non_field_errors?.[0] ||
  fallback;

export default function ActividadFormModal({ trabajoId, onClose, esPlanificada = false }) {
  const [tipoAct, setTipoAct] = useState('');
  const [tipoMant, setTipoMant] = useState('');
  const [subtipo, setSubtipo] = useState('');
  const [desc, setDesc] = useState('');

  const createAct = useCreateActividad(trabajoId);

  const subtipoOpts =
    tipoMant === 'PREVENTIVO'
      ? SUB_PREV
      : tipoMant === 'CORRECTIVO' || tipoMant === 'PREDICTIVO'
        ? SUB_CORR
        : tipoMant === 'OVERHAUL'
          ? SUB_OVERHAUL
          : [];

  const canSave =
    tipoAct === 'REVISION' ||
    (tipoAct === 'MANTENIMIENTO' && tipoMant && subtipo);

  const isSaving = createAct.isPending;

  const handleSave = async () => {
    if (!canSave || isSaving) return;

    try {
      await createAct.mutateAsync({
        orden: trabajoId,
        tipo_actividad: tipoAct,
        tipo_mantenimiento: tipoAct === 'MANTENIMIENTO' ? tipoMant : undefined,
        subtipo: tipoAct === 'MANTENIMIENTO' ? subtipo : undefined,
        descripcion: desc.trim(),
        es_planificada: esPlanificada,
      });
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'No se pudo guardar la actividad.'));
      return;
    }

    onClose();
  };

  return (
    <AppSheet
      visible
      onClose={onClose}
      icon='create-outline'
      title={esPlanificada ? 'Planificar actividad' : 'Registrar actividad'}
      subtitle={
        esPlanificada
          ? 'Define una actividad prevista para esta orden'
          : 'Documenta la ejecucion real realizada en esta orden'
      }
      footer={
        <View style={styles.footerRow}>
          <Pressable
            style={[styles.cancelButton, isSaving ? styles.buttonDisabled : null]}
            onPress={onClose}
            disabled={isSaving}
          >
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>
          <Pressable
            style={[styles.saveButton, !canSave || isSaving ? styles.saveButtonDisabled : null]}
            onPress={handleSave}
            disabled={!canSave || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size='small' color={colors.white} />
            ) : (
              <Ionicons name='save-outline' size={16} color={colors.white} />
            )}
            <Text style={styles.saveText}>
              {isSaving
                ? 'Guardando...'
                : esPlanificada
                  ? 'Guardar plan'
                  : 'Guardar actividad'}
            </Text>
          </Pressable>
        </View>
      }
    >
      <View style={styles.block}>
        <Text style={styles.blockTitle}>Tipo de actividad</Text>
        <View style={styles.optionGrid}>
          {TIPO_ACT.map((option) => {
            const selected = tipoAct === option.value;
            const isMaintenance = option.value === 'MANTENIMIENTO';

            return (
              <Pressable
                key={option.value}
                style={[styles.choiceCard, selected ? styles.choiceCardSelected : null]}
                onPress={() => {
                  setTipoAct(option.value);
                  setTipoMant('');
                  setSubtipo('');
                }}
              >
                <View
                  style={[
                    styles.choiceIconWrap,
                    selected ? styles.choiceIconWrapSelected : null,
                  ]}
                >
                  {isMaintenance ? (
                    <MaterialCommunityIcons
                      name='wrench-outline'
                      size={20}
                      color={selected ? colors.white : colors.navy}
                    />
                  ) : (
                    <Ionicons
                      name='search-outline'
                      size={20}
                      color={selected ? colors.white : colors.navy}
                    />
                  )}
                </View>
                <Text style={[styles.choiceTitle, selected ? styles.choiceTitleSelected : null]}>
                  {option.label}
                </Text>
                <Text
                  style={[
                    styles.choiceSubtitle,
                    selected ? styles.choiceSubtitleSelected : null,
                  ]}
                >
                  {isMaintenance ? 'Con tipo y subtipo tecnico' : 'Sin materiales ni mantenimiento'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {tipoAct === 'MANTENIMIENTO' ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Clasificacion del mantenimiento</Text>
          <View style={styles.stack}>
            {TIPO_MANT.map((option) => {
              const selected = tipoMant === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.rowOption, selected ? styles.rowOptionSelected : null]}
                  onPress={() => {
                    setTipoMant(option.value);
                    setSubtipo('');
                  }}
                >
                  <View style={styles.rowOptionTextWrap}>
                    <Text
                      style={[
                        styles.rowOptionTitle,
                        selected ? styles.rowOptionTitleSelected : null,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text
                      style={[
                        styles.rowOptionMeta,
                        selected ? styles.rowOptionMetaSelected : null,
                      ]}
                    >
                      {option.value === 'PREVENTIVO'
                        ? 'Planificado por ciclo o mantenimiento periodico'
                        : option.value === 'CORRECTIVO'
                          ? 'Atiende una falla existente'
                          : option.value === 'OVERHAUL'
                            ? 'Intervencion mayor con alcance estructural'
                          : 'Basado en comportamiento o condicion'}
                    </Text>
                  </View>
                  {selected ? <Ionicons name='checkmark-circle' size={18} color={colors.navy} /> : null}
                </Pressable>
              );
            })}
          </View>

          {tipoMant ? (
            <AppSelect
              label='Subtipo *'
              options={subtipoOpts}
              value={subtipo}
              onChange={setSubtipo}
            />
          ) : null}
        </View>
      ) : null}

      <View style={styles.block}>
        <AppTextArea
          label='Descripcion'
          value={desc}
          onChange={setDesc}
          placeholder='Describe lo que realizaste, hallazgos o notas tecnicas...'
        />
      </View>
    </AppSheet>
  );
}

const styles = StyleSheet.create({
  footerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
  },
  saveButton: {
    flex: 1.5,
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.navy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: colors.textSoft,
  },
  saveText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
  },
  block: {
    marginBottom: 18,
  },
  blockTitle: {
    marginBottom: 10,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  optionGrid: {
    gap: 12,
  },
  choiceCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 16,
  },
  choiceCardSelected: {
    borderColor: '#BFD2FF',
    backgroundColor: colors.navySoft,
  },
  choiceIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  choiceIconWrapSelected: {
    backgroundColor: colors.navy,
  },
  choiceTitle: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  choiceTitleSelected: {
    color: colors.navy,
  },
  choiceSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
  choiceSubtitleSelected: {
    color: colors.navy,
  },
  stack: {
    gap: 10,
    marginBottom: 14,
  },
  rowOption: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowOptionSelected: {
    borderColor: '#BFD2FF',
    backgroundColor: colors.navySoft,
  },
  rowOptionTextWrap: {
    flex: 1,
  },
  rowOptionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  rowOptionTitleSelected: {
    color: colors.navy,
  },
  rowOptionMeta: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  rowOptionMetaSelected: {
    color: colors.navy,
  },
});
