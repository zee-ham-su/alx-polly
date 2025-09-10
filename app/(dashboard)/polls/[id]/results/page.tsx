import { getPollResults } from "@/app/lib/actions/poll-actions";
import { notFound } from "next/navigation";

export default async function PollResultsPage({ params }: { params: { id: string } }) {
  const { poll, error } = await getPollResults(params.id);

  if (error || !poll) {
    notFound();
  }

  const totalVotes = poll.options.reduce((acc, option) => acc + option.votes, 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">{poll.question}</h1>
      <div className="space-y-4">
        {poll.options.map((option, index) => (
          <div key={option.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">{option.text}</span>
              <span className="text-gray-500">{option.votes} votes</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-blue-500 h-4 rounded-full"
                style={{ width: `${totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-right">
        <span className="text-lg font-semibold">Total Votes: {totalVotes}</span>
      </div>
    </div>
  );
}
