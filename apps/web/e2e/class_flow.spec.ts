import { test, expect } from '@playwright/test';

test.describe('End-to-End Classroom & Guardian Consent Flow', () => {
  test('teacher creates class -> student joins -> consent recorded', async ({ page }) => {
    const currentJoinCode = 'EQZXR2';
    const classId = '11111111-1111-1111-1111-111111111111';
    const studentId = '22222222-2222-2222-2222-222222222222';
    const teacherId = '33333333-3333-3333-3333-333333333333';

    // Mock API requests so the E2E test runs deterministically in CI and local
    await page.route('**/api/v1/**', async (route) => {
      const request = route.request();
      const url = request.url();
      const method = request.method();

      // Teacher Signup
      if (url.includes('/api/v1/auth/teacher/signup') && method === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock-teacher-access-token',
            refresh_token: 'mock-refresh-token',
            token_type: 'bearer',
            expires_in: 900,
            user: {
              id: teacherId,
              email: 'teacher@school.edu.in',
              role: 'teacher',
              full_name: 'Pooja Sharma',
              is_minor: false,
              preferred_language: 'en',
            },
          }),
        });
        return;
      }

      // Create Class
      if (url.includes('/api/v1/classes') && method === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: classId,
            school_id: '44444444-4444-4444-4444-444444444444',
            name: 'Class 8-A Mathematics',
            grade: 8,
            section: 'A',
            academic_year: '2024-2025',
            join_code: currentJoinCode,
            teacher_id: teacherId,
            created_at: new Date().toISOString(),
          }),
        });
        return;
      }

      // List Classes
      if (url.includes('/api/v1/classes') && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: classId,
              school_id: '44444444-4444-4444-4444-444444444444',
              name: 'Class 8-A Mathematics',
              grade: 8,
              section: 'A',
              academic_year: '2024-2025',
              join_code: currentJoinCode,
              teacher_id: teacherId,
              created_at: new Date().toISOString(),
            },
          ]),
        });
        return;
      }

      // Student Join
      if (url.includes('/api/v1/auth/student/join') && method === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: studentId,
            email: null,
            username: 'aarav_8a',
            role: 'student',
            full_name: 'Aarav Patel',
            is_minor: true,
            preferred_language: 'en',
          }),
        });
        return;
      }

      // Student Login
      if (url.includes('/api/v1/auth/student/login') && method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock-student-access-token',
            refresh_token: 'mock-student-refresh-token',
            token_type: 'bearer',
            expires_in: 900,
            user: {
              id: studentId,
              email: null,
              username: 'aarav_8a',
              role: 'student',
              full_name: 'Aarav Patel',
              is_minor: true,
              preferred_language: 'en',
            },
          }),
        });
        return;
      }

      // Consents for student
      if (url.includes('/api/v1/consents/student/') && method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
        return;
      }

      // Record Guardian Consent
      if (url.includes('/api/v1/consents') && method === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: '55555555-5555-5555-5555-555555555551',
              student_id: studentId,
              scope: 'diagnostic',
              version: '2024.1',
              is_granted: true,
              timestamp: new Date().toISOString(),
              guardian_name: 'Priya Patel',
              guardian_phone: '+919876543210',
              guardian_relationship: 'mother',
            },
            {
              id: '55555555-5555-5555-5555-555555555552',
              student_id: studentId,
              scope: 'learning',
              version: '2024.1',
              is_granted: true,
              timestamp: new Date().toISOString(),
              guardian_name: 'Priya Patel',
              guardian_phone: '+919876543210',
              guardian_relationship: 'mother',
            },
          ]),
        });
        return;
      }

      // Fallback
      await route.continue();
    });

    // --- STEP 1: Teacher creates classroom ---
    await page.goto('/en/signup');
    await expect(page.locator('h2, .font-serif')).toBeVisible();

    await page.locator('#teacher-name').fill('Pooja Sharma');
    await page.locator('#teacher-signup-email').fill('pooja.sharma@school.edu.in');
    await page.locator('#teacher-signup-password').fill('StrongEducatorPassword123!');
    await page.locator('button[type="submit"]').click();

    // Should redirect to /en/classes
    await page.waitForURL('**/classes');
    await expect(page.locator('h1')).toContainText('My Classrooms');

    // Create a new classroom
    await page.locator('#new-class-name').fill('Class 8-A Mathematics');
    await page.locator('#new-class-section').fill('A');
    await page.locator('#new-class-academic-year').fill('2024-2025');
    await page.getByRole('button', { name: /create class/i }).click();

    // Verify classroom is displayed with join code
    await expect(page.getByText('Class 8-A Mathematics')).toBeVisible();
    await expect(page.getByText('EQZXR2')).toBeVisible();

    // --- STEP 2: Student self-joins using join code + PIN ---
    await page.goto('/en/join');
    await expect(page.locator('h2, .font-serif')).toBeVisible();

    await page.locator('#join-code').fill(currentJoinCode);
    await page.locator('#student-username').fill('aarav_8a');
    await page.locator('#student-pin').fill('4321');
    await page.locator('#student-full-name').fill('Aarav Patel');
    await page.getByRole('button', { name: /join class/i }).click();

    // Enrollment recorded message
    await expect(page.getByRole('status')).toBeVisible();

    // Student signs in with teacher-issued credentials
    await page.goto('/en/login');
    // Switch to Student tab
    await page.getByRole('tab', { name: /student/i }).click();

    await page.locator('#student-join-code').fill(currentJoinCode);
    await page.locator('#student-username').fill('aarav_8a');
    await page.locator('#student-pin').fill('4321');
    await page.locator('button[type="submit"]').click();

    // Should redirect to /en/consent
    await page.waitForURL('**/consent');
    await expect(page.locator('h1')).toContainText('Parental & Guardian Consent');

    // --- STEP 3: Verifiable Guardian Consent recorded ---
    await page.locator('#guardian-name').fill('Priya Patel');
    await page.locator('#guardian-phone').fill('+919876543210');
    await page.getByRole('button', { name: /record verifiable consent/i }).click();

    // Verify success banner and active consent badge appear
    await expect(page.getByRole('status')).toBeVisible();
    await expect(page.getByText(/Priya Patel/i).first()).toBeVisible();
    await expect(page.getByText(/Active & Verifiable/i).first()).toBeVisible();
  });
});
