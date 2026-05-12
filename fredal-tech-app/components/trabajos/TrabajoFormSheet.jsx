import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppSelect from '../ui/AppSelect';
import AppSheet from '../ui/AppSheet';
import { useCreateTrabajo, usePatchTrabajo } from '../../hooks/useTrabajos';
import {
  maquinariaAPI,
  trabajadorAPI,
  ubicacionClienteAPI,
  userAPI,
} from '../../lib/api';
import { ROLES } from '../../lib/constants';
import { colors, radius, shadows } from '../../lib/theme';

const PRIORIDAD_OPTIONS = [
  { value: 'REGULAR', label: 'Regular' },
  { value: 'URGENTE', label: 'Urgente' },
  { value: 'EMERGENCIA', label: 'Emergencia' },
];

const LUGAR_OPTIONS = [
  { value: 'TALLER', label: 'Taller' },
  { value: 'CAMPO', label: 'Campo' },
];

const ROLES_ASIGNABLES = [ROLES.TECNICO.toLowerCase(), ROLES.JEFE_TECNICOS.toLowerCase()];

const getCurrentTime = () => new Date().toTimeString().slice(0, 5);
const sanitizeNumericInput = (value, maxLength) => String(value || '').replace(/\D/g, '').slice(0, maxLength);

const getTodayParts = () => {
  const today = new Date();
  return {
    fechaDia: String(today.getDate()).padStart(2, '0'),
    fechaMes: String(today.getMonth() + 1).padStart(2, '0'),
    fechaAnio: String(today.getFullYear()),
  };
};

const buildFechaValue = ({ fechaDia, fechaMes, fechaAnio }) => {
  const day = sanitizeNumericInput(fechaDia, 2);
  const month = sanitizeNumericInput(fechaMes, 2);
  const year = sanitizeNumericInput(fechaAnio, 4);

  if (!day || !month || year.length !== 4) return '';
  return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const isValidFechaParts = ({ fechaDia, fechaMes, fechaAnio }) => {
  const day = Number(sanitizeNumericInput(fechaDia, 2));
  const month = Number(sanitizeNumericInput(fechaMes, 2));
  const year = Number(sanitizeNumericInput(fechaAnio, 4));

  if (!day || !month || !year || String(year).length !== 4) return false;

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};

const createInitialForm = () => ({
  maquinaria: null,
  ...getTodayParts(),
  lugar: 'TALLER',
  ubicacion_detalle: '',
  prioridad: 'REGULAR',
  hora_inicio: getCurrentTime(),
  tecnicos: [],
});

const normalizeRole = (role) => String(role?.name || role?.nombre || role || '').toLowerCase().trim();

const getTrabajadorIdFromUser = (user) =>
  user?.trabajador_id ??
  user?.trabajador?.id ??
  user?.trabajador ??
  user?.perfil?.trabajador?.id ??
  null;

const getFechaPartsFromValue = (fecha) => {
  const [year = '', month = '', day = ''] = String(fecha || '').split('-');

  if (year.length === 4 && month.length >= 1 && day.length >= 1) {
    return {
      fechaDia: sanitizeNumericInput(day, 2),
      fechaMes: sanitizeNumericInput(month, 2),
      fechaAnio: sanitizeNumericInput(year, 4),
    };
  }

  return getTodayParts();
};

const createFormFromTrabajo = (trabajo) => ({
  maquinaria: trabajo?.maquinaria ?? null,
  ...getFechaPartsFromValue(trabajo?.fecha),
  lugar: trabajo?.lugar || 'TALLER',
  ubicacion_detalle: trabajo?.lugar === 'CAMPO' ? trabajo?.ubicacion_detalle || '' : '',
  prioridad: trabajo?.prioridad || 'REGULAR',
  hora_inicio: trabajo?.hora_inicio || getCurrentTime(),
  tecnicos: Array.isArray(trabajo?.tecnicos) ? trabajo.tecnicos : [],
});

const getErrorMessage = (error, fallback = 'No se pudo guardar la orden de trabajo.') => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) return detail[0];

  if (detail && typeof detail === 'object') {
    const firstDetail = Object.values(detail)[0];
    if (Array.isArray(firstDetail) && firstDetail.length > 0) return firstDetail[0];
    if (typeof firstDetail === 'string') return firstDetail;
  }

  const data = error?.response?.data;
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') {
    const firstEntry = Object.values(data)[0];
    if (Array.isArray(firstEntry) && firstEntry.length > 0) return firstEntry[0];
    if (typeof firstEntry === 'string') return firstEntry;
  }

  return fallback;
};

