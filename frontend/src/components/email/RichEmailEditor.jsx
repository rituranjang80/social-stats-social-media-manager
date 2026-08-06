import { useCallback, useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import {
  Bold, Italic, Underline, List, ListOrdered, Link2, Image, Code,
  Undo2, Redo2, Variable, Palette, Table2,
} from 'lucide-react';

import styles from './RichEmailEditor.module.scss';

const DEFAULT_VARS = [
  '{{company_name}}',
  '{{company_logo}}',
  '{{client_name}}',
  '{{client_email}}',
  '{{accept_invitation_url}}',
  '{{login_url}}',
  '{{support_email}}',
  '{{support_phone}}',
  '{{current_year}}',
];

export default function RichEmailEditor({
  value = '',
  onChange,
  placeholderVariables = DEFAULT_VARS,
  ariaLabel = 'Email body',
}) {
  const editorRef = useRef(null);
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceHtml, setSourceHtml] = useState(value);

  useEffect(() => {
    if (!sourceMode && editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
    setSourceHtml(value || '');
  }, [value, sourceMode]);

  const emitChange = useCallback((html) => {
    const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
    onChange?.(clean);
  }, [onChange]);

  const exec = (cmd, arg = null) => {
    if (sourceMode) return;
    document.execCommand(cmd, false, arg);
    editorRef.current?.focus();
    emitChange(editorRef.current?.innerHTML || '');
  };

  const insertVariable = (token) => {
    if (sourceMode) {
      const next = `${sourceHtml}${token}`;
      setSourceHtml(next);
      emitChange(next);
      return;
    }
    document.execCommand('insertText', false, token);
    emitChange(editorRef.current?.innerHTML || '');
  };

  const onSourceBlur = () => {
    emitChange(sourceHtml);
  };

  return (
    <div className={styles.root}>
      <div className={styles.toolbar} role="toolbar" aria-label="Formatting">
        <button type="button" className={styles.toolBtn} onClick={() => exec('bold')} aria-label="Bold"><Bold size={15} /></button>
        <button type="button" className={styles.toolBtn} onClick={() => exec('italic')} aria-label="Italic"><Italic size={15} /></button>
        <button type="button" className={styles.toolBtn} onClick={() => exec('underline')} aria-label="Underline"><Underline size={15} /></button>
        <label className={styles.colorWrap} title="Text color">
          <Palette size={14} aria-hidden="true" />
          <input
            type="color"
            className={styles.colorInput}
            defaultValue="#334155"
            onChange={(e) => exec('foreColor', e.target.value)}
            aria-label="Text color"
          />
        </label>
        <select
          className={styles.sizeSelect}
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) exec('fontSize', e.target.value);
            e.target.value = '';
          }}
          aria-label="Font size"
          title="Font size"
        >
          <option value="">Size…</option>
          <option value="2">Small</option>
          <option value="3">Normal</option>
          <option value="4">Large</option>
          <option value="5">Extra large</option>
        </select>
        <span className={styles.sep} aria-hidden="true" />
        <button type="button" className={styles.toolBtn} onClick={() => exec('insertUnorderedList')} aria-label="Bullet list"><List size={15} /></button>
        <button type="button" className={styles.toolBtn} onClick={() => exec('insertOrderedList')} aria-label="Numbered list"><ListOrdered size={15} /></button>
        <button type="button" className={styles.toolBtn} onClick={() => {
          const url = window.prompt('Link URL');
          if (url) exec('createLink', url);
        }} aria-label="Insert link"><Link2 size={15} /></button>
        <button type="button" className={styles.toolBtn} onClick={() => {
          const url = window.prompt('Image URL');
          if (url) exec('insertImage', url);
        }} aria-label="Insert image"><Image size={15} /></button>
        <button
          type="button"
          className={styles.toolBtn}
          onClick={() => {
            const table = (
              '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;">'
              + '<tr><td>Cell</td><td>Cell</td></tr><tr><td>Cell</td><td>Cell</td></tr></table><p></p>'
            );
            if (sourceMode) {
              const next = `${sourceHtml}${table}`;
              setSourceHtml(next);
              emitChange(next);
            } else {
              document.execCommand('insertHTML', false, table);
              emitChange(editorRef.current?.innerHTML || '');
            }
          }}
          aria-label="Insert table"
        >
          <Table2 size={15} />
        </button>
        <span className={styles.sep} aria-hidden="true" />
        <div className={styles.varWrap}>
          <Variable size={14} aria-hidden="true" />
          <select
            className={styles.varSelect}
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) insertVariable(e.target.value);
              e.target.value = '';
            }}
            aria-label="Insert variable"
          >
            <option value="">Variables…</option>
            {placeholderVariables.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <span className={styles.sep} aria-hidden="true" />
        <button type="button" className={styles.toolBtn} onClick={() => exec('undo')} aria-label="Undo"><Undo2 size={15} /></button>
        <button type="button" className={styles.toolBtn} onClick={() => exec('redo')} aria-label="Redo"><Redo2 size={15} /></button>
        <button
          type="button"
          className={`${styles.toolBtn} ${sourceMode ? styles.toolBtnActive : ''}`}
          onClick={() => setSourceMode((m) => !m)}
          aria-label="Source HTML"
          aria-pressed={sourceMode}
        >
          <Code size={15} />
        </button>
      </div>

      {sourceMode ? (
        <textarea
          className={styles.source}
          value={sourceHtml}
          onChange={(e) => setSourceHtml(e.target.value)}
          onBlur={onSourceBlur}
          aria-label={`${ariaLabel} HTML source`}
        />
      ) : (
        <div
          ref={editorRef}
          className={styles.editor}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label={ariaLabel}
          aria-multiline="true"
          onInput={() => emitChange(editorRef.current?.innerHTML || '')}
          onBlur={() => emitChange(editorRef.current?.innerHTML || '')}
        />
      )}
    </div>
  );
}

export function previewWelcomeHtml(html, sample = {}) {
  const defaults = {
    company_name: 'Post4U',
    company_logo: '/icons/icon-192.png',
    client_name: 'Alex Client',
    client_email: 'client@company.com',
    accept_invitation_url: 'http://localhost:3000/accept-invitation/sample-token',
    login_url: 'http://localhost:3000/login',
    support_email: 'support@company.com',
    support_phone: '',
    current_year: String(new Date().getFullYear()),
    ...sample,
  };
  let out = html || '';
  Object.entries(defaults).forEach(([k, v]) => {
    out = out.split(`{{${k}}}`).join(String(v));
  });
  return DOMPurify.sanitize(out, { USE_PROFILES: { html: true } });
}
