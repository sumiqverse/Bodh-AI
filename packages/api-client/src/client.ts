/** Typed API client connecting to BodhAI FastAPI backend. */

import type { components, paths } from './schema';

export type Paths = paths;
export type HealthResponse = components['schemas']['HealthResponse'];
export type ReadyResponse = components['schemas']['ReadyResponse'];
export type CurriculumResponse = components['schemas']['CurriculumResponse'];
export type TopicResponse = components['schemas']['TopicResponse'];
export type SkillResponse = components['schemas']['SkillResponse'];
export type PrerequisiteResponse = components['schemas']['PrerequisiteResponse'];
export type QuestionResponse = components['schemas']['QuestionResponse'];
export type AttemptSubmitRequest = components['schemas']['AttemptSubmitRequest'];
export type AttemptResponse = components['schemas']['AttemptResponse'];
export type MasteryResponse = components['schemas']['MasteryResponse'];
export type ConsentCreateRequest = components['schemas']['ConsentCreateRequest'];
export type ConsentResponse = components['schemas']['ConsentResponse'];
export type SyncBatchRequest = components['schemas']['SyncBatchRequest'];
export type SyncBatchResponse = components['schemas']['SyncBatchResponse'];

export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  request_id?: string;
  invalid_params?: Array<{ name: string; reason: string }>;
}

export interface ApiClientOptions {
  readonly baseUrl: string;
  readonly fetchFn?: typeof fetch;
}

export class BodhaiApiClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  public constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.fetchFn = options.fetchFn ?? fetch;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = new Headers(options.headers);
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    const response = await this.fetchFn(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let problemDetail: ProblemDetail | null = null;
      try {
        problemDetail = (await response.json()) as ProblemDetail;
      } catch {
        // Fallback to text
      }

      if (problemDetail && problemDetail.detail) {
        throw new Error(`API Error [${response.status}]: ${problemDetail.detail}`);
      }
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    return (await response.json()) as T;
  }

  public async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health');
  }

  public async getReady(): Promise<ReadyResponse> {
    return this.request<ReadyResponse>('/ready');
  }

  public async listCurricula(params?: {
    grade?: number;
    board?: string;
  }): Promise<CurriculumResponse[]> {
    const query = new URLSearchParams();
    if (params?.grade !== undefined) query.set('grade', params.grade.toString());
    if (params?.board !== undefined) query.set('board', params.board);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<CurriculumResponse[]>(`/api/v1/curricula${qs}`);
  }

  public async getCurriculum(code: string): Promise<CurriculumResponse> {
    return this.request<CurriculumResponse>(`/api/v1/curricula/${encodeURIComponent(code)}`);
  }

  public async getCurriculumTopics(code: string): Promise<TopicResponse[]> {
    return this.request<TopicResponse[]>(`/api/v1/curricula/${encodeURIComponent(code)}/topics`);
  }

  public async getSkill(skillId: string): Promise<SkillResponse> {
    return this.request<SkillResponse>(`/api/v1/skills/${encodeURIComponent(skillId)}`);
  }

  public async getSkillPrerequisites(skillId: string): Promise<PrerequisiteResponse[]> {
    return this.request<PrerequisiteResponse[]>(
      `/api/v1/skills/${encodeURIComponent(skillId)}/prerequisites`,
    );
  }

  public async listQuestions(params: {
    skillId: string;
    language?: string;
    skip?: number;
    limit?: number;
  }): Promise<QuestionResponse[]> {
    const query = new URLSearchParams();
    query.set('skill_id', params.skillId);
    if (params.language) query.set('language', params.language);
    if (params.skip !== undefined) query.set('skip', params.skip.toString());
    if (params.limit !== undefined) query.set('limit', params.limit.toString());
    return this.request<QuestionResponse[]>(`/api/v1/questions?${query.toString()}`);
  }

  public async submitAttempt(
    attempt: AttemptSubmitRequest,
    studentId?: string,
  ): Promise<AttemptResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (studentId) {
      headers['X-Student-Id'] = studentId;
    }
    return this.request<AttemptResponse>('/api/v1/attempts', {
      method: 'POST',
      headers,
      body: JSON.stringify(attempt),
    });
  }

  public async listMastery(studentId: string): Promise<MasteryResponse[]> {
    const query = new URLSearchParams({ student_id: studentId });
    return this.request<MasteryResponse[]>(`/api/v1/mastery?${query.toString()}`);
  }

  public async createConsent(
    consent: ConsentCreateRequest,
    studentId?: string,
  ): Promise<ConsentResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (studentId) {
      headers['X-Student-Id'] = studentId;
    }
    return this.request<ConsentResponse>('/api/v1/consents', {
      method: 'POST',
      headers,
      body: JSON.stringify(consent),
    });
  }

  public async listConsents(studentId: string): Promise<ConsentResponse[]> {
    const query = new URLSearchParams({ student_id: studentId });
    return this.request<ConsentResponse[]>(`/api/v1/consents?${query.toString()}`);
  }

  public async syncOfflineEvents(
    batch: SyncBatchRequest,
    studentId?: string,
  ): Promise<SyncBatchResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (studentId) {
      headers['X-Student-Id'] = studentId;
    }
    return this.request<SyncBatchResponse>('/api/v1/sync', {
      method: 'POST',
      headers,
      body: JSON.stringify(batch),
    });
  }
}