export default function TrabajoFormSheet({
  visible,
  onClose,
  onCreated,
  onSaved,
  trabajo = null,
}) {
  const [form, setForm] = useState(createInitialForm);
  const [maquinarias, setMaquinarias] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [tecnicoSearch, setTecnicoSearch] = useState('');
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [error, setError] = useState('');

  const createTrabajo = useCreateTrabajo();
  const patchTrabajo = usePatchTrabajo();
  const isEdit = Boolean(trabajo?.id);
  const ubicacionEsCampo = form.lugar === 'CAMPO';
  const isSubmitting = createTrabajo.isPending || patchTrabajo.isPending;

  useEffect(() => {
    if (!visible) return;

    let mounted = true;

    const loadCatalogs = async () => {
      setForm(isEdit ? createFormFromTrabajo(trabajo) : createInitialForm());
      setTecnicoSearch('');
      setError('');
      setLoadingCatalogs(true);

      try {
        const [maquinariasRes, ubicacionesRes, trabajadoresRes, usersRes] = await Promise.all([
          maquinariaAPI.list(),
          ubicacionClienteAPI.list(),
          trabajadorAPI.list(),
          userAPI.list(),
        ]);

        if (!mounted) return;

        const rolesByTrabajador = (usersRes.data || []).reduce((acc, user) => {
          const trabajadorId = getTrabajadorIdFromUser(user);
          if (!trabajadorId) return acc;
          acc[trabajadorId] = Array.isArray(user.roles) ? user.roles.filter(Boolean) : [];
          return acc;
        }, {});

        const tecnicosAsignables = (trabajadoresRes.data || [])
          .filter((trabajador) => {
            const roles = rolesByTrabajador[trabajador.id] || [];
            return roles
              .map(normalizeRole)
              .some((role) => ROLES_ASIGNABLES.includes(role));
          })
          .map((trabajador) => ({
            ...trabajador,
            roles: rolesByTrabajador[trabajador.id] || [],
          }))
          .sort((a, b) =>
            `${a.nombres || ''} ${a.apellidos || ''}`
              .trim()
              .localeCompare(`${b.nombres || ''} ${b.apellidos || ''}`.trim())
          );

        setMaquinarias(maquinariasRes.data || []);
        setUbicaciones(ubicacionesRes.data || []);
        setTecnicos(tecnicosAsignables);
      } catch (loadError) {
        if (mounted) {
          setError(getErrorMessage(loadError, 'No se pudieron cargar los datos de la orden.'));
        }
      } finally {
        if (mounted) setLoadingCatalogs(false);
      }
    };

    loadCatalogs();

    return () => {
      mounted = false;
    };
  }, [isEdit, trabajo, visible]);

  const maquinariaOptions = useMemo(
    () =>
      maquinarias.map((maquinaria) => ({
        value: maquinaria.id,
        label: `${maquinaria.codigo_maquina || 'SIN-COD'} - ${maquinaria.nombre || 'Maquinaria'}`,
      })),
    [maquinarias]
  );

  const ubicacionOptions = useMemo(
    () =>
      ubicaciones.map((ubicacion) => {
        const label = `${ubicacion.cliente_nombre || 'Cliente'} - ${ubicacion.nombre || 'Ubicacion'}`;
        return {
          value: label,
          label,
        };
      }),
    [ubicaciones]
  );

  const filteredTecnicos = useMemo(() => {
    const term = tecnicoSearch.trim().toLowerCase();
    if (!term) return tecnicos;

    return tecnicos.filter((tecnico) => {
      const fullName = `${tecnico.nombres || ''} ${tecnico.apellidos || ''}`.trim();
      const searchBase = [
        fullName,
        tecnico.codigo || '',
        tecnico.puesto || '',
        ...(Array.isArray(tecnico.roles) ? tecnico.roles : []),
      ]
        .join(' ')
        .toLowerCase();

      return searchBase.includes(term);
    });
  }, [tecnicos, tecnicoSearch]);

  const toggleTecnico = (id) => {
    setForm((current) => {
      const actuales = current.tecnicos || [];
      return {
        ...current,
        tecnicos: actuales.includes(id)
          ? actuales.filter((tecnicoId) => tecnicoId !== id)
          : [...actuales, id],
      };
    });
  };

  const handleCreate = async () => {
    setError('');

    if (!form.maquinaria) {
      setError('Selecciona una maquinaria.');
      return;
    }

    const fecha = buildFechaValue(form);

    if (!fecha) {
      setError('La fecha es obligatoria.');
      return;
    }

    if (!isValidFechaParts(form)) {
      setError('Ingresa una fecha valida.');
      return;
    }

    if (ubicacionEsCampo && !form.ubicacion_detalle) {
      setError('Selecciona una ubicacion cuando el trabajo se realiza en campo.');
      return;
    }

    const payload = {
      maquinaria: form.maquinaria,
      fecha,
      lugar: form.lugar,
      ubicacion_detalle: ubicacionEsCampo ? form.ubicacion_detalle : '',
      prioridad: form.prioridad,
      hora_inicio: form.hora_inicio,
      estatus: isEdit ? trabajo?.estatus || 'PENDIENTE' : 'PENDIENTE',
      tecnicos: form.tecnicos,
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === null) {
        delete payload[key];
      }
      if (!isEdit && payload[key] === '') {
        delete payload[key];
      }
      if (!isEdit && Array.isArray(payload[key]) && payload[key].length === 0) {
        delete payload[key];
      }
    });

    try {
      const response = isEdit
        ? await patchTrabajo.mutateAsync({ id: trabajo.id, data: payload })
        : await createTrabajo.mutateAsync(payload);

      if (isEdit) {
        onSaved?.(response.data);
      } else {
        onCreated?.(response.data);
      }
      onClose?.();
    } catch (saveError) {
      setError(
        getErrorMessage(
          saveError,
          isEdit
            ? 'No se pudo actualizar la orden de trabajo.'
            : 'No se pudo crear la orden de trabajo.'
        )
      );
    }
  };

  return (
    <AppSheet
      visible={visible}
      onClose={onClose}
      icon={isEdit ? 'create-outline' : 'add-circle-outline'}
      title={isEdit ? 'Editar orden' : 'Nueva orden'}
      subtitle={
        isEdit
          ? 'Actualiza la informacion general y los tecnicos asignados desde movil'
          : 'Completa la informacion general y asigna tecnicos desde movil'
      }
      footer={
        <View style={styles.footerRow}>
          <Pressable
            style={styles.cancelButton}
            onPress={onClose}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>

          <Pressable
            style={[
              styles.saveButton,
              (loadingCatalogs || isSubmitting) ? styles.saveButtonDisabled : null,
            ]}
            onPress={handleCreate}
            disabled={loadingCatalogs || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size='small' color={colors.white} />
            ) : (
              <Ionicons name='save-outline' size={16} color={colors.white} />
            )}
            <Text style={styles.saveText}>
              {isSubmitting ? 'Guardando...' : isEdit ? 'Actualizar orden' : 'Crear orden'}
            </Text>
          </Pressable>
        </View>
      }
    >
      {loadingCatalogs ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator size='large' color={colors.navy} />
          <Text style={styles.loadingText}>Cargando datos para la orden...</Text>
        </View>
      ) : (
        <>
          {error ? (
            <View style={styles.errorCard}>
              <Ionicons name='alert-circle-outline' size={18} color={colors.red} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.infoBanner}>
            <View style={styles.infoBannerIcon}>
              <Ionicons name='document-text-outline' size={18} color={colors.navy} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoBannerTitle}>
                {isEdit ? 'Estas editando la orden actual' : 'La orden se creara como pendiente'}
              </Text>
              <Text style={styles.infoBannerText}>
                {isEdit
                  ? 'Actualiza los datos generales y los tecnicos asignados segun la operacion real.'
                  : 'Aqui puedes dejar lista la informacion general y los tecnicos asignados.'}
              </Text>
            </View>
          </View>

          <View style={styles.block}>
            <Text style={styles.blockTitle}>Informacion general</Text>

            <AppSelect
              label='Maquinaria *'
              value={form.maquinaria}
              options={maquinariaOptions}
              onChange={(value) => setForm((current) => ({ ...current, maquinaria: value }))}
              placeholder='Selecciona una maquinaria'
            />

            <DatePartsInput
              label='Fecha *'
              day={form.fechaDia}
              month={form.fechaMes}
              year={form.fechaAnio}
              onChangeDay={(value) =>
                setForm((current) => ({ ...current, fechaDia: sanitizeNumericInput(value, 2) }))
              }
              onChangeMonth={(value) =>
                setForm((current) => ({ ...current, fechaMes: sanitizeNumericInput(value, 2) }))
              }
              onChangeYear={(value) =>
                setForm((current) => ({ ...current, fechaAnio: sanitizeNumericInput(value, 4) }))
              }
            />

            <AppSelect
              label='Lugar'
              value={form.lugar}
              options={LUGAR_OPTIONS}
              onChange={(value) => {
                setForm((current) => ({
                  ...current,
                  lugar: value,
                  ubicacion_detalle: value === 'CAMPO' ? current.ubicacion_detalle : '',
                }));
                if (error) setError('');
              }}
            />

            <AppSelect
              label='Prioridad'
              value={form.prioridad}
              options={PRIORIDAD_OPTIONS}
              onChange={(value) => setForm((current) => ({ ...current, prioridad: value }))}
            />

            <AppSelect
              label={`Ubicacion exacta${ubicacionEsCampo ? ' *' : ''}`}
              value={ubicacionEsCampo ? form.ubicacion_detalle : ''}
              options={ubicacionOptions}
              onChange={(value) => setForm((current) => ({ ...current, ubicacion_detalle: value }))}
              placeholder={ubicacionEsCampo ? 'Selecciona una ubicacion' : 'Taller'}
              disabled={!ubicacionEsCampo}
            />
            <Text style={styles.fieldHelper}>
              {ubicacionEsCampo
                ? 'Selecciona la ubicacion del cliente porque la orden se realizara en campo.'
                : 'Cuando el lugar es taller, la ubicacion ya no es necesaria y se asume automaticamente.'}
            </Text>
          </View>

          <View style={styles.block}>
            <Text style={styles.blockTitle}>Tecnicos asignados</Text>
            <Text style={styles.blockHelper}>
              Solo veras trabajadores que tengan usuario con rol Tecnico o Jefe de Tecnicos.
            </Text>

            {tecnicos.length > 0 ? (
              <FieldInput
                label='Buscar tecnico'
                value={tecnicoSearch}
                onChangeText={setTecnicoSearch}
                placeholder='Buscar por nombre, apellido o codigo'
              />
            ) : null}

            {tecnicos.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name='people-outline' size={18} color={colors.textSoft} />
                <Text style={styles.emptyText}>
                  No se encontraron tecnicos asignables en este momento.
                </Text>
              </View>
            ) : filteredTecnicos.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name='search-outline' size={18} color={colors.textSoft} />
                <Text style={styles.emptyText}>
                  No hay tecnicos que coincidan con la busqueda actual.
                </Text>
              </View>
            ) : (
              <View style={styles.tecnicoList}>
                {filteredTecnicos.map((tecnico) => {
                  const selected = form.tecnicos.includes(tecnico.id);
                  const fullName =
                    `${tecnico.nombres || ''} ${tecnico.apellidos || ''}`.trim() ||
                    `Trabajador #${tecnico.id}`;

                  return (
                    <Pressable
                      key={tecnico.id}
                      style={[styles.tecnicoCard, selected ? styles.tecnicoCardSelected : null]}
                      onPress={() => toggleTecnico(tecnico.id)}
                    >
                      <View
                        style={[
                          styles.tecnicoCheck,
                          selected ? styles.tecnicoCheckSelected : null,
                        ]}
                      >
                        <Ionicons
                          name={selected ? 'checkmark' : 'person-outline'}
                          size={16}
                          color={selected ? colors.white : colors.navy}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.tecnicoName,
                            selected ? styles.tecnicoNameSelected : null,
                          ]}
                        >
                          {fullName}
                        </Text>
                        <Text
                          style={[
                            styles.tecnicoMeta,
                            selected ? styles.tecnicoMetaSelected : null,
                          ]}
                        >
                          {tecnico.roles?.join(', ') || tecnico.puesto || 'Tecnico asignable'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </>
      )}
    </AppSheet>
  );
}

