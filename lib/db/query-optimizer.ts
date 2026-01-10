import { db } from './index';
import { tickets, detentions } from './schema';
import { eq, sql, and, desc, asc } from 'drizzle-orm';

/**
 * Optimized query helpers with caching and batching
 */

// Cache for frequently accessed data
const queryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 1000; // 30 seconds

function getCached<T>(key: string): T | null {
  const cached = queryCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  return null;
}

function setCached(key: string, data: any): void {
  queryCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Get tickets with optimized query and caching
 */
export async function getTicketsOptimized(options: {
  pNumber?: string;
  status?: string;
  limit?: number;
  offset?: number;
  isAdmin?: boolean;
}) {
  const { pNumber, status, limit = 100, offset = 0, isAdmin = false } = options;
  
  const cacheKey = `tickets:${pNumber || 'all'}:${status || 'all'}:${limit}:${offset}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const conditions = [];
  if (!isAdmin && pNumber) {
    conditions.push(eq(tickets.pNumber, pNumber));
  }
  if (status) {
    conditions.push(eq(tickets.status, status));
  }

  const result = await db.query.tickets.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(tickets.createdAt)],
    limit,
    offset,
  });

  setCached(cacheKey, result);
  return result;
}

/**
 * Get ticket stats with single optimized query
 */
export async function getTicketStatsOptimized(pNumber?: string, isAdmin = false) {
  const cacheKey = `stats:${pNumber || 'all'}:${isAdmin}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const conditions = [];
  if (!isAdmin && pNumber) {
    conditions.push(eq(tickets.pNumber, pNumber));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const stats = await db
    .select({
      total: sql<number>`count(*)`,
      submitted: sql<number>`count(*) filter (where ${tickets.status} = 'submitted')`,
      inProgress: sql<number>`count(*) filter (where ${tickets.status} = 'in_progress')`,
      resolved: sql<number>`count(*) filter (where ${tickets.status} = 'resolved')`,
      closed: sql<number>`count(*) filter (where ${tickets.status} = 'closed')`,
    })
    .from(tickets)
    .where(whereClause);

  const result = stats[0] || { total: 0, submitted: 0, inProgress: 0, resolved: 0, closed: 0 };
  setCached(cacheKey, result);
  return result;
}

/**
 * Batch get multiple tickets by IDs
 */
export async function getTicketsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  
  // Check cache for each ID
  const uncachedIds: string[] = [];
  const cachedResults: any[] = [];
  
  for (const id of ids) {
    const cached = getCached(`ticket:${id}`);
    if (cached) {
      cachedResults.push(cached);
    } else {
      uncachedIds.push(id);
    }
  }

  if (uncachedIds.length === 0) return cachedResults;

  // Fetch uncached tickets
  const results = await db.query.tickets.findMany({
    where: sql`${tickets.id} = ANY(${uncachedIds})`,
  });

  // Cache results
  results.forEach(ticket => {
    setCached(`ticket:${ticket.id}`, ticket);
  });

  return [...cachedResults, ...results];
}

/**
 * Clear cache for a specific pattern
 */
export function clearCache(pattern?: string) {
  if (!pattern) {
    queryCache.clear();
    return;
  }

  for (const key of queryCache.keys()) {
    if (key.includes(pattern)) {
      queryCache.delete(key);
    }
  }
}
