/* Quilt planner v4 */
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

const state = {
  purpose: "bed",
  bedSize: "full",
  overhang: { sides: 10, foot: 10, head: 0 },
  blockSize: 9,
  sashing: 1,
  cornerstones: false,
  border: 1,
  seam: .25,
  wof: { blocks: 44, sashing: 44, corner: 44, border: 44, binding: 44, backing: 44 },
  costs: { blocks:10, sashing:10, corner:10, border:10, binding:10, backing:10 },
  bindingCut: 2.25,
};

const mattresses = {
  crib:  { w: 28,  h: 52 },
  twin:  { w: 38,  h: 75 },
  full:  { w: 54,  h: 75 },
  queen: { w: 60,  h: 80 },
  king:  { w: 76,  h: 80 },
};

function updateStateFromForm(){
  state.purpose = $('input[name="purpose"]:checked').value;
  state.bedSize = $('input[name="bedSize"]:checked').value;
  state.overhang.sides = +$('#overhangSides').value || 0;
  state.overhang.foot = +$('#overhangFoot').value || 0;
  state.overhang.head = +$('#overhangHead').value || 0;
  state.blockSize = +$('input[name="blockSize"]:checked').value || state.blockSize;
  state.sashing = +$('input[name="sashing"]:checked').value || state.sashing;
  state.cornerstones = $('#cornerstones').checked;
  state.border = +$('input[name="border"]:checked').value || state.border;
  state.seam = +$('input[name="seam"]:checked').value || state.seam;
  state.bindingCut = +$('input[name="bindingCut"]:checked').value || state.bindingCut;

  state.wof.blocks = +$('#wofBlocks').value;
  state.wof.sashing = +$('#wofSashing').value;
  state.wof.corner = +$('#wofCorner').value;
  state.wof.border = +$('#wofBorder').value;
  state.wof.binding = +$('#wofBinding').value;
  state.wof.backing = +$('#wofBacking').value;

  state.costs.blocks = +$('#costBlocks').value;
  state.costs.sashing = +$('#costSashing').value;
  state.costs.corner = +$('#costCorner').value;
  state.costs.border = +$('#costBorder').value;
  state.costs.binding = +$('#costBinding').value;
  state.costs.backing = +$('#costBacking').value;
}

