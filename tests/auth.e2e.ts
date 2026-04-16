import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
	test('should show login page and allow navigation to register', async ({ page }) => {
		await page.goto('/login');

		await expect(page.locator('h2')).toContainText('Welcome back.');

		// Navigate to register
		await page.click('text=Create an account');
		await expect(page).toHaveURL(/\/register/);
	});

	test('should show error on invalid login', async ({ page }) => {
		await page.goto('/login');

		await page.fill('input[type="email"]', 'wrong@example.com');
		await page.fill('input[type="password"]', 'wrongpassword');
		await page.click('button[type="submit"]');

		// Wait for error message
		const error = page.locator('p.text-red-500');
		await expect(error).toBeVisible();
	});
});
