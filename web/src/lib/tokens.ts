/**
 * Mesmos valores declarados no `@theme` do index.css.
 * Existem em JS porque Recharts e o SVG do mapa de vínculos recebem
 * cores por prop, não por classe.
 */
export const CORES = {
  ink: '#132B45',
  inkSoft: '#3D5A78',
  paper: '#F5F7F9',
  card: '#FFFFFF',
  line: '#DEE5EC',
  muted: '#5B6B7B',
  danger: '#B3261E',
  warn: '#C77800',
  ok: '#2E7D32',
  nexus: '#5B4B8A',
  neutro: '#B9C4CE',
} as const