function FieldInput({ label, value, onChangeText, placeholder }) {
  return (
    <View style={styles.inputBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSoft}
        style={styles.input}
        autoCapitalize='none'
      />
    </View>
  );
}

function DatePartsInput({
  label,
  day,
  month,
  year,
  onChangeDay,
  onChangeMonth,
  onChangeYear,
}) {
  return (
    <View style={styles.inputBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.dateRow}>
        <TextInput
          value={day}
          onChangeText={onChangeDay}
          placeholder='DD'
          placeholderTextColor={colors.textSoft}
          style={[styles.input, styles.dateInput]}
          keyboardType='number-pad'
          maxLength={2}
          textAlign='center'
        />
        <Text style={styles.dateSeparator}>/</Text>
        <TextInput
          value={month}
          onChangeText={onChangeMonth}
          placeholder='MM'
          placeholderTextColor={colors.textSoft}
          style={[styles.input, styles.dateInput]}
          keyboardType='number-pad'
          maxLength={2}
          textAlign='center'
        />
        <Text style={styles.dateSeparator}>/</Text>
        <TextInput
          value={year}
          onChangeText={onChangeYear}
          placeholder='AAAA'
          placeholderTextColor={colors.textSoft}
          style={[styles.input, styles.dateInputYear]}
          keyboardType='number-pad'
          maxLength={4}
          textAlign='center'
        />
      </View>
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
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
  },
  saveButton: {
    flex: 1.4,
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
  loadingBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#F3C4C0',
    backgroundColor: colors.redSoft,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: colors.red,
    fontWeight: '600',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.navySoft,
    padding: 16,
    marginBottom: 18,
  },
  infoBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  infoBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy,
  },
  infoBannerText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    color: colors.navy,
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
  blockHelper: {
    marginBottom: 12,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
  inputBlock: {
    marginBottom: 16,
  },
  fieldLabel: {
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.textMuted,
  },
  fieldHelper: {
    marginTop: -6,
    marginBottom: 16,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 15,
    ...shadows.soft,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateInput: {
    flex: 0.7,
    paddingHorizontal: 12,
  },
  dateInputYear: {
    flex: 1.1,
    paddingHorizontal: 12,
  },
  dateSeparator: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textMuted,
  },
  emptyCard: {
    minHeight: 64,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
  tecnicoList: {
    gap: 10,
  },
  tecnicoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 14,
  },
  tecnicoCardSelected: {
    borderColor: '#BED2FF',
    backgroundColor: colors.navySoft,
  },
  tecnicoCheck: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  tecnicoCheckSelected: {
    backgroundColor: colors.navy,
  },
  tecnicoName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  tecnicoNameSelected: {
    color: colors.navy,
  },
  tecnicoMeta: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  tecnicoMetaSelected: {
    color: colors.navy,
  },
});
