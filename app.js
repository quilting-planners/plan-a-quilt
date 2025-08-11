// Simple state, saved to localStorage
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const state = {
  quiltName: '', recipient: '', notes: '',
  cols: 6, rows: 8, blockIn: 10, sashingIn: 0, borderIn: 0, seamIn: 0.25,
  colorA: '#eab308', colorB: '#22c55e', colorC: '#3b82f6', pattern: 'checker'
};

const keys = Object.keys(state);
const storeKey = 'quiltPlanner:v1';

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(storeKey));
    if (saved) Object.assign(state, saved);
  } catch {}
}

function save() {
  localStorage.setItem(storeKey, JSON.stringify(state));
}

function bindInputs() {
  keys.forEach(k => {
    const el = document.getElementById(k);
    if (!el) return;
    if (el.type === 'color' || el.tagName === 'SELECT' || el.type === 'text' || el.tagName === 'TEXTAREA') {
      el.value = state[k];
      el.addEventListener('input', () => { state[k] = el.value; onChange(); });
    } else if (el.type === 'number') {
      el.value = state[k];
      el.addEventListener('input', () => { state[k] = +el.value; onChange(); });
    }
  });
}

function stepTo(n) {
  $$('.step').forEach(b => b.classList.toggle('current', b.dataset.step == n));
  $$('.step-panel').forEach(p => p.classList.toggle('current', p.dataset.stepPanel == n));
}

function initSteps() {
  $$('.step').forEach(b => b.addEventListener('click', () => stepTo(b.dataset.step)));
  $$('.next').forEach(b => b.addEventListener('click', () => stepTo(b.dataset.next)));
  $$('.prev').forEach(b => b.addEventListener('click', () => stepTo(b.dataset.prev)));
}

function inchesToYards(inches) {
  return inches / 36;
}

function fmtYards(y) {
  // Round up to nearest 1/8 yd
  const eighth = Math.ceil(y * 8) / 8;
  return `${eighth.toFixed(3).replace(/\.\d*?0+$/,'').replace(/\.$/,'')} yd`;
}

function computeTopSize() {
  const { cols, rows, blockIn, sashingIn, borderIn } = state;
  const blocksW = cols * blockIn;
  const blocksH = rows * blockIn;
  const sashW = sashingIn > 0 ? ((cols - 1) * sashingIn) : 0;
  const sashH = sashingIn > 0 ? ((rows - 1) * sashingIn) : 0;
  const borderW = borderIn > 0 ? (2 * borderIn) : 0;
  const borderH = borderIn > 0 ? (2 * borderIn) : 0;
  const topW = blocksW + sashW + borderW;
  const topH = blocksH + sashH + borderH;
  return { topW, topH };
}

function estimateFabric() {
  // Very simple planning estimates for top/background/binding/backing
  const { cols, rows, blockIn, sashingIn, borderIn, seamIn } = state;
  const { topW, topH } = computeTopSize();

  // Top area (approx). Assume 10% extra for seams/waste.
  const topArea = topW * topH * 1.10;

  // Backing: add 6 inches extra on width and height (3in all around).
  const backingW = topW + 6;
  const backingH = topH + 6;

  // Convert areas to yards (assuming fabric 42in usable width). This is rough.
  const yardsPerStrip = 42; // usable W
  const backingYards = inchesToYards((backingW * backingH) / yardsPerStrip);

  // Binding: perimeter * 2.5" strips
  const perimeter = 2 * (topW + topH);
  const stripWidth = 2.5;
  const stripsNeeded = Math.ceil(perimeter / 42);
  const bindingInches = stripsNeeded * stripWidth;
  const bindingYards = inchesToYards(bindingInches);

  // Borders & sashing yardage (very rough; counts total strip inches / 42).
  const sashingStrips = sashingIn > 0 ? ((rows * (cols - 1)) + (cols * (rows - 1))) : 0; // seam-count proxy
  const sashingInches = sashingStrips * sashingIn;
  const bordersInches = borderIn > 0 ? (2 * (topW + topH) - 4 * borderIn) * (borderIn / 42) : 0; // proxy
  const sashingYards = inchesToYards(sashingInches / 42 * 36);
  const bordersYards = inchesToYards(bordersInches);

  // Return rounded-up safe estimates
  return {
    top: fmtYards(inchesToYards(topArea / 42)),
    backing: fmtYards(backingYards),
    binding: fmtYards(bindingYards),
    sashing: sashingIn > 0 ? fmtYards(sashingYards) : '—',
    borders: borderIn > 0 ? fmtYards(bordersYards) : '—',
    finished: { width: topW.toFixed(1), height: topH.toFixed(1) }
  };
}

function renderFabricTable() {
  const est = estimateFabric();
  const t = document.createElement('table');
  t.innerHTML = `
    <thead><tr><th>Item</th><th>Estimate</th></tr></thead>
    <tbody>
      <tr><td>Quilt top (mixed)</td><td>${est.top}</td></tr>
      <tr><td>Backing</td><td>${est.backing}</td></tr>
      <tr><td>Binding</td><td>${est.binding}</td></tr>
      <tr><td>Sashing</td><td>${est.sashing}</td></tr>
      <tr><td>Borders</td><td>${est.borders}</td></tr>
    </tbody>`;
  $('#fabricTable').innerHTML = '';
  $('#fabricTable').appendChild(t);
}

