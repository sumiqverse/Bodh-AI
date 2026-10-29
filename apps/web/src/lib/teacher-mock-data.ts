/**
 * Authentic Mock Telemetry & Class Data for BodhAI Teacher Dashboard
 * Aligned with NCERT Mathematics Curriculum & DPDP-compliant student cohorts.
 */

import type {
  ClassDetailResponse,
  ClassHeatmapResponse,
  ClassGapClustersResponse,
  ClassEarlyWarningsResponse,
  ClassSuggestionsResponse,
  AssignmentResponse,
  ClassProgressSummaryResponse,
  StudentProfileResponse,
} from '@bodhai/api-client';

export const MOCK_STUDENTS = [
  { student_id: 'stu-001', student_name: 'Aarav Sharma', full_name: 'Aarav Sharma', username: 'aarav_sharma', roll_number: '101', status: 'active' },
  { student_id: 'stu-002', student_name: 'Priya Patel', full_name: 'Priya Patel', username: 'priya_patel', roll_number: '102', status: 'active' },
  { student_id: 'stu-003', student_name: 'Rohan Verma', full_name: 'Rohan Verma', username: 'rohan_verma', roll_number: '103', status: 'active' },
  { student_id: 'stu-004', student_name: 'Ananya Sen', full_name: 'Ananya Sen', username: 'ananya_sen', roll_number: '104', status: 'active' },
  { student_id: 'stu-005', student_name: 'Kabir Das', full_name: 'Kabir Das', username: 'kabir_das', roll_number: '105', status: 'active' },
  { student_id: 'stu-006', student_name: 'Meera Joshi', full_name: 'Meera Joshi', username: 'meera_joshi', roll_number: '106', status: 'active' },
  { student_id: 'stu-007', student_name: 'Vikram Malhotra', full_name: 'Vikram Malhotra', username: 'vikram_m', roll_number: '107', status: 'active' },
  { student_id: 'stu-008', student_name: 'Sneha Reddy', full_name: 'Sneha Reddy', username: 'sneha_reddy', roll_number: '108', status: 'active' },
  { student_id: 'stu-009', student_name: 'Devendra Singh', full_name: 'Devendra Singh', username: 'dev_singh', roll_number: '109', status: 'active' },
  { student_id: 'stu-010', student_name: 'Pooja Nair', full_name: 'Pooja Nair', username: 'pooja_nair', roll_number: '110', status: 'active' },
  { student_id: 'stu-011', student_name: 'Arjun Mehta', full_name: 'Arjun Mehta', username: 'arjun_m', roll_number: '111', status: 'active' },
  { student_id: 'stu-012', student_name: 'Divya Rao', full_name: 'Divya Rao', username: 'divya_rao', roll_number: '112', status: 'active' },
];

export const MOCK_SKILLS = [
  { skill_id: 'sk-m8-rat-01', skill_code: 'M8-RAT-01', skill_name: 'Rational Numbers: Properties & Number Line', topic_name: 'Rational Numbers', difficulty: 0.35 },
  { skill_id: 'sk-m8-rat-02', skill_code: 'M8-RAT-02', skill_name: 'Operations on Rational Numbers', topic_name: 'Rational Numbers', difficulty: 0.50 },
  { skill_id: 'sk-m8-lineq-01', skill_code: 'M8-LE-01', skill_name: 'Linear Equations: Variables on One Side', topic_name: 'Linear Equations', difficulty: 0.40 },
  { skill_id: 'sk-m8-lineq-02', skill_code: 'M8-LE-02', skill_name: 'Linear Equations: Variables on Both Sides', topic_name: 'Linear Equations', difficulty: 0.65 },
  { skill_id: 'sk-m8-quad-01', skill_code: 'M8-QUAD-01', skill_name: 'Understanding Quadrilaterals: Angles Sum', topic_name: 'Quadrilaterals', difficulty: 0.45 },
  { skill_id: 'sk-m8-quad-02', skill_code: 'M8-QUAD-02', skill_name: 'Special Parallelograms (Rhombus, Rectangle)', topic_name: 'Quadrilaterals', difficulty: 0.60 },
  { skill_id: 'sk-m8-data-01', skill_code: 'M8-DATA-01', skill_name: 'Data Handling: Histograms & Frequency', topic_name: 'Data Handling', difficulty: 0.40 },
  { skill_id: 'sk-m8-data-02', skill_code: 'M8-DATA-02', skill_name: 'Probability & Elementary Chance', topic_name: 'Data Handling', difficulty: 0.55 },
  { skill_id: 'sk-m8-sq-01', skill_code: 'M8-SQ-01', skill_name: 'Squares & Square Roots via Prime Factorisation', topic_name: 'Square Roots', difficulty: 0.50 },
  { skill_id: 'sk-m8-sq-02', skill_code: 'M8-SQ-02', skill_name: 'Square Roots by Division Method', topic_name: 'Square Roots', difficulty: 0.70 },
  { skill_id: 'sk-m8-alg-01', skill_code: 'M8-ALG-01', skill_name: 'Algebraic Expressions: Like vs Unlike Terms', topic_name: 'Algebraic Expressions', difficulty: 0.45 },
  { skill_id: 'sk-m8-alg-02', skill_code: 'M8-ALG-02', skill_name: 'Standard Algebraic Identities', topic_name: 'Algebraic Expressions', difficulty: 0.75 },
];

