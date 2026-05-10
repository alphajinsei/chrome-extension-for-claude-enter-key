(() => {
  'use strict';

  function isInProseMirror(target) {
    if (!target || typeof target.closest !== 'function') return false;
    return !!target.closest('.ProseMirror');
  }

  function findSendButton() {
    const selectors = [
      'button[aria-label="Send message"]',
      'button[aria-label="Send Message"]',
      'button[aria-label*="Send" i]',
      'button[aria-label*="送信"]',
      'fieldset button[type="submit"]',
      'button[type="submit"]'
    ];
    for (const sel of selectors) {
      const btn = document.querySelector(sel);
      if (btn && !btn.disabled) return btn;
    }
    return null;
  }

  function insertNewline(target) {
    if (document.execCommand) {
      try {
        if (document.execCommand('insertLineBreak')) return;
      } catch (_) {}
    }
    const event = new InputEvent('beforeinput', {
      inputType: 'insertLineBreak',
      bubbles: true,
      cancelable: true
    });
    target.dispatchEvent(event);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (!isInProseMirror(e.target)) return;

    // IME変換中は一切触らない
    if (e.isComposing || e.keyCode === 229) return;

    // Shift+Enter は元のまま（既に改行扱いなので素通し）
    if (e.shiftKey) return;

    // Ctrl/Cmd+Enter → 送信
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopImmediatePropagation();
      const btn = findSendButton();
      if (btn) btn.click();
      return;
    }

    // 通常の Enter → 改行
    e.preventDefault();
    e.stopImmediatePropagation();
    insertNewline(e.target);
  }, { capture: true });
})();
