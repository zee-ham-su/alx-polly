"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartData {
  label: string;
  value: number;
  percentage?: number;
}

interface SimpleChartProps {
  title: string;
  description?: string;
  data: ChartData[];
  type?: "bar" | "line";
}

export function SimpleChart({ title, description, data, type = "bar" }: SimpleChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));

  if (type === "line") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data available</p>
            ) : (
              <div className="relative">
                {/* Simple line chart visualization */}
                <div className="flex items-end justify-between h-32 space-x-1">
                  {data.map((item, index) => (
                    <div key={index} className="flex flex-col items-center flex-1">
                      <div
                        className="w-full bg-blue-500 rounded-t"
                        style={{
                          height: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%`,
                          minHeight: item.value > 0 ? "2px" : "0px"
                        }}
                      />
                      <div className="text-xs text-muted-foreground mt-1 truncate w-full text-center">
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data available</p>
          ) : (
            data.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{item.label}</span>
                  <span className="text-sm text-muted-foreground">
                    {item.value} {item.percentage !== undefined && `(${item.percentage}%)`}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
