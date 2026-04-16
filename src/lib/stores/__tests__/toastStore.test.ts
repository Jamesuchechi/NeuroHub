import { describe, it, expect, beforeEach, vi } from 'vitest';
import { toast } from '../toastStore';
import { get } from 'svelte/store';

describe('toastStore', () => {
	beforeEach(() => {
		// Clear toasts
		const current = get(toast);
		current.forEach((t) => toast.dismiss(t.id));
	});

	it('should add a toast correctly', () => {
		toast.show('Test Message', 'success');
		const current = get(toast);

		expect(current).toHaveLength(1);
		expect(current[0].message).toBe('Test Message');
		expect(current[0].type).toBe('success');
	});

	it('should dismiss a toast correctly', () => {
		toast.show('To Dismiss', 'info');
		const id = get(toast)[0].id;

		toast.dismiss(id);
		expect(get(toast)).toHaveLength(0);
	});

	it('should auto-dismiss after duration', () => {
		vi.useFakeTimers();

		toast.show('Timed Toast', 'success', 1000);
		expect(get(toast)).toHaveLength(1);

		vi.advanceTimersByTime(1001);
		expect(get(toast)).toHaveLength(0);

		vi.useRealTimers();
	});
});
