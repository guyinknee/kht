/**
 * Schematics Manager (compact, larger icons, orthogonal blue layout)
 * - Floats above map (index.css ensures z-index)
 * - Live-updates from UI selections
 * - Green: RES + Water в†’ Electrolyzer в†’ H2
 * - Blue : Gas в†’ Reformer в†’ H2, with CO2 vertical down then horizontal to CCS/EOR (no diagonals)
 */
const SchematicsManager = {
  el: null,
  svg: null,
  mode: 'green',
  state: {},

  // Panel & layout constants
  PANEL: { w: 700, h: 360, pad: 16 },
  ICON:  { sm: 84, md: 128, lg: 168 }, 
  LABEL: { icon: 16, line: 16, weight: 600 },          // noticeably larger
  PIPE:  { stroke: 3.5 },
  GUTTER: 16,                                     // >= 16 px between elements
  SNAP: 12,                                       // line gap from icon edge

  iconBase: 'assets/icons/',
  iconMap: {
    // Energy
    solar: 'solar_energy.png',
    wind:  'wind_energy.png',
    hydro: 'hydro_energy.png',
    // Water
    fresh:   'fresh_water.png',
    brackish:'brackish_water.png',
    waste:   'waste_water.png',
    ground:  'ground_water.png',
    // Units
    PEM:      'pem.png',
    Alkaline: 'alkaline.png',
    SOEC:     'soec.png',
    gas:      'gas.png',
    SMR:      'smr.png',
    ATR:      'atr.png',
    POX:      'pox.png',
    CCS:      'ccs.png',
    EOR:      'eor.png',
    // Products
    greenH2:  'greenh2.png',
    blueH2:   'blueh2.png',
    co2gas:   'co2gas.png'
  },
  // schematicsManager.js
  fitViewBoxToContent(padding = 6) {
    if (!this.svg) return;
    // group all schem elements under one <g id="schem-root"> if you donвЂ™t already
    const root = this.svg.querySelector('#schem-root') || this.svg;
    const box = root.getBBox(); // content bbox
    const x = Math.max(0, box.x - padding);
    const y = Math.max(0, box.y - padding);
    const w = box.width  + padding * 2;
    const h = box.height + padding * 2;
    this.svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
    // Make the SVG scale to its container
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  },

  initialize() {
    this.el = document.getElementById('schematics-panel');
    if (!this.el) return;
    
    this.el.innerHTML = `
      <div class="schem-header">
        <span>Process Schematic</span>
        <button id="schem-close" aria-label="Hide schematic">—</button>
      </div>
      <div class="schem-body">
        <svg id="schem-svg" viewBox="0 0 ${this.PANEL.w} ${this.PANEL.h}" preserveAspectRatio="xMidYMid meet"></svg>
      </div>
      <div class="schem-footer"><span id="schem-caption">Select a region to beginвЂ¦</span></div>
    `;
    this.svg = this.el.querySelector('#schem-svg');
    this.el.querySelector('#schem-close')?.addEventListener('click', () => this.hide());
    this.hide();
  },

  setMode(mode) {
    this.mode = mode;
    this.update();
  },

  setState(partial) {
    // merge but do not null-out previously valid regionLabel/gasFieldLabel unless explicitly null
    this.state = { ...this.state, ...(partial || {}) };
    this.update();
  },

  show(){ this.el?.classList.add('show'); },
  hide(){ this.el?.classList.remove('show'); },
  clear(){ while (this.svg?.firstChild) this.svg.removeChild(this.svg.firstChild); },

  ensureDefs() {
    if (!this.svg) return;
    // avoid duplicates
    if (this.svg.querySelector('#schem-defs')) return;

    const NS = 'http://www.w3.org/2000/svg';
    const defs = document.createElementNS(NS, 'defs');
    defs.setAttribute('id', 'schem-defs');

    // Solid arrowhead (used for all lines)
    const mk = document.createElementNS(NS, 'marker');
    mk.setAttribute('id', 'arrowhead');
    mk.setAttribute('viewBox', '0 0 10 7');
    mk.setAttribute('refX', '10');      // tip sits exactly at line end
    mk.setAttribute('refY', '3.5');
    mk.setAttribute('markerWidth', '10');
    mk.setAttribute('markerHeight', '7');
    mk.setAttribute('orient', 'auto');

    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', 'M 0 0 L 10 3.5 L 0 7 z');
    p.setAttribute('fill', '#333');     // match line color (adjust if needed)
    mk.appendChild(p);

    defs.appendChild(mk);
    this.svg.appendChild(defs);
  },

  line(x1, y1, x2, y2, dashed = false, label = null, opts = null) {
  const path = document.createElementNS('http://www.w3.org/2000/svg','line');
  path.setAttribute('x1', x1); path.setAttribute('y1', y1);
  path.setAttribute('x2', x2); path.setAttribute('y2', y2);
  path.setAttribute('stroke', '#333');
  path.setAttribute('stroke-width', 2);
  if (dashed) path.setAttribute('stroke-dasharray', '6,6');
  path.setAttribute('marker-end', 'url(#arrowhead)');
  // marker-end etc. left as-is...
  this.svg.appendChild(path);

  if (label) {
      const tx = document.createElementNS('http://www.w3.org/2000/svg','text');
      tx.setAttribute('text-anchor', 'middle');
      tx.setAttribute('font-size', String(this.LABEL.line));
      tx.setAttribute('font-weight', String(this.LABEL.weight));
      tx.setAttribute('fill', '#333');

      // Default (old behavior): keep label above the higher endpoint
      if (!opts) {
        const lx = (x1 + x2) / 2;
        const ly = Math.min(y1, y2) - (this.LABEL.line + 2);
        tx.setAttribute('x', lx);
        tx.setAttribute('y', ly);
      } else {
        // New flexible placement
        const lx = ('labelX' in opts) ? opts.labelX : (x1 + x2) / 2;
        const side = opts.labelSide || 'above'; // 'above' | 'below'
        const base = ('useMidpoint' in opts) ? opts.useMidpoint : true;
        const offset = ('labelOffset' in opts) ? opts.labelOffset : 6;

        let ly;
        if (base) {
          // Place relative to the line's midpoint
          const midY = (y1 + y2) / 2;
          ly = side === 'below'
            ? midY + this.LABEL.line + offset
            : midY - this.LABEL.line - offset;
        } else {
          // Place relative to highest point (legacy style)
          const anchorY = Math.min(y1, y2);
          ly = side === 'below'
            ? anchorY + this.LABEL.line + offset
            : anchorY - this.LABEL.line - offset;
        }

        tx.setAttribute('x', lx);
        tx.setAttribute('y', ly);
      }

      tx.textContent = label;
      this.svg.appendChild(tx);
    }
  },

  icon(x,y,w,h,key,caption=null) {
    const href = this.iconBase + (this.iconMap[key] || '');
    const g = document.createElementNS('http://www.w3.org/2000/svg','g');
    const img = document.createElementNS('http://www.w3.org/2000/svg','image');
    img.setAttributeNS('http://www.w3.org/1999/xlink','href', href);
    img.setAttribute('x',x); img.setAttribute('y',y);
    img.setAttribute('width',w); img.setAttribute('height',h);
    img.setAttribute('preserveAspectRatio','xMidYMid meet');
    g.appendChild(img);
    if (caption) {
      const tx = document.createElementNS('http://www.w3.org/2000/svg','text');
      tx.setAttribute('x', x + w/2);
      tx.setAttribute('y', y + h + 20); // a touch more gap since text is larger
      tx.setAttribute('text-anchor', 'middle');
      tx.setAttribute('font-size', String(this.LABEL.icon));
      tx.setAttribute('font-weight', String(this.LABEL.weight));
      tx.setAttribute('fill', '#111');
      tx.textContent = caption; g.appendChild(tx);
    }
    this.svg.appendChild(g);
  },

  update() {
    if (!this.svg) return;
    this.clear(); this.ensureDefs();

    const captionEl = document.getElementById('schem-caption');

    // Robust region/gas field label resolution (fixes "Region вЂў PEM")
    const getRegionFromSidebar = () => {
      const sel = document.getElementById('region-select');
      if (sel && sel.value) return sel.value;
      return null;
    };
    const regionLabelResolved =
      this.state.regionLabel || getRegionFromSidebar() || 'Region';

    const hasRegion = !!(this.state.regionLabel || getRegionFromSidebar());
    const hasField  = !!(this.state.gasFieldLabel);
    const regionPicked = hasRegion || hasField;

    if (!regionPicked) {
      captionEl.textContent = 'Select a region to begin\u2026';
      this.hide();
      return;
    }

    if (this.mode === 'green') {
      if (!(this.state.resType && this.state.waterType && this.state.electrolyzer)) {
        captionEl.textContent = regionLabelResolved + ' \u2022 Select inputs\u2026';
        this.show();
        return;
      }
      this.drawGreen();
      captionEl.textContent = regionLabelResolved + ' \u2022 ' + this.state.electrolyzer;
      this.show();
    } else if (this.mode === 'blue') {
      if (!(this.state.reformer && this.state.co2Disposition)) {
        captionEl.textContent = (this.state.gasFieldLabel || regionLabelResolved || 'Gas Field') + ' \u2022 Select process\u2026';
        this.show();
        return;
      }
      this.drawBlue();
      captionEl.textContent = (this.state.gasFieldLabel || regionLabelResolved || 'Gas Field') + ' \u2022 ' + this.state.reformer;
      this.show();
    } else {
      this.drawDerivativesPlaceholder();
      captionEl.textContent = regionLabelResolved + ' \u2022 Derivatives';
      this.show();
    }
  },

  // ------- LAYOUTS -------
  // Compact Green: short connectors, larger icons
  drawGreen() {
    const pad  = this.PANEL.pad;
    const leftX  = pad + this.GUTTER;
    const rightX = this.PANEL.w - pad - this.GUTTER;
    const midX   = Math.round((leftX + rightX) / 2);

    const unitY = Math.round(this.PANEL.h / 2) - 6;

    // Keep source icon size as before
    const srcSize = this.ICON.md;

    // в†“в†“в†“ Tighter spacing between Energy and Water в†“в†“в†“
    // (was roughly В±srcSize; now ~65% of icon height)
    const verticalGap = Math.round(this.ICON.md * 0.65);
    const energyY = unitY - verticalGap;
    const waterY  = unitY + verticalGap;

    // Labels mapping
    const energyLabelMap = { solar:'Solar Energy', wind:'Wind Energy', hydro:'Hydro Energy' };
    const waterLabelMap  = { fresh:'Freshwater', brackish:'Brackish Water', waste:'Treated Wastewater', ground:'Groundwater' };

    const energyKey   = this.state.resType;      // 'solar' | 'wind' | 'hydro'
    const waterKey    = this.state.waterType;    // 'fresh' | 'brackish' | 'waste' | 'ground'
    const energyLabel = energyLabelMap[energyKey] || 'Energy';
    const waterLabel  = waterLabelMap[waterKey]  || 'Water';

    // >>> Bigger icon labels (only for Energy/Water)
    const labelStyle = { fontSize: 50, fontWeight: 900 };

    // Sources (bigger labels)
    this.icon(leftX, energyY - srcSize/2, srcSize, srcSize, energyKey, energyLabel, labelStyle);
    this.icon(leftX, waterY  - srcSize/2, srcSize, srcSize, waterKey,  waterLabel,  labelStyle);

    // Electrolyzer (same size)
    const eX = midX, eY = unitY;
    const elzLabel = `${this.state.electrolyzer} Electrolyzer`;
    this.icon(eX - this.ICON.md/2, eY - this.ICON.md/2, this.ICON.md, this.ICON.md, this.state.electrolyzer, elzLabel);

    // Hв‚‚ (same)
    const h2X = rightX - this.ICON.lg/2, h2Y = unitY;
    this.icon(h2X - this.ICON.lg/2, h2Y - this.ICON.lg/2, this.ICON.lg, this.ICON.lg, 'greenH2');

    // Lines (keep arrowhead Y offsets to avoid overlap)
    const inletOffset = 10;
    if (this.state.renderMode === 'snap') this.fitViewBoxToContent(4);

    this.line(leftX + srcSize + this.SNAP, energyY, eX - this.ICON.md/2 - this.SNAP, eY - inletOffset, false, 'Electricity',{ labelSide: 'above', labelOffset: 13, useMidpoint: true });
    this.line(
      leftX + srcSize + this.SNAP, waterY,
      eX - this.ICON.md/2 - this.SNAP, eY + inletOffset,
      false, 'Water',
      { labelSide: 'below', labelOffset: 13, useMidpoint: true } // в†ђ key change
    );

    // Outlet
    this.line(eX + this.ICON.md/2 + this.SNAP, eY, h2X - this.ICON.lg/2 - this.SNAP, h2Y, false, 'Hydrogen');
  },

  // Orthogonal Blue: gas вЂ” reformer вЂ” hydrogen; CO2 vertical then horizontal to fate
  drawBlue() {
  // Compose filename from reformer + CO2 fate
  const ref = (this.state.reformer || 'SMR').toLowerCase();        // 'smr' | 'atr' | 'pox'
  const fate = (this.state.co2Disposition || 'CCS').toLowerCase(); // 'ccs' | 'eor'
  const fname = `${ref}${fate}.png`;  // e.g., 'smreor.png', 'atrccs.png', etc.

  // Center the full schematic PNG inside the panel with minimal blank space
  const x = this.PANEL.pad, y = this.PANEL.pad;
  const w = this.PANEL.w - 2 * this.PANEL.pad;
  const h = this.PANEL.h - 2 * this.PANEL.pad;

  // Render single image (no dynamic pipes/labels in blue mode)
  const g = document.createElementNS('http://www.w3.org/2000/svg','g');
  const img = document.createElementNS('http://www.w3.org/2000/svg','image');
  img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', this.iconBase + fname);
  img.setAttribute('x', x);
  img.setAttribute('y', y);
  img.setAttribute('width', w);
  img.setAttribute('height', h);
  img.setAttribute('preserveAspectRatio','xMidYMid meet');
  g.appendChild(img);
  this.svg.appendChild(g);
  if (this.state.renderMode === 'snap') this.fitViewBoxToContent(4);

},

  drawDerivativesPlaceholder() {
    const tx = document.createElementNS('http://www.w3.org/2000/svg','text');
    tx.setAttribute('x', String(this.PANEL.w/2));
    tx.setAttribute('y', String(this.PANEL.h/2));
    tx.setAttribute('text-anchor','middle'); tx.setAttribute('font-size','16');
    tx.textContent = 'Derivatives schematic coming soonвЂ¦';
    this.svg.appendChild(tx);
  },


  snapshotSVG() {
    if (!this.svg) return '';
    const cloned = this.svg.cloneNode(true);

    // Let width drive the size; auto height to avoid letterboxing
    cloned.removeAttribute('height');
    cloned.setAttribute('width','100%');

    // Kill inline-element baseline gap & ensure responsive sizing
    cloned.style.display = 'block';
    cloned.style.height  = 'auto';

    // Be explicit
    cloned.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    return cloned.outerHTML;
  }
};

window.SchematicsManager = SchematicsManager;