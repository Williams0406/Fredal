// components/actividades/ActividadFormModal.jsx
import { useState } from 'react';
import { View, Text, Modal, ScrollView,
         TouchableOpacity, Alert } from 'react-native';
import { useCreateActividad } from '../../hooks/useActividades';
import AppSelect from '../ui/AppSelect';
import AppTextArea from '../ui/AppTextArea';

const TIPO_ACT = [{ value: 'REVISION', label: 'Revisión' },
                  { value: 'MANTENIMIENTO', label: 'Mantenimiento' }];
const TIPO_MANT = [
  { value: 'PREVENTIVO', label: 'Preventivo' },
  { value: 'CORRECTIVO', label: 'Correctivo' },
  { value: 'PREDICTIVO', label: 'Predictivo' },
];
const SUB_PREV = ['PM1','PM2','PM3','PM4'].map(v => ({ value: v, label: v }));
const SUB_CORR = ['LEVE','MEDIANO','GRAVE'].map(v => ({ value: v, label: v }));

// Props: { trabajoId, onClose }

export default function ActividadFormModal({ trabajoId, onClose }) {
  const [tipoAct, setTipoAct] = useState('');
  const [tipoMant, setTipoMant] = useState('');
  const [subtipo, setSubtipo] = useState('');
  const [desc, setDesc] = useState('');
  const createAct = useCreateActividad(trabajoId);

  const subtipoOpts = tipoMant === 'PREVENTIVO' ? SUB_PREV :
    (tipoMant === 'CORRECTIVO' || tipoMant === 'PREDICTIVO') ? SUB_CORR : [];

  const canSave = tipoAct === 'REVISION' ||
    (tipoAct === 'MANTENIMIENTO' && tipoMant && subtipo);

  const handleSave = async () => {
    if (!canSave) return;
    try {
      await createAct.mutateAsync({
        orden: trabajoId, tipo_actividad: tipoAct,
        tipo_mantenimiento: tipoAct === 'MANTENIMIENTO' ? tipoMant : undefined,
        subtipo: tipoAct === 'MANTENIMIENTO' ? subtipo : undefined,
        descripcion: desc, es_planificada: false,
      });
      onClose();
    } catch { Alert.alert('Error', 'No se pudo guardar la actividad'); }
  };

  return (
    <Modal visible animationType='slide' transparent>
      <View className='flex-1 justify-end bg-black/40'>
        <View className='bg-white rounded-t-3xl max-h-[90%]'>
          {/* Header */}
          <View className='flex-row items-center justify-between p-5
                         border-b border-gray-200'>
            <Text className='text-xl font-bold text-[#1e3a8a]'>
              Nueva Actividad
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text className='text-gray-400 text-2xl'>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView className='p-5' keyboardShouldPersistTaps='handled'>
            <AppSelect label='Tipo de actividad *' options={TIPO_ACT}
              value={tipoAct} onChange={v => { setTipoAct(v); setTipoMant(''); setSubtipo(''); }} />
            {tipoAct === 'MANTENIMIENTO' && (
              <>
                <AppSelect label='Tipo de mantenimiento *' options={TIPO_MANT}
                  value={tipoMant} onChange={v => { setTipoMant(v); setSubtipo(''); }} />
                {tipoMant && (
                  <AppSelect label='Subtipo *' options={subtipoOpts}
                    value={subtipo} onChange={setSubtipo} />
                )}
              </>
            )}
            <AppTextArea label='Descripción (opcional)' value={desc}
              onChange={setDesc} placeholder='Detalla la actividad...' />
          </ScrollView>
          {/* Footer */}
          <View className='p-5 border-t border-gray-200 flex-row gap-3'>
            <TouchableOpacity className='flex-1 py-3.5 rounded-xl
              border border-gray-300 items-center' onPress={onClose}>
              <Text className='text-gray-700 font-semibold'>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-3.5 rounded-xl items-center
                ${canSave ? 'bg-[#1e3a8a]' : 'bg-gray-300'}`}
              onPress={handleSave} disabled={!canSave || createAct.isPending}>
              <Text className='text-white font-semibold'>
                {createAct.isPending ? 'Guardando...' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
