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
export type ConsentCreateRequest = components['schemas']['GuardianConsentCreateRequest'];
export type ConsentResponse = components['schemas']['ConsentDetailResponse'];
export type SyncBatchRequest = components['schemas']['SyncBatchRequest'];
export type SyncBatchResponse = components['schemas']['SyncBatchResponse'];

// Auth & User types
export type TeacherSignupRequest = components['schemas']['TeacherSignupRequest'];
export type TeacherLoginRequest = components['schemas']['TeacherLoginRequest'];
export type StudentLoginRequest = components['schemas']['StudentLoginRequest'];
export type StudentJoinRequest = components['schemas']['StudentJoinRequest'];
export type SupabaseAuthRequest = components['schemas']['SupabaseAuthRequest'];
export type TokenResponse = components['schemas']['TokenResponse'];
export type UserResponse = components['schemas']['UserResponse'];

// Class types
export type ClassCreateRequest = components['schemas']['ClassCreateRequest'];
export type ClassResponse = components['schemas']['ClassResponse'];
export type ClassDetailResponse = components['schemas']['ClassDetailResponse'];
export type RotateCodeResponse = components['schemas']['RotateCodeResponse'];
export type EnrollmentActionResponse = components['schemas']['EnrollmentActionResponse'];
export type StudentRosterItem = components['schemas']['StudentRosterItem'];

// Consent & DPDP types
export type GuardianConsentCreateRequest = components['schemas']['GuardianConsentCreateRequest'];
export type ConsentDetailResponse = components['schemas']['ConsentDetailResponse'];
export type ConsentWithdrawRequest = components['schemas']['ConsentWithdrawRequest'];
export type StudentDataExportResponse = components['schemas']['StudentDataExportResponse'];
export type DataDeleteResponse = components['schemas']['DataDeleteResponse'];

// Admin types
export type AdminSchoolStatsResponse = components['schemas']['AdminSchoolStatsResponse'];

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
  readonly defaultHeaders?: Record<string, string>;
}

export class BodhaiApiClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly defaultHeaders: Record<string, string>;

  public constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.fetchFn = options.fetchFn ?? fetch;
    this.defaultHeaders = options.defaultHeaders ?? {};
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = new Headers(this.defaultHeaders);

    if (options.headers) {
      const extraHeaders = new Headers(options.headers);
      extraHeaders.forEach((val, key) => headers.set(key, val));
    }

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

  private authHeaders(token?: string): Record<string, string> {
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // --- Health & Probes ---
  public async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health');
  }

  public async getReady(): Promise<ReadyResponse> {
    return this.request<ReadyResponse>('/ready');
  }

  // --- Auth Endpoints ---
  public async teacherSignup(payload: TeacherSignupRequest): Promise<TokenResponse> {
    return this.request<TokenResponse>('/api/v1/auth/teacher/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  public async teacherLogin(payload: TeacherLoginRequest): Promise<TokenResponse> {
    return this.request<TokenResponse>('/api/v1/auth/teacher/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  public async studentLogin(payload: StudentLoginRequest): Promise<TokenResponse> {
    return this.request<TokenResponse>('/api/v1/auth/student/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  public async studentJoin(payload: StudentJoinRequest): Promise<TokenResponse> {
    return this.request<TokenResponse>('/api/v1/auth/student/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  public async supabaseAuth(payload: SupabaseAuthRequest): Promise<TokenResponse> {
    return this.request<TokenResponse>('/api/v1/auth/supabase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  public async logout(token?: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/api/v1/auth/logout', {
      method: 'POST',
      headers: this.authHeaders(token),
    });
  }

  public async getMe(token?: string): Promise<UserResponse> {
    return this.request<UserResponse>('/api/v1/auth/me', {
      headers: this.authHeaders(token),
    });
  }

  // --- Class Management Endpoints ---
  public async createClass(payload: ClassCreateRequest, token?: string): Promise<ClassResponse> {
    return this.request<ClassResponse>('/api/v1/classes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeaders(token),
      },
      body: JSON.stringify(payload),
    });
  }

  public async listClasses(token?: string): Promise<ClassResponse[]> {
    return this.request<ClassResponse[]>('/api/v1/classes', {
      headers: this.authHeaders(token),
    });
  }

  public async getClassDetails(classId: string, token?: string): Promise<ClassDetailResponse> {
    return this.request<ClassDetailResponse>(`/api/v1/classes/${encodeURIComponent(classId)}`, {
      headers: this.authHeaders(token),
    });
  }

  public async rotateClassJoinCode(classId: string, token?: string): Promise<RotateCodeResponse> {
    return this.request<RotateCodeResponse>(
      `/api/v1/classes/${encodeURIComponent(classId)}/rotate-code`,
      {
        method: 'POST',
        headers: this.authHeaders(token),
      },
    );
  }

  public async approveStudent(
    classId: string,
    studentId: string,
    token?: string,
  ): Promise<EnrollmentActionResponse> {
    return this.request<EnrollmentActionResponse>(
      `/api/v1/classes/${encodeURIComponent(classId)}/approve/${encodeURIComponent(studentId)}`,
      {
        method: 'POST',
        headers: this.authHeaders(token),
      },
    );
  }

  public async removeStudent(
    classId: string,
    studentId: string,
    token?: string,
  ): Promise<EnrollmentActionResponse> {
    return this.request<EnrollmentActionResponse>(
      `/api/v1/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}`,
      {
        method: 'DELETE',
        headers: this.authHeaders(token),
      },
    );
  }

  // --- Consent & DPDP Compliance Endpoints ---
  public async recordGuardianConsent(
    payload: GuardianConsentCreateRequest,
    token?: string,
  ): Promise<ConsentDetailResponse[]> {
    return this.request<ConsentDetailResponse[]>('/api/v1/consents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeaders(token),
      },
      body: JSON.stringify(payload),
    });
  }

  public async withdrawConsent(
    payload: ConsentWithdrawRequest,
    token?: string,
  ): Promise<{ message: string; student_id: string }> {
    return this.request<{ message: string; student_id: string }>('/api/v1/consents/withdraw', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeaders(token),
      },
      body: JSON.stringify(payload),
    });
  }

  public async getStudentConsents(
    studentId: string,
    token?: string,
  ): Promise<ConsentDetailResponse[]> {
    return this.request<ConsentDetailResponse[]>(
      `/api/v1/consents/student/${encodeURIComponent(studentId)}`,
      {
        headers: this.authHeaders(token),
      },
    );
  }

  // --- Data Rights Endpoints (DPDP) ---
  public async exportStudentData(
    studentId: string,
    token?: string,
  ): Promise<StudentDataExportResponse> {
    return this.request<StudentDataExportResponse>(
      `/api/v1/data-rights/export/${encodeURIComponent(studentId)}`,
      {
        headers: this.authHeaders(token),
      },
    );
  }

  public async deleteStudentData(studentId: string, token?: string): Promise<DataDeleteResponse> {
    return this.request<DataDeleteResponse>(
      `/api/v1/data-rights/delete/${encodeURIComponent(studentId)}`,
      {
        method: 'POST',
        headers: this.authHeaders(token),
      },
    );
  }

  // --- Admin Endpoints ---
  public async getSchoolStats(token?: string): Promise<AdminSchoolStatsResponse> {
    return this.request<AdminSchoolStatsResponse>('/api/v1/admin/stats', {
      headers: this.authHeaders(token),
    });
  }

  // --- Curriculum & Content Endpoints ---
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
