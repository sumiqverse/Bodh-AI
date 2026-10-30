/**
 * BodhAI Profiles Telemetry & Data Layer
 *
 * Provides individualized, authentic NCERT student profiles and teacher profiles
 * with distinct competencies, error patterns, hint usage ladders, and learning streaks.
 */

import { setAuthSession } from './api-client';

export interface SkillMasteryItem {
  skillId: string;
  skillCode: string;
  skillName: string;
  topicName: string;
  topicCode: string;
  difficulty: number;
  pMastery: number; // 0.00 to 1.00
  state: 'mastered' | 'partial' | 'not_learned';
  attemptsCount: number;
  lastAttemptedAt: string;
}

export interface ErrorPatternDetail {
  questionCode: string;
  promptExcerpt: string;
  distractorChosen: string;
  count: number;
  misconception: string;
  remedyAction: string;
  severity: 'high' | 'medium' | 'low';
}

export interface HintUsageTelemetry {
  totalHintsRequested: number;
  hint1Count: number; // gentle conceptual nudge
  hint2Count: number; // formula / structural scaffold
  hint3Count: number; // fully worked sub-step
  independentAttemptsCount: number;
  independenceRatio: number; // percentage solved without hints
}

export interface MasteryTrendPoint {
  date: string;
  pMastery: number;
  attempts: number;
  accuracy: number;
}

export interface RecentQuestionActivity {
  id: string;
  questionCode: string;
  prompt: string;
  topic: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  hintsUsed: number;
  timestamp: string;
}

export interface StudentBadge {
  id: string;
  title: string;
  titleHi: string;
  description: string;
  icon: string;
  unlockedAt: string;
  category: 'streak' | 'accuracy' | 'mastery' | 'resilience';
  color: string;
}

export interface RecommendedStep {
  id: string;
  skillCode: string;
  skillName: string;
  topicName: string;
  type: 'remedial' | 'practice' | 'mastery_gate';
  reason: string;
  estimatedMinutes: number;
}

export interface StudentProfile {
  id: string;
  slug: string;
  fullName: string;
  fullNameHi: string;
  rollNumber: string;
  grade: number; // 6, 7, 8, 9, 10
  section: string;
  academicYear: string;
  schoolName: string;
  schoolUdise: string;
  age: number;
  avatarGradient: string;
  avatarUrl?: string;
  bio: string;
  bioHi: string;
  preferredLanguage: 'en' | 'hi';
  dpdpConsentGranted: boolean;
  guardianName: string;
  guardianRelation: string;

  // Aggregate Metrics
  overallMastery: number; // 0 - 100
  learningStreakDays: number;
  accuracyRate: number; // 0 - 100
  totalQuestionsSolved: number;
  practiceHours: number;
  attendanceRate: number; // 0 - 100
  assignedTeacherName: string;
  assignedTeacherSlug: string;
  className?: string;
  curriculumCode?: string;
  classId?: string;
  classes?: Array<{
    classId: string;
    name: string;
    grade: number;
    section: string;
    academicYear: string;
    curriculumCode: string;
    status: string;
    rollNumber?: string;
    teacherName?: string;
    teacherSlug?: string;
    joinCode?: string;
  }>;

  // Deep Telemetry Sections (Unique Per Student)
  skills: SkillMasteryItem[];
  errorPatterns: ErrorPatternDetail[];
  hintUsage: HintUsageTelemetry;
  trend: MasteryTrendPoint[];
  recentActivities: RecentQuestionActivity[];
  badges: StudentBadge[];
  recommendedSteps: RecommendedStep[];
}

export interface TeacherClassOverview {
  id: string;
  name: string;
  grade: number;
  section: string;
  academicYear: string;
  studentCount: number;
  avgMastery: number;
  activeAssignments: number;
  joinCode: string;
  status: 'active' | 'upcoming';
}

export interface PedagogicalDecisionRecord {
  id: string;
  className: string;
  suggestionTitle: string;
  action: 'accepted' | 'edited' | 'overridden' | 'custom';
  timestamp: string;
  rationale: string;
  skillName: string;
}

export interface TeacherScheduleSlot {
  day: string;
  period: string;
  timeSlot: string;
  className: string;
  subject: string;
  room: string;
}

export interface TeacherProfile {
  id: string;
  slug: string;
  fullName: string;
  fullNameHi: string;
  title: string;
  titleHi: string;
  employeeId: string;
  email: string;
  phone: string;
  schoolName: string;
  department: string;
  qualifications: string;
  experienceYears: number;
  avatarGradient: string;
  avatarUrl?: string;
  bio: string;
  bioHi: string;
  officeHours: string;
  verifiedEducator: boolean;

  // Aggregate Metrics
  totalStudentsTaught: number;
  activeClassesCount: number;
  avgClassroomMastery: number;
  totalAssignmentsCreated: number;
  aiDecisionsReviewed: number;

  // Detail Sections
  classes: TeacherClassOverview[];
  pedagogicalDecisions: PedagogicalDecisionRecord[];
  schedule: TeacherScheduleSlot[];
  specializations: string[];
}

// -------------------------------------------------------------
// SEED DATA: 6 STUDENTS WITH COMPLETELY UNIQUE, INDIVIDUAL DATA
// -------------------------------------------------------------

