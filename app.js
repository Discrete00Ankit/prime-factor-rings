/**
 * Main Application Logic for Prime Factor Rings Visualizer (Enhanced)
 * Manages UI rendering, SVG generation, always-visible sticky side dock,
 * parallel dual-column Euclidean division algorithm, and KaTeX math typesetting.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    selectedA: 60,
    selectedB: 72,
    activeTab: 'tab-grid',
    colorMode: 'paper', // 'paper' | 'spectrum'
    activeFilter: 'all',
    hoveredNumber: 60,
    
    // Euclid Lab State
    euclidA: 2024,
    euclidB: 748,
    euclidStepsData: null,
    euclidCurrentStep: 0,
    euclidAutoPlayTimer: null
  };

  /* ==========================================================================
     KaTeX / Math Renderer with Graceful Offline Fallback
     ========================================================================== */
  function renderLatexInDOM(targetEl = document.body) {
    if (window.renderMathInElement) {
      try {
        renderMathInElement(targetEl, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '\\[', right: '\\]', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\(', right: '\\)', display: false }
          ],
          throwOnError: false
        });
      } catch (err) {
        console.warn('KaTeX render warning:', err);
      }
    } else {
      renderMathFallback(targetEl);
    }
  }

  function renderMathFallback(root = document.body) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(node => {
      const text = node.nodeValue;
      if (!text || (!text.includes('$') && !text.includes('\\(') && !text.includes('\\['))) return;

      const parent = node.parentNode;
      if (!parent || ['SCRIPT', 'STYLE', 'TEXTAREA'].includes(parent.tagName)) return;

      let replaced = text
        .replace(/\\\[(.*?)\\\]/g, '<span class="math-disp">$1</span>')
        .replace(/\\\((.*?)\\\)/g, '<span class="math-in">$1</span>')
        .replace(/\$\$(.*?)\$\$/g, '<span class="math-disp">$1</span>')
        .replace(/\$(.*?)\$/g, '<span class="math-in">$1</span>');

      if (replaced !== text) {
        replaced = cleanLatexSymbols(replaced);
        const span = document.createElement('span');
        span.innerHTML = replaced;
        parent.replaceChild(span, node);
      }
    });
  }

  function cleanLatexSymbols(html) {
    return html
      .replace(/\\gcd/g, '<strong>gcd</strong>')
      .replace(/\\operatorname\{lcm\}/g, '<strong>lcm</strong>')
      .replace(/\\min/g, 'min')
      .replace(/\\max/g, 'max')
      .replace(/\\nu_p/g, 'ν<sub>p</sub>')
      .replace(/\\equiv/g, '≡')
      .replace(/\\pmod\{(.*?)\}/g, '(mod $1)')
      .replace(/\\pmod\s+(\d+)/g, '(mod $1)')
      .replace(/\\times/g, '×')
      .replace(/\\cdot/g, '·')
      .replace(/\\ge/g, '≥')
      .replace(/\\le/g, '≤')
      .replace(/\\sqrt\{(.*?)\}/g, '√$1')
      .replace(/\\sqrt\{(\w+)\}/g, '√$1')
      .replace(/\^\{(\d+)\}/g, '<sup>$1</sup>')
      .replace(/\^(\d)/g, '<sup>$1</sup>')
      .replace(/_\{(\w+)\}/g, '<sub>$1</sub>')
      .replace(/_(\w)/g, '<sub>$1</sub>')
      .replace(/\\mathbf\{(.*?)\}/g, '<strong>$1</strong>');
  }

  /* ==========================================================================
     SVG Prime Ring Generator
     ========================================================================== */
  function createRingSVG(num, options = {}) {
    const size = options.size || 68;
    const center = size / 2;
    const outerRadius = options.outerRadius || (size * 0.44);
    const innerRadius = options.innerRadius || (size * 0.30);
    const badgeRadius = options.badgeRadius || (innerRadius * 0.95);
    const colorMode = options.colorMode || state.colorMode;
    const showNumber = options.showNumber !== false;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('class', 'ring-svg');

    // Number 1: Single neutral grey ring
    if (num === 1) {
      const ring1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring1.setAttribute('cx', center);
      ring1.setAttribute('cy', center);
      ring1.setAttribute('r', (outerRadius + innerRadius) / 2);
      ring1.setAttribute('stroke', MathEngine.getPrimeColor(1, colorMode));
      ring1.setAttribute('stroke-width', outerRadius - innerRadius);
      ring1.setAttribute('fill', 'none');
      svg.appendChild(ring1);

      if (showNumber) {
        appendCenterBadge(svg, center, badgeRadius, '1', size);
      }
      return svg;
    }

    const factors = MathEngine.factorize(num);
    const k = factors.length;

    // Prime numbers: Exactly 1 factor -> Full continuous ring
    if (k === 1) {
      const p = factors[0];
      const color = MathEngine.getPrimeColor(p, colorMode);
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      ring.setAttribute('cx', center);
      ring.setAttribute('cy', center);
      ring.setAttribute('r', (outerRadius + innerRadius) / 2);
      ring.setAttribute('stroke', color);
      ring.setAttribute('stroke-width', outerRadius - innerRadius);
      ring.setAttribute('fill', 'none');
      ring.setAttribute('class', 'ring-arc');
      
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `Prime ${p}`;
      ring.appendChild(title);
      
      svg.appendChild(ring);
      if (showNumber) {
        appendCenterBadge(svg, center, badgeRadius, String(num), size);
      }
      return svg;
    }

    // Composite numbers: Divide ring into k circular arcs with clean white gaps
    const sliceAngle = 360 / k;
    const gapDeg = Math.min(6, Math.max(2.5, 20 / k));

    factors.forEach((p, index) => {
      const startDeg = index * sliceAngle + (gapDeg / 2) - 90;
      const endDeg = (index + 1) * sliceAngle - (gapDeg / 2) - 90;
      const color = MathEngine.getPrimeColor(p, colorMode);

      const pathData = describeAnnularSector(center, center, innerRadius, outerRadius, startDeg, endDeg);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('fill', color);
      path.setAttribute('class', 'ring-arc');

      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      title.textContent = `Prime factor ${p} (${MathEngine.getPrimeLabel(p, colorMode)})`;
      path.appendChild(title);

      svg.appendChild(path);
    });

    if (showNumber) {
      appendCenterBadge(svg, center, badgeRadius, String(num), size);
    }

    return svg;
  }

  function describeAnnularSector(cx, cy, rIn, rOut, startAngleDeg, endAngleDeg) {
    const toRad = Math.PI / 180;
    const a1 = startAngleDeg * toRad;
    const a2 = endAngleDeg * toRad;

    const x1 = cx + rOut * Math.cos(a1);
    const y1 = cy + rOut * Math.sin(a1);
    const x2 = cx + rOut * Math.cos(a2);
    const y2 = cy + rOut * Math.sin(a2);
    const x3 = cx + rIn * Math.cos(a2);
    const y3 = cy + rIn * Math.sin(a2);
    const x4 = cx + rIn * Math.cos(a1);
    const y4 = cy + rIn * Math.sin(a1);

    const largeArc = (endAngleDeg - startAngleDeg) > 180 ? 1 : 0;

    return `M ${x1} ${y1} A ${rOut} ${rOut} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rIn} ${rIn} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  }

  function appendCenterBadge(svg, center, radius, text, size) {
    const badge = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    badge.setAttribute('cx', center);
    badge.setAttribute('cy', center);
    badge.setAttribute('r', radius);
    badge.setAttribute('fill', '#ffffff');
    badge.setAttribute('stroke', '#cbd5e1');
    badge.setAttribute('stroke-width', '1.2');
    svg.appendChild(badge);

    const textNode = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textNode.setAttribute('x', center);
    textNode.setAttribute('y', center + (size > 100 ? 1.5 : 1));
    textNode.setAttribute('text-anchor', 'middle');
    textNode.setAttribute('dominant-baseline', 'central');
    textNode.setAttribute('fill', '#0f172a');
    textNode.setAttribute('font-family', 'Inter, sans-serif');
    textNode.setAttribute('font-weight', '800');

    let fontSize = size * 0.32;
    if (text.length === 3) fontSize *= 0.85;
    if (text.length >= 4) fontSize *= 0.72;
    textNode.setAttribute('font-size', fontSize);
    textNode.textContent = text;
    svg.appendChild(textNode);
  }

  /* ==========================================================================
     Tab Navigation Controller
     ========================================================================== */
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-content');

  function setActiveTab(targetId) {
    state.activeTab = targetId;
    tabBtns.forEach(btn => {
      const isActive = btn.dataset.tab === targetId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    tabPanels.forEach(panel => {
      panel.classList.toggle('active', panel.id === targetId);
    });

    if (targetId === 'tab-grid') {
      renderSideDock();
    } else if (targetId === 'tab-gcd') {
      renderGCDStudio();
    } else if (targetId === 'tab-lcm') {
      renderLCMStudio();
    } else if (targetId === 'tab-euclid') {
      initEuclidLab();
    } else if (targetId === 'tab-challenge') {
      renderWorksheetChallenge();
    }

    setTimeout(() => renderLatexInDOM(), 50);
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setActiveTab(btn.dataset.tab);
    });
  });

  /* ==========================================================================
     Color Mode Toggle
     ========================================================================== */
  const paletteToggleBtn = document.getElementById('paletteToggleBtn');
  const paletteModeLabel = document.getElementById('paletteModeLabel');

  paletteToggleBtn.addEventListener('click', () => {
    state.colorMode = state.colorMode === 'paper' ? 'spectrum' : 'paper';
    paletteModeLabel.textContent = state.colorMode === 'paper' ? 'Worksheet Colors' : 'Spectrum Colors';

    renderGrid100();
    renderSideDock();
    renderGCDStudio();
    renderLCMStudio();
    updateHoverInspector(state.hoveredNumber);
  });

  /* ==========================================================================
     1–100 Visual Grid Controller with Mouse Hover/Drag
     ========================================================================== */
  const matrixContainer = document.getElementById('matrixContainer');
  const filterChips = document.querySelectorAll('#filterChips .chip-btn');
  const gridSearchInput = document.getElementById('gridSearchInput');

  function renderGrid100() {
    matrixContainer.innerHTML = '';

    for (let num = 1; num <= 100; num++) {
      const node = document.createElement('div');
      node.className = 'number-node';
      node.dataset.number = num;

      if (num === state.selectedA) node.classList.add('selected-a');
      if (num === state.selectedB) node.classList.add('selected-b');
      if (num === state.hoveredNumber) node.classList.add('hover-active');

      const svg = createRingSVG(num, { size: 68 });
      node.appendChild(svg);

      // Real-time hover / glide updates
      node.addEventListener('mouseenter', () => {
        handleNodeHover(num, node);
      });

      node.addEventListener('mousemove', () => {
        if (state.hoveredNumber !== num) {
          handleNodeHover(num, node);
        }
      });

      node.addEventListener('click', (e) => {
        if (e.shiftKey) {
          setSelectedPair(state.selectedA, num);
        } else {
          setSelectedPair(num, state.selectedB);
        }
        handleNodeHover(num, node);
      });

      matrixContainer.appendChild(node);
    }

    applyFilter(state.activeFilter);
  }

  function handleNodeHover(num, nodeElement) {
    state.hoveredNumber = num;

    const allNodes = matrixContainer.querySelectorAll('.number-node');
    allNodes.forEach(n => n.classList.remove('hover-active'));
    if (nodeElement) nodeElement.classList.add('hover-active');

    updateHoverInspector(num);
  }

  function applyFilter(filter) {
    state.activeFilter = filter;
    const nodes = matrixContainer.querySelectorAll('.number-node');

    filterChips.forEach(chip => {
      chip.classList.toggle('active', chip.dataset.filter === filter);
    });

    nodes.forEach(node => {
      const n = parseInt(node.dataset.number, 10);
      let matches = true;

      if (filter === 'prime') {
        matches = MathEngine.isPrime(n);
      } else if (filter === 'mult2') {
        matches = n % 2 === 0;
      } else if (filter === 'mult3') {
        matches = n % 3 === 0;
      } else if (filter === 'mult5') {
        matches = n % 5 === 0;
      } else if (filter === 'mult7') {
        matches = n % 7 === 0;
      } else if (filter === 'primeGe11') {
        matches = MathEngine.factorize(n).some(p => p >= 11);
      } else if (filter === 'square') {
        const root = Math.round(Math.sqrt(n));
        matches = root * root === n;
      }

      node.classList.toggle('dimmed', !matches);
    });
  }

  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      applyFilter(chip.dataset.filter);
    });
  });

  gridSearchInput.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    const nodes = matrixContainer.querySelectorAll('.number-node');
    nodes.forEach(node => {
      const n = parseInt(node.dataset.number, 10);
      if (isNaN(val)) {
        node.classList.remove('highlighted');
      } else {
        const match = n === val;
        node.classList.toggle('highlighted', match);
        if (match) {
          handleNodeHover(n, node);
        }
      }
    });
  });

  // Preset Buttons in Grid Header
  document.getElementById('btnPair6072').addEventListener('click', () => {
    setSelectedPair(60, 72);
  });
  document.getElementById('btnPair2436').addEventListener('click', () => {
    setSelectedPair(24, 36);
  });
  document.getElementById('btnPair40100').addEventListener('click', () => {
    setSelectedPair(40, 100);
  });

  function setSelectedPair(a, b) {
    state.selectedA = a;
    state.selectedB = b;
    document.getElementById('headerTagA').textContent = `A: ${a}`;
    document.getElementById('headerTagB').textContent = `B: ${b}`;

    const dockA = document.getElementById('dockInputA');
    const dockB = document.getElementById('dockInputB');
    if (dockA) dockA.value = a;
    if (dockB) dockB.value = b;

    const gcdA = document.getElementById('gcdInputA');
    const gcdB = document.getElementById('gcdInputB');
    if (gcdA) gcdA.value = a;
    if (gcdB) gcdB.value = b;

    const lcmA = document.getElementById('lcmInputA');
    const lcmB = document.getElementById('lcmInputB');
    if (lcmA) lcmA.value = a;
    if (lcmB) lcmB.value = b;

    const nodes = matrixContainer.querySelectorAll('.number-node');
    nodes.forEach(node => {
      const n = parseInt(node.dataset.number, 10);
      node.classList.toggle('selected-a', n === a);
      node.classList.toggle('selected-b', n === b);
    });

    renderSideDock();
  }

  /* ==========================================================================
     Homepage Sticky Side Dock: Compact Inspector (Always 100% visible)
     ========================================================================== */
  const dockRingWrapper = document.getElementById('dockRingWrapper');
  const dockNumberTitle = document.getElementById('dockNumberTitle');
  const dockTypeTag = document.getElementById('dockTypeTag');
  const dockFormula = document.getElementById('dockFormula');
  const dockArcBreakdown = document.getElementById('dockArcBreakdown');
  const dockPinA = document.getElementById('dockPinA');
  const dockPinB = document.getElementById('dockPinB');

  const dockInputA = document.getElementById('dockInputA');
  const dockInputB = document.getElementById('dockInputB');
  const dockGcdFormula = document.getElementById('dockGcdFormula');
  const dockGcdRule = document.getElementById('dockGcdRule');
  const dockGcdRing = document.getElementById('dockGcdRing');
  const dockLcmFormula = document.getElementById('dockLcmFormula');
  const dockLcmRule = document.getElementById('dockLcmRule');
  const dockLcmRing = document.getElementById('dockLcmRing');

  function updateHoverInspector(num) {
    if (!dockRingWrapper) return;

    dockRingWrapper.innerHTML = '';
    // Compact 76px SVG ring for clean vertical fit
    const ringSvg = createRingSVG(num, { size: 76, outerRadius: 34, innerRadius: 23, badgeRadius: 20 });
    dockRingWrapper.appendChild(ringSvg);

    dockNumberTitle.textContent = num;
    const isP = MathEngine.isPrime(num);

    if (num === 1) {
      dockTypeTag.className = 'inspector-tag tag-unit';
      dockTypeTag.textContent = 'Unit 1';
      dockFormula.innerHTML = `\\(1\\) (Unit element)`;
    } else if (isP) {
      dockTypeTag.className = 'inspector-tag tag-prime';
      dockTypeTag.textContent = 'Prime';
      dockFormula.innerHTML = `\\(${num}\\) (Prime)`;
    } else {
      dockTypeTag.className = 'inspector-tag tag-composite';
      dockTypeTag.textContent = 'Composite';
      dockFormula.innerHTML = `\\(${num} = ${MathEngine.formatFactorization(num)}\\)`;
    }

    // Render Compact Chips for factors
    dockArcBreakdown.innerHTML = '';
    const counts = MathEngine.factorCounts(num);
    const totalArcs = MathEngine.factorize(num).length;

    if (num === 1) {
      dockArcBreakdown.innerHTML = `<span class="arc-chip-pill" style="border-left: 3px solid #94a3b8;">1 has no prime factors</span>`;
    } else {
      counts.forEach((power, prime) => {
        const color = MathEngine.getPrimeColor(prime, state.colorMode);
        const arcDeg = Math.round(power * (360 / totalArcs));

        const chip = document.createElement('div');
        chip.className = 'arc-chip-pill';
        chip.style.borderLeft = `3.5px solid ${color}`;
        chip.innerHTML = `
          <span class="color-dot" style="background-color: ${color}; width: 10px; height: 10px;"></span>
          <span><strong>${prime}</strong>: ${power} arc${power > 1 ? 's' : ''} (${arcDeg}°)</span>
        `;
        dockArcBreakdown.appendChild(chip);
      });
    }

    dockPinA.textContent = `📌 Pin ${num} as A`;
    dockPinB.textContent = `📌 Pin ${num} as B`;

    renderLatexInDOM(dockFormula);
  }

  dockPinA.addEventListener('click', () => {
    setSelectedPair(state.hoveredNumber, state.selectedB);
  });

  dockPinB.addEventListener('click', () => {
    setSelectedPair(state.selectedA, state.hoveredNumber);
  });

  function renderSideDock() {
    const a = parseInt(dockInputA.value, 10) || state.selectedA || 60;
    const b = parseInt(dockInputB.value, 10) || state.selectedB || 72;

    const gcdAnalysis = MathEngine.getGCDAnalysis(a, b, state.colorMode);
    const lcmAnalysis = MathEngine.getLCMAnalysis(a, b, state.colorMode);

    dockGcdFormula.innerHTML = `\\(\\gcd(${a}, ${b}) = ${gcdAnalysis.formula} = \\mathbf{${gcdAnalysis.gcd}}\\)`;
    dockGcdRule.textContent = `Takes min arcs: ${gcdAnalysis.totalMinArcs} arc${gcdAnalysis.totalMinArcs !== 1 ? 's' : ''}`;
    dockGcdRing.innerHTML = '';
    dockGcdRing.appendChild(createRingSVG(gcdAnalysis.gcd, { size: 50, outerRadius: 22, innerRadius: 15, badgeRadius: 13 }));

    dockLcmFormula.innerHTML = `\\(\\operatorname{lcm}(${a}, ${b}) = ${lcmAnalysis.formula} = \\mathbf{${lcmAnalysis.lcm.toLocaleString()}}\\)`;
    dockLcmRule.textContent = `Takes max arcs: ${lcmAnalysis.totalMaxArcs} arc${lcmAnalysis.totalMaxArcs !== 1 ? 's' : ''}`;
    dockLcmRing.innerHTML = '';
    dockLcmRing.appendChild(createRingSVG(lcmAnalysis.lcm, { size: 50, outerRadius: 22, innerRadius: 15, badgeRadius: 13 }));

    renderLatexInDOM(dockGcdFormula);
    renderLatexInDOM(dockLcmFormula);
  }

  dockInputA.addEventListener('input', () => {
    const val = parseInt(dockInputA.value, 10);
    if (val > 0) setSelectedPair(val, state.selectedB);
  });

  dockInputB.addEventListener('input', () => {
    const val = parseInt(dockInputB.value, 10);
    if (val > 0) setSelectedPair(state.selectedA, val);
  });

  document.getElementById('dockOpenFullGCD').addEventListener('click', () => {
    setActiveTab('tab-gcd');
  });

  document.getElementById('dockOpenFullEuclid').addEventListener('click', () => {
    const euA = document.getElementById('euclidInputA');
    const euB = document.getElementById('euclidInputB');
    if (euA) euA.value = state.selectedA;
    if (euB) euB.value = state.selectedB;
    setActiveTab('tab-euclid');
  });

  /* ==========================================================================
     GCD Studio Controller (Minimum Arcs Rule)
     ========================================================================== */
  const gcdInputA = document.getElementById('gcdInputA');
  const gcdInputB = document.getElementById('gcdInputB');
  const gcdCalculateBtn = document.getElementById('gcdCalculateBtn');

  function renderGCDStudio() {
    const a = parseInt(gcdInputA.value, 10) || 60;
    const b = parseInt(gcdInputB.value, 10) || 72;
    state.selectedA = a;
    state.selectedB = b;

    const analysis = MathEngine.getGCDAnalysis(a, b, state.colorMode);

    document.getElementById('gcdValA').textContent = a;
    const fA = document.getElementById('gcdFormulaA');
    fA.innerHTML = `\\(${MathEngine.formatFactorization(a)}\\)`;
    const ringA = document.getElementById('gcdRingA');
    ringA.innerHTML = '';
    ringA.appendChild(createRingSVG(a, { size: 110, outerRadius: 48, innerRadius: 33, badgeRadius: 29 }));

    document.getElementById('gcdValB').textContent = b;
    const fB = document.getElementById('gcdFormulaB');
    fB.innerHTML = `\\(${MathEngine.formatFactorization(b)}\\)`;
    const ringB = document.getElementById('gcdRingB');
    ringB.innerHTML = '';
    ringB.appendChild(createRingSVG(b, { size: 110, outerRadius: 48, innerRadius: 33, badgeRadius: 29 }));

    document.getElementById('gcdValRes').textContent = analysis.gcd;
    const fRes = document.getElementById('gcdFormulaRes');
    fRes.innerHTML = `\\(${analysis.formula} = \\mathbf{${analysis.gcd}}\\)`;
    const ringRes = document.getElementById('gcdRingRes');
    ringRes.innerHTML = '';
    ringRes.appendChild(createRingSVG(analysis.gcd, { size: 110, outerRadius: 48, innerRadius: 33, badgeRadius: 29 }));

    const tbody = document.getElementById('gcdTableBody');
    tbody.innerHTML = '';

    analysis.breakdown.forEach(row => {
      const tr = document.createElement('tr');

      let tokensA = '';
      for (let i = 0; i < row.countA; i++) {
        tokensA += `<span class="mini-arc-token" style="background-color: ${row.color};">${row.prime}</span>`;
      }
      if (row.countA === 0) tokensA = '<span style="color: var(--text-light); font-size: 0.9rem;">None (0)</span>';

      let tokensB = '';
      for (let i = 0; i < row.countB; i++) {
        tokensB += `<span class="mini-arc-token" style="background-color: ${row.color};">${row.prime}</span>`;
      }
      if (row.countB === 0) tokensB = '<span style="color: var(--text-light); font-size: 0.9rem;">None (0)</span>';

      let tokensMin = '';
      for (let i = 0; i < row.minCount; i++) {
        tokensMin += `<span class="mini-arc-token" style="background-color: ${row.color};">${row.prime}</span>`;
      }

      tr.innerHTML = `
        <td>
          <div class="prime-cell-pill">
            <span class="color-dot" style="background-color: ${row.color};"></span>
            <span>${row.label}</span>
          </div>
        </td>
        <td>
          <div class="arc-dots-container">
            ${tokensA}
            <span class="count-badge">(${row.countA})</span>
          </div>
        </td>
        <td>
          <div class="arc-dots-container">
            ${tokensB}
            <span class="count-badge">(${row.countB})</span>
          </div>
        </td>
        <td>
          <span class="rule-highlight-box ${row.included ? 'highlight-win' : ''}">
            min(${row.countA}, ${row.countB}) = <strong>${row.minCount}</strong> arc${row.minCount !== 1 ? 's' : ''}
          </span>
        </td>
        <td>
          ${row.included 
            ? `<div class="arc-dots-container">${tokensMin} <span style="font-weight: 800; margin-left: 8px;">${row.prime}<sup>${row.minCount}</sup></span></div>`
            : '<span style="color: var(--text-light);">Excluded (power 0)</span>'}
        </td>
      `;
      tbody.appendChild(tr);
    });

    renderLatexInDOM(document.getElementById('tab-gcd'));
  }

  gcdCalculateBtn.addEventListener('click', renderGCDStudio);

  document.querySelectorAll('.preset-pill[data-target="gcd"]').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.preset-pill[data-target="gcd"]').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      gcdInputA.value = pill.dataset.a;
      gcdInputB.value = pill.dataset.b;
      renderGCDStudio();
    });
  });

  /* ==========================================================================
     LCM Studio Controller (Maximum Arcs Rule)
     ========================================================================== */
  const lcmInputA = document.getElementById('lcmInputA');
  const lcmInputB = document.getElementById('lcmInputB');
  const lcmCalculateBtn = document.getElementById('lcmCalculateBtn');

  function renderLCMStudio() {
    const a = parseInt(lcmInputA.value, 10) || 60;
    const b = parseInt(lcmInputB.value, 10) || 72;

    const analysis = MathEngine.getLCMAnalysis(a, b, state.colorMode);

    document.getElementById('lcmValA').textContent = a;
    const fA = document.getElementById('lcmFormulaA');
    fA.innerHTML = `\\(${MathEngine.formatFactorization(a)}\\)`;
    const ringA = document.getElementById('lcmRingA');
    ringA.innerHTML = '';
    ringA.appendChild(createRingSVG(a, { size: 110, outerRadius: 48, innerRadius: 33, badgeRadius: 29 }));

    document.getElementById('lcmValB').textContent = b;
    const fB = document.getElementById('lcmFormulaB');
    fB.innerHTML = `\\(${MathEngine.formatFactorization(b)}\\)`;
    const ringB = document.getElementById('lcmRingB');
    ringB.innerHTML = '';
    ringB.appendChild(createRingSVG(b, { size: 110, outerRadius: 48, innerRadius: 33, badgeRadius: 29 }));

    document.getElementById('lcmValRes').textContent = analysis.lcm.toLocaleString();
    const fRes = document.getElementById('lcmFormulaRes');
    fRes.innerHTML = `\\(${analysis.formula} = \\mathbf{${analysis.lcm.toLocaleString()}}\\)`;
    const ringRes = document.getElementById('lcmRingRes');
    ringRes.innerHTML = '';
    ringRes.appendChild(createRingSVG(analysis.lcm, { size: 110, outerRadius: 48, innerRadius: 33, badgeRadius: 29 }));

    const tbody = document.getElementById('lcmTableBody');
    tbody.innerHTML = '';

    analysis.breakdown.forEach(row => {
      const tr = document.createElement('tr');

      let tokensA = '';
      for (let i = 0; i < row.countA; i++) {
        tokensA += `<span class="mini-arc-token" style="background-color: ${row.color};">${row.prime}</span>`;
      }
      if (row.countA === 0) tokensA = '<span style="color: var(--text-light); font-size: 0.9rem;">None (0)</span>';

      let tokensB = '';
      for (let i = 0; i < row.countB; i++) {
        tokensB += `<span class="mini-arc-token" style="background-color: ${row.color};">${row.prime}</span>`;
      }
      if (row.countB === 0) tokensB = '<span style="color: var(--text-light); font-size: 0.9rem;">None (0)</span>';

      let tokensMax = '';
      for (let i = 0; i < row.maxCount; i++) {
        tokensMax += `<span class="mini-arc-token" style="background-color: ${row.color};">${row.prime}</span>`;
      }

      tr.innerHTML = `
        <td>
          <div class="prime-cell-pill">
            <span class="color-dot" style="background-color: ${row.color};"></span>
            <span>${row.label}</span>
          </div>
        </td>
        <td>
          <div class="arc-dots-container">
            ${tokensA}
            <span class="count-badge">(${row.countA})</span>
          </div>
        </td>
        <td>
          <div class="arc-dots-container">
            ${tokensB}
            <span class="count-badge">(${row.countB})</span>
          </div>
        </td>
        <td>
          <span class="rule-highlight-box ${row.included ? 'highlight-win-lcm' : ''}">
            max(${row.countA}, ${row.countB}) = <strong>${row.maxCount}</strong> arc${row.maxCount !== 1 ? 's' : ''}
          </span>
        </td>
        <td>
          ${row.included 
            ? `<div class="arc-dots-container">${tokensMax} <span style="font-weight: 800; margin-left: 8px;">${row.prime}<sup>${row.maxCount}</sup></span></div>`
            : '<span style="color: var(--text-light);">Excluded (0)</span>'}
        </td>
      `;
      tbody.appendChild(tr);
    });

    renderLatexInDOM(document.getElementById('tab-lcm'));
  }

  lcmCalculateBtn.addEventListener('click', renderLCMStudio);

  document.querySelectorAll('.preset-pill[data-target="lcm"]').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.preset-pill[data-target="lcm"]').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      lcmInputA.value = pill.dataset.a;
      lcmInputB.value = pill.dataset.b;
      renderLCMStudio();
    });
  });

  /* ==========================================================================
     Euclid's Division Algorithm (PARALLEL DUAL-COLUMN SOLVING DASHBOARD)
     ========================================================================== */
  const euclidInputA = document.getElementById('euclidInputA');
  const euclidInputB = document.getElementById('euclidInputB');
  const euclidStartBtn = document.getElementById('euclidStartBtn');
  const btnEuclidPrev = document.getElementById('btnEuclidPrev');
  const btnEuclidNext = document.getElementById('btnEuclidNext');
  const btnEuclidPlay = document.getElementById('btnEuclidPlay');
  const btnEuclidReset = document.getElementById('btnEuclidReset');

  const euclidStepsCounter = document.getElementById('euclidStepsCounter');
  const euclidLadderContainer = document.getElementById('euclidLadderContainer');
  const euclidGrandResultCard = document.getElementById('euclidGrandResultCard');
  const grandResultFormula = document.getElementById('grandResultFormula');
  const grandResultDesc = document.getElementById('grandResultDesc');

  const spotlightStepPill = document.getElementById('spotlightStepPill');
  const spotlightActionText = document.getElementById('spotlightActionText');
  const spotlightEquationBox = document.getElementById('spotlightEquationBox');
  const spotDividend = document.getElementById('spotDividend');
  const spotDivisor = document.getElementById('spotDivisor');
  const spotQuotient = document.getElementById('spotQuotient');
  const spotRemainder = document.getElementById('spotRemainder');
  const spotlightExplanation = document.getElementById('spotlightExplanation');
  const barStepNum = document.getElementById('barStepNum');
  const euclidBarStage = document.getElementById('euclidBarStage');

  function initEuclidLab() {
    state.euclidA = parseInt(euclidInputA.value, 10) || 2024;
    state.euclidB = parseInt(euclidInputB.value, 10) || 748;
    state.euclidStepsData = MathEngine.getEuclideanSteps(state.euclidA, state.euclidB);
    state.euclidCurrentStep = 0;
    stopEuclidAutoPlay();
    renderEuclidParallelDashboard();
  }

  function renderEuclidParallelDashboard() {
    const data = state.euclidStepsData;
    if (!data || !data.steps.length) return;

    const currentIdx = state.euclidCurrentStep;
    const step = data.steps[currentIdx];
    const total = data.steps.length;
    const isFinal = currentIdx === total - 1;

    // 1. Update Left Column: Step Counter & Ladder
    euclidStepsCounter.textContent = `Step ${currentIdx + 1} of ${total}`;
    euclidLadderContainer.innerHTML = '';

    data.steps.forEach((s, idx) => {
      const card = document.createElement('div');
      card.className = 'ladder-step-card';
      if (idx === currentIdx) card.classList.add('active-step');
      if (idx === total - 1) card.classList.add('final-solved-step');

      // Click any step directly to jump!
      card.addEventListener('click', () => {
        state.euclidCurrentStep = idx;
        renderEuclidParallelDashboard();
      });

      card.innerHTML = `
        <div class="ladder-left">
          <span class="ladder-num-badge">Step ${s.stepNumber}</span>
          <span class="ladder-equation">\\(${s.equation}\\)</span>
        </div>
        <div class="ladder-tag">
          ${idx === total - 1 
            ? `🎉 <strong>r = 0 ⟶ GCD = ${data.gcd}</strong>` 
            : `r = ${s.r} ⟶ (${s.b}, ${s.r})`}
        </div>
      `;
      euclidLadderContainer.appendChild(card);
    });

    // Grand Result Box at the base of the left column
    grandResultFormula.innerHTML = `\\(\\gcd(${data.a}, ${data.b}) = \\mathbf{${data.gcd}}\\)`;
    grandResultDesc.innerHTML = `
      The last non-zero remainder was <strong>${data.gcd}</strong>.<br>
      Solved in <strong>${total}</strong> division steps without testing any prime factors!
    `;

    // 2. Update Right Column: Spotlight Focus & Arithmetic Metrics
    spotlightStepPill.textContent = `Step ${currentIdx + 1} of ${total} Spotlight`;
    spotlightActionText.textContent = isFinal ? `Final Step: Remainder Reaches 0` : `Dividing ${step.a} by ${step.b}`;
    spotlightEquationBox.innerHTML = `\\(${step.a} = ${step.b} \\times ${step.q} + ${step.r}\\)`;

    spotDividend.textContent = step.a;
    spotDivisor.textContent = step.b;
    spotQuotient.textContent = step.q;
    spotRemainder.textContent = step.r;

    if (isFinal) {
      spotlightExplanation.innerHTML = `
        <strong>Algorithm Terminates:</strong> ${step.a} is divided evenly by ${step.b} with remainder <strong>0</strong>.<br>
        Therefore, the divisor from this step (<strong>${data.gcd}</strong>) is the <strong>Greatest Common Divisor</strong>!
      `;
    } else {
      spotlightExplanation.innerHTML = `
        Divide ${step.a} by ${step.b}: Fits <strong>${step.q}</strong> times (${step.b} × ${step.q} = ${step.b * step.q}) with remainder <strong>${step.r}</strong>.<br>
        Since remainder \\(\\neq 0\\), by Euclid's theorem: \\(\\gcd(${step.a}, ${step.b}) = \\gcd(${step.b}, ${step.r})\\).
      `;
    }

    // 3. Update Right Column: Geometric Segment Tiling Bar
    barStepNum.textContent = currentIdx + 1;
    renderBarTiling(step);

    // Button States
    btnEuclidPrev.disabled = currentIdx === 0;
    btnEuclidNext.disabled = isFinal;

    renderLatexInDOM(document.getElementById('tab-euclid'));
  }

  function renderBarTiling(step) {
    euclidBarStage.innerHTML = '';

    // Bar 1: Dividend
    const rowDividend = document.createElement('div');
    rowDividend.className = 'bar-row';
    rowDividend.innerHTML = `
      <div class="bar-label">Dividend a = ${step.a}</div>
      <div class="bar-track">
        <div class="bar-segment seg-dividend" style="width: 100%;">
          Length ${step.a}
        </div>
      </div>
    `;
    euclidBarStage.appendChild(rowDividend);

    // Bar 2: Divisor repeated q times + Remainder
    const rowTiling = document.createElement('div');
    rowTiling.className = 'bar-row';

    let segmentsHtml = '';
    const bPercent = step.a > 0 ? (step.b / step.a) * 100 : 0;
    const rPercent = step.a > 0 ? (step.r / step.a) * 100 : 0;

    for (let i = 0; i < step.q; i++) {
      segmentsHtml += `
        <div class="bar-segment seg-divisor" style="width: ${bPercent}%;">
          ${step.b}
        </div>
      `;
    }
    if (step.r > 0) {
      segmentsHtml += `
        <div class="bar-segment seg-remainder" style="width: ${rPercent}%;">
          r = ${step.r}
        </div>
      `;
    }

    rowTiling.innerHTML = `
      <div class="bar-label">b = ${step.b} × ${step.q}</div>
      <div class="bar-track">
        ${segmentsHtml}
      </div>
    `;
    euclidBarStage.appendChild(rowTiling);
  }

  function stopEuclidAutoPlay() {
    if (state.euclidAutoPlayTimer) {
      clearInterval(state.euclidAutoPlayTimer);
      state.euclidAutoPlayTimer = null;
      btnEuclidPlay.textContent = '▶ Auto-Play';
    }
  }

  btnEuclidNext.addEventListener('click', () => {
    if (state.euclidStepsData && state.euclidCurrentStep < state.euclidStepsData.steps.length - 1) {
      state.euclidCurrentStep++;
      renderEuclidParallelDashboard();
    }
  });

  btnEuclidPrev.addEventListener('click', () => {
    if (state.euclidCurrentStep > 0) {
      state.euclidCurrentStep--;
      renderEuclidParallelDashboard();
    }
  });

  btnEuclidReset.addEventListener('click', () => {
    stopEuclidAutoPlay();
    state.euclidCurrentStep = 0;
    renderEuclidParallelDashboard();
  });

  btnEuclidPlay.addEventListener('click', () => {
    if (state.euclidAutoPlayTimer) {
      stopEuclidAutoPlay();
    } else {
      btnEuclidPlay.textContent = '⏸ Pause';
      if (state.euclidCurrentStep === state.euclidStepsData.steps.length - 1) {
        state.euclidCurrentStep = 0;
        renderEuclidParallelDashboard();
      }
      state.euclidAutoPlayTimer = setInterval(() => {
        if (state.euclidCurrentStep < state.euclidStepsData.steps.length - 1) {
          state.euclidCurrentStep++;
          renderEuclidParallelDashboard();
        } else {
          stopEuclidAutoPlay();
        }
      }, 1500);
    }
  });

  euclidStartBtn.addEventListener('click', initEuclidLab);

  /* ==========================================================================
     Worksheet Challenge Controller ($360^{2026} \pmod 7$)
     ========================================================================== */
  function renderWorksheetChallenge() {
    const clockContainer = document.getElementById('modClockContainer');
    const cycleTable = document.getElementById('cycleTable');

    const mod = 7;
    const size = 260;
    const center = size / 2;
    const radius = 95;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('class', 'clock-svg');

    const clockBg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    clockBg.setAttribute('cx', center);
    clockBg.setAttribute('cy', center);
    clockBg.setAttribute('r', radius);
    clockBg.setAttribute('fill', '#ffffff');
    clockBg.setAttribute('stroke', '#cbd5e1');
    clockBg.setAttribute('stroke-width', '2.5');
    svg.appendChild(clockBg);

    const points = [];
    for (let i = 0; i < mod; i++) {
      const angle = (i * (360 / mod) - 90) * (Math.PI / 180);
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      points.push({ i, x, y });
    }

    const seq = [1, 3, 2, 6, 4, 5, 1];
    let pathD = '';
    for (let k = 0; k < seq.length; k++) {
      const pt = points[seq[k]];
      if (k === 0) pathD += `M ${pt.x} ${pt.y} `;
      else pathD += `L ${pt.x} ${pt.y} `;
    }

    const orbitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    orbitPath.setAttribute('d', pathD);
    orbitPath.setAttribute('fill', 'none');
    orbitPath.setAttribute('stroke', '#3b82f6');
    orbitPath.setAttribute('stroke-width', '3');
    orbitPath.setAttribute('stroke-dasharray', '6 3');
    svg.appendChild(orbitPath);

    points.forEach(pt => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', pt.x);
      circle.setAttribute('cy', pt.y);
      circle.setAttribute('r', '15');
      circle.setAttribute('fill', pt.i === 4 ? '#f59e0b' : '#f8fafc');
      circle.setAttribute('stroke', pt.i === 4 ? '#b45309' : '#94a3b8');
      circle.setAttribute('stroke-width', '2');
      svg.appendChild(circle);

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', pt.x);
      label.setAttribute('y', pt.y + 1);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dominant-baseline', 'central');
      label.setAttribute('fill', pt.i === 4 ? '#ffffff' : '#0f172a');
      label.setAttribute('font-family', 'Inter, sans-serif');
      label.setAttribute('font-weight', '900');
      label.setAttribute('font-size', '13');
      label.textContent = pt.i;
      svg.appendChild(label);
    });

    clockContainer.innerHTML = '';
    clockContainer.appendChild(svg);

    cycleTable.innerHTML = `
      <div class="cycle-row-card"><span>\\(3^1 \\equiv 3 \\pmod 7\\)</span><span style="color: var(--text-muted);">Power 1</span></div>
      <div class="cycle-row-card"><span>\\(3^2 \\equiv 2 \\pmod 7\\)</span><span style="color: var(--text-muted);">Power 2</span></div>
      <div class="cycle-row-card"><span>\\(3^3 \\equiv 6 \\pmod 7\\)</span><span style="color: var(--text-muted);">Power 3</span></div>
      <div class="cycle-row-card highlight"><span>★ \\(3^4 \\equiv 4 \\pmod 7\\)</span><span style="color: #b45309; font-weight: 800;">Target: \\(2026 \\equiv 4 \\pmod 6\\)</span></div>
      <div class="cycle-row-card"><span>\\(3^5 \\equiv 5 \\pmod 7\\)</span><span style="color: var(--text-muted);">Power 5</span></div>
      <div class="cycle-row-card"><span>\\(3^6 \\equiv 1 \\pmod 7\\)</span><span style="color: #16a34a; font-weight: 800;">Cycle repeats (Period = 6)</span></div>
    `;

    renderLatexInDOM(document.getElementById('tab-challenge'));
  }

  // Interactive Modulo Calculator
  const modPlaySolveBtn = document.getElementById('modPlaySolveBtn');
  modPlaySolveBtn.addEventListener('click', () => {
    const base = parseInt(document.getElementById('modPlayBase').value, 10) || 360;
    const exp = parseInt(document.getElementById('modPlayExp').value, 10) || 2026;
    const mod = parseInt(document.getElementById('modPlayMod').value, 10) || 7;

    const res = MathEngine.solveModPower(base, exp, mod);
    const out = document.getElementById('modPlayOutput');

    out.innerHTML = `
      <div style="background: #f0fdf4; border: 1.5px solid #a7f3d0; padding: 16px 20px; border-radius: 14px; color: #065f46; font-size: 1.1rem;">
        <strong>Result:</strong> \\(${base}^{${exp}} \\equiv ${res.baseMod}^{${exp}} \\equiv \\mathbf{${res.result}} \\pmod{${mod}}\\)
        <div style="font-size: 0.95rem; font-weight: 600; color: #047857; margin-top: 6px;">
          Cycle Period: <strong>${res.cyclePeriod}</strong> &nbsp;|&nbsp; Exponent decomposition: \\(${exp} = ${res.cyclePeriod} \\times ${res.quotient} + ${res.remainder}\\)
        </div>
      </div>
    `;

    renderLatexInDOM(out);
  });

  /* ==========================================================================
     Initial App Boot
     ========================================================================== */
  renderGrid100();
  updateHoverInspector(60);
  renderSideDock();
  renderGCDStudio();
  renderLCMStudio();
  initEuclidLab();
  renderWorksheetChallenge();

  setTimeout(() => renderLatexInDOM(), 100);
});
