import type { Database } from './src/lib/types/db';

type x = Database['public']['Tables']['snippets'];
declare function printType<_T>(): void;
printType<x>();
