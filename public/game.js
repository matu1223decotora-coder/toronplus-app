/**
 * game.js - プレイヤー移動・NPC会話・調べる・バトル
 * 依存: map.js（先に読み込むこと）
 *
 * マップ: map.js の mapData を読み込んで描画するだけ。マップの編集は map.js のみで行う。
 */
(function () {
  'use strict';

  var LINE_URL = (typeof window !== 'undefined' && window.LINE_URL) ? window.LINE_URL : '#';

  // 1タイル = 32×32 正方形
  var TILE_SIZE = 32;
  var PLAYER_SIZE = 32;
  var CANVAS_WIDTH = MAP_COLS * TILE_SIZE;
  var CANVAS_HEIGHT = MAP_ROWS * TILE_SIZE;

  // --- スプライト（assets の PNG を使用） ---
  var grassSprite = new Image();
  grassSprite.src = 'assets/grass.png';
  var roadSprite = new Image();
  roadSprite.src = 'assets/road.png';
  var waterSprite = new Image();
  waterSprite.src = 'assets/water.png';
  var objectSprite = new Image();
  objectSprite.src = 'assets/object.png';
  var fenceSprite = new Image();
  fenceSprite.src = 'assets/fence.png';
  var treeSprite = new Image();
  treeSprite.src = 'assets/tree.png';
  var houseSprite = new Image();
  houseSprite.src = 'assets/house.png';
  function createImageWithPathFallbacks(paths) {
    var img = new Image();
    var pathIndex = 0;
    img.onerror = function () {
      pathIndex += 1;
      if (pathIndex < paths.length) {
        img.src = paths[pathIndex];
      }
    };
    img.src = paths[0];
    return img;
  }
  // 畑タイル用（index は public/ 直下をドキュメントルートとする）
  var fieldImage = new Image();
  var fieldImagePaths = ['assets/field.png'];
  var fieldImagePathIndex = 0;
  fieldImage.onerror = function () {
    fieldImagePathIndex += 1;
    if (fieldImagePathIndex < fieldImagePaths.length) {
      fieldImage.src = fieldImagePaths[fieldImagePathIndex];
    }
  };
  fieldImage.src = fieldImagePaths[0];
  var fieldSoilImage = createImageWithPathFallbacks(['assets/field_soil.png']);
  var fieldRidgeImage = createImageWithPathFallbacks(['assets/field_ridge.png']);
  var villagerImgs = [];
  var img1 = new Image();
  img1.src = 'assets/villager1.png';
  var img2 = new Image();
  img2.src = 'assets/villager2.png';
  var img3 = new Image();
  img3.src = 'assets/villager3.png';
  villagerImgs = [img3, img2, img1];
  var playerImage = new Image();
  var playerImageCandidates = ['assets/toron.png?v=2'];
  var playerImageCandidateIndex = 0;
  function loadNextPlayerImageCandidate() {
    if (playerImageCandidateIndex >= playerImageCandidates.length) return;
    playerImage.src = playerImageCandidates[playerImageCandidateIndex++];
  }
  playerImage.onerror = function () {
    loadNextPlayerImageCandidate();
  };
  loadNextPlayerImageCandidate();
  console.log('playerImage:', playerImage.src);
  var signSprite = (function () {
    var img = new Image();
    img.src = 'assets/sign.png';
    return img;
  })();
  signSprite.onload = function () {
    if (typeof drawMap === 'function') drawMap();
  };
  function onSpriteLoaded() {
    if (typeof drawMap === 'function') drawMap();
  }
  grassSprite.onload = onSpriteLoaded;
  roadSprite.onload = onSpriteLoaded;
  waterSprite.onload = onSpriteLoaded;
  objectSprite.onload = onSpriteLoaded;
  fenceSprite.onload = onSpriteLoaded;
  treeSprite.onload = onSpriteLoaded;
  houseSprite.onload = onSpriteLoaded;
  fieldImage.onload = onSpriteLoaded;
  fieldSoilImage.onload = onSpriteLoaded;
  fieldRidgeImage.onload = onSpriteLoaded;
  playerImage.onload = onSpriteLoaded;
  img1.onload = onSpriteLoaded;
  img2.onload = onSpriteLoaded;
  img3.onload = onSpriteLoaded;

  // --- NPC・看板データ（map.js のマップと連動） ---
  var VILLAGERS = [
    { id: 1, row: 2, col: 2, name: '村長', text: 'ここはとろん村だ。困りごとを解決する便利屋、とろん君がいる村だよ。', quest: 0, problemText: '', spriteIndex: 0, isMayor: true, hasQuest: false },
    { id: 'villager_toron_info', row: 2, col: 8, name: '村人', text: 'とろん君はリクガメがモデルの便利屋ヒーローだ。草刈りや不用品回収、エアコン掃除なんでも頼めるんだ。', quest: 0, problemText: '', spriteIndex: 1, isMayor: false, hasQuest: false },
    { id: 3, row: 5, col: 5, name: '村人', text: '最近、庭の草がすごくて困っているの…', quest: 1, problemText: '庭の草が伸びすぎて困っているんだ', spriteIndex: 2, isMayor: false, hasQuest: true },
    { id: 4, row: 11, col: 8, name: '村人', text: '家の中に不用品がたまってしまって…', quest: 2, problemText: '不用品が山積みで大変なんだ…', spriteIndex: 0, isMayor: false, hasQuest: true },
    { id: 5, row: 17, col: 8, name: '村人', text: 'エアコンがカビくさくて困ってる…', quest: 3, problemText: 'エアコンがカビだらけで困ってるんだ', spriteIndex: 1, isMayor: false, hasQuest: true }
  ];
  // 看板の論理座標（タイル row,col）— 描画・近接判定・調べると一致
  // 入口看板は草マス (1,9)（行1列10の道の西隣）。案内看板 (9,11) は変更しない
  var SIGN_AT = { '1,9': 'entrance', '9,11': 'guide' };
  var SIGN_MESSAGES = {
    entrance: 'とろん村へようこそ',
    guide: '↑ 草刈りの依頼\n↓ エアコン掃除\n← 不用品回収\n\n困ったことがあれば 村人に話しかけてみよう！'
  };

  // --- クエスト・モンスター・クイズデータ ---
  /**
   * バトル発火はマップの家・畑タイルとは無関係に「座標のみ」で固定する。
   * row=mapData行, col=列（タイル単位）。調べる・黄枠・オーバーレイはすべてここを参照。
   */
  var BATTLE_EVENTS = [
    // 草刈り: 男村人依頼は畑の中央マス（map の 9 ブロック中心）。家は光らせない
    { row: 13, col: 16, questId: 1, type: 'grass_battle' },
    { row: 11, col: 6, questId: 2, type: 'junk_battle' },
    // クエスト3: 下側の女村人(17,8)の近くの家タイル mapData[16][14]=6（見た目は地形のまま・黄枠のみ追加）
    { row: 16, col: 14, questId: 3, type: 'aircon_battle' }
  ];
  var quizData = {
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
  var MONSTERS = {
    1: { name: '草モンスター', hp: 80, imageSrc: 'monsters/grass_monster.png', quizKey: 'grass' },
    2: { name: '不用品ゴーレム', hp: 100, imageSrc: 'monsters/junk_monster.png', quizKey: 'junk' },
    3: { name: 'カビスライム', hp: 70, imageSrc: 'monsters/mold_monster.png', quizKey: 'aircon' }
  };
  var EXP_PER_MONSTER = { 1: 10, 2: 15, 3: 20 };
  var EXP_TO_NEXT_LEVEL = [20, 40, 70, 100];
  var levelTitles = ['見習い便利屋', 'お助け便利屋', '解決の達人', '町のヒーロー', 'とろん村の救世主'];

  // --- ゲーム状態 ---
  var playerRow = 9;
  var playerCol = 7;
  var playerFacing = 'down';
  var activeQuest = 0;
  var completedQuests = {};
  var playerHp = 100;
  var playerHpMax = 100;
  var playerLevel = 1;
  var playerExp = 0;
  var currentNpcId = 0;
  var currentVillager = null;
  var currentBattle = null;
  var questClearCount = 0;
  var showJobs = false;
  var showCompany = false;
  var showToron = false;
  var mode = 'title'; // 'title' | 'field' | 'talk' | 'inspect' | 'battle' | 'ending'
  var JOBS = [
    'ハウスクリーニング',
    '草刈り',
    '季節タイヤ交換',
    '不用品回収',
    '片付け',
    'スマホ基本サポート',
    '庭木剪定',
    'その他なんでもご相談下さい'
  ];
  var ENDING_TEXTS = [
    '今日もとろん村の困りごとは解決した…',
    '',
    'でも現実のあなたの困りごとは？',
    '',
    'とろんぷらすは地域密着の便利屋サービスです',
    '',
    '草刈り・剪定',
    'エアコン掃除',
    '不用品回収',
    'ハウスクリーニング',
    '車の季節タイヤ出張交換',
    '物置・倉庫整理',
    '買い物代行',
    '家具の移動',
    '',
    'その他、どんな小さな困りごとでもご相談ください',
    '',
    '相談・見積りは無料です',
    '',
    'あなたの街の便利屋として、すぐに対応します'
  ];

  // --- DOM（後で取得） ---
  var canvas, ctx;
  var titleScreen, mapScreen, mapHint, dpad, actionButtons, btnTalk, btnSearch, btnCancelAction;
  var playerLvNum, playerExpNum, playerHpNum, playerHpMaxNum;
  var dialogueOverlay, dialogueName, dialogueText, dialogueChoices;
  var battleOverlay, battleEnemyName, battleEnemyHp, battleEnemyHpMax, battleEnemySprite, battleEnemyHpInner;
  var damagePopup, battlePlayerLv, battlePlayerExp, battlePlayerHp, battlePlayerHpMax;
  var battleMsg, battleCommands, battleQuizChoices, battleSubCommands;
  var clearOverlay, clearMessage, btnLine, btnClearClose;
  var companyOverlay, companyBody, btnCloseCompany;
  var endingOverlay, endingRoll, endingCta, btnEndingLine, btnEndingTitle;
  var endingCtaTimer = null;

  function show(el) { if (el) el.classList.remove('hidden'); }
  function hide(el) { if (el) el.classList.add('hidden'); }
  function resetGameProgress() {
    playerRow = 9;
    playerCol = 7;
    playerFacing = 'down';
    activeQuest = 0;
    completedQuests = {};
    playerHp = 100;
    playerHpMax = 100;
    playerLevel = 1;
    playerExp = 0;
    currentNpcId = 0;
    currentVillager = null;
    currentBattle = null;
    questClearCount = 0;
    showJobs = false;
    showCompany = false;
    showToron = false;
    if (endingCta) hide(endingCta);
    if (mapHint) mapHint.textContent = '';
  }

  function setMode(nextMode) {
    mode = nextMode || 'field';
    if (mode !== 'ending' && endingOverlay) hide(endingOverlay);
    if (mode === 'title') {
      if (endingCtaTimer) {
        clearTimeout(endingCtaTimer);
        endingCtaTimer = null;
      }
      hide(endingOverlay);
      hide(mapScreen);
      hide(dialogueOverlay);
      hide(companyOverlay);
      hide(battleOverlay);
      hide(clearOverlay);
      if (actionButtons) actionButtons.classList.add('hidden');
      if (btnTalk) btnTalk.classList.add('hidden');
      if (btnSearch) btnSearch.classList.add('hidden');
      if (btnCancelAction) btnCancelAction.classList.add('hidden');
      stopBgm();
      resetGameProgress();
      updatePlayerStatusDisplay();
      if (titleScreen) show(titleScreen);
      return;
    }
    if (mode !== 'field') {
      if (actionButtons) actionButtons.classList.add('hidden');
      if (btnTalk) btnTalk.classList.add('hidden');
      if (btnSearch) btnSearch.classList.add('hidden');
      if (btnCancelAction) btnCancelAction.classList.add('hidden');
      return;
    }
    updateActionButtons();
  }

  // ===== BGM（フィールド/バトル切替）=====
  // ファイルは `public/bgm.mp3` と `public/battle.mp3` を配置してください
  var FIELD_BGM_SRC = 'bgm.mp3';
  var BATTLE_BGM_SRC = 'battle.mp3';
  var fieldBgm = null;
  var battleBgm = null;
  var bgmTarget = 'none'; // 'field' | 'battle' | 'none'
  var bgmRetryBound = false;
  var BGM_VOLUME = 0.2;
  var killBgmResumeTimer = null;

  function ensureBgm() {
    if (!fieldBgm) {
      fieldBgm = new Audio(FIELD_BGM_SRC);
      fieldBgm.loop = true;
      fieldBgm.volume = BGM_VOLUME;
    }
    if (!battleBgm) {
      battleBgm = new Audio(BATTLE_BGM_SRC);
      battleBgm.loop = true;
      battleBgm.volume = BGM_VOLUME;
    }
  }

  function stopAllBgm() {
    if (fieldBgm) {
      fieldBgm.pause();
      try { fieldBgm.currentTime = 0; } catch (e) { /* ignore */ }
      fieldBgm.volume = BGM_VOLUME;
    }
    if (battleBgm) {
      battleBgm.pause();
      try { battleBgm.currentTime = 0; } catch (e) { /* ignore */ }
      battleBgm.volume = BGM_VOLUME;
    }
  }

  function bindBgmRetryAfterUserGesture() {
    if (bgmRetryBound) return;
    bgmRetryBound = true;
    var retry = function () {
      bgmRetryBound = false;
      if (bgmTarget === 'field') playFieldBgm();
      if (bgmTarget === 'battle') playBattleBgm();
    };
    window.addEventListener('touchstart', retry, { once: true, passive: true });
    window.addEventListener('click', retry, { once: true });
  }

  function playFieldBgm() {
    bgmTarget = 'field';
    ensureBgm();
    if (!fieldBgm || !battleBgm) return;
    // 同時再生禁止: battle を停止してから field を再生
    battleBgm.pause();
    try { battleBgm.currentTime = 0; } catch (e) { /* ignore */ }
    try { fieldBgm.currentTime = 0; } catch (e) { /* ignore */ }
    fieldBgm.volume = BGM_VOLUME;
    var p = fieldBgm.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function () { bindBgmRetryAfterUserGesture(); });
    }
  }

  function playBattleBgm() {
    bgmTarget = 'battle';
    ensureBgm();
    if (!fieldBgm || !battleBgm) return;
    // 同時再生禁止: field を停止してから battle を再生
    fieldBgm.pause();
    try { fieldBgm.currentTime = 0; } catch (e) { /* ignore */ }
    try { battleBgm.currentTime = 0; } catch (e) { /* ignore */ }
    battleBgm.volume = BGM_VOLUME;
    var p = battleBgm.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function () { bindBgmRetryAfterUserGesture(); });
    }
  }

  function stopBgm() {
    bgmTarget = 'none';
    if (killBgmResumeTimer) {
      clearTimeout(killBgmResumeTimer);
      killBgmResumeTimer = null;
    }
    stopAllBgm();
  }

  // ===== 攻撃SE（とろん君の「作業する」時のみ・BGMと同時再生OK）=====
  // `public/attack.mp3` を配置してください
  var ATTACK_SE_SRC = 'attack.mp3';
  var ATTACK_SE_VOLUME = 0.4;

  function playAttackSe() {
    // 攻撃時に都度インスタンスを作る（連打時の再生ずれを防ぐ）
    var se = new Audio(ATTACK_SE_SRC);
    se.volume = ATTACK_SE_VOLUME;
    var p = se.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function () { /* 再生失敗時は無視 */ });
    }
  }

  function syncBgmWithScreen() {
    // タイトル画面の間、またはゲーム画面が隠れている間は停止
    // （タイトルに戻る導線が将来的に増えても止まるように title-screen も監視）
    if (!mapScreen) return;
    if (mapScreen.classList.contains('hidden')) { stopBgm(); return; }
    if (titleScreen && !titleScreen.classList.contains('hidden')) { stopBgm(); return; }
  }

  function getVillagerAt(r, c) {
    return VILLAGERS.find(function (v) { return v.row === r && v.col === c; });
  }

  function getBattleEventAtCell(r, c) {
    for (var i = 0; i < BATTLE_EVENTS.length; i++) {
      var e = BATTLE_EVENTS[i];
      if (e.row === r && e.col === c) return e;
    }
    return null;
  }

  function getObjectAt(r, c) {
    if (getVillagerAt(r, c)) return TILE_VILLAGER;
    var key = r + ',' + c;
    if (SIGN_AT[key]) return TILE_SIGN;

    // クエスト1（草刈り）は「座標固定」ではなく、畑タイル上でも発火できるようにする
    // （mapData の 9 / TILE_FIELD を field 扱い）
    if (activeQuest === 1) {
      var base = mapData[r][c];
      var fv = typeof TILE_FIELD !== 'undefined' ? TILE_FIELD : 9;
      if (base === fv || base === 9) return TILE_GRASS_SPOT;
    }

    var battleEv = getBattleEventAtCell(r, c);
    if (battleEv && activeQuest === battleEv.questId) {
      if (battleEv.questId === 1) return TILE_GRASS_SPOT;
      if (battleEv.questId === 2) return TILE_JUNK_SPOT;
      if (battleEv.questId === 3) return TILE_AC_SPOT;
    }
    for (var i = 0; i < PLAYER_HOUSE_TILES.length; i++) {
      var hr = PLAYER_HOUSE_TILES[i][0], hc = PLAYER_HOUSE_TILES[i][1];
      if (hr === r && hc === c) return TILE_PLAYER_HOUSE_OBJ;
    }
    return null;
  }

  function getTileTypeAt(r, c) {
    if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) return TILE_GROUND;
    var obj = getObjectAt(r, c);
    if (obj !== null) return obj;
    return mapData[r][c];
  }

  function canWalk(r, c) {
    if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) return false;
    var base = mapData[r][c];
    if (base === TILE_WALL || base === TILE_TREE || base === TILE_WATER || base === TILE_HOUSE || base === TILE_PLAYER_HOUSE) return false;
    return true;
  }

  function isAdjacentToPlayerHouse() {
    for (var i = 0; i < PLAYER_HOUSE_TILES.length; i++) {
      var hr = PLAYER_HOUSE_TILES[i][0], hc = PLAYER_HOUSE_TILES[i][1];
      if (Math.abs(playerRow - hr) + Math.abs(playerCol - hc) === 1) return true;
    }
    return false;
  }

  function isAdjacentToVillager() {
    for (var i = 0; i < VILLAGERS.length; i++) {
      var v = VILLAGERS[i];
      if (Math.abs(playerRow - v.row) + Math.abs(playerCol - v.col) === 1) return v;
    }
    return null;
  }

  function isNearSign() {
    var tileW = TILE_SIZE;
    var tileH = TILE_SIZE;
    var playerCenterX = playerCol * tileW + tileW / 2;
    var playerCenterY = playerRow * tileH + tileH / 2;
    for (var key in SIGN_AT) {
      if (!Object.prototype.hasOwnProperty.call(SIGN_AT, key)) continue;
      var parts = key.split(',');
      var sr = parseInt(parts[0], 10);
      var sc = parseInt(parts[1], 10);
      if (isNaN(sr) || isNaN(sc)) continue;
      var signCenterX = sc * tileW + tileW / 2;
      var signCenterY = sr * tileH + tileH / 2;
      var dx = playerCenterX - signCenterX;
      var dy = playerCenterY - signCenterY;
      if (Math.sqrt(dx * dx + dy * dy) < 56) return true;
    }
    return false;
  }

  function getTileInFront() {
    var r = playerRow, c = playerCol;
    if (playerFacing === 'up') r--; else if (playerFacing === 'down') r++; else if (playerFacing === 'left') c--; else c++;
    if (r < 0 || r >= MAP_ROWS || c < 0 || c >= MAP_COLS) return null;
    return { row: r, col: c, tileType: getTileTypeAt(r, c) };
  }

  var SEARCH_TILE_TYPES = [TILE_GRASS_SPOT, TILE_JUNK_SPOT, TILE_AC_SPOT, TILE_SIGN];

  function battleTileTypeForQuest(qid) {
    if (qid === 1) return TILE_GRASS_SPOT;
    if (qid === 2) return TILE_JUNK_SPOT;
    if (qid === 3) return TILE_AC_SPOT;
    return null;
  }

  function isOrthogonalAdjacentToSearchTarget() {
    var r = playerRow, c = playerCol;

    // 足元が畑（草刈り対象）なら即「調べる」を出す
    if (activeQuest === 1 && getTileTypeAt(r, c) === TILE_GRASS_SPOT) return true;

    var onBattle = getBattleEventAtCell(r, c);
    if (onBattle && activeQuest === onBattle.questId) return true;
    var dirs = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
    for (var i = 0; i < dirs.length; i++) {
      var nr = dirs[i][0], nc = dirs[i][1];
      var t = getTileTypeAt(nr, nc);
      if (t === TILE_GRASS_SPOT && activeQuest === 1) return true;
      if (t === TILE_JUNK_SPOT && activeQuest === 2) return true;
      if (t === TILE_AC_SPOT && activeQuest === 3) return true;
      if (t === TILE_SIGN) return true;
    }
    return isAdjacentToPlayerHouse();
  }

  function getAdjacentSearchTarget() {
    var r = playerRow, c = playerCol;

    // 足元が畑（草刈り対象）なら自分自身を対象として返す
    if (activeQuest === 1 && getTileTypeAt(r, c) === TILE_GRASS_SPOT) {
      return { type: TILE_GRASS_SPOT, row: r, col: c };
    }

    var selfBattle = getBattleEventAtCell(r, c);
    if (selfBattle && activeQuest === selfBattle.questId) {
      var st = battleTileTypeForQuest(selfBattle.questId);
      if (st !== null) return { type: st, row: r, col: c };
    }
    var front = getTileInFront();
    if (front && SEARCH_TILE_TYPES.indexOf(front.tileType) !== -1) {
      if (front.tileType === TILE_GRASS_SPOT && activeQuest === 1) return { type: front.tileType, row: front.row, col: front.col };
      if (front.tileType === TILE_JUNK_SPOT && activeQuest === 2) return { type: front.tileType, row: front.row, col: front.col };
      if (front.tileType === TILE_AC_SPOT && activeQuest === 3) return { type: front.tileType, row: front.row, col: front.col };
      if (front.tileType === TILE_SIGN) return { type: front.tileType, row: front.row, col: front.col };
    }
    var dirs = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
    for (var i = 0; i < dirs.length; i++) {
      var nr = dirs[i][0], nc = dirs[i][1];
      var t = getTileTypeAt(nr, nc);
      if (t === TILE_GRASS_SPOT && activeQuest === 1) return { type: t, row: nr, col: nc };
      if (t === TILE_JUNK_SPOT && activeQuest === 2) return { type: t, row: nr, col: nc };
      if (t === TILE_AC_SPOT && activeQuest === 3) return { type: t, row: nr, col: nc };
      if (t === TILE_SIGN) return { type: t, row: nr, col: nc };
    }
    if (isAdjacentToPlayerHouse()) return { type: TILE_PLAYER_HOUSE_OBJ, row: r, col: c };
    return null;
  }

  // --- タイル色（canvas用） ---
  var TILE_COLORS = {};
  TILE_COLORS[TILE_GROUND] = '#8bc34a';
  TILE_COLORS[TILE_WALL] = '#777';
  TILE_COLORS[TILE_TREE] = '#2f8f2f';
  TILE_COLORS[TILE_ROAD] = '#8d7355';
  TILE_COLORS[TILE_CENTER] = '#9d8360';
  TILE_COLORS[TILE_WATER] = '#4aa3ff';
  TILE_COLORS[TILE_HOUSE] = '#8d6e63';
  TILE_COLORS[TILE_PLAYER_HOUSE] = '#a67c52';
  TILE_COLORS[TILE_GATE] = '#555';
  TILE_COLORS[TILE_FIELD] = '#6d4c41';
  TILE_COLORS[TILE_VILLAGER] = '#9ccc65';
  TILE_COLORS[TILE_SIGN] = '#c4a35a';
  TILE_COLORS[TILE_GRASS_SPOT] = '#7cb342';
  TILE_COLORS[TILE_JUNK_SPOT] = '#a1887f';
  TILE_COLORS[TILE_AC_SPOT] = '#90caf9';
  TILE_COLORS[TILE_PLAYER_HOUSE_OBJ] = '#a67c52';

  function drawTerrain() {
    if (!canvas || !ctx) return;
    var tileW = TILE_SIZE;
    var tileH = TILE_SIZE;
    var fieldTileValue = typeof TILE_FIELD !== 'undefined' ? TILE_FIELD : 9;
    for (var r = 0; r < MAP_ROWS; r++) {
      for (var c = 0; c < MAP_COLS; c++) {
        var baseType = mapData[r][c];
        var x = c * tileW;
        var y = r * tileH;
        // 畑（field / map 上は数値 TILE_FIELD=9）は草より必ず先に判定（後から grass で上書きされない）
        if (baseType === fieldTileValue || baseType === 9) {
          if (fieldImage.complete && fieldImage.naturalWidth) {
            ctx.drawImage(fieldImage, x, y, tileW, tileH);
          } else {
            ctx.fillStyle = '#8B5A2B';
            ctx.fillRect(x, y, tileW, tileH);
          }
        } else if (baseType === TILE_GROUND) {
          if (grassSprite.complete && grassSprite.naturalWidth) {
            ctx.drawImage(grassSprite, x, y, tileW, tileH);
          } else {
            ctx.fillStyle = '#8bc34a';
            ctx.fillRect(x, y, tileW, tileH);
          }
        } else if (baseType === TILE_ROAD || baseType === TILE_CENTER) {
          if (roadSprite.complete && roadSprite.naturalWidth) {
            ctx.drawImage(roadSprite, x, y, tileW, tileH);
          } else {
            ctx.fillStyle = '#8d7355';
            ctx.fillRect(x, y, tileW, tileH);
          }
        } else if (baseType === TILE_WATER) {
          if (waterSprite.complete && waterSprite.naturalWidth) {
            ctx.drawImage(waterSprite, x, y, tileW, tileH);
          } else {
            ctx.fillStyle = '#4aa3ff';
            ctx.fillRect(x, y, tileW, tileH);
          }
        } else if (baseType === TILE_TREE) {
          if (grassSprite.complete && grassSprite.naturalWidth) {
            ctx.drawImage(grassSprite, x, y, tileW, tileH);
          } else {
            ctx.fillStyle = '#8bc34a';
            ctx.fillRect(x, y, tileW, tileH);
          }
          if (treeSprite.complete && treeSprite.naturalWidth) {
            ctx.drawImage(treeSprite, x, y, tileW, tileH);
          }
        } else if (baseType === TILE_WALL) {
          if (objectSprite.complete && objectSprite.naturalWidth) {
            ctx.drawImage(objectSprite, x, y, tileW, tileH);
          } else {
            ctx.fillStyle = '#777';
            ctx.fillRect(x, y, tileW, tileH);
          }
        } else if (baseType === TILE_HOUSE || baseType === TILE_PLAYER_HOUSE) {
          if (grassSprite.complete && grassSprite.naturalWidth) {
            ctx.drawImage(grassSprite, x, y, tileW, tileH);
          } else {
            ctx.fillStyle = '#8bc34a';
            ctx.fillRect(x, y, tileW, tileH);
          }
          if (houseSprite.complete && houseSprite.naturalWidth) {
            ctx.drawImage(houseSprite, x, y, tileW, tileH);
          }
        } else if (baseType === TILE_GATE) {
          if (fenceSprite.complete && fenceSprite.naturalWidth) {
            ctx.drawImage(fenceSprite, x, y, tileW, tileH);
          } else {
            ctx.fillStyle = '#555';
            ctx.fillRect(x, y, tileW, tileH);
          }
        } else {
          ctx.fillStyle = TILE_COLORS[baseType] || TILE_COLORS[TILE_GROUND];
          ctx.fillRect(x, y, tileW, tileH);
        }
      }
    }
    // クエスト対象ハイライト（BATTLE_EVENTS の座標のみ・マスは通行可能のまま）
    ctx.strokeStyle = '#ffeb3b';
    ctx.lineWidth = 3;
    if (activeQuest === 1) {
      // 草刈りは「畑ブロック全体」を黄枠にする（話す/調べるの不一致を防ぐ）
      var fv2 = typeof TILE_FIELD !== 'undefined' ? TILE_FIELD : 9;
      for (var hr2 = 0; hr2 < MAP_ROWS; hr2++) {
        for (var hc2 = 0; hc2 < MAP_COLS; hc2++) {
          var b2 = mapData[hr2][hc2];
          if (b2 === fv2 || b2 === 9) {
            ctx.strokeRect(hc2 * tileW, hr2 * tileH, tileW, tileH);
          }
        }
      }
    } else {
      for (var he = 0; he < BATTLE_EVENTS.length; he++) {
        var evh = BATTLE_EVENTS[he];
        if (activeQuest === evh.questId) {
          ctx.strokeRect(evh.col * tileW, evh.row * tileH, tileW, tileH);
        }
      }
    }
    // 見た目用オーバーレイ（2のみ。1は地形の畑＋黄枠のみ、3は家＋黄枠のみ）
    for (var oe = 0; oe < BATTLE_EVENTS.length; oe++) {
      var evo = BATTLE_EVENTS[oe];
      var bx = evo.col * tileW;
      var by = evo.row * tileH;
      if (evo.questId === 2) {
        if (objectSprite.complete && objectSprite.naturalWidth) {
          ctx.drawImage(objectSprite, bx, by, tileW, tileH);
        } else {
          ctx.fillStyle = '#777';
          ctx.fillRect(bx, by, tileW, tileH);
        }
      }
    }
  }

  function drawVillagers() {
    if (!canvas || !ctx) return;
    var tileW = TILE_SIZE;
    var tileH = TILE_SIZE;
    for (var i = 0; i < VILLAGERS.length; i++) {
      var v = VILLAGERS[i];
      var img = villagerImgs[v.spriteIndex];
      if (!img) continue;
      if (v.row >= 0 && v.row < MAP_ROWS && v.col >= 0 && v.col < MAP_COLS) {
        if (!img.complete || !img.naturalWidth) {
          ctx.fillStyle = 'green';
          ctx.beginPath();
          ctx.arc(v.col * tileW + tileW / 2, v.row * tileH + tileH / 2, 10, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        ctx.drawImage(img, v.col * tileW, v.row * tileH, tileW, tileH);
      }
    }
  }

  function drawPlayer() {
    if (!canvas || !ctx) return;
    var tileW = TILE_SIZE;
    var tileH = TILE_SIZE;
    // プレイヤー座標は「タイルの足元中心」を基準に描画する
    var footX = playerCol * tileW + tileW / 2;
    var footY = playerRow * tileH + tileH;
    var drawX = footX - PLAYER_SIZE / 2;
    var drawY = footY - PLAYER_SIZE;
    if (playerImage.complete && playerImage.naturalWidth) {
      ctx.drawImage(playerImage, drawX, drawY, PLAYER_SIZE, PLAYER_SIZE);
    } else {
      ctx.fillStyle = '#558b2f';
      ctx.beginPath();
      ctx.arc(footX, footY - tileH / 2, Math.min(tileW, tileH) / 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawObjects() {
    var tw = TILE_SIZE;
    var th = TILE_SIZE;
    for (var signKey in SIGN_AT) {
      if (!Object.prototype.hasOwnProperty.call(SIGN_AT, signKey)) continue;
      var seg = signKey.split(',');
      var sr = parseInt(seg[0], 10);
      var sc = parseInt(seg[1], 10);
      if (isNaN(sr) || isNaN(sc)) continue;
      var sx = sc * tw;
      var sy = sr * th;
      if (signSprite.complete && signSprite.naturalWidth) {
        ctx.drawImage(signSprite, sx, sy, tw, th);
      } else {
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(sx + 4, sy + 4, tw - 8, th - 12);
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(sx + tw / 2 - 2, sy + th - 8, 4, 8);
      }
    }
  }

  function drawMap() {
    drawTerrain();
    drawObjects();
    drawVillagers();
    drawPlayer();
  }

  function updatePlayerPos() {
    drawMap();
  }

  function move(dr, dc) {
    var nr = playerRow + dr;
    var nc = playerCol + dc;
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

  function updateActionButtons() {
    if (battleOverlay && !battleOverlay.classList.contains('hidden')) {
      setMode('battle');
      return;
    }
    if (mode !== 'field') {
      if (actionButtons) actionButtons.classList.add('hidden');
      return;
    }
    var villager = isAdjacentToVillager();
    var canSearch = isOrthogonalAdjacentToSearchTarget();
    if (actionButtons) actionButtons.classList.add('hidden');
    if (btnTalk) btnTalk.classList.add('hidden');
    if (btnSearch) btnSearch.classList.add('hidden');
    if (btnCancelAction) btnCancelAction.classList.add('hidden');
    if (canSearch) {
      show(actionButtons);
      show(btnSearch);
      show(btnCancelAction);
    }
    if (villager) {
      // completedQuests は「クエストID」で管理されているため、
      // 村長の id とクエストID が衝突しないよう villager.quest を参照する
      var done = villager.hasQuest ? !!completedQuests[villager.quest] : false;
      if (!done) {
        show(actionButtons);
        show(btnTalk);
        show(btnCancelAction);
        currentNpcId = villager.id;
      }
    }
    if (!villager) currentNpcId = 0;
  }

  function openDialogue(villager) {
    currentVillager = villager;
    function startQuestForVillager(targetVillager) {
      if (!targetVillager || !targetVillager.hasQuest || !targetVillager.quest) return;
      activeQuest = targetVillager.quest;
      showToron = false;
      showJobs = false;
      showCompany = false;
      hide(dialogueOverlay);
      setMode('field');
      drawMap();
      updateActionButtons();
      if (mapHint) mapHint.textContent = '';
    }
    function closeDialogue() {
      showToron = false;
      showJobs = false;
      showCompany = false;
      currentVillager = null;
      hide(dialogueOverlay);
      setMode('field');
    }
    function appendCloseButton() {
      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.textContent = '▶ 閉じる';
      closeBtn.addEventListener('click', closeDialogue);
      dialogueChoices.appendChild(closeBtn);
    }
    function renderJobsView() {
      dialogueName.textContent = '業務内容';
      dialogueText.textContent = JOBS.join('\n');
      dialogueChoices.innerHTML = '';
      var contactBtn = document.createElement('button');
      contactBtn.type = 'button';
      contactBtn.id = 'contactBtn';
      contactBtn.className = 'btn-line';
      contactBtn.textContent = '無料見積りする';
      contactBtn.addEventListener('click', function () {
        window.open(LINE_URL, '_blank');
      });
      dialogueChoices.appendChild(contactBtn);
      appendCloseButton();
      show(dialogueOverlay);
      setMode('talk');
    }
    function renderToronView() {
      dialogueName.textContent = 'とろん君';
      dialogueText.textContent =
        'HP: 100\n攻撃力: 20\n防御力: 30\n素早さ: 10\n\n' +
        'リクガメをモチーフに作成された\n' +
        'とろんぷらすのマスコット。\n' +
        '礼儀正しくのんびりした性格だが\n' +
        '困っている人を放っておけない責任感も持つ。';
      dialogueChoices.innerHTML = '';
      appendCloseButton();
      show(dialogueOverlay);
      setMode('talk');
    }
    if (showToron) {
      renderToronView();
      return;
    }
    if (showJobs && currentVillager && currentVillager.isMayor) {
      renderJobsView();
      return;
    }
    dialogueName.textContent = villager.name;
    dialogueText.textContent = villager.text;
    dialogueChoices.innerHTML = '';
    if (villager.isMayor) {
      var showJobsBtn = document.createElement('button');
      showJobsBtn.type = 'button';
      showJobsBtn.id = 'showJobsBtn';
      showJobsBtn.textContent = '▶ 業務内容を見る';
      showJobsBtn.addEventListener('click', function () {
        if (currentVillager && currentVillager.isMayor) {
          showJobs = true;
          showCompany = false;
          showToron = false;
          renderJobsView();
        }
      });
      var companyBtn = document.createElement('button');
      companyBtn.type = 'button';
      companyBtn.textContent = '▶ 会社概要を見る';
      companyBtn.addEventListener('click', function () {
        showCompany = true;
        showJobs = false;
        showToron = false;
        if (companyBody) companyBody.textContent = '屋号：便利屋とろんぷらす\n住所：岐阜県羽島市竹鼻町3006-1\n代表：鉄谷松雄\n\nお問い合わせはLINEからお願いします\n※営業電話はお断りしております\n\n岐阜市周辺対応\n営業時間：8:00〜17:00\n\n地域密着で困りごとを解決する便利屋サービスです。';
        show(companyOverlay);
        setMode('talk');
      });
      dialogueChoices.appendChild(showJobsBtn);
      dialogueChoices.appendChild(companyBtn);
    }
    if (villager.hasQuest && !completedQuests[villager.quest]) {
      var solveBtn = document.createElement('button');
      solveBtn.type = 'button';
      solveBtn.textContent = '▶ 解決する';
      solveBtn.addEventListener('click', function () {
        startQuestForVillager(villager);
      });
      dialogueChoices.appendChild(solveBtn);
    }
    if (villager.id === 'villager_toron_info') {
      var showToronBtn = document.createElement('button');
      showToronBtn.type = 'button';
      showToronBtn.id = 'showToronBtn';
      showToronBtn.textContent = '▶ とろん君について詳しく見る';
      showToronBtn.addEventListener('click', function () {
        showToron = true;
        showJobs = false;
        showCompany = false;
        renderToronView();
      });
      dialogueChoices.appendChild(showToronBtn);
    }
    appendCloseButton();
    show(dialogueOverlay);
    setMode('talk');
  }

  function getExpToNextLevel() {
    if (playerLevel >= 5) return null;
    return EXP_TO_NEXT_LEVEL[playerLevel - 1];
  }

  function addExpAndCheckLevelUp(expGained) {
    var levelsGained = [];
    var exp = expGained;
    while (playerLevel < 5 && exp > 0) {
      var need = getExpToNextLevel();
      if (!need) break;
      var space = need - playerExp;
      var add = Math.min(exp, space);
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
    return playerExp + '/' + getExpToNextLevel();
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

  function startBattle(questId) {
    if (killBgmResumeTimer) {
      clearTimeout(killBgmResumeTimer);
      killBgmResumeTimer = null;
    }
    var m = MONSTERS[questId];
    var pool = quizData[m.quizKey] || [];
    currentBattle = {
      questId: questId,
      enemyHp: m.hp,
      enemyHpMax: m.hp,
      monster: m,
      quizPool: pool,
      usedQuizIndices: [],
      lastEnemyHp: m.hp,
      killSePlayed: false
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
    setMode('battle');
    showPlayerTurn();
    updatePlayerStatusDisplay();
    playBattleBgm();
    show(battleOverlay);
  }

  function onEnemyHpChanged(newHp) {
    if (!currentBattle) return;
    var prevHp = typeof currentBattle.lastEnemyHp === 'number' ? currentBattle.lastEnemyHp : newHp;
    var crossedToDead = prevHp > 0 && newHp <= 0;
    if (crossedToDead && !currentBattle.killSePlayed) {
      currentBattle.killSePlayed = true;
      // 同時再生禁止: 撃破時にバトルBGMを停止
      if (battleBgm) {
        battleBgm.pause();
        try { battleBgm.currentTime = 0; } catch (e) { /* ignore */ }
      }
      var killSe = new Audio('kill.mp3');
      killSe.volume = 0.5;
      killSe.play().catch(function () { /* ignore */ });
      // 0.8秒後にフィールドBGMを再開（撃破SEの余韻を確保）
      if (killBgmResumeTimer) clearTimeout(killBgmResumeTimer);
      killBgmResumeTimer = setTimeout(function () {
        killBgmResumeTimer = null;
        playFieldBgm();
      }, 800);
    }
    currentBattle.lastEnemyHp = newHp;
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
    var m = currentBattle.monster;
    playAttackSe();
    var dmg = 10 + Math.floor(Math.random() * 11);
    currentBattle.enemyHp = Math.max(0, currentBattle.enemyHp - dmg);
    onEnemyHpChanged(currentBattle.enemyHp);
    battleMsg.textContent = 'とろん君の 作業する！\n' + dmg + 'ダメージ！';
    battleEnemyHp.textContent = currentBattle.enemyHp;
    if (battleEnemyHpInner) {
      battleEnemyHpInner.style.width = (currentBattle.enemyHp / currentBattle.enemyHpMax * 100) + '%';
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
      var expGained = EXP_PER_MONSTER[currentBattle.questId] || 10;
      var levelsGained = addExpAndCheckLevelUp(expGained);
      updatePlayerStatusDisplay();
      var msg = m.name + 'を やっつけた！\n' + expGained + ' EXP を かくとく！';
      if (levelsGained.length > 0) {
        msg += '\n\nとろん君は レベル' + levelsGained[levelsGained.length - 1] + ' になった！\n' + levelTitles[levelsGained[levelsGained.length - 1] - 1];
      }
      battleMsg.textContent = msg;
      battleCommands.classList.add('hidden');
      battleQuizChoices.classList.add('hidden');
      battleSubCommands.classList.remove('hidden');
      battleSubCommands.innerHTML = '';
      var nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'battle-cmd';
      nextBtn.textContent = '▶ つづける';
      nextBtn.addEventListener('click', function () {
        hide(battleOverlay);
        if (!completedQuests[currentBattle.questId]) {
          completedQuests[currentBattle.questId] = true;
          if (incrementQuestClearCount()) return;
        }
        activeQuest = 0;
        drawMap();
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
    var pool = currentBattle.quizPool;
    var used = currentBattle.usedQuizIndices;
    var available = pool.map(function (_, i) { return i; }).filter(function (i) { return used.indexOf(i) === -1; });
    if (available.length === 0) {
      currentBattle.usedQuizIndices = [];
      return Math.floor(Math.random() * pool.length);
    }
    var idx = available[Math.floor(Math.random() * available.length)];
    currentBattle.usedQuizIndices.push(idx);
    return idx;
  }

  function shuffleArray(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function showMonsterQuiz() {
    var m = currentBattle.monster;
    var pool = currentBattle.quizPool;
    var idx = getUnusedQuizIndex();
    var q = pool[idx];
    var indices = shuffleArray(q.choices.map(function (_, i) { return i; }));
    var shuffledChoices = indices.map(function (i) { return q.choices[i]; });
    var newAnswerIndex = indices.indexOf(q.answer);
    currentBattle.currentQuiz = { question: q.question, choices: shuffledChoices, answer: newAnswerIndex, tip: q.tip || '' };
    battleMsg.textContent = m.name + 'の クイズ！\n\n' + currentBattle.currentQuiz.question;
    battleQuizChoices.innerHTML = '';
    currentBattle.currentQuiz.choices.forEach(function (choice, i) {
      var prefix = i === 0 ? '① ' : i === 1 ? '② ' : '③ ';
      var btn = document.createElement('button');
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
    var q = currentBattle.currentQuiz;
    var correct = selectedIndex === q.answer;
    battleQuizChoices.classList.add('hidden');
    battleQuizChoices.innerHTML = '';
    var tipText = q.tip ? '\n\n豆知識\n' + q.tip : '';
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
      var retryBtn = document.createElement('button');
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
    var nextBtn = document.createElement('button');
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

  function showClearOverlay(questId) {
    clearMessage.textContent = 'ありがとう！助かったよ！';
    show(clearOverlay);
  }

  function renderEndingTexts() {
    if (!endingRoll) return;
    endingRoll.innerHTML = '';
    ENDING_TEXTS.forEach(function (t, i) {
      var p = document.createElement('p');
      p.textContent = t;
      p.setAttribute('data-index', String(i));
      endingRoll.appendChild(p);
    });
  }

  function onQuestClearCountChanged() {
    if (questClearCount >= 3) {
      showEndingOverlay();
      return true;
    }
    return false;
  }

  function incrementQuestClearCount() {
    questClearCount += 1;
    return onQuestClearCountChanged();
  }

  function showEndingOverlay() {
    if (endingCtaTimer) {
      clearTimeout(endingCtaTimer);
      endingCtaTimer = null;
    }
    setMode('ending');
    hide(clearOverlay);
    hide(dialogueOverlay);
    hide(companyOverlay);
    hide(battleOverlay);
    show(endingOverlay);
    if (endingCta) hide(endingCta);
    if (endingRoll) {
      endingRoll.style.animation = 'none';
      endingRoll.style.animationDuration = '40s';
      endingRoll.offsetHeight;
      endingRoll.style.animation = '';
    }
    endingCtaTimer = setTimeout(function () {
      endingCtaTimer = null;
      if (endingCta) show(endingCta);
    }, 12000);
  }

  function startGame() {
    if (endingCtaTimer) {
      clearTimeout(endingCtaTimer);
      endingCtaTimer = null;
    }
    hide(titleScreen);
    show(mapScreen);
    hide(endingOverlay);
    // タイトル画面では再生せず、ゲーム開始時に再生
    playFieldBgm();
    if (canvas) {
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      ctx = canvas.getContext('2d');
    }
    drawMap();
    updatePlayerPos();
    updatePlayerStatusDisplay();
    setMode('field');
  }

  function bindElements() {
    canvas = document.getElementById('game-canvas');
    if (canvas) ctx = canvas.getContext('2d');
    titleScreen = document.getElementById('title-screen');
    mapScreen = document.getElementById('map-screen');
    mapHint = document.getElementById('map-hint');
    dpad = document.getElementById('dpad');
    actionButtons = document.getElementById('action-buttons');
    btnTalk = document.getElementById('btn-talk');
    btnSearch = document.getElementById('btn-search');
    btnCancelAction = document.getElementById('btn-cancel-action');
    playerLvNum = document.getElementById('player-lv-num');
    playerExpNum = document.getElementById('player-exp-num');
    playerHpNum = document.getElementById('player-hp-num');
    playerHpMaxNum = document.getElementById('player-hp-max-num');
    dialogueOverlay = document.getElementById('dialogue-overlay');
    dialogueName = document.getElementById('dialogue-name');
    dialogueText = document.getElementById('dialogue-text');
    dialogueChoices = document.getElementById('dialogue-choices');
    battleOverlay = document.getElementById('battle-overlay');
    battleEnemyName = document.getElementById('battle-enemy-name');
    battleEnemyHp = document.getElementById('battle-enemy-hp');
    battleEnemyHpMax = document.getElementById('battle-enemy-hp-max');
    battleEnemySprite = document.getElementById('battle-enemy-sprite');
    battleEnemyHpInner = document.getElementById('battle-enemy-hp-inner');
    damagePopup = document.getElementById('damage-popup');
    battlePlayerLv = document.getElementById('battle-player-lv');
    battlePlayerExp = document.getElementById('battle-player-exp');
    battlePlayerHp = document.getElementById('battle-player-hp');
    battlePlayerHpMax = document.getElementById('battle-player-hp-max');
    battleMsg = document.getElementById('battle-msg');
    battleCommands = document.getElementById('battle-commands');
    battleQuizChoices = document.getElementById('battle-quiz-choices');
    battleSubCommands = document.getElementById('battle-sub-commands');
    clearOverlay = document.getElementById('clear-overlay');
    clearMessage = document.getElementById('clear-message');
    btnLine = document.getElementById('btn-line');
    var btnLineTop = document.getElementById('btn-line-top');
    if (btnLineTop && LINE_URL) {
      btnLineTop.href = LINE_URL;
    }
    btnClearClose = document.getElementById('btn-clear-close');
    companyOverlay = document.getElementById('company-overlay');
    companyBody = document.getElementById('company-body');
    btnCloseCompany = document.getElementById('btn-close-company');
    endingOverlay = document.getElementById('ending-overlay');
    endingRoll = document.getElementById('ending-roll');
    endingCta = document.getElementById('ending-cta');
    btnEndingLine = document.getElementById('btn-ending-line');
    btnEndingTitle = document.getElementById('btn-ending-title');
    renderEndingTexts();
  }

  function init() {
    bindElements();
    // 初期状態がタイトル画面なら停止（念のため）
    syncBgmWithScreen();

    // ページ離脱・画面非表示で停止（ブラウザ制限対策の保険）
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stopBgm();
    });
    window.addEventListener('pagehide', stopBgm);
    window.addEventListener('beforeunload', stopBgm);

    // タイトルへ戻る/戻ったとき（map-screen が hidden になったとき）に停止
    // （現状は title と map を hidden/unhidden で切り替えるため class 監視で対応）
    if (titleScreen && mapScreen && typeof MutationObserver !== 'undefined') {
      var obs = new MutationObserver(function () { syncBgmWithScreen(); });
      obs.observe(titleScreen, { attributes: true, attributeFilter: ['class'] });
      obs.observe(mapScreen, { attributes: true, attributeFilter: ['class'] });
    }

    if (btnTalk) btnTalk.addEventListener('click', function () {
      var villager = isAdjacentToVillager();
      if (villager) openDialogue(villager);
    });

    if (btnSearch) btnSearch.addEventListener('click', function () {
      setMode('inspect');
      var target = getAdjacentSearchTarget();
      if (!target) {
        setMode('field');
        return;
      }
      if (target.type === TILE_GRASS_SPOT && activeQuest === 1) { startBattle(1); return; }
      if (target.type === TILE_JUNK_SPOT && activeQuest === 2) { startBattle(2); return; }
      if (target.type === TILE_AC_SPOT && activeQuest === 3) { startBattle(3); return; }
      if (target.type === TILE_SIGN) {
        var signType = SIGN_AT[target.row + ',' + target.col];
        if (signType && SIGN_MESSAGES[signType]) {
          dialogueName.textContent = signType === 'entrance' ? '村の入口看板' : '村の案内看板';
          dialogueText.textContent = SIGN_MESSAGES[signType];
          dialogueChoices.innerHTML = '';
          var closeBtn = document.createElement('button');
          closeBtn.type = 'button';
          closeBtn.textContent = '▶ 閉じる';
          closeBtn.addEventListener('click', function () {
            hide(dialogueOverlay);
            setMode('field');
          });
          dialogueChoices.appendChild(closeBtn);
          show(dialogueOverlay);
          setMode('talk');
        }
        return;
      }
      if (target.type === TILE_PLAYER_HOUSE_OBJ) {
        dialogueName.textContent = '';
        dialogueText.textContent = 'とろん君の家だ。\nここから村の人たちを助けに行こう！';
        dialogueChoices.innerHTML = '';
        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = '▶ 閉じる';
        closeBtn.addEventListener('click', function () {
          hide(dialogueOverlay);
          setMode('field');
        });
        dialogueChoices.appendChild(closeBtn);
        show(dialogueOverlay);
        setMode('talk');
      }
    });

    if (btnCancelAction) btnCancelAction.addEventListener('click', function () {
      if (actionButtons) actionButtons.classList.add('hidden');
    });

    document.querySelectorAll('.battle-cmd').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var cmd = btn.dataset.cmd;
        if (cmd === 'work') doWork();
        if (cmd === 'run') {
          hide(battleOverlay);
          setMode('field');
          playFieldBgm();
          battleMsg.textContent = '';
          battleCommands.classList.remove('hidden');
          battleQuizChoices.classList.add('hidden');
          battleQuizChoices.innerHTML = '';
          battleSubCommands.classList.add('hidden');
          battleSubCommands.innerHTML = '';
        }
      });
    });

    if (btnLine) btnLine.addEventListener('click', function () { window.open(LINE_URL, '_blank'); });
    if (btnEndingLine) btnEndingLine.addEventListener('click', function () {
      if (LINE_URL && LINE_URL !== '#') window.location.href = LINE_URL;
      else window.open(LINE_URL, '_blank');
    });
    if (btnEndingTitle) btnEndingTitle.addEventListener('click', function () { setMode('title'); });
    if (btnClearClose) btnClearClose.addEventListener('click', function () {
      hide(clearOverlay);
      setMode('field');
      updateActionButtons();
      if (mapHint) mapHint.textContent = '';
    });
    if (btnCloseCompany) btnCloseCompany.addEventListener('click', function () {
      showCompany = false;
      hide(companyOverlay);
      setMode('field');
    });

    var btnStart = document.getElementById('btn-start');
    if (btnStart) btnStart.addEventListener('click', startGame);

    document.addEventListener('keydown', function (e) {
      if (!mapScreen || mapScreen.classList.contains('hidden')) return;
      if (mode !== 'field') return;
      if (e.key === 'Enter') {
        if (mode === 'field' && isNearSign() && (!dialogueOverlay || dialogueOverlay.classList.contains('hidden'))) {
          e.preventDefault();
          dialogueName.textContent = '看板';
          dialogueText.textContent = '便利屋とろんぷらすへようこそ！';
          dialogueChoices.innerHTML = '';
          var closeBtn = document.createElement('button');
          closeBtn.type = 'button';
          closeBtn.textContent = '▶ 閉じる';
          closeBtn.addEventListener('click', function () {
            hide(dialogueOverlay);
            setMode('field');
          });
          dialogueChoices.appendChild(closeBtn);
          show(dialogueOverlay);
          setMode('talk');
          return;
        }
      }
      switch (e.key) {
        case 'ArrowUp': e.preventDefault(); move(-1, 0); break;
        case 'ArrowDown': e.preventDefault(); move(1, 0); break;
        case 'ArrowLeft': e.preventDefault(); move(0, -1); break;
        case 'ArrowRight': e.preventDefault(); move(0, 1); break;
      }
    });

    function handleDpadDir(dir) {
      if (mode !== 'field') return;
      if (dir === 'up') move(-1, 0);
      if (dir === 'down') move(1, 0);
      if (dir === 'left') move(0, -1);
      if (dir === 'right') move(0, 1);
    }
    if (dpad) {
      dpad.addEventListener('click', function (e) {
        var btn = e.target.closest('.dpad-btn[data-dir]');
        if (!btn) return;
        handleDpadDir(btn.dataset.dir);
      });
      dpad.addEventListener('touchstart', function (e) {
        var btn = e.target.closest('.dpad-btn[data-dir]');
        if (!btn) return;
        e.preventDefault();
        handleDpadDir(btn.dataset.dir);
      }, { passive: false });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
