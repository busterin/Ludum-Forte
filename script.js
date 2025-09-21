/* ============================================
   TACTIC HEROES — PRE-TUTORIAL + GUIDED STEPS
   Fecha: 2025-09-21
   Estado: tutorial en 3 pasos (Risko -> Hans -> Pasar turno)
============================================ */
(function(){
  // --- Dimensiones del tablero 9:16 ---
  const ROWS = 16, COLS = 9;
  const NON_PLAYABLE_BOTTOM_ROWS = 4;

  // Parámetros
  const PLAYER_MAX_MP = 5;
  const ENEMY_MAX_MP  = 3;
  const ENEMY_BASE_DAMAGE = 50;

  // Estado
  let turno = "jugador";
  let fase = 1;           // se usará una vez terminado el tutorial
  let enemies = [];
  let players = [];
  let seleccionado = null;
  let celdasMovibles = new Set();
  let distSel = null;

  // Tutorial
  let tutorialActive = false;
  let tutorialStep = 0; // 0: Risko mover+atacar, 1: Hans mover+atacar, 2: pulsar Pasar turno
  let tutTarget = null; // {fila,col} casilla amarilla a señalar
  let soldier1 = null;  // enemigo para Risko
  let soldier2 = null;  // enemigo para Hans

  // DOM
  const mapa = document.getElementById("mapa");
  const acciones = document.getElementById("acciones");
  const ficha = document.getElementById("ficha");
  const overlayWin = document.getElementById("overlayWin");
  const btnContinuar = document.getElementById("btnContinuar");
  const turnBanner = document.getElementById("turnBanner");

  const portada = document.getElementById("portada");
  const btnJugar = document.getElementById("btnJugar");

  // --- DOM (prólogo) ---
const introScene = document.getElementById("introScene");
const introBgA = document.getElementById("introBgA");
const introBgB = document.getElementById("introBgB");
const introNameEl = document.getElementById("introName");
const introTextEl = document.getElementById("introText");
const btnIntroNext = document.getElementById("btnIntroNext");

// --- Cross-fade entre capas A/B ---
let introCurrentLayer = 'A';
function introSetBackground(url, instant=false){
  const curr = (introCurrentLayer === 'A') ? introBgA : introBgB;
  const next = (introCurrentLayer === 'A') ? introBgB : introBgA;

  // Ponemos la siguiente imagen en la capa "next"
  next.style.backgroundImage = `url('${url}')`;

  if (instant){
    // Primera vez: mostramos "next" sin animación y ocultamos "curr"
    next.classList.add('show');
    curr.classList.remove('show');
  } else {
    // Cross-fade: ocultamos la actual y mostramos la nueva
    curr.classList.remove('show');
    // Forzamos reflow para asegurar la transición (opcional, pero ayuda en iOS)
    void next.offsetWidth;
    next.classList.add('show');
  }
  // Intercambiamos la capa actual
  introCurrentLayer = (introCurrentLayer === 'A') ? 'B' : 'A';
}

// --- Precarga de las 4 imágenes del prólogo ---
const introPreloaded = new Set();
function preloadIntroImages(){
  introSlides.forEach(s=>{
    if (introPreloaded.has(s.img)) return;
    const im = new Image();
    im.src = s.img;
    introPreloaded.add(s.img);
  });
}

// --- Typewriter del prólogo (igual que tenías) ---
function typeWriterIntro(text, speed=22){
  let typing = true;
  introTextEl.textContent = '';
  introTextEl.classList.add('type-cursor');
  let i = 0;
  function step(){
    if (i <= text.length){
      introTextEl.textContent = text.slice(0,i);
      i++;
      setTimeout(step, speed);
    } else {
      typing = false;
      introTextEl.classList.remove('type-cursor');
    }
  }
  step();
}

// --- Mostrar slide actual (con cross-fade) ---
function showIntroSlide(instant=false){
  const slide = introSlides[introIndex];
  if (!slide) return;
  introNameEl.textContent = "Prólogo";
  // Cross-fade (instant en la primera para evitar cualquier parpadeo)
  introSetBackground(slide.img, instant);
  typeWriterIntro(slide.text);
}

// --- Avanzar slide ---
function advanceIntro(){
  introIndex++;
  if (introIndex >= introSlides.length){
    introScene.style.display = "none";
    if (dialog){
      dlgIndex = 0;
      dialog.style.display = "block";
      showCurrentDialog();
    }
    applyOrientationLock();
    return;
  }
  showIntroSlide(false);
}

  const dialog = document.getElementById("dialogScene");
  const dialogNameEl = document.getElementById("dialogName");
  const dialogTextEl = document.getElementById("dialogText");
  const btnDialogNext = document.getElementById("btnDialogNext");
  const charKnight = document.getElementById("charKnight");   // Risko (derecha)
  const charArcher = document.getElementById("charArcher");   // Hans (izquierda)

  const tutorialBar = document.getElementById("tutorialBar");

  // ---------- Banner turno ----------
  function showTurnBanner(text){
    turnBanner.textContent = text;
    turnBanner.style.display = "block";
    setTimeout(()=>{ turnBanner.style.display = "none"; }, 1300);
  }
  function setTurno(t){
    turno = t;
    showTurnBanner(t==="jugador" ? "TU TURNO" : t==="enemigo" ? "TURNO ENEMIGO" : "FIN DE PARTIDA");
  }

  // ---------- Layout / orientación ----------
  function getUsableViewport(){
    const w = Math.max(window.innerWidth || 0, document.documentElement.clientWidth || 0);
    const h = Math.max(window.innerHeight || 0, document.documentElement.clientHeight || 0);
    return { w, h };
  }
  function ajustarTamanoTablero(){
    const { w:vw, h:vh } = getUsableViewport();
    const pad = 12;
    const cell = Math.max(28, Math.floor(Math.min((vw - pad)/COLS, (vh - pad)/ROWS)));
    document.documentElement.style.setProperty('--cell', `${cell}px`);
    document.documentElement.style.setProperty('--cols', COLS);
    document.documentElement.style.setProperty('--rows', ROWS);
    document.documentElement.style.setProperty('--npRows', NON_PLAYABLE_BOTTOM_ROWS);
    mapa.style.width  = `${cell * COLS}px`;
    mapa.style.height = `${cell * ROWS}px`;
  }
  window.addEventListener('resize', ajustarTamanoTablero);
  window.addEventListener('orientationchange', ajustarTamanoTablero);
  new ResizeObserver(()=>ajustarTamanoTablero()).observe(document.body);

  function isLandscape(){ return window.innerWidth > window.innerHeight; }
  function applyOrientationLock(){
    const blocker = document.getElementById("orientationBlocker");
    const enHorizontal = isLandscape();
    const portadaVisible = portada && getComputedStyle(portada).display !== "none";
    const shouldBlock = enHorizontal && !portadaVisible;
    blocker.style.display = shouldBlock ? "grid" : "none";
    if (portada){ portada.style.pointerEvents = "auto"; portada.style.filter = "none"; }
    const dim = (el)=>{ if(!el) return; el.style.pointerEvents = shouldBlock ? "none" : "auto"; el.style.filter = shouldBlock ? "grayscale(1) blur(1.5px) brightness(.7)" : "none"; };
    dim(introScene); dim(dialog); dim(mapa);
  }
  function setupOrientationLock(){
    applyOrientationLock();
    window.addEventListener("resize", applyOrientationLock);
    window.addEventListener("orientationchange", ()=> setTimeout(applyOrientationLock,100));
  }

  // ---------- Utils ----------
  const key = (f,c) => `${f},${c}`;
  const dentro = (f,c) => f>=0 && f<ROWS && c>=0 && c<COLS;
  const noJugable = (f) => f >= ROWS - NON_PLAYABLE_BOTTOM_ROWS;
  const manhattan = (a,b) => Math.abs(a.fila-b.fila)+Math.abs(a.col-b.col);
  const enLineaRecta = (a,b) => (a.fila===b.fila) || (a.col===b.col);
  function getCelda(f,c){ return mapa.querySelector(`.celda[data-key="${f},${c}"]`); }

  // ---------- Spawns estándar (no tutorial) ----------
  function spawnFase(){
    enemies = [];
    const count = (fase === 1) ? 3 : (fase === 2) ? 4 : 0;
    if (count === 0) return;
    const ocupadas = new Set(players.filter(p=>p.vivo).map(p=>key(p.fila,p.col)));
    for (let i=0; i<count; i++){
      let f,c;
      do {
        f = Math.floor(Math.random()*(ROWS - NON_PLAYABLE_BOTTOM_ROWS));
        c = Math.floor(Math.random()*COLS);
      } while (ocupadas.has(key(f,c)));
      ocupadas.add(key(f,c));
      enemies.push({
        id:`E${Date.now()}-${i}`,
        nombre:`Soldado ${i+1 + (fase===2?3:0)}`,
        fila:f, col:c, vivo:true,
        hp:50, maxHp:50,
        retrato:"assets/enemy.PNG",
        damage:ENEMY_BASE_DAMAGE,
        mp: ENEMY_MAX_MP
      });
    }
    if (turno==="jugador") players.forEach(p=>{ p.acted=false; p.mp=PLAYER_MAX_MP; });
  }

  // ---------- Tutorial: escenario guiado ----------
  function startTutorialScenario(){
    tutorialActive = true;
    tutorialStep = 0;

    // Posiciones fijas para que el flujo funcione
    // Risko (10,2) — Hans (10,4)
    players = [
      { ...makeKnight(), fila: 10, col: 2, mp: PLAYER_MAX_MP, acted: false },
      { ...makeArcher(), fila: 10, col: 4, mp: PLAYER_MAX_MP, acted: false },
    ];
    // Soldado 1 (para Risko): (8,2)
    soldier1 = {
      id: `TUT-S1-${Date.now()}`, nombre: "Soldado 1",
      fila: 8, col: 2, vivo: true, hp: 50, maxHp: 50,
      retrato: "assets/enemy.PNG", damage: ENEMY_BASE_DAMAGE, mp: ENEMY_MAX_MP
    };
    // Soldado 2 (para Hans): (7,4)
    soldier2 = {
      id: `TUT-S2-${Date.now()}`, nombre: "Soldado 2",
      fila: 7, col: 4, vivo: true, hp: 50, maxHp: 50,
      retrato: "assets/enemy.PNG", damage: ENEMY_BASE_DAMAGE, mp: ENEMY_MAX_MP
    };
    enemies = [ soldier1, soldier2 ];

    // Casilla destino para Risko: (9,2) — adyacente a Soldado 1
    tutTarget = { fila: 9, col: 2 };

    // Mensaje
    setTutorialText("Tutorial<br>Pulsa sobre <b>Risko</b> y muévela. Después ataca al soldado.");

    dibujarMapa();
    mapa.style.display = "grid";
    setTurno("jugador");
  }

  function setTutorialText(html){
    if (!tutorialBar) return;
    tutorialBar.style.display = "block";
    tutorialBar.innerHTML = html;
  }
  function clearTutorial(){
    tutorialActive = false;
    tutorialStep = -1;
    tutTarget = null;
    if (tutorialBar){ tutorialBar.style.display = "none"; tutorialBar.textContent = ""; }
  }

  // ---------- Render ----------
  function dibujarMapa(){
    mapa.querySelectorAll(".celda").forEach(n=>n.remove());
    for (let f=0; f<ROWS; f++){
      for (let c=0; c<COLS; c++){
        const celda = document.createElement("div");
        celda.className = "celda";
        celda.dataset.key = key(f,c);

        if (noJugable(f)) celda.style.pointerEvents = "none";

        // Marca de destino del tutorial
        if (tutorialActive && tutTarget && tutTarget.fila === f && tutTarget.col === c){
          celda.classList.add("tut-target");
        }

        if (seleccionado && celdasMovibles.has(key(f,c))) celda.classList.add("movible");
        if (seleccionado && seleccionado.fila===f && seleccionado.col===c) celda.classList.add("seleccionada");

        // Jugadores
        for (const p of players){
          if (p.vivo && p.fila===f && p.col===c){
            const img = document.createElement("img");
            img.src = (p.tipo==="guerrero") ? "assets/player.PNG" : "assets/archer.PNG";
            img.alt = p.nombre;
            img.className = "fichaMiniImg";
            celda.appendChild(img);
          }
        }
        // Enemigos
        for (const e of enemies){
          if (e.vivo && e.fila===f && e.col===c){
            const img = document.createElement("img");
            img.src = "assets/enemy.PNG";
            img.alt = e.nombre;
            img.className = "fichaMiniImg";
            celda.appendChild(img);
          }
        }

        celda.addEventListener("click", ()=>manejarClick(f,c));
        mapa.appendChild(celda);
      }
    }
  }

  // ---------- Acciones / HUD ----------
  function endTurn(){
    players.forEach(p=>{ p.acted=true; p.mp=0; });
    seleccionado=null; celdasMovibles.clear(); distSel=null;
    acciones.innerHTML="";
    setTurno("enemigo");

    // Si es el paso 2 del tutorial, al pulsar Pasar turno comenzará el combate
    if (tutorialActive && tutorialStep === 2){
      // Termina tutorial y continua flujo normal con estos enemigos
      clearTutorial();
    }
    setTimeout(turnoIAEnemigos, 140);
  }

  function botonesAccionesPara(unidad){
    acciones.innerHTML="";
    if (turno!=="jugador" || !unidad?.vivo) return;

    const infoMp = document.createElement("div");
    infoMp.textContent = `MP: ${unidad.mp}/${PLAYER_MAX_MP}`;
    infoMp.style.marginRight = "6px";
    infoMp.style.alignSelf = "center";
    acciones.appendChild(infoMp);

    enemigosEnRango(unidad).forEach(en=>{
      const b=document.createElement("button");
      b.className="primary";
      b.textContent=`ATACAR ${en.nombre}`;
      b.onclick=()=>atacarUnidadA(unidad,en);
      acciones.appendChild(b);
    });

    const bTurn=document.createElement("button");
    bTurn.textContent="Pasar turno";
    bTurn.onclick=endTurn;
    acciones.appendChild(bTurn);
  }

  // ---------- Ficha ----------
  function renderFicha(u){
    if(!u){ ficha.style.display="none"; ficha.innerHTML=""; return; }
    const pct = Math.max(0, Math.min(100, Math.round((u.hp/u.maxHp)*100)));
    const grad = (pct>50)?"linear-gradient(90deg,#2ecc71,#27ae60)":(pct>25)?"linear-gradient(90deg,#f1c40f,#e67e22)":"linear-gradient(90deg,#e74c3c,#c0392b)";
    const extra = `· Daño <b>${u.damage}</b> · KOs <b>${u.kills||0}</b> · MP <b>${u.mp}</b>/${PLAYER_MAX_MP}`;
    ficha.innerHTML = `
      <div class="card">
        <div class="portrait" style="background-image:url('${u.retrato}')"></div>
        <div class="info">
          <p class="name">${u.nombre}</p>
          <p class="meta">${extra}</p>
          <div class="hp">
            <div class="bar"><span style="width:${pct}%; background:${grad}"></span></div>
            <div class="value">${u.hp}/${u.maxHp} HP</div>
          </div>
        </div>
      </div>`;
    ficha.style.display="block";
  }

  // ---------- Movimiento ----------
  function calcularCeldasMovibles(u){
    celdasMovibles.clear();
    distSel = Array.from({length:ROWS},()=>Array(COLS).fill(Infinity));
    const q=[]; distSel[u.fila][u.col]=0; q.push([u.fila,u.col]);
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
    while(q.length){
      const [f,c]=q.shift();
      for(const [df,dc] of dirs){
        const nf=f+df,nc=c+dc;
        if(!dentro(nf,nc) || noJugable(nf)) continue;
        const ocupado = enemies.some(e=>e.vivo&&e.fila===nf&&e.col===nc) ||
                        players.some(p=>p.vivo&&p!==u&&p.fila===nf&&p.col===nc);
        if(ocupado) continue;
        const nd = distSel[f][c] + 1;
        if(nd<=u.mp && nd<distSel[nf][nc]){ distSel[nf][nc]=nd; q.push([nf,nc]); }
      }
    }
    for(let f=0;f<ROWS-NON_PLAYABLE_BOTTOM_ROWS;f++) for(let c=0;c<COLS;c++){
      if(!(f===u.fila && c===u.col) && distSel[f][c]<=u.mp) celdasMovibles.add(`${f},${c}`);
    }
  }

  function enemigosEnRango(u){
    return enemies.filter(e=>{
      if(!e.vivo) return false;
      if(!enLineaRecta(u,e)) return false;
      const d = Math.abs(u.fila-e.fila)+Math.abs(u.col-e.col);
      return u.range.includes(d);
    });
  }

  function manejarClick(f,c){
    if (noJugable(f)) return;

    const pj = players.find(p=>p.vivo&&p.fila===f&&p.col===c);
    const en = enemies.find(e=>e.vivo&&e.fila===f&&e.col===c);

    if(pj) renderFicha(pj); else if(en) renderFicha(en);

    if (turno!=="jugador") return;

    if (pj){
      if (pj.acted){ seleccionado=null; celdasMovibles.clear(); distSel=null; dibujarMapa(); acciones.innerHTML=""; return; }
      seleccionado=pj; if (seleccionado.mp>0) calcularCeldasMovibles(seleccionado); else { celdasMovibles.clear(); distSel=null; }
      dibujarMapa(); botonesAccionesPara(seleccionado); return;
    }

    if (seleccionado){
      if (f===seleccionado.fila && c===seleccionado.col){
        seleccionado=null; celdasMovibles.clear(); distSel=null; dibujarMapa(); acciones.innerHTML=""; return;
      }
      const esAlcanzable = celdasMovibles.has(`${f},${c}`);
      const ocupado = enemies.some(e=>e.vivo&&e.fila===f&&e.col===c) ||
                      players.some(p=>p.vivo&&p!==seleccionado&&p.fila===f&&p.col===c);
      if (esAlcanzable && !ocupado){
        const coste = distSel[f][c] || 0;
        seleccionado.fila=f; seleccionado.col=c;
        seleccionado.mp = Math.max(0, seleccionado.mp - coste);
        renderFicha(seleccionado);

        // Progresión del tutorial al mover
        if (tutorialActive){
          if (tutorialStep === 0 && seleccionado.nombre === "Risko"){
            // Debe moverse a la casilla objetivo junto al Soldado 1
            if (tutTarget && f === tutTarget.fila && c === tutTarget.col){
              // Ahora podrá atacar (está a 1 de soldado1)
              setTutorialText("Tutorial<br>Ahora pulsa <b>ATACAR Soldado 1</b> con Risko.");
              // La diana ya no hace falta, la quitamos para no confundir
              tutTarget = null;
            }
          } else if (tutorialStep === 1 && seleccionado.nombre === "Hans"){
            if (tutTarget && f === tutTarget.fila && c === tutTarget.col){
              setTutorialText("Tutorial<br>Ahora pulsa <b>ATACAR Soldado 2</b> con Hans.");
              tutTarget = null;
            }
          }
        }

        if (seleccionado.mp>0){
  calcularCeldasMovibles(seleccionado);
} else {
  // ✅ Sin MP pero TODAVÍA NO hemos actuado: dejamos atacar o pasar turno.
  celdasMovibles.clear();
  distSel = null;
  // NO ponemos acted=true aquí
}
dibujarMapa();
botonesAccionesPara(seleccionado);
// ✅ No cambiará de turno hasta que todas las unidades hayan ACTUADO de verdad.
comprobarCambioATurnoEnemigo();
      } else {
        botonesAccionesPara(seleccionado);
      }
    }
  }

  // ---------- FX ----------
  function efectoAtaque(objetivo, cantidad, fuente){
    const celda = getCelda(objetivo.fila, objetivo.col);
    if(!celda) return;
    const flash = (fuente==='enemy')?'flash-enemy':'flash-player';
    celda.classList.add(flash); setTimeout(()=>celda.classList.remove(flash),280);
    const sprite = celda.querySelector('.fichaMiniImg');
    if (sprite){ sprite.classList.add('blink-hit'); setTimeout(()=>sprite.classList.remove('blink-hit'),600); }
    const dmg=document.createElement('div');
    dmg.className='dmg-float ' + (fuente==='enemy'?'dmg-enemy':'dmg-player');
    dmg.textContent=`-${cantidad}`; celda.appendChild(dmg);
    setTimeout(()=>dmg.remove(),650);
  }
  function efectoMuerte(unidad){
    const celda = getCelda(unidad.fila, unidad.col);
    if(!celda) return;
    const sprite = celda.querySelector('.fichaMiniImg');
    if (sprite){ sprite.classList.add('death-pop'); setTimeout(()=>{ if(sprite.parentNode) sprite.parentNode.removeChild(sprite); }, 360); }
  }
  function aplicarDanyo(obj,cant,fuente){
    obj.hp=Math.max(0,obj.hp-cant);
    efectoAtaque(obj,cant,fuente);
    mapa.classList.add("shake");
    setTimeout(()=>mapa.classList.remove("shake"), 400);
    if(obj.hp<=0){ obj.vivo=false; efectoMuerte(obj); }
  }

  // ---------- Validación objetivos ----------
  function isAliveEnemyById(id){ return enemies.find(e=>e.id===id && e.vivo); }
  function isAlivePlayerByRef(p){ return players.includes(p) && p.vivo; }
  function stillInRange(attacker, target){
    if (!target?.vivo) return false;
    if (!enLineaRecta(attacker, target)) return false;
    const d = Math.abs(attacker.fila - target.fila) + Math.abs(attacker.col - target.col);
    return attacker.range.includes(d);
  }

  // ---------- Combate jugador ----------
  function atacarUnidadA(u, objetivoRef){
    const objetivo = isAliveEnemyById(objetivoRef.id);
    if (!objetivo || !stillInRange(u, objetivo)) { botonesAccionesPara(u); return; }

    aplicarDanyo(objetivo, u.damage, 'player');
    renderFicha(objetivo);

    setTimeout(()=>{
      if(!objetivo.vivo){
        u.kills=(u.kills||0)+1;

        // Avance del tutorial tras eliminar cada soldado
        if (tutorialActive){
          if (tutorialStep === 0 && objetivoRef.id === soldier1.id){
            // Configura paso de Hans
            tutorialStep = 1;
            // Casilla para Hans a distancia 2 alineado con Soldado 2: (9,4)
            tutTarget = { fila: 9, col: 4 };
            setTutorialText("Tutorial<br>Ahora mueve a <b>Hans</b> a la casilla resaltada y ataca al soldado a distancia.");
          } else if (tutorialStep === 1 && objetivoRef.id === soldier2.id){
            tutorialStep = 2;
            tutTarget = null;
            setTutorialText("Tutorial<br>Pulsa el botón <b>Pasar turno</b> y comenzará el combate.");
          }
        }

        // Si no hay más enemigos y no estamos en tutorial, procedemos a ganar (flujo clásico)
        if (!tutorialActive && enemies.every(e=>!e.vivo)) {
          if (fase === 1){ fase = 2; spawnFase(); dibujarMapa(); }
          else if (fase === 2){ fase = 3; setTurno("fin"); overlayWin.style.display="grid"; }
        }
      }

      u.acted = true; u.mp = 0;
      seleccionado = null; celdasMovibles.clear(); distSel=null;
      acciones.innerHTML="";
      dibujarMapa();
      comprobarCambioATurnoEnemigo();
    }, 650);
  }

  function comprobarCambioATurnoEnemigo(){
  // ✅ Solo pasamos a turno enemigo cuando TODAS las unidades ya han ACTUADO,
  // no por quedarse sin MP.
  if (players.every(p => !p.vivo || p.acted)) {
    setTurno("enemigo");
    setTimeout(turnoIAEnemigos, 140);
  }
}
  // ---------- IA Enemiga ----------
  function turnoIAEnemigos(){
    if (turno !== "enemigo") return;
    const vivosJ = players.filter(p=>p.vivo);
    if (vivosJ.length === 0) { setTurno("fin"); return; }

    for (const en of enemies) {
      if (!en.vivo) continue;
      en.mp = ENEMY_MAX_MP;

      // objetivo más cercano
      let objetivo = vivosJ[0];
      let mejor = manhattan(en, objetivo);
      for (const p of vivosJ){ const d = manhattan(en, p); if (d < mejor){ mejor = d; objetivo = p; } }

      // moverse hasta 3 pasos
      const step = (a,b)=> a<b?1:(a>b?-1:0);
      while (en.mp > 0){
        if (manhattan(en, objetivo) === 1) break;
        const cand = [];
        if (en.fila !== objetivo.fila) cand.push([en.fila + step(en.fila, objetivo.fila), en.col]);
        if (en.col  !== objetivo.col ) cand.push([en.fila, en.col + step(en.col,  objetivo.col )]);
        let moved = false;
        for (const [nf,nc] of cand){
          if(!dentro(nf,nc) || noJugable(nf)) continue;
          const ocupado = enemies.some(o=>o!==en && o.vivo && o.fila===nf && o.col===nc) ||
                          players.some(p=>p.vivo && p.fila===nf && p.col===nc);
          if(!ocupado){ en.fila=nf; en.col=nc; en.mp--; moved=true; break; }
        }
        if(!moved) break;
      }

      if (manhattan(en, objetivo) === 1 && isAlivePlayerByRef(objetivo)) {
        aplicarDanyo(objetivo, ENEMY_BASE_DAMAGE, 'enemy');
        renderFicha(objetivo);
      }
    }

    players.forEach(p=>{ if(p.hp<=0) p.vivo=false; p.acted=false; p.mp = PLAYER_MAX_MP; });
    dibujarMapa();

    if (players.every(p=>!p.vivo)) { setTurno("fin"); }
    else {
      setTurno("jugador");
      // Si acabó el tutorial, aquí ya sigue el combate normal
      if (!tutorialActive && enemies.every(e=>!e.vivo)) {
        if (fase === 1){ fase = 2; spawnFase(); dibujarMapa(); }
        else if (fase === 2){ fase = 3; overlayWin.style.display="grid"; }
      }
    }
  }

  // ---------- Typewriter (Intro) ----------
  function typeWriterIntro(text, speed=22){
    let typing = true;
    introTextEl.textContent = '';
    introTextEl.classList.add('type-cursor');
    let i = 0;
    function step(){
      if (i <= text.length){
        introTextEl.textContent = text.slice(0,i);
        i++;
        setTimeout(step, speed);
      } else {
        typing = false;
        introTextEl.classList.remove('type-cursor');
      }
    }
    step();
  }
  function showIntroSlide(){
    const slide = introSlides[introIndex];
    if (!slide) return;
    introNameEl.textContent = "Prólogo";
    introBg.style.backgroundImage = `url('${slide.img}')`;
    typeWriterIntro(slide.text);
  }
  function advanceIntro(){
    const slide = introSlides[introIndex];
    introIndex++;
    if (introIndex >= introSlides.length){
      introScene.style.display = "none";
      if (dialog){
        dlgIndex = 0;
        dialog.style.display = "block";
        showCurrentDialog();
      }
      applyOrientationLock();
      return;
    }
    showIntroSlide();
  }

  // ---------- Diálogos ----------
  const dialogLines = [
    { who:'knight', name:'Risko', text:'Ese malnacido de Fortris se ha hecho con el poder. Eres el único guerrero que me queda, Hans.' },
    { who:'archer', name:'Hans',  text:'¡Siempre estaré a tu lado, capitana! Pero debemos buscar donde refugiarnos, llevamos varios días huyendo y aún nos pisan los talones esos soldados…' },
    { who:'knight', name:'Risko', text:'Tenemos que idear un plan para detener a Fortris pero para ello, primero tenemos que sobrevivir. Prepárate porque aquí vienen…' },
    { who:'archer', name:'Hans',  text:'Hace mucho que no teníamos un combate real, más allá de los entrenamientos. Aprovechemos para recordar lo más básico. ¡Vamos!' }
  ];
  let dlgIndex = 0, typing=false, typeTimer=null;
  function clearSpeaker(){ [charKnight, charArcher].forEach(el => el && el.classList.remove('speaking')); }
  function setActiveSpeaker(){
    const line = dialogLines[dlgIndex];
    if (!line) return;
    clearSpeaker();
    if (line.who === 'knight'){ charKnight?.classList.add('speaking'); }
    else { charArcher?.classList.add('speaking'); }
    if (dialogNameEl) dialogNameEl.textContent = line.name;
  }
  function typeWriter(text, speed=22){
    typing = true;
    dialogTextEl.textContent = '';
    dialogTextEl.classList.add('type-cursor');
    let i = 0;
    function step(){
      if (i <= text.length){
        dialogTextEl.textContent = text.slice(0,i);
        i++;
        typeTimer = setTimeout(step, speed);
      } else {
        typing = false;
        dialogTextEl.classList.remove('type-cursor');
      }
    }
    step();
  }
  function showCurrentDialog(){
    const line = dialogLines[dlgIndex];
    if (!line) return;
    setActiveSpeaker();
    clearTimeout(typeTimer);
    typeWriter(line.text);
  }
  function advanceDialog(){
    const line = dialogLines[dlgIndex];
    if (typing){
      clearTimeout(typeTimer);
      dialogTextEl.textContent = line.text;
      typing = false;
      dialogTextEl.classList.remove('type-cursor');
      return;
    }
    dlgIndex++;
    clearSpeaker();
    if (dlgIndex >= dialogLines.length){
      dialog.style.display = "none";
      // En vez de saltar al combate normal, arrancamos el tutorial guiado
      startTutorialScenario();
      applyOrientationLock();
      return;
    }
    showCurrentDialog();
  }

  // ---------- Unidades del jugador ----------
  const makeKnight = () => ({
    id: "K", tipo: "guerrero",
    fila: Math.floor(ROWS*0.6), col: Math.floor(COLS*0.25),
    vivo: true, nombre: "Risko",
    hp: 100, maxHp: 100,
    retrato: "assets/player.PNG", nivel: 1, kills: 0,
    damage: 50, range: [1], acted: false, mp: PLAYER_MAX_MP
  });
  const makeArcher = () => ({
    id: "A", tipo: "arquero",
    fila: Math.floor(ROWS*0.65), col: Math.floor(COLS*0.25),
    vivo: true, nombre: "Hans",
    hp: 80, maxHp: 80,
    retrato: "assets/archer.PNG", nivel: 1, kills: 0,
    damage: 50, range: [2], acted: false, mp: PLAYER_MAX_MP
  });

  // ---------- PRÓLOGO ----------
  const introSlides = [
    { img: "assets/Inicio1.PNG", text: "El reino de Orbis era próspero y pacífico y sus gentes vivían felices." },
    { img: "assets/Inicio2.PNG", text: "Pero todo cambió cuando el Rey Dariem sufrió un ataque sorpresa que le pilló totalmente desprevenido y sumió al reino en el caos." },
    { img: "assets/Inicio3.PNG", text: "Un hombre del que poco se sabía, autoproclamado cómo el Rey Fortris, se sentó en el trono y prometió gobernar con mano de hierro. Nadie pudo impedirlo." },
    { img: "assets/Inicio4.PNG", text: "Una de las pocas supervivientes al ataque fue Risko, Capitana de la Guardia de Dariem, que pudo huir a duras penas con un pensamiento claro en su cabeza: Cobrar venganza." }
  ];
  let introIndex = 0;

  // ---------- Init ----------
  function init(){
    ajustarTamanoTablero();

    if (btnContinuar){
      btnContinuar.onclick=()=>{ overlayWin.style.display="none"; location.reload(); };
    }

    // Portada → Intro → Diálogo → Tutorial guiado
    if (btnJugar){
      btnJugar.onclick = ()=>{
        if (portada) portada.style.display = "none";
        if (introScene){
          introIndex = 0;
          introScene.style.display = "block";
          showIntroSlide();
        } else if (dialog){
          dlgIndex = 0;
          dialog.style.display = "block";
          showCurrentDialog();
        } else {
          startTutorialScenario();
        }
        applyOrientationLock();
      };
    } else {
      // fallback si no hubiera portada
      startTutorialScenario();
    }

    if (btnIntroNext) btnIntroNext.onclick = advanceIntro;
    if (btnDialogNext) btnDialogNext.onclick = advanceDialog;

    setupOrientationLock();
  }
  init();
})();