function renderPlan() {
  const { topW, topH } = computeTopSize();
  const est = estimateFabric();
  const lines = [
    `Quilt: ${state.quiltName || 'Untitled'}`,
    `For: ${state.recipient || '—'}`,
    `Notes: ${state.notes || '—'}`,
    '',
    `Layout: ${state.cols} columns × ${state.rows} rows`,
    `Block size: ${state.blockIn}"`,
    `Sashing: ${state.sashingIn}"`,
    `Border: ${state.borderIn}"`,
    '',
    `Finished top: ${est.finished.width}" W × ${est.finished.height}" H`,
    '',
    `Fabric estimates:`,
    `  • Top (mixed): ${est.top}`,
    `  • Backing: ${est.backing}`,
    `  • Binding: ${est.binding}`,
    `  • Sashing: ${est.sashing}`,
    `  • Borders: ${est.borders}`,
    '',
    `Colors: A ${state.colorA}  B ${state.colorB}  C ${state.colorC}`,
  ];
  $('#planOut').textContent = lines.join('\n');
}

function drawPreview() {
  const c = $('#previewCanvas');
  const ctx = c.getContext('2d');
  const { cols, rows, blockIn, sashingIn, borderIn, colorA, colorB, colorC, pattern } = state;

  ctx.clearRect(0,0,c.width,c.height);

  // compute virtual sizes & scale to canvas
  const { topW, topH } = computeTopSize();
  const pad = 20;
  const scale = Math.min((c.width - 2*pad)/topW, (c.height - 2*pad)/topH);
  const ox = (c.width - topW*scale)/2;
  const oy = (c.height - topH*scale)/2;

  // Border background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0,c.width,c.height);

  // Draw border area
  if (borderIn > 0) {
    ctx.fillStyle = '#22222211';
    ctx.fillRect(ox, oy, topW*scale, topH*scale);
  }

  // Draw blocks + sashing
  let y = oy + (borderIn>0 ? borderIn*scale : 0);
  for (let r=0;r<rows;r++) {
    let x = ox + (borderIn>0 ? borderIn*scale : 0);
    for (let cidx=0;cidx<cols;cidx++) {
      // color pick
      let color = colorA;
      if (pattern === 'checker') color = ( (r+cidx)%2===0 ? colorA : colorB );
      if (pattern === 'stripes') color = ( r%2===0 ? colorA : colorB );
      if (pattern === 'random') {
        const p = (r*cols + cidx) % 3;
        color = [colorA,colorB,colorC][p];
      }

      ctx.fillStyle = color;
      ctx.fillRect(x, y, blockIn*scale, blockIn*scale);

      x += blockIn*scale;
      if (cidx < cols-1 && sashingIn > 0) {
        ctx.fillStyle = '#11182722';
        ctx.fillRect(x, y, sashingIn*scale, blockIn*scale);
        x += sashingIn*scale;
      }
    }
    y += blockIn*scale;
    if (r < rows-1 && sashingIn > 0) {
      // horizontal sashing
      let sx = ox + (borderIn>0 ? borderIn*scale : 0);
      let sashW = cols*blockIn*scale + (cols-1)*sashingIn*scale;
      ctx.fillStyle = '#11182722';
      ctx.fillRect(sx, y, sashW, sashingIn*scale);
      y += sashingIn*scale;
    }
  }

  // Dimensions text
  const { finished } = estimateFabric();
  $('#dimOut').textContent = `Finished top: ${finished.width}" × ${finished.height}"`;
}

function onChange() {
  save();
  renderFabricTable();
  renderPlan();
  drawPreview();
}

function initButtons() {
  $('#resetBtn').addEventListener('click', () => {
    localStorage.removeItem(storeKey);
    Object.assign(state, {
      quiltName: '', recipient: '', notes: '',
      cols: 6, rows: 8, blockIn: 10, sashingIn: 0, borderIn: 0, seamIn: 0.25,
      colorA: '#eab308', colorB: '#22c55e', colorC: '#3b82f6', pattern: 'checker'
    });
    bindInputs();
    onChange();
    stepTo(1);
  });

  $('#copyBtn').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('#planOut').textContent);
      $('#copyBtn').textContent = 'Copied';
      setTimeout(()=>$('#copyBtn').textContent='Copy plan', 1200);
    } catch(e) {
      alert('Copy failed. You can select the text and copy manually.');
    }
  });

  $('#downloadBtn').addEventListener('click', () => {
    const data = new Blob([ JSON.stringify(state, null, 2) ], { type: 'application/json' });
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = (state.quiltName || 'quilt-plan') + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
}

function main() {
  load();
  bindInputs();
  initSteps();
  initButtons();
  onChange();
}

document.addEventListener('DOMContentLoaded', main);
