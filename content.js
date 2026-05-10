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
    // 1) execCommand insertLineBreak（多くの contenteditable で動く）
    try {
      if (document.execCommand('insertLineBreak')) {
        return true;
      }
    } catch (_) {}

    // 2) beforeinput イベント（モダン ProseMirror が拾う）
    try {
      const ev = new InputEvent('beforeinput', {
        inputType: 'insertLineBreak',
        bubbles: true,
        cancelable: true,
        composed: true
      });
      const notPrevented = editor.dispatchEvent(ev);
      if (!notPrevented) return true;
    } catch (_) {}

    // 3) 手動で DOM 操作 + input イベント発火
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const br = document.createElement('br');
    range.insertNode(br);
    range.setStartAfter(br);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    editor.dispatchEvent(new InputEvent('input', {
      inputType: 'insertLineBreak',
      bubbles: true,
      composed: true
    }));
    return true;
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
