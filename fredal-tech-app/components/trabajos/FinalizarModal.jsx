import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinalizarTrabajo } from '../../hooks/useTrabajos';
import AppSheet from '../ui/AppSheet';
import AppTextArea from '../ui/AppTextArea';
import { colors, radius } from '../../lib/theme';

const ESTADOS_EQUIPO = [
  { value: 'OPERATIVO', label: 'Operativo', description: 'Queda disponible para seguir operando.' },
  { value: 'INOPERATIVO', label: 'Inoperativo', description: 'Requiere nueva revisión o intervención.' },
];

const getCurrentTime = () => new Date().toTimeString().slice(0, 5);
const EMPTY_TIME = { hour: '', minute: '' };

function padTimeUnit(value) {
  return String(value).padStart(2, '0');
}

function normalizeTimeValue(value) {
  if (!value) return '';

  const rawValue = String(value);
  const candidate = rawValue.includes('T') ? rawValue.split('T').pop() : rawValue;
  const match = candidate.match(/(\d{1,2}):(\d{1,2})/);

  if (!match) return '';

  const hour = Math.min(Number(match[1]), 23);
  const minute = Math.min(Number(match[2]), 59);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return '';

  return `${padTimeUnit(hour)}:${padTimeUnit(minute)}`;
}

function toTimeParts(value) {
  const normalized = normalizeTimeValue(value);

  if (!normalized) return EMPTY_TIME;

  const [hour, minute] = normalized.split(':');
  return { hour, minute };
}

function buildTimeValue(parts) {
  const hour = String(parts?.hour || '').replace(/\D/g, '').slice(0, 2);
  const minute = String(parts?.minute || '').replace(/\D/g, '').slice(0, 2);

  if (hour.length !== 2 || minute.length !== 2) return '';

  const hourValue = Number(hour);
  const minuteValue = Number(minute);

  if (
    Number.isNaN(hourValue) ||
    Number.isNaN(minuteValue) ||
    hourValue > 23 ||
    minuteValue > 59
  ) {
    return '';
  }

  return `${padTimeUnit(hourValue)}:${padTimeUnit(minuteValue)}`;
}

function sanitizeTimePart(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 2);
}

function finalizeTimePart(value, part) {
  const digits = sanitizeTimePart(value);
  if (!digits) return '';

  const max = part === 'hour' ? 23 : 59;
  return padTimeUnit(Math.min(Number(digits), max));
}

function getTimePreview(parts) {
  const hour = parts?.hour ? parts.hour.padStart(2, '0') : 'HH';
  const minute = parts?.minute ? parts.minute.padStart(2, '0') : 'MM';
  return `${hour}:${minute}`;
}

function calcularDuracion(inicio, fin) {
  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = fin.split(':').map(Number);
  const totalMinutos = h2 * 60 + m2 - (h1 * 60 + m1);
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  return `${horas}h ${minutos}m`;
}