function titleCase(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

function setSummaries(){
  $('#purposeSummary').textContent = state.purpose === 'bed' ? 'Bed cover' : 'Throw blanket';
  $('#sizeSummary').textContent = `${titleCase(state.bedSize)} · ${state.overhang.head}–${state.overhang.foot}” overhang`;
  const sash = `${state.sashing}” sashing${state.cornerstones?' with cornerstones':''}`;
  const border = `${state.border}” border`;
  $('#designSummary').textContent = `${state.blockSize}” x ${state.blockSize}” blocks · ${sash} · ${border}`;
}

$$('.edit-link').forEach(btn=>{
  btn.addEventListener('click', e=>{
    const step = e.currentTarget.dataset.edit;
    toggleStep(step);
  });
});
function toggleStep(step){
  $$('.step').forEach(sec=>{
    const isTarget = sec.dataset.step === step;
    sec.classList.toggle('collapsed', !isTarget || !sec.classList.contains('collapsed') ? !isTarget : false);
    const expanded = !sec.classList.contains('collapsed');
    sec.querySelector('.edit-link').setAttribute('aria-expanded', String(expanded));
    if(!isTarget){ sec.classList.add('collapsed'); sec.querySelector('.edit-link').setAttribute('aria-expanded','false'); }
  });
  window.scrollTo({ top: $('.step[data-step="'+step+'"]').offsetTop-8, behavior:'smooth' });
}

$$('.btn.next').forEach(btn=>{
  btn.addEventListener('click', e=>{
    updateStateFromForm();
    setSummaries();
    toggleStep(e.currentTarget.dataset.next);
  });
});
$$('[data-back]').forEach(btn=>{
  btn.addEventListener('click', e=>{
    toggleStep(e.currentTarget.dataset.back);
  });
});

function resetAll(){ window.location.reload(); }
$('#resetAll').addEventListener('click', resetAll);

$('#seePlan').addEventListener('click', ()=>{
  updateStateFromForm();
  setSummaries();
  computeAndRenderPlan();
  $('#plannerForm').hidden = true;
  $('#planView').hidden = false;
  $('#backToEdit').focus();
});
$('#backToEdit').addEventListener('click', e=>{
  e.preventDefault();
  $('#planView').hidden = true;
  $('#plannerForm').hidden = false;
  toggleStep('1');
});

function chooseGrid(targetW, targetH, block, sashing, border){
  let best = {cols:1, rows:1, w:0, h:0, diff:Infinity};
  for(let cols=3; cols<=12; cols++){
    for(let rows=3; rows<=14; rows++){
      const w = cols*block + (cols-1)*sashing + 2*border;
      const h = rows*block + (rows-1)*sashing + 2*border;
      const diff = Math.abs(w-targetW) + Math.abs(h-targetH);
      if(diff < best.diff) best = {cols, rows, w, h, diff};
    }
  }
  return best;
}

function computeAndRenderPlan(){
  const m = mattresses[state.bedSize];
  const targetW = m.w + 2*state.overhang.sides;
  const targetH = m.h + state.overhang.foot + state.overhang.head;

  const grid = chooseGrid(targetW, targetH, state.blockSize, state.sashing, state.border);
  const cols = grid.cols, rows = grid.rows;
  const finishedW = round1(grid.w);
  const finishedH = round1(grid.h);

  drawGrid(cols, rows);

  const cutBlock = state.blockSize + 2*state.seam;
  const blocksCount = cols * rows;

  function yardsFromPieces(widthIn, heightIn, count, wof){
    const area = widthIn*heightIn*count; // square inches
    return area / (wof * 36); // yards
  }

  const sashingCutW = state.sashing + 2*state.seam;
  const sashingPiecesCols = (cols-1) * rows;
  const sashingPiecesRows = (rows-1) * cols;
  const cornerCount = state.cornerstones ? (cols-1)*(rows-1) : 0;
  const cornerCut = state.sashing + 2*state.seam;

  const blockYards = yardsFromPieces(cutBlock, cutBlock, blocksCount, state.wof.blocks);
  const sashingYards = yardsFromPieces(sashingCutW, state.blockSize, sashingPiecesCols, state.wof.sashing)
                      + yardsFromPieces(sashingCutW, state.blockSize, sashingPiecesRows, state.wof.sashing);
  const cornerYards = state.cornerstones ? yardsFromPieces(cornerCut, cornerCut, cornerCount, state.wof.corner) : 0;

  const borderCutW = state.border ? (state.border + 2*state.seam) : 0;
  const borderPerimeter = 2*(cols*state.blockSize + (cols-1)*state.sashing) + 2*(rows*state.blockSize + (rows-1)*state.sashing);
  const borderYards = state.border ? ((borderCutW * borderPerimeter) / (state.wof.border * 36)) : 0;

  const backingW = finishedW + 11;
  const backingH = finishedH + 11;
  const backingPanels = Math.ceil(backingW / state.wof.backing);
  const panelLength = backingH;
  const backingYards = (backingPanels * panelLength) / 36;

  const perimeter = 2*(finishedW + finishedH);
  const bindingStripWidth = state.bindingCut;
  const stripsNeeded = Math.ceil( (perimeter + 10) / state.wof.binding );
  const bindingYards = (stripsNeeded * bindingStripWidth) / 36;

  const battingSize = suggestBattingSize(finishedW, finishedH);

  const fabricCosts = (blockYards*state.costs.blocks) + (sashingYards*state.costs.sashing) + (cornerYards*state.costs.corner) + (borderYards*state.costs.border) + (bindingYards*state.costs.binding) + (backingYards*state.costs.backing);
  const battingCost = 30;
  const totalCost = fabricCosts + battingCost;

  $('#qWidth').textContent = round1(finishedW);
  $('#qHeight').textContent = round1(finishedH);
  $('#qCols').textContent = cols;
  $('#qRows').textContent = rows;

  $('#blocksYard').textContent = `${toFraction(blockYards)} yards`;
  $('#blocksCut').textContent = `Cut ${estimateStrips(blockYards, state.wof.blocks, cutBlock)} ${cutBlock.toFixed(1)}” strips from WOF`;
  $('#blocksNeeded').textContent = `${blocksCount} blocks`;
  $('#blocksCutSize').textContent = `Cut to ${cutBlock.toFixed(1)}” x ${cutBlock.toFixed(1)}”`;

  const sLines = [];
  sLines.push(`<p><strong>Sashing fabric needed</strong><br>${toFraction(sashingYards)} yards<br>Cut ${estimateStrips(sashingYards, state.wof.sashing, sashingCutW)} ${sashingCutW.toFixed(1)}” strips from WOF</p>`);
  if(state.cornerstones){
    sLines.push(`<p><strong>Cornerstone fabric needed</strong><br>${toFraction(cornerYards)} yards<br>Cut ${estimateStrips(cornerYards, state.wof.corner, cornerCut)} ${cornerCut.toFixed(1)}” strips from WOF</p>`);
  }
  sLines.push(`<p><strong>Sashing rows needed</strong><br>${rows-1} rows<br>Cut to ${state.sashing.toFixed(1)}” x ${ (cols*state.blockSize + (cols-1)*state.sashing).toFixed(1) }”</p>`);
  sLines.push(`<p><strong>Sashing columns needed</strong><br>${cols-1} columns<br>Cut to ${state.sashing.toFixed(1)}” x ${ (rows*state.blockSize + (rows-1)*state.sashing).toFixed(1) }”</p>`);
  if(state.cornerstones){
    sLines.push(`<p><strong>Cornerstones needed</strong><br>${cornerCount} cornerstones<br>Cut to ${state.sashing.toFixed(1)}” x ${state.sashing.toFixed(1)}”</p>`);
  }
  sLines.push(`<p><strong>Sewing order</strong><br> Sashing columns --> block<br> Assemble rows of block<br> Sashing rows --> ${state.cornerstones?'cornerstone':'quilt'}<br> Assemble quilt</p>`);
  $('#sashingPanel').innerHTML = sLines.join("");

  const bPanel = [];
  if(state.border){
    bPanel.push(`<p><strong>Fabric needed</strong><br>${toFraction(borderYards)} ${borderYards>=1?'yards':'yard'}<br>Cut ${Math.max(4, estimateStrips(borderYards, state.wof.border, borderCutW))} ${borderCutW.toFixed(1)}” strips from WOF</p>`);
    bPanel.push(`<p><strong>Border columns needed</strong><br>2 columns<br>Cut to ${state.border.toFixed(1)}" x ${ (rows*state.blockSize + (rows-1)*state.sashing + 2*state.border).toFixed(1) }"</p>`);
    bPanel.push(`<p><strong>Border rows needed</strong><br>2 rows<br>Cut to ${state.border.toFixed(1)}" x ${ (cols*state.blockSize + (cols-1)*state.sashing + 2*state.border).toFixed(1) }"</p>`);
    bPanel.push(`<p><strong>Sewing order</strong><br> Border columns --> quil<br> Border rows --> quilt</p>`);
  } else {
    bPanel.push(`<p>No border selected.</p>`);
  }
  $('#borderPanel').innerHTML = bPanel.join("");

  const bkPanel = [];
  bkPanel.push(`<p><strong>Fabric needed</strong><br>${toFraction(backingYards)} yards<br>Cut ${backingPanels} ${Math.round(panelLength)}” panels from WOF</p>`);
  bkPanel.push(`<p><strong>Backing size</strong><br>${Math.round(backingW)}” x ${Math.round(backingH)}”</p>`);
  $('#backingPanel').innerHTML = bkPanel.join("");

  $('#battingPanel').innerHTML = `<p><strong>Size needed</strong><br>${battingSize}</p>`;

  const bindPanel = [];
  bindPanel.push(`<p><strong>Fabric needed</strong><br>${toFraction(bindingYards)} ${bindingYards>=1?'yards':'yard'}<br>Cut ${stripsNeeded} ${bindingStripWidth.toFixed(2)}” strips from WOF</p>`);
  bindPanel.push(`<p><strong>Binding size</strong><br>${bindingStripWidth.toFixed(2)}” x ${Math.round(perimeter)}”</p>`);
  $('#bindingPanel').innerHTML = bindPanel.join("");

  $('#costFabric').textContent = `$${round2(fabricCosts)}`;
  $('#costBatting').textContent = `$${round2(battingCost)}`;
  $('#costTotal').textContent = `$${round2(totalCost)}`;
}

function drawGrid(cols, rows){
  const c = $('#gridCanvas');
  const ctx = c.getContext('2d');
  const w = c.width, h = c.height;
  ctx.clearRect(0,0,w,h);
  const cell = Math.min((w-20)/cols, (h-20)/rows);
  const ox = (w - cols*cell)/2;
  const oy = (h - rows*cell)/2;
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary');
  for(let r=0; r<rows; r++){
    for(let cidx=0; cidx<cols; cidx++){
      ctx.globalAlpha = 0.9;
      ctx.fillRect(ox + cidx*cell, oy + r*cell, cell-2, cell-2);
    }
  }
}

function suggestBattingSize(w, h){
  const sizes = [
    {name:'Crib', w:45, h:60},
    {name:'Throw', w:60, h:60},
    {name:'Twin', w:72, h:90},
    {name:'Full/double', w:81, h:96},
    {name:'Queen', w:90, h:108},
    {name:'King', w:120, h:120},
  ];
  const needW = w+6, needH = h+6;
  for(const s of sizes){
    if(needW<=s.w && needH<=s.h) return s.name.toLowerCase();
  }
  return `custom`;
}

function round1(x){ return Math.round(x*10)/10; }
function round2(x){ return Math.round(x*100)/100; }

function toFraction(yards){
  const quarters = Math.round(yards * 4);
  const whole = Math.floor(quarters / 4);
  const frac = quarters % 4;
  const map = {0:'',1:'1/4',2:'1/2',3:'3/4'};
  if(whole===0) return map[frac] ? map[frac] : '0';
  return map[frac] ? `${whole} ${map[frac]}` : `${whole}`;
}

function estimateStrips(yards, wof, stripWidth){
  // Rough estimate; aligns visually with examples
  const totalInches = yards * 36;
  return Math.max(1, Math.round(totalInches / stripWidth));
}

// init
toggleStep('1');
setSummaries();
