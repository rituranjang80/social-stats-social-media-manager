import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Save, RotateCcw, ArrowLeft } from 'lucide-react';

import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import RichEmailEditor, { previewWelcomeHtml } from '../../components/email/RichEmailEditor';
import toast from '../../components/ui/toast';
import { invitationAPI } from '../../services/api';
import { BRAND_NAME, siteOrigin } from '../../config/branding';

import '../../styles/scss/pages/_welcome-email-template.scss';

export default function WelcomeEmailTemplatePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [defaults, setDefaults] = useState(null);
  const [branding, setBranding] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invitationAPI.getWelcomeTemplate();
      setSubject(res.data.template?.subject || '');
      setBodyHtml(res.data.template?.body_html || '');
      setDefaults(res.data.defaults);
      setBranding(res.data.branding);
    } catch {
      toast.error('Could not load welcome email template');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const previewHtml = useMemo(() => previewWelcomeHtml(bodyHtml, {
    company_name: branding?.company_name || BRAND_NAME,
    company_logo: branding?.company_logo,
    login_url: `${siteOrigin() || branding?.frontend_url || 'http://localhost:3000'}/login`,
    accept_invitation_url: `${siteOrigin() || 'http://localhost:3000'}/accept-invitation/sample-token`,
    support_email: branding?.support_email || 'support@example.com',
  }), [bodyHtml, branding]);

  const onSave = async () => {
    setSaving(true);
    try {
      await invitationAPI.saveWelcomeTemplate({ subject, body_html: bodyHtml });
      toast.success('Welcome email template saved');
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

  if (loading) {
    return (
      <div className="welcome-email-page welcome-email-page--loading">
        <Loader2 className="welcome-email-page__spin" size={24} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="welcome-email-page">
      <PageHeader
        title="Welcome email template"
        subtitle="Invitation emails use this template. Placeholders are replaced when sending."
      />

      <div className="welcome-email-page__actions">
        <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/admin/account-settings')}>
          Cancel
        </Button>
        <Button variant="secondary" icon={RotateCcw} onClick={onReset}>
          Reset default
        </Button>
        <Button icon={Save} loading={saving} onClick={onSave}>
          Save
        </Button>
      </div>

      <div className="welcome-email-page__grid">
        <Card className="welcome-email-page__form">
          <label className="welcome-email-page__label" htmlFor="welcome-subject">Subject</label>
          <Input
            id="welcome-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Welcome to {{company_name}}"
          />

          <label className="welcome-email-page__label">Email body</label>
          <RichEmailEditor value={bodyHtml} onChange={setBodyHtml} />
        </Card>

        <Card className="welcome-email-page__preview">
          <Card.Header title="Preview" />
          <p className="welcome-email-page__preview-subject">
            <strong>Subject:</strong>
            {' '}
            {previewWelcomeHtml(subject, { company_name: branding?.company_name || BRAND_NAME })}
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
        . No passwords are included in invitation emails.
      </p>
    </div>
  );
}
