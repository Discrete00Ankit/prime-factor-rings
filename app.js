/**
 * Main Application Logic for Prime Factor Rings Visualizer
 * Manages UI rendering, SVG generation, interactive states, animations, and stepper.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    selectedA: 60,
    selectedB: 72,
    activeTab: 'tab-grid',
    colorMode: 'paper', // 'paper' | 'spectrum'
    activeFilter: 'all',
    modalNumber: 60,
    
    // Euclid Lab State
    euclidA: 2024,
    euclidB: 748,
    euclidStepsData: null,
    euclidCurrentStep: 0,
    euclidAutoPlayTimer: null
  };

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

      appendCenterBadge(svg, center, badgeRadius, '1', size);
      return svg;
    }

    const factors = MathEngine.factorize(num);
    const k = factors.length;

    // Prime numbers: Exactly 1 factor -> Full continuous ring of its color
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
      appendCenterBadge(svg, center, badgeRadius, String(num), size);
      return svg;
    }

    // Composite numbers: Divide ring into k circular arcs with clean white gaps
    const sliceAngle = 360 / k;
    // Calculate gap in degrees: proportional, pleasing spacing
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

    // Font size scaling based on digit count and overall SVG size
    let fontSize = size * 0.28;
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

    if (targetId === 'tab-gcd') {
      renderGCDStudio();
    } else if (targetId === 'tab-lcm') {
      renderLCMStudio();
    } else if (targetId === 'tab-euclid') {
      initEuclidLab();
    } else if (targetId === 'tab-challenge') {
      renderWorksheetChallenge();
    }
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

    // Re-render active views
    renderGrid100();
    renderGCDStudio();
    renderLCMStudio();
    if (document.getElementById('numberModal').classList.contains('open')) {
      openNumberModal(state.modalNumber);
    }
  });

  /* ==========================================================================
     1–100 Visual Grid Controller
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

      const svg = createRingSVG(num, { size: 66 });
      node.appendChild(svg);

      node.addEventListener('click', () => {
        openNumberModal(num);
      });

      matrixContainer.appendChild(node);
    }

    applyFilter(state.activeFilter);
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
        node.classList.toggle('highlighted', n === val);
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

    // Update inputs in GCD and LCM
    document.getElementById('gcdInputA').value = a;
    document.getElementById('gcdInputB').value = b;
    document.getElementById('lcmInputA').value = a;
    document.getElementById('lcmInputB').value = b;

    renderGrid100();
  }

  /* ==========================================================================
     Number Inspection Modal
     ========================================================================== */
  const numberModal = document.getElementById('numberModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalRingView = document.getElementById('modalRingView');
  const modalNumberTitle = document.getElementById('modalNumberTitle');
  const modalTypeTag = document.getElementById('modalTypeTag');
  const modalMathFormula = document.getElementById('modalMathFormula');
  const modalArcList = document.getElementById('modalArcList');
  const modalSetA = document.getElementById('modalSetA');
  const modalSetB = document.getElementById('modalSetB');
  const modalGoGCD = document.getElementById('modalGoGCD');

  function openNumberModal(num) {
    state.modalNumber = num;
    modalRingView.innerHTML = '';
    const bigSvg = createRingSVG(num, { size: 140, outerRadius: 62, innerRadius: 42, badgeRadius: 38 });
    modalRingView.appendChild(bigSvg);

    modalNumberTitle.textContent = num;
    const isP = MathEngine.isPrime(num);

    if (num === 1) {
      modalTypeTag.className = 'modal-type-tag tag-unit';
      modalTypeTag.textContent = 'Multiplicative Unit (1)';
    } else if (isP) {
      modalTypeTag.className = 'modal-type-tag tag-prime';
      modalTypeTag.textContent = 'Prime Number';
    } else {
      modalTypeTag.className = 'modal-type-tag tag-composite';
      modalTypeTag.textContent = 'Composite Number';
    }

    modalMathFormula.textContent = `${num} = ${MathEngine.formatFactorization(num)} (${MathEngine.formatExpandedFactors(num)})`;

    modalArcList.innerHTML = '';
    const counts = MathEngine.factorCounts(num);
    if (num === 1) {
      modalArcList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.88rem;">1 has no prime factors. Represented by a grey circle.</div>';
    } else {
      counts.forEach((power, prime) => {
        const item = document.createElement('div');
        item.className = 'arc-item';
        const color = MathEngine.getPrimeColor(prime, state.colorMode);
        item.innerHTML = `
          <div class="arc-item-left">
            <span class="color-dot" style="background-color: ${color};"></span>
            <span>Prime ${prime} (${MathEngine.getPrimeLabel(prime, state.colorMode)})</span>
          </div>
          <div style="font-family: var(--font-mono); font-weight: 700;">
            ${power} arc${power > 1 ? 's' : ''} (${power === 1 ? '360° / ' + MathEngine.factorize(num).length : (power * (360 / MathEngine.factorize(num).length)).toFixed(0) + '° total'})
          </div>
        `;
        modalArcList.appendChild(item);
      });
    }

    numberModal.classList.add('open');
  }

  modalCloseBtn.addEventListener('click', () => {
    numberModal.classList.remove('open');
  });

  numberModal.addEventListener('click', (e) => {
    if (e.target === numberModal) {
      numberModal.classList.remove('open');
    }
  });

  modalSetA.addEventListener('click', () => {
    setSelectedPair(state.modalNumber, state.selectedB);
    numberModal.classList.remove('open');
  });

  modalSetB.addEventListener('click', () => {
    setSelectedPair(state.selectedA, state.modalNumber);
    numberModal.classList.remove('open');
  });

  modalGoGCD.addEventListener('click', () => {
    setSelectedPair(state.modalNumber, state.selectedB);
    numberModal.classList.remove('open');
    setActiveTab('tab-gcd');
  });

  /* ==========================================================================
     GCD Visual Studio Controller (Minimum Arcs Rule)
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

    // Render A
    document.getElementById('gcdValA').textContent = a;
    document.getElementById('gcdFormulaA').textContent = MathEngine.formatFactorization(a);
    const ringA = document.getElementById('gcdRingA');
    ringA.innerHTML = '';
    ringA.appendChild(createRingSVG(a, { size: 110, outerRadius: 48, innerRadius: 32, badgeRadius: 28 }));

    // Render B
    document.getElementById('gcdValB').textContent = b;
    document.getElementById('gcdFormulaB').textContent = MathEngine.formatFactorization(b);
    const ringB = document.getElementById('gcdRingB');
    ringB.innerHTML = '';
    ringB.appendChild(createRingSVG(b, { size: 110, outerRadius: 48, innerRadius: 32, badgeRadius: 28 }));

    // Render Result GCD
    document.getElementById('gcdValRes').textContent = analysis.gcd;
    document.getElementById('gcdFormulaRes').textContent = `${analysis.formula} = ${analysis.gcd}`;
    const ringRes = document.getElementById('gcdRingRes');
    ringRes.innerHTML = '';
    ringRes.appendChild(createRingSVG(analysis.gcd, { size: 110, outerRadius: 48, innerRadius: 32, badgeRadius: 28 }));

    // Populate Analysis Table
    const tbody = document.getElementById('gcdTableBody');
    tbody.innerHTML = '';

    analysis.breakdown.forEach(row => {
      const tr = document.createElement('tr');

      // Mini tokens for A
      let tokensA = '';
      for (let i = 0; i < row.countA; i++) {
        tokensA += `<span class="mini-arc-token" style="background-color: ${row.color};">${row.prime}</span>`;
      }
      if (row.countA === 0) tokensA = '<span style="color: var(--text-light); font-size: 0.85rem;">None (0)</span>';

      // Mini tokens for B
      let tokensB = '';
      for (let i = 0; i < row.countB; i++) {
        tokensB += `<span class="mini-arc-token" style="background-color: ${row.color};">${row.prime}</span>`;
      }
      if (row.countB === 0) tokensB = '<span style="color: var(--text-light); font-size: 0.85rem;">None (0)</span>';

      // Result tokens
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
            ? `<div class="arc-dots-container">${tokensMin} <span style="font-weight: 700; margin-left: 6px;">${row.prime}<sup>${row.minCount}</sup></span></div>`
            : '<span style="color: var(--text-light);">Excluded (power 0)</span>'}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  gcdCalculateBtn.addEventListener('click', renderGCDStudio);

  // GCD Preset Pills
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
     LCM Visual Studio Controller (Maximum Arcs Rule)
     ========================================================================== */
  const lcmInputA = document.getElementById('lcmInputA');
  const lcmInputB = document.getElementById('lcmInputB');
  const lcmCalculateBtn = document.getElementById('lcmCalculateBtn');

  function renderLCMStudio() {
    const a = parseInt(lcmInputA.value, 10) || 60;
    const b = parseInt(lcmInputB.value, 10) || 72;

    const analysis = MathEngine.getLCMAnalysis(a, b, state.colorMode);

    // Render A
    document.getElementById('lcmValA').textContent = a;
    document.getElementById('lcmFormulaA').textContent = MathEngine.formatFactorization(a);
    const ringA = document.getElementById('lcmRingA');
    ringA.innerHTML = '';
    ringA.appendChild(createRingSVG(a, { size: 110, outerRadius: 48, innerRadius: 32, badgeRadius: 28 }));

    // Render B
    document.getElementById('lcmValB').textContent = b;
    document.getElementById('lcmFormulaB').textContent = MathEngine.formatFactorization(b);
    const ringB = document.getElementById('lcmRingB');
    ringB.innerHTML = '';
    ringB.appendChild(createRingSVG(b, { size: 110, outerRadius: 48, innerRadius: 32, badgeRadius: 28 }));

    // Render Result LCM
    document.getElementById('lcmValRes').textContent = analysis.lcm.toLocaleString();
    document.getElementById('lcmFormulaRes').textContent = `${analysis.formula} = ${analysis.lcm.toLocaleString()}`;
    const ringRes = document.getElementById('lcmRingRes');
    ringRes.innerHTML = '';
    ringRes.appendChild(createRingSVG(analysis.lcm, { size: 110, outerRadius: 48, innerRadius: 32, badgeRadius: 28 }));

    // Populate Analysis Table
    const tbody = document.getElementById('lcmTableBody');
    tbody.innerHTML = '';

    analysis.breakdown.forEach(row => {
      const tr = document.createElement('tr');

      // Mini tokens for A
      let tokensA = '';
      for (let i = 0; i < row.countA; i++) {
        tokensA += `<span class="mini-arc-token" style="background-color: ${row.color};">${row.prime}</span>`;
      }
      if (row.countA === 0) tokensA = '<span style="color: var(--text-light); font-size: 0.85rem;">None (0)</span>';

      // Mini tokens for B
      let tokensB = '';
      for (let i = 0; i < row.countB; i++) {
        tokensB += `<span class="mini-arc-token" style="background-color: ${row.color};">${row.prime}</span>`;
      }
      if (row.countB === 0) tokensB = '<span style="color: var(--text-light); font-size: 0.85rem;">None (0)</span>';

      // Result tokens
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
            ? `<div class="arc-dots-container">${tokensMax} <span style="font-weight: 700; margin-left: 6px;">${row.prime}<sup>${row.maxCount}</sup></span></div>`
            : '<span style="color: var(--text-light);">Excluded (0)</span>'}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  lcmCalculateBtn.addEventListener('click', renderLCMStudio);

  // LCM Preset Pills
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
     Euclid's Division Algorithm Lab Controller
     ========================================================================== */
  const euclidInputA = document.getElementById('euclidInputA');
  const euclidInputB = document.getElementById('euclidInputB');
  const euclidStartBtn = document.getElementById('euclidStartBtn');
  const btnEuclidPrev = document.getElementById('btnEuclidPrev');
  const btnEuclidNext = document.getElementById('btnEuclidNext');
  const btnEuclidPlay = document.getElementById('btnEuclidPlay');
  const btnEuclidReset = document.getElementById('btnEuclidReset');
  const euclidBarStage = document.getElementById('euclidBarStage');
  const euclidStepsList = document.getElementById('euclidStepsList');

  function initEuclidLab() {
    state.euclidA = parseInt(euclidInputA.value, 10) || 2024;
    state.euclidB = parseInt(euclidInputB.value, 10) || 748;
    state.euclidStepsData = MathEngine.getEuclideanSteps(state.euclidA, state.euclidB);
    state.euclidCurrentStep = 0;
    stopEuclidAutoPlay();
    renderEuclidStep();
  }

  function renderEuclidStep() {
    const data = state.euclidStepsData;
    if (!data || !data.steps.length) return;

    const currentIdx = state.euclidCurrentStep;
    const step = data.steps[currentIdx];
    const total = data.steps.length;

    document.getElementById('euclidCurrentStepNum').textContent = currentIdx + 1;
    document.getElementById('euclidTotalStepsNum').textContent = total;

    // Update buttons
    btnEuclidPrev.disabled = currentIdx === 0;
    btnEuclidNext.disabled = currentIdx === total - 1;

    // Render Geometric Bar Segment Tiling
    euclidBarStage.innerHTML = '';

    // Bar 1: Larger number (dividend a)
    const rowDividend = document.createElement('div');
    rowDividend.className = 'bar-row';
    rowDividend.innerHTML = `
      <div class="bar-label">a = ${step.a}</div>
      <div class="bar-track">
        <div class="bar-segment seg-dividend" style="width: 100%;">
          Length ${step.a}
        </div>
      </div>
    `;
    euclidBarStage.appendChild(rowDividend);

    // Bar 2: Divisor b tiling q times + remainder r
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

    // Render Steps List
    euclidStepsList.innerHTML = '';
    data.steps.forEach((s, idx) => {
      const card = document.createElement('div');
      card.className = 'step-item-card';
      if (idx === currentIdx) card.classList.add('current-active');
      if (idx === total - 1) card.classList.add('final-step');

      card.innerHTML = `
        <div style="display: flex; align-items: center; gap: 14px;">
          <span class="step-index-badge">Step ${s.stepNumber}</span>
          <div class="step-equation-text">${s.equation}</div>
        </div>
        <div class="step-desc-text">
          ${idx === total - 1 ? `🎉 Remainder is 0! <strong>GCD = ${data.gcd}</strong>` : `Remainder r = ${s.r}`}
        </div>
      `;
      euclidStepsList.appendChild(card);
    });
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
      renderEuclidStep();
    }
  });

  btnEuclidPrev.addEventListener('click', () => {
    if (state.euclidCurrentStep > 0) {
      state.euclidCurrentStep--;
      renderEuclidStep();
    }
  });

  btnEuclidReset.addEventListener('click', () => {
    stopEuclidAutoPlay();
    state.euclidCurrentStep = 0;
    renderEuclidStep();
  });

  btnEuclidPlay.addEventListener('click', () => {
    if (state.euclidAutoPlayTimer) {
      stopEuclidAutoPlay();
    } else {
      btnEuclidPlay.textContent = '⏸ Pause';
      if (state.euclidCurrentStep === state.euclidStepsData.steps.length - 1) {
        state.euclidCurrentStep = 0;
        renderEuclidStep();
      }
      state.euclidAutoPlayTimer = setInterval(() => {
        if (state.euclidCurrentStep < state.euclidStepsData.steps.length - 1) {
          state.euclidCurrentStep++;
          renderEuclidStep();
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
    const base = 3;
    const size = 260;
    const center = size / 2;
    const radius = 95;

    // Render Modulo 7 Clock SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
    svg.setAttribute('class', 'clock-svg');

    // Clock background circle
    const clockBg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    clockBg.setAttribute('cx', center);
    clockBg.setAttribute('cy', center);
    clockBg.setAttribute('r', radius);
    clockBg.setAttribute('fill', '#ffffff');
    clockBg.setAttribute('stroke', '#cbd5e1');
    clockBg.setAttribute('stroke-width', '2');
    svg.appendChild(clockBg);

    // Positions for 7 vertices (0 through 6)
    const points = [];
    for (let i = 0; i < mod; i++) {
      const angle = (i * (360 / mod) - 90) * (Math.PI / 180);
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      points.push({ i, x, y });
    }

    // Sequence of powers: 1 -> 3 -> 2 -> 6 -> 4 -> 5 -> 1
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
    orbitPath.setAttribute('stroke-width', '2.5');
    orbitPath.setAttribute('stroke-dasharray', '5 3');
    svg.appendChild(orbitPath);

    // Draw vertex badges
    points.forEach(pt => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', pt.x);
      circle.setAttribute('cy', pt.y);
      circle.setAttribute('r', '14');
      circle.setAttribute('fill', pt.i === 4 ? '#f59e0b' : '#f8fafc');
      circle.setAttribute('stroke', pt.i === 4 ? '#b45309' : '#94a3b8');
      circle.setAttribute('stroke-width', '1.5');
      svg.appendChild(circle);

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', pt.x);
      label.setAttribute('y', pt.y + 1);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('dominant-baseline', 'central');
      label.setAttribute('fill', pt.i === 4 ? '#ffffff' : '#0f172a');
      label.setAttribute('font-family', 'Inter, sans-serif');
      label.setAttribute('font-weight', '800');
      label.setAttribute('font-size', '12');
      label.textContent = pt.i;
      svg.appendChild(label);
    });

    clockContainer.innerHTML = '';
    clockContainer.appendChild(svg);

    // Populate Cycle Table
    cycleTable.innerHTML = `
      <div class="cycle-row-card"><span>3¹ mod 7 = 3</span><span style="color: var(--text-muted);">Step 1</span></div>
      <div class="cycle-row-card"><span>3² mod 7 = 2</span><span style="color: var(--text-muted);">Step 2</span></div>
      <div class="cycle-row-card"><span>3³ mod 7 = 6</span><span style="color: var(--text-muted);">Step 3</span></div>
      <div class="cycle-row-card highlight"><span>★ 3⁴ mod 7 = 4</span><span style="color: #b45309; font-weight: 700;">Target: 2026 ≡ 4 mod 6</span></div>
      <div class="cycle-row-card"><span>3⁵ mod 7 = 5</span><span style="color: var(--text-muted);">Step 5</span></div>
      <div class="cycle-row-card"><span>3⁶ mod 7 = 1</span><span style="color: #16a34a; font-weight: 700;">Period Loop (Cycle length = 6)</span></div>
    `;
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
      <div style="background: #f0fdf4; border: 1px solid #a7f3d0; padding: 14px; border-radius: 10px; color: #065f46;">
        Result: ${base}<sup>${exp}</sup> ≡ ${res.baseMod}<sup>${exp}</sup> ≡ <strong>${res.result}</strong> (mod ${mod})<br>
        <span style="font-size: 0.85rem; font-weight: normal; color: #047857;">
          Period: ${res.cyclePeriod} | Exponent decomposition: ${exp} = ${res.cyclePeriod} × ${res.quotient} + ${res.remainder}
        </span>
      </div>
    `;
  });

  // Initial Run
  renderGrid100();
  renderGCDStudio();
  renderLCMStudio();
  initEuclidLab();
  renderWorksheetChallenge();
});
