/** Typed API client connecting to BodhAI FastAPI backend. */

import type { components, paths } from './schema';

export type Paths = paths;
export type HealthResponse = components['schemas']['HealthResponse'];
export type ReadyResponse = components['schemas']['ReadyResponse'];
export interface PrerequisiteResponse {
  skill_id: string;
  prerequisite_id: string;
  prerequisite_code?: string;
  prerequisite_name?: string;
  relationship_type: string;
}

export interface SkillResponse {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  topic_id: string;
  topic_code?: string | null;
  blooms_level?: string | null;
  difficulty: number;
  prerequisites?: PrerequisiteResponse[];
}

export interface TopicResponse {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  order_index?: number;
  curriculum_id?: string;
  skills: SkillResponse[];
}

export interface CurriculumResponse {
  id: string;
  code: string;
  name: string;
  board: string;
  grade: number;
  subject: string;
  version: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
  topics?: TopicResponse[];
}
export interface QuestionOptionItem {
  id: string;
  text: string;
}

export interface QuestionResponse {
  id: string;
  code?: string;
  skill_id: string;
  difficulty: number;
  question_type: string;
  prompt: string;
  options?: QuestionOptionItem[] | null;
  hints?: string[];
}

export type AttemptSubmitRequest = components['schemas']['AttemptSubmitRequest'];
export type AttemptResponse = components['schemas']['AttemptResponse'];

export interface MasteryResponse {
  skill_id: string;
  p_mastery: number;
  confidence: number;
  attempts_count: number;
  correct_count: number;
  last_attempted_at?: string | null;
  state?: 'not_learned' | 'partial' | 'mastered' | string;
  rationale?: string;
}
export type ConsentCreateRequest = components['schemas']['GuardianConsentCreateRequest'];
export type ConsentResponse = components['schemas']['ConsentDetailResponse'];
export type SyncBatchRequest = components['schemas']['SyncBatchRequest'];
export type SyncBatchResponse = components['schemas']['SyncBatchResponse'];

// Adaptive & Diagnostic types
export interface DiagnosticStartRequest {
  curriculum_code?: string;
  initial_skills?: string[];
}

export interface DiagnosticProgressRequest {
  session_id: string;
  question_id: string;
  selected_answer: string;
  time_spent_ms: number;
  hint_level?: number;
}

export interface DiagnosticItemResponse {
  question_id: string;
  code: string;
  skill_id: string;
  skill_code: string;
  difficulty: number;
  prompt: string;
  options?: Array<{ id: string; text: string }> | null;
}

export interface DiagnosticResponse {
  session_id: string;
  is_completed: boolean;
  questions_answered: number;
  next_item?: DiagnosticItemResponse | null;
  rationale?: string;
  stop_reason?: string | null;
  summary?: Record<string, unknown> | null;
}

export interface NextItemResponse {
  question_id: string;
  code: string;
  skill_id: string;
  skill_code: string;
  difficulty: number;
  question_type: string;
  prompt: string;
  options?: Array<{ id: string; text: string }> | null;
  hints: string[];
  predicted_success: number;
  score: number;
  score_breakdown: Record<string, number>;
  hint_ladder: number;
  is_test_gate: boolean;
  is_skip_ahead: boolean;
  rationale: string;
}

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

// Content & Curriculum types
export interface GraphNode {
  id: string;
  code: string;
  name: string;
  topic_code: string;
  topic_name?: string;
  blooms_level?: string;
  difficulty?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  relationship_type: string;
}

