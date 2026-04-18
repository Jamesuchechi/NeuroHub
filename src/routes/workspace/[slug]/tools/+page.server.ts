import type { ServerLoad } from '@sveltejs/kit';
import { snippetService } from '$lib/services/snippets';
import { apiTestService } from '$lib/services/apiTester';
import { error } from '@sveltejs/kit';

export const load: ServerLoad = async ({ parent }) => {
	const { workspace } = await parent();
	if (!workspace) throw error(404, 'Workspace not found');

	const [snippets, apiTests, environments] = await Promise.all([
		snippetService.list(workspace.id, { limit: 20 }),
		apiTestService.list(workspace.id),
		apiTestService.listEnvironments(workspace.id)
	]);

	return {
		snippets: snippets.data ?? [],
		apiTests: apiTests.data ?? [],
		environments: environments.data ?? []
	};
};
