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
export interface SearchTopicItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  sequence_order: number;
  curriculum_id: string;
  curriculum_code: string;
  grade: number;
  subject: string;
}

export interface SearchSkillItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  difficulty: number;
  blooms_level: string;
  topic_id: string;
  topic_code: string;
  topic_name: string;
  grade: number;
  subject: string;
}

export interface CurriculumSearchResponse {
  query: string;
  grade?: number | null;
  subject?: string | null;
  total_topics: number;
  total_skills: number;
  topics: SearchTopicItem[];
  skills: SearchSkillItem[];
}

export interface ClassroomQuestionItem {
  id: string;
  code: string;
  prompt: string;
  options: Array<{ id: string; text: string; is_correct?: boolean; distractor_feedback?: string }>;
  explanation: string;
  hints: string[];
  difficulty: number;
  is_custom: boolean;
}

export interface ClassroomSkillItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  difficulty: number;
  blooms_level: string;
  questions: ClassroomQuestionItem[];
}

export interface ClassroomTopicItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  sequence_order: number;
  skills: ClassroomSkillItem[];
}

export interface ClassroomContentResponse {
  class_id: string;
  class_name: string;
  grade: number;
  subject: string;
  curriculum_code: string;
  topics: ClassroomTopicItem[];
  custom_questions_count: number;
}

export interface CustomQuestionCreateRequest {
  skill_code: string;
  prompt_en: string;
  prompt_hi?: string | null;
  options: Array<{ id: string; text: string; is_correct: boolean; distractor_feedback?: string }>;
  difficulty: number;
  explanation: string;
  hints: string[];
}

export interface CustomQuestionResponse {
  id: string;
  code: string;
  skill_code: string;
  prompt: string;
  options: Array<{ id: string; text: string; is_correct: boolean }>;
  explanation: string;
  hints: string[];
  difficulty: number;
  status: string;
}

export interface ContentUploadResult {
  status: string;
  class_id: string;
  imported_count: number;
  message: string;
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
  question_type?: 'mcq' | 'numeric' | 'short_text' | string;
  topic_name?: string | null;
}

