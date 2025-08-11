/* Quilt planner app (vanilla JS) */
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

// --- State --- //
const state = {
  purpose: "bed",
  bedSize: "full",
  overhang: { sides: 10, foot: 10, head: 0 },
  blockSize: 9, // finished inches
  sashing: 1,   // finished inches
  cornerstones: false,
  border: 1,    // finished inches each side
  seam: .25,    // inches
  wof: { blocks: 44, sashing: 44, corner: 44, border: 44, binding: 44, backing: 44 },
  costs: { blocks:10, sashing:10, corner:10, border:10, binding:10, backing:10 },
  bindingCut: 2.25,
};

// Mattress sizes (typical US) in inches
const mattresses = {
  crib:  { w: 28,  h: 52 },
  twin:  { w: 38,  h: 75 },
  full:  { w: 54,  h: 75 },
  queen: { w: 60,  h: 80 },
  king:  { w: 76,  h: 80 },
};

// Helpers
function updateStateFromForm(){
  state.purpose = $('input[name="purpose"]:checked').value;
  state.bedSize = $('input[name="bedSize"]:checked').value;
  state.overhang.sides = +$('#overhangSides').value || 0;
  state.overhang.foot = +$('#overhangFoot').value || 0;
  state.overhang.head = +$('#overhangHead').value || 0;
  state.blockSize = +$('input[name="blockSize"]:checked').value;
  state.sashing = +$('input[name="sashing"]:checked').value;
  state.cornerstones = $('#cornerstones').checked;
  state.border = +$('input[name="border"]:checked').value;
  state.seam = +$('input[name="seam"]:checked').value;
  state.bindingCut = +$('input[name="bindingCut"]:checked').value;

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

function setSummary(){
  $('#sizeSummary').textContent = `${titleCase(state.bedSize)} · ${state.overhang.head}–${state.overhang.foot}” overhang`;
  $('#designSummary').textContent = `${state.blockSize}” × ${state.blockSize}” blocks · ${state.sashing}” sashing${state.cornerstones?' with cornerstones':''} · ${state.border?state.border+'” border':'No border'}`;
}

function titleCase(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

// Expand/collapse steps
$$('.edit-link').forEach(btn=>{
  btn.addEventListener('click', e=>{
    const step = e.currentTarget.dataset.edit;
    toggleStep(step);
  });
});
function toggleStep(step){
  $$('.step').forEach(sec=>{
    if(sec.dataset.step === step){
      const isCollapsed = sec.classList.contains('collapsed');
      sec.classList.toggle('collapsed', !isCollapsed);
      sec.querySelector('.edit-link').setAttribute('aria-expanded', String(isCollapsed));
    }else{
      sec.classList.add('collapsed');
      sec.querySelector('.edit-link').setAttribute('aria-expanded', 'false');
    }
  });
  window.scrollTo({top: $('.step[data-step="'+step+'"]').offsetTop-10, behavior:'smooth'});
}

// Next/back
$$('.btn.next').forEach(btn=>{
  btn.addEventListener('click', e=>{
    updateStateFromForm();
    setSummary();
    const next = e.currentTarget.dataset.next;
    toggleStep(next);
  });
});
$$('[data-back]').forEach(btn=>{
  btn.addEventListener('click', e=>{
    const back = e.currentTarget.dataset.back;
    toggleStep(back);
  });
});

// Reset
function resetAll(){
  window.location.reload();
}
$('#resetAll').addEventListener('click', resetAll);
$('#resetAll2').addEventListener('click', resetAll);

// See plan
$('#seePlan').addEventListener('click', ()=>{
  updateStateFromForm();
  setSummary();
  computeAndRenderPlan();
  $('#plannerForm').hidden = true;
  $('#planView').hidden = false;
  $('#backToForm').hidden = false;
  $('#backToEdit').focus();
});
$('#backToEdit, #backToForm').forEach ? null : null; // defensive

$('#backToEdit').addEventListener('click', e=>{
  e.preventDefault();
  $('#planView').hidden = true;
  $('#plannerForm').hidden = false;
  toggleStep('1');
  $('#backToForm').hidden = true;
});

// --- Calculations --- //

// Given target width/height, choose block grid (cols/rows) that best fits using block + sashing + border
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

  // Record basic metrics
  const finishedW = round1(grid.w);
  const finishedH = round1(grid.h);

  // Draw grid preview
  drawGrid(cols, rows);

  // Blocks
  const cutBlock = state.blockSize + 2*state.seam;
  const blocksCount = cols * rows;

  // Yardage (area-based estimate)
  function yardsFromPieces(widthIn, heightIn, count, wof){
    const area = widthIn*heightIn*count; // square inches
    return area / (wof * 36); // yards
  }

  const blockYards = yardsFromPieces(cutBlock, cutBlock, blocksCount, state.wof.blocks);
  const sashingPiecesCols = (cols-1) * rows; // vertical sashing pieces
  const sashingPiecesRows = (rows-1) * cols; // horizontal sashing pieces
  const sashingCutW = state.sashing + 2*state.seam;
  const sashingYards = yardsFromPieces(sashingCutW, state.blockSize, sashingPiecesCols, state.wof.sashing)
                      + yardsFromPieces(sashingCutW, state.blockSize, sashingPiecesRows, state.wof.sashing);

  const cornerCount = state.cornerstones ? (cols-1)*(rows-1) : 0;
  const cornerCut = state.sashing + 2*state.seam;
  const cornerYards = state.cornerstones ? yardsFromPieces(cornerCut, cornerCut, cornerCount, state.wof.corner) : 0;

  const borderCutW = state.border ? (state.border + 2*state.seam) : 0;
  const borderPieces = state.border ? 2*(cols*state.blockSize + (cols-1)*state.sashing) + 2*(rows*state.blockSize + (rows-1)*state.sashing) : 0; // perimeter for info
  const borderYards = state.border ? ( (borderCutW * (finishedW + finishedH) * 2) / (state.wof.border * 36) ) : 0; // approx

  // Backing (1- or 2- or 3-panel, simple calc)
  const backingW = finishedW + 8; // extra for quilting
  const backingH = finishedH + 8;
  const backingPanels = Math.ceil(backingW / state.wof.backing);
  const panelLength = backingH;
  const backingYards = (backingPanels * panelLength) / 36;

  // Binding (perimeter, add 10” for joins)
  const perimeter = 2*(finishedW + finishedH);
  const bindingStripWidth = state.bindingCut;
  const stripsNeeded = Math.ceil( (perimeter + 10) / state.wof.binding );
  const bindingYards = (stripsNeeded * bindingStripWidth) / 36;

  // Batting suggestion based on typical packaged sizes
  const battingSize = suggestBattingSize(finishedW, finishedH);

  // Costs
  const fabricCosts = (blockYards*state.costs.blocks) + (sashingYards*state.costs.sashing) + (cornerYards*state.costs.corner) + (borderYards*state.costs.border) + (bindingYards*state.costs.binding) + (backingYards*state.costs.backing);
  const battingCost = 30; // placeholder typical
  const totalCost = fabricCosts + battingCost;

  // Render
  $('#qWidth').textContent = finishedW;
  $('#qHeight').textContent = finishedH;
  $('#qCols').textContent = cols;
  $('#qRows').textContent = rows;

  $('#blocksYard').textContent = `${round2(blockYards)} yards`;
  $('#blocksCut').textContent = `Cut ${Math.ceil(blockYards*state.wof.blocks*36 / cutBlock)} ${cutBlock.toFixed(1)}” strips from WOF`;
  $('#blocksNeeded').textContent = `${blocksCount} blocks`;
  $('#blocksCutSize').textContent = `Cut to ${cutBlock.toFixed(1)}” × ${cutBlock.toFixed(1)}”`;

  const sPanel = [];
  sPanel.push(`<p><strong>Sashing fabric needed</strong><br>${round2(sashingYards)} yards<br>Cut ${Math.ceil(sashingYards*state.wof.sashing*36 / sashingCutW)} ${sashingCutW.toFixed(1)}” strips from WOF</p>`);
  if(state.cornerstones){
    sPanel.push(`<p><strong>Cornerstone fabric needed</strong><br>${round2(cornerYards)} yards<br>Cut ${Math.ceil(Math.sqrt(cornerCount))} ${cornerCut.toFixed(1)}” strips from WOF</p>`);
  }
  sPanel.push(`<p><strong>Sashing rows needed</strong><br>${rows-1} rows<br>Cut to ${state.sashing.toFixed(1)}” × ${ (cols*state.blockSize + (cols-1)*state.sashing).toFixed(1) }”</p>`);
  sPanel.push(`<p><strong>Sashing columns needed</strong><br>${cols-1} columns<br>Cut to ${state.sashing.toFixed(1)}” × ${ (rows*state.blockSize + (rows-1)*state.sashing).toFixed(1) }”</p>`);
  if(state.cornerstones){
    sPanel.push(`<p><strong>Cornerstones needed</strong><br>${cornerCount} cornerstones<br>Cut to ${state.sashing.toFixed(1)}” × ${state.sashing.toFixed(1)}”</p>`);
  }
  sPanel.push(`<p><strong>Sewing order</strong><br>1. Sashing columns → blocks<br>2. Assemble rows of blocks<br>3. Sashing rows → ${state.cornerstones?'cornerstones':'quilt'}<br>4. Assemble quilt</p>`);
  $('#sashingPanel').innerHTML = sPanel.join("");

  const bPanel = [];
  if(state.border){
    bPanel.push(`<p><strong>Fabric needed</strong><br>${round2(borderYards)} yard${borderYards>=2?'s':''}<br>Cut ${Math.max(4, Math.ceil(borderYards*state.wof.border*36 / borderCutW))} ${borderCutW.toFixed(1)}” strips from WOF</p>`);
    bPanel.push(`<p><strong>Border columns needed</strong><br>2 columns<br>Cut to ${state.border.toFixed(1)}” × ${ (rows*state.blockSize + (rows-1)*state.sashing + 2*state.border).toFixed(1) }"</p>`);
    bPanel.push(`<p><strong>Border rows needed</strong><br>2 rows<br>Cut to ${state.border.toFixed(1)}” × ${ (cols*state.blockSize + (cols-1)*state.sashing + 2*state.border).toFixed(1) }"</p>`);
    bPanel.push(`<p><strong>Sewing order</strong><br>1. Border columns → quilt<br>2. Border rows → quilt</p>`);
  } else {
    bPanel.push(`<p>No border selected.</p>`);
  }
  $('#borderPanel').innerHTML = bPanel.join("");

  const bkPanel = [];
  bkPanel.push(`<p><strong>Fabric needed</strong><br>${round2(backingYards)} yards<br>Cut ${backingPanels} ${Math.round(panelLength)}” panels from WOF</p>`);
  bkPanel.push(`<p><strong>Backing size</strong><br>${Math.round(backingW)}” × ${Math.round(backingH)}”</p>`);
  $('#backingPanel').innerHTML = bkPanel.join("");

  $('#battingPanel').innerHTML = `<p><strong>Size needed</strong><br>${battingSize}</p>`;

  const bindPanel = [];
  bindPanel.push(`<p><strong>Fabric needed</strong><br>${round2(bindingYards)} yard${bindingYards>=2?'s':''}<br>Cut ${stripsNeeded} ${bindingStripWidth.toFixed(2)}” strips from WOF</p>`);
  bindPanel.push(`<p><strong>Binding size</strong><br>${bindingStripWidth.toFixed(2)}” × ${Math.round(perimeter)}”</p>`);
  $('#bindingPanel').innerHTML = bindPanel.join("");

  // Costs
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
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent');
  for(let r=0; r<rows; r++){
    for(let cidx=0; cidx<cols; cidx++){
      ctx.globalAlpha = 0.9;
      ctx.fillRect(ox + cidx*cell, oy + r*cell, cell-2, cell-2);
    }
  }
}

function suggestBattingSize(w, h){
  // simple mapping to pre-cuts
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
  return `${Math.ceil(needW/12)*12}” × ${Math.ceil(needH/12)*12}”`;
}

function round1(x){ return Math.round(x*10)/10; }
function round2(x){ return Math.round(x*100)/100; }

// init
toggleStep('1');
setSummary();
