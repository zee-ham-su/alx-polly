import { useState } from "react";
import { createPoll } from "@/app/lib/actions/poll-actions";

export function usePollCreationForm() {
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

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    setSuccess(false);

    const res = await createPoll(formData);
    if (res?.error) {
      setError(res.error);
    } else {
      setSuccess(true);
      setTimeout(() => {
        window.location.href = "/polls";
      }, 1200);
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
    handleSubmit,
  };
}
