import { api } from './client';
import type { Project, CreateProjectBody, ProjectFilters } from '../types';

export const projectsApi = {
  list: (filters?: ProjectFilters) => {
    const q = new URLSearchParams();
    if (filters?.grade_level_id) q.set('grade_level_id', String(filters.grade_level_id));
    if (filters?.subject_id) q.set('subject_id', String(filters.subject_id));
    if (filters?.date_from) q.set('date_from', filters.date_from);
    if (filters?.date_to) q.set('date_to', filters.date_to);
    const qs = q.toString();
    return api.get<Project[]>(`/projects${qs ? `?${qs}` : ''}`);
  },
  getById: (id: number) => api.get<Project>(`/projects/${id}`),
  create: (body: CreateProjectBody) => api.post<Project>('/projects', body),
  update: (id: number, body: Partial<CreateProjectBody>) =>
    api.put<Project>(`/projects/${id}`, body),
  delete: (id: number) => api.delete(`/projects/${id}`),
};
