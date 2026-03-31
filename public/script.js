(function () {
  'use strict';

  const LINE_URL = (typeof window !== 'undefined' && window.LINE_URL) ? window.LINE_URL : '#';

  // タイルサイズ（px）
  const TILE_SIZE = 32;

  // タイルマップ: 0=grass, 1=wall, 2=tree, 3=road, 4=center（マップはこの5種類のみ）
  const TILE_GROUND = 0;
  const TILE_WALL = 1;
  const TILE_TREE = 2;
  const TILE_ROAD = 3;
  const TILE_CENTER = 4;
  // オブジェクト用（別配列で管理、getTileTypeAtで重ねて返す）
  const TILE_VILLAGER = 10;
  const TILE_SIGN = 11;
  const TILE_GRASS_SPOT = 12;
  const TILE_JUNK_SPOT = 13;
  const TILE_AC_SPOT = 14;
  const TILE_PLAYER_HOUSE = 15;

  const MAP_ROWS = 8;
  const MAP_COLS = 10;

  // 固定2Dマップ（0=草, 1=壁, 2=木, 3=道, 4=中央）
  const map = [
    [1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,1],
    [1,0,2,0,0,0,2,0,0,1],
    [1,0,0,3,3,3,0,0,0,1],
    [1,0,0,3,4,3,0,0,0,1],
    [1,0,0,3,3,3,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1]
  ];

  // オブジェクトは別配列で管理
  const VILLAGERS = [
    { id: 1, row: 1, col: 1, name: '村長', text: 'ここはとろん村だ。困りごとを解決する便利屋、とろん君がいる村だよ。', quest: 0, problemText: '' },
    { id: 2, row: 1, col: 5, name: '村人', text: 'とろん君はリクガメがモデルの便利屋ヒーローだ。草刈りや不用品回収、エアコン掃除なんでも頼めるんだ。', quest: 0, problemText: '' },
    { id: 3, row: 2, col: 2, name: '村人', text: '最近、庭の草がすごくて困っているの…', quest: 1, problemText: '庭の草が伸びすぎて困っているんだ' },
    { id: 4, row: 4, col: 6, name: '村人', text: '家の中に不用品がたまってしまって…', quest: 2, problemText: '不用品が山積みで大変なんだ…' },
    { id: 5, row: 6, col: 4, name: '村人', text: 'エアコンがカビくさくて困ってる…', quest: 3, problemText: 'エアコンがカビだらけで困ってるんだ' }
  ];

  const PLAYER_HOUSE_TILES = [[1,7],[1,8],[2,7],[2,8]];

  const QUEST_TARGETS = {
    1: { row: 2, col: 3 },
    2: { row: 4, col: 7 },
    3: { row: 6, col: 5 }
  };

  const SIGN_AT = { '1,4': 'entrance', '4,4': 'guide' };
  const SIGN_MESSAGES = {
    entrance: 'とろん村へようこそ',
    guide: '↑ 草刈りの依頼\n↓ エアコン掃除\n← 不用品回収\n\n困ったことがあれば 村人に話しかけてみよう！'
  };

  const quizData = {
    grass: [
      { question: '草刈りは年に何回必要？', choices: ['1回', '2〜3回', '毎月'], answer: 1, tip: '年に2〜3回は刈るのが理想。春〜秋は伸びが早いのでこまめに！' },
      { question: '芝生の手入れで特に気をつける時期は？', choices: ['冬だけ', '春と秋', '夏だけ'], answer: 1, tip: '春は芽吹き、秋は冬支度。この時期の手入れが芝生を美しく保つコツです。' },
      { question: '草が伸びやすい季節は？', choices: ['冬', '梅雨〜夏', '秋'], answer: 1, tip: '梅雨は水分と気温で雑草が一気に成長。夏にかけて要注意！' },
      { question: '芝刈り機を使うとき注意することは？', choices: ['石をよける', '雨の日がよい', '夜でもOK'], answer: 0, tip: '石や枝が刃に当たると危険。事前に庭をチェックしてから刈りましょう。' },
      { question: '庭の草対策で効果的なのは？', choices: ['放置', 'こまめに刈る', '水をかけない'], answer: 1, tip: '伸ばしっぱなしは種が飛んで悪化。根付く前に刈るのが鉄則！' },
      { question: '草刈りの適した時間帯は？', choices: ['真昼', '朝か夕方', '夜'], answer: 1, tip: '真昼は熱中症のリスク。朝や夕方の涼しい時間帯がおすすめです。' },
      { question: '伸びた草を放置すると？', choices: ['虫が減る', '害虫が増える', '何も変わらない'], answer: 1, tip: '草むらはダニや蚊の住みかに。こまめに刈って害虫予防を。' },
      { question: '芝生の目土（めつち）とは？', choices: ['肥料', '土を足す手入れ', '除草剤'], answer: 1, tip: '目土は芝の根元に土を足す作業。むらをなくし芝生を丈夫にします。' },
      { question: '雑草の種が飛びやすい時期は？', choices: ['冬', '春〜秋', '一年中'], answer: 1, tip: '春〜秋は種が飛ぶ雑草が多い。花が咲く前に刈るのが効果的！' },
      { question: '草刈り業者に頼むメリットは？', choices: ['自分でやるより高い', '仕上がりがきれい', '不要'], answer: 1, tip: 'プロは機械とコツで美しく仕上げ。時間がない方は依頼がおすすめ。' },
      { question: 'グランドカバーとは？', choices: ['草刈り機', '地面を覆う植物', '肥料'], answer: 1, tip: '雑草を抑える植物を植える方法。アイビーやクリープなどが人気。' },
      { question: '除草剤を使うとき気をつけることは？', choices: ['多めにまく', '周囲への影響', '夜にまく'], answer: 1, tip: '隣の庭や花壇にかからないよう注意。風の強い日は避けましょう。' }
    ],
    junk: [
      { question: '不用品回収で出せないものは？', choices: ['家具', '危険物', '衣類'], answer: 1, tip: '危険物（薬品・ガスボンベなど）は法律で回収できない場合があります。' },
      { question: '粗大ゴミの申し込みは？', choices: ['当日でOK', '事前予約', '申し込み不要'], answer: 1, tip: '自治体の粗大ゴミは事前申込が基本。当日出しても回収されません。' },
      { question: '不用品を頼むとき便利なのは？', choices: ['とりに来てほしい', '持っていく', 'どちらでも'], answer: 0, tip: '出張回収なら家まで来てもらえて楽。重い物もその場で処分できます。' },
      { question: '不用品回収の前にすることは？', choices: ['そのまま出す', '分別・見積もり', '燃やす'], answer: 1, tip: '写真で見積もりすれば料金がわかりやすい。分別すると安くなることも。' },
      { question: '粗大ゴミと一般ゴミの違いは？', choices: ['同じ', 'サイズやルール', '料金だけ'], answer: 1, tip: 'サイズや種類でルールが違います。自治体のルールを確認してから出そう。' },
      { question: 'リサイクルできる不用品は？', choices: ['ほとんどない', '家具・家電など', '危険物のみ'], answer: 1, tip: '家具や家電はリサイクル可能。業者に任せれば適切にリユースされます。' },
      { question: '不用品回収業者を選ぶポイントは？', choices: ['安いだけ', '見積もり・対応', '当日対応のみ'], answer: 1, tip: '見積もり無料・明朗会計・丁寧な対応をチェックして選びましょう。' },
      { question: '遺品整理で大切なのは？', choices: ['早さだけ', '思いやりと手続き', '費用だけ'], answer: 1, tip: '相続手続きや思い出の品の扱い。丁寧な業者に任せると安心です。' },
      { question: '引っ越しの不用品は？', choices: ['全部捨てる', '回収・リユース可', '燃えない'], answer: 1, tip: '引っ越し前にまとめて回収してもらうとスッキリ。リユースも可能。' },
      { question: '家電の処分で必要なのは？', choices: ['そのまま捨てる', 'リサイクル料金など', '業者不要'], answer: 1, tip: 'テレビや冷蔵庫はリサイクル料金がかかります。業者ならまとめて対応。' },
      { question: '不用品の見積もりは？', choices: ['無料のことが多い', '必ず有料', '不要'], answer: 0, tip: '写真やLINEで無料見積もりしてくれる業者が多いです。まず相談を！' },
      { question: '片付けのコツは？', choices: ['一気にやる', '区切りをつけて進める', '業者任せだけ'], answer: 1, tip: '少しずつでも区切りをつけると進む。無理はせずプロに頼むのも手。' },
      { question: 'ゴミ屋敷化を防ぐには？', choices: ['ため込む', 'こまめに処分', '業者に任せきり'], answer: 1, tip: '出すものはすぐ捨てる習慣が大切。溜まり始めたら早めの対処を。' }
    ],
    aircon: [
      { question: 'エアコン掃除の目安は何年ごと？', choices: ['1年', '2年', '5年'], answer: 1, tip: '2年に1回のプロ掃除がおすすめ。カビや効きの悪化を防ぎます。' },
      { question: 'エアコンでカビが生えやすいのは？', choices: ['フィルター', '内部', 'リモコン'], answer: 1, tip: '内部の湿気とホコリでカビが繁殖。フィルターだけでは不十分な場合も。' },
      { question: 'カビ臭いと感じたらどうする？', choices: ['そのまま使う', '掃除を依頼', '水で洗う'], answer: 1, tip: 'カビの胞子を吸うと健康に影響も。早めの専門クリーニングを！' },
      { question: 'エアコン掃除をしないと？', choices: ['何もない', '効きが悪く・カビ', '冷えすぎる'], answer: 1, tip: '汚れで効率が落ち電気代UP。カビ臭やアレルギー原因にも。' },
      { question: 'フィルター掃除の目安は？', choices: ['年1回', '2週間〜1ヶ月', '不要'], answer: 1, tip: 'フィルターは2週間〜1ヶ月ごと。自分で掃除して効率を維持！' },
      { question: 'エアコンの内部洗浄とは？', choices: ['外すだけ', '専門の洗浄', 'フィルターだけ'], answer: 1, tip: '専門業者は内部まで分解洗浄。カビやホコリを根本から除去。' },
      { question: '冷房から暖房に切り替える時期にすることは？', choices: ['何もしない', '稼働・点検がおすすめ', '買い替え'], answer: 1, tip: '切り替え前に短時間稼働させて乾燥。カビ予防になります。' },
      { question: 'エアコンから水が落ちる原因は？', choices: ['正常', '詰まり・汚れ', '冷えすぎ'], answer: 1, tip: 'ドレンホースの詰まりや内部の汚れが原因。掃除で改善することも。' },
      { question: 'プロのエアコン掃除のメリットは？', choices: ['安いだけ', '内部までキレイ', '自分と同じ'], answer: 1, tip: '自分では届かない内部も洗浄。カビ除去・効率UPで快適に。' },
      { question: 'エアコンを長く使うコツは？', choices: ['使わない', '定期的な掃除', '強で使い続ける'], answer: 1, tip: '定期的な掃除で10年以上使うことも。手入れが寿命を延ばします。' },
      { question: 'ハウスダストがたまりやすいのは？', choices: ['床だけ', 'エアコン内部', '窓だけ'], answer: 1, tip: '運転時に室内のホコリを吸い込み内部に蓄積。定期的な掃除を。' },
      { question: 'エアコン掃除の時期でおすすめは？', choices: ['冬のみ', '使用前・使用後', '梅雨だけ'], answer: 1, tip: '冷房・暖房の使用前後がベスト。カビの繁殖を防げます。' },
      { question: '省エネとエアコン掃除の関係は？', choices: ['無関係', '汚れると効率低下', '掃除すると悪化'], answer: 1, tip: '汚れたエアコンは効率が悪く電気代UP。掃除で省エネに！' }
    ]
  };

  const MONSTERS = {
    1: {
      name: '草モンスター',
      hp: 80,
      imageSrc: 'monsters/grass_monster.png',
      quizKey: 'grass'
    },
    2: {
      name: '不用品ゴーレム',
      hp: 100,
      imageSrc: 'monsters/junk_monster.png',
      quizKey: 'junk'
    },
    3: {
      name: 'カビスライム',
      hp: 70,
      imageSrc: 'monsters/mold_monster.png',
      quizKey: 'aircon'
    }
  };

  const EXP_PER_MONSTER = { 1: 10, 2: 15, 3: 20 };
  const EXP_TO_NEXT_LEVEL = [20, 40, 70, 100];
  const levelTitles = [
    '見習い便利屋',
    'お助け便利屋',
    '解決の達人',
    '町のヒーロー',
    'とろん村の救世主'
  ];

  let playerRow = 3;
  let playerCol = 4;
  let playerFacing = 'down';
  let activeQuest = 0;
  let completedQuests = {};
  let playerHp = 100;
  let playerHpMax = 100;
  let playerLevel = 1;
  let playerExp = 0;
  let currentNpcId = 0;
  let currentBattle = null;

  const titleScreen = document.getElementById('title-screen');
  const mapScreen = document.getElementById('map-screen');
  const mapGrid = document.getElementById('map-grid');
  const playerEl = document.getElementById('player');
  const mapHint = document.getElementById('map-hint');
  const dpad = document.getElementById('dpad');
  const actionButtons = document.getElementById('action-buttons');
  const btnTalk = document.getElementById('btn-talk');
  const btnSearch = document.getElementById('btn-search');
  const btnCancelAction = document.getElementById('btn-cancel-action');
  const playerLvNum = document.getElementById('player-lv-num');
  const playerExpNum = document.getElementById('player-exp-num');
  const playerHpNum = document.getElementById('player-hp-num');
  const playerHpMaxNum = document.getElementById('player-hp-max-num');
  const dialogueOverlay = document.getElementById('dialogue-overlay');
  const dialogueName = document.getElementById('dialogue-name');
  const dialogueText = document.getElementById('dialogue-text');
  const dialogueChoices = document.getElementById('dialogue-choices');
  const battleOverlay = document.getElementById('battle-overlay');
  const battleEnemyName = document.getElementById('battle-enemy-name');
  const battleEnemyHp = document.getElementById('battle-enemy-hp');
  const battleEnemyHpMax = document.getElementById('battle-enemy-hp-max');
  const battleEnemySprite = document.getElementById('battle-enemy-sprite');
  const battleEnemyHpInner = document.getElementById('battle-enemy-hp-inner');
  const damagePopup = document.getElementById('damage-popup');
  const battlePlayerLv = document.getElementById('battle-player-lv');
  const battlePlayerExp = document.getElementById('battle-player-exp');
  const battlePlayerHp = document.getElementById('battle-player-hp');
  const battlePlayerHpMax = document.getElementById('battle-player-hp-max');
  const battleMsg = document.getElementById('battle-msg');
  const battleCommands = document.getElementById('battle-commands');
  const battleQuizChoices = document.getElementById('battle-quiz-choices');
  const battleSubCommands = document.getElementById('battle-sub-commands');
  const clearOverlay = document.getElementById('clear-overlay');
  const clearMessage = document.getElementById('clear-message');
  const btnLine = document.getElementById('btn-line');
  const btnClearClose = document.getElementById('btn-clear-close');
  const companyOverlay = document.getElementById('company-overlay');
  const companyBody = document.getElementById('company-body');
  const btnCloseCompany = document.getElementById('btn-close-company');

  function show(el) { el.classList.remove('hidden'); }
  function hide(el) { el.classList.add('hidden'); }

  function startGame() {
    hide(titleScreen);
    show(mapScreen);
    document.documentElement.style.setProperty('--map-cols', MAP_COLS);
    document.documentElement.style.setProperty('--map-rows', MAP_ROWS);
    document.documentElement.style.setProperty('--tile-size', TILE_SIZE + 'px');
    buildMap();
    updatePlayerPos();
    updateActionButtons();
    updatePlayerStatusDisplay();
  }

  function getVillagerAt(r, c) {
    return VILLAGERS.find(function (v) { return v.row === r && v.col === c; });
  }

  function getObjectAt(r, c) {
    if (getVillagerAt(r, c)) return TILE_VILLAGER;
    const key = r + ',' + c;
    if (SIGN_AT[key]) return TILE_SIGN;
    if (QUEST_TARGETS[1] && QUEST_TARGETS[1].row === r && QUEST_TARGETS[1].col === c) return TILE_GRASS_SPOT;
    if (QUEST_TARGETS[2] && QUEST_TARGETS[2].row === r && QUEST_TARGETS[2].col === c) return TILE_JUNK_SPOT;
    if (QUEST_TARGETS[3] && QUEST_TARGETS[3].row === r && QUEST_TARGETS[3].col === c) return TILE_AC_SPOT;
    for (let i = 0; i < PLAYER_HOUSE_TILES.length; i++) {
      const [hr, hc] = PLAYER_HOUSE_TILES[i];
      if (hr === r && hc === c) return TILE_PLAYER_HOUSE;
    }
    return null;
  }

  function getTileTypeAt(r, c) {
    if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) return TILE_GROUND;
    const obj = getObjectAt(r, c);
    if (obj !== null) return obj;
    return map[r][c];
  }

  const TILE_CLASSES = {};
  TILE_CLASSES[TILE_GROUND] = 'tile-ground';
  TILE_CLASSES[TILE_WALL] = 'tile-wall';
  TILE_CLASSES[TILE_TREE] = 'tile-tree';
  TILE_CLASSES[TILE_ROAD] = 'tile-road';
  TILE_CLASSES[TILE_CENTER] = 'tile-center';
  TILE_CLASSES[TILE_VILLAGER] = 'tile-villager';
  TILE_CLASSES[TILE_SIGN] = 'tile-sign';
  TILE_CLASSES[TILE_GRASS_SPOT] = 'tile-grass-spot';
  TILE_CLASSES[TILE_JUNK_SPOT] = 'tile-junk-spot';
  TILE_CLASSES[TILE_AC_SPOT] = 'tile-ac-spot';
  TILE_CLASSES[TILE_PLAYER_HOUSE] = 'tile-player-house';

  const TILE_EMOJI = {};
  TILE_EMOJI[TILE_VILLAGER] = '👤';
  TILE_EMOJI[TILE_SIGN] = '🪧';
  TILE_EMOJI[TILE_GRASS_SPOT] = '🌿';
  TILE_EMOJI[TILE_JUNK_SPOT] = '📦';
  TILE_EMOJI[TILE_AC_SPOT] = '❄️';
  TILE_EMOJI[TILE_TREE] = '🌲';
  TILE_EMOJI[TILE_WALL] = '🧱';
  TILE_EMOJI[TILE_PLAYER_HOUSE] = '🏠';

  function buildMap() {
    mapGrid.innerHTML = '';
    mapGrid.style.gridTemplateColumns = `repeat(${MAP_COLS}, 1fr)`;
    mapGrid.style.gridTemplateRows = `repeat(${MAP_ROWS}, 1fr)`;
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const tileType = getTileTypeAt(r, c);
        const tile = document.createElement('div');
        tile.className = 'tile ' + (TILE_CLASSES[tileType] || TILE_CLASSES[TILE_GROUND]);
        tile.dataset.row = r;
        tile.dataset.col = c;
        const emoji = TILE_EMOJI[tileType];
        if (emoji) {
          const span = document.createElement('span');
          span.className = 'tile-emoji';
          span.textContent = emoji;
          span.setAttribute('aria-hidden', 'true');
          tile.appendChild(span);
        }
        mapGrid.appendChild(tile);
      }
    }
    updateQuestHighlight();
  }

  function updateQuestHighlight() {
    if (!mapGrid) return;
    const tiles = mapGrid.querySelectorAll('.tile');
    tiles.forEach(function (tile) { tile.classList.remove('highlight'); });
    if (activeQuest === 1 || activeQuest === 2 || activeQuest === 3) {
      const t = QUEST_TARGETS[activeQuest];
      if (t) {
        const target = mapGrid.querySelector('.tile[data-row="' + t.row + '"][data-col="' + t.col + '"]');
        if (target) target.classList.add('highlight');
      }
    }
  }

  function updatePlayerPos() {
    document.documentElement.style.setProperty('--player-row', playerRow);
    document.documentElement.style.setProperty('--player-col', playerCol);
    document.documentElement.style.setProperty('--player-col-px', (playerCol * TILE_SIZE) + 'px');
    document.documentElement.style.setProperty('--player-row-px', (playerRow * TILE_SIZE) + 'px');
    if (!playerEl.querySelector('.player-inner')) {
      const inner = document.createElement('div');
      inner.className = 'player-inner';
      playerEl.appendChild(inner);
    }
  }

  function canWalk(r, c) {
    if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) return false;
    const base = map[r][c];
    if (base === TILE_WALL || base === TILE_TREE) return false;
    for (let i = 0; i < PLAYER_HOUSE_TILES.length; i++) {
      const [hr, hc] = PLAYER_HOUSE_TILES[i];
      if (hr === r && hc === c) return false;
    }
    return true;
  }

  function isAdjacentToPlayerHouse() {
    for (let i = 0; i < PLAYER_HOUSE_TILES.length; i++) {
      const [hr, hc] = PLAYER_HOUSE_TILES[i];
      const dist = Math.abs(playerRow - hr) + Math.abs(playerCol - hc);
      if (dist === 1) return true;
    }
    return false;
  }

  function move(dr, dc) {
    const nr = playerRow + dr;
    const nc = playerCol + dc;
    if (!canWalk(nr, nc)) return;
    if (dr === -1) playerFacing = 'up';
    if (dr === 1) playerFacing = 'down';
    if (dc === -1) playerFacing = 'left';
    if (dc === 1) playerFacing = 'right';
    playerRow = nr;
    playerCol = nc;
    updatePlayerPos();
    updateActionButtons();
  }

  function getTileInFront() {
    let r = playerRow, c = playerCol;
    if (playerFacing === 'up') r--; else if (playerFacing === 'down') r++; else if (playerFacing === 'left') c--; else c++;
    if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) return null;
    return { row: r, col: c, tileType: getTileTypeAt(r, c) };
  }

  function getProblemQuestInFront() {
    const tf = getTileInFront();
    if (!tf) return null;
    if (tf.tileType === TILE_GRASS_SPOT) return 1;
    if (tf.tileType === TILE_JUNK_SPOT) return 2;
    if (tf.tileType === TILE_AC_SPOT) return 3;
    return null;
  }

  function isAdjacentToVillager() {
    for (let i = 0; i < VILLAGERS.length; i++) {
      const v = VILLAGERS[i];
      const dist = Math.abs(playerRow - v.row) + Math.abs(playerCol - v.col);
      if (dist === 1) return v;
    }
    return null;
  }

  function isOnQuestTarget() {
    if (!activeQuest) return null;
    const t = QUEST_TARGETS[activeQuest];
    return (playerRow === t.row && playerCol === t.col) ? activeQuest : null;
  }

  function getSignTypeInFront() {
    const tf = getTileInFront();
    if (!tf || tf.tileType !== TILE_SIGN) return null;
    return SIGN_AT[tf.row + ',' + tf.col] || null;
  }

  const SEARCH_TILE_TYPES = [TILE_GRASS_SPOT, TILE_JUNK_SPOT, TILE_AC_SPOT, TILE_SIGN];

  function isOrthogonalAdjacentToSearchTarget() {
    const r = playerRow, c = playerCol;
    const dirs = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
    for (let i = 0; i < dirs.length; i++) {
      const nr = dirs[i][0], nc = dirs[i][1];
      const t = getTileTypeAt(nr, nc);
      if (t === TILE_GRASS_SPOT && activeQuest === 1) return true;
      if (t === TILE_JUNK_SPOT && activeQuest === 2) return true;
      if (t === TILE_AC_SPOT && activeQuest === 3) return true;
      if (t === TILE_SIGN) return true;
    }
    return isAdjacentToPlayerHouse();
  }

  function getAdjacentSearchTarget() {
    const r = playerRow, c = playerCol;
    const front = getTileInFront();
    if (front && SEARCH_TILE_TYPES.indexOf(front.tileType) !== -1) {
      if (front.tileType === TILE_GRASS_SPOT && activeQuest === 1) return { type: front.tileType, row: front.row, col: front.col };
      if (front.tileType === TILE_JUNK_SPOT && activeQuest === 2) return { type: front.tileType, row: front.row, col: front.col };
      if (front.tileType === TILE_AC_SPOT && activeQuest === 3) return { type: front.tileType, row: front.row, col: front.col };
      if (front.tileType === TILE_SIGN) return { type: front.tileType, row: front.row, col: front.col };
    }
    const dirs = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
    for (let i = 0; i < dirs.length; i++) {
      const nr = dirs[i][0], nc = dirs[i][1];
      const t = getTileTypeAt(nr, nc);
      if (t === TILE_GRASS_SPOT && activeQuest === 1) return { type: t, row: nr, col: nc };
      if (t === TILE_JUNK_SPOT && activeQuest === 2) return { type: t, row: nr, col: nc };
      if (t === TILE_AC_SPOT && activeQuest === 3) return { type: t, row: nr, col: nc };
      if (t === TILE_SIGN) return { type: t, row: nr, col: nc };
    }
    if (isAdjacentToPlayerHouse()) return { type: TILE_PLAYER_HOUSE, row: r, col: c };
    return null;
  }

  function updateActionButtons() {
    const villager = isAdjacentToVillager();
    const canSearch = isOrthogonalAdjacentToSearchTarget();
    actionButtons.classList.add('hidden');
    btnTalk.classList.add('hidden');
    btnSearch.classList.add('hidden');
    btnCancelAction.classList.add('hidden');

    if (canSearch) {
      show(actionButtons);
      show(btnSearch);
      show(btnCancelAction);
    }
    if (villager && !completedQuests[villager.id]) {
      show(actionButtons);
      show(btnTalk);
      show(btnCancelAction);
      currentNpcId = villager.id;
    }
    if (!villager) currentNpcId = 0;
  }

  function openDialogue(villager) {
    dialogueName.textContent = villager.name;
    dialogueText.textContent = villager.text;
    dialogueChoices.innerHTML = '';
    if (villager.quest > 0) {
      const help = document.createElement('button');
      help.type = 'button';
      help.textContent = '▶ 助ける';
      help.addEventListener('click', function () {
        activeQuest = villager.quest;
        hide(dialogueOverlay);
        updateQuestHighlight();
        updateActionButtons();
        mapHint.textContent = '';
      });
      const no = document.createElement('button');
      no.type = 'button';
      no.textContent = '▶ やめる';
      no.addEventListener('click', function () { hide(dialogueOverlay); });
      dialogueChoices.appendChild(help);
      dialogueChoices.appendChild(no);
    } else if (villager.id === 1) {
      // 村長: ①会社概要を見る ②閉じる
      const companyBtn = document.createElement('button');
      companyBtn.type = 'button';
      companyBtn.textContent = '▶ 会社概要を見る';
      companyBtn.addEventListener('click', function () {
        if (companyBody) {
          companyBody.textContent = '屋号：便利屋とろんぷらす\n住所：岐阜県羽島市竹鼻町3006-1\n代表：鉄谷松雄\n\nお問い合わせはLINEからお願いします\n※営業電話はお断りしております\n\n岐阜市周辺対応\n営業時間：8:00〜17:00\n\n地域密着で困りごとを解決する便利屋サービスです。';
        }
        if (companyOverlay) show(companyOverlay);
      });
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.textContent = '▶ 閉じる';
      closeBtn.addEventListener('click', function () { hide(dialogueOverlay); });
      dialogueChoices.appendChild(companyBtn);
      dialogueChoices.appendChild(closeBtn);
    } else {
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.textContent = '▶ 閉じる';
      closeBtn.addEventListener('click', function () { hide(dialogueOverlay); });
      dialogueChoices.appendChild(closeBtn);
    }
    show(dialogueOverlay);
  }

  function getExpToNextLevel() {
    if (playerLevel >= 5) return null;
    return EXP_TO_NEXT_LEVEL[playerLevel - 1];
  }

  function addExpAndCheckLevelUp(expGained) {
    const levelsGained = [];
    let exp = expGained;
    while (playerLevel < 5 && exp > 0) {
      const need = getExpToNextLevel();
      if (!need) break;
      const space = need - playerExp;
      const add = Math.min(exp, space);
      playerExp += add;
      exp -= add;
      if (playerExp >= need) {
        playerExp -= need;
        playerLevel++;
        levelsGained.push(playerLevel);
      }
    }
    if (playerLevel < 5 && exp > 0) playerExp += exp;
    return levelsGained;
  }

  function getExpDisplayText() {
    if (playerLevel >= 5) return 'MAX';
    const need = getExpToNextLevel();
    return playerExp + '/' + need;
  }

  function updatePlayerStatusDisplay() {
    if (playerLvNum) playerLvNum.textContent = playerLevel;
    if (playerExpNum) playerExpNum.textContent = getExpDisplayText();
    if (playerHpNum) playerHpNum.textContent = playerHp;
    if (playerHpMaxNum) playerHpMaxNum.textContent = playerHpMax;
    if (battlePlayerLv) battlePlayerLv.textContent = playerLevel;
    if (battlePlayerExp) battlePlayerExp.textContent = getExpDisplayText();
    if (battlePlayerHp) battlePlayerHp.textContent = playerHp;
    if (battlePlayerHpMax) battlePlayerHpMax.textContent = playerHpMax;
  }

  btnTalk.addEventListener('click', function () {
    const villager = isAdjacentToVillager();
    if (villager) openDialogue(villager);
  });

  btnSearch.addEventListener('click', function () {
    const target = getAdjacentSearchTarget();
    if (!target) return;

    if (target.type === TILE_GRASS_SPOT && activeQuest === 1) {
      startBattle(1);
      return;
    }
    if (target.type === TILE_JUNK_SPOT && activeQuest === 2) {
      startBattle(2);
      return;
    }
    if (target.type === TILE_AC_SPOT && activeQuest === 3) {
      startBattle(3);
      return;
    }
    if (target.type === TILE_SIGN) {
      const signType = SIGN_AT[target.row + ',' + target.col];
      if (signType && SIGN_MESSAGES[signType]) {
        dialogueName.textContent = signType === 'entrance' ? '村の入口看板' : '村の案内看板';
        dialogueText.textContent = SIGN_MESSAGES[signType];
        dialogueChoices.innerHTML = '';
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = '▶ 閉じる';
        closeBtn.addEventListener('click', function () { hide(dialogueOverlay); });
        dialogueChoices.appendChild(closeBtn);
        show(dialogueOverlay);
      }
      return;
    }
    if (target.type === TILE_PLAYER_HOUSE) {
      dialogueName.textContent = '';
      dialogueText.textContent = 'とろん君の家だ。\nここから村の人たちを助けに行こう！';
      dialogueChoices.innerHTML = '';
      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.textContent = '▶ 閉じる';
      closeBtn.addEventListener('click', function () { hide(dialogueOverlay); });
      dialogueChoices.appendChild(closeBtn);
      show(dialogueOverlay);
    }
  });

  btnCancelAction.addEventListener('click', function () {
    actionButtons.classList.add('hidden');
  });

  function startBattle(questId) {
    if (typeof console !== 'undefined' && console.log) {
      console.log('[戦闘] startBattle called: questId=' + questId);
    }
    const m = MONSTERS[questId];
    const pool = quizData[m.quizKey] || [];
    currentBattle = {
      questId: questId,
      enemyHp: m.hp,
      enemyHpMax: m.hp,
      monster: m,
      quizPool: pool,
      usedQuizIndices: []
    };
    battleEnemyName.textContent = m.name;
    battleEnemyHp.textContent = m.hp;
    battleEnemyHpMax.textContent = m.hp;
    if (battleEnemyHpInner) battleEnemyHpInner.style.width = '100%';
    if (battleEnemySprite) {
      battleEnemySprite.className = 'battle-enemy-sprite';
      battleEnemySprite.classList.remove('dead', 'sprite-hit');
      battleEnemySprite.src = m.imageSrc;
      battleEnemySprite.alt = m.name;
    }
    battleMsg.textContent = m.name + 'が あらわれた！';
    battleQuizChoices.classList.add('hidden');
    battleQuizChoices.innerHTML = '';
    battleSubCommands.classList.add('hidden');
    battleSubCommands.innerHTML = '';
    showPlayerTurn();
    updatePlayerStatusDisplay();
    show(battleOverlay);
  }

  function showPlayerTurn() {
    battleMsg.textContent = battleMsg.textContent || 'とろん君の ターン！';
    battleCommands.classList.remove('hidden');
    battleQuizChoices.classList.add('hidden');
    battleQuizChoices.innerHTML = '';
    battleSubCommands.classList.add('hidden');
    battleSubCommands.innerHTML = '';
    show(battleCommands);
  }

  function doWork() {
    const m = currentBattle.monster;
    const dmg = 10 + Math.floor(Math.random() * 11);
    currentBattle.enemyHp = Math.max(0, currentBattle.enemyHp - dmg);

    battleMsg.textContent = 'とろん君の 作業する！\n' + dmg + 'ダメージ！';
    battleEnemyHp.textContent = currentBattle.enemyHp;
    if (battleEnemyHpInner) {
      const pct = (currentBattle.enemyHp / currentBattle.enemyHpMax) * 100;
      battleEnemyHpInner.style.width = pct + '%';
    }
    damagePopup.textContent = dmg;
    damagePopup.classList.remove('hidden');
    damagePopup.classList.remove('damage-popup-show');
    damagePopup.offsetHeight;
    damagePopup.classList.add('damage-popup-show');
    if (battleEnemySprite) {
      battleEnemySprite.classList.remove('sprite-hit');
      battleEnemySprite.offsetHeight;
      battleEnemySprite.classList.add('sprite-hit');
      setTimeout(function () { battleEnemySprite.classList.remove('sprite-hit'); }, 300);
    }
    setTimeout(function () {
      damagePopup.classList.remove('damage-popup-show');
      damagePopup.classList.add('hidden');
    }, 800);

    if (currentBattle.enemyHp <= 0) {
      if (battleEnemySprite) battleEnemySprite.classList.add('dead');
      const expGained = EXP_PER_MONSTER[currentBattle.questId] || 10;
      const levelsGained = addExpAndCheckLevelUp(expGained);
      updatePlayerStatusDisplay();
      let msg = m.name + 'を やっつけた！\n' + expGained + ' EXP を かくとく！';
      if (levelsGained.length > 0) {
        const newLv = levelsGained[levelsGained.length - 1];
        msg += '\n\nとろん君は レベル' + newLv + ' になった！\n' + levelTitles[newLv - 1];
      }
      battleMsg.textContent = msg;
      battleCommands.classList.add('hidden');
      battleQuizChoices.classList.add('hidden');
      battleSubCommands.classList.remove('hidden');
      battleSubCommands.innerHTML = '';
      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'battle-cmd';
      nextBtn.textContent = '▶ つづける';
      nextBtn.addEventListener('click', function () {
        hide(battleOverlay);
        completedQuests[currentBattle.questId] = true;
        activeQuest = 0;
        updateQuestHighlight();
        showClearOverlay(currentBattle.questId);
      });
      battleSubCommands.appendChild(nextBtn);
      show(battleSubCommands);
      return;
    }

    battleCommands.classList.add('hidden');
    setTimeout(function () { showMonsterQuiz(); }, 1000);
  }

  function getUnusedQuizIndex() {
    const pool = currentBattle.quizPool;
    const used = currentBattle.usedQuizIndices;
    const available = pool.map(function (_, i) { return i; }).filter(function (i) { return used.indexOf(i) === -1; });
    if (available.length === 0) {
      currentBattle.usedQuizIndices = [];
      return Math.floor(Math.random() * pool.length);
    }
    const idx = available[Math.floor(Math.random() * available.length)];
    currentBattle.usedQuizIndices.push(idx);
    return idx;
  }

  function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function showMonsterQuiz() {
    const m = currentBattle.monster;
    const pool = currentBattle.quizPool;
    const idx = getUnusedQuizIndex();
    const q = pool[idx];
    const indices = shuffleArray(q.choices.map(function (_, i) { return i; }));
    const shuffledChoices = indices.map(function (i) { return q.choices[i]; });
    const newAnswerIndex = indices.indexOf(q.answer);
    const displayQuiz = { question: q.question, choices: shuffledChoices, answer: newAnswerIndex, tip: q.tip || '' };
    currentBattle.currentQuiz = displayQuiz;
    battleMsg.textContent = m.name + 'の クイズ！\n\n' + displayQuiz.question;
    battleQuizChoices.innerHTML = '';
    displayQuiz.choices.forEach(function (choice, i) {
      const prefix = i === 0 ? '① ' : i === 1 ? '② ' : '③ ';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'battle-cmd battle-quiz-btn';
      btn.textContent = prefix + choice;
      btn.dataset.index = i;
      btn.addEventListener('click', function () { checkQuizAnswer(parseInt(btn.dataset.index, 10)); });
      battleQuizChoices.appendChild(btn);
    });
    battleQuizChoices.classList.remove('hidden');
    show(battleQuizChoices);
  }

  function checkQuizAnswer(selectedIndex) {
    const q = currentBattle.currentQuiz;
    const correct = selectedIndex === q.answer;
    battleQuizChoices.classList.add('hidden');
    battleQuizChoices.innerHTML = '';

    const tipText = (q.tip) ? '\n\n豆知識\n' + q.tip : '';
    if (correct) {
      battleMsg.textContent = '正解！ ダメージを かいひした！' + tipText;
    } else {
      playerHp = Math.max(0, playerHp - 10);
      battleMsg.textContent = '不正解！ とろん君は 10ダメージを うけた！' + tipText;
      updatePlayerStatusDisplay();
    }

    if (playerHp <= 0) {
      battleMsg.textContent = 'とろん君は たおれた…';
      battleSubCommands.classList.remove('hidden');
      battleSubCommands.innerHTML = '';
      const retryBtn = document.createElement('button');
      retryBtn.type = 'button';
      retryBtn.className = 'battle-cmd';
      retryBtn.textContent = '▶ やり直す';
      retryBtn.addEventListener('click', function () {
        playerHp = playerHpMax;
        updatePlayerStatusDisplay();
        hide(battleOverlay);
        startBattle(currentBattle.questId);
      });
      battleSubCommands.appendChild(retryBtn);
      show(battleSubCommands);
      return;
    }

    battleSubCommands.classList.remove('hidden');
    battleSubCommands.innerHTML = '';
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'battle-cmd';
    nextBtn.textContent = '▶ つづける';
    nextBtn.addEventListener('click', function () {
      battleMsg.textContent = 'とろん君の ターン！';
      showPlayerTurn();
    });
    battleSubCommands.appendChild(nextBtn);
    show(battleSubCommands);
  }

  document.querySelectorAll('.battle-cmd').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const cmd = btn.dataset.cmd;
      if (cmd === 'work') doWork();
      if (cmd === 'run') {
        hide(battleOverlay);
        battleMsg.textContent = '';
        battleCommands.classList.remove('hidden');
        battleQuizChoices.classList.add('hidden');
        battleQuizChoices.innerHTML = '';
        battleSubCommands.classList.add('hidden');
        battleSubCommands.innerHTML = '';
      }
    });
  });

  function showClearOverlay(questId) {
    const villager = VILLAGERS.find(function (v) { return v.quest === questId; });
    clearMessage.textContent = 'ありがとう！助かったよ！';
    show(clearOverlay);
  }

  btnLine.addEventListener('click', function () {
    window.open(LINE_URL, '_blank');
  });

  btnClearClose.addEventListener('click', function () {
    hide(clearOverlay);
    updateActionButtons();
    mapHint.textContent = '';
  });

  if (btnCloseCompany) {
    btnCloseCompany.addEventListener('click', function () {
      hide(companyOverlay);
    });
  }

  document.getElementById('btn-start').addEventListener('click', startGame);

  document.addEventListener('keydown', function (e) {
    if (mapScreen.classList.contains('hidden')) return;
    switch (e.key) {
      case 'ArrowUp': e.preventDefault(); move(-1, 0); break;
      case 'ArrowDown': e.preventDefault(); move(1, 0); break;
      case 'ArrowLeft': e.preventDefault(); move(0, -1); break;
      case 'ArrowRight': e.preventDefault(); move(0, 1); break;
    }
  });

  dpad.addEventListener('click', function (e) {
    const btn = e.target.closest('.dpad-btn[data-dir]');
    if (!btn) return;
    const d = btn.dataset.dir;
    if (d === 'up') move(-1, 0);
    if (d === 'down') move(1, 0);
    if (d === 'left') move(0, -1);
    if (d === 'right') move(0, 1);
  });
})();