export const STUDENTS_DATA: StudentProfile[] = [
  {
    id: 'stu-001',
    slug: 'stu-aarav-sharma',
    fullName: 'Aarav Sharma',
    fullNameHi: 'आरव शर्मा',
    rollNumber: '101',
    grade: 8,
    section: 'A',
    academicYear: '2024-2025',
    schoolName: 'Govt. Model Senior Secondary School, Delhi',
    schoolUdise: '07010100101',
    age: 13,
    avatarGradient: 'from-emerald-500 to-teal-700',
    bio: 'Enthusiastic math learner aiming for aerospace engineering. Excels in symbolic algebra and algebraic identities, currently focusing on improving 3D mensuration visualization.',
    bioHi:
      'गणित के उत्साही विद्यार्थी जो एयरोस्पेस इंजीनियरिंग का लक्ष्य रखते हैं। बीजगणित में उत्कृष्ट, वर्तमान में 3D क्षेत्रमिति की समझ मजबूत करने पर कार्यरत।',
    preferredLanguage: 'hi',
    dpdpConsentGranted: true,
    guardianName: 'Ramesh Sharma',
    guardianRelation: 'Father (पिता)',
    overallMastery: 78,
    learningStreakDays: 16,
    accuracyRate: 84,
    totalQuestionsSolved: 342,
    practiceHours: 28.5,
    attendanceRate: 96,
    assignedTeacherName: 'Mr. Rajesh Kumar',
    assignedTeacherSlug: 'tchr-rajesh-kumar',
    skills: [
      {
        skillId: 'sk-8-alg-01',
        skillCode: 'MATH-8-CH02-S01',
        skillName: 'Solving Linear Equations with Variables on Both Sides',
        topicName: 'Linear Equations in One Variable',
        topicCode: 'CH02',
        difficulty: 3,
        pMastery: 0.95,
        state: 'mastered',
        attemptsCount: 38,
        lastAttemptedAt: '2026-10-27T14:30:00Z',
      },
      {
        skillId: 'sk-8-alg-02',
        skillCode: 'MATH-8-CH01-S01',
        skillName: 'Properties of Rational Numbers (Closure & Commutative)',
        topicName: 'Rational Numbers',
        topicCode: 'CH01',
        difficulty: 2,
        pMastery: 0.91,
        state: 'mastered',
        attemptsCount: 26,
        lastAttemptedAt: '2026-10-25T11:15:00Z',
      },
      {
        skillId: 'sk-8-alg-03',
        skillCode: 'MATH-8-CH09-S02',
        skillName: 'Applying Standard Algebraic Identities',
        topicName: 'Algebraic Expressions & Identities',
        topicCode: 'CH09',
        difficulty: 4,
        pMastery: 0.88,
        state: 'mastered',
        attemptsCount: 42,
        lastAttemptedAt: '2026-10-26T16:45:00Z',
      },
      {
        skillId: 'sk-8-geo-01',
        skillCode: 'MATH-8-CH03-S01',
        skillName: 'Sum of Interior & Exterior Angles of Polygons',
        topicName: 'Understanding Quadrilaterals',
        topicCode: 'CH03',
        difficulty: 3,
        pMastery: 0.72,
        state: 'partial',
        attemptsCount: 29,
        lastAttemptedAt: '2026-10-24T09:20:00Z',
      },
      {
        skillId: 'sk-8-men-01',
        skillCode: 'MATH-8-CH11-S02',
        skillName: 'Surface Area & Volume of Cylinders and Cuboids',
        topicName: 'Mensuration',
        topicCode: 'CH11',
        difficulty: 4,
        pMastery: 0.38,
        state: 'not_learned',
        attemptsCount: 22,
        lastAttemptedAt: '2026-10-28T08:10:00Z',
      },
      {
        skillId: 'sk-8-exp-01',
        skillCode: 'MATH-8-CH12-S01',
        skillName: 'Negative Exponents & Scientific Notation Laws',
        topicName: 'Exponents and Powers',
        topicCode: 'CH12',
        difficulty: 3,
        pMastery: 0.65,
        state: 'partial',
        attemptsCount: 18,
        lastAttemptedAt: '2026-10-22T15:00:00Z',
      },
    ],
    errorPatterns: [
      {
        questionCode: 'ERR-SIGN-DISTRIB',
        promptExcerpt: 'Simplify -3(2x - 5) + 4x',
        distractorChosen: '-6x - 15 + 4x (ignoring negative x negative sign flip)',
        count: 7,
        misconception: 'Distributive negative multiplication: missed flipping -3 * -5 to +15.',
        remedyAction: 'Assigned 2-step color-coded bracket expansion module.',
        severity: 'high',
      },
      {
        questionCode: 'ERR-UNIT-AREA',
        promptExcerpt: 'Calculate total surface area of cylinder in cm² given r in cm, h in meters',
        distractorChosen: 'Direct substitution without metric conversion (m to cm)',
        count: 4,
        misconception: 'Dimensional mismatch: mixed meter and centimeter units directly in πr²h.',
        remedyAction: 'Added dimensional pre-check checkpoint before formula substitution.',
        severity: 'medium',
      },
    ],
    hintUsage: {
      totalHintsRequested: 102,
      hint1Count: 62,
      hint2Count: 28,
      hint3Count: 12,
      independentAttemptsCount: 240,
      independenceRatio: 70.2,
    },
    trend: [
      { date: 'Week 1', pMastery: 0.54, attempts: 45, accuracy: 62 },
      { date: 'Week 2', pMastery: 0.61, attempts: 58, accuracy: 71 },
      { date: 'Week 3', pMastery: 0.68, attempts: 64, accuracy: 78 },
      { date: 'Week 4', pMastery: 0.74, attempts: 72, accuracy: 82 },
      { date: 'Week 5', pMastery: 0.78, attempts: 103, accuracy: 86 },
    ],
    recentActivities: [
      {
        id: 'act-101',
        questionCode: 'Q-LIN-802',
        prompt: 'Solve: 5x - 7 = 2x + 8',
        topic: 'Linear Equations',
        isCorrect: true,
        timeSpentSeconds: 42,
        hintsUsed: 0,
        timestamp: '2026-10-28T09:12:00Z',
      },
      {
        id: 'act-102',
        questionCode: 'Q-MEN-114',
        prompt: 'Find curved surface area of a cylinder with radius 7cm and height 10cm',
        topic: 'Mensuration',
        isCorrect: false,
        timeSpentSeconds: 88,
        hintsUsed: 2,
        timestamp: '2026-10-28T08:10:00Z',
      },
      {
        id: 'act-103',
        questionCode: 'Q-IDN-904',
        prompt: 'Expand using identity: (2a + 3b)²',
        topic: 'Algebraic Expressions',
        isCorrect: true,
        timeSpentSeconds: 35,
        hintsUsed: 0,
        timestamp: '2026-10-27T18:40:00Z',
      },
      {
        id: 'act-104',
        questionCode: 'Q-RAT-108',
        prompt: 'Find three rational numbers between 1/4 and 1/2',
        topic: 'Rational Numbers',
        isCorrect: true,
        timeSpentSeconds: 56,
        hintsUsed: 1,
        timestamp: '2026-10-26T14:22:00Z',
      },
    ],
    badges: [
      {
        id: 'bdg-streak-15',
        title: '15-Day Learning Flame',
        titleHi: '15 दिवसीय निरंतरता दीप',
        description: 'Practiced consistently for 15 consecutive days without interruption.',
        icon: '🔥',
        unlockedAt: '2026-10-26',
        category: 'streak',
        color: 'border-amber-500/30 bg-amber-500/10 text-amber-500',
      },
      {
        id: 'bdg-alg-pro',
        title: 'Algebra Pioneer',
        titleHi: 'बीजगणित अग्रदूत',
        description: 'Achieved >90% mastery across all linear equations competencies.',
        icon: '⚡',
        unlockedAt: '2026-10-20',
        category: 'mastery',
        color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500',
      },
      {
        id: 'bdg-fast-50',
        title: 'Speed Strategist',
        titleHi: 'तीव्र गणना शिल्पी',
        description: 'Solved 50 questions under the target pedagogical baseline time.',
        icon: '⏱️',
        unlockedAt: '2026-10-15',
        category: 'accuracy',
        color: 'border-blue-500/30 bg-blue-500/10 text-blue-500',
      },
    ],
    recommendedSteps: [
      {
        id: 'rec-01',
        skillCode: 'MATH-8-CH11-S02',
        skillName: 'Cylinder Surface Area Formula Dissection',
        topicName: 'Mensuration',
        type: 'remedial',
        reason: 'Current mastery is 38%. Reviewing the 2πrh unwrapping model will close gap.',
        estimatedMinutes: 8,
      },
      {
        id: 'rec-02',
        skillCode: 'MATH-8-CH03-S01',
        skillName: 'Exterior Angles of Convex Polygons Practice',
        topicName: 'Quadrilaterals',
        type: 'practice',
        reason: 'Partial mastery (72%). 5 targeted questions will elevate to full mastery.',
        estimatedMinutes: 10,
      },
      {
        id: 'rec-03',
        skillCode: 'MATH-8-CH02-S01',
        skillName: 'Advance Gate: Real-World Word Problems in Linear Equations',
        topicName: 'Linear Equations',
        type: 'mastery_gate',
        reason: 'Candidate for higher-order challenge problems based on 95% mastery.',
        estimatedMinutes: 12,
      },
    ],
  },
  {
    id: 'stu-002',
    slug: 'stu-priya-patel',
    fullName: 'Priya Patel',
    fullNameHi: 'प्रिया पटेल',
    rollNumber: '102',
    grade: 8,
    section: 'A',
    academicYear: '2024-2025',
    schoolName: 'Govt. Model Senior Secondary School, Delhi',
    schoolUdise: '07010100101',
    age: 14,
    avatarGradient: 'from-purple-500 to-indigo-700',
    bio: 'Visual learner with outstanding geometric spatial reasoning. Preparing for National Talent Search and loves converting data into visual bar and pie graphs.',
    bioHi:
      'दृश्य अधिगम में निपुण छात्रा जिनकी ज्यामितीय समझ अत्यंत प्रखर है। राष्ट्रीय प्रतिभा खोज परीक्षा की तैयारी में जुटी हैं।',
    preferredLanguage: 'en',
    dpdpConsentGranted: true,
    guardianName: 'Sanjay Patel',
    guardianRelation: 'Father (पिता)',
    overallMastery: 85,
    learningStreakDays: 22,
    accuracyRate: 89,
    totalQuestionsSolved: 418,
    practiceHours: 34.0,
    attendanceRate: 98,
    assignedTeacherName: 'Mr. Rajesh Kumar',
    assignedTeacherSlug: 'tchr-rajesh-kumar',
    skills: [
      {
        skillId: 'sk-8-men-01-p',
        skillCode: 'MATH-8-CH11-S01',
        skillName: 'Area of Trapezium and General Quadrilateral',
        topicName: 'Mensuration',
        topicCode: 'CH11',
        difficulty: 3,
        pMastery: 0.96,
        state: 'mastered',
        attemptsCount: 45,
        lastAttemptedAt: '2026-10-27T17:10:00Z',
      },
      {
        skillId: 'sk-8-geo-02-p',
        skillCode: 'MATH-8-CH03-S02',
        skillName: 'Properties of Parallelograms, Rhombus, and Rectangle',
        topicName: 'Understanding Quadrilaterals',
        topicCode: 'CH03',
        difficulty: 3,
        pMastery: 0.92,
        state: 'mastered',
        attemptsCount: 39,
        lastAttemptedAt: '2026-10-26T12:00:00Z',
      },
      {
        skillId: 'sk-8-dat-01-p',
        skillCode: 'MATH-8-CH05-S01',
        skillName: 'Organising Data, Histograms & Pie Chart Calculations',
        topicName: 'Data Handling',
        topicCode: 'CH05',
        difficulty: 2,
        pMastery: 0.88,
        state: 'mastered',
        attemptsCount: 31,
        lastAttemptedAt: '2026-10-25T14:40:00Z',
      },
      {
        skillId: 'sk-8-alg-01-p',
        skillCode: 'MATH-8-CH02-S01',
        skillName: 'Linear Equations in One Variable',
        topicName: 'Linear Equations',
        topicCode: 'CH02',
        difficulty: 3,
        pMastery: 0.64,
        state: 'partial',
        attemptsCount: 28,
        lastAttemptedAt: '2026-10-28T09:30:00Z',
      },
      {
        skillId: 'sk-8-exp-02-p',
        skillCode: 'MATH-8-CH12-S01',
        skillName: 'Exponents with Negative Powers & Fractional Indices',
        topicName: 'Exponents and Powers',
        topicCode: 'CH12',
        difficulty: 4,
        pMastery: 0.42,
        state: 'not_learned',
        attemptsCount: 20,
        lastAttemptedAt: '2026-10-24T16:15:00Z',
      },
      {
        skillId: 'sk-8-prop-01-p',
        skillCode: 'MATH-8-CH13-S01',
        skillName: 'Direct & Inverse Proportion Word Problems',
        topicName: 'Direct & Inverse Proportions',
        topicCode: 'CH13',
        difficulty: 3,
        pMastery: 0.52,
        state: 'partial',
        attemptsCount: 22,
        lastAttemptedAt: '2026-10-23T11:00:00Z',
      },
    ],
    errorPatterns: [
      {
        questionCode: 'ERR-EXP-ADD-BASES',
        promptExcerpt: 'Simplify 3⁴ × 3² × 3⁻¹',
        distractorChosen:
          'Multiplied bases to 27⁵ instead of keeping base 3 and adding exponents (3⁵)',
        count: 5,
        misconception:
          'Exponent base rule: multiplied base numbers rather than applying a^m * a^n = a^(m+n).',
        remedyAction: 'Scaffolded practice on base preservation rule.',
        severity: 'high',
      },
      {
        questionCode: 'ERR-INVERSE-CROSS',
        promptExcerpt: 'If 12 men build a wall in 8 days, how many days will 16 men take?',
        distractorChosen: 'Used direct proportion cross-multiply (12/8 = 16/x -> 10.6 days)',
        count: 4,
        misconception:
          'Applied direct ratio instead of inverse constant product rule (x1 * y1 = x2 * y2).',
        remedyAction: 'Assigned inverse constant product worksheet with physical analogies.',
        severity: 'medium',
      },
    ],
    hintUsage: {
      totalHintsRequested: 98,
      hint1Count: 58,
      hint2Count: 30,
      hint3Count: 10,
      independentAttemptsCount: 320,
      independenceRatio: 76.5,
    },
    trend: [
      { date: 'Week 1', pMastery: 0.71, attempts: 60, accuracy: 80 },
      { date: 'Week 2', pMastery: 0.75, attempts: 72, accuracy: 83 },
      { date: 'Week 3', pMastery: 0.79, attempts: 85, accuracy: 87 },
      { date: 'Week 4', pMastery: 0.82, attempts: 96, accuracy: 89 },
      { date: 'Week 5', pMastery: 0.85, attempts: 105, accuracy: 91 },
    ],
    recentActivities: [
      {
        id: 'act-201',
        questionCode: 'Q-MEN-102',
        prompt: 'Find area of trapezium with parallel sides 10cm, 12cm and distance 5cm',
        topic: 'Mensuration',
        isCorrect: true,
        timeSpentSeconds: 38,
        hintsUsed: 0,
        timestamp: '2026-10-28T10:05:00Z',
      },
      {
        id: 'act-202',
        questionCode: 'Q-EXP-121',
        prompt: 'Express 4⁻³ as a power with base 2',
        topic: 'Exponents',
        isCorrect: false,
        timeSpentSeconds: 75,
        hintsUsed: 1,
        timestamp: '2026-10-27T16:20:00Z',
      },
      {
        id: 'act-203',
        questionCode: 'Q-DAT-503',
        prompt: 'Calculate sector angle for 25% component in a pie chart',
        topic: 'Data Handling',
        isCorrect: true,
        timeSpentSeconds: 29,
        hintsUsed: 0,
        timestamp: '2026-10-26T15:10:00Z',
      },
    ],
    badges: [
      {
        id: 'bdg-geom-pro',
        title: 'Geometry Virtuoso',
        titleHi: 'ज्यामिति पारंगत',
        description: 'Achieved 95%+ in polygon and trapezium spatial problem sets.',
        icon: '📐',
        unlockedAt: '2026-10-24',
        category: 'mastery',
        color: 'border-purple-500/30 bg-purple-500/10 text-purple-500',
      },
      {
        id: 'bdg-streak-20',
        title: '20-Day Scholar',
        titleHi: '20 दिवसीय अध्येता',
        description: 'Maintained active daily practice streak for over 3 weeks.',
        icon: '🌟',
        unlockedAt: '2026-10-25',
        category: 'streak',
        color: 'border-amber-500/30 bg-amber-500/10 text-amber-500',
      },
      {
        id: 'bdg-accuracy-90',
        title: 'High Precision Mind',
        titleHi: 'उच्च परिशुद्धता मस्तिष्क',
        description: 'Solved over 100 consecutive problems with >88% overall accuracy.',
        icon: '🎯',
        unlockedAt: '2026-10-18',
        category: 'accuracy',
        color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500',
      },
    ],
    recommendedSteps: [
      {
        id: 'rec-p1',
        skillCode: 'MATH-8-CH12-S01',
        skillName: 'Laws of Exponents: Base Preservation Lab',
        topicName: 'Exponents and Powers',
        type: 'remedial',
        reason:
          'Mastery is 42%. Clearing the base multiplication trap will unlock Class 9 readiness.',
        estimatedMinutes: 9,
      },
      {
        id: 'rec-p2',
        skillCode: 'MATH-8-CH13-S01',
        skillName: 'Inverse Proportions: Work and Speed Scenarios',
        topicName: 'Direct & Inverse Proportions',
        type: 'practice',
        reason: 'Consolidate constant product rule (x * y = k) through 4 word problems.',
        estimatedMinutes: 10,
      },
    ],
  },
  {
    id: 'stu-003',
    slug: 'stu-rohan-verma',
    fullName: 'Rohan Verma',
    fullNameHi: 'रोहन वर्मा',
    rollNumber: '103',
    grade: 8,
    section: 'B',
    academicYear: '2024-2025',
    schoolName: 'Govt. Model Senior Secondary School, Delhi',
    schoolUdise: '07010100101',
    age: 13,
    avatarGradient: 'from-amber-500 to-orange-700',
    bio: 'Speed calculator in mental arithmetic and prime factorisation games. Benefiting from BodhAI hint ladders to build patience with multi-step algebraic transpositions.',
    bioHi:
      'मौखिक अंकगणित में तीव्र विद्यार्थी। बहुपदीय बीजगणितीय चरणों को धैर्यपूर्वक हल करने हेतु बोधAI के क्रमिक संकेतों का लाभ उठा रहे हैं।',
    preferredLanguage: 'hi',
    dpdpConsentGranted: true,
    guardianName: 'Anita Verma',
    guardianRelation: 'Mother (माता)',
    overallMastery: 58,
    learningStreakDays: 5,
    accuracyRate: 65,
    totalQuestionsSolved: 198,
    practiceHours: 16.2,
    attendanceRate: 89,
    assignedTeacherName: 'Mr. Vikram Malhotra',
    assignedTeacherSlug: 'tchr-vikram-malhotra',
    skills: [
      {
        skillId: 'sk-8-sqr-01-r',
        skillCode: 'MATH-8-CH06-S01',
        skillName: 'Properties of Square Numbers & Prime Factorisation Method',
        topicName: 'Squares and Square Roots',
        topicCode: 'CH06',
        difficulty: 2,
        pMastery: 0.82,
        state: 'mastered',
        attemptsCount: 34,
        lastAttemptedAt: '2026-10-27T11:00:00Z',
      },
      {
        skillId: 'sk-8-num-01-r',
        skillCode: 'MATH-8-CH16-S01',
        skillName: 'Divisibility Tests and Cryptarithms',
        topicName: 'Playing with Numbers',
        topicCode: 'CH16',
        difficulty: 2,
        pMastery: 0.78,
        state: 'mastered',
        attemptsCount: 25,
        lastAttemptedAt: '2026-10-25T16:00:00Z',
      },
      {
        skillId: 'sk-8-alg-01-r',
        skillCode: 'MATH-8-CH02-S01',
        skillName: 'Transposition in Linear Equations',
        topicName: 'Linear Equations',
        topicCode: 'CH02',
        difficulty: 3,
        pMastery: 0.34,
        state: 'not_learned',
        attemptsCount: 28,
        lastAttemptedAt: '2026-10-28T09:15:00Z',
      },
      {
        skillId: 'sk-8-alg-02-r',
        skillCode: 'MATH-8-CH09-S01',
        skillName: 'Multiplying Monomials and Binomials',
        topicName: 'Algebraic Expressions',
        topicCode: 'CH09',
        difficulty: 3,
        pMastery: 0.29,
        state: 'not_learned',
        attemptsCount: 22,
        lastAttemptedAt: '2026-10-26T10:30:00Z',
      },
      {
        skillId: 'sk-8-fac-01-r',
        skillCode: 'MATH-8-CH14-S01',
        skillName: 'Common Factor Method & Regrouping Terms',
        topicName: 'Factorisation',
        topicCode: 'CH14',
        difficulty: 3,
        pMastery: 0.31,
        state: 'not_learned',
        attemptsCount: 19,
        lastAttemptedAt: '2026-10-24T14:00:00Z',
      },
    ],
    errorPatterns: [
      {
        questionCode: 'ERR-TRANSPOSITION-SIGN',
        promptExcerpt: 'Solve 3x + 11 = 26',
        distractorChosen: '3x = 26 + 11 = 37 -> x = 37/3 (forgot to flip +11 to -11)',
        count: 9,
        misconception:
          'Transposition balance error: maintained addition operator across equal sign boundary.',
        remedyAction: 'Balance scale visual simulator practice assigned.',
        severity: 'high',
      },
      {
        questionCode: 'ERR-BINOMIAL-SQR',
        promptExcerpt: 'Expand (x + 4)²',
        distractorChosen: 'x² + 16 (omitted the cross term 2*x*4 = 8x)',
        count: 6,
        misconception: 'Believed (a+b)² = a² + b² without rectangular area cross term.',
        remedyAction: 'Visual geometry area tiles tile-puzzle completed.',
        severity: 'high',
      },
    ],
    hintUsage: {
      totalHintsRequested: 106,
      hint1Count: 45,
      hint2Count: 38,
      hint3Count: 23,
      independentAttemptsCount: 92,
      independenceRatio: 46.5,
    },
    trend: [
      { date: 'Week 1', pMastery: 0.42, attempts: 32, accuracy: 48 },
      { date: 'Week 2', pMastery: 0.46, attempts: 38, accuracy: 52 },
      { date: 'Week 3', pMastery: 0.5, attempts: 44, accuracy: 58 },
      { date: 'Week 4', pMastery: 0.54, attempts: 40, accuracy: 61 },
      { date: 'Week 5', pMastery: 0.58, attempts: 44, accuracy: 65 },
    ],
    recentActivities: [
      {
        id: 'act-301',
        questionCode: 'Q-SQR-601',
        prompt: 'Find square root of 576 by prime factorisation',
        topic: 'Square Roots',
        isCorrect: true,
        timeSpentSeconds: 45,
        hintsUsed: 0,
        timestamp: '2026-10-28T09:40:00Z',
      },
      {
        id: 'act-302',
        questionCode: 'Q-LIN-208',
        prompt: 'Solve: 7y - 5 = 23',
        topic: 'Linear Equations',
        isCorrect: false,
        timeSpentSeconds: 62,
        hintsUsed: 2,
        timestamp: '2026-10-28T09:15:00Z',
      },
      {
        id: 'act-303',
        questionCode: 'Q-NUM-160',
        prompt: 'If 21y5 is a multiple of 9, what is the single digit value of y?',
        topic: 'Playing with Numbers',
        isCorrect: true,
        timeSpentSeconds: 31,
        hintsUsed: 1,
        timestamp: '2026-10-27T15:20:00Z',
      },
    ],
    badges: [
      {
        id: 'bdg-prime-calc',
        title: 'Factor Finder',
        titleHi: 'गुणनखंड खोजी',
        description: 'Demonstrated rapid factorization on numbers up to 1000.',
        icon: '🔢',
        unlockedAt: '2026-10-22',
        category: 'mastery',
        color: 'border-orange-500/30 bg-orange-500/10 text-orange-500',
      },
      {
        id: 'bdg-resilience',
        title: 'Tenacious Learner',
        titleHi: 'धैर्यवान शिक्षार्थी',
        description: 'Completed 15 scaffolded questions using full 3-step hint progression.',
        icon: '🛡️',
        unlockedAt: '2026-10-26',
        category: 'resilience',
        color: 'border-blue-500/30 bg-blue-500/10 text-blue-500',
      },
    ],
    recommendedSteps: [
      {
        id: 'rec-r1',
        skillCode: 'MATH-8-CH02-S01',
        skillName: 'Balance Scale Linear Equations Tutor',
        topicName: 'Linear Equations',
        type: 'remedial',
        reason:
          'Current mastery is 34%. Interactive visual balance exercises will fix sign transpositions.',
        estimatedMinutes: 7,
      },
      {
        id: 'rec-r2',
        skillCode: 'MATH-8-CH09-S01',
        skillName: 'Area Tile Visual for Binomial Products',
        topicName: 'Algebraic Expressions',
        type: 'remedial',
        reason: 'Eliminate the (a+b)² misconception with visual geometry area tiles.',
        estimatedMinutes: 10,
      },
    ],
  },
  {
    id: 'stu-004',
    slug: 'stu-ananya-iyer',
    fullName: 'Ananya Iyer',
    fullNameHi: 'अनन्या अय्यर',
    rollNumber: '104',
    grade: 9,
    section: 'A',
    academicYear: '2024-2025',
    schoolName: 'Govt. Model Senior Secondary School, Delhi',
    schoolUdise: '07010100101',
    age: 14,
    avatarGradient: 'from-sky-500 to-blue-700',
    bio: 'Top Olympiad contender with a 31-day active streak. Solves almost completely independently. Passionate about coordinate geometry and irrational number proofs.',
    bioHi:
      'ओलिंपियाड की शीर्ष प्रतिभागी जिनका 31 दिनों का अटूट अभ्यास क्रम है। पूर्ण स्वतंत्रता से प्रश्न हल करती हैं। निर्देशांक ज्यामिति में विशेष रुचि।',
    preferredLanguage: 'en',
    dpdpConsentGranted: true,
    guardianName: 'Subramanian Iyer',
    guardianRelation: 'Father (पिता)',
    overallMastery: 93,
    learningStreakDays: 31,
    accuracyRate: 95,
    totalQuestionsSolved: 610,
    practiceHours: 48.0,
    attendanceRate: 100,
    assignedTeacherName: 'Mr. Rajesh Kumar',
    assignedTeacherSlug: 'tchr-rajesh-kumar',
    skills: [
      {
        skillId: 'sk-9-num-01-a',
        skillCode: 'MATH-9-CH01-S01',
        skillName: 'Rationalising Denominators & Real Number Real-Line Proofs',
        topicName: 'Number Systems',
        topicCode: 'CH01',
        difficulty: 4,
        pMastery: 0.98,
        state: 'mastered',
        attemptsCount: 52,
        lastAttemptedAt: '2026-10-28T07:45:00Z',
      },
      {
        skillId: 'sk-9-pol-01-a',
        skillCode: 'MATH-9-CH02-S01',
        skillName: 'Remainder & Factor Theorem with Cubic Factorisation',
        topicName: 'Polynomials',
        topicCode: 'CH02',
        difficulty: 4,
        pMastery: 0.94,
        state: 'mastered',
        attemptsCount: 48,
        lastAttemptedAt: '2026-10-27T19:30:00Z',
      },
      {
        skillId: 'sk-9-coo-01-a',
        skillCode: 'MATH-9-CH03-S01',
        skillName: 'Cartesian Coordinate Plane, Abscissa, and Ordinates',
        topicName: 'Coordinate Geometry',
        topicCode: 'CH03',
        difficulty: 2,
        pMastery: 0.95,
        state: 'mastered',
        attemptsCount: 36,
        lastAttemptedAt: '2026-10-26T18:00:00Z',
      },
      {
        skillId: 'sk-9-lin-01-a',
        skillCode: 'MATH-9-CH04-S01',
        skillName: 'Graphing Linear Equations in Two Variables (ax + by + c = 0)',
        topicName: 'Linear Equations in 2 Variables',
        topicCode: 'CH04',
        difficulty: 3,
        pMastery: 0.91,
        state: 'mastered',
        attemptsCount: 38,
        lastAttemptedAt: '2026-10-25T14:10:00Z',
      },
      {
        skillId: 'sk-9-euc-01-a',
        skillCode: 'MATH-9-CH05-S01',
        skillName: "Euclid's Definitions, Axioms, and Postulates",
        topicName: "Introduction to Euclid's Geometry",
        topicCode: 'CH05',
        difficulty: 3,
        pMastery: 0.72,
        state: 'partial',
        attemptsCount: 22,
        lastAttemptedAt: '2026-10-24T12:00:00Z',
      },
    ],
    errorPatterns: [
      {
        questionCode: 'ERR-SPEED-READ',
        promptExcerpt: 'Which of the following statements is NOT consistent with Postulate 5?',
        distractorChosen: 'Selected affirmative statement due to fast scanning of "NOT"',
        count: 3,
        misconception: 'Negative qualification omission under high solving speed.',
        remedyAction: 'Added deliberate 3-second reflection timer on negative logic items.',
        severity: 'low',
      },
    ],
    hintUsage: {
      totalHintsRequested: 70,
      hint1Count: 45,
      hint2Count: 18,
      hint3Count: 7,
      independentAttemptsCount: 540,
      independenceRatio: 88.5,
    },
    trend: [
      { date: 'Week 1', pMastery: 0.88, attempts: 90, accuracy: 92 },
      { date: 'Week 2', pMastery: 0.9, attempts: 110, accuracy: 94 },
      { date: 'Week 3', pMastery: 0.91, attempts: 125, accuracy: 95 },
      { date: 'Week 4', pMastery: 0.92, attempts: 135, accuracy: 95 },
      { date: 'Week 5', pMastery: 0.93, attempts: 150, accuracy: 96 },
    ],
    recentActivities: [
      {
        id: 'act-401',
        questionCode: 'Q-NUM-901',
        prompt: 'Rationalise denominator of 1 / (√7 - √6)',
        topic: 'Number Systems',
        isCorrect: true,
        timeSpentSeconds: 22,
        hintsUsed: 0,
        timestamp: '2026-10-28T07:45:00Z',
      },
      {
        id: 'act-402',
        questionCode: 'Q-POL-904',
        prompt: 'Find value of k if x - 1 is a factor of 4x³ + 3x² - 4x + k',
        topic: 'Polynomials',
        isCorrect: true,
        timeSpentSeconds: 34,
        hintsUsed: 0,
        timestamp: '2026-10-27T19:30:00Z',
      },
    ],
    badges: [
      {
        id: 'bdg-centurion',
        title: 'Centurion Scholar',
        titleHi: 'शतकवीर अध्येता',
        description: 'Achieved 100% on the comprehensive Class 9 mid-term diagnostic.',
        icon: '👑',
        unlockedAt: '2026-10-25',
        category: 'mastery',
        color: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-500',
      },
      {
        id: 'bdg-streak-30',
        title: 'Monthly Streak Legend',
        titleHi: 'मासिक निरंतरता कीर्तिमान',
        description: 'Maintained unbroken learning streak for 30 consecutive days.',
        icon: '⚡',
        unlockedAt: '2026-10-27',
        category: 'streak',
        color: 'border-amber-500/30 bg-amber-500/10 text-amber-500',
      },
      {
        id: 'bdg-olympiad',
        title: 'Olympiad Ranker',
        titleHi: 'ओलिंपियाड मेधावी',
        description: 'Completed 50 advanced NCERT Exemplar level 4 challenge tasks.',
        icon: '🏆',
        unlockedAt: '2026-10-20',
        category: 'accuracy',
        color: 'border-sky-500/30 bg-sky-500/10 text-sky-500',
      },
    ],
    recommendedSteps: [
      {
        id: 'rec-a1',
        skillCode: 'MATH-9-CH05-S01',
        skillName: 'Parallel Axiom (Postulate 5) Equivalent Formulations',
        topicName: "Euclid's Geometry",
        type: 'practice',
        reason:
          'Elevate 72% partial mastery to 95%+ by analyzing historical attempts to prove Postulate 5.',
        estimatedMinutes: 10,
      },
      {
        id: 'rec-a2',
        skillCode: 'MATH-9-CH07-S01',
        skillName: 'Skip Ahead: Congruence Criteria for Triangles (SAS, ASA, SSS, RHS)',
        topicName: 'Triangles',
        type: 'mastery_gate',
        reason: 'Ready to unlock advanced Class 9 geometric proof units early.',
        estimatedMinutes: 15,
      },
    ],
  },
  {
    id: 'stu-005',
    slug: 'stu-kabir-singh',
    fullName: 'Kabir Singh',
    fullNameHi: 'कबीर सिंह',
    rollNumber: '105',
    grade: 7,
    section: 'A',
    academicYear: '2024-2025',
    schoolName: 'Govt. Model Senior Secondary School, Delhi',
    schoolUdise: '07010100101',
    age: 12,
    avatarGradient: 'from-teal-500 to-emerald-700',
    bio: 'Class 7 sports enthusiast who learns best through cricket batting averages and sports analytics. Great at fractions and decimals, practicing negative integer signs.',
    bioHi:
      'कक्षा 7 के विद्यार्थी जिन्हें खेल के आंकड़ों से गणित समझना प्रिय है। भिन्न और दशमलव में निपुण, ऋणात्मक पूर्णांकों के नियमों का अभ्यास कर रहे हैं।',
    preferredLanguage: 'hi',
    dpdpConsentGranted: true,
    guardianName: 'Harpreet Singh',
    guardianRelation: 'Father (पिता)',
    overallMastery: 67,
    learningStreakDays: 9,
    accuracyRate: 72,
    totalQuestionsSolved: 230,
    practiceHours: 19.0,
    attendanceRate: 92,
    assignedTeacherName: 'Mrs. Sunita Sharma',
    assignedTeacherSlug: 'tchr-sunita-sharma',
    skills: [
      {
        skillId: 'sk-7-frac-01-k',
        skillCode: 'MATH-7-CH02-S01',
        skillName: 'Multiplication & Division of Fractions and Decimals',
        topicName: 'Fractions and Decimals',
        topicCode: 'CH02',
        difficulty: 2,
        pMastery: 0.84,
        state: 'mastered',
        attemptsCount: 38,
        lastAttemptedAt: '2026-10-27T16:00:00Z',
      },
      {
        skillId: 'sk-7-geo-01-k',
        skillCode: 'MATH-7-CH05-S01',
        skillName: 'Complementary, Supplementary, and Vertically Opposite Angles',
        topicName: 'Lines and Angles',
        topicCode: 'CH05',
        difficulty: 2,
        pMastery: 0.79,
        state: 'mastered',
        attemptsCount: 30,
        lastAttemptedAt: '2026-10-26T11:40:00Z',
      },
      {
        skillId: 'sk-7-int-01-k',
        skillCode: 'MATH-7-CH01-S01',
        skillName: 'Multiplication and Division of Negative Integers',
        topicName: 'Integers',
        topicCode: 'CH01',
        difficulty: 3,
        pMastery: 0.48,
        state: 'not_learned',
        attemptsCount: 26,
        lastAttemptedAt: '2026-10-28T09:00:00Z',
      },
      {
        skillId: 'sk-7-rat-01-k',
        skillCode: 'MATH-7-CH09-S01',
        skillName: 'Rational Numbers on Number Line & Comparison',
        topicName: 'Rational Numbers',
        topicCode: 'CH09',
        difficulty: 3,
        pMastery: 0.5,
        state: 'partial',
        attemptsCount: 24,
        lastAttemptedAt: '2026-10-25T15:20:00Z',
      },
    ],
    errorPatterns: [
      {
        questionCode: 'ERR-NEG-MULT',
        promptExcerpt: 'Calculate (-5) × (-4)',
        distractorChosen: '-20 (reasoned that two negatives make a bigger negative)',
        count: 7,
        misconception: 'Negative product rule confusion: missed that (-) * (-) = (+).',
        remedyAction: 'Assigned number line vector walk visualization module.',
        severity: 'high',
      },
      {
        questionCode: 'ERR-RECIPROCAL-DIV',
        promptExcerpt: 'Divide: (3/4) ÷ (2/5)',
        distractorChosen: 'Multiplied directly (3*2)/(4*5) = 6/20 without reciprocating divisor',
        count: 5,
        misconception:
          'Forgot to invert second fraction when converting division to multiplication.',
        remedyAction: 'Practice on "Keep, Change, Flip" fraction division mnemonic.',
        severity: 'medium',
      },
    ],
    hintUsage: {
      totalHintsRequested: 95,
      hint1Count: 52,
      hint2Count: 28,
      hint3Count: 15,
      independentAttemptsCount: 135,
      independenceRatio: 58.7,
    },
    trend: [
      { date: 'Week 1', pMastery: 0.51, attempts: 38, accuracy: 56 },
      { date: 'Week 2', pMastery: 0.56, attempts: 44, accuracy: 62 },
      { date: 'Week 3', pMastery: 0.6, attempts: 48, accuracy: 66 },
      { date: 'Week 4', pMastery: 0.64, attempts: 50, accuracy: 70 },
      { date: 'Week 5', pMastery: 0.67, attempts: 50, accuracy: 72 },
    ],
    recentActivities: [
      {
        id: 'act-501',
        questionCode: 'Q-FRAC-202',
        prompt: 'Multiply 2/3 by 5/7',
        topic: 'Fractions',
        isCorrect: true,
        timeSpentSeconds: 28,
        hintsUsed: 0,
        timestamp: '2026-10-28T09:30:00Z',
      },
      {
        id: 'act-502',
        questionCode: 'Q-INT-104',
        prompt: 'Evaluate: (-6) × (-7)',
        topic: 'Integers',
        isCorrect: false,
        timeSpentSeconds: 45,
        hintsUsed: 1,
        timestamp: '2026-10-28T09:00:00Z',
      },
    ],
    badges: [
      {
        id: 'bdg-fraction-hero',
        title: 'Fraction Champion',
        titleHi: 'भिन्न शिरोमणि',
        description: 'Mastered fraction operations with 84% competency benchmark.',
        icon: '🍕',
        unlockedAt: '2026-10-26',
        category: 'mastery',
        color: 'border-teal-500/30 bg-teal-500/10 text-teal-500',
      },
      {
        id: 'bdg-angle-master',
        title: 'Angle Inspector',
        titleHi: 'कोण अन्वेषक',
        description: 'Solved 25 vertically opposite angle identification questions.',
        icon: '📏',
        unlockedAt: '2026-10-24',
        category: 'accuracy',
        color: 'border-blue-500/30 bg-blue-500/10 text-blue-500',
      },
    ],
    recommendedSteps: [
      {
        id: 'rec-k1',
        skillCode: 'MATH-7-CH01-S01',
        skillName: 'Integer Multiplication Signs: Number Line Animation',
        topicName: 'Integers',
        type: 'remedial',
        reason: 'Remediate negative times negative sign confusion with animated visual models.',
        estimatedMinutes: 8,
      },
      {
        id: 'rec-k2',
        skillCode: 'MATH-7-CH09-S01',
        skillName: 'Rational Numbers Distance on Number Line',
        topicName: 'Rational Numbers',
        type: 'practice',
        reason:
          'Raise 50% partial mastery to mastered state through 5 number line positioning items.',
        estimatedMinutes: 9,
      },
    ],
  },
  {
    id: 'stu-006',
    slug: 'stu-diya-mehta',
    fullName: 'Diya Mehta',
    fullNameHi: 'दीया मेहता',
    rollNumber: '106',
    grade: 10,
    section: 'A',
    academicYear: '2024-2025',
    schoolName: 'Govt. Model Senior Secondary School, Delhi',
    schoolUdise: '07010100101',
    age: 15,
    avatarGradient: 'from-rose-500 to-pink-700',
    bio: 'Class 10 CBSE Board candidate practicing rigorous NCERT exemplar problems. Outstanding analytical stamina in quadratic equations and arithmetic progressions.',
    bioHi:
      'कक्षा 10 की छात्रा जो सीबीएसई बोर्ड परीक्षा हेतु गहन अभ्यास कर रही हैं। द्विघात समीकरण और समांतर श्रेढ़ी में उत्कृष्ट विश्लेषणात्मक दक्षता।',
    preferredLanguage: 'en',
    dpdpConsentGranted: true,
    guardianName: 'Vikas Mehta',
    guardianRelation: 'Father (पिता)',
    overallMastery: 88,
    learningStreakDays: 19,
    accuracyRate: 90,
    totalQuestionsSolved: 520,
    practiceHours: 42.5,
    attendanceRate: 97,
    assignedTeacherName: 'Mr. Rajesh Kumar',
    assignedTeacherSlug: 'tchr-rajesh-kumar',
    skills: [
      {
        skillId: 'sk-10-rea-01-d',
        skillCode: 'MATH-10-CH01-S01',
        skillName: 'Fundamental Theorem of Arithmetic & Proof of √p Irrationality',
        topicName: 'Real Numbers',
        topicCode: 'CH01',
        difficulty: 3,
        pMastery: 0.96,
        state: 'mastered',
        attemptsCount: 46,
        lastAttemptedAt: '2026-10-27T18:10:00Z',
      },
      {
        skillId: 'sk-10-qua-01-d',
        skillCode: 'MATH-10-CH04-S01',
        skillName: 'Nature of Roots (Discriminant b² - 4ac) & Quadratic Formula',
        topicName: 'Quadratic Equations',
        topicCode: 'CH04',
        difficulty: 4,
        pMastery: 0.92,
        state: 'mastered',
        attemptsCount: 50,
        lastAttemptedAt: '2026-10-28T08:30:00Z',
      },
      {
        skillId: 'sk-10-ap-01-d',
        skillCode: 'MATH-10-CH05-S01',
        skillName: 'nth Term & Sum of First n Terms of an AP (Sn = n/2[2a + (n-1)d])',
        topicName: 'Arithmetic Progressions',
        topicCode: 'CH05',
        difficulty: 3,
        pMastery: 0.9,
        state: 'mastered',
        attemptsCount: 44,
        lastAttemptedAt: '2026-10-26T17:00:00Z',
      },
      {
        skillId: 'sk-10-tri-01-d',
        skillCode: 'MATH-10-CH08-S01',
        skillName: 'Trigonometric Ratios & Standard Angle Values (0°, 30°, 45°, 60°, 90°)',
        topicName: 'Introduction to Trigonometry',
        topicCode: 'CH08',
        difficulty: 4,
        pMastery: 0.62,
        state: 'partial',
        attemptsCount: 36,
        lastAttemptedAt: '2026-10-25T19:00:00Z',
      },
      {
        skillId: 'sk-10-vol-01-d',
        skillCode: 'MATH-10-CH13-S01',
        skillName: 'Combination of Solids & Surface Area Conversion',
        topicName: 'Surface Areas and Volumes',
        topicCode: 'CH13',
        difficulty: 4,
        pMastery: 0.68,
        state: 'partial',
        attemptsCount: 28,
        lastAttemptedAt: '2026-10-24T15:30:00Z',
      },
    ],
    errorPatterns: [
      {
        questionCode: 'ERR-TRIG-IDENTITY',
        promptExcerpt: 'Evaluate (sin 30° + cos 60°) / tan 45°',
        distractorChosen: 'Confused cos 60° with √3/2 (used cos 30° value)',
        count: 4,
        misconception:
          'Swapped complementary angle table values between 30° and 60° for sine and cosine.',
        remedyAction: 'Assigned unit equilateral triangle derivation mnemonic.',
        severity: 'medium',
      },
      {
        questionCode: 'ERR-FRUSTUM-CONVERSION',
        promptExcerpt: 'Metallic sphere of radius 6cm melted and recast into wire',
        distractorChosen:
          'Equated surface areas instead of conserving volume (V_sphere = V_cylinder)',
        count: 3,
        misconception:
          'Conservation principle error: equated external area rather than cubic volume.',
        remedyAction: 'Physical recast volume conservation practice module.',
        severity: 'medium',
      },
    ],
    hintUsage: {
      totalHintsRequested: 100,
      hint1Count: 65,
      hint2Count: 25,
      hint3Count: 10,
      independentAttemptsCount: 420,
      independenceRatio: 80.7,
    },
    trend: [
      { date: 'Week 1', pMastery: 0.77, attempts: 80, accuracy: 82 },
      { date: 'Week 2', pMastery: 0.81, attempts: 92, accuracy: 86 },
      { date: 'Week 3', pMastery: 0.84, attempts: 105, accuracy: 88 },
      { date: 'Week 4', pMastery: 0.86, attempts: 118, accuracy: 89 },
      { date: 'Week 5', pMastery: 0.88, attempts: 125, accuracy: 91 },
    ],
    recentActivities: [
      {
        id: 'act-601',
        questionCode: 'Q-QUA-402',
        prompt: 'Find nature of roots of 2x² - 4x + 3 = 0',
        topic: 'Quadratic Equations',
        isCorrect: true,
        timeSpentSeconds: 32,
        hintsUsed: 0,
        timestamp: '2026-10-28T08:30:00Z',
      },
      {
        id: 'act-602',
        questionCode: 'Q-TRI-805',
        prompt: 'If tan A = 4/3, find the value of sin A * cos A',
        topic: 'Trigonometry',
        isCorrect: true,
        timeSpentSeconds: 46,
        hintsUsed: 1,
        timestamp: '2026-10-27T17:15:00Z',
      },
    ],
    badges: [
      {
        id: 'bdg-board-ace',
        title: 'Board Exam Ready',
        titleHi: 'बोर्ड परीक्षा तत्पर',
        description: 'Demonstrated >90% mastery on standard 4-mark CBSE quadratic questions.',
        icon: '🎓',
        unlockedAt: '2026-10-26',
        category: 'mastery',
        color: 'border-rose-500/30 bg-rose-500/10 text-rose-500',
      },
      {
        id: 'bdg-streak-19',
        title: 'Discipline Master',
        titleHi: 'अनुशासन साधक',
        description: 'Studied for 19 days in a row preparing for board diagnostics.',
        icon: '🔥',
        unlockedAt: '2026-10-27',
        category: 'streak',
        color: 'border-amber-500/30 bg-amber-500/10 text-amber-500',
      },
      {
        id: 'bdg-ap-explorer',
        title: 'Progression Pro',
        titleHi: 'श्रेढ़ी विशेषज्ञ',
        description: 'Solved all variations of arithmetic progression word problems.',
        icon: '📈',
        unlockedAt: '2026-10-22',
        category: 'accuracy',
        color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500',
      },
    ],
    recommendedSteps: [
      {
        id: 'rec-d1',
        skillCode: 'MATH-10-CH08-S01',
        skillName: 'Trigonometric Table Memory Matrix & Visual Proofs',
        topicName: 'Trigonometry',
        type: 'remedial',
        reason: 'Reinforce table values for 30°, 45°, 60° to eradicate the cos 60° swap error.',
        estimatedMinutes: 8,
      },
      {
        id: 'rec-d2',
        skillCode: 'MATH-10-CH13-S01',
        skillName: 'Recasting & Melting Solids Volume Conservation Practice',
        topicName: 'Surface Areas & Volumes',
        type: 'practice',
        reason: 'Solve 3 board exam recast word problems to secure volume conservation intuition.',
        estimatedMinutes: 12,
      },
    ],
  },
];

