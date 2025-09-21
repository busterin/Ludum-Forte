/* build: skirmish+rescue + PNG + static-dialog + names + intro + tutorial (pointer fix) */
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
  let fase = 1; // skirmish
  let enemies = [];
  let players = [];
  let seleccionado = null;
  let celdasMovibles = new Set();
  let distSel = null;

  // Modos
  let gameMode = "skirmish";   // "skirmish" (nivel 1) -> "rescue" (nivel 2)
  let nextMode = null;

  // RESCATE
  let aldeano = null;
  let salida = { fila: 0, col: 4 };

  // ---------- PRÓLOGO (intro de 4 slides) ----------
  const introSlides = [
    { img: "assets/Inicio1.PNG", text: "El reino de Orbis era próspero y pacífico y sus gentes vivían felices." },
    { img: "assets/Inicio2.PNG", text: "Pero todo cambió cuando el Rey Dariem sufrió un ataque sorpresa que le pilló totalmente desprevenido y sumió al reino en el caos." },
    { img: "assets/Inicio3.PNG", text: "Un hombre del que poco se sabía, autoproclamado cómo el Rey Fortris, se sentó en el trono y prometió gobernar con mano de hierro. Nadie pudo impedirlo." },
    { img: "assets/Inicio4.PNG", text: "Una de las pocas supervivientes al ataque fue Risko, Capitana de la Guardia de Dariem, que pudo huir a duras penas con un pensamiento claro en su cabeza: Cobrar venganza." }
  ];
  let introIndex = 0;
  let introTyping = false, introTimer = null;

  // ---------- Diálogos intro (Hans & Risko) ----------
  const dialogLines = [
    { who:'knight', name:'Risko', text:'Ese malnacido de Fortris se ha hecho con el poder. Eres el único guerrero que me queda, Hans.' },
    { who:'archer', name:'Hans',  text:'¡Siempre estaré a tu lado, capitana! Pero debemos buscar donde refugiarnos, llevamos varios días huyendo y aún nos pisan los talones esos soldados…' },
    { who:'knight', name:'Risko', text:'Tenemos que idear un plan para detener a Fortris pero para ello, primero tenemos que sobrevivir. Prepárate porque aquí vienen…' },
    { who:'archer', name:'Hans',  text:'Hace mucho que no teníamos un combate real, más allá de los entrenamientos. Aprovechemos para recordar lo más básico. ¡Vamos!' }
  ];
  let dlgIndex = 0, typing=false, typeTimer=null;

  // ---------- Tutorial ----------
  let tutorialActive = false;
  let tutorialIndex = 0;
  let tut_lastSelected = null;
  let tut_lastMovedUnit = null;
  let tut_lastAttackBy = null;
  let tut_endedTurn = false;
  let tut_playerTurnResumed = false;

  const tutorialSteps = [
    { text: "Toca a <b>Risko</b> para seleccionarla.", waitFor: () => tut_lastSelected?.nombre === "Risko" },
    { text: "Mueve a <b>Risko</b> a una casilla resaltada en azul.", waitFor: () => tut_lastMovedUnit?.nombre === "Risko" },
    { text: "Ataca a un <b>Soldado</b> si está en rango. Si no lo está, acércate un poco más y ataca cuando puedas.", waitFor: () => tut_lastAttackBy != null },
    { text: "Ahora selecciona a <b>Hans</b>.", waitFor: () => tut_lastSelected?.nombre === "Hans" },
    { text: "Mueve a <b>Hans</b> y ataca si puedes.", waitFor: () => tut_lastMovedUnit?.nombre === "Hans" || tut_lastAttackBy === "Hans" },
    { text: "Cuando termines, pulsa <b>Pasar turno</b>.", waitFor: () => tut_endedTurn === true },
    { text: "Turno enemigo. Observa cómo se mueven y atacan.", infoOnly: true },
    { text: "¡Listo! Completa el combate como prefieras. Este tutorial ha terminado.", infoOnly: true, finish: true }
  ];

  // DOM
  const mapa = document.getElementById("mapa");
  const acciones = document.getElementById("acciones");
  const ficha = document.getElementById("ficha");
  const overlayWin = document.getElementById("overlayWin");
  const overlayLose = document.getElementById("overlayLose");
  const btnContinuar = document.getElementById("btnContinuar");
  const btnReintentar = document.getElementById("btnReintentar");
  const turnBanner = document.getElementById("turnBanner");

  const portada = document.getElementById("portada");
  const btnJugar = document.getElementById("btnJugar");

  // Intro (prólogo)
  const introScene = document.getElementById("introScene");
  const introBg = document.getElementById("introBg");
  const introNameEl = document.getElementById("introName");
  const introTextEl = document.getElementById("introText");
  const btnIntroNext = document.getElementById("btnIntroNext");

  // Diálogo Hans & Risko
  const dialog = document.getElementById("dialogScene");
  const dialogNameEl = document.getElementById("dialogName");
  const dialogTextEl = document.getElementById("dialogText");
  const btnDialogNext = document.getElementById("btnDialogNext");
  const charKnight = document.getElementById("charKnight");   // Risko (derecha)
  const charArcher = document.getElementById("charArcher");   // Hans (izquierda)

  // Tutorial DOM
  const tutorialOverlay = document.getElementById("tutorialOverlay");
  const tutorialTextEl = document.getElementById("tutorialText");
  const tutorialTitleEl = document.getElementById("tutorialTitle");
  const btnTutorialNext = document.getElementById("btnTutorialNext");

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
    dim(introScene); dim(dialog); dim(mapa); dim(tutorialOverlay);
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

  // ---------- Spawns (nivel 1: skirmish) ----------
  function spawnFase(){
    if (gameMode === "rescue") return;
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

  // ---------- RESCATE ----------
  function randomSalida(){ salida.fila = 0; salida.col = Math.floor(Math.random()*COLS); }
  function spawnRescue(){
    enemies = [];
    const count = 4;
    const ocupadas = new Set(players.filter(p=>p.vivo).map(p=>key(p.fila,p.col)));
    if (aldeano?.vivo) ocupadas.add(key(aldeano.fila,aldeano.col));
    for (let i=0;i<count;i++){
      let f,c;
      do{
        f = Math.floor(Math.random()*(ROWS - NON_PLAYABLE_BOTTOM_ROWS - 3));
        c = Math.floor(Math.random()*COLS);
      } while (ocupadas.has(key(f,c)) || (f===salida.fila && c===salida.col));
      ocupadas.add(key(f,c));
      enemies.push({
        id:`E${Date.now()}-R${i}`,
        nombre:`Soldado ${i+1}`,
        fila:f, col:c, vivo:true,
        hp:50, maxHp:50,
        retrato:"assets/enemy.PNG",
        damage:ENEMY_BASE_DAMAGE,
        mp: ENEMY_MAX_MP
      });
    }
    [...players, aldeano].forEach(p=>{ if(p){ p.acted=false; p.mp = (p.tipo==="aldeano")?3:PLAYER_MAX_MP; } });
  }

  // ---------- Render ----------
  function dibujarMapa(){
    mapa.querySelectorAll(".celda").forEach(n=>n.remove());
    for (let f=0; f<ROWS; f++){
      for (let c=0; c<COLS; c++){
        const celda = document.createElement("div");
        celda.className = "celda";
        celda.dataset.key = key(f,c);

        if (gameMode==="rescue" && f===salida.fila && c===salida.col){
          const s = document.createElement("div");
          s.className = "salida";
          s.title = "Salida";
          celda.appendChild(s);
        }

        if (noJugable(f)) celda.style.pointerEvents = "none";
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
        // Aldeano
        if (gameMode==="rescue" && aldeano?.vivo && aldeano.fila===f && aldeano.col===c){
          const img = document.createElement("img");
          img.src = aldeano.retrato || "assets/archer.PNG";
          img.alt = aldeano.nombre;
          img.className = "fichaMiniImg villager";
          celda.appendChild(img);
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
    tut_endedTurn = true; // tutorial
    players.forEach(p=>{ p.acted=true; p.mp=0; });
    if (gameMode==="rescue" && aldeano){ aldeano.acted = true; aldeano.mp = 0; }
    seleccionado=null; celdasMovibles.clear(); distSel=null;
    acciones.innerHTML="";
    setTurno("enemigo");
    checkTutorialProgress(); // tutorial
    setTimeout(turnoIAEnemigos, 140);
  }

  function botonesAccionesPara(unidad){
    acciones.innerHTML="";
    if (turno!=="jugador" || !unidad?.vivo) return;

    const infoMp = document.createElement("div");
    const maxMp = (unidad.tipo==="aldeano") ? 3 : PLAYER_MAX_MP;
    infoMp.textContent = `MP: ${unidad.mp}/${maxMp}`;
    infoMp.style.marginRight = "6px";
    infoMp.style.alignSelf = "center";
    acciones.appendChild(infoMp);

    if (unidad.range && unidad.range.length){
      enemigosEnRango(unidad).forEach(en=>{
        const b=document.createElement("button");
        b.className="primary";
        b.textContent=`ATACAR ${en.nombre}`;
        b.onclick=()=>atacarUnidadA(unidad,en);
        acciones.appendChild(b);
      });
    }

    const bTurn=document.createElement("button");
    bTurn.textContent = "Pasar turno";
    bTurn.onclick=endTurn;
    acciones.appendChild(bTurn);
  }

  // ---------- Ficha ----------
  function renderFicha(u){
    if(!u){ ficha.style.display="none"; ficha.innerHTML=""; return; }
    const pct = Math.max(0, Math.min(100, Math.round((u.hp/u.maxHp)*100)));
    const grad = (pct>50)?"linear-gradient(90deg,#2ecc71,#27ae60)":(pct>25)?"linear-gradient(90deg,#f1c40f,#e67e22)":"linear-gradient(90deg,#e74c3c,#c0392b)";
    const extra = (u.tipo==="aldeano")
      ? `· No combate · MP <b>${u.mp}</b>/3`
      : `· Daño <b>${u.damage}</b> · KOs <b>${u.kills||0}</b> · MP <b>${u.mp}</b>/${PLAYER_MAX_MP}`;
    ficha.innerHTML = `
      <div class="card">
        <div class="portrait" style="background-image:url('${u.retrato}')"></div>
        <div class="info">
          <p class="name">${u.nombre}${u.tipo==="aldeano"?" (Objetivo)":""}</p>
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
    const maxMp = (u.tipo==="aldeano")?3:PLAYER_MAX_MP;
    while(q.length){
      const [f,c]=q.shift();
      for(const [df,dc] of dirs){
        const nf=f+df,nc=c+dc;
        if(!dentro(nf,nc) || noJugable(nf)) continue;
        const ocupado = enemies.some(e=>e.vivo&&e.fila===nf&&e.col===nc) ||
                        players.some(p=>p.vivo&&p!==u&&p.fila===nf&&p.col===nc) ||
                        (gameMode==="rescue" && aldeano?.vivo && u!==aldeano && aldeano.fila===nf && aldeano.col===nc);
        if(ocupado) continue;
        const nd = distSel[f][c] + 1;
        if(nd<=u.mp && nd<distSel[nf][nc] && nd<=maxMp){ distSel[nf][nc]=nd; q.push([nf,nc]); }
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
    const esAldeano = (gameMode==="rescue" && aldeano?.vivo && aldeano.fila===f && aldeano.col===c);

    if(pj) renderFicha(pj); else if(en) renderFicha(en); else if(esAldeano) renderFicha(aldeano);

    if (turno!=="jugador") return;

    const unidadClick = pj || (esAldeano ? aldeano : null);

    if (unidadClick){
      tut_lastSelected = unidadClick; // tutorial: selección
      if (unidadClick.acted){
        seleccionado=null; celdasMovibles.clear(); distSel=null; dibujarMapa(); acciones.innerHTML="";
        checkTutorialProgress(); // tutorial
        return;
      }
      seleccionado=unidadClick;
      if (seleccionado.mp>0) calcularCeldasMovibles(seleccionado); else { celdasMovibles.clear(); distSel=null; }
      dibujarMapa(); botonesAccionesPara(seleccionado);
      checkTutorialProgress(); // tutorial
      return;
    }

    if (seleccionado){
      if (f===seleccionado.fila && c===seleccionado.col){
        seleccionado=null; celdasMovibles.clear(); distSel=null; dibujarMapa(); acciones.innerHTML="";
        checkTutorialProgress(); // tutorial
        return;
      }
      const esAlcanzable = celdasMovibles.has(`${f},${c}`);
      const ocupado = enemies.some(e=>e.vivo&&e.fila===f&&e.col===c) ||
                      players.some(p=>p.vivo&&p!==seleccionado&&p.fila===f&&p.col===c) ||
                      (gameMode==="rescue" && aldeano?.vivo && seleccionado!==aldeano && aldeano.fila===f && aldeano.col===c);
      if (esAlcanzable && !ocupado){
        const coste = distSel[f][c] || 0;
        seleccionado.fila=f; seleccionado.col=c;
        seleccionado.mp = Math.max(0, seleccionado.mp - coste);
        renderFicha(seleccionado);

        tut_lastMovedUnit = seleccionado; // tutorial: movimiento

        if (gameMode==="rescue" && seleccionado===aldeano && f===salida.fila && c===salida.col){
          setTurno("fin");
          overlayWin.querySelector("h1").textContent = "MISIÓN COMPLETADA";
          overlayWin.style.display = "grid";
          nextMode = "restart";
          acciones.innerHTML="";
          return;
        }

        if (seleccionado.mp>0){ calcularCeldasMovibles(seleccionado); }
        else { celdasMovibles.clear(); distSel=null; seleccionado.acted=true; }
        dibujarMapa(); botonesAccionesPara(seleccionado);
        checkTutorialProgress(); // tutorial
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
    if(obj.hp<=0){
      obj.vivo=false;
      efectoMuerte(obj);
      if (gameMode==="rescue" && obj===aldeano){
        setTurno("fin");
        overlayLose.style.display="grid";
      }
    }
  }

  // ---------- Validación objetivos ----------
  function isAliveEnemyById(id){ return enemies.find(e=>e.id===id && e.vivo); }
  function isAlivePlayerByRef(p){
    if (gameMode==="rescue" && p===aldeano) return aldeano.vivo;
    return players.includes(p) && p.vivo;
  }
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
    tut_lastAttackBy = u.nombre;  // tutorial: ataque
    renderFicha(objetivo);

    setTimeout(()=>{
      if(!objetivo.vivo){ u.kills=(u.kills||0)+1; }

      u.acted = true; u.mp = 0;
      seleccionado = null; celdasMovibles.clear(); distSel=null;
      acciones.innerHTML="";

      if (gameMode==="skirmish" && enemies.every(e=>!e.vivo)) {
        if (fase === 1){
          fase = 2; spawnFase(); dibujarMapa();
        } else if (fase === 2){
          fase = 3; nextMode = "rescue";
          overlayWin.querySelector("h1").textContent = "NIVEL COMPLETADO";
          overlayWin.style.display = "grid";
        }
        checkTutorialProgress();
        return;
      }

      dibujarMapa();
      checkTutorialProgress();
      comprobarCambioATurnoEnemigo();
    }, 650);
  }

  function comprobarCambioATurnoEnemigo(){
    const controlables = (gameMode==="rescue") ? [...players, aldeano] : [...players];
    if (controlables.every(p => !p.vivo || p.acted || p.mp===0)) {
      setTurno("enemigo"); setTimeout(turnoIAEnemigos, 140);
    }
  }

  // ---------- IA Enemiga ----------
  function turnoIAEnemigos(){
    if (turno !== "enemigo") return;

    const vivosJ = players.filter(p=>p.vivo);
    if (gameMode!=="rescue" && vivosJ.length===0) { setTurno("fin"); return; }
    if (gameMode==="rescue" && vivosJ.length===0 && !aldeano?.vivo) { setTurno("fin"); return; }

    for (const en of enemies) {
      if (!en.vivo) continue;
      en.mp = ENEMY_MAX_MP;

      let objetivos = [];
      if (gameMode==="rescue" && aldeano?.vivo) objetivos.push(aldeano);
      objetivos.push(...vivosJ);
      if (!objetivos.length) break;

      let objetivo = objetivos[0];
      let mejor = manhattan(en, objetivo);
      for (const p of objetivos){ const d = manhattan(en, p); if (d < mejor){ mejor = d; objetivo = p; } }

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
                          players.some(p=>p.vivo && p.fila===nf && p.col===nc) ||
                          (gameMode==="rescue" && aldeano?.vivo && aldeano.fila===nf && aldeano.col===nc);
          if(!ocupado){ en.fila=nf; en.col=nc; en.mp--; moved=true; break; }
        }
        if(!moved) break;
      }

      if (manhattan(en, objetivo) === 1 && isAlivePlayerByRef(objetivo)) {
        aplicarDanyo(objetivo, ENEMY_BASE_DAMAGE, 'enemy');
        renderFicha(objetivo);
      }
    }

    const controlables = (gameMode==="rescue") ? [...players, aldeano] : [...players];
    controlables.forEach(p=>{ if(p.hp<=0) p.vivo=false; p.acted=false; p.mp = (p.tipo==="aldeano")?3:PLAYER_MAX_MP; });
    dibujarMapa();

    if (controlables.every(p=>!p.vivo)) { setTurno("fin"); }
    else {
      setTurno("jugador");
      tut_playerTurnResumed = true; // tutorial: vuelve tu turno
      checkTutorialProgress();

      if (gameMode==="skirmish" && enemies.every(e=>!e.vivo)) {
        if (fase === 1){ fase = 2; spawnFase(); dibujarMapa(); }
        else if (fase === 2){
          fase = 3; nextMode = "rescue";
          overlayWin.querySelector("h1").textContent = "NIVEL COMPLETADO";
          overlayWin.style.display="grid";
        }
      }
    }
  }

  // ---------- Typewriter (Intro) ----------
  function typeWriterIntro(text, speed=22){
    introTyping = true;
    introTextEl.textContent = '';
    introTextEl.classList.add('type-cursor');
    let i = 0;
    function step(){
      if (i <= text.length){
        introTextEl.textContent = text.slice(0,i);
        i++;
        introTimer = setTimeout(step, speed);
      } else {
        introTyping = false;
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
    clearTimeout(introTimer);
    typeWriterIntro(slide.text);
  }

  function advanceIntro(){
    if (!introScene) return;
    const slide = introSlides[introIndex];
    if (introTyping){
      clearTimeout(introTimer);
      introTextEl.textContent = slide.text;
      introTyping = false;
      introTextEl.classList.remove('type-cursor');
      return;
    }
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

  // ---------- Diálogo: hablante resaltado (sin animaciones) ----------
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
    if (!dialog) return;
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
      mapa.style.display = "grid";
      setTurno("jugador");
      if (tutorialOverlay) showTutorial(); // inicia tutorial
      applyOrientationLock();
      return;
    }
    showCurrentDialog();
  }

  // ---------- Tutorial: helpers ----------
  function showTutorial(){
    tutorialActive = true;
    tutorialIndex = 0;
    tut_lastSelected = null;
    tut_lastMovedUnit = null;
    tut_lastAttackBy = null;
    tut_endedTurn = false;
    tut_playerTurnResumed = false;

    tutorialOverlay.style.display = "block";
    renderTutorialStep();
  }

  function renderTutorialStep(){
    const step = tutorialSteps[tutorialIndex];
    if (!step) { endTutorial(); return; }
    if (tutorialTitleEl) tutorialTitleEl.textContent = "Tutorial";
    if (tutorialTextEl) tutorialTextEl.innerHTML = step.text;

    const cta = tutorialOverlay.querySelector(".dialog-cta");
    if (cta){ cta.style.display = step.infoOnly ? "flex" : "none"; }
  }

  function nextTutorialStep(){
    tutorialIndex++;
    const step = tutorialSteps[tutorialIndex];
    renderTutorialStep();
    if (step?.finish) endTutorial();
  }

  function endTutorial(){
    tutorialActive = false;
    if (tutorialOverlay) tutorialOverlay.style.display = "none";
  }

  function checkTutorialProgress(){
    if (!tutorialActive) return;
    const step = tutorialSteps[tutorialIndex];
    if (!step) return;

    if (step.waitFor && step.waitFor()){
      nextTutorialStep();
      return;
    }
    if (step.infoOnly && tutorialIndex === 6 && tut_playerTurnResumed){
      nextTutorialStep();
      return;
    }
  }

  if (btnTutorialNext){
    btnTutorialNext.onclick = () => {
      if (!tutorialActive) return;
      nextTutorialStep();
    };
  }

  // --- Arranque RESCATE ---
  function startRescueLevel(){
    gameMode = "rescue";
    players = [ makeKnight(), makeArcher() ];
    aldeano = makeVillager();
    randomSalida();
    spawnRescue();
    seleccionado=null; celdasMovibles.clear(); distSel=null;
    overlayWin.style.display="none";
    overlayLose.style.display="none";
    dibujarMapa();
    setTurno("jugador");
  }

  // ---------- Unidades del jugador (Risko/Hans/Aldeano) ----------
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
  const makeVillager = () => ({
    id: "V", tipo: "aldeano",
    fila: Math.floor(ROWS*0.75), col: Math.floor(COLS*0.18),
    vivo: true, nombre: "Aldeano",
    hp: 60, maxHp: 60,
    retrato: "assets/villager.PNG",
    damage: 0, range: [], acted: false, mp: 3
  });

  // ---------- Init ----------
  function init(){
    ajustarTamanoTablero();

    if (btnContinuar){
      btnContinuar.onclick = ()=>{
        if (nextMode === "rescue"){
          startRescueLevel(); nextMode = null;
        } else if (nextMode === "restart"){
          location.reload();
        } else {
          overlayWin.style.display="none";
          location.reload();
        }
      };
    }
    if (btnReintentar){ btnReintentar.onclick = ()=>{ location.reload(); }; }

    if (btnJugar){
      btnJugar.onclick = ()=>{
        if (portada) portada.style.display = "none";

        // Mostrar PRÓLOGO primero
        if (introScene){
          introIndex = 0;
          introScene.style.display = "block";
          showIntroSlide();
        } else if (dialog){
          // Fallback directo al diálogo
          dlgIndex = 0;
          dialog.style.display = "block";
          showCurrentDialog();
        } else {
          // Fallback directo al juego
          players=[makeKnight(),makeArcher()];
          fase = 1; gameMode="skirmish";
          mapa.style.display = "grid";
          spawnFase(); dibujarMapa();
          setTurno("jugador");
        }
        applyOrientationLock();
      };
    }

    if (btnIntroNext) btnIntroNext.onclick = advanceIntro;
    if (btnDialogNext) btnDialogNext.onclick = advanceDialog;

    setupOrientationLock();

    // Prepara el nivel 1 por debajo para cuando termine el diálogo/tutorial
    players=[makeKnight(),makeArcher()];
    fase=1; gameMode="skirmish";
    spawnFase(); dibujarMapa();

    // <<< FIX extra: comprueba progreso tras cualquier toque en el tablero
    mapa.addEventListener('click', () => { checkTutorialProgress(); }, true);
  }
  init();
})();