export function getMockClassDetail(classId: string, className = 'Class 8-A Mathematics'): ClassDetailResponse {
  return {
    id: classId,
    name: className,
    grade: 8,
    section: 'A',
    academic_year: '2024-2025',
    join_code: 'MATH8A',
    school_id: 'sch-001',
    teacher_id: 'tchr-001',
    total_students: MOCK_STUDENTS.length,
    created_at: '2026-08-01T00:00:00Z',
    students: MOCK_STUDENTS.map((s) => ({
      student_id: s.student_id,
      full_name: s.full_name,
      username: s.username,
      roll_number: s.roll_number,
      status: s.status,
      enrolled_at: '2026-08-05T09:00:00Z',
    })),
  };
}

export function getMockHeatmap(classId: string): ClassHeatmapResponse {
  const matrix: ClassHeatmapResponse['matrix'] = [];
  let masteredCount = 0;
  let partialCount = 0;
  let notLearnedCount = 0;

  // Calibrated deterministic distribution based on student ability
  MOCK_STUDENTS.forEach((st, sIdx) => {
    MOCK_SKILLS.forEach((sk, kIdx) => {
      // Deterministic seed for realism
      const factor = (sIdx * 7 + kIdx * 11) % 10;
      let state: 'mastered' | 'partial' | 'not_learned' = 'not_learned';
      let pMastery = 0.15;
      let attempts = 0;

      if (factor >= 6) {
        state = 'mastered';
        pMastery = 0.82 + (factor % 3) * 0.06;
        attempts = 3 + (factor % 4);
        masteredCount++;
      } else if (factor >= 3) {
        state = 'partial';
        pMastery = 0.45 + (factor % 3) * 0.1;
        attempts = 2 + (factor % 3);
        partialCount++;
      } else {
        state = 'not_learned';
        pMastery = 0.15 + (factor % 2) * 0.1;
        attempts = factor % 2;
        notLearnedCount++;
      }

      matrix.push({
        student_id: st.student_id,
        skill_id: sk.skill_id,
        state,
        p_mastery: Math.min(1.0, Math.round(pMastery * 100) / 100),
        confidence: 0.85,
        attempts_count: attempts,
        last_attempted_at: attempts > 0 ? '2026-10-25T14:30:00Z' : null,
      });
    });
  });

  return {
    class_id: classId,
    total_students: MOCK_STUDENTS.length,
    total_skills: MOCK_SKILLS.length,
    students: MOCK_STUDENTS.map((s) => ({
      student_id: s.student_id,
      student_name: s.student_name,
      username: s.username,
      roll_number: s.roll_number,
    })),
    skills: MOCK_SKILLS.map((sk) => ({
      skill_id: sk.skill_id,
      skill_code: sk.skill_code,
      skill_name: sk.skill_name,
      topic_name: sk.topic_name,
      difficulty: sk.difficulty,
    })),
    matrix,
    summary: {
      mastered: masteredCount,
      partial: partialCount,
      not_learned: notLearnedCount,
    },
  };
}

