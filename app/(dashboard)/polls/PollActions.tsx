"use client";

import Link from "next/link";
import { useAuth } from "@/app/lib/context/auth-context";
import { Button } from "@/components/ui/button";
import { deletePoll, publishPoll } from "@/app/lib/actions/poll-actions";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Link2, Share2, Trash2, Pencil, Rocket } from "lucide-react";
import { toast } from "sonner";

/**
 * Defines the structure of a poll object, including its status.
 */
interface Poll {
  id: string;
  question: string;
  options: any[];
  user_id: string;
  status: 'draft' | 'open' | 'closed';
}

interface PollActionsProps {
  poll: Poll;
}

/**
 * Renders a card with actions for a given poll.
 * The actions displayed depend on the poll's status (draft, open, or closed) and the current user's ownership.
 * It handles deleting, publishing, and sharing polls.
 */
export default function PollActions({ poll }: PollActionsProps) {
  const { user } = useAuth();

  /**
   * Handles the deletion of a poll.
   * Prompts the user for confirmation, then calls the `deletePoll` server action.
   * Reloads the page on successful deletion.
   */
  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this poll?")) {
      await deletePoll(poll.id);
      window.location.reload();
    }
  };

  /**
   * Handles the publishing of a draft poll.
   * Prompts the user for confirmation, then calls the `publishPoll` server action.
   * Reloads the page on successful publication.
   */
  const handlePublish = async () => {
    if (confirm("Are you sure you want to publish this poll? This will make it live and allow voting.")) {
      await publishPoll(poll.id);
      window.location.reload();
    }
  };

  const pollUrl = typeof window !== 'undefined' ? `${window.location.origin}/polls/${poll.id}` : `/polls/${poll.id}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pollUrl);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="line-clamp-2">{poll.question}</CardTitle>
          <Badge variant={poll.status === 'open' ? 'default' : 'secondary'}>
            {poll.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="text-sm text-slate-500">
        {poll.options.length} options
      </CardContent>
      <CardFooter className="flex items-center gap-2">
        {poll.status === 'draft' && user && user.id === poll.user_id && (
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" size="sm" onClick={handlePublish} className="inline-flex items-center gap-1">
              <Rocket className="h-4 w-4" /> Publish
            </Button>
            <Button asChild variant="outline" size="sm" className="inline-flex items-center gap-1">
              <Link href={`/polls/${poll.id}/edit`}>
                <Pencil className="h-4 w-4" /> Edit
              </Link>
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} className="inline-flex items-center gap-1">
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        )}
        {poll.status === 'open' && (
          <>
            <Button asChild variant="secondary" size="sm">
              <Link href={`/polls/${poll.id}`} className="inline-flex items-center gap-1">
                <Eye className="h-4 w-4" /> View
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={copyLink} className="inline-flex items-center gap-1">
              <Link2 className="h-4 w-4" /> Copy link
            </Button>
            <Button asChild variant="outline" size="sm" className="inline-flex items-center gap-1">
              <Link href={`/polls/vulnerable-share?id=${poll.id}`}>
                <Share2 className="h-4 w-4" /> Share
              </Link>
            </Button>
            {user && user.id === poll.user_id && (
              <div className="ml-auto flex gap-2">
                <Button asChild variant="outline" size="sm" className="inline-flex items-center gap-1">
                  <Link href={`/polls/${poll.id}/edit`}>
                    <Pencil className="h-4 w-4" /> Edit
                  </Link>
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete} className="inline-flex items-center gap-1">
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>
            )}
          </>
        )}
        {poll.status === 'closed' && (
          <Button asChild variant="secondary" size="sm">
            <Link href={`/polls/${poll.id}`} className="inline-flex items-center gap-1">
              <Eye className="h-4 w-4" /> View Results
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
