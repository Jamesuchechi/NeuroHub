import { test, expect } from '@playwright/test';

test.describe('Dev Tools Engine', () => {
	// Assuming a logged-in state or mocking it is handled in a global setup

	test('Creates a snippet and it appears in the grid', async ({ page }) => {
		// Navigate to a specific workspace tools page
		await page.goto('/workspace/test-workspace/tools');

		// Verify it defaults to Snippets tab
		await expect(page.locator('text=New Snippet')).toBeVisible();

		// Open create modal
		await page.click('text=New Snippet');
		await expect(page.locator('input[placeholder="Snippet title..."]')).toBeVisible();

		// Fill form
		await page.fill('input[placeholder="Snippet title..."]', 'E2E Test Snippet');

		// In CodeMirror, clicking the editor and typing is a bit complex, we can use script injection or just type
		await page.click('.cm-content');
		await page.keyboard.type('console.log("Hello E2E");');

		// Save
		await page.click('text=Save Snippet');

		// Verify it appears in grid
		await expect(page.locator('text=E2E Test Snippet').first()).toBeVisible();
	});

	test('API Tester: Send a GET request', async ({ page }) => {
		await page.goto('/workspace/test-workspace/tools');

		// Switch to API tab
		await page.click('text=API Tester');

		// Set URL
		await page.fill('input[placeholder*="https://api"]', 'https://httpbin.org/get');

		// Send
		await page.click('button:has-text("Send")');

		// Wait for response viewer
		// We expect a 200 OK
		await expect(page.locator('text=200 OK')).toBeVisible({ timeout: 10000 });
	});

	test('Sandbox: Executes JS code correctly', async ({ page }) => {
		await page.goto('/workspace/test-workspace/tools');

		// Switch to Sandbox tab
		await page.click('text=Sandbox');

		// Verify it loads placeholder
		await expect(page.locator('text=Run Code')).toBeVisible();

		// Run
		await page.click('text=Run Code');

		// Output should contain "Doubled: [2,4,6,8,10]" due to default snippet
		await expect(page.locator('text=Doubled:')).toBeVisible({ timeout: 5000 });
	});
});
