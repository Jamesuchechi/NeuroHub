/// <reference lib="webworker" />

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

interface PyodideInterface {
	runPythonAsync: (code: string) => Promise<unknown>;
}

let pyodide: PyodideInterface | null = null;

async function runPython(code: string) {
	if (!pyodide) {
		// @ts-expect-error - Dynamic import of Pyodide ESM
		const { loadPyodide } =
			await import('https://cdn.jsdelivr.net/pyodide/v0.26.0/full/pyodide.mjs');
		pyodide = await loadPyodide({
			stdout: (text: string) => logs.push(text),
			stderr: (text: string) => errors.push(text)
		});
	}

	if (!pyodide) throw new Error('Pyodide failed to initialize');
	return await pyodide.runPythonAsync(code);
}

self.onmessage = async (e: MessageEvent<{ code: string; language?: string }>) => {
	const { code, language = 'javascript' } = e.data;
	const start = performance.now();

	// Reset logs for this run
	logs.length = 0;
	errors.length = 0;

	// Memory tracking (Chrome only typically)
	const perf = performance as unknown as { memory?: { usedJSHeapSize: number } };
	const initialMemory = perf.memory?.usedJSHeapSize;

	try {
		if (language === 'python') {
			await runPython(code);
		} else {
			// JavaScript execution
			const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
			const fn = new AsyncFunction('console', code);
			await fn(_console);
		}

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
