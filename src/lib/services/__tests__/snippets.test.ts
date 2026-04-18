import { describe, it, expect, vi } from 'vitest';
import { snippetService } from '../snippets';

vi.mock('../supabase', () => {
	const insertMock = vi.fn().mockReturnThis();
	const selectMock = vi.fn().mockReturnThis();
	const eqMock = vi.fn().mockReturnThis();
	const singleMock = vi.fn().mockResolvedValue({
		data: {
			id: 'forked-id',
			parent_id: 'original-id',
			title: 'Original (fork)'
		}
	});

	return {
		supabase: {
			from: vi.fn(() => ({
				select: selectMock,
				insert: insertMock,
				eq: eqMock,
				single: singleMock
			}))
		}
	};
});

describe('snippetService', () => {
	it('fork() creates a copy with correct parent_id', async () => {
		const res = await snippetService.fork('original-id', 'author-id', 'workspace-id');
		expect(res.data?.parent_id).toBe('original-id');
		expect(res.data?.title).toContain('fork');
	});
});
