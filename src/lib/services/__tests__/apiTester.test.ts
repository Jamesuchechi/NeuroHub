import { describe, it, expect } from 'vitest';
import { generateCurl } from '../apiTester';

describe('generateCurl', () => {
	it('generates valid curl for GET', () => {
		const curl = generateCurl('GET', 'https://api.example.com', { Accept: 'application/json' });
		expect(curl).toBe(
			"curl -X GET \\\n  -H 'Accept: application/json' \\\n  'https://api.example.com'"
		);
	});

	it('generates valid curl for POST with body', () => {
		const curl = generateCurl(
			'POST',
			'https://api.example.com/users',
			{ 'Content-Type': 'application/json' },
			'{"name": "test"}'
		);
		expect(curl).toBe(
			"curl -X POST \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"name\": \"test\"}' \\\n  'https://api.example.com/users'"
		);
	});
});
