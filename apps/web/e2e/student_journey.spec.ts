import { test, expect } from '@playwright/test';

// Both English and Hindi locales for full pedagogical verification
const LOCALES = ['en', 'hi'] as const;

for (const locale of LOCALES) {
  test.describe(`Student Journey E2E [${locale.toUpperCase()}] with Slow 3G Network Throttling`, () => {
    test.beforeEach(async ({ page, context }) => {
      // 120s timeout per test to account for Slow 3G latency and Next dev compilation
      test.setTimeout(120_000);

      // 1. Emulate Slow 3G network conditions via Chrome DevTools Protocol if supported
      try {
        const cdpSession = await context.newCDPSession(page);
        await cdpSession.send('Network.emulateNetworkConditions', {
          offline: false,
          downloadThroughput: (750 * 1024) / 8, // ~750 kbps (Slow 3G profile)
          uploadThroughput: (500 * 1024) / 8, // 500 kbps
          latency: 150, // 150ms latency
        });
      } catch {
        // Fallback for browsers that don't support CDP
      }

      // 2. Track mastery state progression across the student journey
      let currentMasteryState: 'not_learned' | 'partial' | 'mastered' = 'not_learned';
      let currentMasteryScore = 0.2;

      // Mock API responses with simulated network latency
      await page.route('**/*', async (route) => {
        const request = route.request();
        const url = request.url();
        const method = request.method();

        if (!url.includes('/api/v1')) {
          await route.continue();
          return;
        }

        // Handle CORS preflight
        if (method === 'OPTIONS') {
          await route.fulfill({
            status: 204,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': '*',
            },
          });
          return;
        }

        const fulfillJson = async (status: number, data: unknown) => {
          await route.fulfill({
            status,
            contentType: 'application/json',
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            },
            body: JSON.stringify(data),
          });
        };

        // Artificial slow-network delay
        await new Promise((resolve) => setTimeout(resolve, 80));

        // Student Join
        if (url.includes('/api/v1/auth/student/join') && method === 'POST') {
          await fulfillJson(201, {
            access_token: 'mock-student-jwt-token',
            token_type: 'bearer',
            user: {
              id: 'student-e2e-uuid-001',
              email: null,
              username: 'priya_student',
              role: 'student',
              full_name: 'Priya Verma',
              is_minor: true,
              preferred_language: locale,
            },
          });
          return;
        }

        // Student Login
        if (url.includes('/api/v1/auth/student/login') && method === 'POST') {
          await fulfillJson(200, {
            access_token: 'mock-student-jwt-token',
            refresh_token: 'mock-student-refresh-token',
            token_type: 'bearer',
            expires_in: 3600,
            user: {
              id: 'student-e2e-uuid-001',
              email: null,
              username: 'priya_student',
              role: 'student',
              full_name: 'Priya Verma',
              is_minor: true,
              preferred_language: locale,
            },
          });
          return;
        }

        // Diagnostic Assessment Start / Progress
        if (url.includes('/api/v1/diagnostics') && method === 'POST') {
          let body: { question_id?: string; curriculum_code?: string } | null = null;
          try {
            body = request.postDataJSON();
          } catch {
            // body not JSON
          }

          // If progressing after question answered, mark completed
          if (body && body.question_id) {
            currentMasteryState = 'partial';
            currentMasteryScore = 0.55;
            await fulfillJson(200, {
              session_id: 'diag-session-e2e-42',
              is_completed: true,
              questions_answered: 15,
              next_item: null,
              rationale: 'Initial calibration completed. Ready for guided learning.',
              summary: { calibrated: true },
            });
            return;
          }

          // Initial start diagnostic response
          await fulfillJson(200, {
            session_id: 'diag-session-e2e-42',
            is_completed: false,
            questions_answered: 0,
            next_item: {
              question_id: 'diag-q-101',
              code: 'NCERT-MATH-C8-CH01-D01',
              skill_id: '10000000-0000-0000-0000-000000000001',
              skill_code: 'NCERT-MATH-C8-SK01',
              difficulty: 1,
              prompt: 'What is the reciprocal of $-\\frac{5}{8}$?',
              options: [
                { id: 'A', text: '$-\\frac{8}{5}$' },
                { id: 'B', text: '$\\frac{8}{5}$' },
                { id: 'C', text: '$\\frac{5}{8}$' },
                { id: 'D', text: '$-\\frac{5}{8}$' },
              ],
            },
          });
          return;
        }

        // Curriculum Topics & Skills
        if (url.includes('/api/v1/curricula/NCERT-MATH-C8/topics')) {
          await fulfillJson(200, [
            {
              id: 'topic-c8-01',
              code: 'NCERT-MATH-C8-CH01',
              name: locale === 'hi' ? 'परिमेय संख्याएँ' : 'Rational Numbers',
              skills: [
                {
                  id: '10000000-0000-0000-0000-000000000001',
                  code: 'NCERT-MATH-C8-SK01',
                  name:
                    locale === 'hi'
                      ? 'एक चर वाले रैखिक समीकरण'
                      : 'Linear Equations in One Variable',
                  difficulty: 1,
                  topic_id: 'topic-c8-01',
                },
              ],
            },
          ]);
          return;
        }

        // Recommended Next Item
        if (url.includes('/api/v1/next-item')) {
          await fulfillJson(200, {
            question_id: 'rec-q-201',
            code: 'NCERT-MATH-C8-CH02-Q01',
            skill_id: '10000000-0000-0000-0000-000000000001',
            skill_code: 'NCERT-MATH-C8-SK01',
            difficulty: 2,
            question_type: 'mcq',
            prompt: 'Solve the equation for $x$:\n$$3x - 7 = 14$$',
            options: [
              { id: 'A', text: '$x = 5$' },
              { id: 'B', text: '$x = 7$' },
            ],
            hints: ['Add 7 to both sides', 'Divide by 3', 'x = 7'],
            predicted_success: 0.75,
            score: 1.5,
            score_breakdown: {},
            hint_ladder: 0,
            is_test_gate: false,
            is_skip_ahead: false,
            rationale:
              locale === 'hi'
                ? 'अगली अनुशंसित अवधारणा: एक चर वाले रैखिक समीकरण'
                : 'Next recommended concept: Linear Equations in One Variable',
          });
          return;
        }

        // Student Mastery States
        if (url.includes('/api/v1/mastery')) {
          await fulfillJson(200, [
            {
              skill_id: '10000000-0000-0000-0000-000000000001',
              p_mastery: currentMasteryScore,
              confidence: 0.85,
              attempts_count: currentMasteryState === 'mastered' ? 5 : 2,
              correct_count: currentMasteryState === 'mastered' ? 5 : 1,
              state: currentMasteryState,
              rationale: 'Evaluated dynamically based on responses.',
            },
          ]);
          return;
        }

        // Practice Attempts Submission
        if (url.includes('/api/v1/attempts') && method === 'POST') {
          // If attempting test, award mastery
          if (url.includes('/api/v1/attempts')) {
            currentMasteryState = 'mastered';
            currentMasteryScore = 0.95;
          }
          await fulfillJson(200, {
            attempt_id: 'att-e2e-result-01',
            is_correct: true,
            p_mastery_after: currentMasteryScore,
            explanation:
              locale === 'hi'
                ? 'दोनों पक्षों में समान संक्रियाएं करके $x = 7$ प्राप्त होता है।'
                : 'By performing inverse operations symmetrically, we obtain x = 7.',
            rationale: 'Concept verified.',
            is_duplicate: false,
          });
          return;
        }

        // Default pass-through
        await fulfillJson(200, {});
      });
    });

    test('full student journey: join class -> diagnostic -> learn -> solve -> test -> mastered', async ({
      page,
    }) => {
      // -------------------------------------------------------------
      // 1. JOIN CLASS
      // -------------------------------------------------------------
      await page.goto(`/${locale}/join`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('h1, .font-serif').first()).toBeVisible();

      // Fill Student Join Form
      await page.fill('#join-code', 'EQZXR2');
      await page.fill('#student-username', 'priya_student');
      await page.fill('#student-pin', '1234');
      await page.fill('#student-full-name', 'Priya Verma');
      await page.fill('#student-roll-no', '18');

      await page.click('button[type="submit"]');

      // -------------------------------------------------------------
      // Set student auth session in localStorage
      // -------------------------------------------------------------
      await page.evaluate(() => {
        localStorage.setItem('bodhai_access_token', 'mock-student-jwt-token');
        localStorage.setItem(
          'bodhai_user',
          JSON.stringify({
            id: 'student-e2e-uuid-001',
            username: 'priya_student',
            role: 'student',
            full_name: 'Priya Verma',
          }),
        );
      });

      // -------------------------------------------------------------
      // 2. DIAGNOSTIC ASSESSMENT
      // -------------------------------------------------------------
      await page.goto(`/${locale}/diagnostic`, { waitUntil: 'domcontentloaded' });

      // Verify progress indicator is displayed
      await expect(page.locator('[role="progressbar"]')).toBeVisible();

      // Ensure NO scores or interim percentage marks are displayed mid-test
      const pageText = await page.textContent('body');
      expect(pageText).not.toMatch(/score:\s*\d+/i);
      expect(pageText).not.toMatch(/marks:\s*\d+/i);

      // Select answer option (Option A)
      const optionA = page.locator('button[role="radio"]').first();
      await expect(optionA).toBeVisible();
      await optionA.click();

      // Click Confirm & Next
      const confirmButton = page.getByRole('button', { name: /Confirm|पुष्टि/i }).first();
      await confirmButton.click();

      // Verify completion screen appears with clear next action
      await expect(
        page.getByRole('heading', { name: /Diagnostic|निदानात्मक/i }).first(),
      ).toBeVisible();

      // Click button to open Learning Map
      const openMapBtn = page.getByRole('button', { name: /Map|मानचित्र/i }).first();
      await openMapBtn.click();

      // -------------------------------------------------------------
      // 3. HOME SKILL MAP WITH THREE MASTERY STATES & CLEAR NEXT ACTION
      // -------------------------------------------------------------
      await page.waitForURL(`**/${locale}/student`);
      await expect(page.locator('h1, .font-serif').first()).toBeVisible();

      // Verify the three mastery states exist on page
      await expect(page.getByText(/Mastered|दक्ष/i).first()).toBeVisible();
      await expect(page.getByText(/In Progress|प्रगति पर/i).first()).toBeVisible();
      await expect(page.getByText(/Not Started|शुरू नहीं किया/i).first()).toBeVisible();

      // Verify single clear 'Next' action card is visible
      const nextActionCard = page.locator('section[aria-labelledby="next-action-heading"]');
      await expect(nextActionCard).toBeVisible();

      // Navigate to Learn
      await page.goto(`/${locale}/learn`, { waitUntil: 'domcontentloaded' });

      // -------------------------------------------------------------
      // 4. LEARN SCREEN (Chosen Depth, Worked Example, Bilingual)
      // -------------------------------------------------------------
      await expect(page.locator('h1, .font-serif').first()).toBeVisible();

      // Toggle explanation depth (Core Concept vs Deep Dive)
      const deepDiveButton = page.getByRole('button', { name: /Deep Dive|विस्तृत विवरण/i }).first();
      await deepDiveButton.click();
      await expect(deepDiveButton).toHaveClass(/bg-background/);

      // Verify worked example is present
      const workedExample = page.locator('section[aria-labelledby="worked-example-heading"]');
      await expect(workedExample).toBeVisible();

      // Proceed to Solve
      const startPracticeBtn = page.getByRole('button', { name: /Practice|अभ्यास/i }).first();
      await startPracticeBtn.click();

      // -------------------------------------------------------------
      // 5. SOLVE SCREEN (Hint Ladder with 3 Levels, Immediate Feedback)
      // -------------------------------------------------------------
      await page.waitForURL(`**/${locale}/solve*`);
      await expect(page.locator('h1, .font-serif').first()).toBeVisible();

      // Test progressive 3-level hint ladder
      const hintButton = page.getByRole('button', { name: /Hint|संकेत/i }).first();
      await expect(hintButton).toBeVisible();

      // Request Hint 1
      await hintButton.click();
      await expect(page.getByText(/Hint 1|संकेत 1/i).first()).toBeVisible();

      // Select an answer choice
      const solveOption = page.locator('button[role="radio"]').first();
      await solveOption.click();

      // Submit solution
      const submitSolveBtn = page.getByRole('button', { name: /Submit|उत्तर/i }).first();
      await submitSolveBtn.click();

      // Verify immediate calm feedback & step-by-step explanation
      await expect(
        page.getByText(/Excellent work|बहुत बढ़िया|Good effort|अच्छा प्रयास/i).first(),
      ).toBeVisible();
      await expect(
        page.getByText(/Step-by-Step Explanation|चरणबद्ध व्याख्या/i).first(),
      ).toBeVisible();

      // Click to take Mastery Check Test
      const takeTestBtn = page.getByRole('button', { name: /Mastery|दक्षता/i }).first();
      await takeTestBtn.click();

      // -------------------------------------------------------------
      // 6. TEST SCREEN (Hint-Free 3 Questions, Mastery Framing)
      // -------------------------------------------------------------
      await page.waitForURL(`**/${locale}/test*`);

      // Verify clear 'Mastery Check' framing
      await expect(page.getByText(/Mastery Check|दक्षता जांच/i).first()).toBeVisible();
      await expect(page.getByText(/Hint-Free|No Hints|संकेत-मुक्त/i).first()).toBeVisible();

      // Answer Question 1
      const testOpt1 = page.locator('button[role="radio"]').nth(1);
      await testOpt1.click();
      await page
        .getByRole('button', { name: /Submit Answer|उत्तर सबमिट/i })
        .first()
        .click();

      // Answer Question 2
      const testOpt2 = page.locator('button[role="radio"]').nth(0);
      await testOpt2.click();
      await page
        .getByRole('button', { name: /Submit Answer|उत्तर सबमिट/i })
        .first()
        .click();

      // Answer Question 3
      const testOpt3 = page.locator('button[role="radio"]').nth(0);
      await testOpt3.click();
      await page
        .getByRole('button', { name: /Submit Answer|उत्तर सबमिट/i })
        .first()
        .click();

      // -------------------------------------------------------------
      // 7. MASTERY ATTAINED
      // -------------------------------------------------------------
      // Verify mastery completion summary appears
      await expect(
        page.getByText(/Mastery Verified|दक्षता जांच पूर्ण|Mastery Check Complete/i).first(),
      ).toBeVisible();

      // Return to Skill Map and confirm skill shows Mastered badge
      const returnBtn = page
        .getByRole('button', { name: /Return to Skill Map|मानचित्र पर वापस/i })
        .first();
      await returnBtn.click();

      await page.waitForURL(`**/${locale}/student`);
      await expect(page.getByText(/Mastered|दक्ष/i).first()).toBeVisible();
    });
  });
}
