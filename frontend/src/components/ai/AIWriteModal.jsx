/* ============================================================================
 * Centered AI generation modal — text, image, video, or all (subscription quotas).
 * ========================================================================== */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Sparkles, Type, Image as ImageIcon, Video, Layers, Check, Copy, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { aiV2API } from '../../services/api';
import { BRAND_NAME, brandWritingLabel } from '../../config/branding';

const TONE_OPTIONS = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'professional', label: 'Professional' },
  { value: 'witty', label: 'Witty' },
  { value: 'inspirational', label: 'Inspirational' },
  { value: 'casual', label: 'Casual' },
];

const LENGTH_OPTIONS = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
];

const PLATFORM_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'google_my_business', label: 'GMB' },
];

const TYPE_OPTIONS = [
  { id: 'text', label: 'Text', icon: Type },
  { id: 'image', label: 'Image', icon: ImageIcon },
  { id: 'video', label: 'Video', icon: Video },
  { id: 'all', label: 'All', icon: Layers },
];

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = reader.result || '';
      const b64 = String(raw).includes(',') ? String(raw).split(',')[1] : String(raw);
      resolve(b64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function QuotaBar({ type, current, limit }) {
  const pct = limit ? Math.min(100, (current / limit) * 100) : 0;
  const label = limit == null ? `${current} · unlimited` : `${current} / ${limit}`;
  return (
    <div className="ai-write-modal__quota">
      <div className="ai-write-modal__quota-head">
        <span>{type}</span>
        <span>{label}</span>
      </div>
      <div className={`ai-write-modal__quota-bar${limit && current >= limit ? ' is-full' : ''}`}>
        <span style={{ width: limit ? `${pct}%` : '8%' }} />
      </div>
    </div>
  );
}

function formatVideoResult(video) {
  if (!video) return '';
  const lines = [];
  if (video.hook) lines.push(`Hook: ${video.hook}`);
  if (Array.isArray(video.script)) {
    video.script.forEach((row) => {
      lines.push(`[${row.timestamp || '—'}] ${row.narration || ''}`);
      if (row.visual_direction) lines.push(`  Visual: ${row.visual_direction}`);
    });
  }
  if (video.cta) lines.push(`\nCTA: ${video.cta}`);
  return lines.join('\n').trim();
}

export default function AIWriteModal({
  open,
  onClose,
  clientId,
  platform = 'instagram',
  onInsert,
  canCompose = true,
}) {
  const [topic, setTopic] = useState('');
  const [genType, setGenType] = useState('text');
  const [tone, setTone] = useState('friendly');
  const [length, setLength] = useState('medium');
  const [plat, setPlat] = useState(platform);
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState(null);
  const [results, setResults] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const loadUsage = useCallback(async () => {
    if (!clientId || !canCompose) return;
    try {
      const res = await aiV2API.generationLimits({ client_id: clientId });
      setUsage(res.data);
    } catch {
      /* quota panel optional */
    }
  }, [clientId, canCompose]);

  useEffect(() => {
    if (!open) return;
    setPlat(platform || 'instagram');
    loadUsage();
  }, [open, platform, loadUsage]);

  useEffect(() => {
    if (!open) {
      setResults(null);
      setTopic('');
      setImageFile(null);
      setImagePreview('');
      setGenType('text');
    }
  }, [open]);

  const quotaMap = useMemo(() => {
    const map = {};
    (usage?.generations || []).forEach((row) => {
      map[row.type] = row;
    });
    return map;
  }, [usage]);

  function isTypeBlocked(typeId) {
    if (typeId === 'all') {
      return ['text', 'image', 'video'].some((t) => {
        const q = quotaMap[t];
        return q?.limit != null && q.remaining === 0;
      });
    }
    const q = quotaMap[typeId];
    return q?.limit != null && q.remaining === 0;
  }

  async function generate() {
    const t = topic.trim();
    if (!t) {
      toast.error('Describe what you want to create');
      return;
    }
    if (!clientId) {
      toast.error('Select a workspace first');
      return;
    }
    if (!canCompose) {
      toast.error('AI compose is disabled for your role');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        client_id: clientId,
        topic: t,
        types: genType,
        platforms: [plat],
        tone,
        length,
      };
      if (imageFile && (genType === 'image' || genType === 'all')) {
        payload.image_b64 = await fileToBase64(imageFile);
      }
      const res = await aiV2API.composerGenerate(payload);
      setResults(res.data?.results || {});
      setUsage(res.data?.usage || usage);
      if (res.data?.errors && Object.keys(res.data.errors).length) {
        toast.error('Some generations failed — see partial results');
      }
    } catch (e) {
      const msg = e?.response?.data?.error || 'Generation failed';
      toast.error(msg);
      if (e?.response?.data?.usage) setUsage(e.response.data.usage);
    } finally {
      setLoading(false);
    }
  }

  function insertText(text) {
    if (!text?.trim()) return;
    onInsert?.(text.trim());
    onClose?.();
    toast.success('Inserted into caption');
  }

  function copyText(text) {
    try {
      navigator.clipboard.writeText(text);
      toast.success('Copied');
    } catch {
      toast.error('Could not copy');
    }
  }

  const footer = canCompose ? (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%' }}>
      <span className="ai-write-modal__footer-hint">Cmd+Enter to generate</span>
      <div style={{ display: 'flex', gap: 8 }}>
        {results ? (
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => setResults(null)}>
            New prompt
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" icon={Sparkles} loading={loading} onClick={generate}>
          {loading ? brandWritingLabel() : 'Generate'}
        </Button>
      </div>
    </div>
  ) : (
    <Button size="sm" onClick={onClose}>Close</Button>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Create with ${BRAND_NAME} AI`}
      description="Generate captions, image posts, and video scripts — limited by your subscription plan."
      size="xl"
      elevated
      draggable
      className="ai-write-modal"
      footer={footer}
    >
      {!canCompose ? (
        <div className="ai-write-modal__denied">
          <Sparkles size={32} strokeWidth={1.5} style={{ marginBottom: 12, opacity: 0.5 }} />
          <p>
            Your account does not have the
            {' '}
            <strong>Use AI Compose</strong>
            {' '}
            permission.
          </p>
          <p>Ask an administrator to enable it under Management → Permissions.</p>
        </div>
      ) : (
        <div className="ai-write-modal__body">
          {usage ? (
            <div className="ai-write-modal__plan">
              <span className="ai-write-modal__plan-label">
                {usage.plan_label || 'Free'}
                {' '}
                plan
              </span>
              <div className="ai-write-modal__quota-grid">
                <QuotaBar type="text" {...(quotaMap.text || { current: 0, limit: null })} />
                <QuotaBar type="image" {...(quotaMap.image || { current: 0, limit: null })} />
                <QuotaBar type="video" {...(quotaMap.video || { current: 0, limit: null })} />
              </div>
            </div>
          ) : null}

          {!results ? (
            <>
              <div>
                <span className="ai-write-modal__label">Generate</span>
                <div className="ai-write-modal__types" role="tablist" aria-label="Generation type">
                  {TYPE_OPTIONS.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={genType === id}
                      className={`ai-write-modal__type${genType === id ? ' is-active' : ''}`}
                      disabled={isTypeBlocked(id)}
                      title={isTypeBlocked(id) ? 'Monthly limit reached' : undefined}
                      onClick={() => setGenType(id)}
                    >
                      <Icon size={16} strokeWidth={2} aria-hidden="true" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="ai-write-modal__label" htmlFor="ai-write-topic">Topic / brief</label>
                <textarea
                  id="ai-write-topic"
                  className="ai-write-modal__textarea"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !loading) {
                      e.preventDefault();
                      generate();
                    }
                  }}
                  placeholder="Summer drink launch — highlight refreshment and limited-time offer"
                  rows={4}
                  autoFocus
                />
              </div>

              <div className="ai-write-modal__field-grid">
                <div>
                 <label className="ai-write-modal__label" htmlFor="ai-write-tone">Tone</label>
                  <select id="ai-write-tone" className="ai-write-modal__select" value={tone} onChange={(e) => setTone(e.target.value)}>
                    {TONE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                {/* <div>
                  <label className="ai-write-modal__label" htmlFor="ai-write-tone">Tone</label>
                  <select id="ai-write-tone" className="ai-write-modal__select" value={tone} onChange={(e) => setTone(e.target.value)}>
                    {TONE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div> */}
                {(genType === 'text' || genType === 'all') ? (
                <div>
                  <span className="ai-write-modal__label">Length</span>
                  <div className="ai-write-modal__length-row">
                    {LENGTH_OPTIONS.map((l) => (
                      <button
                        key={l.value}
                        type="button"
                        className={`ai-write-modal__length-btn${length === l.value ? ' is-active' : ''}`}
                        onClick={() => setLength(l.value)}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              </div>

              

              {(genType === 'image' || genType === 'all') ? (
                <div className="ai-write-modal__upload">
                  <span className="ai-write-modal__label">Optional reference image</span>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                    Upload a photo for image-to-post, or leave empty to generate an image-post caption + visual concept.
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      setImageFile(f || null);
                      setImagePreview(f ? URL.createObjectURL(f) : '');
                    }}
                  />
                  {imagePreview ? (
                    <img src={imagePreview} alt="" className="ai-write-modal__upload-preview" />
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <div className="ai-write-modal__results">
              {results.text?.variants?.map((v, i) => (
                <article key={`text-${i}`} className="ai-write-modal__result-card">
                  <div className="ai-write-modal__result-head">
                    <span className="ai-write-modal__result-type">Text · {v.platform || plat}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button size="xs" icon={Check} onClick={() => insertText(
                        v.content + (v.hashtags?.length ? `\n\n${v.hashtags.join(' ')}` : ''),
                      )}
                      >
                        Insert
                      </Button>
                      <Button size="xs" variant="ghost" icon={Copy} onClick={() => copyText(v.content)}>Copy</Button>
                    </div>
                  </div>
                  <div className="ai-write-modal__result-body">{v.content}</div>
                  {v.hashtags?.length ? (
                    <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--brand-primary-hover)' }}>
                      {v.hashtags.join(' ')}
                    </p>
                  ) : null}
                </article>
              ))}

              {(results.image?.posts || []).map((p, i) => (
                <article key={`image-${i}`} className="ai-write-modal__result-card">
                  <div className="ai-write-modal__result-head">
                    <span className="ai-write-modal__result-type">Image · {p.platform || plat}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button size="xs" icon={Check} onClick={() => insertText(
                        p.content + (p.hashtags?.length ? `\n\n${p.hashtags.join(' ')}` : ''),
                      )}
                      >
                        Insert
                      </Button>
                      <Button size="xs" variant="ghost" icon={Copy} onClick={() => copyText(p.content)}>Copy</Button>
                    </div>
                  </div>
                  <div className="ai-write-modal__result-body">{p.content}</div>
                </article>
              ))}

              {results.video ? (
                <article className="ai-write-modal__result-card">
                  <div className="ai-write-modal__result-head">
                    <span className="ai-write-modal__result-type">Video script</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button size="xs" icon={Check} onClick={() => insertText(formatVideoResult(results.video))}>Insert</Button>
                      <Button size="xs" variant="ghost" icon={Copy} onClick={() => copyText(formatVideoResult(results.video))}>Copy</Button>
                    </div>
                  </div>
                  <div className="ai-write-modal__result-body">{formatVideoResult(results.video)}</div>
                </article>
              ) : null}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
