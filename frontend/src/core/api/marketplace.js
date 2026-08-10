import api, { apiBaseUrl } from './client';

export const notificationPrefsAPI = {
  get:    ()       => api.get ('/notifications/preferences/'),
  update: (rows)   => api.put ('/notifications/preferences/update/', { rows }),
};

export const verificationAPI = {
  submit:  (slug, documents) => api.post(`/agency/${slug}/verification/submit/`, { documents }),
  pending: ()                => api.get('/admin/verifications/pending/'),
  get:     (id)              => api.get(`/admin/verifications/${id}/`),
  approve: (id, note = '')   => api.post(`/admin/verifications/${id}/approve/`, { note }),
  reject:  (id, note = '')   => api.post(`/admin/verifications/${id}/reject/`,  { note }),
};

export const disputeAPI = {
  file:    (data)            => api.post('/disputes/file/', data),
  list:    (params)          => api.get('/admin/disputes/', { params }),
  get:     (id)              => api.get(`/admin/disputes/${id}/`),
  resolve: (id, payload)     => api.post(`/admin/disputes/${id}/resolve/`, payload),
};

export const activityAPI = {
  list:    (params)     => api.get(`/activity/`, { params }),
  flag:    (id, reason) => api.post(`/activity/${id}/flag/`, { reason }),
  revert:  (id)         => api.post(`/activity/${id}/revert/`, {}),
  exportCsvUrl: (params = {}) => {
    const base = apiBaseUrl();
    const qs = new URLSearchParams(params).toString();
    return `${base}/activity/export.csv${qs ? '?' + qs : ''}`;
  },
};

export const approvalAPI = {
  pending: ()              => api.get('/approvals/pending/'),
  history: ()              => api.get('/approvals/history/'),
  get:     (id)            => api.get(`/approvals/${id}/`),
  approve: (id, payload)   => api.post(`/approvals/${id}/approve/`, payload || {}),
  reject:  (id, reason)    => api.post(`/approvals/${id}/reject/`,  { reason }),
};

export const marketplaceAPI = {
  list:       (params)        => api.get('/marketplace/agencies/', { params }),
  get:        (slug)          => api.get(`/marketplace/agencies/${slug}/`),
  featured:   ()              => api.get('/marketplace/featured/'),
  categories: ()              => api.get('/marketplace/categories/'),
  contact:    (slug, message) => api.post(`/marketplace/agencies/${slug}/contact/`, { message }),
};

export const agencyAPI = {
  get:    (slug)        => api.get (`/agency/${slug}/`),
  update: (slug, data)  => api.put (`/agency/${slug}/`, data),
};

export const reviewAPI = {
  list:    (slug, params)        => api.get(`/agencies/${slug}/reviews/`, { params }),
  create:  (slug, payload)       => api.post(`/agencies/${slug}/reviews/`, payload),
  update:  (id, payload)         => api.put(`/reviews/${id}/`, payload),
  delete:  (id)                  => api.delete(`/reviews/${id}/`),
  respond: (id, response)        => api.post(`/reviews/${id}/respond/`, { response }),
  helpful: (id)                  => api.post(`/reviews/${id}/helpful/`, {}),
};
