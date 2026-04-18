<script lang="ts">
	import { onMount, type Snippet, untrack } from 'svelte';

	interface Props {
		type?: 'horizontal' | 'vertical';
		initialSize?: number;
		minSize?: number;
		maxSize?: number;
		fixedSide?: 'left' | 'right';
		onResize?: (size: number) => void;
		left: Snippet;
		right: Snippet;
	}

	let {
		type = 'horizontal',
		initialSize = 300,
		minSize = 100,
		maxSize = 600,
		fixedSide = 'left',
		onResize,
		left,
		right
	}: Props = $props();

	let container: HTMLDivElement;
	let isResizing = $state(false);
	let currentSize = $state(untrack(() => initialSize));

	// Synchronize with prop changes from parent (e.g. workspace view resets)
	$effect(() => {
		currentSize = initialSize;
	});

	function startResizing(e: MouseEvent) {
		isResizing = true;
		e.preventDefault();
	}

	function stopResizing() {
		isResizing = false;
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isResizing || !container) return;

		const rect = container.getBoundingClientRect();
		let newSize: number;

		if (type === 'horizontal') {
			newSize = fixedSide === 'left' ? e.clientX - rect.left : rect.right - e.clientX;
		} else {
			newSize = fixedSide === 'left' ? e.clientY - rect.top : rect.bottom - e.clientY;
		}

		if (newSize >= minSize && newSize <= maxSize) {
			currentSize = newSize;
			onResize?.(newSize);
		}
	}

	onMount(() => {
		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', stopResizing);
		return () => {
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mouseup', stopResizing);
		};
	});
	function handleKeydown(e: KeyboardEvent) {
		const step = 20;
		if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
			const newSize = Math.max(minSize, currentSize - step);
			currentSize = newSize;
			onResize?.(newSize);
		} else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
			const newSize = Math.min(maxSize, currentSize + step);
			currentSize = newSize;
			onResize?.(newSize);
		}
	}
</script>

<div
	bind:this={container}
	class="split-pane-container flex h-full w-full overflow-hidden {type === 'horizontal'
		? 'flex-row'
		: 'flex-col'}"
>
	<div
		style={fixedSide === 'left'
			? type === 'horizontal'
				? `width: ${currentSize}px`
				: `height: ${currentSize}px`
			: 'flex: 1'}
		class="split-pane-panel relative h-full min-h-0 min-w-0 overflow-hidden"
	>
		{@render left()}
	</div>

	<!-- Divider -->
	<div
		onmousedown={startResizing}
		onkeydown={handleKeydown}
		role="slider"
		aria-orientation={type}
		aria-label="Panel separator"
		aria-valuenow={currentSize}
		aria-valuemin={minSize}
		aria-valuemax={maxSize}
		tabindex="0"
		class="split-pane-divider relative z-10 flex items-center justify-center transition-colors select-none
			{type === 'horizontal'
			? 'w-1 cursor-col-resize hover:bg-orange-500/50 active:bg-orange-500'
			: 'h-1 cursor-row-resize hover:bg-orange-500/50 active:bg-orange-500'}
			{isResizing ? 'bg-orange-500' : 'bg-zinc-800'}"
	>
		<!-- Optional handle visual -->
		<div class="{type === 'horizontal' ? 'h-8 w-px' : 'h-px w-8'} bg-zinc-600"></div>
	</div>

	<div
		style={fixedSide === 'right'
			? type === 'horizontal'
				? `width: ${currentSize}px`
				: `height: ${currentSize}px`
			: 'flex: 1'}
		class="split-pane-panel h-full min-h-0 min-w-0 overflow-hidden"
	>
		{@render right()}
	</div>
</div>
