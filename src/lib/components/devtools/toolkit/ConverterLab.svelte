<script lang="ts">
	import { fade } from 'svelte/transition';
	import { toast } from '$lib/stores/toastStore';

	let activeTool = $state<'curl' | 'units' | 'jwt' | 'sql'>('curl');

	// cURL to Fetch State
	let curlInput = $state('');
	let fetchOutput = $state('');

	// Units State
	let pxValue = $state(16);
	let baseSize = $state(16);
	let remValue = $derived((pxValue / baseSize).toFixed(3));

	// JWT State
	let jwtInput = $state('');
	let jwtPayload = $state<unknown>(null);

	// SQL State
	let sqlInput = $state('');
	let sqlOutput = $state('');

	function convertCurl() {
		if (!curlInput) return;
		try {
			// Simplistic regex-based cURL parser for the MVP
			// In a real prod environment, we'd use a robust parser library
			const urlMatch = curlInput.match(/curl\s+['"]?([^'"]\S+)['"]?/);
			const methodMatch = curlInput.match(/-X\s+(\w+)/);
			const headerMatches = [...curlInput.matchAll(/-H\s+['"]([^'"]+)['"]/g)];

			const url = urlMatch ? urlMatch[1] : 'https://api.example.com';
			const method = methodMatch ? methodMatch[1] : 'GET';
			const headers = headerMatches.reduce(
				(acc, match) => {
					const [key, value] = match[1].split(': ');
					acc[key] = value;
					return acc;
				},
				{} as Record<string, string>
			);

			fetchOutput = `fetch("${url}", {
  method: "${method}",
  headers: ${JSON.stringify(headers, null, 4)}
})
.then(response => response.json())
.then(data => console.log(data));`;
		} catch (_err) {
			toast.show('Failed to parse cURL', 'error');
		}
	}

	function decodeJwt() {
		if (!jwtInput) {
			jwtPayload = null;
			return;
		}
		try {
			const base64Url = jwtInput.split('.')[1];
			const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
			const jsonPayload = decodeURIComponent(
				atob(base64)
					.split('')
					.map((c) => {
						return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
					})
					.join('')
			);
			jwtPayload = JSON.parse(jsonPayload);
		} catch (_err) {
			jwtPayload = { error: 'Invalid JWT Format' };
		}
	}
</script>

