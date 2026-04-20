import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  useDeleteActividadEvidencia,
  useUploadActividadEvidencias,
} from '../../hooks/useActividades';
import {
  itemAPI,
  movimientoConsumibleAPI,
  movimientoRepuestoAPI,
  trabajoAPI,
  trabajadorAPI,
} from '../../lib/api';
import { API_URL } from '../../lib/constants';
import AppSheet from '../ui/AppSheet';
import { colors, radius } from '../../lib/theme';

const TYPE_OPTIONS = [
  {
    value: 'REPUESTO',
    label: 'Repuesto',
    icon: 'cog-outline',
    description: 'Selecciona una unidad fisica con serie o identificador.',
  },
  {
    value: 'CONSUMIBLE',
    label: 'Consumible',
    icon: 'flask-outline',
    description: 'Registra cantidad utilizada desde el stock disponible.',
  },
];

const createInitialForm = (tecnico = '') => ({
  item: '',
  item_unidad: '',
  cantidad: '1',
  tecnico,
});

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.detail ||
  error?.response?.data?.non_field_errors?.[0] ||
  (typeof error?.response?.data === 'object'
    ? Object.values(error.response.data).flat().join(' ')
    : '') ||
  fallback;

const resolveMediaUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://')) {
    return url;
  }

  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const mergePickedAssets = (current, assets = []) => {
  const seenUris = new Set(current.map((item) => item.uri));
  const next = [...current];

  assets.forEach((asset, index) => {
    if (!asset?.uri || asset.type === 'video' || seenUris.has(asset.uri)) return;

    seenUris.add(asset.uri);
    next.push({
      uri: asset.uri,
      name: asset.fileName || `evidencia-${Date.now()}-${index + 1}.jpg`,
      type: asset.mimeType || 'image/jpeg',
      file: asset.file,
    });
  });

  return next;
};

