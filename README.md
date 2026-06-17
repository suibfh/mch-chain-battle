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


## v12 update

- スマホ表示でゲーム全体を中央寄せに調整
- ぷよ盤面の幅を画面高さにも応じて縮小する設定を追加
- 仮想ボタンを横幅いっぱいの4等分表示に変更
- MENU内で仮想ボタンの並びを任意に入れ替え可能に変更
- ボタン配置をlocalStorageに保存
- リザルトを閉じた後もMENU内のVIEW RESULTから再表示可能に変更
