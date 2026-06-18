# MCH Chain Battle

Version: v24

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

## v16 update
- 通常プレイ中のエクステぷよ画像レイヤーを修正しました。
- スマホ表示時の強化ボスバッジを小型化し、ボス名と重なりにくくしました。


## v17 更新

- ランキング表示を「名前 / ボスLv / 最大連鎖 / スコア」の順に変更
- ランキングに見出しを追加し、各数字の意味が分かるように調整
- ランキング表示はトップ10件に制限


## 更新履歴

### v21
- 盤面セルDOMを毎フレーム全再生成しない差分更新方式に変更
- エクステぷよ画像を cell-art の CSS background-image 表示に一本化
- 表示用 img の二重描画を削除し、プリロード済み画像を利用する設計に整理



- v18: 通常プレイ中のエクステぷよ画像表示を背景レイヤー方式でも描画するように修正。


## v19 更新

- 通常プレイ中だけエクステ画像が表示されない問題に対し、エクステ・ヒーロー・ボス画像を起動時にプリロードする処理を追加。
- v18で追加した二重描画の背景画像レイヤーを削除し、セル内の画像表示を`img.cell-image`に一本化。
- 画像が読み込めない場合だけ文字表示に戻るよう整理。

## v20 update

- エクステぷよ画像をCSS background-imageの`.cell-art`で描画する方式に変更しました。
- `img`は表示用ではなく読み込み失敗検知用の`.cell-image-probe`として整理しました。
- 通常プレイ中の毎フレームDOM再生成でも画像表示が安定しやすいようにしました。


## v22 changes

- Kept reused board cell DOM rendering.
- Changed extension cell images to set `cell-art.style.backgroundImage` directly instead of using `--cell-image`.
- Removed redundant `cell-art` width/height sizing and CSS variable background-image usage.


## v23 changes

- NEXT表示のぷよを盤面セルとは別の専用DOMに変更しました。
- NEXT表示も`next-cell-art.style.backgroundImage`でエクステ画像を直接描画するようにしました。
- 盤面とNEXTの画像表示方式を揃え、色付き四角だけになる問題を修正しました。


## v24 changes

- NEXT表示のDOMも毎フレーム全再生成しない差分更新方式に変更しました。
- NEXT用セルを2個だけ生成して使い回す構造に変更しました。
- NEXT表示のエクステ画像も`next-cell-art.style.backgroundImage`で直接描画する構造を維持しました。
- プレイ中だけNEXT画像が色付き四角になる問題を修正しました。
