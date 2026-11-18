(() => {
  const STORAGE_KEY = 'guitarChordSheetState_v1';
  const SAVED_SETS_KEY = 'chordDiagrams_savedSets_v1';
  const MAX_DIAGRAMS = 20;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const INSTRUMENTS = {
    guitar: {
      label: 'Guitar',
      numStrings: 6,
      xStart: 32,
      stringNums: ['6', '5', '4', '3', '2', '1'],
      stringNames: ['E', 'A', 'D', 'G', 'B', 'E'],
    },
    ukulele: {
      label: 'Ukulele',
      numStrings: 4,
      xStart: 54,
      stringNums: ['4', '3', '2', '1'],
      stringNames: ['G', 'C', 'E', 'A'],
    },
    mandolin: {
      label: 'Mandolin',
      numStrings: 4,
      xStart: 54,
      stringNums: ['4', '3', '2', '1'],
      stringNames: ['G', 'D', 'A', 'E'],
    },
    banjo: {
      label: 'Banjo (5-string)',
      numStrings: 5,
      xStart: 43,
      stringNums: ['5', '4', '3', '2', '1'],
      stringNames: ['G', 'D', 'G', 'B', 'D'],
    },
    'tenor-banjo': {
      label: 'Tenor Banjo',
      numStrings: 4,
      xStart: 54,
      stringNums: ['4', '3', '2', '1'],
      stringNames: ['C', 'G', 'D', 'A'],
    },
    'plectrum-banjo': {
      label: 'Plectrum Banjo',
      numStrings: 4,
      xStart: 54,
      stringNums: ['4', '3', '2', '1'],
      stringNames: ['C', 'G', 'B', 'D'],
    },
    'cuban-tres': {
      label: 'Cuban Tres',
      numStrings: 3,
      xStart: 65,
      stringNums: ['3', '2', '1'],
      stringNames: ['G', 'C', 'E'],
    },
    'unlabeled-3': {
      label: '3-string',
      numStrings: 3,
      xStart: 65,
      labeled: false,
    },
    'unlabeled-4': {
      label: '4-string',
      numStrings: 4,
      xStart: 54,
      labeled: false,
    },
    'unlabeled-5': {
      label: '5-string',
      numStrings: 5,
      xStart: 43,
      labeled: false,
    },
    'unlabeled-6': {
      label: '6-string',
      numStrings: 6,
      xStart: 32,
      labeled: false,
    },
    'unlabeled-7': {
      label: '7-string',
      numStrings: 7,
      xStart: 32,
      svgWidth: 178,
      labeled: false,
    },
    'unlabeled-8': {
      label: '8-string',
      numStrings: 8,
      xStart: 32,
      svgWidth: 200,
      labeled: false,
    },
  };

  // SVG geometry
  const MAX_STRINGS = 8;
  const STRING_GAP = 22;
  const FRET_HEIGHT = 28;
  const DOT_RADIUS = 8.5;
  const DOT_COLORS = {
    black: '#000000',
    grey: '#808080',
    red: '#dc2626',
    blue: '#2563eb',
    green: '#16a34a',
    purple: '#9333ea',
    brown: '#7c2d12',
    yellow: '#eab308',
    white: '#ffffff',
  };

  function createEmptyDiagram() {
    return {
      name: '',
      fretAnchor: null, // { row: 1..5, fret: 1..24 } | null
      dots: {}, // key: `${stringIdx}-${fretRow}` -> { finger: ''|'1'..'4'|'T', color: 'black'|'grey' }
      openMute: Array(MAX_STRINGS).fill(''), // '' | 'O' | 'X'
      deleted: false,
    };
  }

  function cloneDiagram(diagram) {
    const dotsCopy = {};
    for (const [k, v] of Object.entries(diagram.dots || {})) {
      dotsCopy[k] = typeof v === 'object' && v !== null ? { ...v } : v;
    }
    return {
      name: diagram.name || '',
      fretAnchor: diagram.fretAnchor ? { ...diagram.fretAnchor } : null,
      dots: dotsCopy,
      openMute: Array.isArray(diagram.openMute)
        ? [...diagram.openMute]
        : Array(MAX_STRINGS).fill(''),
      deleted: false,
    };
  }

  function getDot(diagram, key) {
    if (!Object.prototype.hasOwnProperty.call(diagram.dots, key)) return null;
    const raw = diagram.dots[key];
    if (typeof raw === 'string') {
      return { finger: raw, color: 'black' };
    }
    if (raw && typeof raw === 'object') {
      return {
        finger: typeof raw.finger === 'string' ? raw.finger : '',
        color: DOT_COLORS[raw.color] ? raw.color : 'black',
      };
    }
    return { finger: '', color: 'black' };
  }

  function normalizeState(parsed) {
    if (!parsed || !Array.isArray(parsed.diagrams)) {
      return {
        title: '',
        count: 16,
        extraFret: false,
        leftHanded: false,
        instrument: 'guitar',
        activeSetName: '',
        diagrams: Array.from({ length: MAX_DIAGRAMS }, createEmptyDiagram),
      };
    }
    const diagrams = parsed.diagrams.slice(0, MAX_DIAGRAMS).map((d) => {
      let fretAnchor = null;
      if (
        d.fretAnchor &&
        Number.isInteger(d.fretAnchor.row) &&
        d.fretAnchor.row >= 1 &&
        d.fretAnchor.row <= 5 &&
        Number.isInteger(d.fretAnchor.fret) &&
        d.fretAnchor.fret >= 1
      ) {
        fretAnchor = { row: d.fretAnchor.row, fret: Math.min(d.fretAnchor.fret, 24) };
      } else if (Number.isInteger(d.startFret) && d.startFret >= 1) {
        fretAnchor = { row: 1, fret: Math.min(d.startFret, 24) };
      }
      return {
        name: typeof d.name === 'string' ? d.name : '',
        fretAnchor,
        dots: d.dots && typeof d.dots === 'object' ? { ...d.dots } : {},
        openMute: Array.isArray(d.openMute)
          ? Array.from({ length: MAX_STRINGS }, (_, idx) => d.openMute[idx] || '')
          : Array(MAX_STRINGS).fill(''),
        deleted: Boolean(d.deleted),
      };
    });
    while (diagrams.length < MAX_DIAGRAMS) {
      diagrams.push(createEmptyDiagram());
    }
    return {
      title: typeof parsed.title === 'string' ? parsed.title : '',
      count: [4, 8, 12, 16, 20].includes(parsed.count) ? parsed.count : 16,
      extraFret: Boolean(parsed.extraFret),
      leftHanded: Boolean(parsed.leftHanded),
      instrument: INSTRUMENTS[parsed.instrument] ? parsed.instrument : 'guitar',
      activeSetName: typeof parsed.activeSetName === 'string' ? parsed.activeSetName : '',
      diagrams,
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return normalizeState(JSON.parse(raw));
      }
    } catch {
      // Ignore malformed storage
    }
    return normalizeState(null);
  }

  function loadSavedSets() {
    try {
      const raw = localStorage.getItem(SAVED_SETS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Ignore malformed storage
    }
    return {};
  }

  function persistSavedSets() {
    try {
      localStorage.setItem(SAVED_SETS_KEY, JSON.stringify(savedSets));
    } catch {
      // Ignore quota errors
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors
    }
  }

  function svgEl(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, String(v));
    }
    return el;
  }

  let state = loadState();
  let savedSets = loadSavedSets();
  let activeTarget = null; // { diagramIdx, stringIdx, fretRow }
  let copiedDiagram = null;
  let lastLongPressAt = 0;

  const pageTitleEl = document.getElementById('pageTitle');
  const instrumentSelectEl = document.getElementById('instrumentSelect');
  const diagramCountEl = document.getElementById('diagramCount');
  const extraFretToggleEl = document.getElementById('extraFretToggle');
  const leftHandedToggleEl = document.getElementById('leftHandedToggle');
  const saveSetBtn = document.getElementById('saveSetBtn');
  const openSetBtn = document.getElementById('openSetBtn');
  const chordGridEl = document.getElementById('chordGrid');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const downloadPdfBtn = document.getElementById('downloadPdfBtn');
  const printBtn = document.getElementById('printBtn');
  const fingerMenuEl = document.getElementById('fingerMenu');
  const fingerCustomInputEl = document.getElementById('fingerCustomInput');
  const fingerCustomApplyBtn = document.getElementById('fingerCustomApplyBtn');
  const helpBtn = document.getElementById('helpBtn');
  const helpModalEl = document.getElementById('helpModal');
  const helpCloseBtn = document.getElementById('helpCloseBtn');
  const openModalEl = document.getElementById('openModal');
  const openCloseBtn = document.getElementById('openCloseBtn');
  const savedSetsListEl = document.getElementById('savedSetsList');

  function syncToolbarFromState() {
    pageTitleEl.value = state.title;
    instrumentSelectEl.value = state.instrument;
    diagramCountEl.value = String(state.count);
    extraFretToggleEl.checked = state.extraFret;
    leftHandedToggleEl.checked = state.leftHanded;
  }

  function renderSavedSetsList() {
    const names = Object.keys(savedSets).sort((a, b) => a.localeCompare(b));
    savedSetsListEl.innerHTML = '';

    if (names.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'saved-sets-empty';
      empty.textContent = 'No saved sets yet. Click "Save" to store your current diagram sheet.';
      savedSetsListEl.appendChild(empty);
      return;
    }

    for (const name of names) {
      const set = normalizeState(savedSets[name]);
      const row = document.createElement('div');
      row.className = 'saved-set-row';
      if (state.activeSetName === name) {
        row.classList.add('active');
      }

      const info = document.createElement('div');
      info.className = 'saved-set-info';

      const title = document.createElement('div');
      title.className = 'saved-set-name';
      title.textContent = name;

      const meta = document.createElement('div');
      meta.className = 'saved-set-meta';
      const instLabel = INSTRUMENTS[set.instrument].label;
      const fretLabel = set.extraFret ? '5 frets' : '4 frets';
      meta.textContent = `${instLabel} • ${set.count} diagrams • ${fretLabel}`;

      info.appendChild(title);
      info.appendChild(meta);

      const actions = document.createElement('div');
      actions.className = 'saved-set-actions';

      const loadBtn = document.createElement('button');
      loadBtn.type = 'button';
      loadBtn.className = 'btn btn-primary';
      loadBtn.textContent = 'Open';
      loadBtn.addEventListener('click', () => {
        state = normalizeState(savedSets[name]);
        state.activeSetName = name;
        saveState();
        syncToolbarFromState();
        renderGrid();
        closeModal(openModalEl);
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn-secondary btn-danger-text';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => {
        if (!confirm(`Delete saved set "${name}"?`)) return;
        delete savedSets[name];
        persistSavedSets();
        if (state.activeSetName === name) {
          state.activeSetName = '';
          saveState();
        }
        renderSavedSetsList();
      });

      actions.appendChild(loadBtn);
      actions.appendChild(delBtn);
      row.appendChild(info);
      row.appendChild(actions);
      savedSetsListEl.appendChild(row);
    }
  }

  syncToolbarFromState();

  function getLayoutMetrics() {
    const inst = INSTRUMENTS[state.instrument];
    const labeled = inst.labeled !== false;
    const yTop = labeled ? 35 : 22;
    const numFrets = state.extraFret ? 5 : 4;
    const svgWidth = inst.svgWidth || 156;
    const svgHeight = yTop + numFrets * FRET_HEIGHT + 16;
    return {
      inst,
      labeled,
      numStrings: inst.numStrings,
      xStart: inst.xStart,
      yTop,
      numFrets,
      svgWidth,
      svgHeight,
      omY: labeled ? 24.5 : 11.5,
      hitHeight: labeled ? 31 : 19,
    };
  }

  function buildDiagramSvg(diagramIdx) {
    const diagram = state.diagrams[diagramIdx];
    const {
      inst,
      labeled,
      numStrings,
      xStart,
      yTop,
      numFrets,
      svgWidth,
      svgHeight,
      omY,
      hitHeight,
    } = getLayoutMetrics();

    const svg = svgEl('svg', {
      viewBox: `0 0 ${svgWidth} ${svgHeight}`,
      class: 'chord-svg',
      'aria-label': `Chord diagram ${diagramIdx + 1}`,
    });

    const xEnd = xStart + (numStrings - 1) * STRING_GAP;
    const yBottom = yTop + numFrets * FRET_HEIGHT;

    // String headers and optional O / X
    for (let s = 0; s < numStrings; s++) {
      const displayS = state.leftHanded ? numStrings - 1 - s : s;
      const x = xStart + displayS * STRING_GAP;
      const headerGroup = svgEl('g', { class: 'string-header-group' });

      if (labeled) {
        const nameText = svgEl('text', {
          x,
          y: 13,
          'text-anchor': 'middle',
          'font-size': '10.5',
          'font-weight': '700',
          fill: '#111827',
          class: 'string-label-text',
        });
        nameText.textContent = inst.stringNames[s];
        headerGroup.appendChild(nameText);
      }

      const om = diagram.openMute[s];
      if (om === 'O') {
        const openCircle = svgEl('circle', {
          cx: x,
          cy: omY,
          r: 3.6,
          fill: 'none',
          stroke: '#000000',
          'stroke-width': '1.4',
        });
        headerGroup.appendChild(openCircle);
      } else if (om === 'X') {
        const d = 3.3;
        const cy = omY;
        headerGroup.appendChild(svgEl('line', {
          x1: x - d,
          y1: cy - d,
          x2: x + d,
          y2: cy + d,
          stroke: '#000000',
          'stroke-width': '1.5',
          'stroke-linecap': 'round',
        }));
        headerGroup.appendChild(svgEl('line', {
          x1: x + d,
          y1: cy - d,
          x2: x - d,
          y2: cy + d,
          stroke: '#000000',
          'stroke-width': '1.5',
          'stroke-linecap': 'round',
        }));
      }

      const hit = svgEl('rect', {
        x: x - STRING_GAP / 2,
        y: 0,
        width: STRING_GAP,
        height: hitHeight,
        class: 'string-header-hit',
      });
      hit.addEventListener('click', () => {
        const order = ['', 'O', 'X'];
        const next = order[(order.indexOf(diagram.openMute[s]) + 1) % order.length];
        diagram.openMute[s] = next;
        saveState();
        renderSingleDiagram(diagramIdx);
      });
      headerGroup.appendChild(hit);

      svg.appendChild(headerGroup);
    }

    // Vertical string lines
    for (let s = 0; s < numStrings; s++) {
      const x = xStart + s * STRING_GAP;
      svg.appendChild(svgEl('line', {
        x1: x,
        y1: yTop,
        x2: x,
        y2: yBottom,
        stroke: '#000000',
        'stroke-width': '1.35',
      }));
    }

    // Horizontal fret lines (index 0 is nut/top bar)
    const anchor = diagram.fretAnchor;
    const topFret = anchor ? anchor.fret - (anchor.row - 1) : 0;
    for (let f = 0; f <= numFrets; f++) {
      const y = yTop + f * FRET_HEIGHT;
      const isNut = f === 0 && (!anchor || (anchor.row > 1 && topFret <= 1));
      svg.appendChild(svgEl('line', {
        x1: xStart,
        y1: y,
        x2: xEnd,
        y2: y,
        stroke: '#000000',
        'stroke-width': isNut ? '5' : '1.35',
        'stroke-linecap': isNut ? 'square' : 'butt',
      }));
    }

    // Annotated fret label for print (HTML inputs handle screen editing & ghost offsets)
    if (anchor && anchor.row <= numFrets) {
      const fretLabel = svgEl('text', {
        x: xStart - 12,
        y: yTop + (anchor.row - 0.5) * FRET_HEIGHT,
        'text-anchor': 'end',
        'dominant-baseline': 'central',
        'font-size': '12',
        'font-weight': '700',
        fill: '#000000',
        class: 'start-fret-svg-label',
      });
      fretLabel.textContent = String(anchor.fret);
      svg.appendChild(fretLabel);
    }

    // Interactive fret cells & dots
    for (let f = 1; f <= numFrets; f++) {
      const cy = yTop + (f - 0.5) * FRET_HEIGHT;
      for (let s = 0; s < numStrings; s++) {
        const displayS = state.leftHanded ? numStrings - 1 - s : s;
        const cx = xStart + displayS * STRING_GAP;
        const key = `${s}-${f}`;
        const dot = getDot(diagram, key);

        const cellGroup = svgEl('g', { class: 'fret-cell' });

        if (!dot) {
          cellGroup.appendChild(svgEl('circle', {
            cx,
            cy,
            r: DOT_RADIUS,
            class: 'fret-hover',
          }));
        } else {
          const dotAttrs = {
            cx,
            cy,
            r: DOT_RADIUS,
            fill: DOT_COLORS[dot.color] || DOT_COLORS.black,
          };
          if (dot.color === 'white') {
            dotAttrs.stroke = '#000000';
            dotAttrs['stroke-width'] = '1.5';
          }
          cellGroup.appendChild(svgEl('circle', dotAttrs));

          if (dot.finger) {
            const label = svgEl('text', {
              x: cx,
              y: cy,
              dy: '0.35em',
              'text-anchor': 'middle',
              'font-size': dot.finger.length > 1 ? '9.5' : '11',
              'font-weight': '700',
              fill: dot.color === 'white' || dot.color === 'yellow' ? '#000000' : '#ffffff',
              'pointer-events': 'none',
            });
            label.textContent = dot.finger;
            cellGroup.appendChild(label);
          }
        }

        const hitRect = svgEl('rect', {
          x: cx - STRING_GAP / 2,
          y: yTop + (f - 1) * FRET_HEIGHT,
          width: STRING_GAP,
          height: FRET_HEIGHT,
          class: 'fret-hit',
        });

        let longPressTimer = null;
        let longPressTriggered = false;
        let touchStartX = 0;
        let touchStartY = 0;

        hitRect.addEventListener(
          'touchstart',
          (e) => {
            if (e.touches.length !== 1) {
              clearTimeout(longPressTimer);
              longPressTimer = null;
              return;
            }
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            longPressTriggered = false;
            clearTimeout(longPressTimer);
            longPressTimer = setTimeout(() => {
              longPressTimer = null;
              longPressTriggered = true;
              lastLongPressAt = Date.now();
              openFingerMenu(touchStartX, touchStartY, diagramIdx, s, f);
            }, 450);
          },
          { passive: true }
        );

        hitRect.addEventListener(
          'touchmove',
          (e) => {
            if (!longPressTimer || e.touches.length !== 1) return;
            const touch = e.touches[0];
            if (Math.hypot(touch.clientX - touchStartX, touch.clientY - touchStartY) > 10) {
              clearTimeout(longPressTimer);
              longPressTimer = null;
            }
          },
          { passive: true }
        );

        const cancelTouchPress = (e) => {
          if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
          }
          if (longPressTriggered && e.type === 'touchend') {
            e.preventDefault();
          }
        };

        hitRect.addEventListener('touchend', cancelTouchPress);
        hitRect.addEventListener('touchcancel', cancelTouchPress);

        hitRect.addEventListener('click', (e) => {
          e.stopPropagation();
          if (longPressTriggered || Date.now() - lastLongPressAt < 400) {
            longPressTriggered = false;
            return;
          }
          closeFingerMenu();
          if (Object.prototype.hasOwnProperty.call(diagram.dots, key)) {
            delete diagram.dots[key];
          } else {
            diagram.dots[key] = { finger: '', color: 'black' };
          }
          saveState();
          renderSingleDiagram(diagramIdx);
        });

        hitRect.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openFingerMenu(e.clientX, e.clientY, diagramIdx, s, f);
        });

        cellGroup.appendChild(hitRect);
        svg.appendChild(cellGroup);
      }
    }

    return svg;
  }

  function renderSingleDiagram(diagramIdx) {
    const card = chordGridEl.children[diagramIdx];
    if (!card) return;
    const wrap = card.querySelector('.diagram-wrap');
    const oldSvg = wrap.querySelector('svg');
    const newSvg = buildDiagramSvg(diagramIdx);
    wrap.replaceChild(newSvg, oldSvg);
  }

  function syncFretInputs(wrap, diagram) {
    const anchor = diagram.fretAnchor;
    wrap.querySelectorAll('.start-fret-input').forEach((input) => {
      const row = parseInt(input.dataset.row, 10);
      if (!anchor) {
        input.value = '';
        input.placeholder = row === 1 ? '0' : '';
      } else if (anchor.row === row) {
        if (document.activeElement !== input) {
          input.value = String(anchor.fret);
        }
        input.placeholder = '';
      } else {
        input.value = '';
        const offsetFret = anchor.fret + (row - anchor.row);
        input.placeholder = offsetFret >= 0 ? String(offsetFret) : '';
      }
    });
  }

  function syncPasteButtons() {
    const hasCopied = copiedDiagram !== null;
    chordGridEl.querySelectorAll('.paste-btn').forEach((btn) => {
      btn.hidden = !hasCopied;
    });
  }

  function createCardActions(diagramIdx, card, nameInput, wrap) {
    const diagram = state.diagrams[diagramIdx];
    const actions = document.createElement('div');
    actions.className = 'card-actions no-print';

    if (!diagram.deleted) {
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'card-action-btn copy-btn';
      copyBtn.dataset.tooltip = 'Copy chord';
      copyBtn.setAttribute('aria-label', `Copy chord ${diagramIdx + 1}`);
      copyBtn.innerHTML =
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
      copyBtn.addEventListener('click', () => {
        copiedDiagram = cloneDiagram(state.diagrams[diagramIdx]);
        syncPasteButtons();
        copyBtn.classList.add('copied');
        copyBtn.dataset.tooltip = 'Copied!';
        setTimeout(() => {
          copyBtn.classList.remove('copied');
          copyBtn.dataset.tooltip = 'Copy chord';
        }, 700);
      });
      actions.appendChild(copyBtn);
    }

    const pasteBtn = document.createElement('button');
    pasteBtn.type = 'button';
    pasteBtn.className = 'card-action-btn paste-btn';
    pasteBtn.dataset.tooltip = 'Paste chord';
    pasteBtn.setAttribute('aria-label', `Paste chord into slot ${diagramIdx + 1}`);
    pasteBtn.hidden = copiedDiagram === null;
    pasteBtn.innerHTML =
      '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>';
    pasteBtn.addEventListener('click', () => {
      if (!copiedDiagram) return;
      const cloned = cloneDiagram(copiedDiagram);
      state.diagrams[diagramIdx] = cloned;
      saveState();
      if (diagram.deleted) {
        renderGrid();
      } else {
        nameInput.value = cloned.name;
        syncFretInputs(wrap, cloned);
        renderSingleDiagram(diagramIdx);
      }
    });
    actions.appendChild(pasteBtn);

    if (diagram.deleted) {
      const restoreBtn = document.createElement('button');
      restoreBtn.type = 'button';
      restoreBtn.className = 'card-action-btn restore-btn';
      restoreBtn.dataset.tooltip = 'Restore diagram';
      restoreBtn.setAttribute('aria-label', `Restore chord ${diagramIdx + 1}`);
      restoreBtn.innerHTML =
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
      restoreBtn.addEventListener('click', () => {
        state.diagrams[diagramIdx].deleted = false;
        saveState();
        renderGrid();
      });
      actions.appendChild(restoreBtn);
    } else {
      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'card-action-btn clear-btn';
      clearBtn.dataset.tooltip = 'Clear chord';
      clearBtn.setAttribute('aria-label', `Clear chord ${diagramIdx + 1}`);
      clearBtn.innerHTML =
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
      clearBtn.addEventListener('click', () => {
        closeFingerMenu();
        const empty = createEmptyDiagram();
        state.diagrams[diagramIdx] = empty;
        nameInput.value = '';
        syncFretInputs(wrap, empty);
        renderSingleDiagram(diagramIdx);
        saveState();
      });
      actions.appendChild(clearBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'card-action-btn delete-btn';
      deleteBtn.dataset.tooltip = 'Delete diagram';
      deleteBtn.setAttribute('aria-label', `Delete chord ${diagramIdx + 1}`);
      deleteBtn.innerHTML =
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>';
      deleteBtn.addEventListener('click', () => {
        closeFingerMenu();
        state.diagrams[diagramIdx] = { ...createEmptyDiagram(), deleted: true };
        saveState();
        renderGrid();
      });
      actions.appendChild(deleteBtn);
    }

    return actions;
  }

  function renderGrid() {
    const { xStart, yTop, numFrets, svgWidth, svgHeight } = getLayoutMetrics();
    const startFretLeft = `calc(${((xStart - 12) / svgWidth) * 100}% - 25px)`;

    chordGridEl.classList.toggle('extra-fret', state.extraFret);
    chordGridEl.classList.toggle('count-20', state.count === 20);
    chordGridEl.innerHTML = '';
    for (let i = 0; i < state.count; i++) {
      const diagram = state.diagrams[i];
      const card = document.createElement('div');
      card.className = 'chord-card';
      if (diagram.deleted) {
        card.classList.add('is-deleted');
      }

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'chord-name-input';
      nameInput.placeholder = 'Chord name';
      nameInput.value = diagram.name;
      nameInput.setAttribute('aria-label', `Chord ${i + 1} name`);
      nameInput.addEventListener('input', (e) => {
        diagram.name = e.target.value;
        saveState();
      });

      const wrap = document.createElement('div');
      wrap.className = 'diagram-wrap';
      wrap.appendChild(buildDiagramSvg(i));

      for (let r = 1; r <= numFrets; r++) {
        const fretInput = document.createElement('input');
        fretInput.type = 'number';
        fretInput.min = '0';
        fretInput.max = '24';
        fretInput.className = 'start-fret-input';
        fretInput.dataset.row = String(r);
        fretInput.style.left = startFretLeft;
        fretInput.style.top = `calc(${((yTop + (r - 0.5) * FRET_HEIGHT) / svgHeight) * 100}% - 11px)`;
        fretInput.title = `Annotate fret ${r} (leave blank for nut / offset)`;
        fretInput.setAttribute('aria-label', `Chord ${i + 1} fret row ${r}`);
        fretInput.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10);
          if (!Number.isNaN(val) && val > 0) {
            diagram.fretAnchor = { row: r, fret: Math.min(val, 24) };
          } else {
            diagram.fretAnchor = null;
          }
          syncFretInputs(wrap, diagram);
          saveState();
          renderSingleDiagram(i);
        });
        wrap.appendChild(fretInput);
      }

      syncFretInputs(wrap, diagram);

      card.appendChild(createCardActions(i, card, nameInput, wrap));
      card.appendChild(nameInput);
      card.appendChild(wrap);
      chordGridEl.appendChild(card);
    }
  }

  function openFingerMenu(clientX, clientY, diagramIdx, stringIdx, fretRow) {
    activeTarget = { diagramIdx, stringIdx, fretRow };
    const key = `${stringIdx}-${fretRow}`;
    const dot = getDot(state.diagrams[diagramIdx], key);
    const currentFinger = dot ? dot.finger : null;
    const currentColor = dot ? dot.color : 'black';

    fingerMenuEl.querySelectorAll('.finger-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.finger === currentFinger);
    });
    fingerMenuEl.querySelectorAll('.color-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.color === currentColor);
    });
    fingerCustomInputEl.value = currentFinger || '';

    fingerMenuEl.classList.add('open');
    fingerMenuEl.setAttribute('aria-hidden', 'false');

    // Position menu within viewport bounds
    const rect = fingerMenuEl.getBoundingClientRect();
    const left = Math.min(clientX + 6, window.innerWidth - rect.width - 8);
    const top = Math.min(clientY + 6, window.innerHeight - rect.height - 8);
    fingerMenuEl.style.left = `${Math.max(8, left)}px`;
    fingerMenuEl.style.top = `${Math.max(8, top)}px`;
  }

  function closeFingerMenu() {
    activeTarget = null;
    fingerMenuEl.classList.remove('open');
    fingerMenuEl.setAttribute('aria-hidden', 'true');
  }

  function applyFingerValue(value, { close = true } = {}) {
    if (!activeTarget) return;
    const { diagramIdx, stringIdx, fretRow } = activeTarget;
    const key = `${stringIdx}-${fretRow}`;
    const diagram = state.diagrams[diagramIdx];

    if (value === null) {
      delete diagram.dots[key];
    } else {
      const existing = getDot(diagram, key);
      diagram.dots[key] = {
        finger: String(value).slice(0, 2),
        color: existing ? existing.color : 'black',
      };
    }

    saveState();
    renderSingleDiagram(diagramIdx);
    if (close) closeFingerMenu();
  }

  function applyDotColor(color) {
    if (!activeTarget) return;
    const { diagramIdx, stringIdx, fretRow } = activeTarget;
    const key = `${stringIdx}-${fretRow}`;
    const diagram = state.diagrams[diagramIdx];
    const existing = getDot(diagram, key);

    diagram.dots[key] = {
      finger: existing ? existing.finger : '',
      color: DOT_COLORS[color] ? color : 'black',
    };

    saveState();
    renderSingleDiagram(diagramIdx);
    closeFingerMenu();
  }

  fingerMenuEl.addEventListener('click', (e) => {
    const fingerBtn = e.target.closest('.finger-btn');
    if (fingerBtn) {
      applyFingerValue(fingerBtn.dataset.finger);
      return;
    }
    const colorBtn = e.target.closest('.color-btn');
    if (colorBtn) {
      applyDotColor(colorBtn.dataset.color);
      return;
    }
    const actionBtn = e.target.closest('.finger-action-btn');
    if (actionBtn) {
      if (actionBtn.dataset.action === 'dot-only') {
        applyFingerValue('');
      } else if (actionBtn.dataset.action === 'remove') {
        applyFingerValue(null);
      }
    }
  });

  fingerCustomInputEl.addEventListener('input', (e) => {
    const val = e.target.value.slice(0, 2);
    if (e.target.value !== val) e.target.value = val;
    applyFingerValue(val, { close: false });
  });

  fingerCustomInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyFingerValue(fingerCustomInputEl.value.slice(0, 2));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeFingerMenu();
    }
  });

  fingerCustomApplyBtn.addEventListener('click', () => {
    applyFingerValue(fingerCustomInputEl.value.slice(0, 2));
  });

  document.addEventListener('click', (e) => {
    if (!fingerMenuEl.contains(e.target)) {
      closeFingerMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!activeTarget) return;
    if (e.target === fingerCustomInputEl) return;
    const key = e.key.toUpperCase();
    if (['1', '2', '3', '4', 'T'].includes(key)) {
      e.preventDefault();
      applyFingerValue(key);
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      applyFingerValue(null);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeFingerMenu();
    }
  });

  pageTitleEl.addEventListener('input', (e) => {
    state.title = e.target.value;
    saveState();
  });

  instrumentSelectEl.addEventListener('change', (e) => {
    state.instrument = INSTRUMENTS[e.target.value] ? e.target.value : 'guitar';
    saveState();
    renderGrid();
  });

  diagramCountEl.addEventListener('change', (e) => {
    state.count = parseInt(e.target.value, 10) || 16;
    syncToolbarFromState();
    saveState();
    renderGrid();
  });

  extraFretToggleEl.addEventListener('change', (e) => {
    state.extraFret = e.target.checked;
    saveState();
    renderGrid();
  });

  leftHandedToggleEl.addEventListener('change', (e) => {
    state.leftHanded = e.target.checked;
    saveState();
    renderGrid();
  });

  saveSetBtn.addEventListener('click', () => {
    const defaultName = state.activeSetName || state.title.trim() || 'My Chord Set';
    const rawName = prompt('Save diagram set as:', defaultName);
    if (rawName === null) return;
    const name = rawName.trim();
    if (!name) return;

    if (
      Object.prototype.hasOwnProperty.call(savedSets, name) &&
      name !== state.activeSetName &&
      !confirm(`Overwrite existing saved set "${name}"?`)
    ) {
      return;
    }

    state.activeSetName = name;
    savedSets[name] = normalizeState(state);
    persistSavedSets();
    saveState();
  });

  openSetBtn.addEventListener('click', () => {
    renderSavedSetsList();
    openModal(openModalEl);
  });

  clearAllBtn.addEventListener('click', () => {
    if (!confirm('Clear the page title and all chord diagrams?')) return;
    state.title = '';
    state.activeSetName = '';
    state.diagrams = Array.from({ length: MAX_DIAGRAMS }, createEmptyDiagram);
    pageTitleEl.value = '';
    saveState();
    renderGrid();
  });

  downloadPdfBtn.addEventListener('click', () => {
    closeFingerMenu();
    if (typeof html2pdf === 'undefined') {
      alert('PDF library failed to load. Opening the print dialog instead so you can save as PDF.');
      window.print();
      return;
    }

    const sheetEl = document.querySelector('.sheet');
    const rawTitle = state.title.trim();
    const safeName = rawTitle
      ? rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : 'chord-diagrams';
    const filename = `${safeName || 'chord-diagrams'}.pdf`;

    downloadPdfBtn.disabled = true;
    const prevLabel = downloadPdfBtn.textContent;
    downloadPdfBtn.textContent = 'Exporting...';
    document.body.classList.add('pdf-exporting');

    html2pdf()
      .set({
        margin: [0.35, 0.4, 0.35, 0.4],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, backgroundColor: '#ffffff', useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
      })
      .from(sheetEl)
      .save()
      .catch(() => {
        alert('Could not generate PDF directly. Opening the print dialog instead.');
        window.print();
      })
      .finally(() => {
        document.body.classList.remove('pdf-exporting');
        downloadPdfBtn.disabled = false;
        downloadPdfBtn.textContent = prevLabel;
      });
  });

  printBtn.addEventListener('click', () => {
    closeFingerMenu();
    window.print();
  });

  function openModal(modalEl) {
    closeFingerMenu();
    modalEl.classList.add('open');
    modalEl.setAttribute('aria-hidden', 'false');
  }

  function closeModal(modalEl) {
    modalEl.classList.remove('open');
    modalEl.setAttribute('aria-hidden', 'true');
  }

  helpBtn.addEventListener('click', () => openModal(helpModalEl));
  helpCloseBtn.addEventListener('click', () => closeModal(helpModalEl));
  openCloseBtn.addEventListener('click', () => closeModal(openModalEl));

  [helpModalEl, openModalEl].forEach((modalEl) => {
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) {
        closeModal(modalEl);
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (helpModalEl.classList.contains('open')) closeModal(helpModalEl);
    if (openModalEl.classList.contains('open')) closeModal(openModalEl);
  });

  syncToolbarFromState();
  renderGrid();
})();
