<script lang="ts">
	import { onMount } from 'svelte';
	import { apiTestService, generateCurl, interpolateEnvVars } from '$lib/services/apiTester';
	import { apiHistoryStore } from '$lib/stores/apiHistoryStore';
	import type { HttpMethod, ApiResponse } from '$lib/types/devtools';
	import { activeApiTestId, activeEnvironmentId } from '$lib/stores/devToolsStore';
	import { authStore } from '$lib/stores/authStore';
	import { toast } from '$lib/stores/toastStore';
	import { formatBytes } from '$lib/utils/formatBytes';
	import { supabase } from '$lib/services/supabase';
	import JsonViewer from '../ui/JsonViewer.svelte';
	import type { ApiTestsTable, ApiEnvironmentsTable, Json } from '$lib/types/db';

	let {
		workspaceId,
		initialHistory = [],
		initialEnvironments = []
	} = $props<{
		workspaceId: string;
		initialHistory?: ApiTestsTable['Row'][];
		initialEnvironments?: ApiEnvironmentsTable['Row'][];
	}>();

	let user = $derived($authStore.user);

	let history = $state<ApiTestsTable['Row'][]>([]);
	let environments = $state<ApiEnvironmentsTable['Row'][]>([]);

	$effect(() => {
		history = [...initialHistory];
	});

	$effect(() => {
		environments = [...initialEnvironments];
	});

	// Request Builder State
	let method = $state<HttpMethod>('GET');
	let url = $state('');
	// Headers stored as array of {k, v} for easy editing
	let headers = $state<{ key: string; value: string }[]>([{ key: '', value: '' }]);
	let body = $state('');
	let name = $state('');

	let requestTab = $state<'headers' | 'body' | 'variables'>('headers');
	let responseTab = $state<'body' | 'headers' | 'raw'>('body');

	// Response Viewer State
	let response = $state<ApiResponse | null>(null);
	let isSending = $state(false);
	let parsedJsonBody = $state<unknown>(null);

	// History split
	let showHistory = $state(true);

	// Environment Edit State
	let isEditingEnv = $state(false);
	let editingEnvName = $state('');
	let editingEnvId = $state<string | null>(null);
	let envVars = $state<Record<string, string>>({});

	let activeEnv = $derived(environments.find((e) => e.id === $activeEnvironmentId));

	$effect(() => {
		if (activeEnv) {
			envVars =
				typeof activeEnv.variables === 'object'
					? { ...(activeEnv.variables as Record<string, string>) }
					: {};
		} else {
			envVars = {};
		}
	});

	function startCreateEnv() {
		editingEnvId = null;
		editingEnvName = 'New Environment';
		envVars = {};
		isEditingEnv = true;
	}

	function startEditEnv() {
		if (!activeEnv) return;
		editingEnvId = activeEnv.id;
		editingEnvName = activeEnv.name;
		envVars =
			typeof activeEnv.variables === 'object'
				? { ...(activeEnv.variables as Record<string, string>) }
				: {};
		isEditingEnv = true;
	}

	async function handleSaveEnv() {
		if (!user) return;
		try {
			const res = await apiTestService.saveEnvironment({
				id: editingEnvId || undefined,
				workspace_id: workspaceId,
				name: editingEnvName,
				variables: envVars as unknown as Json
			});
			if (res.data) {
				toast.show('Environment saved', 'success');
				const idx = environments.findIndex((e) => e.id === res.data.id);
				if (idx >= 0) environments[idx] = res.data;
				else environments = [res.data, ...environments];
				$activeEnvironmentId = res.data.id;
				isEditingEnv = false;
			}
		} catch {
			toast.show('Failed to save environment', 'error');
		}
	}

	async function handleDeleteEnv() {
		if (!editingEnvId) return;
		if (!confirm('Are you sure you want to delete this environment?')) return;
		try {
			await supabase.from('api_environments').delete().eq('id', editingEnvId);
			environments = environments.filter((e) => e.id !== editingEnvId);
			if ($activeEnvironmentId === editingEnvId) $activeEnvironmentId = null;
			isEditingEnv = false;
			toast.show('Environment deleted', 'success');
		} catch {
			toast.show('Failed to delete environment', 'error');
		}
	}

	// Load a saved test into the builder
	function loadTest(test: ApiTestsTable['Row']) {
		method = test.method as HttpMethod;
		url = test.url;
		name = test.name;
		body = test.body || '';

		// Convert JSON headers to array
		const h = test.headers || {};
		headers = Object.entries(h).map(([key, value]) => ({ key, value: String(value) }));
		if (headers.length === 0) headers = [{ key: '', value: '' }];

		response = (test.last_response as unknown as ApiResponse) || null;
		processResponseBody();
	}

	// Reactive loading when activeApiTestId changes
	$effect(() => {
		if ($activeApiTestId) {
			const test = history.find((h) => h.id === $activeApiTestId);
			if (test) {
				loadTest(test);
			}
		} else {
			resetBuilder();
		}
	});

	onMount(() => {
		const handler = (e: Event) => {
			const detail = (e as CustomEvent).detail;
			if (detail) {
				method = detail.method;
				url = detail.url;
				name = detail.name;
				// Reset headers/body for history loads to keep it clean
				headers = [{ key: '', value: '' }];
				body = '';
				response = null;
			} else {
				resetBuilder();
			}
		};
		window.addEventListener('load-api-request', handler);
		return () => window.removeEventListener('load-api-request', handler);
	});

	// If a new request is made, switch context
	function resetBuilder() {
		$activeApiTestId = null;
		name = '';
		method = 'GET';
		url = '';
		headers = [{ key: '', value: '' }];
		body = '';
		response = null;
		parsedJsonBody = null;
	}

	async function sendRequest() {
		if (!url) {
			toast.show('URL is required', 'error');
			return;
		}

		isSending = true;
		response = null;
		parsedJsonBody = null;

		// Filter headers and interpolate
		const resolvedUrl = interpolateEnvVars(url, envVars);
		const validHeaders = headers.filter((h) => h.key.trim() !== '');

		const resolveHeadersObj: Record<string, string> = {};
		for (const h of validHeaders) {
			resolveHeadersObj[h.key.trim()] = interpolateEnvVars(h.value, envVars);
		}

		const resolvedBody = interpolateEnvVars(body, envVars);

		try {
			// Use the local SvelteKit API proxy route to bypass CORS
			const res = await fetch('/api/proxy', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					method,
					url: resolvedUrl,
					headers: resolveHeadersObj,
					body: ['GET', 'HEAD'].includes(method) ? undefined : resolvedBody || undefined
				})
			});

			const data = await res.json();

			if (!res.ok || data.error) {
				throw new Error(data.error || `Proxy returned ${res.status}`);
			}

			response = data as ApiResponse;
			processResponseBody();

			// Auto-record to local history
			apiHistoryStore.add({
				method,
				url,
				workspaceId,
				status: response.status,
				statusText: response.statusText
			});

			// Auto-save response if it belongs to a saved cloud test
			if ($activeApiTestId) {
				apiTestService.saveResponse($activeApiTestId, response!).catch(() => {});
				history = history.map((h) =>
					h.id === $activeApiTestId
						? { ...h, last_response: response as Json, last_run_at: new Date().toISOString() }
						: h
				);
			}
		} catch (err: unknown) {
			const errorMessage = err instanceof Error ? err.message : String(err);
			response = {
				status: 0,
				statusText: 'Request Failed',
				headers: {},
				body: `Local API proxy request failed.\nError: ${errorMessage}`,
				duration_ms: 0,
				size_bytes: 0
			};

			// Still record failed requests to history
			apiHistoryStore.add({
				method,
				url,
				workspaceId,
				status: 0,
				statusText: 'Failed'
			});

			toast.show('Proxy request failed', 'error');
		}

		isSending = false;
	}

	function processResponseBody() {
		if (!response || !response.body) {
			parsedJsonBody = null;
			return;
		}
		try {
			parsedJsonBody = JSON.parse(response.body);
		} catch {
			parsedJsonBody = null;
		}
	}

	async function handleSaveRequest() {
		if (!user) return;
		if (!name) {
			name = prompt('Enter a name for this request:') || '';
			if (!name) return;
		}

		const headerObj: Record<string, string> = {};
		headers
			.filter((h) => h.key.trim())
			.forEach((h) => {
				headerObj[h.key.trim()] = h.value;
			});

		try {
			const res = await apiTestService.save({
				id: $activeApiTestId || undefined,
				workspace_id: workspaceId,
				author_id: user.id,
				name,
				method,
				url,
				headers: headerObj,
				body: ['GET', 'HEAD'].includes(method) ? undefined : body
			});

			if (res.data) {
				toast.show('Request saved', 'success');
				$activeApiTestId = res.data.id;

				// Update history
				const existingIdx = history.findIndex((h) => h.id === res.data.id);
				if (existingIdx >= 0) {
					history[existingIdx] = res.data;
				} else {
					history = [res.data, ...history];
				}
			}
		} catch {
			toast.show('Failed to save request', 'error');
		}
	}

	function handleCopyCurl() {
		const headerObj: Record<string, string> = {};
		headers
			.filter((h) => h.key.trim())
			.forEach((h) => {
				headerObj[h.key.trim()] = h.value;
			});
		const curl = generateCurl(
			method,
			interpolateEnvVars(url, envVars),
			Object.keys(headerObj).length ? headerObj : {},
			['GET', 'HEAD'].includes(method) ? undefined : interpolateEnvVars(body, envVars)
		);
		navigator.clipboard.writeText(curl);
		toast.show('cURL copied to clipboard', 'success');
	}

	// Header row management
	function addHeaderRow() {
		headers = [...headers, { key: '', value: '' }];
	}
	function removeHeaderRow(index: number) {
		headers = headers.filter((_, i) => i !== index);
		if (headers.length === 0) addHeaderRow();
	}