export function getMockGapClusters(classId: string): ClassGapClustersResponse {
  return {
    class_id: classId,
    total_clusters: 3,
    clusters: [
      {
        cluster_id: 'gap-001',
        skill_id: 'sk-m8-rat-01',
        skill_code: 'M8-RAT-01',
        skill_name: 'Rational Numbers: Representation on Number Line',
        topic_name: 'Rational Numbers',
        student_count: 8,
        student_ids: ['stu-003', 'stu-005', 'stu-007', 'stu-008', 'stu-009', 'stu-010', 'stu-011', 'stu-012'],
        student_names: [
          'Rohan Verma',
          'Kabir Das',
          'Vikram Malhotra',
          'Sneha Reddy',
          'Devendra Singh',
          'Pooja Nair',
          'Arjun Mehta',
          'Divya Rao',
        ],
        average_p_mastery: 0.28,
        suggested_revision_plan: {
          strategy: 'Targeted visual number-line scaffolding and denominator division exercises',
          focus_skill: 'Representation of negative fractions on number line',
          target_group_size: 8,
          suggested_actions: [
            'Conduct a 15-minute blackboard revision on dividing segments into equal parts',
            'Assign 5 interactive number-line placement problems with hint ladder',
            'Pair struggling students with peer leaders (Aarav Sharma, Priya Patel)',
          ],
          recommended_duration_mins: 25,
        },
      },
      {
        cluster_id: 'gap-002',
        skill_id: 'sk-m8-lineq-02',
        skill_code: 'M8-LE-02',
        skill_name: 'Linear Equations: Variables on Both Sides',
        topic_name: 'Linear Equations',
        student_count: 6,
        student_ids: ['stu-003', 'stu-006', 'stu-007', 'stu-008', 'stu-010', 'stu-011'],
        student_names: ['Rohan Verma', 'Meera Joshi', 'Vikram Malhotra', 'Sneha Reddy', 'Pooja Nair', 'Arjun Mehta'],
        average_p_mastery: 0.34,
        suggested_revision_plan: {
          strategy: 'Transposition method practice and sign-flip misconception remediation',
          focus_skill: 'Maintaining algebraic balance during variable transposition',
          target_group_size: 6,
          suggested_actions: [
            'Demonstrate the balance-scale model for subtracting terms from both sides',
            'Assign 4 scaffolded problems focusing on moving variable terms to the left',
          ],
          recommended_duration_mins: 20,
        },
      },
      {
        cluster_id: 'gap-003',
        skill_id: 'sk-m8-alg-02',
        skill_code: 'M8-ALG-02',
        skill_name: 'Standard Algebraic Identities',
        topic_name: 'Algebraic Expressions',
        student_count: 5,
        student_ids: ['stu-005', 'stu-007', 'stu-008', 'stu-009', 'stu-012'],
        student_names: ['Kabir Das', 'Vikram Malhotra', 'Sneha Reddy', 'Devendra Singh', 'Divya Rao'],
        average_p_mastery: 0.31,
        suggested_revision_plan: {
          strategy: 'Geometric proof visualization of (a+b)^2 = a^2 + 2ab + b^2',
          focus_skill: 'Preventing the (a+b)^2 = a^2 + b^2 common omission error',
          target_group_size: 5,
          suggested_actions: [
            'Display area-model diagrams to explain why the middle 2ab term exists',
            'Conduct an interactive formative quiz with immediate error explanation',
          ],
          recommended_duration_mins: 20,
        },
      },
    ],
  };
}

