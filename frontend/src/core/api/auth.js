import api, { publicApi } from './client';

export const profileAPI = {
  get:               ()       => api.get('/profile/'),
  update:            (data)   => api.patch('/profile/', data, data instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined),
  changePassword:    (data)   => api.post('/profile/change-password/', data),
  agencyInfo:        ()       => api.get('/profile/agency/'),
  disconnectAgency:  ()       => api.post('/profile/disconnect-agency/'),
  deleteAccount:     (data)   => api.delete('/profile/delete-account/', { data }),
};

export const authAPI = {
  login:              (email, password, termsAccepted) => api.post('/auth/login/', { username: email, password, terms_accepted: termsAccepted }),
  me:                 ()              => api.get('/auth/me/'),
  refresh:            (refresh)       => api.post('/auth/refresh/', { refresh }),
  exchangeSocialCode: (code)          => publicApi.post('/auth/social/exchange/', { code }),
  signup:             (data)          => api.post('/auth/signup/', data),
  verifyEmail:        (token)         => api.get('/auth/verify-email/', { params: { token } }),
  resendVerification: (email)         => api.post('/auth/resend-verification/', { email }),
  passwordResetRequest: (email)       => api.post('/auth/password-reset/', { email }),
  passwordResetConfirm: (token, password) => api.post('/auth/password-reset/confirm/', { token, password }),
};

export const sessionsAPI = {
  list:      ()        => api.get  ('/auth/sessions/'),
  revoke:    (id)      => api.post (`/auth/sessions/${id}/revoke/`, {}),
  revokeAll: (keepJti) => api.post ('/auth/sessions/revoke-all/',  { keep_jti: keepJti || '' }),
};

export const mfaAPI = {
  status:               ()       => api.get  ('/auth/mfa/status/'),
  setup:                ()       => api.post ('/auth/mfa/setup/', {}),
  verifySetup:          (code)   => api.post ('/auth/mfa/verify-setup/', { code }),
  login:                (data)   => api.post ('/auth/mfa/login/', data),
  disable:              (data)   => api.post ('/auth/mfa/disable/', data),
  regenerateBackupCodes: (code)   => api.post ('/auth/mfa/regenerate-backup-codes/', { code }),
};

export const apiKeysAPI = {
  list:    (includeInactive) => api.get  ('/api-keys/', { params: includeInactive ? { include_inactive: 1 } : {} }),
  create:  (data)            => api.post ('/api-keys/', data),
  revoke:  (id, reason)      => api.post (`/api-keys/${id}/revoke/`, { reason: reason || 'user_revoked' }),
};

export const socialAuthAPI = {
  googleUrl:    () => `${api.defaults.baseURL}/auth/social/google/start/`,
  facebookUrl:  () => `${api.defaults.baseURL}/auth/social/facebook/start/`,
  microsoftUrl: () => `${api.defaults.baseURL}/auth/social/microsoft/start/`,
};
