// Avisos curtos e suaves, com ação opcional ("Desfazer").
let host;

export function toast(message, { action, duration = 3600 } = {}) {
  host ??= document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  const span = document.createElement('span');
  span.textContent = message;
  el.append(span);
  let timer;
  const close = () => { clearTimeout(timer); el.classList.add('is-out'); setTimeout(() => el.remove(), 230); };
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = action.label;
    b.addEventListener('click', () => { action.fn(); close(); });
    el.append(b);
  }
  host.append(el);
  while (host.children.length > 3) host.firstElementChild.remove();
  timer = setTimeout(close, duration);
  return close;
}
