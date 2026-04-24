import { Platform } from 'react-native';

export const colors = {
  background: '#F3F6FB',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF3FB',
  surfaceStrong: '#E7EDF7',
  navy: '#173569',
  navyDeep: '#0F2346',
  navySoft: '#EAF1FF',
  lime: '#8FBF2F',
  limeSoft: '#EDF6DA',
  amber: '#B67818',
  amberSoft: '#FFF4DC',
  red: '#C74C43',
  redSoft: '#FDE9E4',
  green: '#2E7D4F',
  greenSoft: '#E4F4E9',
  text: '#12233D',
  textMuted: '#5F6C80',
  textSoft: '#8D97A8',
  border: '#D9E2EF',
  borderStrong: '#C7D3E4',
  overlay: 'rgba(15, 35, 70, 0.58)',
  white: '#FFFFFF',
  black: '#000000',
};

export const radius = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  pill: 999,
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
};

export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: colors.navyDeep,
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: 6 },
    default: {},
  }),
  soft: Platform.select({
    ios: {
      shadowColor: colors.navyDeep,
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 3 },
    default: {},
  }),
  floating: Platform.select({
    ios: {
      shadowColor: colors.navyDeep,
      shadowOpacity: 0.16,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 14 },
    },
    android: { elevation: 10 },
    default: {},
  }),
};

export const priorityPalette = {
  REGULAR: { bg: colors.surfaceMuted, text: colors.textMuted, icon: colors.textSoft },
  URGENTE: { bg: colors.amberSoft, text: colors.amber, icon: colors.amber },
  EMERGENCIA: { bg: colors.redSoft, text: colors.red, icon: colors.red },
};

export const statusPalette = {
  PENDIENTE: { bg: colors.surfaceMuted, text: colors.textMuted, accent: '#7B8798' },
  EN_PROCESO: { bg: colors.navySoft, text: colors.navy, accent: colors.navy },
  FINALIZADO: { bg: colors.greenSoft, text: colors.green, accent: colors.lime },
};

export const formatStatusLabel = (status = '') =>
  status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

export const getPriorityPalette = (priority) =>
  priorityPalette[priority] || priorityPalette.REGULAR;

export const getStatusPalette = (status) =>
  statusPalette[status] || statusPalette.PENDIENTE;
