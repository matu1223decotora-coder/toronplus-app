(function () {
  'use strict';
  // LINE誘導URL（このプロジェクトで唯一の定義場所）
  var url = 'https://lin.ee/Wi2x4So';

  // グローバルに公開（index.html / quest.html の両方から参照する）
  if (typeof window !== 'undefined') {
    window.LINE_URL = url;
  } else if (typeof globalThis !== 'undefined') {
    globalThis.LINE_URL = url;
  }
})();

