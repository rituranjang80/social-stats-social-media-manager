import api from './client';

export const clientsAPI = {
  list:        (opts)       => api.get('/clients/', opts),
  get:         (id)         => api.get(`/clients/${id}/`),
  create:      (data)       => api.post('/clients/', data),
  update:      (id, data)   => api.patch(
    `/clients/${id}/`,
    data,
    data instanceof FormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : undefined
  ),
  delete:      (id)         => api.delete(`/clients/${id}/`),
  resendInvitation: (id) => api.post(`/clients/${id}/resend-invitation/`),
  activate:    (id)         => api.post(`/clients/${id}/activate/`),
  deactivate:  (id)         => api.post(`/clients/${id}/deactivate/`),
  summary:     (id, params) => api.get(`/clients/${id}/summary/`, { params }),
  timeseries:  (id, params) => api.get(`/clients/${id}/timeseries/`, { params }),
  posts:       (id, params) => api.get(`/clients/${id}/posts/`, { params }),
  triggerSync: (id, platforms) => api.post(`/clients/${id}/trigger_sync/`, { platforms }),
  syncStatus:  (id)         => api.get(`/clients/${id}/sync_status/`),
  syncAll:     ()           => api.post('/admin/sync-all/'),
};

export const oauthAPI = {
  status:     (clientId)           => api.get(`/oauth/status/${clientId}/`),
  disconnect: (clientId, platform) => api.delete(`/oauth/disconnect/${clientId}/${platform}/`),
  facebookUrl: (clientId)           => `${api.defaults.baseURL}/oauth/facebook/start/${clientId}/`,
  googleUrl:   (clientId, platform) => `${api.defaults.baseURL}/oauth/google/start/${clientId}/?platform=${platform || 'all'}`,
  linkedinUrl: (clientId)           => `${api.defaults.baseURL}/oauth/linkedin/start/${clientId}/`,
};

export const onboardingAPI = {
  list:   (params) => api.get('/onboarding/', { params }),
  update: (id, data) => api.patch(`/onboarding/${id}/`, data),
};

export const adminAPI = {
  createClient: (data) => api.post('/admin/create-client/', data),
};
