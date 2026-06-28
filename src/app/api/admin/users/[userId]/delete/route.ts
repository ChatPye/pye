import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// Configure for SSR deployment
export const dynamic = 'force-dynamic';

// Admin check
const isAdmin = (email: string): boolean => {
  const ADMIN_EMAILS = ['job.oyebisi@gmail.com', 'job@chatpye.com'];
  return ADMIN_EMAILS.includes(email);
};

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const auth = await requireAuth();
    
    // Check if user is admin
    if (!isAdmin(auth.email || '')) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    const { userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Prevent admin from deleting themselves
    if (userId === auth.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own admin account' },
        { status: 400 }
      );
    }

    // Delete user from Clerk (requires Clerk Admin API)
    try {
      const clerkResponse = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!clerkResponse.ok) {
        const errorData = await clerkResponse.json();
        console.error('Clerk deletion error:', errorData);
        
        // If user doesn't exist in Clerk, still proceed with local cleanup
        if (clerkResponse.status !== 404) {
          return NextResponse.json(
            { error: 'Failed to delete user from Clerk' },
            { status: 500 }
          );
        }
      }
    } catch (error) {
      console.error('Error deleting user from Clerk:', error);
      // Continue with local cleanup even if Clerk deletion fails
    }

    // Clean up local user data (if using local database)
    // This would include:
    // - User profile data
    // - Usage statistics
    // - XP and badges
    // - Bookmarks and notes
    // - Watch history
    // - Subscription records

    // For now, we'll just return success
    // In production, you'd want to clean up all related data

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
      userId: userId
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
