/**
 * Load .env.local before any db imports.
 * Import this first in scripts: import './load-env';
 */
import { config } from 'dotenv';
import { join } from 'path';
config({ path: join(process.cwd(), '.env.local') });
