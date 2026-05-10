(() => {
  'use strict';

  const TAG = '[Claude Enter Swap]';

  function findEditor(target) {
    if (!target || typeof target.closest !== 'function') return null;
    return target.closest('.ProseMirror');
  }

  function findSendButton(editor) {
    // 入力欄を含むコンテナに限定して検索（サイドバーなどの無関係なボタンを誤クリックしないため）
    const containers = [
      editor.closest('fieldset'),
      editor.closest('form'),
      editor.parentElement && editor.parentElement.closest('div[class*="composer" i]'),
      editor.parentElement && editor.parentElement.closest('div[class*="input" i]')
    ].filter(Boolean);

    for (const c of containers) {
      const buttons = c.querySelectorAll('button:not([disabled])');
      for (const btn of buttons) {
        const label = (btn.getAttribute('aria-label') || '').toLowerCase();
        if (label.includes('send') || label.includes('送信')) return btn;
      }
    }

    // 最終フォールバック: aria-label に "Send message" を含むボタンが画面上に1つだけならそれを採用
    const candidates = document.querySelectorAll(
      'button[aria-label*="Send message" i]:not([disabled])'
    );
    if (candidates.length === 1) return candidates[0];

    return null;
  }

  function insertNewline(editor) {
    // ProseMirror に Shift+Enter として処理させる。直接 DOM を書き換えると PM の
    // 内部状態とずれて巻き戻されるので、PM のキーマップを通すのが確実。
    // 自分の window-capture ハンドラは shiftKey=true で早期 return するのでループしない。
    const init = {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
      composed: true
    };
    editor.dispatchEvent(new KeyboardEvent('keydown', init));
  }

  function handleKeydown(e) {
    if (e.key !== 'Enter') return;

    const editor = findEditor(e.target);
    if (!editor) return;

    // IME 変換中は一切触らない
    if (e.isComposing || e.keyCode === 229) return;

    // Shift+Enter は標準のまま（改行）
    if (e.shiftKey) return;

    if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd+Enter → 送信
      e.preventDefault();
      e.stopImmediatePropagation();
      const btn = findSendButton(editor);
      if (btn) {
        btn.click();
      } else {
        console.warn(TAG, '送信ボタンが見つかりません');
      }
      return;
    }

    // 通常の Enter → 改行
    e.preventDefault();
    e.stopImmediatePropagation();
    insertNewline(editor);
  }

  // window の capture フェーズで最優先に拾う（document_start で登録 → Claude のハンドラより先に動く）
  window.addEventListener('keydown', handleKeydown, { capture: true });

  console.debug(TAG, 'loaded');
})();
