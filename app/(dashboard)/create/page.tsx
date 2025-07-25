'use client';

import PollCreateForm from "./PollCreateForm";

export default function CreatePollPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">Create a New Poll</h1>
      <PollCreateForm />
    </main>
  );
}