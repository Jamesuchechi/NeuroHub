/**
 * Detects if a string is likely a Base64 encoded string.
 */
export function isBase64(str: string): boolean {
	if (!str || str.length < 4) return false;
	try {
		return btoa(atob(str)) === str;
	} catch (_err) {
		return false;
	}
}

/**
 * Detects if a string is likely a JWT.
 */
export function isJWT(str: string): boolean {
	if (!str || typeof str !== 'string') return false;
	const parts = str.split('.');
	return parts.length === 3 && isBase64(parts[0]) && isBase64(parts[1]);
}

/**
 * Detects if a number is likely a Unix Timestamp (seconds or milliseconds).
 */
export function isUnixTimestamp(val: number): boolean {
	if (typeof val !== 'number') return false;
	// Between year 2000 and 2100 in seconds or ms
	return (val > 946684800 && val < 4102444800) || (val > 946684800000 && val < 4102444800000);
}

/**
 * Generates a TypeScript interface from a JSON object.
 */
export function generateTypeScript(obj: unknown, interfaceName = 'GeneratedInterface'): string {
	const lines: string[] = [`export interface ${interfaceName} {`];

	if (typeof obj !== 'object' || obj === null) {
		return `export type ${interfaceName} = ${typeof obj};`;
	}

	for (const [key, value] of Object.entries(obj)) {
		let typeStr: string;

		if (Array.isArray(value)) {
			if (value.length > 0) {
				const firstValueType = typeof value[0];
				if (firstValueType === 'object' && value[0] !== null) {
					// Recursively handle objects in arrays (simplified)
					typeStr = 'unknown[]'; // For deep nesting we could generate sub-interfaces
				} else {
					typeStr = `${firstValueType}[]`;
				}
			} else {
				typeStr = 'unknown[]';
			}
		} else if (value === null) {
			typeStr = 'null';
		} else if (typeof value === 'object') {
			typeStr = 'Record<string, unknown>';
		} else {
			typeStr = typeof value;
		}

		lines.push(`  ${key}: ${typeStr};`);
	}

	lines.push('}');
	return lines.join('\n');
}

/**
 * A basic JSONPath-like evaluator for dot/bracket notation.
 * Supports simple paths like "metadata.region_distribution[0].region"
 */
export function evaluatePath(obj: unknown, path: string): unknown {
	if (!path || path === '$') return obj;

	const parts = path.replace(/^\$\.?/, '').split('.');
	let current: unknown = obj;

	for (const part of parts) {
		const arrayMatch = part.match(/(.+)\[(\d+)\]/);
		if (arrayMatch) {
			const key = arrayMatch[1];
			const index = parseInt(arrayMatch[2], 10);

			if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
				const val = (current as Record<string, unknown>)[key];
				if (Array.isArray(val)) {
					current = val[index];
				} else {
					return undefined;
				}
			} else {
				return undefined;
			}
		} else {
			if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
				current = (current as Record<string, unknown>)[part];
			} else {
				return undefined;
			}
		}
	}

	return current;
}
