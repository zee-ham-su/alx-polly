'use client';

import { useState } from 'react';
import { updatePoll } from '@/app/lib/actions/poll-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Calendar, PlusCircle } from 'lucide-react';

/**
 * Renders a form for editing an existing poll.
 * Pre-fills the form with the poll's current data, including the question, options, and any scheduled open or close times.
 * Handles form submission and displays success or error messages.
 */
export default function EditPollForm({ poll }: { poll: any }) {
  const [question, setQuestion] = useState(poll.question);
  const [options, setOptions] = useState<string[]>(poll.options?.map((opt: any) => opt.text) || []);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showSchedule, setShowSchedule] = useState(!!(poll.scheduled_open_time || poll.scheduled_close_time));

  const handleOptionChange = (idx: number, value: string) => {
    setOptions((opts) => opts.map((opt, i) => (i === idx ? value : opt)));
  };

  const addOption = () => setOptions((opts) => [...opts, '']);
  const removeOption = (idx: number) => {
    if (options.length > 2) {
      setOptions((opts) => opts.filter((_, i) => i !== idx));
    }
  };

  // Helper to format date for datetime-local input
  const formatDateTimeLocal = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Format to YYYY-MM-DDTHH:mm
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
  };

  return (
    <form
      action={async (formData) => {
        setError(null);
        setSuccess(false);
  // Ensure server action receives current state values, not stale DOM values.
        formData.set('question', question);
        formData.delete('options');
        options.forEach((opt) => formData.append('options', opt));
        const res = await updatePoll(poll.id, formData);
        if (res?.error) {
          setError(res.error);
        } else {
          setSuccess(true);
          setTimeout(() => {
            window.location.href = '/polls';
          }, 1200);
        }
      }}
      className="space-y-6"
    >
      <div>
        <Label htmlFor="question">Poll Question</Label>
        <Input
          name="question"
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          required
        />
      </div>
      <div>
        <Label>Options</Label>
        {options.map((opt, idx) => (
          <div key={idx} className="flex items-center gap-2 mb-2">
            <Input
              name="options"
              value={opt}
              onChange={(e) => handleOptionChange(idx, e.target.value)}
              required
            />
            {options.length > 2 && (
              <Button type="button" variant="destructive" onClick={() => removeOption(idx)}>
                Remove
              </Button>
            )}
          </div>
        ))}
        <div className="flex items-center gap-2">
          <Button type="button" onClick={addOption} variant="secondary" className="inline-flex items-center gap-2">
            <PlusCircle className="h-4 w-4" /> Add Option
          </Button>
          <Button type="button" onClick={() => setShowSchedule(!showSchedule)} variant="outline" className="inline-flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Schedule
          </Button>
        </div>
      </div>

      {showSchedule && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="scheduled_open_time">Scheduled Open Time</Label>
            <Input 
              name="scheduled_open_time" 
              id="scheduled_open_time" 
              type="datetime-local" 
              defaultValue={formatDateTimeLocal(poll.scheduled_open_time)} 
            />
          </div>
          <div>
            <Label htmlFor="scheduled_close_time">Scheduled Close Time</Label>
            <Input 
              name="scheduled_close_time" 
              id="scheduled_close_time" 
              type="datetime-local" 
              defaultValue={formatDateTimeLocal(poll.scheduled_close_time)} 
            />
          </div>
        </div>
      )}

      {error && <div className="text-red-500">{error}</div>}
      {success && <div className="text-green-600">Poll updated! Redirecting...</div>}
      <Button type="submit">Update Poll</Button>
    </form>
  );
}