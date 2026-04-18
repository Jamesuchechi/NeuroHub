export type Language =
	| 'javascript'
	| 'typescript'
	| 'python'
	| 'rust'
	| 'go'
	| 'java'
	| 'cpp'
	| 'c'
	| 'csharp'
	| 'php'
	| 'ruby'
	| 'swift'
	| 'kotlin'
	| 'shell'
	| 'sql'
	| 'html'
	| 'css'
	| 'json'
	| 'yaml'
	| 'markdown'
	| 'dockerfile'
	| 'graphql'
	| 'svelte'
	| 'vue'
	| 'jsx'
	| 'tsx'
	| 'zig'
	| 'elixir'
	| 'clojure'
	| 'haskell'
	| 'perl'
	| 'powershell'
	| 'dart'
	| 'scala'
	| 'objectivec'
	| 'r'
	| 'cmake'
	| 'solidity'
	| 'protobuf';

export const LANGUAGES: { value: Language; label: string }[] = [
	{ value: 'javascript', label: 'JavaScript' },
	{ value: 'typescript', label: 'TypeScript' },
	{ value: 'python', label: 'Python' },
	{ value: 'rust', label: 'Rust' },
	{ value: 'go', label: 'Go' },
	{ value: 'java', label: 'Java' },
	{ value: 'cpp', label: 'C++' },
	{ value: 'c', label: 'C' },
	{ value: 'csharp', label: 'C#' },
	{ value: 'php', label: 'PHP' },
	{ value: 'ruby', label: 'Ruby' },
	{ value: 'swift', label: 'Swift' },
	{ value: 'kotlin', label: 'Kotlin' },
	{ value: 'shell', label: 'Shell / Bash' },
	{ value: 'sql', label: 'SQL' },
	{ value: 'html', label: 'HTML' },
	{ value: 'css', label: 'CSS' },
	{ value: 'json', label: 'JSON' },
	{ value: 'yaml', label: 'YAML' },
	{ value: 'markdown', label: 'Markdown' },
	{ value: 'dockerfile', label: 'Dockerfile' },
	{ value: 'graphql', label: 'GraphQL' },
	{ value: 'svelte', label: 'Svelte' },
	{ value: 'vue', label: 'Vue' },
	{ value: 'jsx', label: 'JSX' },
	{ value: 'tsx', label: 'TSX' },
	{ value: 'zig', label: 'Zig' },
	{ value: 'elixir', label: 'Elixir' },
	{ value: 'clojure', label: 'Clojure' },
	{ value: 'haskell', label: 'Haskell' },
	{ value: 'perl', label: 'Perl' },
	{ value: 'powershell', label: 'PowerShell' },
	{ value: 'dart', label: 'Dart' },
	{ value: 'scala', label: 'Scala' },
	{ value: 'objectivec', label: 'Objective-C' },
	{ value: 'r', label: 'R' },
	{ value: 'cmake', label: 'CMake' },
	{ value: 'solidity', label: 'Solidity' },
	{ value: 'protobuf', label: 'Protocol Buffers' }
];

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface ApiResponse {
	status: number;
	statusText: string;
	headers: Record<string, string>;
	body: string;
	duration_ms: number;
	size_bytes: number;
}

export interface SandboxResult {
	stdout: string[];
	stderr: string[];
	error: string | null;
	duration_ms: number;
	memory_usage_bytes: number | null;
}

export type SnippetView = 'grid' | 'list';
export type SnippetSort = 'recent' | 'stars' | 'forks';