export default function FinalizarModal({ trabajo, onClose, onFinalizado }) {
  const finalizarMut = useFinalizarTrabajo();
  const [form, setForm] = useState({
    hora_inicio: toTimeParts(trabajo?.hora_inicio || getCurrentTime()),
    hora_fin: toTimeParts(trabajo?.hora_fin || ''),
    horometro: trabajo?.horometro ? String(trabajo.horometro) : '',
    estado_equipo: trabajo?.estado_equipo || '',
    observaciones: trabajo?.observaciones || '',
  });
  const [error, setError] = useState('');

  const saving = finalizarMut.isPending;
  const horaInicio = useMemo(() => buildTimeValue(form.hora_inicio), [form.hora_inicio]);
  const horaFin = useMemo(() => buildTimeValue(form.hora_fin), [form.hora_fin]);

  const duracion = useMemo(() => {
    if (!horaInicio || !horaFin) return '';
    if (horaInicio >= horaFin) return '';
    return calcularDuracion(horaInicio, horaFin);
  }, [horaFin, horaInicio]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleTimePartChange = (field, part, value) => {
    const nextValue = sanitizeTimePart(value);

    setForm((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [part]: nextValue,
      },
    }));

    if (error) setError('');
  };

  const handleTimePartBlur = (field, part) => {
    setForm((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [part]: finalizeTimePart(prev[field]?.[part], part),
      },
    }));
  };

  const handleSetCurrentTime = (field) => {
    setForm((prev) => ({
      ...prev,
      [field]: toTimeParts(getCurrentTime()),
    }));

    if (error) setError('');
  };

  const handleSubmit = () => {
    if (!horaInicio || !horaFin) {
      setError('Las horas de inicio y fin son obligatorias');
      return;
    }

    if (!form.horometro) {
      setError('El horómetro es obligatorio');
      return;
    }

    if (!form.estado_equipo) {
      setError('Selecciona el estado final del equipo');
      return;
    }

    if (horaInicio >= horaFin) {
      setError('La hora de fin debe ser posterior a la de inicio');
      return;
    }

    finalizarMut.mutate(
      {
        id: trabajo.id,
        data: {
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          horometro: Number(form.horometro),
          estado_equipo: form.estado_equipo,
          observaciones: form.observaciones?.trim() || '',
        },
      },
      {
        onSuccess: (res) => {
          onFinalizado?.(res?.data);
          onClose();
        },
        onError: (err) => {
          setError(err?.response?.data?.detail || 'Error al finalizar la orden');
        },
      }
    );
  };

  return (
    <AppSheet
      visible
      onClose={onClose}
      icon='checkmark-done-outline'
      title='Finalizar orden'
      subtitle={trabajo?.codigo_orden}
      footer={
        <View style={styles.footerRow}>
          <Pressable style={styles.cancelButton} onPress={onClose} disabled={saving}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>

          <Pressable style={[styles.submitButton, saving ? styles.submitButtonDisabled : null]} onPress={handleSubmit} disabled={saving}>
            {saving ? (
              <ActivityIndicator size='small' color={colors.white} />
            ) : (
              <Ionicons name='checkmark-done-outline' size={17} color={colors.white} />
            )}
            <Text style={styles.submitText}>
              {saving ? 'Finalizando...' : 'Cerrar orden'}
            </Text>
          </Pressable>
        </View>
      }
    >
      <View style={styles.warningCard}>
        <Ionicons name='alert-circle-outline' size={18} color={colors.amber} />
        <View style={{ flex: 1 }}>
          <Text style={styles.warningTitle}>Acción irreversible</Text>
          <Text style={styles.warningText}>
            Después del cierre no podrás registrar más actividades ni materiales.
          </Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Ionicons name='close-circle-outline' size={18} color={colors.red} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.block}>
        <Text style={styles.blockTitle}>Ventana de ejecución</Text>
        <View style={styles.timeFieldStack}>
          <TimeField
            label='Hora de inicio *'
            icon='play-circle-outline'
            parts={form.hora_inicio}
            onChangePart={(part, value) => handleTimePartChange('hora_inicio', part, value)}
            onBlurPart={(part) => handleTimePartBlur('hora_inicio', part)}
            onUseCurrent={() => handleSetCurrentTime('hora_inicio')}
            helper='Solo ajusta horas y minutos. El formato se completa automáticamente.'
          />
          <TimeField
            label='Hora de fin *'
            icon='stop-circle-outline'
            parts={form.hora_fin}
            onChangePart={(part, value) => handleTimePartChange('hora_fin', part, value)}
            onBlurPart={(part) => handleTimePartBlur('hora_fin', part)}
            onUseCurrent={() => handleSetCurrentTime('hora_fin')}
            helper='Ideal para registrar el cierre real sin escribir los dos puntos.'
          />
        </View>
      </View>

      {duracion ? (
        <View style={styles.durationCard}>
          <Ionicons name='time-outline' size={16} color={colors.navy} />
          <Text style={styles.durationText}>Duración estimada: {duracion}</Text>
        </View>
      ) : null}

      <View style={styles.block}>
        <InputField
          label='Horómetro (horas) *'
          value={form.horometro}
          onChangeText={(value) => handleChange('horometro', value)}
          placeholder='Ej. 1250.5'
          keyboardType='numeric'
          helper='Horas acumuladas del equipo al momento del cierre.'
        />
      </View>

      <View style={styles.block}>
        <Text style={styles.blockTitle}>Estado final del equipo</Text>
        <View style={styles.optionStack}>
          {ESTADOS_EQUIPO.map((option) => {
            const selected = form.estado_equipo === option.value;
            return (
              <Pressable
                key={option.value}
                style={[styles.statusOption, selected ? styles.statusOptionSelected : null]}
                onPress={() => handleChange('estado_equipo', option.value)}
              >
                <View style={styles.statusIconWrap}>
                  <Ionicons
                    name={option.value === 'OPERATIVO' ? 'checkmark-circle-outline' : 'close-circle-outline'}
                    size={18}
                    color={selected ? colors.navy : colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.statusTitle, selected ? styles.statusTitleSelected : null]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.statusDescription, selected ? styles.statusDescriptionSelected : null]}>
                    {option.description}
                  </Text>
                </View>
                {selected ? <Ionicons name='checkmark-circle' size={18} color={colors.navy} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.block}>
        <AppTextArea
          label='Observacion'
          value={form.observaciones}
          onChange={(value) => handleChange('observaciones', value)}
          placeholder='Describe el cierre de la orden, hallazgos finales o notas importantes...'
          rows={4}
        />
        <Text style={styles.helperText}>
          Esta observacion quedara guardada en la orden de trabajo al finalizarla.
        </Text>
      </View>
    </AppSheet>
  );
}

