import { api } from './client';
import type { GradeLevel, CreateGradeLevelBody } from '../types';

export const gradeLevelsApi = {
  list: () => api.get<GradeLevel[]>('/grade-levels'),
  getById: (id: number) => api.get<GradeLevel>(`/grade-levels/${id}`),
  create: (body: CreateGradeLevelBody) => api.post<GradeLevel>('/grade-levels', body),
  update: (id: number, body: Partial<CreateGradeLevelBody>) =>
    api.put<GradeLevel>(`/grade-levels/${id}`, body),
  delete: (id: number) => api.delete(`/grade-levels/${id}`),
};
