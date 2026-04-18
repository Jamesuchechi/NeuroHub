import type { Database } from './src/lib/types/db';

const tbls: keyof Database['public']['Tables'] = 'snippets';
console.log(tbls);
