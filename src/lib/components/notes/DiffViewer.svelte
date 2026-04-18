<script lang="ts">
	import { diffLines } from 'diff';

	let { oldText, newText } = $props<{ oldText: string; newText: string }>();

	const diff = $derived(diffLines(oldText, newText));
</script>

<div
	class="flex flex-col gap-0 overflow-hidden rounded-xl border border-stroke bg-black/20 font-mono text-[10px] leading-relaxed"
>
	{#each diff as part, i (i)}
		<div
			class="flex gap-3 px-3 py-1 {part.added
				? 'bg-green-500/10 text-green-400'
				: part.removed
					? 'bg-red-500/10 text-red-400'
					: 'text-content-dim/30'}"
		>
			<span class="w-3 shrink-0 font-bold opacity-50 select-none">
				{part.added ? '+' : part.removed ? '-' : ' '}
			</span>
			<pre class="break-all whitespace-pre-wrap">{part.value.replace(/\n$/, '')}</pre>
		</div>
	{/each}
</div>