</script>

<div class="flex h-full flex-col overflow-hidden bg-surface">
	<div class="scrollbar-thin flex-1 overflow-y-auto p-6">
		<div class="mx-auto max-w-4xl space-y-6">
			<!-- URL Bar -->
			<div class="rounded-lg border border-stroke bg-surface-dim/30 p-4 shadow-sm">
				<div class="flex items-center gap-3">
					<button
						class="text-content-dim hover:text-content md:hidden"
						onclick={() => (showHistory = !showHistory)}
						aria-label="Toggle history sidebar"
					>
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 6h16M4 12h16M4 18h16"
							></path></svg
						>
					</button>
					<span class="font-bold text-content">{name || 'Untitled Request'}</span>
				</div>
				<div class="flex items-center gap-2">
					<button
						class="rounded border border-stroke bg-surface px-3 py-1.5 text-xs font-bold text-content transition hover:bg-surface-dim"
						onclick={handleCopyCurl}>Copy cURL</button
					>
					<button
						class="rounded border border-stroke bg-surface px-3 py-1.5 text-xs font-bold text-content transition hover:bg-surface-dim"
						onclick={handleSaveRequest}>Save</button
					>
				</div>
			</div>

			<div class="flex gap-2">
				<div class="relative shrink-0">
					<select
						bind:value={method}
						class="h-10 min-w-[100px] appearance-none rounded-md border border-stroke bg-surface px-3 text-xs font-bold text-content outline-none focus:border-brand-orange/50"
					>
						{#each ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as m (m)}
							<option value={m}>{m}</option>
						{/each}
					</select>
				</div>

				<input
					type="text"
					bind:value={url}
					placeholder="https://api.example.com/v1/resource"
					class="h-10 flex-1 rounded-md border border-stroke bg-surface px-4 text-sm text-content outline-none placeholder:text-content-dim/30 focus:border-brand-orange/50"
				/>

				<button
					class="h-10 rounded-md bg-brand-orange px-6 text-sm font-bold text-white shadow-lg shadow-brand-orange/10 transition-all hover:bg-orange-600 disabled:opacity-50"
					onclick={sendRequest}
					disabled={isSending || !url}
				>
					{#if isSending}
						<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"
							><circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle><path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path></svg
						>
					{:else}
						Send
					{/if}
				</button>
			</div>

			<!-- Tabs -->
			<div class="flex border-b border-stroke">
				{#each ['headers', 'body', 'variables'] as const as tab (tab)}
					<button
						class="px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors {requestTab ===
						tab
							? 'border-b-2 border-brand-orange text-brand-orange'
							: 'text-content-dim hover:text-content'}"
						onclick={() => (requestTab = tab)}
					>
						{tab}
					</button>
				{/each}
			</div>

			<!-- Tab Content -->
			<div class="min-h-[200px] rounded-xl border border-stroke bg-surface-dim/10 p-4 shadow-sm">
				{#if requestTab === 'headers'}
					<div class="space-y-2">
						{#each headers as header, i (i)}
							<div class="flex items-center gap-2">
								<input
									type="text"
									placeholder="Key"
									bind:value={header.key}
									class="flex-1 rounded border border-stroke bg-surface px-3 py-1.5 text-xs text-content outline-none"
								/>
								<input
									type="text"
									placeholder="Value"
									bind:value={header.value}
									class="flex-1 rounded border border-stroke bg-surface px-3 py-1.5 text-xs text-content outline-none"
								/>
								<button
									class="p-1.5 text-content-dim hover:text-red-500"
									onclick={() => removeHeaderRow(i)}
									aria-label="Remove header row"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
										><path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M6 18L18 6M6 6l12 12"
										></path></svg
									>
								</button>
							</div>
						{/each}
						<button
							class="text-xs font-bold text-brand-orange hover:text-orange-600"
							onclick={addHeaderRow}
						>
							+ Add Header
						</button>
					</div>
				{:else if requestTab === 'body'}
					<textarea
						bind:value={body}
						class="h-[200px] w-full rounded-lg border border-stroke bg-surface p-3 font-mono text-xs text-content outline-none"
						placeholder="Enter JSON or plain text body here..."
					></textarea>
				{:else if requestTab === 'variables'}
					<div class="mb-4 flex items-center gap-4">
						<span class="text-xs font-bold text-content">Environment:</span>
						<select
							bind:value={$activeEnvironmentId}
							class="rounded border border-stroke bg-surface px-3 py-1 text-xs text-content outline-none"
						>
							<option value={null}>No Environment</option>
							{#each environments as e (e.id)}
								<option value={e.id}>{e.name}</option>
							{/each}
						</select>
						<button
							class="text-xs font-bold text-brand-orange hover:underline"
							onclick={startCreateEnv}>+ New</button
						>
						{#if activeEnv}
							<button
								class="text-xs font-bold text-brand-orange hover:underline"
								onclick={startEditEnv}>Edit</button
							>
						{/if}
					</div>

					{#if activeEnv}
						<div class="grid grid-cols-2 gap-2">
							{#each Object.entries(envVars) as [k, v] (k)}
								<div
									class="truncate rounded border border-stroke bg-surface-dim px-3 py-2 font-mono text-xs"
								>
									<span class="font-bold text-brand-orange">{k}</span> =
									<span class="text-content-dim">{v}</span>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-xs text-content-dim italic">Select an environment to view variables.</p>
					{/if}
				{/if}
			</div>

			<!-- Response Section -->
			{#if response}
				<div class="space-y-4 pt-6">
					<div class="flex items-center justify-between border-b border-stroke pb-2">
						<h3 class="text-sm font-bold tracking-widest text-content uppercase">Response</h3>
						<div class="flex items-center gap-4 font-mono text-xs">
							<span
								class={response.status >= 200 && response.status < 300
									? 'text-brand-green'
									: 'text-red-400'}
							>
								{response.status}
								{response.statusText}
							</span>
							<span class="text-content-dim">{response.duration_ms}ms</span>
							<span class="text-content-dim">{formatBytes(response.size_bytes)}</span>
						</div>
					</div>

					<div class="overflow-hidden rounded-xl border border-stroke bg-surface shadow-sm">
						<div class="flex border-b border-stroke bg-surface-dim/30">
							<button
								class="px-4 py-2 text-[10px] font-bold tracking-widest uppercase {responseTab ===
								'body'
									? 'bg-surface text-brand-orange'
									: 'text-content-dim'}"
								onclick={() => (responseTab = 'body')}>Body</button
							>
							<button
								class="px-4 py-2 text-[10px] font-bold tracking-widest uppercase {responseTab ===
								'headers'
									? 'bg-surface text-brand-orange'
									: 'text-content-dim'}"
								onclick={() => (responseTab = 'headers')}>Headers</button
							>
						</div>

						<div class="p-4">
							{#if responseTab === 'body'}
								{#if parsedJsonBody !== null}
									<JsonViewer data={parsedJsonBody} />
								{:else}
									<pre
										class="font-mono text-xs whitespace-pre-wrap text-content-dim">{response.body}</pre>
								{/if}
							{:else}
								<div class="space-y-1">
									{#each Object.entries(response.headers) as [hk, hv] (hk)}
										<div
											class="flex items-start gap-4 border-b border-stroke/50 py-1 text-xs last:border-0"
										>
											<span class="w-32 shrink-0 font-bold text-content-dim">{hk}</span>
											<span class="font-mono break-all text-content">{hv}</span>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Environment Management Modal -->
{#if isEditingEnv}
	<div
		class="fixed inset-0 z-60 flex items-center justify-center bg-surface/80 p-4 backdrop-blur-sm"
		onclick={() => (isEditingEnv = false)}
		onkeydown={(e) => e.key === 'Escape' && (isEditingEnv = false)}
		role="button"
		tabindex="-1"
		aria-label="Close modal"
	>
		<div
			class="flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-stroke bg-surface shadow-2xl"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			tabindex="0"
		>
			<div class="border-b border-stroke bg-surface-dim/20 px-6 py-4">
				<input
					bind:value={editingEnvName}
					class="w-full border-0 bg-transparent p-0 text-lg font-semibold text-content focus:ring-0"
					placeholder="Environment Name"
				/>
			</div>

			<div class="max-h-[60vh] overflow-y-auto p-6">
				<h4 class="mb-4 text-xs font-semibold tracking-wider text-content-dim uppercase">
					Variables
				</h4>
				<div class="flex flex-col gap-3">
					{#each Object.entries(envVars) as [k, v] (k)}
						<div class="flex gap-2">
							<input
								type="text"
								value={k}
								onchange={(e) => {
									const newK = (e.target as HTMLInputElement).value;
									if (newK && newK !== k) {
										const next = { ...envVars };
										delete next[k];
										next[newK] = v;
										envVars = next;
									}
								}}
								class="flex-1 rounded border border-stroke bg-surface px-3 py-1.5 font-mono text-sm text-content outline-none"
							/>
							<input
								type="text"
								bind:value={envVars[k]}
								class="flex-1 rounded border border-stroke bg-surface px-3 py-1.5 font-mono text-sm text-content outline-none"
							/>
							<button
								class="p-1.5 text-content-dim hover:text-red-500"
								onclick={() => {
									const next = { ...envVars };
									delete next[k];
									envVars = next;
								}}
								aria-label="Remove variable"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 18L18 6M6 6l12 12"
									></path></svg
								>
							</button>
						</div>
					{/each}

					<button
						class="text-primary flex w-fit items-center gap-1 text-sm hover:underline"
						onclick={() => {
							const key = `VAR_${Object.keys(envVars).length + 1}`;
							envVars = { ...envVars, [key]: '' };
						}}
					>
						+ Add Variable
					</button>
				</div>
			</div>

			<div class="border-border bg-muted/10 flex items-center justify-between border-t p-4">
				<button
					class="text-sm font-medium text-red-500 hover:text-red-600"
					onclick={handleDeleteEnv}>Delete</button
				>
				<div class="flex gap-2">
					<button
						class="border-border bg-muted hover:bg-muted/80 rounded-lg border px-4 py-2 text-sm font-medium"
						onclick={() => (isEditingEnv = false)}>Cancel</button
					>
					<button
						class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium"
						onclick={handleSaveEnv}>Save Changes</button
					>
				</div>
			</div>
		</div>
	</div>
{/if}
