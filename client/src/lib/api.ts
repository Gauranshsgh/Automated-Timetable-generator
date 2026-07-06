const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { body, headers: customHeaders, ...rest } = options;
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders as Record<string, string>,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...rest,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `API error: ${response.status}`);
    }

    return data;
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<{ success: boolean; data: { token: string; refreshToken: string; user: any } }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  }

  async register(data: { email: string; password: string; name: string; role?: string }) {
    return this.request('/auth/register', { method: 'POST', body: data });
  }

  async getMe() {
    return this.request<{ success: boolean; data: any }>('/auth/me');
  }

  // Institutions
  async getInstitutions() {
    return this.request<{ success: boolean; data: any[] }>('/institutions');
  }

  async createInstitution(data: any) {
    return this.request('/institutions', { method: 'POST', body: data });
  }

  async getInstitution(id: string) {
    return this.request<{ success: boolean; data: any }>(`/institutions/${id}`);
  }

  async updateInstitution(id: string, data: any) {
    return this.request(`/institutions/${id}`, { method: 'PUT', body: data });
  }

  // Faculty
  async getFaculty(institutionId?: string) {
    const query = institutionId ? `?institutionId=${institutionId}` : '';
    return this.request<{ success: boolean; data: any[] }>(`/faculty${query}`);
  }

  async createFaculty(data: any) {
    return this.request('/faculty', { method: 'POST', body: data });
  }

  async updateFaculty(id: string, data: any) {
    return this.request(`/faculty/${id}`, { method: 'PUT', body: data });
  }

  async deleteFaculty(id: string) {
    return this.request(`/faculty/${id}`, { method: 'DELETE' });
  }

  async importFaculty(data: any[], institutionId: string) {
    return this.request('/faculty/import', { method: 'POST', body: { data, institutionId } });
  }

  // Subjects
  async getSubjects(institutionId?: string) {
    const query = institutionId ? `?institutionId=${institutionId}` : '';
    return this.request<{ success: boolean; data: any[] }>(`/subjects${query}`);
  }

  async createSubject(data: any) {
    return this.request('/subjects', { method: 'POST', body: data });
  }

  async updateSubject(id: string, data: any) {
    return this.request(`/subjects/${id}`, { method: 'PUT', body: data });
  }

  async deleteSubject(id: string) {
    return this.request(`/subjects/${id}`, { method: 'DELETE' });
  }

  async importSubjects(data: any[], institutionId: string) {
    return this.request('/subjects/import', { method: 'POST', body: { data, institutionId } });
  }

  // Sections
  async getSections(institutionId?: string) {
    const query = institutionId ? `?institutionId=${institutionId}` : '';
    return this.request<{ success: boolean; data: any[] }>(`/sections${query}`);
  }

  async createSection(data: any) {
    return this.request('/sections', { method: 'POST', body: data });
  }

  // Rooms
  async getRooms(institutionId?: string) {
    const query = institutionId ? `?institutionId=${institutionId}` : '';
    return this.request<{ success: boolean; data: any[] }>(`/rooms${query}`);
  }

  async createRoom(data: any) {
    return this.request('/rooms', { method: 'POST', body: data });
  }

  async updateRoom(id: string, data: any) {
    return this.request(`/rooms/${id}`, { method: 'PUT', body: data });
  }

  async deleteRoom(id: string) {
    return this.request(`/rooms/${id}`, { method: 'DELETE' });
  }

  async importRooms(data: any[], institutionId: string) {
    return this.request('/rooms/import', { method: 'POST', body: { data, institutionId } });
  }

  // Constraints
  async getConstraints(institutionId?: string) {
    const query = institutionId ? `?institutionId=${institutionId}` : '';
    return this.request<{ success: boolean; data: any[] }>(`/constraints${query}`);
  }

  async createConstraint(data: any) {
    return this.request('/constraints', { method: 'POST', body: data });
  }

  async deleteConstraint(id: string) {
    return this.request(`/constraints/${id}`, { method: 'DELETE' });
  }

  // Timetable Generation
  async generateTimetable(institutionId: string, variationCount = 50) {
    return this.request<{ success: boolean; data: { jobId: string } }>('/timetable/generate', {
      method: 'POST',
      body: { institutionId, variationCount },
    });
  }

  createProgressStream(jobId: string): EventSource {
    const token = this.getToken();
    return new EventSource(`${this.baseUrl}/timetable/generate/${jobId}/progress?token=${token}`);
  }

  // Timetable Versions
  async getVersions(institutionId?: string) {
    const query = institutionId ? `?institutionId=${institutionId}` : '';
    return this.request<{ success: boolean; data: any[] }>(`/timetable/versions${query}`);
  }

  async getVersion(id: string) {
    return this.request<{ success: boolean; data: any }>(`/timetable/versions/${id}`);
  }

  async deleteVersion(id: string) {
    return this.request(`/timetable/versions/${id}`, { method: 'DELETE' });
  }

  async publishVersion(id: string) {
    return this.request(`/timetable/versions/${id}/publish`, { method: 'PUT' });
  }

  // Slot Operations
  async updateSlot(id: string, data: any) {
    return this.request(`/timetable/slots/${id}`, { method: 'PUT', body: data });
  }

  async swapSlots(slotIdA: string, slotIdB: string) {
    return this.request('/timetable/slots/swap', { method: 'POST', body: { slotIdA, slotIdB } });
  }

  async toggleLock(id: string) {
    return this.request(`/timetable/slots/${id}/lock`, { method: 'POST' });
  }

  async checkConflict(data: any) {
    return this.request<{ success: boolean; data: { hasConflict: boolean; conflicts: any[] } }>(
      '/timetable/slots/check-conflict', { method: 'POST', body: data }
    );
  }

  // Annotations
  async addAnnotation(versionId: string, cellRef: string, text: string) {
    return this.request(`/timetable/versions/${versionId}/annotate`, {
      method: 'POST',
      body: { cellRef, text },
    });
  }

  // Snapshots
  async createSnapshot(versionId: string) {
    return this.request(`/timetable/versions/${versionId}/snapshot`, { method: 'POST' });
  }

  // Export templates
  getTemplateUrl(type: 'faculty' | 'subjects' | 'rooms') {
    return `${this.baseUrl}/export/template/${type}`;
  }
}

export const api = new ApiClient(API_BASE);
