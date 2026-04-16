<script lang="ts">
	import { toast } from '$lib/stores/toastStore';
	import Toast from './Toast.svelte';

	const list = $derived($toast);
</script>

<div class="fixed top-8 right-8 z-200 flex w-full max-w-sm flex-col gap-4">
	{#each list as t (t.id)}
		<Toast {...t} />
	{/each}
</div>