<div class="flex flex-col gap-8 md:flex-row">
	<!-- Sub-nav -->
	<div class="w-full shrink-0 space-y-1 md:w-48">
		{#each [{ id: 'curl', label: 'cURL to Fetch' }, { id: 'units', label: 'CSS Units' }, { id: 'jwt', label: 'JWT Inspector' }, { id: 'sql', label: 'SQL Formatter' }] as tool (tool.id)}
			<button
				class="w-full rounded-lg px-4 py-2 text-left text-xs font-bold transition-all
					{activeTool === tool.id
					? 'border border-brand-orange/20 bg-brand-orange/10 text-brand-orange'
					: 'text-content-dim hover:bg-surface-dim/50 hover:text-content'}"
				onclick={() => (activeTool = tool.id as typeof activeTool)}
			>
				{tool.label}
			</button>
		{/each}
	</div>

	<!-- Active Tool Content -->
	<div class="flex-1 rounded-xl border border-stroke bg-surface p-8 shadow-sm">
		{#if activeTool === 'curl'}
			<div in:fade class="space-y-6">
				<h3
					class="border-b border-stroke pb-4 text-sm font-bold tracking-widest text-content-dim uppercase"
				>
					cURL to Fetch Converter
				</h3>
				<div class="space-y-2">
					<label for="curl-input" class="text-[10px] font-bold text-content-dim uppercase"
						>Paste cURL Command</label
					>
					<textarea
						id="curl-input"
						bind:value={curlInput}
						oninput={convertCurl}
						class="h-32 w-full rounded-lg border border-stroke bg-surface-dim/30 p-4 font-mono text-xs transition-all outline-none focus:border-brand-orange/50"
						placeholder="curl https://api.example.com -H 'Authorization: Bearer ...'"
					></textarea>
				</div>
				<div class="space-y-2">
					<div class="text-[10px] font-bold text-content-dim uppercase">Fetch Equivalent</div>
					<div class="group relative">
						<pre
							class="h-48 w-full overflow-auto rounded-lg border border-stroke/50 bg-zinc-950 p-4 font-mono text-[11px] text-brand-green">{fetchOutput ||
								'// Output will appear here...'}</pre>
						<button
							class="absolute top-2 right-2 rounded bg-white/10 px-2 py-1 text-[9px] font-bold text-white opacity-0 transition-all group-hover:opacity-100 hover:bg-white/20"
							onclick={() => {
								navigator.clipboard.writeText(fetchOutput);
								toast.show('Copied!', 'success');
							}}
						>
							COPY
						</button>
					</div>
				</div>
			</div>
		{:else if activeTool === 'units'}
			<div in:fade class="space-y-8">
				<h3
					class="border-b border-stroke pb-4 text-sm font-bold tracking-widest text-content-dim uppercase"
				>
					CSS Units (PX to REM)
				</h3>
				<div class="grid grid-cols-2 gap-8">
					<div
						class="space-y-4 rounded-2xl border border-stroke/50 bg-surface-dim/30 p-8 text-center"
					>
						<label for="px-input" class="block text-xs font-bold text-content-dim uppercase"
							>Pixels (PX)</label
						>
						<input
							id="px-input"
							type="number"
							bind:value={pxValue}
							class="w-full bg-transparent text-center text-5xl font-black text-brand-orange outline-none"
						/>
					</div>
					<div
						class="space-y-4 rounded-2xl border border-brand-orange/20 bg-brand-orange/5 p-8 text-center"
					>
						<div class="block text-xs font-bold text-brand-orange uppercase">Result (REM)</div>
						<div class="text-5xl font-black text-content">{remValue}</div>
					</div>
				</div>
				<div class="flex items-center justify-center gap-4 border-t border-stroke/30 pt-4">
					<label for="base-font-size" class="text-[10px] font-bold text-content-dim uppercase"
						>Base Font Size:</label
					>
					<input
						id="base-font-size"
						type="number"
						bind:value={baseSize}
						class="w-16 rounded border border-stroke bg-surface-dim p-2 text-center text-xs font-bold"
					/>
					<span class="text-[10px] text-content-dim">px</span>
				</div>
			</div>
		{:else if activeTool === 'jwt'}
			<div in:fade class="space-y-6">
				<h3
					class="border-b border-stroke pb-4 text-sm font-bold tracking-widest text-content-dim uppercase"
				>
					JWT Payload Inspector
				</h3>
				<label for="jwt-input" class="sr-only">JWT Token</label>
				<textarea
					id="jwt-input"
					bind:value={jwtInput}
					oninput={decodeJwt}
					class="h-24 w-full rounded-lg border border-stroke bg-surface-dim/30 p-4 font-mono text-xs text-blue-400 transition-all outline-none focus:border-brand-orange/50"
					placeholder="Paste your JWT here..."
				></textarea>
				<div class="space-y-2">
					<div class="text-[10px] font-bold text-content-dim uppercase">Decoded Payload</div>
					<pre
						class="h-64 w-full overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-6 font-mono text-xs text-brand-green shadow-2xl">
						{jwtPayload ? JSON.stringify(jwtPayload, null, 2) : '// Inspect details safely...'}
					</pre>
				</div>
			</div>
		{:else if activeTool === 'sql'}
			<div in:fade class="space-y-6">
				<h3
					class="border-b border-stroke pb-4 text-sm font-bold tracking-widest text-content-dim uppercase"
				>
					SQL Prettifier
				</h3>
				<div class="space-y-2">
					<label for="sql-input" class="text-[10px] font-bold text-content-dim uppercase"
						>Paste Raw SQL</label
					>
					<textarea
						id="sql-input"
						bind:value={sqlInput}
						class="h-32 w-full rounded-lg border border-stroke bg-surface-dim/30 p-4 font-mono text-xs transition-all outline-none focus:border-brand-orange/50"
						placeholder="SELECT * FROM users WHERE active = true GROUP BY id;"
					></textarea>
				</div>
				<div class="flex justify-end">
					<button
						class="rounded-lg bg-brand-orange px-6 py-2 text-xs font-bold text-white shadow-lg shadow-brand-orange/20 transition-all hover:bg-orange-600"
						onclick={() => {
							// Basic keyword capitalization for "Elite" feel
							sqlOutput = sqlInput.replace(
								/\b(select|from|where|group by|order by|insert into|values|update|set|delete|join|on|limit)\b/gi,
								(m) => m.toUpperCase()
							);
							toast.show('SQL Prettified', 'success');
						}}
					>
						Format SQL
					</button>
				</div>
				<div class="space-y-2">
					<div class="text-[10px] font-bold text-content-dim uppercase">Formatted Result</div>
					<pre
						class="h-48 w-full overflow-auto rounded-lg border border-stroke/50 bg-zinc-950 p-4 font-mono text-[11px] text-blue-400">{sqlOutput ||
							'-- Formatted SQL will appear here...'}</pre>
				</div>
			</div>
		{/if}
	</div>
</div>
