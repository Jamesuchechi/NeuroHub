import { describe, it, expect } from 'vitest';
import { interpolateEnvVars } from '../../services/apiTester';

describe('interpolateEnvVars', () => {
	it('interpolates known variables', () => {
		const res = interpolateEnvVars('{{BASE_URL}}/users', { BASE_URL: 'https://api.example.com' });
		expect(res).toBe('https://api.example.com/users');
	});

	it('leaves unknown variables intact', () => {
		const res = interpolateEnvVars('{{BASE_URL}}/{{UNKNOWN}}', {
			BASE_URL: 'https://api.example.com'
		});
		expect(res).toBe('https://api.example.com/{{UNKNOWN}}');
	});

	it('handles multiple occurrences', () => {
		const res = interpolateEnvVars('{{A}} / {{A}}', { A: '123' });
		expect(res).toBe('123 / 123');
	});
});
