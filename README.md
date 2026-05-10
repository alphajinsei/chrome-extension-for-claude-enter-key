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

- `manifest.json` で `run_at: "document_start"` を指定し、Claude のスクリプトより先にロードする
- `window` の `keydown` を `capture: true` で先取りし、対象が `.ProseMirror` 内のときだけ介入する
- IME 変換中（`e.isComposing` または `e.keyCode === 229`）と `Shift+Enter` は完全に素通し
- 通常の Enter → **合成の `Shift+Enter` キーイベントを editor に dispatch** して、ProseMirror のキーマップ経由で改行させる
- Ctrl/Cmd + Enter → `preventDefault()` 後、入力欄を含む `fieldset` / `form` 内の `aria-label` に "Send" or "送信" を含むボタンを `.click()`

## 実装上の要点（はまったところ）

この拡張を素直に書くと動かない／壊れる箇所が 2 つあるので、対策を残しておく。

### 1. リスナー登録は `document_start` + `window` の capture フェーズで

最初は `document_idle` + `document` の capture で書いたら、

- 通常 Enter → Claude が**先に**送信処理してしまい、`preventDefault()` が間に合わない
- Ctrl+Enter → Claude のショートカット（サイドバーのチャット項目メニュー）が**先に**発火してしまう

という症状になった。Chrome 拡張のコンテンツスクリプトは `document_idle` だと Claude のアプリ初期化より後にロードされ、capture フェーズの順序でも後ろに回る。`document_start` で `window` 直下に capture リスナーを付けることで最優先で横取りでき、`stopImmediatePropagation()` が効くようになる。

### 2. ProseMirror の内部状態を経由しない改行挿入は巻き戻される

「Enter で改行を入れる」処理として、

- `document.execCommand('insertLineBreak')`
- `dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertLineBreak' }))`
- 手動で `<br>` を Range に挿入

を試したが、**Shift+Enter で既に入れていた改行まで消える**という不具合が出た。

原因は ProseMirror が独自のドキュメント状態を持っていて DOM を監視しているため。上記のような「PM の状態を経由せず DOM だけを書き換える」アプローチをすると、PM が「予期しない DOM 変更」と判断して自分が知っている状態（=改行が無い、もしくは少ない状態）にロールバックしてしまう。

解決策は単純で、**合成の `Shift+Enter` `KeyboardEvent` を editor に `dispatchEvent` する**だけ。

```js
editor.dispatchEvent(new KeyboardEvent('keydown', {
  key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
  shiftKey: true, bubbles: true, cancelable: true, composed: true
}));
```

PM のキーマップは合成イベント（`isTrusted: false`）でも反応するので、PM のコマンド経由で正規の改行挿入が走り、内部状態と DOM が一致したまま改行が入る。自分の window-capture ハンドラがこの合成イベントを再受信するが、`shiftKey === true` で早期 return しているのでループにはならない。

### 3. 送信ボタンの検索は入力欄付近に限定する

`button[type="submit"]` のような広い selector で送信ボタンを探すと、サイドバーや別パネルのボタンを誤クリックする。本拡張では `editor.closest('fieldset')` / `closest('form')` の中だけを `aria-label` で `Send` / `送信` を含むかでフィルタしている。最終フォールバックも「画面上にちょうど 1 つだけマッチするボタン」がある場合のみ採用する。

## ライセンス

MIT
