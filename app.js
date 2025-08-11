// State and helpers
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const storeKey='quiltPlanner:pro:v1';

const bedDims = {
  crib:{width:28,height:52},
  twin:{width:38,height:75},
  full:{width:54,height:75},
  queen:{width:60,height:80},
  king:{width:76,height:80},
};
const throwDims = {
  small:{width:50,height:40},
  standard:{width:60,height:50},
  large:{width:70,height:60},
  oversized:{width:80,height:70}
};

const defaultState = {
  purpose:null, bedSize:null, throwSize:null,
  customThrowWidth:60, customThrowHeight:50,
  sidesOverhang:10, footOverhang:10, headOverhang:0,
  blocksWide:6, blocksHigh:8,
  blockWidth:10, blockHeight:10,
  sashing:0, border:0,
  seamChoice:"0.25", seamCustom:0.25,
  wof_block:42, wof_sashing:42, wof_border:42, wof_binding:42, wof_backing:42,
  price_blocks:12, price_sashing:12, price_border:12, price_binding:12, price_backing:12,
  binding_strip:2.5, batting_width:96, batting_price:35
};

const state = JSON.parse(localStorage.getItem(storeKey) || "null") || structuredClone(defaultState);

function save(){ localStorage.setItem(storeKey, JSON.stringify(state)); }
function stepTo(n){
  $$('.step').forEach(b=>b.classList.toggle('current', b.dataset.step==n));
  $$('.step-panel').forEach(p=>p.classList.toggle('current', p.dataset.stepPanel==n));
}

