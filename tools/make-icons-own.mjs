// Gera css/icons-own.css: conjunto de ícones próprio, arredondado (traço 2px, pontas redondas, grade 24x24).
// Cada ícone substitui o glifo do Font Awesome de mesmo nome quando <html class="icons-own">.
// Ícones sem desenho aqui continuam com o Font Awesome (troca suave, sem buraco).
// Uso: node tools/make-icons-own.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const heart = 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z';
const eye = '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>';
const trash = '<path d="M4.5 7h15M10 4h4M6.5 7l1 12.5a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5l1-12.5M10 11v6M14 11v6"/>';
const cal = '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 9.5h16M8.5 3v4M15.5 3v4"/>';
const pen = '<path d="M15.5 4.5l4 4L9 19H5v-4z"/><path d="M13 7l4 4"/>';
const doc = '<path d="M14 3.5H7.5A1.5 1.5 0 0 0 6 5v14a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V7.5z"/><path d="M14 3.5v4h4"/>';
const cloud = '<path d="M7 18.5a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 9a4.2 4.2 0 0 1-.5 9.5"/>';
const tag = '<path d="M3.5 4v6.5l9.5 9.5 7-7-9.5-9.5H4z"/><circle cx="8" cy="8" r="1.2"/>';

const ICONS = {
  house: '<path d="M4 11.5 12 5l8 6.5"/><path d="M6 10v8.5a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5V10"/><path d="M10 20v-5h4v5"/>',
  receipt: '<path d="M6 3.5h12v17l-2.2-1.5-1.9 1.5-1.9-1.5-1.9 1.5-1.9-1.5L6 20.5z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  'credit-card': '<rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="M3 10h18M7 15h3"/>',
  seedling: '<path d="M12 20v-8"/><path d="M12 12c0-4 3-6.5 7.5-6.5 0 4.5-3 6.5-7.5 6.5z"/><path d="M12 14c0-3-2.5-5-6.5-5 0 3.5 2.5 5 6.5 5z"/>',
  ellipsis: '<circle cx="6" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18" cy="12" r="1.2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  eye,
  'eye-slash': `${eye}<path d="M4 4l16 16"/>`,
  gear: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
  'arrow-left': '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  'chevron-left': '<path d="M15 5l-7 7 7 7"/>',
  'chevron-right': '<path d="M9 5l7 7-7 7"/>',
  'chevron-down': '<path d="M5 9l7 7 7-7"/>',
  xmark: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  'check-double': '<path d="M2.5 12.5 6 16l7.5-8M10 15l1 1 7.5-8"/>',
  trash, 'trash-can': trash,
  bolt: '<path d="M13 3 5.5 13.5H12L11 21l7.5-10.5H12z"/>',
  'cart-shopping': '<path d="M3 4h2.5l2.2 10.5a1.5 1.5 0 0 0 1.5 1.2h7.6a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6.4"/><circle cx="9.5" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/>',
  utensils: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10"/><path d="M17 21V3c-2.2 1.2-3.5 3.5-3.5 7v3H17"/>',
  'mug-hot': '<path d="M4.5 10h11v6a4 4 0 0 1-4 4h-3a4 4 0 0 1-4-4z"/><path d="M15.5 12h1.5a2.5 2.5 0 0 1 0 5h-1.5"/><path d="M8 3.5c-.8 1 .8 2-.1 3.2M11.5 3.5c-.8 1 .8 2-.1 3.2"/>',
  bus: '<rect x="5" y="3.5" width="14" height="14" rx="3"/><path d="M5 11h14M8 17.5V20M16 17.5V20"/><circle cx="8.5" cy="14.3" r=".6"/><circle cx="15.5" cy="14.3" r=".6"/>',
  car: '<path d="M5 16.5V12l2-5h10l2 5v4.5"/><path d="M3.5 12h17v4.5h-17z"/><path d="M6.5 16.5V19M17.5 16.5V19"/>',
  heart: `<path d="${heart}"/>`,
  'heart-pulse': `<path d="${heart}"/><path d="M5 12.5h3.5l1.5-2.5 2.5 5 1.5-2.5H19"/>`,
  pills: '<rect x="3.5" y="9" width="12" height="6" rx="3" transform="rotate(-45 9.5 12)"/><path d="M7.4 9.9l4.2 4.2"/><circle cx="17" cy="16.5" r="3.5"/><path d="M14.5 19l5-5"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M3 9h18M12 9v11"/><path d="M12 9c-1.5-3-5-3.5-5-1.2C7 9 12 9 12 9zM12 9c1.5-3 5-3.5 5-1.2C17 9 12 9 12 9z"/>',
  shirt: '<path d="M8.5 4 4 6.5l1.5 4L8 9.8V20h8V9.8l2.5.7 1.5-4L15.5 4c-.5 1.5-2 2.5-3.5 2.5S9 5.5 8.5 4z"/>',
  gamepad: '<rect x="2.5" y="7" width="19" height="10" rx="5"/><path d="M7.5 10.5v3M6 12h3"/><circle cx="15.5" cy="11" r=".7"/><circle cx="17.5" cy="13" r=".7"/>',
  paw: '<ellipse cx="12" cy="16" rx="4" ry="3.5"/><circle cx="6.5" cy="11" r="1.7"/><circle cx="9.5" cy="7" r="1.7"/><circle cx="14.5" cy="7" r="1.7"/><circle cx="17.5" cy="11" r="1.7"/>',
  'bag-shopping': '<path d="M5 8h14l-1 12H6z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/>',
  'piggy-bank': '<path d="M5 11.5C5 8 8.5 6 12.5 6c3.5 0 6 1.5 7 4h1.5v3.5h-1.6c-.5 1.3-1.4 2.3-2.4 3V20h-2.5v-2H11v2H8.5v-3.2C6.3 15.7 5 13.8 5 11.5z"/><path d="M5 11.5c-1.2 0-2-.6-2-1.7"/><circle cx="16" cy="10" r=".6"/>',
  plane: '<path d="M21 4 3 11l7 3 3 7z"/><path d="M10 14l11-10"/>',
  coins: '<ellipse cx="9" cy="7" rx="5.5" ry="2.5"/><path d="M3.5 7v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V7"/><path d="M9.5 13.5v3.5c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-4c0-1.4-2.5-2.5-5.5-2.5"/>',
  'building-columns': '<path d="M3.5 9.5 12 4l8.5 5.5z"/><path d="M5.5 10v7M10 10v7M14 10v7M18.5 10v7M3.5 20h17M4.5 17.5h15"/>',
  wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H17v3"/><rect x="4" y="8" width="16" height="12" rx="2.5"/><path d="M20 12h-3.5a2 2 0 0 0 0 4H20"/>',
  star: '<path d="m12 3.5 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
  'chart-pie': '<path d="M12 3.5v8.5h8.5A8.5 8.5 0 1 1 12 3.5z"/><path d="M15 3.8A8.5 8.5 0 0 1 20.2 9H15z"/>',
  'chart-line': '<path d="M3.5 4v16.5H20"/><path d="M7 15l4-4.5 3 3 5.5-6"/>',
  'sack-dollar': '<path d="M9 6.5h6l-1.5-3h-3z"/><path d="M9 6.5C5.5 9 4 12.5 4 15.5 4 19 7 20.5 12 20.5s8-1.5 8-5c0-3-1.5-6.5-5-9"/><path d="M13.8 11.2c-.4-.6-1.1-.9-1.8-.9-1.1 0-1.9.6-1.9 1.4 0 1.9 3.8 1.1 3.8 3 0 .8-.9 1.4-1.9 1.4-.8 0-1.5-.4-1.9-1"/>',
  tag, tags: tag,
  rotate: '<path d="M20 12a8 8 0 0 1-14 5.3M4 12a8 8 0 0 1 14-5.3"/><path d="M18.5 3v4h-4M5.5 21v-4h4"/>',
  calculator: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8 7h8"/><circle cx="9" cy="12" r=".6"/><circle cx="12" cy="12" r=".6"/><circle cx="15" cy="12" r=".6"/><circle cx="9" cy="16" r=".6"/><circle cx="12" cy="16" r=".6"/><circle cx="15" cy="16" r=".6"/>',
  'magnifying-glass': '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
  bullseye: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  leaf: '<path d="M5 19c0-8 5-13.5 15-14 0 9.5-5.5 15-14 14z"/><path d="M5 19c3-4 6-6.5 9.5-8.5"/>',
  'calendar-check': `${cal}<path d="M9 14.5l2 2 4-4"/>`,
  'calendar-day': `${cal}<rect x="8" y="12.5" width="3.5" height="3.5" rx=".8"/>`,
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  'clock-rotate-left': '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4M12 8v4l3 2"/>',
  pen, 'pen-to-square': pen,
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  download: '<path d="M12 4v11M7.5 11 12 15.5 16.5 11"/><path d="M4.5 17v1.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V17"/>',
  'file-import': `${doc}<path d="M9 13.5h6M12 10.5l3 3-3 3"/>`,
  'file-pdf': `${doc}<path d="M9 12h6M9 15.5h6"/>`,
  'cloud-arrow-up': `${cloud}<path d="M12 12v8M9 15l3-3 3 3"/>`,
  'cloud-arrow-down': `${cloud}<path d="M12 12v8M9 17l3 3 3-3"/>`,
  camera: '<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2.5h6L16.5 7h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="13" r="3.5"/>',
  'wand-magic-sparkles': '<path d="M4 20 15 9M13 7l4 4"/><path d="M18 3v3M16.5 4.5h3M6 4v2M5 5h2M19 14v2M18 15h2"/>',
  spa: '<circle cx="12" cy="12" r="2.2"/><ellipse cx="12" cy="6" rx="1.7" ry="3" transform="rotate(0 12 12)"/><ellipse cx="12" cy="6" rx="1.7" ry="3" transform="rotate(45 12 12)"/><ellipse cx="12" cy="6" rx="1.7" ry="3" transform="rotate(90 12 12)"/><ellipse cx="12" cy="6" rx="1.7" ry="3" transform="rotate(135 12 12)"/><ellipse cx="12" cy="6" rx="1.7" ry="3" transform="rotate(180 12 12)"/><ellipse cx="12" cy="6" rx="1.7" ry="3" transform="rotate(225 12 12)"/><ellipse cx="12" cy="6" rx="1.7" ry="3" transform="rotate(270 12 12)"/><ellipse cx="12" cy="6" rx="1.7" ry="3" transform="rotate(315 12 12)"/>',
  'arrow-trend-up': '<path d="M3.5 17l6-6 4 4 7-7.5"/><path d="M15 7.5h5.5V13"/>',
  'arrow-trend-down': '<path d="M3.5 7l6 6 4-4 7 7.5"/><path d="M15 16.5h5.5V11"/>',
  paste: '<rect x="6" y="5" width="12" height="16" rx="2"/><path d="M9.5 3.5h5v3h-5z"/>',
  'share-nodes': '<circle cx="18" cy="5.5" r="2.3"/><circle cx="6" cy="12" r="2.3"/><circle cx="18" cy="18.5" r="2.3"/><path d="M8 11l8-4.3M8 13l8 4.3"/>',
  film: '<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M8 4v16M16 4v16M4 9h4M4 15h4M16 9h4M16 15h4"/>',
  music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  book: '<path d="M5 5.5A2 2 0 0 1 7 3.5h12v14H7a2 2 0 0 0-2 2zM5 19.5a2 2 0 0 0 2 2h12v-4"/>',
  'graduation-cap': '<path d="M2.5 9 12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v4.5c1.5 1.5 3.5 2 5.5 2s4-.5 5.5-2V11M21.5 9v5"/>',
  dumbbell: '<path d="M7 7v10M17 7v10M4 9.5v5M20 9.5v5M7 12h10"/>',
  wifi: '<path d="M3 9a13.5 13.5 0 0 1 18 0M6 12.5a9 9 0 0 1 12 0M9 16a4.5 4.5 0 0 1 6 0"/><circle cx="12" cy="19" r=".8"/>',
  'mobile-screen': '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 5.5H5a3 3 0 0 0 3 4M16 5.5h3a3 3 0 0 1-3 4M12 13v3.5M8.5 20h7M10 16.5h4l.5 3.5h-5z"/>',
  'delete-left': '<path d="M9 5h10.5A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5H9l-6-7z"/><path d="M12 9.5l5 5M17 9.5l-5 5"/>',
  'note-sticky': '<path d="M5 4.5h14v9.5l-5 5.5H5z"/><path d="M14 20v-6h5"/>',
  paperclip: '<path d="M15.5 7.5 8.8 14.2a1.8 1.8 0 0 0 2.5 2.5l7-7a3.5 3.5 0 0 0-5-5l-7 7a5 5 0 0 0 7 7l6.2-6.2"/>',
  droplet: '<path d="M12 3.5s6 6.5 6 10.5a6 6 0 0 1-12 0c0-4 6-10.5 6-10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  tree: '<path d="M12 21v-6"/><path d="M12 3c3.5 0 6 2.7 6 6 0 3.5-2.7 6-6 6s-6-2.5-6-6c0-3.3 2.5-6 6-6z"/>',
  feather: '<path d="M20 4C11 4 6 9.5 6 18l-2 2"/><path d="M6 18c6 0 11-4 12-10.5M9.5 14.5H15"/>',
  crown: '<path d="M4 8l4 4 4-6 4 6 4-4-1.5 10h-13z"/><path d="M6 20.5h12"/>',
  'filter': '<path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/>',
  'circle-check': '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.2l2.5 2.5 4.5-5"/>',
  'box-archive': '<rect x="3.5" y="4.5" width="17" height="4" rx="1.2"/><path d="M5 8.5v10A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-10M10 12h4"/>',
  'scale-balanced': '<path d="M12 4v16M8 20h8M5 7h14"/><path d="M5 7l-2.5 6a2.5 2.5 0 0 0 5 0zM19 7l-2.5 6a2.5 2.5 0 0 0 5 0z"/>',
  'layer-group': '<path d="M12 4 3 8.5l9 4.5 9-4.5z"/><path d="M3 12.5 12 17l9-4.5M3 16.5 12 21l9-4.5"/>',
  equals: '<path d="M5 9h14M5 15h14"/>',
  'rotate-left': '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>',
  eraser: '<path d="M8.5 19.5 3.5 14.5a1.5 1.5 0 0 1 0-2.1L12 3.9a1.5 1.5 0 0 1 2.1 0l5.9 5.9a1.5 1.5 0 0 1 0 2.1l-7.6 7.6zM8.5 19.5H20M7 11l6 6"/>',
  'code-merge': '<circle cx="6" cy="5.5" r="2"/><circle cx="6" cy="18.5" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 7.5v9M6 7.5c0 3 3 4.5 10 4.5"/>',
  handshake: '<path d="M3 11.5 7 7.5h3.5l2 1.5 2-1.5H17l4 4"/><path d="M5 9.5l5.8 6.3a1.4 1.4 0 0 0 2 0l5.2-5.8"/><path d="M12.5 9 9.5 12"/>',
  'hand-holding-heart': '<path d="M12 11.5s-4-2.4-4-5.3A2.3 2.3 0 0 1 12 5a2.3 2.3 0 0 1 4 1.2c0 2.9-4 5.3-4 5.3z"/><path d="M3 15.5h3l3.5 2h6a1.5 1.5 0 0 0 0-3H12M15.5 14.5l3.5-1.5a1.5 1.5 0 0 1 1.5 2.5L15 19.5H8L3 21"/>',
  'arrow-up-from-bracket': '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4.5 15v3.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V15"/>',
  'umbrella-beach': '<path d="M4 11a8 8 0 0 1 16 0z"/><path d="M12 11v9M8 20h8"/>',
  'shield-heart': '<path d="M12 3.5 5 6v5c0 4.5 3 8 7 9.5 4-1.5 7-5 7-9.5V6z"/><path d="M12 15s-3-1.8-3-3.9a1.7 1.7 0 0 1 3-1 1.7 1.7 0 0 1 3 1c0 2.1-3 3.9-3 3.9z"/>',
  'border-all': '<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M12 4v16M4 12h16"/>',
  'book-open': '<path d="M3 5.5c3-1 6-1 9 1 3-2 6-2 9-1V19c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 6.5V20"/>',
  'cloud-sun': '<circle cx="9" cy="8" r="3"/><path d="M9 2.5v1.2M3.5 8h1.2M5.1 4.1l.9.9"/><path d="M9.5 19.5a3.5 3.5 0 0 1-.4-7 4.8 4.8 0 0 1 9.2 1 3 3 0 0 1-.3 6z"/>',
  rainbow: '<path d="M3 18a9 9 0 0 1 18 0M6.5 18a5.5 5.5 0 0 1 11 0M10 18a2 2 0 0 1 4 0"/>',
  'feather-pointed': '<path d="M20 4C11 4 6 9.5 6 18l-2 2"/><path d="M6 18c6 0 11-4 12-10.5"/>',
  vault: '<rect x="3.5" y="4" width="17" height="15" rx="2.5"/><circle cx="12" cy="11.5" r="3.5"/><path d="M7 19v1.5M17 19v1.5M12 8v1M15.5 11.5h-1"/>',
  'gas-pump': '<path d="M5 20V5.5A1.5 1.5 0 0 1 6.5 4h6A1.5 1.5 0 0 1 14 5.5V20M4 20h11M5 10h9"/><path d="M14 9h2l2 2v6.5a1.5 1.5 0 0 0 3 0V9l-2.5-2.5"/>',
  scissors: '<circle cx="6.5" cy="7" r="2.5"/><circle cx="6.5" cy="17" r="2.5"/><path d="M8.5 8.5 20 18M8.5 15.5 20 6"/>',
  baby: '<circle cx="12" cy="6" r="2.5"/><path d="M8 11.5 12 10l4 1.5M12 10v5M9 20l3-5 3 5"/>',
  'eye-dropper': '<path d="M15 4.5a2.5 2.5 0 0 1 3.5 3.5L16 10.5l-2.5-2.5z"/><path d="M13.5 8 5 16.5V19h2.5L16 10.5"/>',
  'file-arrow-up': `${doc}<path d="M12 17v-6M9.5 13.5 12 11l2.5 2.5"/>`,
};

const enc = (s) => s.replace(/"/g, "'").replace(/</g, '%3C').replace(/>/g, '%3E').replace(/#/g, '%23').replace(/\s+/g, ' ');
const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

const names = Object.keys(ICONS).sort();
const sel = names.map((n) => `.icons-own .fa-${n}::before`).join(',\n');
let css = `/* GERADO por tools/make-icons-own.mjs — não edite à mão. Conjunto de ícones próprio, arredondado. */
${sel} {
  content: '' !important; display: inline-block; width: 1.18em; height: 1.18em; vertical-align: -0.22em;
  background-color: currentColor; -webkit-mask: var(--own) center / contain no-repeat; mask: var(--own) center / contain no-repeat;
}
`;
for (const n of names) css += `.icons-own .fa-${n} { --own: url("data:image/svg+xml,${enc(svg(ICONS[n]))}"); }\n`;
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'css', 'icons-own.css');
writeFileSync(out, css);
console.log(`icons-own.css: ${names.length} ícones`);
