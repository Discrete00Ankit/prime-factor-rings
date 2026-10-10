/**
 * Math Engine for Prime Factorization Arc Visualizer
 * Provides factorization, GCD, LCM, Euclidean Division, and Modular Arithmetic.
 */

const MathEngine = (() => {
  // Worksheet Color Palette
  const PAPER_PALETTE = {
    1: '#94a3b8',   // Grey
    2: '#16a34a',   // Emerald Green
    3: '#9333ea',   // Royal Purple
    5: '#ea580c',   // Warm Orange
    7: '#0284c7',   // Cerulean Blue
    'ge11': '#dc2626' // Ruby Red for all primes >= 11
  };

  const PRIME_NAMES = {
    2: 'Green (2)',
    3: 'Purple (3)',
    5: 'Orange (5)',
    7: 'Blue (7)',
    'ge11': 'Red (≥ 11)'
  };

  // Distinct palette for "Spectrum" mode
  const SPECTRUM_PRIMES = {
    11: '#e11d48', // Rose Red
    13: '#6366f1', // Indigo
    17: '#d97706', // Amber Gold
    19: '#db2777', // Magenta Pink
    23: '#0d9488', // Deep Teal
    29: '#7c3aed', // Deep Violet
    31: '#f43f5e', // Coral Rose
    37: '#65a30d', // Lime
    41: '#0891b2', // Cyan
    43: '#c026d3', // Fuchsia
    47: '#0284c7', // Sky Blue
    53: '#b45309', // Cinnamon
    59: '#4f46e5', // Slate Indigo
    61: '#be185d', // Berry Pink
    67: '#059669', // Mint Forest
    71: '#7e22ce', // Dark Orchid
    73: '#c2410c', // Rust Orange
    79: '#0369a1', // Ocean Blue
    83: '#9f1239', // Bordeaux
    89: '#4338ca', // Royal Navy
    97: '#a21caf'  // Plum
  };

  // Cache factorizations 1..1000
  const cache = new Map();

  /**
   * Return sorted prime factors with multiplicities for n.
   * e.g., 60 => [2, 2, 3, 5]
   */
  function factorize(n) {
    if (n < 1) return [];
    if (n === 1) return [];
    if (cache.has(n)) return cache.get(n);

    const factors = [];
    let rem = n;
    let d = 2;

    while (d * d <= rem) {
      while (rem % d === 0) {
        factors.push(d);
        rem /= d;
      }
      d = d === 2 ? 3 : d + 2;
    }
    if (rem > 1) {
      factors.push(rem);
    }

    cache.set(n, factors);
    return factors;
  }

  /**
   * Return a Map of prime => count
   * e.g., 60 => {2: 2, 3: 1, 5: 1}
   */
  function factorCounts(n) {
    const counts = new Map();
    const factors = factorize(n);
    for (const p of factors) {
      counts.set(p, (counts.get(p) || 0) + 1);
    }
    return counts;
  }

  /**
   * Check if n is prime
   */
  function isPrime(n) {
    if (n <= 1) return false;
    if (n <= 3) return true;
    if (n % 2 === 0 || n % 3 === 0) return false;
    for (let i = 5; i * i <= n; i += 6) {
      if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
  }

  /**
   * Get color for a prime factor in given color mode ('paper' | 'spectrum')
   */
  function getPrimeColor(p, mode = 'paper') {
    if (p === 1) return PAPER_PALETTE[1];
    if (mode === 'paper') {
      if (PAPER_PALETTE[p]) return PAPER_PALETTE[p];
      return PAPER_PALETTE['ge11'];
    } else {
      // Spectrum mode
      if (PAPER_PALETTE[p] && p < 11) return PAPER_PALETTE[p];
      if (SPECTRUM_PRIMES[p]) return SPECTRUM_PRIMES[p];
      // Deterministic golden-ratio HSL hash for large primes
      const hue = (p * 137.508) % 360;
      return `hsl(${Math.round(hue)}, 75%, 45%)`;
    }
  }

  /**
   * Get human readable name/label for prime color
   */
  function getPrimeLabel(p, mode = 'paper') {
    if (p === 1) return 'Grey (Unit 1)';
    if (mode === 'paper') {
      if (p === 2) return 'Green (2)';
      if (p === 3) return 'Purple (3)';
      if (p === 5) return 'Orange (5)';
      if (p === 7) return 'Blue (7)';
      return `Red (Prime ${p} ≥ 11)`;
    }
    return `Prime ${p}`;
  }

  /**
   * Format factorization as readable string: "2² × 3 × 5"
   */
  function formatFactorization(n) {
    if (n === 1) return '1 (Unit)';
    const counts = factorCounts(n);
    const superscripts = {
      0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴',
      5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹'
    };
    function toSuper(num) {
      if (num === 1) return '';
      return String(num).split('').map(c => superscripts[c] || c).join('');
    }

    const parts = [];
    for (const [prime, power] of counts.entries()) {
      parts.push(`${prime}${toSuper(power)}`);
    }
    return parts.join(' × ');
  }

  /**
   * Expanded factorization: "2 × 2 × 3 × 5"
   */
  function formatExpandedFactors(n) {
    if (n === 1) return '1';
    const factors = factorize(n);
    return factors.join(' × ');
  }

  /**
   * Standard Euclidean Algorithm for GCD
   */
  function computeGCD(a, b) {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y !== 0) {
      const temp = y;
      y = x % y;
      x = temp;
    }
    return x;
  }

  /**
   * LCM computation
   */
  function computeLCM(a, b) {
    if (a === 0 || b === 0) return 0;
    const g = computeGCD(a, b);
    return Math.abs(Math.floor((a * b) / g));
  }

  /**
   * Detailed GCD breakdown showing prime arc comparison
   */
  function getGCDAnalysis(a, b, mode = 'paper') {
    const factorsA = factorCounts(a);
    const factorsB = factorCounts(b);
    const allPrimes = Array.from(new Set([...factorsA.keys(), ...factorsB.keys()])).sort((x, y) => x - y);

    const breakdown = [];
    let gcdValue = 1;
    const gcdFactors = [];

    for (const p of allPrimes) {
      const countA = factorsA.get(p) || 0;
      const countB = factorsB.get(p) || 0;
      const minCount = Math.min(countA, countB);
      const color = getPrimeColor(p, mode);
      const label = getPrimeLabel(p, mode);

      if (minCount > 0) {
        gcdValue *= Math.pow(p, minCount);
        for (let i = 0; i < minCount; i++) {
          gcdFactors.push(p);
        }
      }

      breakdown.push({
        prime: p,
        countA,
        countB,
        minCount,
        color,
        label,
        included: minCount > 0,
        factorValue: Math.pow(p, minCount)
      });
    }

    return {
      a,
      b,
      gcd: gcdValue,
      gcdFactors,
      breakdown,
      formula: gcdFactors.length > 0 ? gcdFactors.join(' × ') : '1',
      totalMinArcs: gcdFactors.length
    };
  }

  /**
   * Detailed LCM breakdown showing prime arc comparison
   */
  function getLCMAnalysis(a, b, mode = 'paper') {
    const factorsA = factorCounts(a);
    const factorsB = factorCounts(b);
    const allPrimes = Array.from(new Set([...factorsA.keys(), ...factorsB.keys()])).sort((x, y) => x - y);

    const breakdown = [];
    let lcmValue = 1;
    const lcmFactors = [];

    for (const p of allPrimes) {
      const countA = factorsA.get(p) || 0;
      const countB = factorsB.get(p) || 0;
      const maxCount = Math.max(countA, countB);
      const color = getPrimeColor(p, mode);
      const label = getPrimeLabel(p, mode);

      if (maxCount > 0) {
        lcmValue *= Math.pow(p, maxCount);
        for (let i = 0; i < maxCount; i++) {
          lcmFactors.push(p);
        }
      }

      breakdown.push({
        prime: p,
        countA,
        countB,
        maxCount,
        color,
        label,
        included: maxCount > 0,
        factorValue: Math.pow(p, maxCount)
      });
    }

    return {
      a,
      b,
      lcm: lcmValue,
      lcmFactors,
      breakdown,
      formula: lcmFactors.length > 0 ? lcmFactors.join(' × ') : '1',
      totalMaxArcs: lcmFactors.length
    };
  }

  /**
   * Step-by-step Euclidean Division Algorithm
   * a = b * q + r
   */
  function getEuclideanSteps(a, b) {
    let x = Math.max(Math.abs(a), Math.abs(b));
    let y = Math.min(Math.abs(a), Math.abs(b));
    const originalA = x;
    const originalB = y;

    if (y === 0) {
      return {
        a: originalA,
        b: originalB,
        gcd: x,
        steps: [{
          stepNumber: 1,
          a: x,
          b: 0,
          q: 0,
          r: 0,
          equation: `${x} = 0 + ${x}`,
          explanation: `Since the second number is 0, the GCD is simply ${x}.`
        }]
      };
    }

    const steps = [];
    let stepNum = 1;

    while (y !== 0) {
      const q = Math.floor(x / y);
      const r = x % y;

      steps.push({
        stepNumber: stepNum,
        a: x,
        b: y,
        q: q,
        r: r,
        equation: `${x} = ${y} × ${q} + ${r}`,
        explanation: `${x} divided by ${y} is ${q} with remainder ${r}. Next evaluate gcd(${y}, ${r}).`
      });

      x = y;
      y = r;
      stepNum++;
    }

    const gcd = x;

    return {
      a: originalA,
      b: originalB,
      gcd,
      steps,
      totalSteps: steps.length
    };
  }

  /**
   * Modular Arithmetic Solver (Solving Worksheet Question iv)
   * Calculates L^exp mod m step-by-step with cyclic pattern.
   * E.g. L = 360, exp = 2026, mod = 7
   */
  function solveModPower(base, exp, mod) {
    const baseMod = ((base % mod) + mod) % mod;
    const cycle = [];
    const seen = new Map();
    let curr = 1;
    let power = 0;

    // Track powers base^0, base^1, ... until cycle repeats
    while (power <= mod + 2) {
      if (power > 0 && seen.has(curr)) {
        break;
      }
      seen.set(curr, power);
      cycle.push({ power, value: curr });
      curr = (curr * baseMod) % mod;
      power++;
    }

    // Determine cycle length
    const cycleStart = seen.get(curr) || 0;
    const cycleLength = power - cycleStart;

    // Power sequence for 1..cycleLength
    const cycleSteps = [];
    let val = 1;
    for (let k = 1; k <= (cycleLength || mod); k++) {
      val = (val * baseMod) % mod;
      cycleSteps.push({
        k,
        value: val,
        equation: `${baseMod}<sup>${k}</sup> ≡ ${val} (mod ${mod})`
      });
      if (val === 1) break;
    }

    // Final modular exponentiation
    let result = 1;
    let b = baseMod;
    let e = exp;
    while (e > 0) {
      if (e % 2 === 1) result = (result * b) % mod;
      b = (b * b) % mod;
      e = Math.floor(e / 2);
    }

    const effectiveExp = cycleSteps.length > 0 ? (exp % cycleSteps.length) : exp;
    const effectiveEquiv = effectiveExp === 0 ? cycleSteps.length : effectiveExp;

    return {
      base,
      exp,
      mod,
      baseMod,
      cycleSteps,
      cyclePeriod: cycleSteps.length,
      quotient: Math.floor(exp / cycleSteps.length),
      remainder: exp % cycleSteps.length,
      result,
      equation: `${base}<sup>${exp}</sup> ≡ ${baseMod}<sup>${exp}</sup> ≡ ${result} (mod ${mod})`
    };
  }

  return {
    PAPER_PALETTE,
    PRIME_NAMES,
    SPECTRUM_PRIMES,
    factorize,
    factorCounts,
    isPrime,
    getPrimeColor,
    getPrimeLabel,
    formatFactorization,
    formatExpandedFactors,
    computeGCD,
    computeLCM,
    getGCDAnalysis,
    getLCMAnalysis,
    getEuclideanSteps,
    solveModPower
  };
})();

// Export for Node/CommonJS test runners if applicable
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MathEngine;
}