function bind(){
  // Purpose radios
  $$('#purpose_bed, #purpose_throw').forEach(r=>{
    r.addEventListener('change', () => {
      state.purpose = r.value;
      $('#bedGroup').classList.toggle('hidden', state.purpose!=='bed_cover');
      $('#throwGroup').classList.toggle('hidden', state.purpose!=='throw_blanket');
      onChange();
    });
  });

  // Bed sizes
  $$('input[name="bedSize"]').forEach(r=>{
    r.addEventListener('change', ()=>{ state.bedSize=r.value; onChange(); });
  });

  // Throw sizes
  $$('input[name="throwSize"]').forEach(r=>{
    r.addEventListener('change', ()=>{
      state.throwSize=r.value;
      $('#customThrow').classList.toggle('hidden', state.throwSize!=='custom');
      onChange();
    });
  });

  // Numeric inputs & selects
  ['customThrowWidth','customThrowHeight','sidesOverhang','footOverhang','headOverhang',
   'blocksWide','blocksHigh','blockWidth','blockHeight','sashing','border',
   'wof_block','wof_sashing','wof_border','wof_binding','wof_backing',
   'price_blocks','price_sashing','price_border','price_binding','price_backing',
   'binding_strip','batting_width','batting_price'].forEach(id=>{
    const el = $('#'+id); if(!el) return;
    el.value = state[id];
    el.addEventListener('input', ()=>{ state[id]=+el.value; onChange(); });
  });

  // Seam selection
  const seamSel = $('#seam'), seamCustomWrap = $('#seamCustomWrap'), seamCustom = $('#seamCustom');
  seamSel.value = state.seamChoice;
  seamCustom.value = state.seamCustom;
  seamCustomWrap.classList.toggle('hidden', state.seamChoice!=='custom');
  seamSel.addEventListener('change', ()=>{
    state.seamChoice = seamSel.value;
    seamCustomWrap.classList.toggle('hidden', state.seamChoice!=='custom');
    onChange();
  });
  seamCustom.addEventListener('input', ()=>{ state.seamCustom = +seamCustom.value; onChange(); });

  // Steps
  $$('.next').forEach(b=>b.addEventListener('click', ()=> stepTo(b.dataset.next)));
  $$('.prev').forEach(b=>b.addEventListener('click', ()=> stepTo(b.dataset.prev)));
  $$('.step').forEach(b=>b.addEventListener('click', ()=> stepTo(b.dataset.step)));

  // Buttons
  $('#resetBtn').addEventListener('click', ()=>{
    Object.assign(state, structuredClone(defaultState));
    initValues();
    onChange();
    stepTo(1);
  });
  $('#copyBtn').addEventListener('click', (e)=>{
    e.preventDefault();
    navigator.clipboard.writeText($('#planOut').textContent).then(()=>{
      $('#copyBtn').textContent='Copied'; setTimeout(()=>$('#copyBtn').textContent='Copy plan',1200);
    });
  });
  $('#downloadBtn').addEventListener('click', (e)=>{
    e.preventDefault();
    const data = new Blob([ JSON.stringify(state, null, 2) ], { type: 'application/json' });
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url; a.download = 'quilt-plan.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  });
}

function initValues(){
  // purpose group visibility
  $('#purpose_bed').checked = state.purpose==='bed_cover';
  $('#purpose_throw').checked = state.purpose==='throw_blanket';
  $('#bedGroup').classList.toggle('hidden', state.purpose!=='bed_cover');
  $('#throwGroup').classList.toggle('hidden', state.purpose!=='throw_blanket');

  if(state.bedSize) {
    const el = document.querySelector(`input[name="bedSize"][value="${state.bedSize}"]`);
    if(el) el.checked = true;
  }
  if(state.throwSize){
    const el = document.querySelector(`input[name="throwSize"][value="${state.throwSize}"]`);
    if(el) el.checked = true;
    $('#customThrow').classList.toggle('hidden', state.throwSize!=='custom');
  }
}

function seamAllowance(){
  return state.seamChoice==='custom' ? (state.seamCustom||0.25) : +state.seamChoice;
}

function baseDimensions(){
  if(state.purpose==='bed_cover' && state.bedSize){
    const m = bedDims[state.bedSize];
    return {
      width: m.width + 2*(state.sidesOverhang||0),
      height: m.height + (state.footOverhang||0) + (state.headOverhang||0)
    };
  }
  if(state.purpose==='throw_blanket'){
    if(state.throwSize==='custom') return { width: state.customThrowWidth||60, height: state.customThrowHeight||50 };
    if(state.throwSize) return throwDims[state.throwSize];
  }
  return { width:0, height:0 };
}

function logicalLayout(){
  // Given base dimensions and block size + sashing, determine blocksWide/High if not set.
  const { width, height } = baseDimensions();
  const bw = state.blockWidth || 6, bh = state.blockHeight || 6;
  const s = state.sashing || 0;
  // Use the provided blocksWide/High; this is a preview calc only
  return { width, height, blocksWide: state.blocksWide, blocksHigh: state.blocksHigh, blockW: bw, blockH: bh, sashing: s, border: state.border||0 };
}

function topSize(){
  const { blocksWide, blocksHigh, blockW, blockH, sashing, border } = logicalLayout();
  const blocksW = blocksWide * blockW;
  const blocksH = blocksHigh * blockH;
  const sashW = sashing>0 ? (blocksWide-1)*sashing : 0;
  const sashH = sashing>0 ? (blocksHigh-1)*sashing : 0;
  const borderW = border>0 ? 2*border : 0;
  const borderH = border>0 ? 2*border : 0;
  return { topW: blocksW + sashW + borderW, topH: blocksH + sashH + borderH };
}

// --- Yardage calcs ---
function ceilToEighthYards(y){ return Math.ceil(y*8)/8; }
function yards(nInches){ return nInches/36; }

function calcBlocks(){
  const sa = seamAllowance();
  const { blocksWide, blocksHigh, blockW, blockH } = logicalLayout();
  const totalBlocks = blocksWide * blocksHigh;
  const cutW = blockW + 2*sa, cutH = blockH + 2*sa;
  const wof = state.wof_block;

  // how many per strip if we cut along WOF
  const perStripNormal = Math.floor(wof / cutW);
  const perStripRot = Math.floor(wof / cutH);
  let strips, stripCutSize;
  if (perStripNormal >= perStripRot){
    strips = Math.ceil(totalBlocks / perStripNormal);
    stripCutSize = `${cutW.toFixed(2)}" x WOF`;
  } else {
    strips = Math.ceil(totalBlocks / perStripRot);
    stripCutSize = `${cutH.toFixed(2)}" x WOF`;
  }
  const stripLenInches = strips * cutH; // if normal; approx either way
  const yardsNeeded = ceilToEighthYards(yards(stripLenInches));
  return { fabricYards: yardsNeeded, strips, stripSize: stripCutSize, blocksToMake: totalBlocks, cutSize: `${cutW.toFixed(2)}" x ${cutH.toFixed(2)}"` };
}

function calcSashing(){
  const sa = seamAllowance();
  const { blocksWide, blocksHigh, blockW, blockH, sashing } = logicalLayout();
  if(!sashing) return { fabricYards:0, strips:0, rows:0, columns:0, rowSize:'N/A', columnSize:'N/A', stripSize:'N/A' };
  const wof = state.wof_sashing;
  const sashCut = sashing + 2*sa;

  // horizontal sashing rows (between block rows)
  const rows = Math.max(blocksHigh-1, 0);
  const rowLength = blocksWide*blockW + (blocksWide-1)*sashing; // finished
  const rowStrips = rows>0 ? Math.ceil((rows * rowLength) / wof) : 0;
  const rowYards = yards(rowStrips * sashCut);

  // vertical sashing columns (between block cols)
  const cols = Math.max(blocksWide-1, 0);
  const colLength = blocksHigh*blockH + (blocksHigh-1)*sashing;
  const stripsPerWOF = Math.floor(wof / sashCut) || 1;
  const verticalCuts = Math.ceil(cols / stripsPerWOF);
  const colYards = yards(verticalCuts * colLength);

  const totalYards = ceilToEighthYards(rowYards + colYards);
  return { fabricYards: totalYards, strips: rowStrips+verticalCuts, rows, columns: cols, rowSize: `${sashCut.toFixed(2)}" x ${Math.ceil(rowLength)}"`, columnSize: `${sashCut.toFixed(2)}" x ${Math.ceil(colLength)}"`, stripSize: `${sashCut.toFixed(2)}" x WOF` };
}

function calcBorders(){
  const sa = seamAllowance();
  const { blockW, blockH, blocksWide, blocksHigh, sashing, border } = logicalLayout();
  if(!border) return { fabricYards:0, strips:0, rows:0, columns:0, stripSize:'N/A' };
  const wof = state.wof_border;
  const borderCut = border + 2*sa;
  const innerW = blocksWide*blockW + (blocksWide-1)*sashing;
  const innerH = blocksHigh*blockH + (blocksHigh-1)*sashing;
  const horizLen = innerW + 2*border; // attach to sides
  const vertLen  = innerH + 2*border;

  const stripsPerWOF = Math.floor(wof / borderCut) || 1;
  const neededStrips = 2*Math.ceil(horizLen/wof) + 2*Math.ceil(vertLen/wof);
  const yardsNeeded = ceilToEighthYards(yards(neededStrips * borderCut));
  return { fabricYards: yardsNeeded, strips: neededStrips, rows:2, columns:2, stripSize:`${borderCut.toFixed(2)}" x WOF` };
}

function calcBacking(){
  const { topW, topH } = topSize();
  const wof = state.wof_backing;
  // add 3" all around
  const needW = topW + 6, needH = topH + 6;
  const panels = Math.ceil(needW / wof);
  const panelLen = needH;
  const yardsNeeded = ceilToEighthYards(yards(panels * panelLen));
  return { fabricYards: yardsNeeded, panels, panelSize: `${Math.min(wof, needW).toFixed(0)}" x ${Math.ceil(panelLen)}"`, cutSize: `${Math.ceil(needW)}" x ${Math.ceil(needH)}"` };
}

function calcBinding(){
  const stripW = state.binding_strip || 2.5;
  const { topW, topH } = topSize();
  const perim = 2*(topW + topH);
  const wof = state.wof_binding;
  const strips = Math.ceil(perim / wof);
  const yardsNeeded = ceilToEighthYards(yards(strips * stripW));
  return { fabricYards: yardsNeeded, strips, stripSize: `${stripW.toFixed(2)}" x WOF`, cutSize: `${stripW.toFixed(2)}" x ${Math.ceil(perim/strips)}"` };
}

function calcBatting(){
  const { topW, topH } = topSize();
  const needW = topW + 8, needH = topH + 8; // generous extra
  const bw = state.batting_width;
  const panels = Math.ceil(needW / bw);
  const length = needH;
  const sizeNeeded = `${Math.ceil(needW)}" x ${Math.ceil(needH)}"`;
  return { sizeNeeded, panels, length };
}

function estimate(){
  const blocks = calcBlocks();
  const sashing = calcSashing();
  const borders = calcBorders();
  const backing = calcBacking();
  const binding = calcBinding();
  const batting = calcBatting();
  const totalCost = (blocks.fabricYards*state.price_blocks)
    + (sashing.fabricYards*state.price_sashing)
    + (borders.fabricYards*state.price_border)
    + (backing.fabricYards*state.price_backing)
    + (binding.fabricYards*state.price_binding)
    + (state.batting_price||0);
  return { blocks, sashing, borders, backing, binding, batting, totalCost: Math.round(totalCost*100)/100 };
}

function renderFabricTable(){
  const e = estimate();
  const tbl = document.createElement('table');
  tbl.innerHTML = `
    <thead><tr><th>Item</th><th>Yardage</th><th>Details</th></tr></thead>
    <tbody>
      <tr><td>Blocks</td><td>${e.blocks.fabricYards.toFixed(3)} yd</td><td>${e.blocks.blocksToMake} blocks • ${e.blocks.stripSize}</td></tr>
      <tr><td>Sashing</td><td>${e.sashing.fabricYards.toFixed(3)} yd</td><td>${e.sashing.rows} rows, ${e.sashing.columns} cols • ${e.sashing.stripSize}</td></tr>
      <tr><td>Borders</td><td>${e.borders.fabricYards.toFixed(3)} yd</td><td>${e.borders.stripSize}</td></tr>
      <tr><td>Backing</td><td>${e.backing.fabricYards.toFixed(3)} yd</td><td>${e.backing.panels} panels • ${e.backing.panelSize}</td></tr>
      <tr><td>Binding</td><td>${e.binding.fabricYards.toFixed(3)} yd</td><td>${e.binding.strips} strips • ${e.binding.stripSize}</td></tr>
      <tr><td>Batting</td><td>—</td><td>${e.batting.sizeNeeded}</td></tr>
    </tbody>`;
  $('#fabricTable').innerHTML = '';
  $('#fabricTable').appendChild(tbl);

  $('#costOut').innerHTML = `
    <div class="grid sm:grid-cols-2 gap-2">
      <div>Blocks: $${(e.blocks.fabricYards*state.price_blocks).toFixed(2)}</div>
      <div>Sashing: $${(e.sashing.fabricYards*state.price_sashing).toFixed(2)}</div>
      <div>Borders: $${(e.borders.fabricYards*state.price_border).toFixed(2)}</div>
      <div>Backing: $${(e.backing.fabricYards*state.price_backing).toFixed(2)}</div>
      <div>Binding: $${(e.binding.fabricYards*state.price_binding).toFixed(2)}</div>
      <div>Batting: $${(state.batting_price||0).toFixed(2)}</div>
      <div class="font-semibold text-slate-900">Total: $${e.totalCost.toFixed(2)}</div>
    </div>`;
}

function renderPlan(){
  const { topW, topH } = topSize();
  const e = estimate();
  const base = baseDimensions();
  const lines = [
    `Purpose: ${state.purpose || '—'}`,
    `Base size: ${base.width}" × ${base.height}"`,
    '',
    `Blocks: ${state.blocksWide} × ${state.blocksHigh}`,
    `Block size: ${state.blockWidth}" × ${state.blockHeight}"`,
    `Sashing: ${state.sashing}"`,
    `Border: ${state.border}"`,
    '',
    `Finished top: ${topW.toFixed(1)}" W × ${topH.toFixed(1)}" H`,
    '',
    `Yardage:`,
    `  • Blocks: ${e.blocks.fabricYards.toFixed(3)} yd (${e.blocks.stripSize})`,
    `  • Sashing: ${e.sashing.fabricYards.toFixed(3)} yd (${e.sashing.stripSize})`,
    `  • Borders: ${e.borders.fabricYards.toFixed(3)} yd (${e.borders.stripSize})`,
    `  • Backing: ${e.backing.fabricYards.toFixed(3)} yd (${e.backing.panels} panels @ ${e.backing.panelSize})`,
    `  • Binding: ${e.binding.fabricYards.toFixed(3)} yd (${e.binding.strips} strips @ ${e.binding.stripSize})`,
    `  • Batting: ${e.batting.sizeNeeded}`,
    '',
    `Estimated total cost: $${e.totalCost.toFixed(2)}`
  ];
  $('#planOut').textContent = lines.join('\n');
}

function drawPreview(){
  const c = $('#previewCanvas'); const ctx = c.getContext('2d');
  const { blocksWide, blocksHigh, blockW, blockH, sashing, border } = logicalLayout();
  const { topW, topH } = topSize();
  const pad=20, scale=Math.min((c.width-2*pad)/topW, (c.height-2*pad)/topH);
  const ox = (c.width - topW*scale)/2, oy = (c.height - topH*scale)/2;

  ctx.clearRect(0,0,c.width,c.height);
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,c.width,c.height);

  // Border background
  if(border>0){ ctx.fillStyle='#11182714'; ctx.fillRect(ox, oy, topW*scale, topH*scale); }

  // Draw blocks & sashing (two-color checker)
  const colorA = '#8B5CF6', colorB = '#E9D5FF';
  let y = oy + (border>0 ? border*scale : 0);
  for(let r=0;r<blocksHigh;r++){
    let x = ox + (border>0 ? border*scale : 0);
    for(let cidx=0;cidx<blocksWide;cidx++){
      ctx.fillStyle = ((r+cidx)%2===0) ? colorA : colorB;
      ctx.fillRect(x, y, blockW*scale, blockH*scale);
      x += blockW*scale;
      if(cidx<blocksWide-1 && sashing>0){
        ctx.fillStyle = '#11182722';
        ctx.fillRect(x, y, sashing*scale, blockH*scale);
        x += sashing*scale;
      }
    }
    y += blockH*scale;
    if(r<blocksHigh-1 && sashing>0){
      let sx = ox + (border>0 ? border*scale : 0);
      let sashW = blocksWide*blockW*scale + (blocksWide-1)*sashing*scale;
      ctx.fillStyle = '#11182722';
      ctx.fillRect(sx, y, sashW, sashing*scale);
      y += sashing*scale;
    }
  }

  $('#dimOut').textContent = `Finished top: ${topW.toFixed(1)}" × ${topH.toFixed(1)}"`;
}

function onChange(){
  save();
  renderFabricTable();
  renderPlan();
  drawPreview();
}

function main(){
  bind();
  initValues();
  onChange();
  stepTo(1);
}

document.addEventListener('DOMContentLoaded', main);
