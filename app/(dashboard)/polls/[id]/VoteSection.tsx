'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { submitVote } from '@/app/lib/actions/poll-actions';
import { Poll, Option } from '@/app/lib/types';

export function VoteSection({ poll }: { poll: Poll & { options: Option[] } }) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVote = async () => {
    if (selectedOption === null) return;

    setIsSubmitting(true);
    setError(null);

    const result = await submitVote(poll.id, selectedOption);

    if (result?.error) {
      setError(result.error);
    }

    setIsSubmitting(false);
  };

  return (
    <div className="space-y-3">
      {poll.options.map((option, index) => (
        <div
          key={option.id}
          className={`p-3 border rounded-md cursor-pointer transition-colors ${selectedOption === index ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'}`}
          onClick={() => setSelectedOption(index)}
        >
          {option.text}
        </div>
      ))}
      <Button
        onClick={handleVote}
        disabled={selectedOption === null || isSubmitting}
        className="mt-4"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Vote'}
      </Button>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}
