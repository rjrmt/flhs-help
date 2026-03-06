import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;
import { db } from '@/lib/db';
import { staffRoster, studentRoster } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * Public endpoint to verify if a staff P# or student 06# is in the Supabase roster.
 * Used by the submit-ticket form for real-time feedback.
 * No authentication required.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('pNumber')?.trim().replace(/\s/g, '');

    if (!id || id.length < 2) {
      return NextResponse.json(
        { success: true, found: false, message: 'Enter your ID to verify' },
        { status: 200 }
      );
    }

    const isStaff = /^p\d+/i.test(id);

    if (isStaff) {
      const normalized = id.toUpperCase();
      const [staff] = await db
        .select({ fullName: staffRoster.fullName, email: staffRoster.email })
        .from(staffRoster)
        .where(eq(staffRoster.pNumber, normalized))
        .limit(1);

      if (staff) {
        return NextResponse.json({
          success: true,
          found: true,
          name: staff.fullName || null,
          email: staff.email || null,
          message: 'Verified',
        });
      }
    } else {
      const [student] = await db
        .select({ fullName: studentRoster.fullName, email: studentRoster.email })
        .from(studentRoster)
        .where(eq(studentRoster.studentId, id))
        .limit(1);

      if (student) {
        return NextResponse.json({
          success: true,
          found: true,
          name: student.fullName || null,
          email: student.email || null,
          message: 'Verified',
        });
      }
    }

    return NextResponse.json({
      success: true,
      found: false,
      message: 'Not in directory — you can still submit',
    });
  } catch (error) {
    console.error('Error verifying P number:', error);
    return NextResponse.json(
      { success: false, error: 'Verification unavailable' },
      { status: 500 }
    );
  }
}
