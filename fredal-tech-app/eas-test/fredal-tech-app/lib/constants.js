export const ACCESS_TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';

const LOCAL_API_URL = 'http://localhost:8000';
const PRODUCTION_API_URL = 'https://frdl-production-47cd.up.railway.app';

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (__DEV__ ? LOCAL_API_URL : PRODUCTION_API_URL);

export const ROLES = {
  TECNICO: 'Tecnico',
  JEFE_TECNICOS: 'Jefe de Tecnicos',
  ALMACENERO: 'Almacenero',
  JEFE_ALMACEN: 'Jefe de Almaceneros',
  MANAGE_COMPRAS: 'ManageCompras',
};
