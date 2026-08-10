import api from './client';

export const inboxAPI = {
  conversations: {
    list:        (params)   => api.get('/inbox/conversations/', { params }),
    get:         (id)       => api.get(`/inbox/conversations/${id}/`),
    markRead:    (id)       => api.post(`/inbox/conversations/${id}/mark_read/`),
    archive:     (id)       => api.post(`/inbox/conversations/${id}/archive/`),
    unarchive:   (id)       => api.post(`/inbox/conversations/${id}/unarchive/`),
    star:        (id)       => api.post(`/inbox/conversations/${id}/star/`),
    unstar:      (id)       => api.post(`/inbox/conversations/${id}/unstar/`),
    resolve:     (id)       => api.post(`/inbox/conversations/${id}/resolve/`),
    reopen:      (id)       => api.post(`/inbox/conversations/${id}/reopen/`),
    assign:      (id, user_id) => api.post(`/inbox/conversations/${id}/assign/`, { user_id }),
    reply:       (id, text) => api.post(`/inbox/conversations/${id}/reply/`, { text }),
  },
  messages: {
    list:        (params)   => api.get('/inbox/messages/', { params }),
  },
  reviews: {
    list:        (params)   => api.get('/inbox/reviews/', { params }),
    get:         (id)       => api.get(`/inbox/reviews/${id}/`),
    reply:       (id, text) => api.post(`/inbox/reviews/${id}/reply/`, { text }),
    flag:        (id)       => api.post(`/inbox/reviews/${id}/flag/`),
  },
  stats:         ()         => api.get('/inbox/stats/'),
  sync:          (platforms) => api.post('/inbox/sync/', { platforms: platforms || undefined }),
};
