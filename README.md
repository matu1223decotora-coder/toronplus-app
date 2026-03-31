# とろん村クエスト（toron-game）

`file://` で `index.html` を開くと、`/monsters/*.png` のような先頭スラッシュ付きパスが読み込めません。ローカルでは次の手順で HTTP サーバーを起動してください。

## 必要なもの

- [Node.js](https://nodejs.org/)（`npm` が使えること）

## セットアップと起動

```bash
npm install
npm start
```

（`serve` を devDependency で固定しています。`http://localhost:3000` で `public/` がルートになります。）

ブラウザで **http://localhost:3000** を開きます（`public/` がサイトルートとして配信されます）。

## 補足

- HTML / CSS / JS / 画像はすべて **`public/` 以下**に置いています（`/style.css` など先頭 `/` のパス）。
- VSCode **Live Server** を使う場合は、**フォルダーに `public` を指定**するか、拡張の「ルート」を `public` にしてください。
