import api, { apiBaseUrl } from './client';

export const botAPI = {
  list:        (params)         => api.get   ('/bot-flows/', { params }),
  get:         (id)             => api.get   (`/bot-flows/${id}/`),
  create:      (data, params)   => api.post  ('/bot-flows/', data, { params }),
  update:      (id, data)       => api.put   (`/bot-flows/${id}/`, data),
  patch:       (id, data)       => api.patch (`/bot-flows/${id}/`, data),
  delete:      (id)             => api.delete(`/bot-flows/${id}/`),
  duplicate:   (id)             => api.post  (`/bot-flows/${id}/duplicate/`, {}),
  validate:    (id)             => api.post  (`/bot-flows/${id}/validate/`, {}),
  publish:     (id)             => api.post  (`/bot-flows/${id}/publish/`, {}),
  unpublish:   (id)             => api.post  (`/bot-flows/${id}/unpublish/`, {}),
  test:        (id, phone)      => api.post  (`/bot-flows/${id}/test/`, { phone }),
  analytics:   (id)             => api.get   (`/bot-flows/${id}/analytics/`),
  generateWithAI: (payload, params) =>
    api.post('/bot-flows/generate-with-ai/', payload, { params }),
};

export const botTemplateAPI = {
  list:  (params) => api.get(`/bot-templates/`, { params }),
  get:   (id)     => api.get(`/bot-templates/${id}/`),
  use:   (id, data) => api.post(`/bot-templates/${id}/use/`, data),
};

export const botConversationAPI = {
  list:    (params)  => api.get(`/bot-conversations/`, { params }),
  get:     (id)      => api.get(`/bot-conversations/${id}/`),
  handoff: (id, data)=> api.post(`/bot-conversations/${id}/handoff/`, data || {}),
  end:     (id)      => api.post(`/bot-conversations/${id}/end/`, {}),
  suggestReplies: (id) => api.post(`/bot-conversations/${id}/ai-suggest-replies/`, {}),
  handoffQueue:   (params) => api.get(`/bot-conversations/handoff-queue/`, { params }),
};

export const aiPersonaAPI = {
  build: (payload) => api.post('/ai/persona-builder/', payload),
};

export const botSettingsAPI = {
  get:    ()        => api.get ('/bot-settings/'),
  update: (payload) => api.put ('/bot-settings/', payload),
};

export const leadAPI = {
  list:        (params)        => api.get   (`/leads/`, { params }),
  get:         (id)            => api.get   (`/leads/${id}/`),
  update:      (id, data)      => api.put   (`/leads/${id}/`, data),
  patch:       (id, data)      => api.patch (`/leads/${id}/`, data),
  assign:      (id, user_id)   => api.post  (`/leads/${id}/assign/`,   { user_id }),
  status:      (id, payload)   => api.post  (`/leads/${id}/status/`,   payload),
  activity:    (id, payload)   => api.post  (`/leads/${id}/activity/`, payload),
  convert:     (id, value)     => api.post  (`/leads/${id}/convert/`,  { conversion_value: value }),
  timeline:    (id)            => api.get   (`/leads/${id}/timeline/`),
  bulkAssign:  (data)          => api.post  (`/leads/bulk-assign/`, data),
  scoreWithAI: (id)            => api.post  (`/leads/${id}/score-with-ai/`, {}),
  importCsv:   (formData)      => api.post  (`/leads/import_csv/`, formData,
                                              { headers: { 'Content-Type': 'multipart/form-data' } }),
  exportCsvUrl: (params = {}) => {
    const base = apiBaseUrl();
    const qs = new URLSearchParams(params).toString();
    return `${base}/leads/export.csv/${qs ? '?' + qs : ''}`;
  },
};

export const ctwaAPI = {
  list:      (params)          => api.get   (`/ctwa-campaigns/`, { params }),
  get:       (id)              => api.get   (`/ctwa-campaigns/${id}/`),
  create:    (data, params)    => api.post  (`/ctwa-campaigns/`, data, { params }),
  update:    (id, data)        => api.put   (`/ctwa-campaigns/${id}/`, data),
  delete:    (id)              => api.delete(`/ctwa-campaigns/${id}/`),
  analytics: (id)              => api.get   (`/ctwa-campaigns/${id}/analytics/`),
  syncMeta:  (id)              => api.post  (`/ctwa-campaigns/${id}/sync-meta/`, {}),
  adBreakdown: (id)            => api.get   (`/ctwa-campaigns/${id}/ad-breakdown/`),
};

export const metaAdsAPI = {
  accounts:  ()        => api.get('/meta-ads/accounts/'),
  campaigns: (account) => api.get('/meta-ads/campaigns/', { params: { ad_account_id: account } }),
  ads:       (campaign) => api.get('/meta-ads/ads/', { params: { campaign_id: campaign } }),
  health:    ()        => api.get('/meta-ads/health/'),
};