function InputField({ label, helper, ...props }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.fieldLabel, styles.inputFieldLabel]}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={colors.textSoft}
        style={styles.input}
      />
      {helper ? <Text style={styles.helperText}>{helper}</Text> : null}
    </View>
  );
}

function TimeField({ label, icon, parts, helper, onChangePart, onBlurPart, onUseCurrent }) {
  const hourRef = useRef(null);
  const minuteRef = useRef(null);
  const [focusedPart, setFocusedPart] = useState('');

  return (
    <View style={styles.timeFieldCard}>
      <View style={styles.timeFieldHeader}>
        <View style={styles.timeFieldTitleRow}>
          <View style={styles.timeIconWrap}>
            <Ionicons name={icon} size={16} color={colors.navy} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>{label}</Text>
            <Text style={styles.timePreview}>{getTimePreview(parts)}</Text>
          </View>
        </View>

        <Pressable style={styles.timeNowButton} onPress={onUseCurrent}>
          <Ionicons name='time-outline' size={14} color={colors.navy} />
          <Text style={styles.timeNowText}>Ahora</Text>
        </Pressable>
      </View>

      <View style={styles.timeEditorRow}>
        <Pressable
          style={[
            styles.timeSegment,
            focusedPart === 'hour' ? styles.timeSegmentActive : null,
          ]}
          onPress={() => hourRef.current?.focus()}
        >
          <Text style={styles.timeSegmentLabel}>Hora</Text>
          <TextInput
            ref={hourRef}
            value={parts.hour}
            onChangeText={(value) => {
              const nextValue = sanitizeTimePart(value);
              onChangePart('hour', nextValue);
              if (nextValue.length === 2) {
                minuteRef.current?.focus();
              }
            }}
            onFocus={() => setFocusedPart('hour')}
            onBlur={() => {
              setFocusedPart((current) => (current === 'hour' ? '' : current));
              onBlurPart('hour');
            }}
            keyboardType='number-pad'
            maxLength={2}
            placeholder='HH'
            placeholderTextColor={colors.textSoft}
            style={styles.timeSegmentInput}
            textAlign='center'
            selectTextOnFocus
          />
        </Pressable>

        <Text style={styles.timeSeparator}>:</Text>

        <Pressable
          style={[
            styles.timeSegment,
            focusedPart === 'minute' ? styles.timeSegmentActive : null,
          ]}
          onPress={() => minuteRef.current?.focus()}
        >
          <Text style={styles.timeSegmentLabel}>Min</Text>
          <TextInput
            ref={minuteRef}
            value={parts.minute}
            onChangeText={(value) => onChangePart('minute', sanitizeTimePart(value))}
            onFocus={() => setFocusedPart('minute')}
            onBlur={() => {
              setFocusedPart((current) => (current === 'minute' ? '' : current));
              onBlurPart('minute');
            }}
            keyboardType='number-pad'
            maxLength={2}
            placeholder='MM'
            placeholderTextColor={colors.textSoft}
            style={styles.timeSegmentInput}
            textAlign='center'
            selectTextOnFocus
          />
        </Pressable>
      </View>

      {helper ? <Text style={styles.helperText}>{helper}</Text> : null}
    </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
  },
  submitButton: {
    flex: 1.5,
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.red,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.amberSoft,
    padding: 14,
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.amber,
  },
  warningText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: colors.amber,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: radius.md,
    backgroundColor: colors.redSoft,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: colors.red,
    fontWeight: '700',
  },
  block: {
    marginBottom: 16,
  },
  blockTitle: {
    marginBottom: 10,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  inputFieldLabel: {
    marginBottom: 8,
  },
  timeFieldStack: {
    gap: 12,
  },
  timeFieldCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 14,
  },
  timeFieldHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  timeFieldTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  timeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navySoft,
  },
  timePreview: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.navy,
  },
  timeNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#BFD2FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timeNowText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.navy,
  },
  timeEditorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 14,
  },
  timeSegment: {
    flex: 1,
    minHeight: 96,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  timeSegmentActive: {
    borderColor: '#8FB5FF',
    backgroundColor: colors.navySoft,
  },
  timeSegmentLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  timeSegmentInput: {
    width: '100%',
    marginTop: 8,
    paddingVertical: 0,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: colors.text,
  },
  timeSeparator: {
    marginTop: 18,
    fontSize: 28,
    fontWeight: '800',
    color: colors.navy,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.text,
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
    color: colors.textMuted,
  },
  durationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.md,
    backgroundColor: colors.navySoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  durationText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
  },
  optionStack: {
    gap: 10,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statusOptionSelected: {
    borderColor: '#BFD2FF',
    backgroundColor: colors.navySoft,
  },
  statusIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  statusTitleSelected: {
    color: colors.navy,
  },
  statusDescription: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  statusDescriptionSelected: {
    color: colors.navy,
  },
});
