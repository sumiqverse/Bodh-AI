import { test, expect } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL ?? 'http://localhost:3000';

type MockLesson = {
  id: string;
  skill_id: string;
  language: string;
  difficulty: number;
  title: string;
  body: string;
};

test.describe('Teacher Journey E2E Dashboard', () => {
  const classId = '11111111-1111-1111-1111-111111111111';
  const studentId = '22222222-2222-2222-2222-222222222222';
  const teacherId = '33333333-3333-3333-3333-333333333333';
  const lessonTitle = 'Rational Numbers on the Number Line';
  const lessonBody =
    'Chapter: Rational Numbers\n\nLearning outcome\nPlace rational numbers on a number line.';
  const hindiLessonTitle = 'संख्या रेखा पर परिमेय संख्याएँ';
  const hindiLessonBody =
    'अध्याय: परिमेय संख्याएँ\n\nसीखने का लक्ष्य\nपरिमेय संख्याओं को संख्या रेखा पर दर्शाएँ।';
  let savedLesson: MockLesson | null = null;

  test.beforeEach(async ({ page }) => {
    savedLesson = null;
    // Inject mock teacher session in localStorage
    await page.addInitScript(
      ({ teacherToken, userObj }) => {
        window.localStorage.setItem('bodhai_access_token', teacherToken);
        window.localStorage.setItem('bodhai_token', teacherToken);
        window.localStorage.setItem('bodhai_user', JSON.stringify(userObj));
      },
      {
        teacherToken: 'mock-teacher-token',
        userObj: {
          id: teacherId,
          email: 'teacher@school.edu.in',
          role: 'teacher',
          full_name: 'Pooja Sharma',
          is_minor: false,
          preferred_language: 'en',
        },
      },
    );

    await page.context().addCookies([
      { name: 'bodhai_logged_in', value: 'true', url: baseURL },
      { name: 'bodhai_user_role', value: 'teacher', url: baseURL },
    ]);

    // Mock backend API routes
    await page.route('**/api/v1/**', async (route) => {
      const request = route.request();
      const url = request.url();
      const method = request.method();

      // Classroom lesson content and editor endpoints
      if (url.includes(`/api/v1/classes/${classId}/content`) && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            class_id: classId,
            class_name: 'Class 8-A Mathematics',
            grade: 8,
            subject: 'mathematics',
            curriculum_code: 'NCERT-MATH-C8',
            custom_questions_count: 0,
            topics: [
              {
                id: 'topic-1',
                code: 'TOPIC-RATIONAL',
                name: 'Rational Numbers',
                description: 'Properties and representation of rational numbers.',
                sequence_order: 1,
                skills: [
                  {
                    id: 'skill-1',
                    code: 'MATH-C8-RAT-01',
                    name: lessonTitle,
                    description: 'Represent rational numbers on the number line.',
                    difficulty: 0.5,
                    blooms_level: 'understand',
                    questions: [],
                    default_lesson: { title: lessonTitle, body: lessonBody },
                    default_lesson_hi: {
                      title: hindiLessonTitle,
                      body: hindiLessonBody,
                    },
                  },
                ],
              },
            ],
          }),
        });
        return;
      }

      if (url.includes(`/api/v1/classes/${classId}/lessons/skill-1`) && method === 'GET') {
        const language = new URL(url).searchParams.get('language') === 'hi' ? 'hi' : 'en';
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: `default-${language}`,
            skill_id: 'skill-1',
            language,
            difficulty: 1,
            title: language === 'hi' ? hindiLessonTitle : lessonTitle,
            body: language === 'hi' ? hindiLessonBody : lessonBody,
            is_default: true,
          }),
        });
        return;
      }

      if (url.includes(`/api/v1/classes/${classId}/lessons`) && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(savedLesson ? [savedLesson] : []),
        });
        return;
      }

      if (url.includes(`/api/v1/classes/${classId}/lessons`) && method === 'PUT') {
        const payload = request.postDataJSON() as Omit<MockLesson, 'id'>;
        savedLesson = { id: 'lesson-1', ...payload };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(savedLesson),
        });
        return;
      }

      // Class Details
      if (
        url.includes(`/api/v1/classes/${classId}`) &&
        !url.includes('/heatmap') &&
        !url.includes('/gap-clusters') &&
        !url.includes('/early-warnings') &&
        !url.includes('/suggestions') &&
        !url.includes('/assignments') &&
        !url.includes('/progress-summary') &&
        !url.includes('/export/csv') &&
        !url.includes('/students') &&
        method === 'GET'
      ) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: classId,
            school_id: '44444444-4444-4444-4444-444444444444',
            name: 'Class 8-A Mathematics',
            grade: 8,
            section: 'A',
            academic_year: '2024-2025',
            join_code: 'EQZXR2',
            teacher_id: teacherId,
            created_at: new Date().toISOString(),
            students: [
              {
                student_id: studentId,
                full_name: 'Aarav Patel',
                username: 'aarav_8a',
                roll_number: '12',
                status: 'active',
                joined_at: new Date().toISOString(),
              },
            ],
          }),
        });
        return;
      }

      // Class Heatmap
      if (url.includes(`/api/v1/classes/${classId}/heatmap`) && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            class_id: classId,
            total_students: 1,
            total_skills: 2,
            students: [{ student_id: studentId, student_name: 'Aarav Patel', roll_number: '12' }],
            skills: [
              {
                skill_id: 'sk-1',
                skill_code: 'M-INT-01',
                skill_name: 'Integer Addition',
                topic_name: 'Number Systems',
              },
              {
                skill_id: 'sk-2',
                skill_code: 'M-INT-02',
                skill_name: 'Integer Multiplication',
                topic_name: 'Number Systems',
              },
            ],
            matrix: [
              {
                student_id: studentId,
                skill_id: 'sk-1',
                state: 'mastered',
                p_mastery: 0.92,
                attempts_count: 5,
              },
              {
                student_id: studentId,
                skill_id: 'sk-2',
                state: 'partial',
                p_mastery: 0.6,
                attempts_count: 3,
              },
            ],
            summary: {
              mastered: 1,
              partial: 1,
              not_learned: 0,
            },
          }),
        });
        return;
      }

      // Group Gap Clusters
      if (url.includes(`/api/v1/classes/${classId}/gap-clusters`) && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            class_id: classId,
            total_clusters: 1,
            clusters: [
              {
                cluster_id: 'cl-1',
                skill_id: 'sk-2',
                skill_code: 'M-INT-02',
                skill_name: 'Integer Multiplication',
                topic_name: 'Number Systems',
                student_count: 1,
                student_ids: [studentId],
                student_names: ['Aarav Patel'],
                average_p_mastery: 0.6,
                suggested_revision_plan: {
                  strategy: 'Sign-Rule Visualization & Worked Ladders',
                  focus_skill: 'Integer Multiplication',
                  target_group_size: 1,
                  suggested_actions: [
                    'Review number line sign conventions with worked examples',
                    'Assign 5 scaffolded sign-rule practice problems',
                  ],
                  recommended_duration_mins: 20,
                },
              },
            ],
          }),
        });
        return;
      }

      // Early Warnings
      if (url.includes(`/api/v1/classes/${classId}/early-warnings`) && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            class_id: classId,
            threshold_days: 14,
            warnings: [
              {
                student_id: studentId,
                student_name: 'Aarav Patel',
                roll_number: '12',
                warning_type: 'stalled',
                days_inactive_or_stalled: 15,
                message: 'Mastery stalled across Integer Multiplication over 15 days',
                suggested_action: 'Assign targeted remedial ladder with Level 1 visual hints',
              },
            ],
          }),
        });
        return;
      }

      // Suggestions
      if (url.includes(`/api/v1/classes/${classId}/suggestions`) && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            class_id: classId,
            suggestions: [
              {
                suggestion_id: 'sugg-1',
                student_id: studentId,
                student_name: 'Aarav Patel',
                skill_id: 'sk-2',
                skill_code: 'M-INT-02',
                skill_name: 'Integer Multiplication',
                title: 'Remediation Pathway for Integer Multiplication',
                evidence: {
                  accuracy: 0.5,
                  recurring_sign_error: true,
                },
                rationale: 'Student consistently errs on negative times negative product signs.',
                recommended_action:
                  'Provide visual number-line animation followed by 3 scaffolded problems.',
                is_ai_suggestion: true,
                disclaimer: 'AI Pedagogical Suggestion — Teacher discretion required.',
                status: 'pending',
              },
            ],
          }),
        });
        return;
      }

      // Record Teacher Decision
      if (
        url.includes(`/api/v1/classes/${classId}/suggestions/sugg-1/decision`) &&
        method === 'POST'
      ) {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'dec-1',
            class_id: classId,
            teacher_id: teacherId,
            suggestion_id: 'sugg-1',
            action: 'accept',
            teacher_notes: null,
            created_at: new Date().toISOString(),
          }),
        });
        return;
      }

      // Assignments (list & create)
      if (url.includes(`/api/v1/classes/${classId}/assignments`)) {
        if (method === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([]),
          });
          return;
        }
        if (method === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'asgn-new',
              class_id: classId,
              title: 'Targeted Revision: Integer Multiplication',
              description: 'Scaffolded sign rules practice',
              skill_ids: ['sk-2'],
              status: 'active',
              total_assigned: 1,
              completed_count: 0,
              students: [
                { student_id: studentId, student_name: 'Aarav Patel', status: 'assigned' },
              ],
              created_at: new Date().toISOString(),
            }),
          });
          return;
        }
      }

      // Progress Summary
      if (url.includes(`/api/v1/classes/${classId}/progress-summary`) && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            class_id: classId,
            total_students: 1,
            total_attempts: 8,
            overall_mastery_pct: 76.0,
            mastered_skills_avg: 1.0,
            reassessment_growth_pct: 22.0,
            timeline: [
              { label: 'Baseline', mastery_pct: 54.0 },
              { label: 'Current', mastery_pct: 76.0 },
            ],
          }),
        });
        return;
      }

      // Student Profile
      if (
        url.includes(`/api/v1/classes/${classId}/students/${studentId}/profile`) &&
        method === 'GET'
      ) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            student_id: studentId,
            student_name: 'Aarav Patel',
            roll_number: '12',
            skills: [
              {
                skill_id: 'sk-1',
                skill_code: 'M-INT-01',
                skill_name: 'Integer Addition',
                topic_name: 'Number Systems',
                p_mastery: 0.92,
                state: 'mastered',
                attempts_count: 5,
                correct_count: 5,
              },
            ],
            error_patterns: [
              {
                question_code: 'Q-INT-04',
                prompt_excerpt: 'Calculate (-3) * (-4)',
                distractor_chosen: '-12',
                count: 3,
                misconception: 'Negative multiplication product sign confusion',
              },
            ],
            hint_usage: {
              total_hints_requested: 4,
              hint_1_count: 2,
              hint_2_count: 1,
              hint_3_count: 1,
              independent_attempts_count: 4,
            },
            trend: [
              { date: '2026-10-20', p_mastery: 0.5, attempts: 2 },
              { date: '2026-10-25', p_mastery: 0.92, attempts: 3 },
            ],
            summary: {
              total_attempts: 8,
              mastered_skills: 1,
              total_skills: 2,
            },
          }),
        });
        return;
      }

      // Export CSV
      if (url.includes(`/api/v1/classes/${classId}/export/csv`) && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'text/csv',
          body: 'roll_number,competency_code,competency_name,mastery_state,attempts_count\n12,M-INT-01,Integer Addition,mastered,5\n',
        });
        return;
      }

      await route.continue();
    });
  });

  test('teacher navigates heatmap, triggers revision plan, accepts AI suggestion, and views profile', async ({
    page,
  }) => {
    // Navigate directly to the class dashboard
    await page.goto(`/en/classes/${classId}`);

    // Verify Class Header & DPDP Notice
    await expect(
      page.getByRole('heading', { level: 1, name: /Class 8-A Mathematics/i }),
    ).toBeVisible();
    await expect(page.getByText(/DPDP Act 2023 Compliant/i)).toBeVisible();

    // Verify Heatmap view is default tab
    await expect(page.getByRole('heading', { name: /Class Competency Heatmap/i })).toBeVisible();
    await expect(page.getByText(/Mastery Level Legend/i)).toBeVisible();

    // Verify cell with accessible pattern
    const cellBtn = page.getByRole('button', {
      name: /Aarav Patel: Integer Addition is Mastered/i,
    });
    await expect(cellBtn).toBeVisible();

    // Click on student name in heatmap to open Student Profile Modal
    const studentBtn = page.getByRole('button', { name: /View detailed profile for Aarav Patel/i });
    await studentBtn.click();

    // Verify Student Profile Modal content
    const modalHeading = page.getByRole('heading', { name: 'Aarav Patel' });
    await expect(modalHeading).toBeVisible();
    await expect(page.getByText(/Roll No: 12/i)).toBeVisible();

    // Switch to Error Patterns tab in modal
    await page.getByRole('button', { name: /Recurring Error & Distractor Patterns/i }).click();
    await expect(page.getByText(/Negative multiplication product sign confusion/i)).toBeVisible();

    // Switch to Hint Ladder Utilization tab in modal
    await page.getByRole('button', { name: /Hint Ladder Utilization/i }).click();
    await expect(page.getByText(/Independent Solutions \(No Hints\)/i)).toBeVisible();

    // Close Modal
    await page.getByRole('button', { name: 'Close dialog' }).click();
    await expect(modalHeading).not.toBeVisible();

    // Switch to "Group Gap Clusters" tab
    await page.getByRole('tab', { name: /Group Gap Clusters/i }).click();
    await expect(page.getByText(/Sign-Rule Visualization & Worked Ladders/i)).toBeVisible();

    // Click "Assign Revision to This Group"
    const assignRevBtn = page.getByRole('button', { name: /Assign Revision to This Group/i });
    await assignRevBtn.click();

    // Verifies navigation to Assignments tab with pre-filled title
    await expect(page.getByRole('heading', { name: /Targeted Assignments/i })).toBeVisible();
    await expect(
      page.locator('input[value*="Targeted Revision: Integer Multiplication"]'),
    ).toBeVisible();

    // Switch to "Suggestions & Decisions" tab
    await page.getByRole('tab', { name: /Suggestions & Decisions/i }).click();
    await expect(
      page.getByText(/AI Advisory Suggestion — Teacher Discretion Required/i),
    ).toBeVisible();
    await expect(
      page.getByText(/Student consistently errs on negative times negative product signs/i),
    ).toBeVisible();

    // Accept the AI Advisory Suggestion
    const acceptBtn = page.getByRole('button', { name: /Accept Suggestion/i });
    await acceptBtn.click();

    // Verify decision recorded state
    await expect(page.getByText(/Accepted/i)).toBeVisible();

    // Switch to "Progress & Reassessment" tab
    await page.getByRole('tab', { name: /Progress & Reassessment/i }).click();
    await expect(page.getByText(/76%/i).first()).toBeVisible();
    await expect(page.getByText('+22%', { exact: true })).toBeVisible();
    await expect(page.getByText(/Phase 3/i)).toBeVisible();
  });

  test('teacher preloads, localizes, saves, and restores a lesson', async ({ page }) => {
    await page.goto(`/en/classes/${classId}`);
    await page.getByRole('tab', { name: /Curriculum & Content Hub/i }).click();

    const titleInput = page.getByLabel('Lesson title');
    const bodyInput = page.getByLabel('Lesson content');
    await expect(titleInput).toHaveValue(lessonTitle);
    await expect(bodyInput).toHaveValue(/Learning outcome/);

    await page.getByLabel('Lesson language').selectOption('hi');
    await expect(titleInput).toHaveValue(hindiLessonTitle);
    await expect(bodyInput).toHaveValue(/सीखने का लक्ष्य/);
    await expect(page.getByText(/A Hindi default is not available/)).toHaveCount(0);

    await bodyInput.fill('Teacher activity: plot fractions on a classroom number line.');
    await page.getByRole('button', { name: 'Save lesson' }).click();
    await expect(page.getByText('Lesson saved for this class.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Restore default lesson' })).toBeVisible();

    await page.getByRole('button', { name: 'Restore default lesson' }).click();
    await expect(titleInput).toHaveValue(hindiLessonTitle);
    await expect(bodyInput).toHaveValue(hindiLessonBody);
  });

  test('student receives a language-appropriate default lesson', async ({ page }) => {
    await page.addInitScript(
      ({ activeClassId }) => {
        window.localStorage.setItem('bodhai_access_token', 'mock-student-token');
        window.localStorage.setItem(
          'bodhai_user',
          JSON.stringify({
            id: '22222222-2222-2222-2222-222222222222',
            username: 'aarav_8a',
            role: 'student',
            full_name: 'Aarav Patel',
            is_minor: true,
            preferred_language: 'en',
          }),
        );
        window.localStorage.setItem('bodhai_selected_class_id', activeClassId);
      },
      { activeClassId: classId },
    );

    await page.goto('/en/learn?skillId=skill-1');
    await expect(page.getByText('NCERT-aligned lesson')).toBeVisible();
    await expect(page.getByRole('heading', { name: lessonTitle })).toBeVisible();
    await expect(page.getByText(/Learning outcome/)).toBeVisible();

    await page.goto('/hi/learn?skillId=skill-1');
    await expect(page.getByText('NCERT-aligned lesson')).toBeVisible();
    await expect(page.getByRole('heading', { name: hindiLessonTitle })).toBeVisible();
    await expect(page.getByText(/सीखने का लक्ष्य/)).toBeVisible();
  });
});
