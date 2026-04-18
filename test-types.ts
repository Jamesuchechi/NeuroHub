import type { Database } from './src/lib/types/db';

type RowType = Database['public']['Tables']['snippets']['Row'];
type RowAssert = RowType extends never ? 'is never' : 'is ok';
console.log('Types loaded.');