export function getMockEarlyWarnings(classId: string, days = 14): ClassEarlyWarningsResponse {
  return {
    class_id: classId,
    threshold_days: days,
    warnings: [
      {
        student_id: 'stu-007',
        student_name: 'Vikram Malhotra',
        roll_number: '107',
        warning_type: 'inactive',
        days_inactive_or_stalled: 16,
        message: 'No practice sessions logged in the last 16 days. Learning momentum dropped.',
        suggested_action: 'Send reminder SMS or check in during parent-teacher conference.',
      },
      {
        student_id: 'stu-008',
        student_name: 'Sneha Reddy',
        roll_number: '108',
        warning_type: 'dropped',
        days_inactive_or_stalled: 11,
        message: 'Mastery score in Rational Numbers dropped by 24% after unpracticed interval.',
        suggested_action: 'Assign short 5-question refresher check to rebuild confidence.',
      },
      {
        student_id: 'stu-003',
        student_name: 'Rohan Verma',
        roll_number: '103',
        warning_type: 'stalled',
        days_inactive_or_stalled: 14,
        message: 'Attempted 18 questions across Linear Equations without progressing past 35% mastery.',
        suggested_action: 'Offer guided Step 2 hints and check for negative sign transposition confusion.',
      },
    ],
  };
}

export function getMockSuggestions(classId: string): ClassSuggestionsResponse {
  return {
    class_id: classId,
    suggestions: [
      {
        suggestion_id: 'sugg-001',
        skill_id: 'sk-m8-rat-01',
        skill_code: 'M8-RAT-01',
        skill_name: 'Rational Numbers: Number Line',
        title: 'Conduct Whole-Class 15-Minute Remedial Drill on Rational Numbers',
        evidence: {
          students_affected: 8,
          average_accuracy: '32%',
          dominant_misconception: 'Placing negative fractions in reverse order on the left of zero',
        },
        rationale: '8 out of 12 students in Class 8-A consistently invert negative rational numbers on number lines (e.g. marking -3/4 closer to 0 than -1/4).',
        recommended_action: 'Allocate 15 minutes of tomorrow’s class to visual chalkboard number-line drawing before advancing to Chapter 2.',
        is_ai_suggestion: true,
        disclaimer: 'Pedagogical suggestion synthesized from student diagnostic error patterns. Teacher review required before assignment.',
        status: 'pending',
      },
      {
        suggestion_id: 'sugg-002',
        student_id: 'stu-003',
        student_name: 'Rohan Verma',
        skill_id: 'sk-m8-lineq-02',
        skill_code: 'M8-LE-02',
        skill_name: 'Linear Equations: Variables on Both Sides',
        title: 'Scaffolded Hint Ladder Intervention for Rohan Verma',
        evidence: {
          attempts: 14,
          repeated_error: 'Forgetting to reverse operator when moving terms across the equals sign',
        },
        rationale: 'Rohan shows persistent algebraic sign flipping errors when transposing variable terms from right to left.',
        recommended_action: 'Enable mandatory Level-2 hints for Rohan’s next 3 practice problems to reinforce visual balance.',
        is_ai_suggestion: true,
        disclaimer: 'AI-generated pedagogical recommendation based on cognitive task analysis.',
        status: 'pending',
      },
      {
        suggestion_id: 'sugg-003',
        skill_id: 'sk-m8-quad-01',
        skill_code: 'M8-QUAD-01',
        skill_name: 'Understanding Quadrilaterals: Angles Sum',
        title: 'Form Peer-Study Triad: Aarav Sharma with Sneha Reddy & Vikram Malhotra',
        evidence: {
          aarav_mastery: '92%',
          sneha_mastery: '38%',
          vikram_mastery: '29%',
        },
        rationale: 'Peer instruction on exterior angle sum theorems has proven 40% higher retention in middle-school geometry.',
        recommended_action: 'Group Aarav, Sneha, and Vikram for 10 minutes during the next geometry activity session.',
        is_ai_suggestion: true,
        disclaimer: 'Advisory peer-learning grouping. Educator discretion advised.',
        status: 'pending',
      },
    ],
  };
}

