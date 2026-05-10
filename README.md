# Claude Enter Key Swap

[claude.ai](https://claude.ai) の入力欄で、Enter キーの挙動を入れ替える Chrome 拡張機能です。

日本語入力者にとって標準の挙動（Enter で送信）はかなり辛いので、Slack や Notion と同じ「Enter で改行・Ctrl+Enter で送信」に変えます。IME 変換中の Enter には触らないので、変換確定で誤送信されることもありません。

## 動作仕様

| キー | 標準の挙動 | この拡張を入れた後 |
| --- | --- | --- |
| Enter | 送信 | **改行** |
| Ctrl + Enter (Win) / Cmd + Enter (Mac) | 改行 | **送信** |
| Shift + Enter | 改行 | 改行（変更なし） |
| IME 変換中の Enter | 変換確定 | 変換確定（変更なし） |

入力欄（ProseMirror エディタ）でのみ動作します。それ以外の場所のキー入力には影響しません。

## インストール方法

Chrome ウェブストアには公開していないので、ソースを直接読み込みます。

1. このリポジトリを ZIP でダウンロードするか、`git clone` する
   ```
   git clone https://github.com/alphajinsei/chrome-extension-for-claude-enter-key.git
   ```
2. Chrome で `chrome://extensions/` を開く
3. 右上の **デベロッパーモード** をオンにする
4. **パッケージ化されていない拡張機能を読み込む** をクリック
5. ダウンロード／クローンしたフォルダを選択
6. claude.ai を開いているタブをリロード

## ファイル構成

```
.
├── manifest.json   # Manifest V3 の定義
├── content.js      # キー処理本体（claude.ai に注入される）
└── README.md
```

## 仕組み

- `document` レベルの `keydown` を `capture: true` で先取り
- `e.target.closest('.ProseMirror')` で入力欄内のキーだけを対象に
- `e.isComposing` または `e.keyCode === 229` のときは何もしない（IME 変換中の保護）
- 通常の Enter は `preventDefault()` + `document.execCommand('insertLineBreak')` で改行に置き換え
- Ctrl/Cmd + Enter は送信ボタン（`button[aria-label*="Send"]` 等）を `.click()`

## ライセンス

MIT
