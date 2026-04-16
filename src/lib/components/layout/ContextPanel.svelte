<script lang="ts">
	import { workspaceStore } from '$lib/stores/workspaceStore';
	import { uiStore } from '$lib/stores/uiStore';

	const { currentWorkspace } = $derived($workspaceStore);
	const { contextPanelCollapsed } = $derived($uiStore);

	function toggle() {
		uiStore.setContextPanelCollapsed(!contextPanelCollapsed);
	}
</script>

<aside
	class="flex h-full flex-col border-l border-stroke bg-surface-dim transition-all duration-300"
>
	<!-- Header -->
	<div class="flex h-16 items-center justify-between border-b border-stroke/50 px-6">
		<h2 class="text-xs font-bold tracking-[2px] text-content-dim uppercase">Context</h2>
		<button
			onclick={toggle}
			class="rounded-lg p-1 text-content-dim transition-all hover:bg-surface hover:text-content"
			aria-label="Close context panel"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M6 18L18 6M6 6l12 12"
				/>
			</svg>
		</button>
	</div>

	<!-- Content -->
	<div class="flex-1 space-y-8 overflow-y-auto p-6">
		<section>
			<h3 class="mb-4 text-sm font-bold text-content">
				Welcome to {currentWorkspace?.name || 'NeuroHub'}
			</h3>
			<p class="text-xs leading-relaxed text-content-dim">
				This panel provides contextual information about your current workspace, including active
				participants, recent documents, and AI-driven insights.
			</p>
		</section>

		<section class="space-y-4">
			<p class="text-[10px] font-bold tracking-wider text-content-dim uppercase">
				Active participants
			</p>
			<div class="flex -space-x-2">
				<!-- Mock presence for now -->
				<div
					class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface-dim bg-orange-500 text-[10px] font-bold text-black"
				>
					JD
				</div>
				<div
					class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface-dim bg-stroke text-[10px] font-bold text-content-dim"
				>
					+3
				</div>
			</div>
		</section>

		<section class="rounded-xl border border-orange-500/10 bg-orange-500/5 p-4">
			<h4 class="mb-2 text-xs font-bold text-orange-500">AI Context Builder</h4>
			<p class="text-[11px] leading-snug text-content-dim">
				The AI is currently monitoring the channel discussions to build a semantic index of your
				project.
			</p>
		</section>
	</div>
</aside>
