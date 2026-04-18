import { supabase } from './supabase';
import type { HttpMethod, ApiResponse } from '$lib/types/devtools';
import type { Database, Json } from '$lib/types/db';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';

export function generateCurl(
	method: HttpMethod,
	url: string,
	headers: Record<string, string>,
	body?: string
): string {
	const headerFlags = Object.entries(headers)
		.map(([k, v]) => `-H '${k}: ${v}'`)
		.join(' \\\n  ');
	const bodyFlag = body ? `-d '${body.replace(/'/g, "'\\''")}' \\\n  ` : '';
	return `curl -X ${method} \\\n  ${headerFlags ? headerFlags + ' \\\n  ' : ''}${bodyFlag}'${url}'`;
}

export function interpolateEnvVars(text: string, variables: Record<string, string>): string {
	if (!text) return text;
	return text.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
}

export const apiTestService = {
	async list(workspaceId: string) {
		return supabase
			.from('api_tests')
			.select('*, author:profiles(id, username, avatar_url)')
			.eq('workspace_id', workspaceId)
			.order('updated_at', { ascending: false });
	},

	async save(
		data: Database['public']['Tables']['api_tests']['Insert']
	): Promise<PostgrestSingleResponse<Database['public']['Tables']['api_tests']['Row']>> {
		if (data.id) {
			return supabase
				.from('api_tests')
				.update({ ...data, updated_at: new Date().toISOString() })
				.eq('id', data.id)
				.select()
				.single();
		}
		return supabase.from('api_tests').insert(data).select().single();
	},

	async saveResponse(id: string, response: ApiResponse) {
		return supabase
			.from('api_tests')
			.update({
				last_response: response as unknown as Json,
				last_run_at: new Date().toISOString()
			})
			.eq('id', id);
	},

	async delete(id: string) {
		return supabase.from('api_tests').delete().eq('id', id);
	},

	async listEnvironments(workspaceId: string) {
		return supabase.from('api_environments').select('*').eq('workspace_id', workspaceId);
	},

	async saveEnvironment(
		data: Database['public']['Tables']['api_environments']['Insert']
	): Promise<PostgrestSingleResponse<Database['public']['Tables']['api_environments']['Row']>> {
		if (data.id) {
			return supabase.from('api_environments').update(data).eq('id', data.id).select().single();
		}
		return supabase.from('api_environments').insert(data).select().single();
	}
};