export interface CurriculumGraphResponse {
  curriculum_code: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ImportDiff {
  curriculum_created: number;
  curriculum_updated: number;
  topics_created: number;
  topics_updated: number;
  skills_created: number;
  skills_updated: number;
  prerequisites_created: number;
  questions_created: number;
  questions_updated: number;
  glossary_created: number;
  glossary_updated: number;
}

export interface ImportResponse {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  diff: ImportDiff | null;
  summary: string;
}

export interface QuestionTranslationDetail {
  language: string;
  question_text: string;
  options?: Array<{ id: string; text: string; is_correct?: boolean }> | null;
  verified_answer?: string | null;
  worked_solution?: string | null;
  explanation?: string | null;
  hints: string[];
}

export interface QuestionVersionItem {
  id: string;
  version_number: number;
  status: string;
  reviewer_id?: string | null;
  review_notes?: string | null;
  created_at: string;
  change_summary?: string | null;
}

export interface QuestionDetailResponse {
  id: string;
  skill_id: string;
  code: string;
  question_type: string;
  difficulty: number;
  status: 'draft' | 'reviewed' | 'published';
  needs_teacher_review: boolean;
  created_at: string;
  updated_at: string;
  translations: QuestionTranslationDetail[];
  versions: QuestionVersionItem[];
}

export interface QuestionUpdateRequest {
  question_type?: string;
  difficulty?: number;
  status?: 'draft' | 'reviewed' | 'published';
  needs_teacher_review?: boolean;
  review_notes?: string;
  translations?: QuestionTranslationDetail[];
}

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
    const defaultFetch = typeof window !== 'undefined' ? window.fetch.bind(window) : fetch;
    this.fetchFn = options.fetchFn ?? defaultFetch;
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
    tokenOrStudentId?: string,
    studentId?: string,
  ): Promise<AttemptResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (tokenOrStudentId) {
      headers['Authorization'] = `Bearer ${tokenOrStudentId}`;
    }
    const sId = studentId ?? tokenOrStudentId;
    if (sId) {
      headers['X-Student-Id'] = sId;
    }
    if (attempt.idempotency_key) {
      headers['Idempotency-Key'] = attempt.idempotency_key;
    }
    return this.request<AttemptResponse>('/api/v1/attempts', {
      method: 'POST',
      headers,
      body: JSON.stringify(attempt),
    });
  }

  public async listMastery(studentId?: string, token?: string): Promise<MasteryResponse[]> {
    const query = new URLSearchParams();
    if (studentId) query.set('student_id', studentId);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<MasteryResponse[]>(`/api/v1/mastery${qs}`, {
      headers: this.authHeaders(token),
    });
  }

  public async startDiagnostic(
    payload: DiagnosticStartRequest,
    token?: string,
  ): Promise<DiagnosticResponse> {
    return this.request<DiagnosticResponse>('/api/v1/diagnostics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeaders(token),
      },
      body: JSON.stringify(payload),
    });
  }

  public async progressDiagnostic(
    payload: DiagnosticProgressRequest,
    token?: string,
  ): Promise<DiagnosticResponse> {
    return this.request<DiagnosticResponse>('/api/v1/diagnostics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeaders(token),
      },
      body: JSON.stringify(payload),
    });
  }

  public async getNextItem(curriculumCode?: string, token?: string): Promise<NextItemResponse> {
    const query = new URLSearchParams();
    if (curriculumCode) query.set('curriculum_code', curriculumCode);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<NextItemResponse>(`/api/v1/next-item${qs}`, {
      headers: this.authHeaders(token),
    });
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

  // --- Content Engine & Editorial Review Workflow Methods ---

  public async getCurriculumGraph(code: string): Promise<CurriculumGraphResponse> {
    return this.request<CurriculumGraphResponse>(
      `/api/v1/curricula/${encodeURIComponent(code)}/graph`,
    );
  }

  public async importContentPack(
    packData: Record<string, unknown>,
    dryRun: boolean = false,
    token?: string,
  ): Promise<ImportResponse> {
    return this.request<ImportResponse>(`/api/v1/curricula/import?dry_run=${dryRun}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeaders(token),
      },
      body: JSON.stringify(packData),
    });
  }

  public async listManageQuestions(
    params?: {
      skill_id?: string;
      status?: string;
      needs_teacher_review?: boolean;
      skip?: number;
      limit?: number;
    },
    token?: string,
  ): Promise<QuestionDetailResponse[]> {
    const query = new URLSearchParams();
    if (params?.skill_id) query.set('skill_id', params.skill_id);
    if (params?.status) query.set('status', params.status);
    if (params?.needs_teacher_review !== undefined) {
      query.set('needs_teacher_review', String(params.needs_teacher_review));
    }
    if (params?.skip !== undefined) query.set('skip', params.skip.toString());
    if (params?.limit !== undefined) query.set('limit', params.limit.toString());
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<QuestionDetailResponse[]>(`/api/v1/questions/manage${qs}`, {
      headers: this.authHeaders(token),
    });
  }

  public async getQuestionDetail(
    questionId: string,
    token?: string,
  ): Promise<QuestionDetailResponse> {
    return this.request<QuestionDetailResponse>(
      `/api/v1/questions/${encodeURIComponent(questionId)}/detail`,
      {
        headers: this.authHeaders(token),
      },
    );
  }

  public async updateQuestionStatus(
    questionId: string,
    status: 'draft' | 'reviewed' | 'published',
    reviewNotes?: string,
    token?: string,
  ): Promise<QuestionDetailResponse> {
    const query = new URLSearchParams({ status });
    if (reviewNotes) query.set('review_notes', reviewNotes);
    return this.request<QuestionDetailResponse>(
      `/api/v1/questions/${encodeURIComponent(questionId)}/status?${query.toString()}`,
      {
        method: 'PUT',
        headers: this.authHeaders(token),
      },
    );
  }

  public async updateQuestion(
    questionId: string,
    payload: QuestionUpdateRequest,
    token?: string,
  ): Promise<QuestionDetailResponse> {
    return this.request<QuestionDetailResponse>(
      `/api/v1/questions/${encodeURIComponent(questionId)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders(token),
        },
        body: JSON.stringify(payload),
      },
    );
  }
}
