<script lang="ts">
	import { onMount } from 'svelte';

	let canvas: HTMLCanvasElement;

	onMount(() => {
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		let points: Array<{
			x: number;
			y: number;
			vx: number;
			vy: number;
			r: number;
			col: string;
		}> = [];

		const resize = () => {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
		};

		const init = () => {
			points = [];
			for (let i = 0; i < 60; i++) {
				points.push({
					x: Math.random() * window.innerWidth,
					y: Math.random() * window.innerHeight,
					vx: (Math.random() - 0.5) * 0.4,
					vy: (Math.random() - 0.5) * 0.4,
					r: Math.random() * 1.5 + 0.5,
					col: Math.random() > 0.5 ? '#f97316' : '#3b82f6'
				});
			}
		};

		const handleResize = () => {
			if (!canvas) return;
			resize();
			init();
		};

		resize();
		init();

		let animationFrame: number;
		const draw = () => {
			if (!canvas || !ctx) return;
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			points.forEach((p) => {
				ctx.globalAlpha = 0.5;
				ctx.fillStyle = p.col;
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
				ctx.fill();
				p.x += p.vx;
				p.y += p.vy;
				if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
				if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
			});
			animationFrame = requestAnimationFrame(draw);
		};

		draw();

		window.addEventListener('resize', handleResize);

		return () => {
			cancelAnimationFrame(animationFrame);
			window.removeEventListener('resize', handleResize);
		};
	});
</script>

<canvas bind:this={canvas} class="pointer-events-none fixed inset-0 z-0 opacity-20"></canvas>
