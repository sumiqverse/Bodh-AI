import { test, expect } from '@playwright/test';

test.describe('Signup Page Role Selection', () => {
  test('renders both student and teacher signup options with tabs', async ({ page }) => {
    await page.goto('/en/signup', { waitUntil: 'networkidle' });

    // Verify tabs exist for both Student and Teacher
    const studentTab = page.getByRole('tab', { name: /student/i });
    const teacherTab = page.getByRole('tab', { name: /teacher/i });

    await expect(studentTab).toBeVisible();
    await expect(teacherTab).toBeVisible();

    // By default, student tab is active
    await expect(page.getByRole('heading', { name: /create student account/i })).toBeVisible();
    await expect(page.locator('#student-signup-name')).toBeVisible();
    await expect(page.locator('#student-signup-code')).toBeVisible();
    await expect(page.locator('#student-signup-username')).toBeVisible();
    await expect(page.locator('#student-signup-pin')).toBeVisible();
    await expect(page.getByRole('button', { name: /create student account/i })).toBeVisible();

    // Switch to Teacher tab
    await teacherTab.click();

    // Verify teacher fields appear
    await expect(page.getByRole('heading', { name: /create teacher account/i })).toBeVisible();
    await expect(page.locator('#teacher-name')).toBeVisible();
    await expect(page.locator('#teacher-signup-email')).toBeVisible();
    await expect(page.locator('#teacher-school')).toBeVisible();
    await expect(page.locator('#teacher-signup-password')).toBeVisible();
    await expect(page.getByRole('button', { name: /create educator account/i })).toBeVisible();

    // Switch back to Student tab
    await studentTab.click();
    await expect(page.getByRole('heading', { name: /create student account/i })).toBeVisible();
    await expect(page.locator('#student-signup-username')).toBeVisible();
  });

  test('preselects teacher tab when ?role=teacher query param is present', async ({ page }) => {
    await page.goto('/en/signup?role=teacher', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /create teacher account/i })).toBeVisible();
    await expect(page.locator('#teacher-signup-email')).toBeVisible();
  });
});