export interface DiagnosticResponse {
  session_id: string;
  is_completed: boolean;
  questions_answered: number;
  next_item?: DiagnosticItemResponse | null;
  rationale?: string;
  stop_reason?: string | null;
  summary?: Record<string, unknown> | null;
  last_is_correct?: boolean | null;
  correct_answer_id?: string | null;
  explanation?: string | null;
  is_weakness_review?: boolean;
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

export interface AuditLogItemResponse {
  id: string;
  user_id?: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  changes: Record<string, unknown>;
  ip_address?: string | null;
  created_at: string;
}

export interface AuditLogListResponse {
  total: number;
  items: AuditLogItemResponse[];
  limit: number;
  offset: number;
}

// Teacher Dashboard Heatmap & Aggregates
export interface HeatmapStudent {
  student_id: string;
  student_name: string;
  roll_number?: string | null;
}

export interface HeatmapSkill {
  skill_id: string;
  skill_code: string;
  skill_name: string;
  topic_name: string;
  difficulty: number;
}

export interface HeatmapCell {
  student_id: string;
  skill_id: string;
  state: 'not_learned' | 'partial' | 'mastered' | string;
  p_mastery: number;
  confidence: number;
  attempts_count: number;
  last_attempted_at?: string | null;
}

export interface ClassHeatmapResponse {
  class_id: string;
  total_students: number;
  total_skills: number;
  students: HeatmapStudent[];
  skills: HeatmapSkill[];
  matrix: HeatmapCell[];
  summary: {
    mastered: number;
    partial: number;
    not_learned: number;
  };
}

export interface SuggestedRevisionPlan {
  strategy: string;
  focus_skill: string;
  target_group_size: number;
  suggested_actions: string[];
  recommended_duration_mins: number;
}

export interface GapClusterItem {
  cluster_id: string;
  skill_id: string;
  skill_code: string;
  skill_name: string;
  topic_name: string;
  student_count: number;
  student_ids: string[];
  student_names: string[];
  average_p_mastery: number;
  suggested_revision_plan: SuggestedRevisionPlan;
}

export interface ClassGapClustersResponse {
  class_id: string;
  total_clusters: number;
  clusters: GapClusterItem[];
}

export interface EarlyWarningItem {
  student_id: string;
  student_name: string;
  roll_number?: string | null;
  warning_type: 'stalled' | 'dropped' | 'inactive' | string;
  days_inactive_or_stalled: number;
  message: string;
  suggested_action: string;
}

export interface ClassEarlyWarningsResponse {
  class_id: string;
  threshold_days: number;
  warnings: EarlyWarningItem[];
}

export interface StudentProfileSkillItem {
  skill_id: string;
  skill_code: string;
  skill_name: string;
  topic_name: string;
  p_mastery: number;
  state: 'not_learned' | 'partial' | 'mastered' | string;
  attempts_count: number;
  correct_count: number;
  last_attempted_at?: string | null;
}

export interface ErrorPatternItem {
  question_code: string;
  prompt_excerpt: string;
  distractor_chosen: string;
  count: number;
  misconception: string;
}

export interface HintUsageSummary {
  total_hints_requested: number;
  hint_1_count: number;
  hint_2_count: number;
  hint_3_count: number;
  independent_attempts_count: number;
}

export interface MasteryTrendPoint {
  date: string;
  p_mastery: number;
  attempts: number;
}

export interface StudentProfileResponse {
  student_id: string;
  student_name: string;
  roll_number?: string | null;
  skills: StudentProfileSkillItem[];
  error_patterns: ErrorPatternItem[];
  hint_usage: HintUsageSummary;
  trend: MasteryTrendPoint[];
  summary: {
    total_attempts: number;
    mastered_skills: number;
    total_skills: number;
  };
}

export interface SuggestionItem {
  suggestion_id: string;
  student_id?: string | null;
  student_name?: string | null;
  skill_id: string;
  skill_code: string;
  skill_name: string;
  title: string;
  evidence: Record<string, unknown>;
  rationale: string;
  recommended_action: string;
  is_ai_suggestion: boolean;
  disclaimer: string;
  status: 'pending' | 'accepted' | 'edited' | 'ignored' | 'overridden' | string;
}

export interface ClassSuggestionsResponse {
  class_id: string;
  suggestions: SuggestionItem[];
}

export interface TeacherDecisionCreateRequest {
  action: 'accept' | 'edit' | 'ignore' | 'override' | string;
  student_id?: string | null;
  evidence?: Record<string, unknown>;
  rationale?: string;
  teacher_notes?: string | null;
  custom_payload?: Record<string, unknown>;
}

export interface TeacherDecisionResponse {
  id: string;
  class_id: string;
  teacher_id: string;
  student_id?: string | null;
  suggestion_id: string;
  action: string;
  teacher_notes?: string | null;
  created_at: string;
}

export interface AssignmentCreateRequest {
  title: string;
  description?: string | null;
  skill_ids: string[];
  student_ids?: string[] | null;
  due_date?: string | null;
}

export interface AssignmentStudentItem {
  student_id: string;
  student_name: string;
  status: string;
  completed_at?: string | null;
}

export interface AssignmentResponse {
  id: string;
  class_id: string;
  title: string;
  description?: string | null;
  skill_ids: string[];
  due_date?: string | null;
  status: string;
  total_assigned: number;
  completed_count: number;
  students: AssignmentStudentItem[];
  created_at: string;
}

export interface ClassProgressSummaryResponse {
  class_id: string;
  total_students: number;
  total_attempts: number;
  overall_mastery_pct: number;
  mastered_skills_avg: number;
  reassessment_growth_pct: number;
  timeline: Array<{
    label: string;
    mastery_pct: number;
  }>;
}

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
  readonly getToken?: () => string | null;
}

export interface UserProfileResponse<T = Record<string, unknown>> {
  type: 'teacher' | 'student';
  profile: T;
}

export interface ProfileUpdatePayload {
  fullName?: string;
  fullNameHi?: string;
  title?: string;
  titleHi?: string;
  experienceYears?: number;
  schoolName?: string;
  department?: string;
  qualifications?: string;
  bio?: string;
  bioHi?: string;
  phone?: string;
  officeHours?: string;
  specializations?: string[];
  avatarUrl?: string;
}

export interface SetupCohortPayload {
  grade?: number;
  section?: string;
  subject?: string;
  className?: string;
}

export class BodhaiApiClient {
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly defaultHeaders: Record<string, string>;
  private readonly getToken?: () => string | null;

  public constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    const defaultFetch = typeof window !== 'undefined' ? window.fetch.bind(window) : fetch;
    this.fetchFn = options.fetchFn ?? defaultFetch;
    this.defaultHeaders = options.defaultHeaders ?? {};
    this.getToken = options.getToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = new Headers(this.defaultHeaders);

