# NYA3NEKO2 GAMES (正月バカゲーシリーズ)

Nya3Neko2が贈る、カオスでめでたい正月バカゲー・コレクション。

## 🎮 収録ゲーム

### 1. 🍊 鏡餅スタッカー (Mochi Stacker)
鏡餅をどこまでも高く積み上げる、物理演算カオスゲーム。
- **特徴**: matter-jsによるカオスな物理、積み上げるほど増す難易度、神社背景の祝祭感。
- **URL**: `/mochi-stack/`

### 2. 🥁 もちリズム (Mochi Rhythm)
杵（F）と手（J）を使い分け、リズムに合わせて餅をつきまくる本格リズムゲーム。
- **特徴**: 縦型ツインレーン方式、特許配慮、10個で一山の餅スタックビジュアル、Retina対応の高精細描画。
- **URL**: `/mochi-rhythm/`

### 3. 🎍 門松・オブ・ツリー (Tree Stack)
門松やクリスマスツリーを高く積み上げるスタッキングゲーム。
- **特徴**: 豪華な装飾、星を戴く頂点を目指せ。
- **URL**: `/tree-stack/`

### 4. 👺 だるまランナー (Daruma Runner)
だるまが転がりながら「一富士二鷹三茄子」を避ける、Googleタイポなインフィニティ・ランナー。
- **特徴**: 爽快なジャンプアクション、めでたい障害物、スコアアタック。
- **URL**: `/daruma-game/`

---

## 🚀 技術スタック

- **Core**: Vanilla JS / HTML5 Canvas
- **Build Tool**: Vite (Multi-Page App)
- **Physics**: matter-js (Mochi Stacker等で使用)
- **Deployment**: Cloudflare Pages
- **Design System**: Festive Brutalism (祝祭系ブルータリズム)

## 🛠 開発者向け情報

### セットアップ
```bash
npm install
```

### ローカル実行
```bash
npm run dev
```

### ビルド
```bash
npm run build
```

### デプロイ
```bash
npx wrangler pages deploy dist --project-name kagamimochi-game
```

---

## 👸 Author
**Nya3Neko2**
- [Portfolio](https://nya3neko2.dev)
- [X (Twitter)](https://twitter.com/nya3_neko2)
- [GitHub](https://github.com/nyanko3141592)
