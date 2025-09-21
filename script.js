/* ============================================
   LUDUM FORTE — INTRO + TUTORIAL + RESCATE + GAME OVER + NIVELES
   v=levels-1
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
  let fase = 1;                 // 1 -> 2 -> postWin dialog -> rescate
  let enemies = [];
  let players = [];
  let seleccionado = null;
  let celdasMovibles = new Set();
  let distSel = null;

  // Tutorial
  let tutorialActive = false;
  let tutorialStep = 0;
  let tutTarget = null;
  let soldier1 = null, soldier2 = null;

  // Rescate
  let rescueMode = false;
  let rescueGoal = { fila: 1, col: 8 };
  let villagersUnit = null;
  let postWinDialogShown = false;

  // ---------- PRÓLOGO ----------
  const introSlides = [
    { img: "assets/Inicio1.PNG", text: "El reino de Orbis era próspero y pacífico y sus gentes vivían felices." },
    { img: "assets/Inicio2.PNG", text: "Pero todo cambió cuando el Rey Dariem sufrió un ataque sorpresa que le pilló totalmente desprevenido y sumió al reino en el caos." },
    { img: "assets/Inicio3.PNG", text: "Un hombre del que poco se sabía, autoproclamado cómo el Rey Fortris, se sentó en el trono y prometió gobernar con mano de hierro. Nadie pudo impedirlo." },
    { img: "assets/Inicio4.PNG", text: "Una de las pocas supervivientes al ataque fue Risko, Capitana de la Guardia de Dariem, que pudo huir a duras penas con un pensamiento claro en su cabeza: Cobrar venganza." }
  ];
  let introIndex = 0;

  // DOM
  const mapa = document.getElementById("mapa");
  const acciones = document.getElementById("acciones");
  const ficha = document.getElementById("ficha");
  const overlayWin = document.getElementById("overlayWin");
  const winTitle = document.getElementById("winTitle");
  const btnContinuar = document.getElementById("btnContinuar");
  const overlayGameOver = document.getElementById("overlayGameOver");
  const goTitle = document.getElementById("goTitle");
  const goReason = document.getElementById("goReason");
  const btnGameOverHome = document.getElementById("btnGameOverHome");
  const turnBanner = document.getElementById("turnBanner");

  const portada = document.getElementById("portada");
  const btnJugar = document.getElementById("btnJugar");

  // Intro cross-fade
  const introScene = document.getElementById("introScene");
  const introBgA = document.getElementById("introBgA");
  const introBgB = document.getElementById("introBgB");
  const introNameEl = document.getElementById("introName");
  const introTextEl = document.getElementById("introText");
  const btnIntroNext = document.getElementById("btnIntroNext");
  let introCurrentLayer = 'A';
  function introSetBackground(url, instant=false){
    const curr = (introCurrentLayer === 'A') ? introBgA : introBgB;
    const next = (introCurrentLayer === 'A') ? introBgB : introBgA;
    next.style.backgroundImage = `url('${url}')`;
    if (instant){ next.classList.add('show'); curr.classList.remove('show'); }
    else { curr.classList.remove('show'); void next.offsetWidth; next.classList.add('show'); }
    introCurrentLayer = (introCurrentLayer === 'A') ? 'B' : 'A';
  }
  const introPreloaded = new Set();
  function preloadIntroImages(){
    introSlides.forEach(s=>{
      if (introPreloaded.has(s.img)) return;
      const im = new Image(); im.src = s.img;
      introPreloaded.add(s.img);
    });
  }

  // Diálogo
  const dialog = document.getElementById("dialogScene");
  const dialogNameEl = document.getElementById("dialogName");
  const dialogTextEl = document.getElementById("dialogText");
  const btnDialogNext = document.getElementById("btnDialogNext");
  const charKnight = document.getElementById("charKnight");       // Risko (derecha)
  const charArcher = document.getElementById("charArcher");       // Hans (izquierda)
  const charVillagers = document.getElementById("charVillagers"); // Aldeanos (centro)
  const tutorialBar = document.getElementById("tutorialBar");

  // ---------- Banner ----------
  function showTurnBanner(text){
    turnBanner.textContent = text;
    turnBanner.style.display = "block";
    setTimeout(()=>{ turnBanner.style.display = "none"; }, 1300);
  }
  function setTurno(t){
    turno = t;
    showTurnBanner(t==="jugador" ? "TU TURNO" : t==="enemigo" ? "TURNO ENEMIGO" : "FIN DE LA PARTIDA");
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
    dim(introScene); dim(dialog); dim(mapa); dim(tutorialBar);
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

  // ---------- NIVELES ----------
  function awardKillAndMaybeLevelUp(u){
    if (!u) return;
    if (typeof u.killCounter !== 'number') u.killCounter = 0;
    if (typeof u.nextKillTarget !== 'number') u.nextKillTarget = 2;
    if (typeof u.nivel !== 'number') u.nivel = 1;

    u.killCounter += 1;
    if (u.killCounter >= u.nextKillTarget){
      u.killCounter = 0;
      u.nivel += 1;
      if (u.nivel % 2 === 0){
        u.maxHp += 10;
        u.hp = Math.min(u.maxHp, u.hp + 10);
      } else {
        u.damage += 5;
      }
      u.nextKillTarget += 1;
    }
  }

  // ---------- Spawns estándar ----------
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

  // ---------- Tutorial guiado ----------
  function startTutorialScenario(){
    tutorialActive = true;
    tutorialStep = 0;

    players = [
      { ...makeKnight(), fila: 10, col: 2, mp: PLAYER_MAX_MP, acted: false },
      { ...makeArcher(), fila: 10, col: 4, mp: PLAYER_MAX_MP, acted: false },
    ];
    soldier1 = { id: `TUT-S1-${Date.now()}`, nombre: "Soldado 1", fila: 8, col: 2, vivo: true, hp: 50, maxHp: 50, retrato: "assets/enemy.PNG", damage: ENEMY_BASE_DAMAGE, mp: ENEMY_MAX_MP };
    soldier2 = { id: `TUT-S2-${Date.now()}`, nombre: "Soldado 2", fila: 7, col: 4, vivo: true, hp: 50, maxHp: 50, retrato: "assets/enemy.PNG", damage: ENEMY_BASE_DAMAGE, mp: ENEMY_MAX_MP };
    enemies = [ soldier1, soldier2 ];

    tutTarget = { fila: 9, col: 2 };
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

  // ---------- RESCATE ----------
  function startRescueScenario(){
    rescueMode = true;
    players = [
      { ...makeKnight(), fila: 10, col: 1, mp: PLAYER_MAX_MP, acted: false },
      { ...makeArcher(), fila: 10, col: 3, mp: PLAYER_MAX_MP, acted: false },
    ];
    villagersUnit = {
      id: "V", tipo: "aldeanos",
      fila: 11, col: 2, vivo: true, nombre: "Aldeanos",
      hp: 60, maxHp: 60,
      retrato: "assets/Aldeanos.PNG", nivel: 1, killCounter: 0, nextKillTarget: 2,
      damage: 0, range: [], acted: false, mp: 3
    };
    players.push(villagersUnit);

    enemies = [
      { id:`RE${Date.now()}-1`, nombre:"Soldado 1", fila: 2, col: 6, vivo:true, hp:50, maxHp:50, retrato:"assets/enemy.PNG", damage:ENEMY_BASE_DAMAGE, mp: ENEMY_MAX_MP },
      { id:`RE${Date.now()}-2`, nombre:"Soldado 2", fila: 3, col: 7, vivo:true, hp:50, maxHp:50, retrato:"assets/enemy.PNG", damage:ENEMY_BASE_DAMAGE, mp: ENEMY_MAX_MP },
      { id:`RE${Date.now()}-3`, nombre:"Soldado 3", fila: 1, col: 4, vivo:true, hp:50, maxHp:50, retrato:"assets/enemy.PNG", damage:ENEMY_BASE_DAMAGE, mp: ENEMY_MAX_MP }
    ];

    rescueGoal = { fila: 1, col: 8 };

    mapa.style.display = "grid";
    dibujarMapa();
    setTurno("jugador");
    setTutorialText("Objetivo: lleva a <b>Aldeanos</b> al punto verde sin que los soldados los alcancen.");
  }

  function checkRescueWinLose(){
    // Win
    if (villagersUnit?.vivo && villagersUnit.fila === rescueGoal.fila && villagersUnit.col === rescueGoal.col){
      setTurno("fin");
      setTutorialText("");
      if (winTitle) winTitle.textContent = "¡Aldeanos a salvo!";
      overlayWin.style.display = "grid";
      if (btnContinuar) btnContinuar.onclick = ()=>{ overlayWin.style.display = "none"; location.reload(); };
      return true;
    }
    // Lose (Aldeanos)
    if (villagersUnit){
      for (const e of enemies){
        if (e.vivo && e.fila === villagersUnit.fila && e.col === villagersUnit.col){
          villagersUnit.vivo = false;
          showGameOver("¡Aldeanos capturados!");
          return true;
        }
      }
      if (!villagersUnit.vivo){
        showGameOver("¡Aldeanos han caído!");
        return true;
      }
    }
    return false;
  }

  // ---------- GAME OVER ----------
  function showGameOver(reason){
    setTurno("fin");
    if (goTitle) goTitle.textContent = "FIN DE LA PARTIDA";
    if (goReason) goReason.textContent = reason || "";
    if (overlayGameOver) overlayGameOver.style.display = "grid";
    if (btnGameOverHome){
      btnGameOverHome.onclick = ()=>{
        if (overlayGameOver) overlayGameOver.style.display = "none";
        location.reload();
      };
    }
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

        if (tutorialActive && tutTarget && tutTarget.fila === f && tutTarget.col === c) celda.classList.add("tut-target");
        if (rescueMode && rescueGoal && rescueGoal.fila === f && rescueGoal.col === c) celda.classList.add("goal");

        if (seleccionado && celdasMovibles.has(key(f,c))) celda.classList.add("movible");
        if (seleccionado && seleccionado.fila===f && seleccionado.col===c) celda.classList.add("seleccionada");

        // Jugadores
        for (const p of players){
          if (p.vivo && p.fila===f && p.col===c){
            const img = document.createElement("img");
            if (p.tipo==="guerrero") img.src = "assets/player.PNG";
            else if (p.tipo==="arquero") img.src = "assets/archer.PNG";
            else if (p.tipo==="aldeanos") { img.src = "assets/Aldeanos.PNG"; img.className = "fichaMiniImg villager"; }
            else img.src = "assets/player.PNG";
            if (!img.className) img.className = "fichaMiniImg";
            img.alt = p.nombre;
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

    if (tutorialActive && tutorialStep === 2){
      clearTutorial();
    }
    setTimeout(turnoIAEnemigos, 140);
  }

  function botonesAccionesPara(unidad){
    acciones.innerHTML="";
    if (turno!=="jugador" || !unidad?.vivo) return;

    const infoMp = document.createElement("div");
    infoMp.textContent = `Nivel ${unidad.nivel || 1} · MP: ${unidad.mp}/${PLAYER_MAX_MP} · Daño: ${unidad.damage}`;
    infoMp.style.marginRight = "6px";
    infoMp.style.alignSelf = "center";
    acciones.appendChild(infoMp);

    if (unidad.tipo !== "aldeanos"){
      enemigosEnRango(unidad).forEach(en=>{
        const b=document.createElement("button");
        b.className="primary";
        b.textContent=`ATACAR ${en.nombre}`;
        b.onclick=()=>atacarUnidadA(unidad,en);
        acciones.appendChild(b);
      });
    }

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
    const lvl = u.nivel || 1;
    const extra = `Nivel <b>${lvl}</b> · Daño <b>${u.damage}</b> · MP <b>${u.mp}</b>/${PLAYER_MAX_MP}`;
    const villagerClass = (u.tipo === "aldeanos") ? " villager" : "";
    ficha.innerHTML = `
      <div class="card${villagerClass}">
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

        if (tutorialActive){
          if (tutorialStep === 0 && seleccionado.nombre === "Risko"){
            if (tutTarget && f === tutTarget.fila && c === tutTarget.col){
              setTutorialText("Tutorial<br>Ahora pulsa <b>ATACAR Soldado 1</b> con Risko.");
              tutTarget = null;
            }
          } else if (tutorialStep === 1 && seleccionado.nombre === "Hans"){
            if (tutTarget && f === tutTarget.fila && c === tutTarget.col){
              setTutorialText("Tutorial<br>Ahora pulsa <b>ATACAR Soldado 2</b> con Hans.");
              tutTarget = null;
            }
          }
        }

        if (seleccionado.mp>0){ calcularCeldasMovibles(seleccionado); }
        else { celdasMovibles.clear(); distSel=null; }
        dibujarMapa(); botonesAccionesPara(seleccionado);

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
        awardKillAndMaybeLevelUp(u);

        if (tutorialActive){
          if (tutorialStep === 0 && objetivoRef.id === soldier1.id){
            tutorialStep = 1;
            tutTarget = { fila: 9, col: 4 };
            setTutorialText("Tutorial<br>Ahora mueve a <b>Hans</b> a la casilla resaltada y ataca al soldado a distancia.");
          } else if (tutorialStep === 1 && objetivoRef.id === soldier2.id){
            tutorialStep = 2; tutTarget = null;
            setTutorialText("Tutorial<br>Pulsa el botón <b>Pasar turno</b> y comenzará el combate.");
          }
        }

        if (!tutorialActive && !rescueMode && enemies.every(e=>!e.vivo)) {
          if (fase === 1){ fase = 2; spawnFase(); dibujarMapa(); }
          else if (fase === 2 && !postWinDialogShown){
            postWinDialogShown = true;
            startPostWinDialog();
            return;
          }
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
    if (players.every(p => !p.vivo || p.acted)) {
      setTurno("enemigo");
      setTimeout(turnoIAEnemigos, 140);
    }
  }

  // ---------- IA Enemiga ----------
  function turnoIAEnemigos(){
    if (turno !== "enemigo") return;
    const vivosJ = players.filter(p=>p.vivo);
    if (vivosJ.length === 0) { showGameOver("Todos tus personajes han caído."); return; }

    for (const en of enemies) {
      if (!en.vivo) continue;
      en.mp = ENEMY_MAX_MP;

      // objetivo más cercano (incluye aldeanos)
      let objetivo = vivosJ[0];
      let mejor = manhattan(en, objetivo);
      for (const p of vivosJ){ const d = manhattan(en, p); if (d < mejor){ mejor = d; objetivo = p; } }

      // moverse hasta 3
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

      // Aldeanos capturados causan Game Over
      if (rescueMode && villagersUnit?.vivo && en.fila === villagersUnit.fila && en.col === villagersUnit.col){
        checkRescueWinLose();
        return;
      }

      if (manhattan(en, objetivo) === 1 && isAlivePlayerByRef(objetivo)) {
        aplicarDanyo(objetivo, ENEMY_BASE_DAMAGE, 'enemy');
        renderFicha(objetivo);
      }
    }

    players.forEach(p=>{ if(p.hp<=0) p.vivo=false; p.acted=false; p.mp = PLAYER_MAX_MP; });
    dibujarMapa();

    if (rescueMode){
      if (checkRescueWinLose()) return;
    }

    if (players.every(p=>!p.vivo)) { showGameOver("Todos tus personajes han caído."); }
    else {
      setTurno("jugador");
      if (!tutorialActive && !rescueMode && enemies.every(e=>!e.vivo)) {
        if (fase === 1){ fase = 2; spawnFase(); dibujarMapa(); }
        else if (fase === 2 && !postWinDialogShown){
          postWinDialogShown = true;
          startPostWinDialog();
        }
      }
    }
  }

  // ---------- Typewriter (Intro) ----------
  function typeWriterIntro(text, speed=22){
    introTextEl.textContent = '';
    introTextEl.classList.add('type-cursor');
    let i = 0;
    function step(){
      if (i <= text.length){
        introTextEl.textContent = text.slice(0,i);
        i++;
        setTimeout(step, speed);
      } else {
        introTextEl.classList.remove('type-cursor');
      }
    }
    step();
  }
  function showIntroSlide(instant=false){
    const slide = introSlides[introIndex];
    if (!slide) return;
    introNameEl.textContent = "Prólogo";
    introSetBackground(slide.img, instant);
    typeWriterIntro(slide.text);
  }
  function advanceIntro(){
    introIndex++;
    if (introIndex >= introSlides.length){
      introScene.style.display = "none";
      if (dialog){
        dlgIndex = 0; postDialogMode = "intro";
        dialog.style.display = "block";
        showCurrentDialog();
      }
      applyOrientationLock();
      return;
    }
    showIntroSlide(false);
  }

  // ---------- Diálogos ----------
  let postDialogMode = "intro";
  const dialogLinesIntro = [
    { who:'knight', name:'Risko', text:'Ese malnacido de Fortris se ha hecho con el poder. Eres el único guerrero que me queda, Hans.' },
    { who:'archer', name:'Hans',  text:'¡Siempre estaré a tu lado, capitana! Pero debemos buscar donde refugiarnos, llevamos varios días huyendo y aún nos pisan los talones esos soldados…' },
    { who:'knight', name:'Risko', text:'Tenemos que idear un plan para detener a Fortris pero para ello, primero tenemos que sobrevivir. Prepárate porque aquí vienen…' },
    { who:'archer', name:'Hans',  text:'Hace mucho que no teníamos un combate real, más allá de los entrenamientos. Aprovechemos para recordar lo más básico. ¡Vamos!' }
  ];
  const dialogLinesPostWin = [
    { who:'villagers', name:'Aldeanos', text:'Esos soldados están arrasando nuestro pueblo. ¡Tenéis que ayudarnos!' },
    { who:'archer',    name:'Hans',     text:'Sé que nos estamos arriesgando mucho pero tenemos que ayudarlos, Risko. No podemos abandonarlos a su suerte.' },
    { who:'knight',    name:'Risko',    text:'¡Contad con nosotros!\nDebemos llevar a los aldeanos al punto marcado sin que los soldados los alcancen\n¡Vamos!' }
  ];
  let dlgIndex = 0, typing=false, typeTimer=null;

  function currentDialogArray(){ return (postDialogMode==="postWin") ? dialogLinesPostWin : dialogLinesIntro; }

  function clearSpeaker(){ [charKnight, charArcher, charVillagers].forEach(el => el && el.classList.remove('speaking')); }

  function setActiveSpeaker(){
    const lines = currentDialogArray();
    const line = lines[dlgIndex];
    if (!line) return;

    if (postDialogMode === "postWin") {
      if (line.who === 'villagers') {
        charVillagers.style.display = "block";
        charKnight.style.display = "none";
        charArcher.style.display = "none";
      } else {
        charVillagers.style.display = "none";
        charKnight.style.display = "block";
        charArcher.style.display = "block";
      }
    } else {
      charVillagers.style.display = "none";
      charKnight.style.display = "block";
      charArcher.style.display = "block";
    }

    clearSpeaker();
    if (line.who === 'knight'){ charKnight?.classList.add('speaking'); }
    else if (line.who === 'archer'){ charArcher?.classList.add('speaking'); }
    else if (line.who === 'villagers'){ charVillagers?.classList.add('speaking'); }

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
    const lines = currentDialogArray();
    const line = lines[dlgIndex];
    if (!line) return;
    setActiveSpeaker();
    clearTimeout(typeTimer);
    typeWriter(line.text);
  }

  function advanceDialog(){
    const lines = currentDialogArray();
    const line = lines[dlgIndex];
    if (typing){
      clearTimeout(typeTimer);
      dialogTextEl.textContent = line.text;
      typing = false;
      dialogTextEl.classList.remove('type-cursor');
      return;
    }
    dlgIndex++;
    clearSpeaker();
    if (dlgIndex >= lines.length){
      dialog.style.display = "none";
      if (postDialogMode === "intro"){
        startTutorialScenario();
      } else if (postDialogMode === "postWin"){
        startRescueScenario();
      }
      applyOrientationLock();
      return;
    }
    showCurrentDialog();
  }

  function startPostWinDialog(){
    mapa.style.display = "none";
    postDialogMode = "postWin";
    dlgIndex = 0;
    dialog.style.display = "block";
    showCurrentDialog();
  }

  // ---------- Unidades del jugador ----------
  const makeKnight = () => ({
    id: "K", tipo: "guerrero",
    fila: Math.floor(ROWS*0.6), col: Math.floor(COLS*0.25),
    vivo: true, nombre: "Risko",
    hp: 100, maxHp: 100,
    retrato: "assets/player.PNG",
    nivel: 1, killCounter: 0, nextKillTarget: 2,
    damage: 50, range: [1], acted: false, mp: PLAYER_MAX_MP
  });
  const makeArcher = () => ({
    id: "A", tipo: "arquero",
    fila: Math.floor(ROWS*0.65), col: Math.floor(COLS*0.25),
    vivo: true, nombre: "Hans",
    hp: 80, maxHp: 80,
    retrato: "assets/archer.PNG",
    nivel: 1, killCounter: 0, nextKillTarget: 2,
    damage: 50, range: [2], acted: false, mp: PLAYER_MAX_MP
  });

  // ---------- Init ----------
  function init(){
    ajustarTamanoTablero();

    if (btnContinuar){
      btnContinuar.onclick=()=>{ overlayWin.style.display="none"; location.reload(); };
    }
    if (btnGameOverHome){
      btnGameOverHome.onclick = ()=>{ if (overlayGameOver) overlayGameOver.style.display = "none"; location.reload(); };
    }

    // Portada → Intro → Diálogo intro → Tutorial guiado
    if (btnJugar){
      btnJugar.onclick = ()=>{
        if (portada) portada.style.display = "none";
        if (introScene){
          introIndex = 0;
          introScene.style.display = "block";
          preloadIntroImages();
          showIntroSlide(true);
        } else if (dialog){
          dlgIndex = 0; postDialogMode = "intro";
          dialog.style.display = "block";
          showCurrentDialog();
        } else {
          startTutorialScenario();
        }
        applyOrientationLock();
      };
    } else {
      startTutorialScenario();
    }

    if (btnIntroNext) btnIntroNext.onclick = advanceIntro;
    if (btnDialogNext) btnDialogNext.onclick = advanceDialog;

    setupOrientationLock();
  }
  init();
})();