// Intercept console methods to capture output
const logs: string[] = [];
const errors: string[] = [];

const _console = {
	log: (...args: unknown[]) => {
		logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
	},
	error: (...args: unknown[]) => {
		errors.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
	},
	warn: (...args: unknown[]) => {
		errors.push(
			'[warn] ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')
		);
	}
};

self.onmessage = async (e: MessageEvent<{ code: string }>) => {
	const { code } = e.data;
	const start = performance.now();

	// Memory tracking (Chrome only typically)
	const perf = performance as unknown as { memory?: { usedJSHeapSize: number } };
	const initialMemory = perf.memory?.usedJSHeapSize;

	try {
		// Transform code to be awaitable by wrapping in an async IIFE if it's not already
		// but a simpler way is to make the Function constructor use an async function body
		const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
		const fn = new AsyncFunction('console', code);

		await fn(_console);

		const finalMemory = perf.memory?.usedJSHeapSize;
		const memoryUsage = initialMemory && finalMemory ? finalMemory - initialMemory : null;

		self.postMessage({
			stdout: logs,
			stderr: errors,
			error: null,
			duration_ms: Math.round(performance.now() - start),
			memory_usage_bytes: memoryUsage
		});
	} catch (err) {
		self.postMessage({
			stdout: logs,
			stderr: errors,
			error: (err as Error).message,
			duration_ms: Math.round(performance.now() - start),
			memory_usage_bytes: null
		});
	}
};
