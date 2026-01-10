import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { tickets } from '@/lib/db/schema';
import { sql, eq } from 'drizzle-orm';
import { handleApiError } from '@/lib/utils/error-handler';

// Simple in-memory cache for analytics
const analyticsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 1000; // 30 seconds

// Force dynamic rendering (uses getServerSession which requires headers)
export const dynamic = 'force-dynamic';

// Extract building number from room number
function extractBuilding(roomNumber: string | null): string | null {
  if (!roomNumber) return null;
  
  const targetBuildings = ['5', '8', '9', '17', '20', '21'];
  
  // First check for two-digit buildings (17, 20, 21) - must check these first
  const twoDigitMatch = roomNumber.match(/^(17|20|21)/);
  if (twoDigitMatch) {
    return twoDigitMatch[1];
  }
  
  // Then check for single-digit buildings (5, 8, 9)
  const singleDigitMatch = roomNumber.match(/^([589])/);
  if (singleDigitMatch) {
    return singleDigitMatch[1];
  }
  
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check cache
    const cacheKey = 'analytics:all';
    const cached = analyticsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        analytics: cached.data,
        cached: true,
      });
    }

    // Get all tickets (IT technician sees all tickets) - optimized query
    const allTickets = await db.query.tickets.findMany({
      columns: {
        id: true,
        ticketId: true,
        requesterName: true,
        pNumber: true,
        roomNumber: true,
        urgency: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: (tickets, { desc }) => [desc(tickets.createdAt)],
    });

    // Building analytics
    const buildingCounts: Record<string, number> = {
      '5': 0,
      '8': 0,
      '9': 0,
      '17': 0,
      '20': 0,
      '21': 0,
      'Other': 0,
    };

    // Top submitters
    const submitterCounts: Record<string, number> = {};

    // Urgency breakdown
    const urgencyCounts: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    // Status breakdown
    const statusCounts: Record<string, number> = {
      submitted: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
    };

    // Process tickets
    allTickets.forEach((ticket) => {
      // Building counts - extract from room number
      const building = extractBuilding(ticket.roomNumber);
      if (building && buildingCounts.hasOwnProperty(building)) {
        buildingCounts[building]++;
      } else {
        buildingCounts['Other']++;
      }

      // Top submitters
      const submitter = ticket.requesterName || ticket.pNumber || 'Unknown';
      submitterCounts[submitter] = (submitterCounts[submitter] || 0) + 1;

      // Urgency counts
      const urgency = ticket.urgency?.toLowerCase() || 'medium';
      if (urgencyCounts.hasOwnProperty(urgency)) {
        urgencyCounts[urgency]++;
      } else {
        urgencyCounts['medium']++;
      }

      // Status counts
      const status = ticket.status?.toLowerCase() || 'submitted';
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++;
      } else {
        statusCounts['submitted']++;
      }
    });

    // Get top 10 submitters
    const topSubmitters = Object.entries(submitterCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate average resolution time (for resolved tickets)
    const resolvedTickets = allTickets.filter(
      (t) => t.status === 'resolved' || t.status === 'closed'
    );
    
    let avgResolutionHours = 0;
    if (resolvedTickets.length > 0) {
      const totalHours = resolvedTickets.reduce((sum, ticket) => {
        const created = new Date(ticket.createdAt).getTime();
        const updated = new Date(ticket.updatedAt).getTime();
        const hours = (updated - created) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);
      avgResolutionHours = Math.round(totalHours / resolvedTickets.length);
    }

    const analyticsData = {
      buildingCounts,
      topSubmitters,
      urgencyCounts,
      statusCounts,
      totalTickets: allTickets.length,
      avgResolutionHours,
      resolvedCount: resolvedTickets.length,
    };

    // Cache the result
    analyticsCache.set(cacheKey, {
      data: analyticsData,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      success: true,
      analytics: analyticsData,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=59',
      },
    });
  } catch (error: any) {
    const handled = handleApiError(error);
    return NextResponse.json(
      { 
        success: false,
        error: handled.message,
        code: handled.code,
      },
      { status: handled.statusCode }
    );
  }
}
