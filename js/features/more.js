// "Mais": atalhos para todas as outras telas (no celular).
import { esc } from '../core/dom.js';
import { chip } from '../ui/parts.js';
import { MORE_ITEMS } from '../nav.js';

export default {
  id: 'mais',
  title: 'Mais',
  render() {
    return `<div class="menu-grid">${MORE_ITEMS.map((i) => `
      <a class="menu-tile" href="#/${i.id}">${chip(i.color, i.icon)}<span>${esc(i.title)}<small>${esc(i.desc)}</small></span></a>`).join('')}</div>
      <p class="tiny subtle center mt-4">Dinheiro com calma, florescendo a prosperidade.</p>`;
  },
};
