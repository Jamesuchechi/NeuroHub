<script lang="ts">
	import { apiTestService, generateCurl, interpolateEnvVars } from '$lib/services/apiTester';
	import type { HttpMethod, ApiResponse } from '$lib/types/devtools';
	import {
		activeApiTestId,
		activeEnvironmentId,
		openCreateSnippet
	} from '$lib/stores/devToolsStore';
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

	let requestTab = $state<'headers' | 'body' | 'env'>('headers');
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

		$activeApiTestId = test.id;
	}

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

			// Auto-save response if it belongs to a saved test
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

<div class="flex h-full overflow-hidden">
	<!-- Right Panels: Builder & Viewer -->
	<div class="flex min-w-0 flex-1 flex-col">
		<div class="border-border bg-card flex h-14 items-center justify-between border-b px-4">
			<div class="flex items-center gap-3">
				<button
					class="text-muted-foreground hover:text-foreground md:hidden"
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
				<span class="font-semibold">{name || 'Untitled Request'}</span>
			</div>
			<div class="flex items-center gap-2">
				<button
					class="border-border bg-card hover:bg-muted rounded border px-3 py-1.5 text-sm font-medium transition"
					onclick={handleCopyCurl}>Copy cURL</button
				>
				<button
					class="border-border bg-card hover:bg-muted rounded border px-3 py-1.5 text-sm font-medium transition"
					onclick={handleSaveRequest}>Save</button
				>
			</div>
		</div>

		<!-- URL Bar -->
		<div class="bg-muted/20 border-border flex gap-2 border-b p-4">
			<select
				bind:value={method}
				class="bg-card border-border focus:ring-primary w-28 rounded border px-3 py-2 font-mono text-sm font-bold outline-none focus:ring-1"
			>
				{#each ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as m (m)}
					<option value={m}>{m}</option>
				{/each}
			</select>

			<div class="relative flex-1">
				<input
					bind:value={url}
					class="bg-background border-border focus:ring-primary w-full rounded border px-4 py-2 font-mono text-sm outline-none focus:ring-1"
					placeholder={'https://api.example.com/v1/users/{{USER_ID}}'}
				/>
			</div>

			<button
				class="flex w-24 items-center justify-center rounded bg-blue-600 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
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

		<!-- Panels (Split Top/Bottom) -->
		<div class="flex flex-1 flex-col overflow-hidden" style="display: flex;">
			<!-- Request Config -->
			<div class="border-border bg-card flex min-h-0 flex-[0.8] flex-col border-b">
				<div class="border-border flex overflow-x-auto border-b">
					<button
						class="border-b-2 px-4 py-2 text-sm font-medium {requestTab === 'headers'
							? 'border-primary text-foreground'
							: 'text-muted-foreground hover:text-foreground border-transparent'}"
						onclick={() => (requestTab = 'headers')}
						>Headers ({headers.filter((h) => h.key).length})</button
					>
					<button
						class="border-b-2 px-4 py-2 text-sm font-medium {requestTab === 'body'
							? 'border-primary text-foreground'
							: 'text-muted-foreground hover:text-foreground border-transparent'}"
						onclick={() => (requestTab = 'body')}>Body</button
					>
					<button
						class="border-b-2 px-4 py-2 text-sm font-medium {requestTab === 'env'
							? 'border-primary text-foreground'
							: 'text-muted-foreground hover:text-foreground border-transparent'}"
						onclick={() => (requestTab = 'env')}>Variables ({Object.keys(envVars).length})</button
					>
				</div>

				<div class="flex-1 overflow-y-auto p-4">
					{#if requestTab === 'headers'}
						<div class="flex flex-col gap-2">
							{#each headers as header, i (i)}
								<div class="flex items-center gap-2">
									<input
										type="text"
										placeholder="Key (e.g. Authorization)"
										bind:value={header.key}
										class="bg-background border-border focus:ring-primary flex-1 rounded border px-3 py-1.5 font-mono text-sm outline-none focus:ring-1"
									/>
									<input
										type="text"
										placeholder={'Value (e.g. Bearer {{TOKEN}})'}
										bind:value={header.value}
										class="bg-background border-border focus:ring-primary flex-[1.5] rounded border px-3 py-1.5 font-mono text-sm outline-none focus:ring-1"
									/>
									<button
										class="text-muted-foreground rounded p-1.5 hover:text-red-500"
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
								class="text-primary mt-2 flex w-fit items-center gap-1 text-sm font-medium hover:underline"
								onclick={addHeaderRow}
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 4v16m8-8H4"
									></path></svg
								> Add Header
							</button>
						</div>
					{:else if requestTab === 'body'}
						<textarea
							bind:value={body}
							class="bg-background border-border focus:ring-primary h-full min-h-[150px] w-full rounded border p-3 font-mono text-sm outline-none focus:ring-1"
							placeholder="Enter JSON or plain text body here..."
						></textarea>
					{:else if requestTab === 'env'}
						<div class="mb-4 flex items-center gap-4">
							<span class="text-sm font-medium">Environment:</span>
							<select
								bind:value={$activeEnvironmentId}
								class="bg-card border-border rounded border px-3 py-1 text-sm outline-none"
							>
								<option value={null}>No Environment</option>
								{#each environments as e (e.id)}
									<option value={e.id}>{e.name}</option>
								{/each}
							</select>
							<button
								class="text-primary text-xs font-medium hover:underline"
								onclick={startCreateEnv}>+ New</button
							>
							{#if activeEnv}
								<button
									class="text-primary text-xs font-medium hover:underline"
									onclick={startEditEnv}>Edit</button
								>
							{/if}
						</div>

						{#if activeEnv}
							<div class="grid grid-cols-2 gap-2">
								{#each Object.entries(envVars) as [k, v] (k)}
									<div
										class="bg-muted border-border/50 truncate rounded border px-3 py-2 font-mono text-xs"
									>
										<span class="text-primary font-bold">{k}</span> =
										<span class="text-muted-foreground">{v}</span>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-muted-foreground text-sm italic">
								Select an environment to view variables.
							</p>
						{/if}
					{/if}
				</div>
			</div>

			<!-- Response Viewer -->
			<div class="bg-background flex min-h-0 flex-[1.2] flex-col">
				<div class="border-border bg-muted/20 flex items-center justify-between border-b px-4">
					<div class="flex h-full gap-1">
						<button
							class="border-b-2 px-4 py-2 text-sm font-medium {responseTab === 'body'
								? 'border-primary text-foreground'
								: 'text-muted-foreground hover:text-foreground border-transparent'}"
							onclick={() => (responseTab = 'body')}>Response Body</button
						>
						<button
							class="border-b-2 px-4 py-2 text-sm font-medium {responseTab === 'headers'
								? 'border-primary text-foreground'
								: 'text-muted-foreground hover:text-foreground border-transparent'}"
							onclick={() => (responseTab = 'headers')}>Headers</button
						>
						<button
							class="border-b-2 px-4 py-2 text-sm font-medium {responseTab === 'raw'
								? 'border-primary text-foreground'
								: 'text-muted-foreground hover:text-foreground border-transparent'}"
							onclick={() => (responseTab = 'raw')}>Raw</button
						>
					</div>

					{#if response}
						<div class="flex items-center gap-4">
							<div class="flex items-center gap-3 font-mono text-xs">
								<span
									class="rounded px-1.5 py-0.5 font-bold {response.status >= 200 &&
									response.status < 300
										? 'bg-green-500/10 text-green-500'
										: response.status === 0
											? 'bg-red-500/10 text-red-500'
											: response.status >= 400
												? 'bg-orange-500/10 text-orange-500'
												: 'bg-blue-500/10 text-blue-500'}"
								>
									{response.status}
									{response.statusText}
								</span>
								<span class="text-muted-foreground">{response.duration_ms} ms</span>
								<span class="text-muted-foreground">{formatBytes(response.size_bytes)}</span>
							</div>

							<button
								class="text-primary bg-primary/5 flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold hover:underline"
								onclick={() =>
									openCreateSnippet({
										code: response!.body,
										language: parsedJsonBody !== null ? 'json' : 'markdown',
										title: `Response: ${history.find((h) => h.id === $activeApiTestId)?.name || 'API Response'}`
									})}
							>
								<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"
									><path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8 7v8a2 2 0 002 2h6M8 7l4 4m-4-4l-4 4"
									/></svg
								>
								Save to Snippets
							</button>
						</div>
					{/if}
				</div>

				<div class="flex-1 overflow-y-auto p-4 font-mono text-sm">
					{#if !response}
						<div class="text-muted-foreground flex h-full items-center justify-center italic">
							Send a request to see the response...
						</div>
					{:else if responseTab === 'body'}
						{#if parsedJsonBody !== null}
							<div class="bg-card border-border overflow-x-auto rounded border p-4">
								<JsonViewer data={parsedJsonBody} />
							</div>
						{:else}
							<pre
								class="bg-card border-border text-foreground overflow-x-auto rounded border p-4 whitespace-pre-wrap">{response.body}</pre>
						{/if}
					{:else if responseTab === 'headers'}
						<div class="grid grid-cols-1 gap-1">
							{#each Object.entries(response.headers) as [hk, hv] (hk)}
								<div class="border-border/50 flex border-b px-2 py-1.5">
									<span class="text-primary w-1/3 font-semibold">{hk}</span>
									<span class="text-foreground/80 w-2/3 truncate">{hv}</span>
								</div>
							{/each}
						</div>
					{:else}
						<pre
							class="bg-card border-border text-foreground overflow-x-auto rounded border p-4">{response.body}</pre>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Left Panel: History Sidebar -->
	{#if showHistory}
		<div
			class="border-border bg-muted/10 hidden h-full w-64 max-w-[250px] shrink-0 flex-col border-l md:flex"
		>
			<div
				class="border-border flex items-center justify-between border-b p-3 text-sm font-semibold"
			>
				History
				<button class="text-primary text-xs hover:underline" onclick={resetBuilder}>+ New</button>
			</div>
			<div class="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
				{#each history as req (req.id)}
					<button
						class="hover:bg-muted flex items-center gap-2 rounded p-2 text-left text-xs transition {req.id ===
						$activeApiTestId
							? 'bg-muted ring-border shadow-sm ring-1'
							: ''}"
						onclick={() => loadTest(req)}
					>
						<span
							class="w-10 shrink-0 font-mono font-bold {['GET', 'HEAD'].includes(req.method)
								? 'text-blue-500'
								: ['POST', 'PUT', 'PATCH'].includes(req.method)
									? 'text-green-500'
									: 'text-red-500'}"
						>
							{req.method}
						</span>
						<span class="flex-1 truncate font-medium">{req.name}</span>
					</button>
				{/each}
				{#if history.length === 0}
					<p class="text-muted-foreground w-full p-2 text-center text-xs italic">
						No saved requests
					</p>
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- Environment Management Modal -->
{#if isEditingEnv}
	<div
		class="bg-background/80 fixed inset-0 z-60 flex items-center justify-center p-4 backdrop-blur-sm"
		onclick={() => (isEditingEnv = false)}
		onkeydown={(e) => e.key === 'Escape' && (isEditingEnv = false)}
		role="button"
		tabindex="-1"
		aria-label="Close modal"
	>
		<div
			class="bg-card border-border flex w-full max-w-lg flex-col overflow-hidden rounded-xl border shadow-2xl"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			tabindex="0"
		>
			<div class="border-border bg-muted/20 flex items-center justify-between border-b px-6 py-4">
				<input
					bind:value={editingEnvName}
					class="w-full border-0 bg-transparent p-0 text-lg font-semibold focus:ring-0"
					placeholder="Environment Name"
				/>
			</div>

			<div class="max-h-[60vh] overflow-y-auto p-6">
				<h4 class="text-muted-foreground mb-4 text-xs font-semibold tracking-wider uppercase">
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
								class="bg-background border-border focus:ring-primary flex-1 rounded border px-3 py-1.5 font-mono text-sm outline-none focus:ring-1"
							/>
							<input
								type="text"
								bind:value={envVars[k]}
								class="bg-background border-border focus:ring-primary flex-1 rounded border px-3 py-1.5 font-mono text-sm outline-none focus:ring-1"
							/>
							<button
								class="text-muted-foreground p-1.5 hover:text-red-500"
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