export default function MovimientoModal({ actividad, trabajoId, onClose }) {
  const qc = useQueryClient();
  const uploadEvidencias = useUploadActividadEvidencias(trabajoId);
  const deleteEvidencia = useDeleteActividadEvidencia(trabajoId);

  const [tipo, setTipo] = useState('REPUESTO');
  const [items, setItems] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [stockConsumible, setStockConsumible] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [evidenciasPendientes, setEvidenciasPendientes] = useState([]);
  const [evidenciasGuardadas, setEvidenciasGuardadas] = useState([]);
  const [removingEvidenceId, setRemovingEvidenceId] = useState(null);
  const [form, setForm] = useState(createInitialForm());

  const isMaintenance = actividad?.tipo_actividad === 'MANTENIMIENTO';
  const esActPlanificada = Boolean(actividad?.es_planificada);
  const canManageEvidence = !esActPlanificada;
  const selectedItem = items.find((item) => String(item.id) === String(form.item));
  const isBusy = saving || uploadEvidencias.isPending || deleteEvidencia.isPending;

  useEffect(() => {
    setTipo('REPUESTO');
    setForm(createInitialForm());
    setUnidades([]);
    setStockConsumible(0);
    setError('');
    setRemovingEvidenceId(null);
    setEvidenciasPendientes([]);
    setEvidenciasGuardadas(Array.isArray(actividad?.evidencias) ? actividad.evidencias : []);
  }, [actividad?.id, actividad?.evidencias]);

  useEffect(() => {
    if (!actividad?.id) return;

    setLoading(true);
    setError('');

    const requests = isMaintenance
      ? [
          itemAPI.list({ actividad: actividad.id, disponibles: 1 }),
          trabajoAPI.retrieve(trabajoId),
          trabajadorAPI.list(),
        ]
      : [trabajoAPI.retrieve(trabajoId), trabajadorAPI.list()];

    Promise.all(requests)
      .then((responses) => {
        if (isMaintenance) {
          const [itemsRes, trabajoRes, trabRes] = responses;
          setItems(itemsRes.data || []);
          const ids = trabajoRes.data?.tecnicos || [];
          setTecnicos((trabRes.data || []).filter((trabajador) => ids.includes(trabajador.id)));
          return;
        }

        const [trabajoRes, trabRes] = responses;
        setItems([]);
        const ids = trabajoRes.data?.tecnicos || [];
        setTecnicos((trabRes.data || []).filter((trabajador) => ids.includes(trabajador.id)));
      })
      .catch(() =>
        setError(
          isMaintenance
            ? 'No se pudieron cargar los materiales disponibles.'
            : 'No se pudo cargar la informacion de la actividad.'
        )
      )
      .finally(() => setLoading(false));
  }, [actividad?.id, isMaintenance, trabajoId]);

  useEffect(() => {
    if (!isMaintenance) return;

    setError('');
    setForm((prev) => ({ ...prev, item_unidad: '', cantidad: '1' }));

    if (!form.item) {
      setUnidades([]);
      setStockConsumible(0);
      return;
    }

    if (tipo === 'REPUESTO') {
      itemAPI
        .unidadesAsignables(form.item, { actividad: actividad.id })
        .then((response) => setUnidades(response.data || []))
        .catch(() => setUnidades([]));
      setStockConsumible(0);
      return;
    }

    itemAPI
      .lotesDisponibles(form.item, { actividad: actividad.id })
      .then((response) => setStockConsumible(Number(response.data?.cantidad_disponible || 0)))
      .catch(() => setStockConsumible(0));
    setUnidades([]);
  }, [actividad?.id, form.item, isMaintenance, tipo]);

  const filteredItems = useMemo(
    () => items.filter((item) => item.tipo_insumo === tipo),
    [items, tipo]
  );

  const helperText = esActPlanificada
    ? 'Esta actividad es planificada: el tecnico es obligatorio para registrar el movimiento.'
    : isMaintenance
      ? 'Puedes registrar materiales y adjuntar evidencias desde este modal.'
      : 'Usa este modal para adjuntar evidencias fotograficas de la revision realizada.';

  const resetMovementForm = () => {
    setForm((prev) => createInitialForm(prev.tecnico));
    setUnidades([]);
    setStockConsumible(0);
  };

  const appendAssets = (assets = []) => {
    setEvidenciasPendientes((current) => mergePickedAssets(current, assets));
  };

  const handlePickFromLibrary = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permiso requerido',
          'Necesitamos acceso a tu galeria para adjuntar evidencias del trabajo.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        orderedSelection: true,
        selectionLimit: 0,
        quality: 0.8,
      });

      if (!result.canceled) {
        appendAssets(result.assets);
      }
    } catch {
      Alert.alert('Error', 'No se pudo abrir la galeria.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permiso requerido',
          'Necesitamos acceso a tu camara para tomar evidencias del trabajo.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        cameraType: ImagePicker.CameraType.back,
        quality: 0.8,
      });

      if (!result.canceled) {
        appendAssets(result.assets);
      }
    } catch {
      Alert.alert('Error', 'No se pudo abrir la camara.');
    }
  };

  const handleRemovePendingEvidence = (uri) => {
    setEvidenciasPendientes((current) => current.filter((item) => item.uri !== uri));
  };

  const handleDeleteSavedEvidence = (evidenciaId) => {
    Alert.alert('Eliminar evidencia', 'Esta imagen se quitara de la actividad.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setRemovingEvidenceId(evidenciaId);
          try {
            const response = await deleteEvidencia.mutateAsync({
              actividadId: actividad.id,
              evidenciaId,
            });
            setEvidenciasGuardadas(response?.data?.evidencias || []);
          } catch (err) {
            Alert.alert(
              'Error',
              getErrorMessage(err, 'No se pudo eliminar la evidencia seleccionada.')
            );
          } finally {
            setRemovingEvidenceId(null);
          }
        },
      },
    ]);
  };

  const handleSave = async () => {
    setError('');

    const hasMovementDraft = isMaintenance && Boolean(form.item);
    const hasPendingEvidence = canManageEvidence && evidenciasPendientes.length > 0;

    if (!hasMovementDraft && !hasPendingEvidence) {
      onClose();
      return;
    }

    if (hasMovementDraft) {
      if (tipo === 'REPUESTO' && !form.item_unidad) {
        setError('Selecciona una unidad disponible.');
        return;
      }

      if (tipo === 'CONSUMIBLE') {
        const cantidad = Number(form.cantidad);
        if (!cantidad || cantidad <= 0) {
          setError('Ingresa una cantidad valida.');
          return;
        }
        if (cantidad > stockConsumible) {
          setError('La cantidad excede el stock disponible.');
          return;
        }
      }

      if (esActPlanificada && !form.tecnico) {
        setError('Selecciona el tecnico responsable.');
        return;
      }
    }

    setSaving(true);
    let movementSaved = false;

    try {
      if (hasMovementDraft) {
        if (tipo === 'REPUESTO') {
          const payload = {
            actividad: actividad.id,
            item_unidad: Number(form.item_unidad),
          };
          if (form.tecnico) payload.tecnico = Number(form.tecnico);
          await movimientoRepuestoAPI.create(payload);
        } else {
          const payload = {
            actividad: actividad.id,
            item: Number(form.item),
            cantidad: Number(form.cantidad),
          };
          if (form.tecnico) payload.tecnico = Number(form.tecnico);
          await movimientoConsumibleAPI.create(payload);
        }

        movementSaved = true;
        resetMovementForm();
      }

      if (hasPendingEvidence) {
        const response = await uploadEvidencias.mutateAsync({
          id: actividad.id,
          imagenes: evidenciasPendientes,
        });
        setEvidenciasGuardadas(response?.data?.evidencias || []);
        setEvidenciasPendientes([]);
      }

      qc.invalidateQueries({ queryKey: ['actividades', trabajoId] });
      qc.invalidateQueries({ queryKey: ['trabajo', trabajoId] });
      onClose();
    } catch (err) {
      if (movementSaved) {
        qc.invalidateQueries({ queryKey: ['actividades', trabajoId] });
        qc.invalidateQueries({ queryKey: ['trabajo', trabajoId] });
        setError(
          getErrorMessage(
            err,
            'El movimiento se guardo, pero no se pudieron subir las evidencias. Puedes intentarlo nuevamente.'
          )
        );
      } else {
        setError(getErrorMessage(err, 'No se pudieron guardar los cambios.'));
      }
    } finally {
      setSaving(false);
    }
  };

  const submitTitle = saving ? 'Guardando...' : isMaintenance ? 'Guardar cambios' : 'Guardar evidencias';
  const totalEvidencias = evidenciasGuardadas.length + evidenciasPendientes.length;

  return (
    <AppSheet
      visible
      onClose={onClose}
      icon={isMaintenance ? 'cube-outline' : 'images-outline'}
      title={isMaintenance ? 'Registrar materiales y evidencias' : 'Registrar evidencias'}
      subtitle={
        isMaintenance
          ? `${actividad?.tipo_mantenimiento || 'Mantenimiento'} · ${actividad?.subtipo || 'Sin subtipo'}`
          : 'Actividad de revision'
      }
      footer={
        !loading ? (
          <View style={styles.footerRow}>
            <Pressable style={styles.cancelButton} onPress={onClose} disabled={isBusy}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.submitButton, isBusy ? styles.submitButtonDisabled : null]}
              onPress={handleSave}
              disabled={isBusy}
            >
              {isBusy ? (
                <ActivityIndicator size='small' color={colors.white} />
              ) : (
                <Ionicons name='save-outline' size={17} color={colors.white} />
              )}
              <Text style={styles.submitText}>{submitTitle}</Text>
            </Pressable>
          </View>
        ) : null
      }
    >
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size='large' color={colors.navy} />
          <Text style={styles.loadingText}>
            {isMaintenance ? 'Cargando materiales disponibles...' : 'Cargando actividad...'}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.infoBanner}>
            <Ionicons name='information-circle-outline' size={18} color={colors.navy} />
            <Text style={styles.infoBannerText}>{helperText}</Text>
          </View>

          {error ? (
            <View style={styles.errorCard}>
              <Ionicons name='close-circle-outline' size={18} color={colors.red} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {isMaintenance ? (
            <>
              <View style={styles.block}>
                <Text style={styles.blockTitle}>Tipo de material</Text>
                <View style={styles.typeStack}>
                  {TYPE_OPTIONS.map((option) => {
                    const selected = tipo === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        style={[styles.typeCard, selected ? styles.typeCardSelected : null]}
                        onPress={() => {
                          setTipo(option.value);
                          setForm((prev) => ({
                            ...prev,
                            item: '',
                            item_unidad: '',
                            cantidad: '1',
                          }));
                        }}
                      >
                        <View
                          style={[styles.typeIconWrap, selected ? styles.typeIconWrapSelected : null]}
                        >
                          <Ionicons
                            name={option.icon}
                            size={20}
                            color={selected ? colors.white : colors.navy}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[styles.typeTitle, selected ? styles.typeTitleSelected : null]}
                          >
                            {option.label}
                          </Text>
                          <Text
                            style={[
                              styles.typeDescription,
                              selected ? styles.typeDescriptionSelected : null,
                            ]}
                          >
                            {option.description}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.block}>
                <Text style={styles.blockTitle}>Selecciona el material</Text>
                {filteredItems.length === 0 ? (
                  <View style={styles.emptyListCard}>
                    <Ionicons name='cube-outline' size={26} color={colors.textSoft} />
                    <Text style={styles.emptyListTitle}>No hay materiales disponibles</Text>
                    <Text style={styles.emptyListText}>
                      No encontramos {tipo === 'REPUESTO' ? 'repuestos' : 'consumibles'} listos
                      para usar.
                    </Text>
                  </View>
                ) : (
                  filteredItems.map((item) => {
                    const selected = String(form.item) === String(item.id);
                    return (
                      <Pressable
                        key={item.id}
                        style={[styles.materialCard, selected ? styles.materialCardSelected : null]}
                        onPress={() =>
                          setForm((prev) => ({
                            ...prev,
                            item: String(item.id),
                            item_unidad: '',
                            cantidad: '1',
                          }))
                        }
                      >
                        <View
                          style={[
                            styles.materialIconWrap,
                            selected ? styles.materialIconWrapSelected : null,
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={tipo === 'REPUESTO' ? 'cog-outline' : 'flask-outline'}
                            size={18}
                            color={selected ? colors.white : colors.navy}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.materialTitle,
                              selected ? styles.materialTitleSelected : null,
                            ]}
                          >
                            {item.codigo} · {item.nombre}
                          </Text>
                          <Text
                            style={[
                              styles.materialMeta,
                              selected ? styles.materialMetaSelected : null,
                            ]}
                          >
                            {tipo === 'REPUESTO'
                              ? 'Material serializado listo para asignar'
                              : `Unidad base: ${item.unidad_medida_simbolo || item.unidad_medida_detalle?.nombre || 'configurada'}`}
                          </Text>
                        </View>
                        {selected ? (
                          <Ionicons name='checkmark-circle' size={18} color={colors.navy} />
                        ) : null}
                      </Pressable>
                    );
                  })
                )}
              </View>

              {tipo === 'REPUESTO' && form.item ? (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>Unidad disponible</Text>
                  {unidades.length === 0 ? (
                    <View style={styles.errorCard}>
                      <Ionicons name='alert-circle-outline' size={18} color={colors.red} />
                      <Text style={styles.errorText}>
                        No hay unidades disponibles para este repuesto.
                      </Text>
                    </View>
                  ) : (
                    unidades.map((unidad) => {
                      const selected = String(form.item_unidad) === String(unidad.id);
                      return (
                        <Pressable
                          key={unidad.id}
                          style={[styles.unitCard, selected ? styles.unitCardSelected : null]}
                          onPress={() =>
                            setForm((prev) => ({ ...prev, item_unidad: String(unidad.id) }))
                          }
                        >
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[styles.unitTitle, selected ? styles.unitTitleSelected : null]}
                            >
                              {unidad.serie ? `S/N ${unidad.serie}` : `Unidad ${unidad.id}`}
                            </Text>
                            <Text
                              style={[styles.unitMeta, selected ? styles.unitMetaSelected : null]}
                            >
                              Estado: {unidad.estado}
                            </Text>
                          </View>
                          {selected ? (
                            <Ionicons name='checkmark-circle' size={18} color={colors.navy} />
                          ) : null}
                        </Pressable>
                      );
                    })
                  )}
                </View>
              ) : null}

              {tipo === 'CONSUMIBLE' && form.item ? (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>Cantidad consumida</Text>
                  <TextInput
                    value={form.cantidad}
                    onChangeText={(value) => setForm((prev) => ({ ...prev, cantidad: value }))}
                    keyboardType='decimal-pad'
                    placeholder='0'
                    placeholderTextColor={colors.textSoft}
                    style={styles.input}
                  />
                  <Text style={styles.helperText}>
                    Stock disponible: {stockConsumible.toFixed(2)}{' '}
                    {selectedItem?.unidad_medida_simbolo || ''}
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}

          {esActPlanificada && tecnicos.length > 0 ? (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>Tecnico *</Text>
              <View style={styles.typeStack}>
                {tecnicos.map((tecnico) => {
                  const selected = String(form.tecnico) === String(tecnico.id);
                  return (
                    <Pressable
                      key={tecnico.id}
                      style={[styles.techCard, selected ? styles.techCardSelected : null]}
                      onPress={() =>
                        setForm((prev) => ({
                          ...prev,
                          tecnico: selected ? '' : String(tecnico.id),
                        }))
                      }
                    >
                      <View style={styles.techAvatar}>
                        <Ionicons
                          name='person-outline'
                          size={16}
                          color={selected ? colors.white : colors.navy}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.techTitle, selected ? styles.techTitleSelected : null]}
                        >
                          {tecnico.nombres} {tecnico.apellidos}
                        </Text>
                        <Text
                          style={[styles.techMeta, selected ? styles.techMetaSelected : null]}
                        >
                          Tecnico asignado a la orden
                        </Text>
                      </View>
                      {selected ? (
                        <Ionicons name='checkmark-circle' size={18} color={colors.navy} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {canManageEvidence ? (
            <View style={styles.block}>
              <View style={styles.evidenceHeaderRow}>
                <Text style={styles.blockTitle}>Evidencias fotograficas</Text>
                {totalEvidencias > 0 ? (
                  <Text style={styles.evidenceCount}>
                    {totalEvidencias}{' '}
                    {totalEvidencias === 1 ? 'imagen en la actividad' : 'imagenes en la actividad'}
                  </Text>
                ) : null}
              </View>

              <View style={styles.evidencePanel}>
                <Text style={styles.evidenceHelper}>
                  Adjunta fotos del trabajo realizado. Puedes guardar materiales y evidencias al
                  mismo tiempo o gestionar solo las imagenes.
                </Text>

                <View style={styles.evidenceActions}>
                  <Pressable
                    style={styles.evidenceActionButton}
                    onPress={handlePickFromLibrary}
                    disabled={isBusy}
                  >
                    <Ionicons name='images-outline' size={18} color={colors.navy} />
                    <Text style={styles.evidenceActionText}>Galeria</Text>
                  </Pressable>

                  <Pressable
                    style={styles.evidenceActionButton}
                    onPress={handleTakePhoto}
                    disabled={isBusy}
                  >
                    <Ionicons name='camera-outline' size={18} color={colors.navy} />
                    <Text style={styles.evidenceActionText}>Tomar foto</Text>
                  </Pressable>
                </View>

                {evidenciasPendientes.length > 0 ? (
                  <View style={styles.evidenceGroup}>
                    <Text style={styles.evidenceGroupTitle}>Pendientes por subir</Text>
                    <View style={styles.evidenceGrid}>
                      {evidenciasPendientes.map((imagen) => (
                        <View key={imagen.uri} style={styles.evidenceThumbWrap}>
                          <Image source={{ uri: imagen.uri }} style={styles.evidenceThumb} />
                          <Pressable
                            style={styles.removeEvidenceButton}
                            onPress={() => handleRemovePendingEvidence(imagen.uri)}
                            disabled={isBusy}
                          >
                            <Ionicons name='close' size={14} color={colors.white} />
                          </Pressable>
                          <Text style={styles.evidenceThumbMeta}>Pendiente</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {evidenciasGuardadas.length > 0 ? (
                  <View style={styles.evidenceGroup}>
                    <Text style={styles.evidenceGroupTitle}>Guardadas</Text>
                    <View style={styles.evidenceGrid}>
                      {evidenciasGuardadas.map((evidencia) => {
                        const uri = resolveMediaUrl(evidencia.url);
                        if (!uri) return null;

                        const isRemoving = removingEvidenceId === evidencia.id;

                        return (
                          <View key={evidencia.id} style={styles.evidenceThumbWrap}>
                            <Image source={{ uri }} style={styles.evidenceThumb} />
                            <Pressable
                              style={styles.removeEvidenceButton}
                              onPress={() => handleDeleteSavedEvidence(evidencia.id)}
                              disabled={isBusy}
                            >
                              {isRemoving ? (
                                <ActivityIndicator size='small' color={colors.white} />
                              ) : (
                                <Ionicons name='trash-outline' size={14} color={colors.white} />
                              )}
                            </Pressable>
                            <Text style={styles.evidenceThumbMeta} numberOfLines={1}>
                              {evidencia.nombre || `Evidencia ${evidencia.id}`}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                {evidenciasPendientes.length === 0 && evidenciasGuardadas.length === 0 ? (
                  <Text style={styles.evidenceEmpty}>
                    Todavia no hay fotos en esta actividad. Puedes guardarla sin evidencias si lo
                    necesitas.
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}
        </>
      )}
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
    flex: 1.65,
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.navy,
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
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.navySoft,
    padding: 14,
    marginBottom: 16,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: colors.navy,
    fontWeight: '600',
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
  typeStack: {
    gap: 10,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 16,
  },
  typeCardSelected: {
    borderColor: '#BFD2FF',
    backgroundColor: colors.navySoft,
  },
  typeIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  typeIconWrapSelected: {
    backgroundColor: colors.navy,
  },
  typeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  typeTitleSelected: {
    color: colors.navy,
  },
  typeDescription: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  typeDescriptionSelected: {
    color: colors.navy,
  },
  emptyListCard: {
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  emptyListTitle: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  emptyListText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
  },
  materialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 14,
    marginBottom: 10,
  },
  materialCardSelected: {
    borderColor: '#BFD2FF',
    backgroundColor: colors.navySoft,
  },
  materialIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  materialIconWrapSelected: {
    backgroundColor: colors.navy,
  },
  materialTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  materialTitleSelected: {
    color: colors.navy,
  },
  materialMeta: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },
  materialMetaSelected: {
    color: colors.navy,
  },
  unitCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  unitCardSelected: {
    borderColor: '#BFD2FF',
    backgroundColor: colors.navySoft,
  },
  unitTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  unitTitleSelected: {
    color: colors.navy,
  },
  unitMeta: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
  },
  unitMetaSelected: {
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
  techCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 14,
  },
  techCardSelected: {
    borderColor: '#BFD2FF',
    backgroundColor: colors.navySoft,
  },
  techAvatar: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  techTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  techTitleSelected: {
    color: colors.navy,
  },
  techMeta: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
  },
  techMetaSelected: {
    color: colors.navy,
  },
  evidenceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  evidencePanel: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 16,
  },
  evidenceHelper: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
  },
  evidenceActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  evidenceActionButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#CFE0FF',
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  evidenceActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
  },
  evidenceCount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  evidenceGroup: {
    marginTop: 16,
  },
  evidenceGroupTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: colors.textMuted,
    marginBottom: 10,
  },
  evidenceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  evidenceThumbWrap: {
    width: 92,
  },
  evidenceThumb: {
    width: 92,
    height: 92,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  evidenceThumbMeta: {
    marginTop: 6,
    fontSize: 11,
    color: colors.textMuted,
  },
  removeEvidenceButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 35, 70, 0.78)',
  },
  evidenceEmpty: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSoft,
  },
});