// -------------------------------------------------------------
// SEED DATA: 3 TEACHERS WITH RICH UNIQUE DATA
// -------------------------------------------------------------

export const TEACHERS_DATA: TeacherProfile[] = [
  {
    id: 'tchr-001',
    slug: 'tchr-rajesh-kumar',
    fullName: 'Mr. Rajesh Kumar',
    fullNameHi: 'श्री राजेश कुमार',
    title: 'Senior Mathematics Educator & Department Head',
    titleHi: 'वरिष्ठ गणित शिक्षक एवं विभागाध्यक्ष',
    employeeId: 'EMP-T8402',
    email: 'rajesh.kumar@delhiedu.gov.in',
    phone: '+91 98112 34567',
    schoolName: 'Govt. Model Senior Secondary School, Delhi',
    department: 'Secondary Mathematics (Classes 8–10)',
    qualifications: 'M.Sc. Mathematics, B.Ed. (Gold Medalist, Delhi University)',
    experienceYears: 14,
    avatarGradient: 'from-blue-600 to-indigo-800',
    bio: 'Dedicated educator specializing in transforming math anxiety into conceptual intuition. Pioneer in utilizing BodhAI diagnostic telemetry to structure differentiated remedial groups and adaptive problem sets.',
    bioHi:
      'गणित के भय को अवधारणात्मक रुचि में बदलने वाले समर्पित शिक्षक। विद्यार्थियों की सीखने की कमियों को दूर करने हेतु बोधAI के निदानात्मक विश्लेषण का प्रयोग करने में अग्रणी।',
    officeHours: 'Monday, Wednesday, Friday: 2:30 PM – 4:00 PM (Room 204)',
    verifiedEducator: true,
    totalStudentsTaught: 125,
    activeClassesCount: 3,
    avgClassroomMastery: 78.2,
    totalAssignmentsCreated: 34,
    aiDecisionsReviewed: 62,
    classes: [
      {
        id: 'cls-8a',
        name: 'Class 8 - Section A',
        grade: 8,
        section: 'A',
        academicYear: '2024-2025',
        studentCount: 42,
        avgMastery: 78.4,
        activeAssignments: 3,
        joinCode: 'MATH8A24',
        status: 'active',
      },
      {
        id: 'cls-9b',
        name: 'Class 9 - Section B',
        grade: 9,
        section: 'B',
        academicYear: '2024-2025',
        studentCount: 38,
        avgMastery: 72.1,
        activeAssignments: 2,
        joinCode: 'MATH9B24',
        status: 'active',
      },
      {
        id: 'cls-10a',
        name: 'Class 10 - Section A',
        grade: 10,
        section: 'A',
        academicYear: '2024-2025',
        studentCount: 45,
        avgMastery: 84.1,
        activeAssignments: 4,
        joinCode: 'MATH10A24',
        status: 'active',
      },
    ],
    pedagogicalDecisions: [
      {
        id: 'dec-101',
        className: 'Class 8-A',
        suggestionTitle: 'Targeted Remediation for Negative Sign Bracket Expansion',
        action: 'accepted',
        timestamp: '2026-10-27T10:15:00Z',
        rationale: 'Telemetry showed 7 students repeating sign errors in multi-term brackets.',
        skillName: 'Linear Equations & Expressions',
      },
      {
        id: 'dec-102',
        className: 'Class 10-A',
        suggestionTitle: 'Re-order Quadratic Formula Practice before Word Problems',
        action: 'edited',
        timestamp: '2026-10-25T14:30:00Z',
        rationale:
          'Adjusted practice ladder to include 2 discriminant classification checks first.',
        skillName: 'Quadratic Equations',
      },
      {
        id: 'dec-103',
        className: 'Class 9-B',
        suggestionTitle: 'Skip Ahead Diagnostic on Rationalization',
        action: 'accepted',
        timestamp: '2026-10-22T09:00:00Z',
        rationale: 'High performing cohort identified for early access to Class 10 real numbers.',
        skillName: 'Number Systems',
      },
    ],
    schedule: [
      {
        day: 'Mon',
        period: 'Period 1',
        timeSlot: '08:30 - 09:15',
        className: 'Class 8-A',
        subject: 'Linear Equations',
        room: 'Room 204',
      },
      {
        day: 'Mon',
        period: 'Period 3',
        timeSlot: '10:00 - 10:45',
        className: 'Class 10-A',
        subject: 'Quadratic Equations',
        room: 'Room 302',
      },
      {
        day: 'Tue',
        period: 'Period 2',
        timeSlot: '09:15 - 10:00',
        className: 'Class 9-B',
        subject: 'Polynomials',
        room: 'Room 208',
      },
      {
        day: 'Wed',
        period: 'Period 1',
        timeSlot: '08:30 - 09:15',
        className: 'Class 8-A',
        subject: 'Mensuration Lab',
        room: 'Math Lab',
      },
      {
        day: 'Wed',
        period: 'Period 4',
        timeSlot: '11:00 - 11:45',
        className: 'Doubt Clinic',
        subject: 'Remedial Group Practice',
        room: 'Room 204',
      },
      {
        day: 'Thu',
        period: 'Period 3',
        timeSlot: '10:00 - 10:45',
        className: 'Class 10-A',
        subject: 'Trigonometry',
        room: 'Room 302',
      },
      {
        day: 'Fri',
        period: 'Period 2',
        timeSlot: '09:15 - 10:00',
        className: 'Class 9-B',
        subject: 'Coordinate Geometry',
        room: 'Room 208',
      },
    ],
    specializations: [
      'CBSE Secondary Mathematics Curriculum (Classes 8-10)',
      'Formative Assessment Telemetry & Gap Cluster Remediation',
      'NEP 2020 Pedagogical Framework Implementation',
      'National Talent Search Examination (NTSE) Coaching',
    ],
  },
  {
    id: 'tchr-002',
    slug: 'tchr-sunita-sharma',
    fullName: 'Mrs. Sunita Sharma',
    fullNameHi: 'श्रीमती सुनीता शर्मा',
    title: 'Senior Middle School Mentor & State Awardee',
    titleHi: 'वरिष्ठ माध्यमिक परामर्शदाता एवं राज्य पुरस्कार से सम्मानित',
    employeeId: 'EMP-T7915',
    email: 'sunita.sharma@delhiedu.gov.in',
    phone: '+91 98223 45678',
    schoolName: 'Govt. Model Senior Secondary School, Delhi',
    department: 'Middle School Mathematics & Science (Classes 6–7)',
    qualifications: 'Ph.D. in Mathematics Education, M.Sc. Applied Mathematics, B.Ed.',
    experienceYears: 16,
    avatarGradient: 'from-purple-600 to-pink-800',
    bio: 'State Teacher Awardee 2023. Specializes in activity-based tactile math, fractions physical manipulative kits, and girl-child STEM engagement in foundational middle school.',
    bioHi:
      'राज्य शिक्षक पुरस्कार 2023 से सम्मानित। व्यावहारिक गतिविधियों, गणित किट तथा माध्यमिक स्तर पर छात्राओं की विज्ञान-गणित में सहभागिता बढ़ाने में विशेष अनुभव।',
    officeHours: 'Tuesday, Thursday: 2:00 PM – 3:30 PM (Math Lab 2)',
    verifiedEducator: true,
    totalStudentsTaught: 76,
    activeClassesCount: 2,
    avgClassroomMastery: 78.0,
    totalAssignmentsCreated: 28,
    aiDecisionsReviewed: 46,
    classes: [
      {
        id: 'cls-6a',
        name: 'Class 6 - Section A',
        grade: 6,
        section: 'A',
        academicYear: '2024-2025',
        studentCount: 36,
        avgMastery: 81.0,
        activeAssignments: 2,
        joinCode: 'MATH6A24',
        status: 'active',
      },
      {
        id: 'cls-7a',
        name: 'Class 7 - Section A',
        grade: 7,
        section: 'A',
        academicYear: '2024-2025',
        studentCount: 40,
        avgMastery: 75.0,
        activeAssignments: 3,
        joinCode: 'MATH7A24',
        status: 'active',
      },
    ],
    pedagogicalDecisions: [
      {
        id: 'dec-201',
        className: 'Class 7-A',
        suggestionTitle: 'Visual Number Line Remediation for Negative Integer Products',
        action: 'accepted',
        timestamp: '2026-10-26T11:20:00Z',
        rationale: 'Implemented physical manipulative walk before algebraic rule drilling.',
        skillName: 'Integers',
      },
      {
        id: 'dec-202',
        className: 'Class 6-A',
        suggestionTitle: 'Decimals Real-World Money Comparison Tasks',
        action: 'accepted',
        timestamp: '2026-10-23T15:10:00Z',
        rationale: 'Connected decimal places to rupees and paise for intuitive understanding.',
        skillName: 'Fractions and Decimals',
      },
    ],
    schedule: [
      {
        day: 'Mon',
        period: 'Period 2',
        timeSlot: '09:15 - 10:00',
        className: 'Class 6-A',
        subject: 'Knowing Our Numbers',
        room: 'Room 102',
      },
      {
        day: 'Mon',
        period: 'Period 4',
        timeSlot: '11:00 - 11:45',
        className: 'Class 7-A',
        subject: 'Fractions & Decimals',
        room: 'Room 106',
      },
      {
        day: 'Tue',
        period: 'Period 1',
        timeSlot: '08:30 - 09:15',
        className: 'Class 7-A',
        subject: 'Lines & Angles Lab',
        room: 'Math Lab 2',
      },
      {
        day: 'Thu',
        period: 'Period 3',
        timeSlot: '10:00 - 10:45',
        className: 'Class 6-A',
        subject: 'Basic Geometrical Ideas',
        room: 'Room 102',
      },
    ],
    specializations: [
      'Foundational & Preparatory Math Numeracy (Classes 6-7)',
      'Concrete-Representational-Abstract (CRA) Pedagogy',
      'Continuous and Comprehensive Evaluation (CCE)',
      'Diagnostic Remediation for Rural and Mixed-Ability Classrooms',
    ],
  },
  {
    id: 'tchr-003',
    slug: 'tchr-vikram-malhotra',
    fullName: 'Mr. Vikram Malhotra',
    fullNameHi: 'श्री विक्रम मल्होत्रा',
    title: 'Assistant Mathematics Educator & Digital Learning Lead',
    titleHi: 'सहायक गणित शिक्षक एवं डिजिटल लर्निंग प्रभारी',
    employeeId: 'EMP-T9201',
    email: 'vikram.malhotra@delhiedu.gov.in',
    phone: '+91 98334 56789',
    schoolName: 'Govt. Model Senior Secondary School, Delhi',
    department: 'Secondary Mathematics & ICT Integration',
    qualifications: 'B.Tech Computer Science, B.Ed. (Central Institute of Education)',
    experienceYears: 6,
    avatarGradient: 'from-emerald-600 to-teal-800',
    bio: 'Combines algorithmic thinking, python coding games, and mathematical puzzles to make Classes 7 and 8 engaging. Leads BodhAI school-wide implementation.',
    bioHi:
      'कम्प्यूटेशनल सोच, पहेलियों एवं व्यावहारिक उदाहरणों से गणित को रोचक बनाने वाले युवा शिक्षक। बोधAI के विद्यालय स्तरीय क्रियान्वयन के प्रभारी।',
    officeHours: 'Monday to Thursday: 3:00 PM – 4:00 PM (Computer Lab 1)',
    verifiedEducator: true,
    totalStudentsTaught: 80,
    activeClassesCount: 2,
    avgClassroomMastery: 67.5,
    totalAssignmentsCreated: 22,
    aiDecisionsReviewed: 38,
    classes: [
      {
        id: 'cls-7b',
        name: 'Class 7 - Section B',
        grade: 7,
        section: 'B',
        academicYear: '2024-2025',
        studentCount: 39,
        avgMastery: 69.0,
        activeAssignments: 2,
        joinCode: 'MATH7B24',
        status: 'active',
      },
      {
        id: 'cls-8b',
        name: 'Class 8 - Section B',
        grade: 8,
        section: 'B',
        academicYear: '2024-2025',
        studentCount: 41,
        avgMastery: 66.0,
        activeAssignments: 3,
        joinCode: 'MATH8B24',
        status: 'active',
      },
    ],
    pedagogicalDecisions: [
      {
        id: 'dec-301',
        className: 'Class 8-B',
        suggestionTitle: 'Equational Transposition Physical Scale Remediation',
        action: 'accepted',
        timestamp: '2026-10-27T12:00:00Z',
        rationale: 'Over 12 students transposed terms across "=" without flipping signs.',
        skillName: 'Linear Equations',
      },
      {
        id: 'dec-302',
        className: 'Class 7-B',
        suggestionTitle: 'Gamified Fraction Simplification Sprint',
        action: 'custom',
        timestamp: '2026-10-24T16:00:00Z',
        rationale: 'Designed custom interactive timer game to accelerate mental reduction.',
        skillName: 'Fractions',
      },
    ],
    schedule: [
      {
        day: 'Mon',
        period: 'Period 3',
        timeSlot: '10:00 - 10:45',
        className: 'Class 7-B',
        subject: 'Rational Numbers',
        room: 'Comp Lab 1',
      },
      {
        day: 'Tue',
        period: 'Period 1',
        timeSlot: '08:30 - 09:15',
        className: 'Class 8-B',
        subject: 'Square Roots',
        room: 'Room 205',
      },
      {
        day: 'Wed',
        period: 'Period 2',
        timeSlot: '09:15 - 10:00',
        className: 'Class 8-B',
        subject: 'Algebraic Transpositions',
        room: 'Room 205',
      },
      {
        day: 'Thu',
        period: 'Period 4',
        timeSlot: '11:00 - 11:45',
        className: 'Class 7-B',
        subject: 'Lines and Angles',
        room: 'Comp Lab 1',
      },
    ],
    specializations: [
      'Computational Thinking & Mathematical Algorithms',
      'Interactive Telemetry & Remedial Grouping',
      'Middle School STEM Integration',
    ],
  },
];

