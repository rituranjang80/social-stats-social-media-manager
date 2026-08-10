import api from './client';

export const privacyAPI = {
  exportList:    ()       => api.get  ('/privacy/export-request/'),
  exportRequest: ()       => api.post ('/privacy/export-request/', {}),

  deleteAccount:       (reason) => api.post ('/privacy/delete-account/',         { reason: reason || '' }),
  cancelDeleteAccount: ()       => api.post ('/privacy/delete-account/cancel/',  {}),

  processingStatus:    ()                     => api.get  ('/privacy/processing-status/'),
  setProcessingPaused: (paused, clientId)     => api.post ('/privacy/processing-status/', {
    paused: !!paused, ...(clientId ? { client_id: clientId } : {}),
  }),

  consents:    ()                          => api.get ('/privacy/consents/'),
  setConsent:  (consentType, given, via)   => api.post('/privacy/consents/', {
    consent_type: consentType, given: !!given, given_via: via || 'settings_page',
  }),
};
