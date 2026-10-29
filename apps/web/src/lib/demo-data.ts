/**
 * Synthetic Demo Data Generator for BodhAI Hackathon Judges & Evaluators.
 * Provides realistic classrooms, students, knowledge graphs, and mastery heatmaps.
 */

import { isFeatureEnabled } from './feature-flags';

export interface DemoSchoolStats {
  schoolName: string;
  udiseCode: string;
  totalClasses: number;
  totalStudents: number;
  totalAttempts: number;
  averageMastery: number;
  gradeDistribution: Record<string, number>;
}

export interface DemoClassroom {
  id: string;
  name: string;
  grade: number;
  section: string;
  subject: string;
  studentCount: number;
  averageMastery: number;
  atRiskCount: number;
}

export interface DemoStudentSummary {
  id: string;
  rollNumber: string;
  displayName: string;
  grade: number;
  overallMastery: number;
  attemptsCount: number;
  independentRate: number;
  topMisconception: string;
}

export const DEMO_SCHOOL_STATS: DemoSchoolStats = {
  schoolName: 'Kendriya Vidyalaya IIT Powai, Mumbai',
  udiseCode: '27230100101',
  totalClasses: 12,
  totalStudents: 486,
  totalAttempts: 14280,
  averageMastery: 72.4,
  gradeDistribution: {
    'Class 6': 98,
    'Class 7': 104,
    'Class 8': 95,
    'Class 9': 102,
    'Class 10': 87,
  },
};

export const DEMO_CLASSROOMS: DemoClassroom[] = [
  {
    id: 'cls-demo-7a',
    name: 'Class 7A - Mathematics',
    grade: 7,
    section: 'A',
    subject: 'Mathematics',
    studentCount: 38,
    averageMastery: 74.2,
    atRiskCount: 4,
  },
  {
    id: 'cls-demo-9b',
    name: 'Class 9B - Science',
    grade: 9,
    section: 'B',
    subject: 'Science',
    studentCount: 42,
    averageMastery: 68.8,
    atRiskCount: 6,
  },
  {
    id: 'cls-demo-8c',
    name: 'Class 8C - Mathematics',
    grade: 8,
    section: 'C',
    subject: 'Mathematics',
    studentCount: 35,
    averageMastery: 81.5,
    atRiskCount: 2,
  },
];

export const DEMO_STUDENTS: DemoStudentSummary[] = [
  {
    id: 'stu-demo-01',
    rollNumber: '7A-01',
    displayName: 'Student 7A-01 (Pseudonym)',
    grade: 7,
    overallMastery: 84.5,
    attemptsCount: 48,
    independentRate: 88.0,
    topMisconception: 'Sign reversal in negative integer multiplication',
  },
  {
    id: 'stu-demo-02',
    rollNumber: '7A-02',
    displayName: 'Student 7A-02 (Pseudonym)',
    grade: 7,
    overallMastery: 54.0,
    attemptsCount: 36,
    independentRate: 42.0,
    topMisconception: 'Confusing numerator and denominator during fraction division',
  },
  {
    id: 'stu-demo-03',
    rollNumber: '7A-03',
    displayName: 'Student 7A-03 (Pseudonym)',
    grade: 7,
    overallMastery: 91.2,
    attemptsCount: 52,
    independentRate: 94.0,
    topMisconception: 'Minor rounding errors in multi-step decimals',
  },
];

/**
 * Checks whether demo mode is currently active.
 */
export function isDemoModeActive(): boolean {
  return isFeatureEnabled('demoMode');
}
