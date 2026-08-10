import api from './client';

export const endUserAPI = {
  signup:        (data) => api.post('/end-user/signup/',    data),
  me:            ()     => api.get ('/end-user/me/'),
  updateProfile: (data) => api.put ('/end-user/profile/',   data),
  workspace:     ()     => api.get ('/end-user/workspace/'),
  updateWorkspace: (data) => api.put('/end-user/workspace/', data),
  incomingRequests: () => api.get ('/end-user/incoming-requests/'),
};

export const manageRequestAPI = {
  send:    (data)            => api.post  ('/manage-request/send/', data),
  sent:    (params)          => api.get   ('/manage-request/sent/', { params }),
  cancel:  (id)              => api.delete(`/manage-request/${id}/`),
  invite:  (token)           => api.get   (`/manage-invite/${token}/`),
  accept:  (token, payload)  => api.post  (`/manage-invite/${token}/accept/`,  payload || {}),
  decline: (token, payload)  => api.post  (`/manage-invite/${token}/decline/`, payload || {}),
};

export const relationAPI = {
  list:           ()             => api.get(`/relations/`),
  get:            (id)           => api.get(`/relations/${id}/`),
  updatePerms:    (id, payload)  => api.put(`/relations/${id}/permissions/`, payload),
  pause:          (id)           => api.post(`/relations/${id}/pause/`,     {}),
  resume:         (id)           => api.post(`/relations/${id}/resume/`,    {}),
  terminate:      (id, reason)   => api.post(`/relations/${id}/terminate/`, { reason }),
  flag:           (id, reason)   => api.post(`/relations/${id}/flag/`,      { reason }),
  agencyProfile:  (id)           => api.get(`/relations/${id}/agency-profile/`),
};

export const soloAPI = {
  setup: () => api.post('/client/setup-solo/'),
};

export const invitationAPI = {
  send:       (data)         => api.post('/invitations/send/', data),
  listEmailTemplates: ()     => api.get('/invitations/email-templates/'),
  getEmailTemplate: (slug)   => api.get(`/invitations/email-templates/${slug}/`),
  saveEmailTemplate: (slug, template) => api.put(`/invitations/email-templates/${slug}/`, { template }),
  getWelcomeTemplate: ()    => api.get('/invitations/welcome-email-template/'),
  saveWelcomeTemplate: (template) => api.put('/invitations/welcome-email-template/', { template }),
  getTemplate: ()            => api.get('/invitations/welcome-email-template/'),
  saveTemplate: (template)   => api.put('/invitations/welcome-email-template/', { template }),
  getByToken: (token)        => api.get(`/invitations/token/${token}/`, { skipAuth: true, skipWorkspace: true }),
  acceptMagic: (token)       => api.post(`/invitations/${token}/accept/`, {}, { skipAuth: true, skipWorkspace: true }),
  respond:    (token, action) => api.post(`/invitations/token/${token}/respond/`, { action }),
  mine:       ()             => api.get('/invitations/mine/'),
  cancel:     (id)           => api.delete(`/invitations/${id}/cancel/`),
};

export const agencyInviteAPI = {
  send:           (data)            => api.post('/end-user/invite-agency/', data),
  sent:           ()                => api.get ('/end-user/sent-agency-invites/'),
  invite:         (token)           => api.get (`/agency-invite/${token}/`),
  accept:         (token)           => api.post(`/agency-invite/${token}/accept/`,  {}),
  decline:        (token)           => api.post(`/agency-invite/${token}/decline/`, {}),
  agencyIncoming: (slug)            => api.get (`/agency/${slug}/incoming-invites/`),
};