export function getMockAssignments(classId: string): AssignmentResponse[] {
  return [
    {
      id: 'asgn-001',
      class_id: classId,
      title: 'Rational Numbers & Number Line Mastery Revision',
      description: 'Mandatory practice set covering representation, ordering, and addition of fractions.',
      skill_ids: ['sk-m8-rat-01', 'sk-m8-rat-02'],
      due_date: '2026-11-05T23:59:59Z',
      status: 'active',
      total_assigned: MOCK_STUDENTS.length,
      completed_count: 3,
      students: MOCK_STUDENTS.map((s, idx) => ({
        student_id: s.student_id,
        student_name: s.student_name,
        status: idx < 3 ? 'completed' : 'assigned',
        completed_at: idx < 3 ? '2026-10-26T12:00:00Z' : null,
      })),
      created_at: '2026-10-25T10:00:00Z',
    },
    {
      id: 'asgn-002',
      class_id: classId,
      title: 'Targeted Remedial: Linear Equations Transposition',
      description: 'Focused practice for students requiring algebraic balance reinforcement.',
      skill_ids: ['sk-m8-lineq-01', 'sk-m8-lineq-02'],
      due_date: '2026-11-02T23:59:59Z',
      status: 'active',
      total_assigned: 4,
      completed_count: 1,
      students: [
        { student_id: 'stu-003', student_name: 'Rohan Verma', status: 'assigned' },
        { student_id: 'stu-006', student_name: 'Ananya Gupta', status: 'completed', completed_at: '2026-10-28T09:00:00Z' },
        { student_id: 'stu-007', student_name: 'Vikram Malhotra', status: 'assigned' },
        { student_id: 'stu-008', student_name: 'Sneha Reddy', status: 'assigned' },
      ],
      created_at: '2026-10-27T11:30:00Z',
    },
  ];
}

export function getMockProgressSummary(classId: string): ClassProgressSummaryResponse {
  return {
    class_id: classId,
    total_students: 12,
    total_attempts: 965,
    overall_mastery_pct: 62.4,
    mastered_skills_avg: 4.8,
    reassessment_growth_pct: 28.5,
    timeline: [
      { label: 'Week 1', mastery_pct: 38 },
      { label: 'Week 2', mastery_pct: 46 },
      { label: 'Week 3', mastery_pct: 54 },
      { label: 'Week 4', mastery_pct: 62 },
    ],
  };
}

export function getMockStudentProfile(studentId: string): StudentProfileResponse {
  const fallback = MOCK_STUDENTS[0]!;
  const st = MOCK_STUDENTS.find((s) => s.student_id === studentId) ?? fallback;
  return {
    student_id: st.student_id,
    student_name: st.student_name,
    roll_number: st.roll_number,
    skills: MOCK_SKILLS.map((sk, idx) => {
      const isMastered = (idx + Number(st.student_id.slice(-1))) % 3 === 0;
      const isPartial = (idx + Number(st.student_id.slice(-1))) % 3 === 1;
      return {
        skill_id: sk.skill_id,
        skill_code: sk.skill_code,
        skill_name: sk.skill_name,
        topic_name: sk.topic_name,
        p_mastery: isMastered ? 0.88 : isPartial ? 0.55 : 0.22,
        state: isMastered ? 'mastered' : isPartial ? 'partial' : 'not_learned',
        attempts_count: isMastered ? 6 : isPartial ? 4 : 1,
        correct_count: isMastered ? 5 : isPartial ? 2 : 0,
        last_attempted_at: '2026-10-26T15:00:00Z',
      };
    }),
    error_patterns: [
      {
        question_code: 'Q-M8-RAT-04',
        prompt_excerpt: 'Find a rational number between 1/4 and 1/2...',
        distractor_chosen: '2/6',
        count: 3,
        misconception: 'Added numerators and denominators directly instead of common denominator',
      },
      {
        question_code: 'Q-M8-LE-09',
        prompt_excerpt: 'Solve for x: 5x + 7/2 = 3/2x - 14...',
        distractor_chosen: 'x = 3.5',
        count: 2,
        misconception: 'Did not distribute subtraction when transposing fraction terms',
      },
    ],
    hint_usage: {
      total_hints_requested: 14,
      hint_1_count: 8,
      hint_2_count: 4,
      hint_3_count: 2,
      independent_attempts_count: 19,
    },
    trend: [
      { date: '2026-10-10', p_mastery: 0.35, attempts: 8 },
      { date: '2026-10-15', p_mastery: 0.44, attempts: 12 },
      { date: '2026-10-20', p_mastery: 0.58, attempts: 15 },
      { date: '2026-10-25', p_mastery: 0.69, attempts: 18 },
    ],
    summary: {
      total_attempts: 53,
      mastered_skills: 5,
      total_skills: 12,
    },
  };
}

