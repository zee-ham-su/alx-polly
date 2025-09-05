import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getUserPolls } from '@/app/lib/actions/poll-actions';
import PollActions from './PollActions'; 

/**
 * My Polls page (server component).
 * Why: Provides an overview of the authenticated user's polls.
 * Behavior: Fetches user-owned polls via server action and renders a grid of items.
 */
export default async function PollsPage() {
  const { polls, error } = await getUserPolls();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">My Polls</h1>
        <Button asChild>
          <Link href="/create">Create New Poll</Link>
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {polls && polls.length > 0 ? (
          polls.map((poll) => <PollActions key={poll.id} poll={poll} />)
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center col-span-full">
            <h2 className="text-xl font-semibold mb-2">No polls yet</h2>
            <p className="text-slate-500 mb-6">Create your first poll to get started</p>
            <Button asChild>
              <Link href="/create">Create New Poll</Link>
            </Button>
          </div>
        )}
      </div>
      {error && <div className="text-red-500">{error}</div>}
    </div>
  );
}