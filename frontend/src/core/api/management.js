import api from './client';

export const managementAPI = {
  listStaff:           ()           => api.get('/management/staff/'),
  createStaff:         (data)       => api.post('/management/staff/', data),
  getStaff:            (id)         => api.get(`/management/staff/${id}/`),
  updateStaff:         (id, data)   => api.patch(`/management/staff/${id}/`, data),
  deleteStaff:         (id)         => api.delete(`/management/staff/${id}/`),
  getStaffPermissions: (id)         => api.get(`/management/staff/${id}/permissions/`),
  setStaffPermissions: (id, data)   => api.post(`/management/staff/${id}/permissions/`, data),
  getStaffClients:     (id)         => api.get(`/management/staff/${id}/clients/`),
  setStaffClients:     (id, data)   => api.post(`/management/staff/${id}/clients/`, data),
  listClients:               ()           => api.get('/management/clients/'),
  getClient:                 (id)         => api.get(`/management/clients/${id}/`),
  updateClient:              (id, data)   => api.patch(`/management/clients/${id}/`, data),
  getClientPermissions:      (id)         => api.get(`/management/clients/${id}/permissions/`),
  setClientPermissions:      (id, data)   => api.post(`/management/clients/${id}/permissions/`, data),
  getClientPortalConfig:     (id)         => api.get(`/management/clients/${id}/portal-config/`),
  saveClientPortalConfig:    (id, data)   => api.put(`/management/clients/${id}/portal-config/`, data),
  listPermissions:     ()           => api.get('/management/permissions/'),
  getRoleDefaults:     (role)       => api.get(`/management/role-defaults/${role}/`),
  setRoleDefaults:     (role, data) => api.put(`/management/role-defaults/${role}/`, data),
};
