/* ============================
   TACTIC HEROES — lógica
   ============================ */
(function(){
  const ROWS=16,COLS=9,NON_PLAYABLE_BOTTOM_ROWS=4;
  const PLAYER_MAX_MP=5,ENEMY_MAX_MP=3,ENEMY_BASE_DAMAGE=50;

  let turno="jugador",fase=1;
  let players=[],enemies=[];
  let seleccionado=null,celdasMovibles=new Set();

  // DOM
  const mapa=document.getElementById("mapa");
  const acciones=document.getElementById("acciones");
  const ficha=document.getElementById("ficha");
  const overlayWin=document.getElementById("overlayWin");
  const winTitle=document.getElementById("winTitle");
  const btnContinuar=document.getElementById("btnContinuar");
  const turnBanner=document.getElementById("turnBanner");

  const portada=document.getElementById("portada");
  const btnJugar=document.getElementById("btnJugar");
  const dialog=document.getElementById("dialogScene");
  const dialogNameEl=document.getElementById("dialogName");
  const dialogTextEl=document.getElementById("dialogText");
  const btnDialogNext=document.getElementById("btnDialogNext");
  const charKnight=document.getElementById("charKnight");
  const charArcher=document.getElementById("charArcher");
  const charVillagers=document.getElementById("charVillagers");

  // Diálogos
  const dialogLinesIntro=[
    {who:'knight',name:'Risko',text:'Ese malnacido de Fortris se ha hecho con el poder. Eres el único guerrero que me queda, Hans.'},
    {who:'archer',name:'Hans',text:'¡Siempre estaré a tu lado, capitana!...'},
    {who:'knight',name:'Risko',text:'Tenemos que idear un plan... Prepárate porque aquí vienen…'},
    {who:'archer',name:'Hans',text:'Hace mucho que no teníamos un combate real... ¡Vamos!'}
  ];
  const dialogLinesVillagers=[
    {who:'villagers',name:'Aldeanos',text:'Esos soldados están arrasando nuestro pueblo. ¡Tenéis que ayudarnos!'},
    {who:'archer',name:'Hans',text:'Sé que nos estamos arriesgando mucho pero tenemos que ayudarlos, Risko.'},
    {who:'knight',name:'Risko',text:'¡Contad con nosotros!\nDebemos llevar a los aldeanos al punto marcado sin que los soldados los alcancen.\n¡Vamos!'}
  ];
  let dlgIndex=0,dialogPhase="intro",dialogLines=dialogLinesIntro;

  function clearSpeaker(){[charKnight,charArcher,charVillagers].forEach(e=>e?.classList.remove("speaking"))}
  function setActiveSpeaker(){
    const line=dialogLines[dlgIndex];clearSpeaker();
    if(line.who==="knight")charKnight.classList.add("speaking");
    if(line.who==="archer")charArcher.classList.add("speaking");
    if(line.who==="villagers")charVillagers.style.display="block",charVillagers.classList.add("speaking");
    dialogNameEl.textContent=line.name;
  }
  function showCurrentDialog(){const line=dialogLines[dlgIndex];setActiveSpeaker();dialogTextEl.textContent=line.text}
  function advanceDialog(){
    dlgIndex++;if(dlgIndex>=dialogLines.length){
      dialog.style.display="none";
      if(dialogPhase==="intro"){startCombat();}
      else if(dialogPhase==="villagers"){startRescueLevel();}
      return;
    }showCurrentDialog();
  }

  // Unidades
  function makeKnight(){return{id:"K",tipo:"guerrero",fila:14,col:2,vivo:true,nombre:"Risko",hp:100,maxHp:100,retrato:"assets/player.PNG",damage:50,range:[1],acted:false,mp:PLAYER_MAX_MP}}
  function makeArcher(){return{id:"A",tipo:"arquero",fila:14,col:4,vivo:true,nombre:"Hans",hp:80,maxHp:80,retrato:"assets/archer.PNG",damage:50,range:[2],acted:false,mp:PLAYER_MAX_MP}}

  function spawnEnemies(n=3){
    enemies=[];for(let i=0;i<n;i++){enemies.push({id:"E"+i,nombre:"Soldado "+(i+1),fila:i,col:6,vivo:true,hp:50,maxHp:50,retrato:"assets/enemy.PNG",damage:ENEMY_BASE_DAMAGE,mp:ENEMY_MAX_MP})}
  }

  // Combate inicial
  function startCombat(){
    mapa.style.display="grid";players=[makeKnight(),makeArcher()];spawnEnemies(2);dibujarMapa();setTurno("jugador")
  }

  // Rescate
  function startRescueLevel(){
    players=[makeKnight(),makeArcher(),{id:"V",tipo:"aldeanos",fila:15,col:3,vivo:true,nombre:"Aldeanos",hp:60,maxHp:60,retrato:"assets/Aldeanos.PNG",damage:0,range:[],acted:false,mp:3}];
    spawnEnemies(3);
    mapa.style.display="grid";dibujarMapa();setTurno("jugador")
  }

  // Render
  function dibujarMapa(){
    mapa.innerHTML="";
    for(let f=0;f<ROWS;f++){for(let c=0;c<COLS;c++){
      const cel=document.createElement("div");cel.className="celda";cel.dataset.key=f+","+c;
      for(const p of players){if(p.vivo&&p.fila===f&&p.col===c){let img=document.createElement("img");img.src=p.retrato;img.className="fichaMiniImg";cel.appendChild(img)}}
      for(const e of enemies){if(e.vivo&&e.fila===f&&e.col===c){let img=document.createElement("img");img.src=e.retrato;img.className="fichaMiniImg";cel.appendChild(img)}}
      mapa.appendChild(cel);
    }}
  }

  // Turnos
  function setTurno(t){turno=t;turnBanner.textContent=(t==="jugador"?"TU TURNO":"TURNO ENEMIGO");turnBanner.style.display="block";setTimeout(()=>turnBanner.style.display="none",1200)}

  // Init
  btnJugar.onclick=()=>{portada.style.display="none";dialog.style.display="block";dlgIndex=0;dialogPhase="intro";dialogLines=dialogLinesIntro;showCurrentDialog();}
  btnDialogNext.onclick=advanceDialog;
})();