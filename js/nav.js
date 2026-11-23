// Itens de navegação: barra inferior (celular) e menu lateral (desktop).
import { esc } from './core/dom.js';

export const TAB_ITEMS = [
  { id: 'inicio', title: 'Início', icon: 'fa-house' },
  { id: 'compras', title: 'Compras', icon: 'fa-receipt' },
  { id: 'cartoes', title: 'Cartões', icon: 'fa-credit-card' },
  { id: 'metas', title: 'Metas', icon: 'fa-seedling' },
];

export const MORE_ITEMS = [
  { id: 'resumo', title: 'Resumo do mês', desc: 'Visão geral e rosca', icon: 'fa-chart-pie', color: '#BCD7F5' },
  { id: 'comparativo', title: 'Comparativo', desc: 'Últimos 5 meses', icon: 'fa-chart-line', color: '#D6D0F5' },
  { id: 'relatorio', title: 'Relatório (PDF)', desc: 'Resumo para salvar', icon: 'fa-file-pdf', color: '#FFD9B8' },
  { id: 'renda', title: 'Salário e renda', desc: 'Fixo e extras', icon: 'fa-sack-dollar', color: '#CDEBC5' },
  { id: 'contas', title: 'Contas e cofres', desc: 'Uso livre e reserva', icon: 'fa-building-columns', color: '#BFE3D0' },
  { id: 'categorias', title: 'Categorias', desc: 'Cores e ícones', icon: 'fa-tags', color: '#F9C5D1' },
  { id: 'recorrentes', title: 'Recorrentes', desc: 'Lembretes de contas', icon: 'fa-rotate', color: '#FFF0B3' },
  { id: 'simulador', title: 'Simulador', desc: 'E se eu comprar…?', icon: 'fa-calculator', color: '#FFD9B8' },
  { id: 'lixeira', title: 'Lixeira', desc: 'Compras excluídas', icon: 'fa-trash-can', color: '#D9D9E3' },
  { id: 'ajustes', title: 'Ajustes', desc: 'Tema, backup, AeroSync', icon: 'fa-gear', color: '#E4D4F4' },
];

export function renderBottomNav() {
  const item = (i) => `<a class="bottomnav__item" href="#/${i.id}" data-nav="${i.id}"><i class="fas ${i.icon}"></i><span>${esc(i.title)}</span></a>`;
  return `${item(TAB_ITEMS[0])}${item(TAB_ITEMS[1])}
    <div class="bottomnav__plus"><button type="button" class="fab" data-act="add-expense" aria-label="Registrar gasto"><i class="fas fa-plus"></i></button></div>
    ${item(TAB_ITEMS[2])}
    <a class="bottomnav__item" href="#/mais" data-nav="mais" data-more><i class="fas fa-ellipsis"></i><span>Mais</span></a>`;
}

const APP_ITEMS = ['conquistas', 'ajustes'];

export function renderSidebar() {
  const link = (i) => `<a class="sidebar__item" href="#/${i.id}" data-nav="${i.id}"><i class="fas ${i.icon}"></i>${esc(i.title)}</a>`;
  return `<div class="sidebar__brand"><img src="icons/logo.svg" alt=""><b>ChaMony</b></div>
    <p class="sidebar__slogan">Dinheiro com calma, florescendo a prosperidade.</p>
    <button type="button" class="btn primary sidebar__add" data-act="add-expense"><i class="fas fa-plus"></i>Registrar gasto</button>
    ${TAB_ITEMS.map(link).join('')}
    <div class="sidebar__group">Finanças</div>
    ${MORE_ITEMS.filter((i) => !APP_ITEMS.includes(i.id)).map(link).join('')}
    <div class="sidebar__group">App</div>
    ${MORE_ITEMS.filter((i) => APP_ITEMS.includes(i.id)).map(link).join('')}`;
}

/** Marca o item atual. Telas de "Mais" acendem o botão Mais no celular. */
export function markCurrent(id) {
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const isMore = a.hasAttribute('data-more') && MORE_ITEMS.some((i) => i.id === id);
    a.toggleAttribute('aria-current', a.dataset.nav === id || isMore);
    if (a.hasAttribute('aria-current')) a.setAttribute('aria-current', 'page');
  });
}
