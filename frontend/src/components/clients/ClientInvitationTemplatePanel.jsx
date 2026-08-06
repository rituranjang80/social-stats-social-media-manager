/* Admin-editable client invitation email (placeholders + branding from .env). */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Save, RotateCcw, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import { invitationAPI } from '../../services/api';
import { BRAND_NAME, BRAND_DESCRIPTION, siteOrigin } from '../../config/branding';

const FIELDS = [
  { key: 'subject', label: 'Email subject (new client)', rows: 1 },
  { key: 'subject_existing', label: 'Email subject (existing user)', rows: 1 },
  { key: 'title', label: 'Email headline', rows: 1 },
  { key: 'greeting', label: 'Greeting (HTML allowed)', rows: 2 },
  { key: 'body_html', label: 'Body — new client (HTML, include {{temp_password}} block)', rows: 6 },
  { key: 'body_html_existing_user', label: 'Body — existing user (HTML)', rows: 4 },
  { key: 'cta_label', label: 'Button label (new client)', rows: 1 },
  { key: 'cta_label_existing', label: 'Button label (existing user)', rows: 1 },
  { key: 'expiry_note', label: 'Expiry note (HTML)', rows: 2 },
  { key: 'plain_intro', label: 'Plain-text intro', rows: 3 },
  { key: 'plain_credentials', label: 'Plain-text credentials block', rows: 3 },
];

function sampleContext(branding) {
  const origin = siteOrigin() || branding?.frontend_url || 'http://localhost:3000';
  return {
    brand_name: branding?.brand_name || BRAND_NAME,
    brand_description: branding?.brand_description || BRAND_DESCRIPTION,
    agency_name: 'Demo Agency',
    agency_email: 'agency@demo.local',
    client_email: 'client@company.com',
    client_name: 'Alex',
    message: 'We would love to manage your social channels with you.',
    invite_url: `${origin}/invitation/sample-token`,
    login_url: `${origin}/login`,
    app_url: origin,
    temp_password: 'TempPass-Example1',
    expires_days: '7',
  };
}

function applyPreview(template, ctx) {
  let out = JSON.stringify(template);
  Object.entries(ctx).forEach(([k, v]) => {
    out = out.split(`{{${k}}}`).join(String(v ?? ''));
  });
  try {
    return JSON.parse(out);
  } catch {
    return template;
  }
}

export default function ClientInvitationTemplatePanel() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState(null);
  const [defaults, setDefaults] = useState(null);
  const [placeholders, setPlaceholders] = useState([]);
  const [branding, setBranding] = useState(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invitationAPI.getTemplate();
      setTemplate(res.data.template || {});
      setDefaults(res.data.defaults || {});
      setPlaceholders(res.data.placeholders || []);
      setBranding(res.data.branding || {});
    } catch {
      setMsg('Could not load email template.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const preview = useMemo(() => {
    if (!template) return null;
    return applyPreview(template, sampleContext(branding));
  }, [template, branding]);

  const onSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      const res = await invitationAPI.saveTemplate(template);
      setTemplate(res.data.template);
      setDefaults(res.data.defaults);
      setMsg('Template saved.');
    } catch {
      setMsg('Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const onReset = () => {
    if (defaults) {
      setTemplate({ ...defaults });
      setMsg('Restored defaults (save to apply).');
    }
  };

  if (loading && !template) {
    return (
      <div style={S.wrap}>
        <Loader2 size={18} style={{ animation: 'spin .8s linear infinite', color: 'var(--text-tertiary)' }} />
      </div>
    );
  }

  return (
    <div style={S.panel}>
      <button type="button" style={S.toggle} onClick={() => setOpen((v) => !v)}>
        <Mail size={16} style={{ color: '#7c3aed' }} />
        <span style={{ flex: 1, textAlign: 'left' }}>
          <strong style={{ display: 'block', fontSize: 14 }}>Invitation email template</strong>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            Branding from .env ({BRAND_NAME}) · includes login URL &amp; temporary password for new clients
          </span>
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && template && (
        <div style={S.body}>
          <p style={S.hint}>
            Placeholders:
            {' '}
            {placeholders.map((p) => (
              <code key={p} style={S.code}>{p}</code>
            ))}
          </p>

          <div style={S.grid}>
            {FIELDS.map(({ key, label, rows }) => (
              <label key={key} style={S.field}>
                <span style={S.label}>{label}</span>
                <textarea
                  rows={rows}
                  value={template[key] || ''}
                  onChange={(e) => setTemplate((t) => ({ ...t, [key]: e.target.value }))}
                  style={S.textarea}
                />
              </label>
            ))}
          </div>

          {preview && (
            <div style={S.preview}>
              <div style={S.previewTitle}>Preview (sample data)</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                <strong>Subject:</strong>
                {' '}
                {preview.subject}
              </div>
              <div
                style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-primary)' }}
                dangerouslySetInnerHTML={{
                  __html: `${preview.greeting}<br/><br/>${preview.body_html}`,
                }}
              />
            </div>
          )}

          <div style={S.actions}>
            <button type="button" onClick={onReset} style={S.secondaryBtn}>
              <RotateCcw size={14} />
              Reset to defaults
            </button>
            <button type="button" onClick={onSave} disabled={saving} style={S.primaryBtn}>
              {saving
                ? <Loader2 size={14} style={{ animation: 'spin .8s linear infinite' }} />
                : <Save size={14} />}
              Save template
            </button>
            {msg && <span style={S.msg}>{msg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  wrap: { padding: 24, display: 'flex', justifyContent: 'center' },
  panel: {
    marginBottom: 20,
    border: '1px solid var(--border-subtle)',
    borderRadius: 12,
    background: 'var(--surface-card)',
    overflow: 'hidden',
  },
  toggle: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontFamily: 'inherit',
    color: 'var(--text-primary)',
  },
  body: { padding: '0 16px 16px', borderTop: '1px solid var(--border-subtle)' },
  hint: { fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6, margin: '12px 0' },
  code: {
    display: 'inline-block',
    margin: '2px 4px 2px 0',
    padding: '1px 6px',
    borderRadius: 4,
    background: 'var(--surface-sunken)',
    fontSize: 11,
  },
  grid: { display: 'flex', flexDirection: 'column', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid var(--border-subtle)',
    fontSize: 13,
    fontFamily: 'inherit',
    resize: 'vertical',
    background: 'var(--surface-sunken)',
    color: 'var(--text-primary)',
  },
  preview: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    border: '1px dashed var(--border-default)',
    background: 'var(--surface-sunken)',
  },
  previewTitle: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 8 },
  actions: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, flexWrap: 'wrap' },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 8,
    border: 'none',
    background: 'var(--brand-primary)',
    color: '#021418',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
  },
  secondaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-card)',
    fontSize: 13,
    cursor: 'pointer',
    color: 'var(--text-secondary)',
  },
  msg: { fontSize: 13, color: 'var(--text-secondary)' },
};
