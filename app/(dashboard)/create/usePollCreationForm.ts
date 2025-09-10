"use client";

import { useState } from "react";
import { createPoll } from "@/app/lib/actions/poll-actions";

export function usePollCreationForm() {
  const [options, setOptions] = useState(["", ""]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOptionChange = (idx: number, value: string) => {
    setOptions((opts) => opts.map((opt, i) => (i === idx ? value : opt)));
  };

  const addOption = () => setOptions((opts) => [...opts, ""]);

  const removeOption = (idx: number) => {
    setOptions((prev) =>
      prev.length > 2 ? prev.filter((_, i) => i !== idx) : prev
    );
  };

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    if (isSubmitting) return;
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const res = await createPoll(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = "/polls";
        }, 1200);
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    options,
    handleOptionChange,
    addOption,
    removeOption,
    error,
    success,
    showSchedule,
    setShowSchedule,
    isSubmitting,
    handleSubmit,
  };
}
