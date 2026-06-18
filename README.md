# MCH Chain Battle

Version: v28

MCH Chain Battle のブラウザゲームです。

## 起動

```bash
python3 -m http.server 8000
```

```text
http://localhost:8000
```

## 操作

PC:

```text
← / →: 移動
↑: 回転
↓: 1段落下
Space: 即落下
```

スマホ:

```text
◀ / DROP / ↻ / ▶
```

スマホボタンの順番は `src/config.js` の `CONFIG.ui.touchButtonOrder` で変更できます。

## Assets

```text
assets/images/hero/hero.png
assets/images/boss/boss_01.png ... boss_15.png
assets/images/extension/hp.png
assets/images/extension/phy.png
assets/images/extension/int.png
assets/images/extension/agi.png
assets/audio/bgm.mp3
assets/audio/damage.mp3
assets/audio/boss_defeat.mp3
assets/audio/clear.mp3
assets/audio/win.mp3
```

## Current UI

- ホーム画面は START のみ表示
- MENU には SOUND / BUTTON ORDER / HOW TO PLAY / VIEW RESULT を表示
- リザルト画面は今回の記録確認用に整理
- ランキング機能、名前入力、ランキング送信、Supabase設定は削除

## Result screen

```text
RESULT
SCORE
BOSS Lv
DEFEATED
MAX CHAIN
HP
PHY
INT
RETRY
BACK TO TITLE
```

## Recent changes

### v28

- ランキング機能を削除しました。
- Supabaseオンラインランキング関連の設定・処理を削除しました。
- ローカルランキング保存処理を削除しました。
- ホーム画面とMENUからランキング導線を削除しました。
- リザルト画面からプレイヤー名入力とSUBMIT RANKINGを削除しました。
- リザルト画面にBACK TO TITLEボタンを追加しました。

### v27

- Supabaseを使ったオンラインランキング登録に対応しました。
- v28でランキング機能を削除したため、現在は使用していません。

### v26

- Ready状態で表示されている盤面・現在ぷよ・NEXTぷよを、START後もそのまま引き継ぐようにしました。
- START時に毎回 `createInitialState()` で作り直す処理をやめ、ゲームオーバー後のリトライ時だけ新しいstateを生成するようにしました。
- 待機中にうっすら見えるぷよと、開始後のぷよが一致するようにしました。

### v24

- NEXT表示のDOMも毎フレーム全再生成しない差分更新方式に変更しました。
- NEXT用セルを2個だけ生成して使い回す構造に変更しました。
- プレイ中だけNEXT画像が色付き四角になる問題を修正しました。

### v22

- 盤面セルDOMを使い回す差分更新方式を維持しました。
- エクステぷよ画像を `cell-art.style.backgroundImage` に直接指定する方式に変更しました。
