import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, Save, RotateCcw } from 'lucide-react';

import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import SegmentedTabs from '../../components/ui/SegmentedTabs';
import RichEmailEditor, { previewWelcomeHtml } from '../../components/email/RichEmailEditor';
import toast from '../../components/ui/toast';
import { invitationAPI } from '../../services/api';
import { BRAND_NAME, siteOrigin } from '../../config/branding';
import { useAccountSettingsBackHref } from '../../hooks/useAccountSettingsBackHref';

import '../../styles/scss/pages/_welcome-email-template.scss';

const DEFAULT_SLUG = 'welcome';

const PREVIEW_SAMPLE = {
  welcome: {
    company_name: BRAND_NAME,
    accept_invitation_url: `${siteOrigin() || 'http://localhost:3000'}/accept-invitation/sample-token`,
    login_url: `${siteOrigin() || 'http://localhost:3000'}/login`,
    client_name: 'Sample Client',
    support_email: 'support@example.com',
  },
  'client-approval': {
    company_name: BRAND_NAME,
    client_name: 'Sample Client',
    period_from: '2026-07-11',
    period_to: '2026-08-11',
    draft_count: '2',
    pending_review_count: '4',
    on_hold_count: '1',
    total_count: '7',
    login_url: `${siteOrigin() || 'http://localhost:3000'}/login`,
    post_management_url: `${siteOrigin() || 'http://localhost:3000'}/dashboard/analytics/post-management`,
    support_email: 'support@example.com',
    stats_html: (
      '<table width="100%" style="border:1px solid #e2e8f0;border-radius:8px;">'
      + '<tr><td style="padding:8px;">Draft</td><td style="text-align:right;padding:8px;"><strong>2</strong></td></tr>'
      + '<tr><td style="padding:8px;">Pending Review</td><td style="text-align:right;padding:8px;"><strong>4</strong></td></tr>'
      + '<tr><td style="padding:8px;">On Hold</td><td style="text-align:right;padding:8px;"><strong>1</strong></td></tr>'
      + '</table>'
    ),
  },
};

function previewContext(slug, branding) {
  const base = PREVIEW_SAMPLE[slug] || PREVIEW_SAMPLE.welcome;
  return {
    ...base,
    company_name: branding?.company_name || base.company_name,
    company_logo: branding?.company_logo,
  };
}

export default function WelcomeEmailTemplatePage() {
  const accountSettingsBack = useAccountSettingsBackHref('more');
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSlug = searchParams.get('template') || DEFAULT_SLUG;

  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [defaults, setDefaults] = useState(null);
  const [branding, setBranding] = useState(null);
  const [meta, setMeta] = useState({ title: '', description: '' });

  const loadCatalog = useCallback(async () => {
    try {
      const res = await invitationAPI.listEmailTemplates();
      setCatalog(res.data.templates || []);
      if (res.data.branding) setBranding(res.data.branding);
    } catch {
      setCatalog([
        { slug: 'welcome', title: 'Welcome template', description: '' },
        { slug: 'client-approval', title: 'Client approval template', description: '' },
      ]);
    }
  }, []);

  const loadTemplate = useCallback(async (slug) => {
    setLoading(true);
    try {
      const res = await invitationAPI.getEmailTemplate(slug);
      setSubject(res.data.template?.subject || '');
      setBodyHtml(res.data.template?.body_html || '');
      setDefaults(res.data.defaults);
      setBranding(res.data.branding);
      setMeta({ title: res.data.title, description: res.data.description });
    } catch {
      toast.error('Could not load email template');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);
  useEffect(() => { loadTemplate(activeSlug); }, [activeSlug, loadTemplate]);

  const tabItems = useMemo(
    () => catalog.map((t) => ({ id: t.slug, label: t.title })),
    [catalog],
  );

  const onTabChange = (slug) => {
    const next = new URLSearchParams(searchParams);
    if (slug === DEFAULT_SLUG) next.delete('template');
    else next.set('template', slug);
    setSearchParams(next, { replace: true });
  };

  const previewHtml = useMemo(
    () => previewWelcomeHtml(bodyHtml, previewContext(activeSlug, branding)),
    [bodyHtml, branding, activeSlug],
  );

  const onSave = async () => {
    setSaving(true);
    try {
      await invitationAPI.saveEmailTemplate(activeSlug, { subject, body_html: bodyHtml });
      toast.success('Template saved');
      loadTemplate(activeSlug);
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onReset = () => {
    if (defaults) {
      setSubject(defaults.subject || '');
      setBodyHtml(defaults.body_html || '');
      toast.success('Defaults restored — save to apply');
    }
  };

  if (loading && !defaults) {
    return (
      <div className="welcome-email-page welcome-email-page--loading">
        <Loader2 className="welcome-email-page__spin" size={24} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="welcome-email-page">
      <PageHeader
        title="Email templates"
        subtitle="Welcome invitations, client approval digests, and more — placeholders are replaced when sending."
        backHref={accountSettingsBack}
      />

      {tabItems.length > 1 && (
        <SegmentedTabs
          items={tabItems}
          active={activeSlug}
          onChange={onTabChange}
          compact
          style={{ margin: '0 24px 16px' }}
        />
      )}

      {meta.description && (
        <p className="welcome-email-page__hint" style={{ margin: '0 24px 12px' }}>
          {meta.description}
        </p>
      )}

      <div className="welcome-email-page__actions">
        <Button variant="secondary" icon={RotateCcw} onClick={onReset}>
          Reset default
        </Button>
        <Button icon={Save} loading={saving} onClick={onSave}>
          Save
        </Button>
      </div>

      <div className="welcome-email-page__grid">
        <Card className="welcome-email-page__form">
          <label className="welcome-email-page__label" htmlFor="email-template-subject">Subject</label>
          <Input
            id="email-template-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject line with {{placeholders}}"
          />

          <label className="welcome-email-page__label">Email body</label>
          <RichEmailEditor value={bodyHtml} onChange={setBodyHtml} />
        </Card>

        <Card className="welcome-email-page__preview">
          <Card.Header title="Preview" />
          <p className="welcome-email-page__preview-subject">
            <strong>Subject:</strong>
            {' '}
            {previewWelcomeHtml(subject, previewContext(activeSlug, branding))}
          </p>
          <div
            className="welcome-email-page__preview-body"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </Card>
      </div>

      <p className="welcome-email-page__hint">
        Manage clients at
        {' '}
        <Link to="/admin/clients">Workspaces (clients)</Link>
        . Post Management digests use the <strong>Client approval</strong> template when scheduled.
      </p>
    </div>
  );
}
