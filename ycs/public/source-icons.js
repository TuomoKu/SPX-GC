window.YCSSourceIcons = {
  node(type) {
    const span = document.createElement('span');
    span.className = 'source-type-icon ' + (type === 'google-sheets' ? 'source-sheet-icon' : 'source-neutral-icon');
    span.setAttribute('aria-hidden', 'true');
    // The source type remains available as text in the accessible selector.
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '17'); svg.setAttribute('height', '17');
    svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor'); svg.setAttribute('stroke-width', '1.6');
    const shape = document.createElementNS(svg.namespaceURI, 'path');
    shape.setAttribute('d', type === 'google-sheets' || type === 'local-csv'
      ? 'M5 3h14v18H5z M5 9h14 M5 15h14 M10 9v12 M15 9v12'
      : 'M8 4H6v6l-3 2 3 2v6h2 M16 4h2v6l3 2-3 2v6h-2');
    svg.append(shape); span.append(svg); return span;
  }
};

// Keep the native select as the application state/event boundary, and enhance
// its presentation with a keyboard-accessible icon listbox.
window.YCSSourceSelect = class SourceSelect {
  constructor(select) {
    this.select = select;
    this.wrapper = document.createElement('div'); this.wrapper.className = 'source-select';
    this.button = document.createElement('button'); this.button.type = 'button';
    this.button.className = 'source-select-trigger'; this.button.setAttribute('role', 'combobox');
    this.button.setAttribute('aria-label', 'Source'); this.button.setAttribute('aria-haspopup', 'listbox');
    this.button.setAttribute('aria-expanded', 'false');
    this.list = document.createElement('div'); this.list.className = 'source-select-options';
    this.list.id = select.id + '-options'; this.list.setAttribute('role', 'listbox'); this.list.setAttribute('aria-label', 'Sources'); this.list.hidden = true;
    this.button.setAttribute('aria-controls', this.list.id);
    select.after(this.wrapper); select.hidden = true;
    this.wrapper.append(this.button, this.list);
    this.button.onclick = () => this.toggle(this.list.hidden);
    this.button.onkeydown = event => { if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); this.toggle(true); this.list.querySelector('[aria-selected="true"]')?.focus(); } };
    this.wrapper.addEventListener('focusout', event => { if (!this.wrapper.contains(event.relatedTarget)) this.toggle(false); });
    select.addEventListener('change', () => this.sync());
  }
  toggle(open) { this.list.hidden = !open; this.button.setAttribute('aria-expanded', String(open)); }
  sync() {
    this.button.replaceChildren(); this.list.replaceChildren();
    const selected = this.select.selectedOptions[0];
    if (selected) this.button.append(YCSSourceIcons.node(selected.dataset.type), document.createTextNode(selected.textContent));
    else this.button.textContent = 'No sources';
    const chevron = document.createElement('span'); chevron.textContent = '⌄'; chevron.className = 'source-chevron'; this.button.append(chevron);
    const options = [...this.select.options];
    options.forEach((option, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(option.selected));
      button.append(YCSSourceIcons.node(option.dataset.type), document.createTextNode(option.textContent));
      button.onclick = () => { this.select.value = option.value; this.select.dispatchEvent(new Event('change')); this.toggle(false); this.button.focus(); };
      button.onkeydown = event => {
        if (event.key === 'Escape') { this.toggle(false); this.button.focus(); }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); this.list.children[(index + (event.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length]?.focus(); }
        if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); this.list.children[event.key === 'Home' ? 0 : options.length - 1]?.focus(); }
      };
      this.list.append(button);
    });
  }
};
