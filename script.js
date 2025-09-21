/* build: dialogue-2chars */
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
  let fase = 1;
  let enemies = [];
  let players = [];
  let seleccionado = null;
  let celdasMovibles = new Set();
  let distSel = null;

  // ---------- Función para cargar imágenes .PNG o .png ----------
  function loadAsset(pathBase){
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(pathBase);
      img.onerror = () => {
        if (pathBase.endsWith(".PNG")){
          const fallback = pathBase.replace(/\.PNG$/, ".png");
          const img2 = new Image();
          img2.onload = () => resolve(fallback);
          img2.onerror = reject;
          img2.src = fallback;
        } else {
          reject();
        }
      };
      img.src = pathBase;
    });
  }

  // ---------- Diálogos intro ----------
  const dialogLines = [
    { who:'knight', name:'Risko', text:'Os doy la bienvenida a Tactic Heroes. Nuestro objetivo es derrotar al ejército rival.' },
    { who:'archer', name:'Hans',  text:'Selecciona un personaje para ver su rango de movimiento y después elegir dónde colocarlo.' },
    { who:'knight', name:'Risko', text:'Risko ataca si está adyacente al enemigo y Hans a una casilla de distancia.' },
    { who:'archer', name:'Hans',  text:'Todo listo. ¡Entremos en combate!' }
  ];
  let dlgIndex = 0, typing=false, typeTimer=null, speakPopTimer=null;

  // Unidades del jugador
  const makeKnight = async () => {
    const src = await loadAsset("assets/player.PNG");
    return {
      id: "K", tipo: "guerrero",
      fila: Math.floor(ROWS*0.6), col: Math.floor(COLS*0.25),
      vivo: true, nombre: "Risko",
      hp: 100, maxHp: 100,
      retrato: src, nivel: 1, kills: 0,
      damage: 50, range: [1], acted: false, mp: PLAYER_MAX_MP
    };
  };
  const makeArcher = async () => {
    const src = await loadAsset("assets/archer.PNG");
    return {
      id: "A", tipo: "arquero",
      fila: Math.floor(ROWS*0.65), col: Math.floor(COLS*0.25),
      vivo: true, nombre: "Hans",
      hp: 80, maxHp: 80,
      retrato: src, nivel: 1, kills: 0,
      damage: 50, range: [2], acted: false, mp: PLAYER_MAX_MP
    };
  };

  // DOM
  const mapa = document.getElementById("mapa");
  const acciones = document.getElementById("acciones");
  const ficha = document.getElementById("ficha");
  const overlayWin = document.getElementById("overlayWin");
  const btnContinuar = document.getElementById("btnContinuar");
  const turnBanner = document.getElementById("turnBanner");

  const portada = document.getElementById("portada");
  const btnJugar = document.getElementById("btnJugar");
  const dialog = document.getElementById("dialogScene");
  const dialogNameEl = document.getElementById("dialogName");
  const dialogTextEl = document.getElementById("dialogText");
  const btnDialogNext = document.getElementById("btnDialogNext");
  const charKnight = document.getElementById("charKnight");
  const charArcher = document.getElementById("charArcher");

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

  // ---------- Layout ----------
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

  // ---------- Bloqueo vertical ----------
  function isLandscape(){ return window.innerWidth > window.innerHeight; }
  function applyOrientationLock(){
    const blocker = document.getElementById("orientationBlocker");
    const enHorizontal = isLandscape();
    const portadaVisible = portada && getComputedStyle(portada).display !== "none";
    const shouldBlock = enHorizontal && !portadaVisible;
    blocker.style.display = shouldBlock ? "grid" : "none";
    if (portada){ portada.style.pointerEvents = "auto"; portada.style.filter = "none"; }
    const dim = (el)=>{ if(!el) return; el.style.pointerEvents = shouldBlock ? "none" : "auto"; el.style.filter = shouldBlock ? "grayscale(1) blur(1.5px) brightness(.7)" : "none"; };
    dim(dialog); dim(mapa);
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

  // ---------- Oleadas ----------
  async function spawnFase(){
    enemies = [];
    const count = (fase === 1) ? 3 : (fase === 2) ? 4 : 0;
    if (count === 0) return;
    const ocupadas = new Set(players.filter(p=>p.vivo).map(p=>key(p.fila,p.col)));
    const enemySrc = await loadAsset("assets/enemy.PNG");
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
        retrato:enemySrc,
        damage:ENEMY_BASE_DAMAGE,
        mp: ENEMY_MAX_MP
      });
    }
    if (turno==="jugador") players.forEach(p=>{ p.acted=false; p.mp=PLAYER_MAX_MP; });
  }

  // ---------- Render ----------
  async function dibujarMapa(){
    mapa.querySelectorAll(".celda").forEach(n=>n.remove());
    const knightSrc = await loadAsset("assets/player.PNG");
    const archerSrc = await loadAsset("assets/archer.PNG");
    const enemySrc = await loadAsset("assets/enemy.PNG");

    for (let f=0; f<ROWS; f++){
      for (let c=0; c<COLS; c++){
        const celda = document.createElement("div");
        celda.className = "celda";
        celda.dataset.key = key(f,c);
        if (noJugable(f)) celda.style.pointerEvents = "none";
        if (seleccionado && celdasMovibles.has(key(f,c))) celda.classList.add("movible");
        if (seleccionado && seleccionado.fila===f && seleccionado.col===c) celda.classList.add("seleccionada");

        for (const p of players){
          if (p.vivo && p.fila===f && p.col===c){
            const img = document.createElement("img");
            img.src = (p.tipo==="guerrero") ? knightSrc : archerSrc;
            img.alt = p.nombre;
            img.className = "fichaMiniImg";
            celda.appendChild(img);
          }
        }
        for (const e of enemies){
          if (e.vivo && e.fila===f && e.col===c){
            const img = document.createElement("img");
            img.src = enemySrc;
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

  // ... resto del script igual que antes (sin cambios en la lógica) ...

  // ---------- Init ----------
  async function init(){
    players=[await makeKnight(), await makeArcher()];
    ajustarTamanoTablero(); await spawnFase(); await dibujarMapa();
    if (btnContinuar) btnContinuar.onclick=()=>{ overlayWin.style.display="none"; location.reload(); };

    if (btnJugar){
      btnJugar.onclick = ()=>{
        if (portada) portada.style.display = "none";
        if (dialog){
          dlgIndex = 0;
          dialog.style.display = "block";
          showCurrentDialog();
        } else {
          mapa.style.display = "grid";
          setTurno("jugador");
        }
        applyOrientationLock();
      };
    } else {
      mapa.style.display = "grid";
      setTurno("jugador");
    }

    if (btnDialogNext) btnDialogNext.onclick = advanceDialog;

    setupOrientationLock();
  }
  init();
})();