<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { MentionItem } from './types';

	let { results, activeIndex, visible, onSelect } = $props<{
		results: MentionItem[];
		activeIndex: number;
		visible: boolean;
		onSelect: (item: MentionItem) => void;
	}>();
</script>

{#if visible && results.length > 0}
	<div
		class="mention-dropdown"
		role="listbox"
		aria-label="Note mention suggestions"
		in:fly={{ y: 6, duration: 150 }}
		out:fly={{ y: 6, duration: 100 }}
	>
		<!-- Header -->
		<div class="mention-header">
			<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
				/>
			</svg>
			<span>Notes</span>
		</div>

		{#each results as item, i (item.id)}
			<button
				class="mention-item {i === activeIndex ? 'mention-item-active' : ''}"
				role="option"
				aria-selected={i === activeIndex}
				onmousedown={(e) => {
					e.preventDefault();
					onSelect(item);
				}}
			>
				<span class="mention-item-icon">📝</span>
				<span class="mention-item-title">{item.title}</span>
				{#if i === activeIndex}
					<span class="mention-item-hint">↵</span>
				{/if}
			</button>
		{/each}

		<div class="mention-footer">
			<kbd>↑↓</kbd> navigate · <kbd>↵</kbd> select · <kbd>Esc</kbd> dismiss
		</div>
	</div>
{/if}

<style>
	.mention-dropdown {
		position: absolute;
		bottom: calc(100% + 8px);
		left: 0;
		right: 0;
		z-index: 50;
		border-radius: 14px;
		overflow: hidden;
		border: 1px solid rgba(249, 115, 22, 0.25);
		background: rgba(15, 15, 15, 0.97);
		backdrop-filter: blur(20px);
		box-shadow:
			0 -8px 32px rgba(0, 0, 0, 0.4),
			0 0 0 1px rgba(255, 255, 255, 0.04) inset;
	}

	:global(:root:not(.dark)) .mention-dropdown {
		background: rgba(252, 252, 252, 0.98);
		border-color: rgba(249, 115, 22, 0.3);
		box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.15);
	}

	.mention-header {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px 6px;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: rgba(249, 115, 22, 0.8);
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
	}

	:global(:root:not(.dark)) .mention-header {
		color: #ea580c;
		border-bottom-color: rgba(0, 0, 0, 0.06);
	}

	.mention-item {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 9px 14px;
		text-align: left;
		font-size: 13px;
		color: rgba(255, 255, 255, 0.7);
		background: transparent;
		border: none;
		cursor: pointer;
		transition: background 0.1s ease;
	}

	:global(:root:not(.dark)) .mention-item {
		color: #374151;
	}

	.mention-item:hover,
	.mention-item-active {
		background: rgba(249, 115, 22, 0.1);
		color: rgba(255, 255, 255, 0.95);
	}

	:global(:root:not(.dark)) .mention-item:hover,
	:global(:root:not(.dark)) .mention-item-active {
		background: rgba(249, 115, 22, 0.08);
		color: #111827;
	}

	.mention-item-icon {
		font-size: 14px;
		flex-shrink: 0;
	}

	.mention-item-title {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 500;
	}

	.mention-item-hint {
		font-size: 11px;
		color: rgba(249, 115, 22, 0.7);
		flex-shrink: 0;
	}

	.mention-footer {
		padding: 6px 14px 8px;
		font-size: 10px;
		color: rgba(255, 255, 255, 0.25);
		border-top: 1px solid rgba(255, 255, 255, 0.05);
	}

	:global(:root:not(.dark)) .mention-footer {
		color: rgba(0, 0, 0, 0.3);
		border-top-color: rgba(0, 0, 0, 0.06);
	}

	kbd {
		display: inline-block;
		padding: 1px 5px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 4px;
		font-size: 9px;
		font-family: monospace;
	}

	:global(:root:not(.dark)) kbd {
		border-color: rgba(0, 0, 0, 0.2);
	}
</style>
