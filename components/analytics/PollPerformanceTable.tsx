import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

interface PollPerformance {
  id: string;
  question: string;
  totalVotes: number;
  createdAt: string;
  options: {
    option: string;
    votes: number;
    percentage: number;
  }[];
}

interface PollPerformanceTableProps {
  polls: PollPerformance[];
}

export function PollPerformanceTable({ polls }: PollPerformanceTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Poll Performance</CardTitle>
        <CardDescription>
          Detailed breakdown of your polls ranked by total votes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {polls.length === 0 ? (
          <p className="text-sm text-muted-foreground">No polls found</p>
        ) : (
          <div className="space-y-4">
            {polls.map((poll) => (
              <div key={poll.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{poll.question}</h4>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
                      <span>{poll.totalVotes} votes</span>
                      <span>{new Date(poll.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/polls/${poll.id}`}>
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Link>
                  </Button>
                </div>
                
                {poll.totalVotes > 0 && (
                  <div className="space-y-2">
                    {poll.options.slice(0, 3).map((option, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground truncate">
                            {option.option}
                          </span>
                          <span className="text-xs font-medium">
                            {option.votes} ({option.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-1">
                          <div
                            className="bg-primary h-1 rounded-full"
                            style={{ width: `${option.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {poll.options.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{poll.options.length - 3} more options
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
