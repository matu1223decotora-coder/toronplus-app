/**
 * npc.js - 村人・看板データ
 */
(function (global) {
  'use strict';

  var VILLAGERS = [
    { id: 1, row: 2, col: 2, name: '村長', text: 'ここはとろん村だ。困りごとを解決する便利屋、とろん君がいる村だよ。', quest: 0, problemText: '' },
    { id: 2, row: 2, col: 8, name: '村人', text: 'とろん君はリクガメがモデルの便利屋ヒーローだ。草刈りや不用品回収、エアコン掃除なんでも頼めるんだ。', quest: 0, problemText: '' },
    { id: 3, row: 5, col: 5, name: '村人', text: '最近、庭の草がすごくて困っているの…', quest: 1, problemText: '庭の草が伸びすぎて困っているんだ' },
    { id: 4, row: 11, col: 8, name: '村人', text: '家の中に不用品がたまってしまって…', quest: 2, problemText: '不用品が山積みで大変なんだ…' },
    { id: 5, row: 17, col: 8, name: '村人', text: 'エアコンがカビくさくて困ってる…', quest: 3, problemText: 'エアコンがカビだらけで困ってるんだ' }
  ];

  var SIGN_AT = { '1,8': 'entrance', '10,9': 'guide' };
  var SIGN_MESSAGES = {
    entrance: 'とろん村へようこそ',
    guide: '↑ 草刈りの依頼\n↓ エアコン掃除\n← 不用品回収\n\n困ったことがあれば 村人に話しかけてみよう！'
  };

  global.VILLAGERS = VILLAGERS;
  global.SIGN_AT = SIGN_AT;
  global.SIGN_MESSAGES = SIGN_MESSAGES;
})(typeof window !== 'undefined' ? window : this);
