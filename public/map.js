/**
 * map.js - 村マップのタイルデータ（固定ファイル）
 *
 * ※ マップデータはこのファイルのみで管理する。
 * ※ game.js は mapData を読み込んで描画するだけ。このファイルを編集しないこと。
 *
 * タイル: 0=草, 1=壁/箱, 2=木, 3=道, 4=中央, 5=池, 6=家, 7=プレイヤー家, 8=門/柵（通行不可）, 9=畑
 * 編集ルール: 上エリア＝行 index 0〜9（南北の主道・プラザ行10より上）は原則変更禁止。下側のみ行10以降を調整可。
 * 畑: 行12〜14・列15〜17。外周木＋北西木箱(1)。入り口(12,14)のみ草。
 * 看板の論理座標は game.js の SIGN_AT（マップタイルとは別）。
 */
(function (global) {
  'use strict';

  var TILE_SIZE = 32;

  var TILE_GROUND = 0;
  var TILE_WALL = 1;
  var TILE_TREE = 2;
  var TILE_ROAD = 3;
  var TILE_CENTER = 4;
  var TILE_WATER = 5;
  var TILE_HOUSE = 6;
  var TILE_PLAYER_HOUSE = 7;
  var TILE_GATE = 8;
  var TILE_FIELD = 9;
  // オブジェクト用（getTileTypeAt で重ねて返す値）
  var TILE_VILLAGER = 10;
  var TILE_SIGN = 11;
  var TILE_GRASS_SPOT = 12;
  var TILE_JUNK_SPOT = 13;
  var TILE_AC_SPOT = 14;
  var TILE_PLAYER_HOUSE_OBJ = 15;

  var MAP_ROWS = 20;
  var MAP_COLS = 20;

  /** 村マップ 2次元配列（このファイル以外で変更しない） */
  var mapData = [
    [8,8,8,8,8,8,8,8,8,8,0,8,8,8,8,8,8,8,8,8],
    [8,2,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,2,8],
    [8,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,2,0,8],
    [8,0,1,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,8],
    [8,0,0,2,2,0,0,0,0,2,3,2,0,0,2,2,6,0,0,8],
    [8,0,0,0,6,0,0,0,0,0,3,0,0,0,6,0,0,0,0,8],
    [8,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,8],
    [8,0,0,0,0,0,7,0,0,0,3,0,0,0,0,0,0,0,0,8],
    [8,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,8],
    [8,0,0,0,0,0,0,0,0,0,3,0,1,0,0,0,0,0,0,8],
    [8,3,3,3,3,3,3,3,3,3,4,3,3,3,3,3,3,3,3,8],
    [8,0,0,0,0,0,0,0,0,0,3,0,0,0,1,2,2,2,1,8],
    [8,0,0,0,0,0,0,0,0,0,3,0,0,0,0,9,9,9,2,8],
    [8,1,0,0,0,0,0,6,0,2,3,0,0,0,6,9,9,9,2,8],
    [8,0,0,0,0,0,2,0,0,2,3,0,0,0,2,9,9,9,2,8],
    [8,0,2,5,5,5,0,0,0,2,3,1,0,0,2,2,2,2,2,8],
    [8,0,2,5,5,5,0,0,0,0,3,0,0,0,6,0,0,0,0,8],
    [8,0,2,5,5,5,0,0,0,0,3,0,0,0,0,0,0,0,0,8],
    [8,2,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,2,8],
    [8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8,8]
  ];

  /** 柵（TILE_GATE）マスの座標。mapData と同期（通行不可判定用） */
  var FENCE_TILE_COORDS = [];
  for (var fr = 0; fr < MAP_ROWS; fr++) {
    for (var fc = 0; fc < MAP_COLS; fc++) {
      if (mapData[fr][fc] === TILE_GATE) {
        FENCE_TILE_COORDS.push({ row: fr, col: fc });
      }
    }
  }

  // プレイヤー家タイル（mapData の 7 と連動、参照用）— 1マス
  var PLAYER_HOUSE_TILES = [[7,6]];

  global.TILE_SIZE = TILE_SIZE;
  global.TILE_GROUND = TILE_GROUND;
  global.TILE_WALL = TILE_WALL;
  global.TILE_TREE = TILE_TREE;
  global.TILE_ROAD = TILE_ROAD;
  global.TILE_CENTER = TILE_CENTER;
  global.TILE_WATER = TILE_WATER;
  global.TILE_HOUSE = TILE_HOUSE;
  global.TILE_PLAYER_HOUSE = TILE_PLAYER_HOUSE;
  global.TILE_GATE = TILE_GATE;
  global.TILE_FIELD = TILE_FIELD;
  global.TILE_VILLAGER = TILE_VILLAGER;
  global.TILE_SIGN = TILE_SIGN;
  global.TILE_GRASS_SPOT = TILE_GRASS_SPOT;
  global.TILE_JUNK_SPOT = TILE_JUNK_SPOT;
  global.TILE_AC_SPOT = TILE_AC_SPOT;
  global.TILE_PLAYER_HOUSE_OBJ = TILE_PLAYER_HOUSE_OBJ;
  global.MAP_ROWS = MAP_ROWS;
  global.MAP_COLS = MAP_COLS;
  global.mapData = mapData;
  global.FENCE_TILE_COORDS = FENCE_TILE_COORDS;
  global.PLAYER_HOUSE_TILES = PLAYER_HOUSE_TILES;
})(typeof window !== 'undefined' ? window : this);
