# MCH Chain Battle

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

```js
ui: {
  touchButtonOrder: ['left', 'drop', 'rotate', 'right']
}
```

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

## Recent changes

- スマホ仮想ボタンを設定順で生成するように変更
- デフォルト順を `◀ / DROP / ↻ / ▶` に変更
- ステータス欄を文字中心から小さいエクステアイコン付き表示に変更
- 被弾モーションをキャラ揺れではなくHPバー揺れに変更
- リザルトモーダルを追加
- リザルト表示に `FULL TIME CLEAR / HERO DOWN / BOARD FULL` を追加
- プレイヤーネーム入力をリザルト上部に追加
- プレイヤーネームを同一端末で保持
- `SUBMIT RANKING` ボタンを追加。現段階ではlocalStorageへのローカル保存。Supabase接続後にオンラインランキング化予定
- スマホ縦画面でリザルトが縦長になりすぎないよう圧縮


## v13 changes

- MENU の VIEW RESULT からリザルトを開くとき、MENU パネルを自動で閉じるようにしました。
- リザルトモーダルの重なり順を上げ、他UIの背面に隠れないようにしました。

## v14 changes

- ホームのSTARTはゲーム画面への遷移のみに変更しました。
- ゲーム画面へ進んだ後、緑色のSTARTボタンを押すまでゲームが始まらないようにしました。
- ホーム画面の操作説明テキストを削除しました。
- MENU内にHOW TO PLAYを追加しました。
- ホーム画面とMENUからRANKINGを開けるようにしました。
- ローカルランキング画面を追加しました。現段階ではlocalStorage保存のランキングを表示します。
- START待機中のゲーム画面が分かるように、盤面まわりとSTARTボタンを強調表示しました。


## v15 changes
- Board tap starts the game from the ready state.
- Board tap resumes from pause.
- Board overlay shows TAP TO START / TAP TO RESUME.
- Board header now shows MAX chain instead of previous chain.
- MENU is now a popover on PC instead of an always-open panel.
