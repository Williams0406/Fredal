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
import AppTextArea from '../ui/AppTextArea';
import { useCreateTrabajo } from '../../hooks/useTrabajos';
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

const getToday = () => new Date().toISOString().split('T')[0];
const getCurrentTime = () => new Date().toTimeString().slice(0, 5);

const createInitialForm = () => ({
  maquinaria: null,
  fecha: getToday(),
  lugar: 'TALLER',
  ubicacion_detalle: '',
  prioridad: 'REGULAR',
  observaciones: '',
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

const getErrorMessage = (error) => {
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

  return 'No se pudo crear la orden de trabajo.';
};

export default function TrabajoFormSheet({ visible, onClose, onCreated }) {
  const [form, setForm] = useState(createInitialForm);
  const [maquinarias, setMaquinarias] = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [error, setError] = useState('');

  const createTrabajo = useCreateTrabajo();

  useEffect(() => {
    if (!visible) return;

    let mounted = true;

    const loadCatalogs = async () => {
      setForm(createInitialForm());
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
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (mounted) setLoadingCatalogs(false);
      }
    };

    loadCatalogs();

    return () => {
      mounted = false;
    };
  }, [visible]);

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

    if (!form.fecha?.trim()) {
      setError('La fecha es obligatoria.');
      return;
    }

    if (!form.ubicacion_detalle) {
      setError('Selecciona una ubicacion.');
      return;
    }

    const payload = {
      maquinaria: form.maquinaria,
      fecha: form.fecha.trim(),
      lugar: form.lugar,
      ubicacion_detalle: form.ubicacion_detalle,
      prioridad: form.prioridad,
      observaciones: form.observaciones?.trim() || '',
      hora_inicio: form.hora_inicio,
      estatus: 'PENDIENTE',
      tecnicos: form.tecnicos,
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === '' || payload[key] === null) {
        delete payload[key];
      }
      if (Array.isArray(payload[key]) && payload[key].length === 0) {
        delete payload[key];
      }
    });

    try {
      const response = await createTrabajo.mutateAsync(payload);
      onCreated?.(response.data);
      onClose?.();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    }
  };

  return (
    <AppSheet
      visible={visible}
      onClose={onClose}
      icon='add-circle-outline'
      title='Nueva orden'
      subtitle='Completa la informacion general y asigna tecnicos desde movil'
      footer={
        <View style={styles.footerRow}>
          <Pressable
            style={styles.cancelButton}
            onPress={onClose}
            disabled={createTrabajo.isPending}
          >
            <Text style={styles.cancelText}>Cancelar</Text>
          </Pressable>

          <Pressable
            style={[
              styles.saveButton,
              (loadingCatalogs || createTrabajo.isPending) ? styles.saveButtonDisabled : null,
            ]}
            onPress={handleCreate}
            disabled={loadingCatalogs || createTrabajo.isPending}
          >
            {createTrabajo.isPending ? (
              <ActivityIndicator size='small' color={colors.white} />
            ) : (
              <Ionicons name='save-outline' size={16} color={colors.white} />
            )}
            <Text style={styles.saveText}>
              {createTrabajo.isPending ? 'Guardando...' : 'Crear orden'}
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
              <Text style={styles.infoBannerTitle}>La orden se creara como pendiente</Text>
              <Text style={styles.infoBannerText}>
                Aqui puedes dejar lista la informacion general y los tecnicos asignados.
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

            <FieldInput
              label='Fecha *'
              value={form.fecha}
              onChangeText={(value) => setForm((current) => ({ ...current, fecha: value }))}
              placeholder='AAAA-MM-DD'
            />

            <AppSelect
              label='Lugar'
              value={form.lugar}
              options={LUGAR_OPTIONS}
              onChange={(value) => setForm((current) => ({ ...current, lugar: value }))}
            />

            <AppSelect
              label='Prioridad'
              value={form.prioridad}
              options={PRIORIDAD_OPTIONS}
              onChange={(value) => setForm((current) => ({ ...current, prioridad: value }))}
            />

            <AppSelect
              label='Ubicacion *'
              value={form.ubicacion_detalle}
              options={ubicacionOptions}
              onChange={(value) => setForm((current) => ({ ...current, ubicacion_detalle: value }))}
              placeholder='Selecciona una ubicacion'
            />

            <AppTextArea
              label='Observaciones'
              value={form.observaciones}
              onChange={(value) => setForm((current) => ({ ...current, observaciones: value }))}
              placeholder='Detalles adicionales sobre la orden, hallazgos o notas previas...'
              rows={4}
            />
          </View>

          <View style={styles.block}>
            <Text style={styles.blockTitle}>Tecnicos asignados</Text>
            <Text style={styles.blockHelper}>
              Solo veras trabajadores que tengan usuario con rol Tecnico o Jefe de Tecnicos.
            </Text>

            {tecnicos.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name='people-outline' size={18} color={colors.textSoft} />
                <Text style={styles.emptyText}>
                  No se encontraron tecnicos asignables en este momento.
                </Text>
              </View>
            ) : (
              <View style={styles.tecnicoList}>
                {tecnicos.map((tecnico) => {
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