    if (options.headers) {
      const extraHeaders = new Headers(options.headers);
      extraHeaders.forEach((val, key) => headers.set(key, val));
    }

    if (!headers.has('Authorization') && this.getToken) {
      const autoToken = this.getToken();
      if (autoToken) {
        headers.set('Authorization', `Bearer ${autoToken}`);
      }
    }

    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    const signal =
      options.signal ??
      (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
        ? AbortSignal.timeout(45000)
        : undefined);

    const response = await this.fetchFn(url, {
      ...options,
      signal,
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
        let details = '';
        if (
          Array.isArray(problemDetail.invalid_params) &&
          problemDetail.invalid_params.length > 0
        ) {
          details =
            ': ' + problemDetail.invalid_params.map((p) => `${p.name} (${p.reason})`).join(', ');
        }
        throw new Error(`API Error [${response.status}]: ${problemDetail.detail}${details}`);
      }
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }

    return (await response.json()) as T;
  }

  private authHeaders(token?: string): Record<string, string> {
    const headers: Record<string, string> = {};
    const effectiveToken = token ?? this.getToken?.() ?? undefined;
    if (effectiveToken) {
      headers['Authorization'] = `Bearer ${effectiveToken}`;
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

  public async getAuditLogs(
    params?: {
      action?: string;
      resource_type?: string;
      user_id?: string;
      limit?: number;
      offset?: number;
    },
    token?: string,
  ): Promise<AuditLogListResponse> {
    const query = new URLSearchParams();
    if (params?.action) query.set('action', params.action);
    if (params?.resource_type) query.set('resource_type', params.resource_type);
    if (params?.user_id) query.set('user_id', params.user_id);
    if (params?.limit !== undefined) query.set('limit', params.limit.toString());
    if (params?.offset !== undefined) query.set('offset', params.offset.toString());
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<AuditLogListResponse>(`/api/v1/admin/audit-logs${qs}`, {
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

  public async getCurriculumTopics(code: string, token?: string): Promise<TopicResponse[]> {
    return this.request<TopicResponse[]>(`/api/v1/curricula/${encodeURIComponent(code)}/topics`, {
      headers: this.authHeaders(token),
    });
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

  // --- Teacher Dashboard Methods ---

  public async getClassHeatmap(
    classId: string,
    curriculumCode?: string,
    token?: string,
  ): Promise<ClassHeatmapResponse> {
    const qs = curriculumCode ? `?curriculum_code=${encodeURIComponent(curriculumCode)}` : '';
    return this.request<ClassHeatmapResponse>(
      `/api/v1/classes/${encodeURIComponent(classId)}/heatmap${qs}`,
      {
        headers: this.authHeaders(token),
      },
    );
  }

  public async getClassGapClusters(
    classId: string,
    minStudents?: number,
    minRatio?: number,
    token?: string,
  ): Promise<ClassGapClustersResponse> {
    const params = new URLSearchParams();
    if (minStudents !== undefined) params.set('min_students', minStudents.toString());
    if (minRatio !== undefined) params.set('min_ratio', minRatio.toString());
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<ClassGapClustersResponse>(
      `/api/v1/classes/${encodeURIComponent(classId)}/gap-clusters${qs}`,
      {
        headers: this.authHeaders(token),
      },
    );
  }

  public async getClassEarlyWarnings(
    classId: string,
    days?: number,
    token?: string,
  ): Promise<ClassEarlyWarningsResponse> {
    const qs = days ? `?days=${days}` : '';
    return this.request<ClassEarlyWarningsResponse>(
      `/api/v1/classes/${encodeURIComponent(classId)}/early-warnings${qs}`,
      {
        headers: this.authHeaders(token),
      },
    );
  }

  public async getStudentProfile(
    classId: string,
    studentId: string,
    token?: string,
  ): Promise<StudentProfileResponse> {
    return this.request<StudentProfileResponse>(
      `/api/v1/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}/profile`,
      {
        headers: this.authHeaders(token),
      },
    );
  }

  public async getClassSuggestions(
    classId: string,
    token?: string,
  ): Promise<ClassSuggestionsResponse> {
    return this.request<ClassSuggestionsResponse>(
      `/api/v1/classes/${encodeURIComponent(classId)}/suggestions`,
      {
        headers: this.authHeaders(token),
      },
    );
  }

  public async recordTeacherDecision(
    classId: string,
    suggestionId: string,
    payload: TeacherDecisionCreateRequest,
    token?: string,
  ): Promise<TeacherDecisionResponse> {
    return this.request<TeacherDecisionResponse>(
      `/api/v1/classes/${encodeURIComponent(classId)}/suggestions/${encodeURIComponent(suggestionId)}/decision`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders(token),
        },
        body: JSON.stringify(payload),
      },
    );
  }

  public async createAssignment(
    classId: string,
    payload: AssignmentCreateRequest,
    token?: string,
  ): Promise<AssignmentResponse> {
    return this.request<AssignmentResponse>(
      `/api/v1/classes/${encodeURIComponent(classId)}/assignments`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders(token),
        },
        body: JSON.stringify(payload),
      },
    );
  }

  public async listAssignments(classId: string, token?: string): Promise<AssignmentResponse[]> {
    return this.request<AssignmentResponse[]>(
      `/api/v1/classes/${encodeURIComponent(classId)}/assignments`,
      {
        headers: this.authHeaders(token),
      },
    );
  }

  public async getClassProgressSummary(
    classId: string,
    token?: string,
  ): Promise<ClassProgressSummaryResponse> {
    return this.request<ClassProgressSummaryResponse>(
      `/api/v1/classes/${encodeURIComponent(classId)}/progress-summary`,
      {
        headers: this.authHeaders(token),
      },
    );
  }

  public async exportClassCsv(classId: string, token?: string): Promise<string> {
    const url = `${this.baseUrl}/api/v1/classes/${encodeURIComponent(classId)}/export/csv`;
    const res = await fetch(url, {
      headers: this.authHeaders(token),
    });
    if (!res.ok) {
      throw new Error(`Export CSV failed: ${res.statusText}`);
    }
    return res.text();
  }

  public async searchCurriculumContent(
    query: string,
    params?: { grade?: number; subject?: string; limit?: number },
    token?: string,
  ): Promise<CurriculumSearchResponse> {
    const qp = new URLSearchParams({ q: query });
    if (params?.grade) qp.set('grade', params.grade.toString());
    if (params?.subject) qp.set('subject', params.subject);
    if (params?.limit) qp.set('limit', params.limit.toString());
    return this.request<CurriculumSearchResponse>(`/api/v1/curricula/search?${qp.toString()}`, {
      headers: this.authHeaders(token),
    });
  }

  public async getClassroomContent(
    classId: string,
    subject?: string,
    token?: string,
  ): Promise<ClassroomContentResponse> {
    const qp = subject ? `?subject=${encodeURIComponent(subject)}` : '';
    return this.request<ClassroomContentResponse>(
      `/api/v1/classes/${encodeURIComponent(classId)}/content${qp}`,
      { headers: this.authHeaders(token) },
    );
  }

  public async createClassroomQuestion(
    classId: string,
    payload: CustomQuestionCreateRequest,
    token?: string,
  ): Promise<CustomQuestionResponse> {
    return this.request<CustomQuestionResponse>(
      `/api/v1/classes/${encodeURIComponent(classId)}/questions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders(token),
        },
        body: JSON.stringify(payload),
      },
    );
  }

  public async uploadClassroomContent(
    classId: string,
    payload: { questions: Record<string, unknown>[] },
    token?: string,
  ): Promise<ContentUploadResult> {
    return this.request<ContentUploadResult>(
      `/api/v1/classes/${encodeURIComponent(classId)}/content/upload`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.authHeaders(token),
        },
        body: JSON.stringify(payload),
      },
    );
  }

  public async getMyProfile<T = Record<string, unknown>>(
    token?: string,
  ): Promise<UserProfileResponse<T>> {
    return this.request<UserProfileResponse<T>>('/api/v1/profiles/me', {
      headers: this.authHeaders(token),
    });
  }

  public async updateMyProfile<T = Record<string, unknown>>(
    payload: ProfileUpdatePayload,
    token?: string,
  ): Promise<UserProfileResponse<T>> {
    return this.request<UserProfileResponse<T>>('/api/v1/profiles/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeaders(token),
      },
      body: JSON.stringify(payload),
    });
  }

  public async setupCohort<T = Record<string, unknown>>(
    payload?: SetupCohortPayload,
    token?: string,
  ): Promise<UserProfileResponse<T>> {
    return this.request<UserProfileResponse<T>>('/api/v1/profiles/setup-cohort', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeaders(token),
      },
      body: JSON.stringify(payload || {}),
    });
  }
}