// -------------------------------------------------------------
// HELPER LOOKUPS & QUERY UTILITIES
// -------------------------------------------------------------

export function getAllStudents(): StudentProfile[] {
  return STUDENTS_DATA;
}

export function getStudentProfileById(idOrSlug: string): StudentProfile | undefined {
  const normalized = idOrSlug.trim().toLowerCase();
  return STUDENTS_DATA.find(
    (s) => s.id.toLowerCase() === normalized || s.slug.toLowerCase() === normalized,
  );
}

export function getAllTeachers(): TeacherProfile[] {
  return TEACHERS_DATA;
}

export function getTeacherProfileById(idOrSlug: string): TeacherProfile | undefined {
  const normalized = idOrSlug.trim().toLowerCase();
  return TEACHERS_DATA.find(
    (t) => t.id.toLowerCase() === normalized || t.slug.toLowerCase() === normalized,
  );
}

export function getStudentsByGrade(grade: number): StudentProfile[] {
  return STUDENTS_DATA.filter((s) => s.grade === grade);
}

export function getStudentsByTeacher(teacherSlug: string): StudentProfile[] {
  return STUDENTS_DATA.filter((s) => s.assignedTeacherSlug === teacherSlug);
}

// -------------------------------------------------------------
// USER SESSION & AUTHENTICATION MAPPING
// -------------------------------------------------------------

