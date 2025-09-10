"use client";

import { useState } from "react";
import { createPoll } from "@/app/lib/actions/poll-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { PlusCircle, Calendar } from "lucide-react";

/**
 * Renders a form for creating a new poll.
 * Includes fields for the poll question, options, and optional scheduling for a delayed opening and closing.
 * Handles form submission and displays success or error messages.
 */
export default function PollCreateForm() {
  const [options, setOptions] = useState(["", ""]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  const handleOptionChange = (idx: number, value: string) => {
    setOptions((opts) => opts.map((opt, i) => (i === idx ? value : opt)));
  };

  const addOption = () => setOptions((opts) => [...opts, ""]);
  const removeOption = (idx: number) => {
    if (options.length > 2) {
      setOptions((opts) => opts.filter((_, i) => i !== idx));
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create a New Poll</CardTitle>
      </CardHeader>
      <CardContent>
    <form
      id="create-poll-form"
      action={async (formData) => {
        setError(null);
        setSuccess(false);
  // Server action consumes FormData directly; question/options are read server-side.
        const res = await createPoll(formData);
        if (res?.error) {
          setError(res.error);
        } else {
          setSuccess(true);
          setTimeout(() => {
            window.location.href = "/polls";
          }, 1200);
        }
      }}
      className="space-y-6"
    >
      <div>
        <Label htmlFor="question">Poll Question</Label>
        <Input name="question" id="question" required />
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
            <Input name="scheduled_open_time" id="scheduled_open_time" type="datetime-local" />
          </div>
          <div>
            <Label htmlFor="scheduled_close_time">Scheduled Close Time</Label>
            <Input name="scheduled_close_time" id="scheduled_close_time" type="datetime-local" />
          </div>
        </div>
      )}
      {error && <div className="text-red-500">{error}</div>}
      {success && <div className="text-green-600">Poll created! Redirecting...</div>}
      </form>
      </CardContent>
      <CardFooter>
        <Button type="submit" form="create-poll-form" className="ml-auto">Create Poll</Button>
      </CardFooter>
    </Card>
  );
} 