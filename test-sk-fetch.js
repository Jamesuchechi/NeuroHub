import { fetch as undiciFetch } from 'undici';

async function test() {
	try {
		console.log('Using pure undici fetch...');
		const res = await undiciFetch('https://api.groq.com/openai/v1/chat/completions', {
			method: 'POST',
			headers: { 'Content-type': 'application/json' }
		});
		console.log('Undici Status:', res.status);
	} catch (e) {
		console.error('Undici Error:', e);
	}
}
test();
