import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getUserPolls } from '@/app/lib/actions/poll-actions';
import PollActions from './PollActions'; 
import { Inbox, ArrowLeft, ArrowRight } from 'lucide-react';

/**
 * My Polls page (server component).
 * Why: Provides an overview of the authenticated user's polls.
 * Behavior: Fetches user-owned polls via server action and renders a grid of items.
 */
export default async function PollsPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const { polls, error } = await getUserPolls({ page });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">My Polls</h1>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {polls && polls.length > 0 ? (
          polls.map((poll) => <PollActions key={poll.id} poll={poll} />)
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center col-span-full border-2 border-dashed rounded-lg bg-card text-card-foreground">
            <Inbox className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No Polls Found</h2>
            <p className="text-muted-foreground mb-6">You haven't created any polls yet. Get started by creating your first one!</p>
            <Button size="lg" asChild>
              <Link href="/create">Create New Poll</Link>
            </Button>
          </div>
        )}
      </div>
      <div className="flex justify-center items-center space-x-4">
        <Button asChild disabled={page <= 1} variant="outline">
          <Link href={`/polls?page=${page - 1}`} className="inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Previous
          </Link>
        </Button>
        <span className="text-sm font-medium">Page {page}</span>
        <Button asChild disabled={!polls || polls.length < 10} variant="outline">
          <Link href={`/polls?page=${page + 1}`} className="inline-flex items-center gap-1">
            Next <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      {error && <div className="text-red-500">{error}</div>}
    </div>
  );
}