export interface AuthenticatedUserLike {
  id?: string;
  email?: string | null;
  username?: string | null;
  role?: string;
  full_name?: string;
}

export function getUserCustomProfile(userId: string): TeacherProfile | StudentProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(`bodhai_profile_${userId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveUserCustomProfile(
  userId: string,
  profile: TeacherProfile | StudentProfile,
): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`bodhai_profile_${userId}`, JSON.stringify(profile));

  // Also sync full_name into current active user in localStorage
  const rawUser = localStorage.getItem('bodhai_user');
  if (rawUser) {
    try {
      const parsed = JSON.parse(rawUser);
      parsed.full_name = profile.fullName;
      localStorage.setItem('bodhai_user', JSON.stringify(parsed));
    } catch {
      // ignore
    }
  }

  try {
    window.dispatchEvent(new Event('bodhai_auth_change'));
    window.dispatchEvent(new Event('bodhai_profile_updated'));
  } catch {
    // ignore
  }
}

export function getStableEmployeeId(seed: string): string {
  let hash = 0;
  const cleanSeed = (seed || 'default_teacher').toLowerCase();
  for (let i = 0; i < cleanSeed.length; i++) {
    hash = (hash << 5) - hash + cleanSeed.charCodeAt(i);
    hash |= 0;
  }
  const code = Math.abs(hash % 9000) + 1000;
  return `EMP-${code}`;
}

export function getProfileForUser(
  user: AuthenticatedUserLike | null,
):
  | { type: 'student'; profile: StudentProfile }
  | { type: 'teacher'; profile: TeacherProfile }
  | null {
  if (!user) return null;

  const role = (user.role || '').toLowerCase();
  const userId = user.id || user.email || user.username || 'default_user';

  // 1. Check if user has a custom saved profile (must have valid non-empty data)
  const customProfile = getUserCustomProfile(userId);
  if (customProfile) {
    if (role === 'teacher' || 'experienceYears' in customProfile) {
      const teacherProf = customProfile as TeacherProfile;
      if (
        teacherProf.classes &&
        teacherProf.classes.length > 0 &&
        (teacherProf.totalStudentsTaught || 0) > 0 &&
        teacherProf.schoolName &&
        teacherProf.schoolName !== 'School Not Set'
      ) {
        if (!teacherProf.employeeId) {
          teacherProf.employeeId = getStableEmployeeId(userId);
        }
        return { type: 'teacher', profile: teacherProf };
      }
    } else {
      const stuProf = customProfile as StudentProfile;
      if (stuProf.skills && stuProf.skills.length > 0) {
        return { type: 'student', profile: stuProf };
      }
    }
  }

  // 2. If it's a seed demo teacher account
  if (role === 'teacher') {
    const foundTeacher = TEACHERS_DATA.find((t) => {
      if (
        user.id &&
        (t.id.toLowerCase() === user.id.toLowerCase() ||
          t.slug.toLowerCase().includes(user.id.toLowerCase()))
      ) {
        return true;
      }
      if (user.email && t.email.toLowerCase() === user.email.toLowerCase()) {
        return true;
      }
      return false;
    });

    if (foundTeacher) {
      return {
        type: 'teacher',
        profile: foundTeacher,
      };
    }

    // 3. For any registered teacher: create their OWN individualized dynamic profile starting fresh
    const teacherName = user.full_name || user.username || 'Educator';
    const teacherSlug = `tchr-${teacherName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    const initialTeacher: TeacherProfile = {
      id: userId,
      slug: teacherSlug,
      fullName: teacherName,
      fullNameHi: teacherName,
      title: 'Secondary Educator',
      titleHi: 'माध्यमिक शिक्षक',
      employeeId: getStableEmployeeId(userId),
      email: user.email || '',
      phone: '',
      schoolName: 'Kendriya Vidyalaya, Delhi',
      department: 'Secondary Department',
      qualifications: 'B.Ed / CTET Certified',
      experienceYears: 4,
      avatarGradient: 'from-blue-600 via-indigo-600 to-purple-600',
      bio: 'Secondary educator mentoring students in foundational and conceptual NCERT competencies.',
      bioHi:
        'मूलभूत और वैचारिक NCERT दक्षताओं में छात्रों का मार्गदर्शन करने वाले माध्यमिक शिक्षक।',
      officeHours: 'Monday – Friday, 2:00 PM – 4:00 PM',
      verifiedEducator: true,
      totalStudentsTaught: 0,
      activeClassesCount: 0,
      avgClassroomMastery: 0,
      totalAssignmentsCreated: 0,
      aiDecisionsReviewed: 0,
      classes: [],
      pedagogicalDecisions: [],
      schedule: [],
      specializations: ['CBSE/NCERT Class 6-10 Curriculum', 'Adaptive Learning'],
    };

    // Permanently persist so page reloads always return the exact same profile
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`bodhai_profile_${userId}`, JSON.stringify(initialTeacher));
      } catch {
        // ignore
      }
    }

    return {
      type: 'teacher',
      profile: initialTeacher,
    };
  }

  // 4. Seed demo student account
  const foundStudent = STUDENTS_DATA.find((s) => {
    if (
      user.id &&
      (s.id.toLowerCase() === user.id.toLowerCase() ||
        s.slug.toLowerCase().includes(user.id.toLowerCase()))
    ) {
      return true;
    }
    if (user.username && s.slug.toLowerCase().includes(user.username.toLowerCase())) {
      return true;
    }
    return false;
  });

  if (foundStudent) {
    return {
      type: 'student',
      profile: foundStudent,
    };
  }

  // 5. For any other real student: create their OWN individualized profile (NOT hardcoded to Aarav Sharma!)
  const initialStudent: StudentProfile = {
    id: userId,
    slug: `stu-${(user.full_name || user.username || 'student').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    fullName: user.full_name || user.username || 'Student',
    fullNameHi: user.full_name || user.username || 'विद्यार्थी',
    rollNumber: '1',
    grade: 8,
    section: 'A',
    academicYear: '2024-2025',
    schoolName: '',
    schoolUdise: '',
    age: 13,
    avatarGradient: 'from-emerald-500 via-teal-600 to-cyan-600',
    bio: '',
    bioHi: '',
    preferredLanguage: 'en',
    dpdpConsentGranted: true,
    guardianName: '',
    guardianRelation: 'Parent/Guardian',
    overallMastery: 0,
    learningStreakDays: 1,
    accuracyRate: 0,
    totalQuestionsSolved: 0,
    practiceHours: 0,
    attendanceRate: 100,
    assignedTeacherName: 'Class Teacher',
    assignedTeacherSlug: '',
    skills: [],
    errorPatterns: [],
    hintUsage: {
      totalHintsRequested: 0,
      hint1Count: 0,
      hint2Count: 0,
      hint3Count: 0,
      independentAttemptsCount: 0,
      independenceRatio: 100,
    },
    trend: [],
    recentActivities: [],
    badges: [],
    recommendedSteps: [],
  };

  // Permanently persist so page reloads always return the exact same student profile
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`bodhai_profile_${userId}`, JSON.stringify(initialStudent));
    } catch {
      // ignore
    }
  }

  return {
    type: 'student',
    profile: initialStudent,
  };
}

// -------------------------------------------------------------
// DEMO ACCOUNTS FOR INSTANT LOGIN TESTING
// -------------------------------------------------------------

export interface DemoAccount {
  id: string;
  name: string;
  nameHi: string;
  role: 'student' | 'teacher';
  badge: string;
  description: string;
  descriptionHi: string;
  avatarGradient: string;
  user: {
    id: string;
    email: string;
    username: string;
    full_name: string;
    role: 'student' | 'teacher';
    preferred_language: 'en' | 'hi';
    is_minor: boolean;
    created_at: string;
  };
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'demo-aarav',
    name: 'Aarav Sharma',
    nameHi: 'आरव शर्मा',
    role: 'student',
    badge: 'Class 8-A • Roll 101',
    description: 'Master of Linear Equations & Rational Numbers (78% Mastery, 16d Streak)',
    descriptionHi: 'रैखिक समीकरण व परिमेय संख्या विशेषज्ञ (78% दक्षता, 16 दिन स्ट्रीक)',
    avatarGradient: 'from-emerald-500 to-teal-700',
    user: {
      id: 'stu-001',
      email: 'aarav.sharma@bodhai.internal',
      username: 'aarav_sharma',
      full_name: 'Aarav Sharma',
      role: 'student',
      preferred_language: 'hi',
      is_minor: true,
      created_at: '2026-09-01T00:00:00Z',
    },
  },
  {
    id: 'demo-priya',
    name: 'Priya Patel',
    nameHi: 'प्रिया पटेल',
    role: 'student',
    badge: 'Class 8-A • Roll 102',
    description: 'Geometry & Mensuration Virtuoso (85% Mastery, 22d Streak)',
    descriptionHi: 'ज्यामिति एवं क्षेत्रमिति पारंगत (85% दक्षता, 22 दिन स्ट्रीक)',
    avatarGradient: 'from-purple-500 to-indigo-700',
    user: {
      id: 'stu-002',
      email: 'priya.patel@bodhai.internal',
      username: 'priya_patel',
      full_name: 'Priya Patel',
      role: 'student',
      preferred_language: 'en',
      is_minor: true,
      created_at: '2026-09-01T00:00:00Z',
    },
  },
  {
    id: 'demo-rohan',
    name: 'Rohan Verma',
    nameHi: 'रोहन वर्मा',
    role: 'student',
    badge: 'Class 8-B • Roll 103',
    description: 'Mental Math & Squares, High Hint Ladder (58% Mastery, 5d Streak)',
    descriptionHi: 'मौखिक गणित व वर्ग संख्या, उच्च संकेत उपयोग (58% दक्षता)',
    avatarGradient: 'from-amber-500 to-orange-700',
    user: {
      id: 'stu-003',
      email: 'rohan.verma@bodhai.internal',
      username: 'rohan_verma',
      full_name: 'Rohan Verma',
      role: 'student',
      preferred_language: 'hi',
      is_minor: true,
      created_at: '2026-09-01T00:00:00Z',
    },
  },
  {
    id: 'demo-ananya',
    name: 'Ananya Iyer',
    nameHi: 'अनन्या अय्यर',
    role: 'student',
    badge: 'Class 9-A • Roll 104',
    description: 'Olympiad Ranker with 93% Mastery & 31d Streak (Zero Hint Reliance)',
    descriptionHi: 'ओलिंपियाड मेधावी, 93% दक्षता एवं 31 दिन अटूट स्ट्रीक',
    avatarGradient: 'from-sky-500 to-blue-700',
    user: {
      id: 'stu-004',
      email: 'ananya.iyer@bodhai.internal',
      username: 'ananya_iyer',
      full_name: 'Ananya Iyer',
      role: 'student',
      preferred_language: 'en',
      is_minor: true,
      created_at: '2026-09-01T00:00:00Z',
    },
  },
  {
    id: 'demo-sunita',
    name: 'Mrs. Sunita Sharma',
    nameHi: 'श्रीमती सुनीता शर्मा',
    role: 'teacher',
    badge: 'Class 8-A Math • 48 Students',
    description: 'Middle School Math Specialist (16y Exp, State Teacher Awardee)',
    descriptionHi: 'कक्षा 8-A गणित विशेषज्ञ (16 वर्ष अनुभव, राज्य शिक्षक पुरस्कार)',
    avatarGradient: 'from-purple-600 to-pink-800',
    user: {
      id: 'tchr-002',
      email: 'sunita.sharma@delhiedu.gov.in',
      username: 'sunita_sharma',
      full_name: 'Mrs. Sunita Sharma',
      role: 'teacher',
      preferred_language: 'hi',
      is_minor: false,
      created_at: '2026-08-01T00:00:00Z',
    },
  },
  {
    id: 'demo-rajesh',
    name: 'Mr. Rajesh Kumar',
    nameHi: 'श्री राजेश कुमार',
    role: 'teacher',
    badge: 'Class 9-B Science • 52 Students',
    description: 'Secondary Science Educator (14y Exp, Experimental STEM Mentor)',
    descriptionHi: 'कक्षा 9-B विज्ञान शिक्षक (14 वर्ष अनुभव, स्टेम शोध मेंटर)',
    avatarGradient: 'from-blue-600 to-indigo-800',
    user: {
      id: 'tchr-001',
      email: 'rajesh.kumar@delhiedu.gov.in',
      username: 'rajesh_kumar',
      full_name: 'Mr. Rajesh Kumar',
      role: 'teacher',
      preferred_language: 'en',
      is_minor: false,
      created_at: '2026-08-01T00:00:00Z',
    },
  },
  {
    id: 'demo-ananya-roy',
    name: 'Dr. Ananya Roy',
    nameHi: 'डॉ. अनन्या रॉय',
    role: 'teacher',
    badge: 'Class 10-A Math • 55 Students',
    description: 'Senior Secondary Math Faculty (12y Exp, Board Exam Mentor)',
    descriptionHi: 'कक्षा 10-A गणित संकाय (12 वर्ष अनुभव, बोर्ड परीक्षा विशेषज्ञ)',
    avatarGradient: 'from-emerald-600 to-teal-800',
    user: {
      id: 'tchr-003',
      email: 'ananya.roy@delhiedu.gov.in',
      username: 'ananya_roy',
      full_name: 'Dr. Ananya Roy',
      role: 'teacher',
      preferred_language: 'en',
      is_minor: false,
      created_at: '2026-08-01T00:00:00Z',
    },
  },
  {
    id: 'demo-vikram-sen',
    name: 'Mr. Vikram Sen',
    nameHi: 'श्री विक्रम सेन',
    role: 'teacher',
    badge: 'Class 7-C Social Science • 44 Students',
    description: 'Social Sciences Faculty (9y Exp, Democratic & Environmental Literacy)',
    descriptionHi: 'कक्षा 7-C सामाजिक विज्ञान शिक्षक (9 वर्ष अनुभव)',
    avatarGradient: 'from-amber-600 to-red-800',
    user: {
      id: 'tchr-004',
      email: 'vikram.sen@delhiedu.gov.in',
      username: 'vikram_sen',
      full_name: 'Mr. Vikram Sen',
      role: 'teacher',
      preferred_language: 'en',
      is_minor: false,
      created_at: '2026-08-01T00:00:00Z',
    },
  },
  {
    id: 'demo-kavita',
    name: 'Ms. Kavita Deshmukh',
    nameHi: 'सुश्री कविता देशमुख',
    role: 'teacher',
    badge: 'Class 6-A English • 46 Students',
    description: 'Middle School English Educator (10y Exp, Reading & Fluency)',
    descriptionHi: 'कक्षा 6-A अंग्रेजी शिक्षिका (10 वर्ष अनुभव, वाचन एवं प्रवाह)',
    avatarGradient: 'from-fuchsia-600 to-purple-800',
    user: {
      id: 'tchr-005',
      email: 'kavita.deshmukh@delhiedu.gov.in',
      username: 'kavita_deshmukh',
      full_name: 'Ms. Kavita Deshmukh',
      role: 'teacher',
      preferred_language: 'en',
      is_minor: false,
      created_at: '2026-08-01T00:00:00Z',
    },
  },
];

export function loginAsDemoUser(demoId: string): DemoAccount | null {
  const account = DEMO_ACCOUNTS.find((a) => a.id === demoId);
  if (!account) return null;
  const mockToken = `mock_token_${account.user.id}`;
  if (typeof window !== 'undefined') {
    setAuthSession(mockToken, account.user);
    localStorage.removeItem('bodhai_active_persona');
  }
  return account;
}

// Backward compatibility helpers
export interface ActivePersona {
  type: 'student' | 'teacher';
  id: string;
  slug: string;
  name: string;
}

export function getActivePersona(): ActivePersona {
  const defaultStudent = STUDENTS_DATA[0]!;
  if (typeof window === 'undefined') {
    return {
      type: 'student',
      id: defaultStudent.id,
      slug: defaultStudent.slug,
      name: defaultStudent.fullName,
    };
  }
  try {
    const rawUser = localStorage.getItem('bodhai_user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      const res = getProfileForUser(parsed);
      if (res) {
        return {
          type: res.type,
          id: res.profile.id,
          slug: res.profile.slug,
          name: res.profile.fullName,
        };
      }
    }
  } catch {
    // fallback
  }
  return {
    type: 'student',
    id: defaultStudent.id,
    slug: defaultStudent.slug,
    name: defaultStudent.fullName,
  };
}

export function setActivePersona(persona: ActivePersona): void {
  if (typeof window === 'undefined') return;
  // Also sync user auth session
  const matchedStudent = STUDENTS_DATA.find((s) => s.slug === persona.slug || s.id === persona.id);
  if (matchedStudent) {
    const mockUser = {
      id: matchedStudent.id,
      email: `${matchedStudent.slug}@bodhai.internal`,
      username: matchedStudent.slug.replace('stu-', ''),
      full_name: matchedStudent.fullName,
      role: 'student',
      preferred_language: matchedStudent.preferredLanguage,
      is_minor: true,
      created_at: '2026-09-01T00:00:00Z',
    };
    localStorage.setItem('bodhai_user', JSON.stringify(mockUser));
    localStorage.setItem('bodhai_access_token', `mock_token_${matchedStudent.id}`);
    try {
      window.dispatchEvent(new Event('bodhai_auth_change'));
    } catch {
      // ignore
    }
    return;
  }

  const matchedTeacher = TEACHERS_DATA.find((t) => t.slug === persona.slug || t.id === persona.id);
  if (matchedTeacher) {
    const mockUser = {
      id: matchedTeacher.id,
      email: matchedTeacher.email,
      username: matchedTeacher.slug.replace('tchr-', ''),
      full_name: matchedTeacher.fullName,
      role: 'teacher',
      preferred_language: 'en',
      is_minor: false,
      created_at: '2026-08-01T00:00:00Z',
    };
    localStorage.setItem('bodhai_user', JSON.stringify(mockUser));
    localStorage.setItem('bodhai_access_token', `mock_token_${matchedTeacher.id}`);
    try {
      window.dispatchEvent(new Event('bodhai_auth_change'));
    } catch {
      // ignore
    }
  }
}
