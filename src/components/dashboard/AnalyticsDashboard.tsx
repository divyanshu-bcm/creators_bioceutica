"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type PeriodFilter = "day" | "week" | "month" | "all";

type RawAnalyticsData = {
  creatorsAdded: string[];
  prospectsAdded: string[];
  formsFilled: string[];
  ordersReceived: string[];
  contentPublished: string[];
};

type MetricKey = keyof RawAnalyticsData;

type MetricDefinition = {
  key: MetricKey;
  label: string;
  dotClass: string;
  strokeClass: string;
};

type TrendBucket = {
  label: string;
  creatorsAdded: number;
  prospectsAdded: number;
  formsFilled: number;
  ordersReceived: number;
  contentPublished: number;
};

const METRICS: MetricDefinition[] = [
  {
    key: "creatorsAdded",
    label: "Creators Added",
    dotClass: "bg-blue-500",
    strokeClass: "stroke-blue-500",
  },
  {
    key: "prospectsAdded",
    label: "Prospects Added",
    dotClass: "bg-emerald-500",
    strokeClass: "stroke-emerald-500",
  },
  {
    key: "ordersReceived",
    label: "Orders Received",
    dotClass: "bg-amber-500",
    strokeClass: "stroke-amber-500",
  },
  {
    key: "formsFilled",
    label: "Forms Filled",
    dotClass: "bg-violet-500",
    strokeClass: "stroke-violet-500",
  },
  {
    key: "contentPublished",
    label: "Content Published",
    dotClass: "bg-rose-500",
    strokeClass: "stroke-rose-500",
  },
];

const PERIODS: Array<{ key: PeriodFilter; label: string }> = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "all", label: "All" },
];

const PIE_STROKES = [
  "stroke-blue-500",
  "stroke-emerald-500",
  "stroke-amber-500",
  "stroke-violet-500",
  "stroke-rose-500",
];

function startOfHour(date: Date) {
  const next = new Date(date);
  next.setMinutes(0, 0, 0);
  return next;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toTimeValue(value: string): number | null {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function getPeriodStart(period: PeriodFilter, now: Date): number | null {
  if (period === "all") return null;
  if (period === "day") return now.getTime() - 24 * 60 * 60 * 1000;
  if (period === "week") return now.getTime() - 7 * 24 * 60 * 60 * 1000;
  return now.getTime() - 30 * 24 * 60 * 60 * 1000;
}

function buildTrendBuckets(
  period: PeriodFilter,
  allTimes: number[][],
): TrendBucket[] {
  const now = new Date();

  if (period === "day") {
    const end = startOfHour(now);
    const start = new Date(end.getTime() - 23 * 60 * 60 * 1000);
    return Array.from({ length: 24 }, (_, index) => {
      const bucketStart = new Date(start.getTime() + index * 60 * 60 * 1000);
      return {
        label: bucketStart.toLocaleTimeString("en-US", {
          hour: "numeric",
          hour12: true,
        }),
        creatorsAdded: 0,
        prospectsAdded: 0,
        formsFilled: 0,
        ordersReceived: 0,
        contentPublished: 0,
      };
    });
  }

  if (period === "week") {
    const end = startOfDay(now);
    const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
    return Array.from({ length: 7 }, (_, index) => {
      const bucketStart = new Date(
        start.getTime() + index * 24 * 60 * 60 * 1000,
      );
      return {
        label: bucketStart.toLocaleDateString("en-US", {
          weekday: "short",
        }),
        creatorsAdded: 0,
        prospectsAdded: 0,
        formsFilled: 0,
        ordersReceived: 0,
        contentPublished: 0,
      };
    });
  }

  if (period === "month") {
    const end = startOfDay(now);
    const start = new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);
    return Array.from({ length: 30 }, (_, index) => {
      const bucketStart = new Date(
        start.getTime() + index * 24 * 60 * 60 * 1000,
      );
      return {
        label: bucketStart.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        creatorsAdded: 0,
        prospectsAdded: 0,
        formsFilled: 0,
        ordersReceived: 0,
        contentPublished: 0,
      };
    });
  }

  const flat = allTimes.flat();
  const minTime = flat.length > 0 ? Math.min(...flat) : Date.now();
  const start = startOfMonth(new Date(minTime));
  const end = startOfMonth(now);

  const buckets: TrendBucket[] = [];
  let cursor = new Date(start);

  while (cursor.getTime() <= end.getTime()) {
    buckets.push({
      label: cursor.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      creatorsAdded: 0,
      prospectsAdded: 0,
      formsFilled: 0,
      ordersReceived: 0,
      contentPublished: 0,
    });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return buckets;
}

function getBucketIndex(
  period: PeriodFilter,
  timestamp: number,
  totalBuckets: number,
): number {
  const now = new Date();

  if (period === "day") {
    const start = startOfHour(
      new Date(now.getTime() - 23 * 60 * 60 * 1000),
    ).getTime();
    return Math.floor((timestamp - start) / (60 * 60 * 1000));
  }

  if (period === "week") {
    const start = startOfDay(
      new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
    ).getTime();
    return Math.floor((timestamp - start) / (24 * 60 * 60 * 1000));
  }

  if (period === "month") {
    const start = startOfDay(
      new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000),
    ).getTime();
    return Math.floor((timestamp - start) / (24 * 60 * 60 * 1000));
  }

  const date = new Date(timestamp);
  const first = startOfMonth(new Date(date));
  const nowFirst = startOfMonth(now);
  const monthsApart =
    (first.getFullYear() - nowFirst.getFullYear()) * 12 +
    (first.getMonth() - nowFirst.getMonth());

  return totalBuckets - 1 + monthsApart;
}

function buildPoints(
  values: number[],
  width: number,
  height: number,
  maxValue: number,
): string {
  if (!values.length) return "";
  if (values.length === 1) return `0,${height / 2}`;

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = maxValue === 0 ? height : height - (value / maxValue) * height;
      return `${x},${y}`;
    })
    .join(" ");
}

interface AnalyticsDashboardProps {
  rawData: RawAnalyticsData;
}

export function AnalyticsDashboard({ rawData }: AnalyticsDashboardProps) {
  const [period, setPeriod] = useState<PeriodFilter>("week");

  const parsedData = useMemo(() => {
    const parsed: Record<MetricKey, number[]> = {
      creatorsAdded: [],
      prospectsAdded: [],
      formsFilled: [],
      ordersReceived: [],
      contentPublished: [],
    };

    (Object.keys(rawData) as MetricKey[]).forEach((key) => {
      parsed[key] = rawData[key]
        .map((value) => toTimeValue(value))
        .filter((value): value is number => value !== null)
        .sort((a, b) => a - b);
    });

    return parsed;
  }, [rawData]);

  const filtered = useMemo(() => {
    const start = getPeriodStart(period, new Date());
    const next: Record<MetricKey, number[]> = {
      creatorsAdded: [],
      prospectsAdded: [],
      formsFilled: [],
      ordersReceived: [],
      contentPublished: [],
    };

    (Object.keys(parsedData) as MetricKey[]).forEach((key) => {
      next[key] =
        start === null
          ? parsedData[key]
          : parsedData[key].filter((timestamp) => timestamp >= start);
    });

    return next;
  }, [parsedData, period]);

  const trendBuckets = useMemo(() => {
    const buckets = buildTrendBuckets(period, Object.values(parsedData));

    (Object.keys(filtered) as MetricKey[]).forEach((key) => {
      filtered[key].forEach((timestamp) => {
        const bucketIndex = getBucketIndex(period, timestamp, buckets.length);
        if (bucketIndex < 0 || bucketIndex >= buckets.length) return;
        buckets[bucketIndex][key] += 1;
      });
    });

    return buckets;
  }, [filtered, parsedData, period]);

  const totals = useMemo(
    () => ({
      creatorsAdded: filtered.creatorsAdded.length,
      prospectsAdded: filtered.prospectsAdded.length,
      formsFilled: filtered.formsFilled.length,
      ordersReceived: filtered.ordersReceived.length,
      contentPublished: filtered.contentPublished.length,
    }),
    [filtered],
  );

  const maxTrendValue = useMemo(() => {
    const values = trendBuckets.flatMap((bucket) =>
      METRICS.map((metric) => bucket[metric.key]),
    );
    return values.length ? Math.max(...values) : 0;
  }, [trendBuckets]);

  const pieTotal =
    totals.creatorsAdded +
    totals.prospectsAdded +
    totals.ordersReceived +
    totals.formsFilled +
    totals.contentPublished;

  const pieValues = [
    totals.creatorsAdded,
    totals.prospectsAdded,
    totals.ordersReceived,
    totals.formsFilled,
    totals.contentPublished,
  ];

  const circleRadius = 62;
  const circumference = 2 * Math.PI * circleRadius;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Insights across creators, prospects, orders, forms, and content.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
          {PERIODS.map((option) => (
            <Button
              key={option.key}
              variant={period === option.key ? "default" : "ghost"}
              size="sm"
              onClick={() => setPeriod(option.key)}
              className="h-8 px-3"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {METRICS.map((metric) => (
          <Card key={metric.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {totals[metric.key].toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Trend Graph</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <svg
                viewBox="0 0 1000 320"
                className="h-64 min-w-175 w-full"
                aria-label="Analytics trend graph"
              >
                {[0, 1, 2, 3, 4].map((line) => {
                  const y = 20 + line * 60;
                  return (
                    <line
                      key={line}
                      x1="0"
                      y1={y}
                      x2="1000"
                      y2={y}
                      className="stroke-slate-200 dark:stroke-slate-700"
                      strokeWidth="1"
                    />
                  );
                })}

                {METRICS.map((metric) => {
                  const points = buildPoints(
                    trendBuckets.map((bucket) => bucket[metric.key]),
                    1000,
                    240,
                    maxTrendValue,
                  );
                  return (
                    <polyline
                      key={metric.key}
                      points={points}
                      fill="none"
                      strokeWidth="3"
                      className={metric.strokeClass}
                      transform="translate(0,20)"
                    />
                  );
                })}
              </svg>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {METRICS.map((metric) => (
                <div
                  key={metric.key}
                  className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300"
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${metric.dotClass}`}
                  />
                  <span>{metric.label}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>{trendBuckets[0]?.label ?? ""}</span>
              <span>{trendBuckets[trendBuckets.length - 1]?.label ?? ""}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribution Pie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="mx-auto w-fit">
              <svg
                viewBox="0 0 200 200"
                className="h-52 w-52"
                role="img"
                aria-label="Metric distribution pie chart"
              >
                <circle
                  cx="100"
                  cy="100"
                  r={circleRadius}
                  fill="none"
                  strokeWidth="24"
                  className="stroke-slate-200 dark:stroke-slate-700"
                />
                {pieValues.map((value, index) => {
                  if (!pieTotal || value <= 0) return null;

                  const segmentLength = (value / pieTotal) * circumference;
                  const prevLength = pieValues
                    .slice(0, index)
                    .reduce(
                      (acc, item) => acc + (item / pieTotal) * circumference,
                      0,
                    );

                  return (
                    <circle
                      key={`${METRICS[index].key}-pie`}
                      cx="100"
                      cy="100"
                      r={circleRadius}
                      fill="none"
                      strokeWidth="24"
                      strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                      strokeDashoffset={-prevLength}
                      transform="rotate(-90 100 100)"
                      className={PIE_STROKES[index]}
                    />
                  );
                })}
                <text
                  x="100"
                  y="100"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-slate-900 text-xl font-semibold dark:fill-slate-100"
                >
                  {pieTotal.toLocaleString()}
                </text>
                <text
                  x="100"
                  y="120"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-slate-500 text-xs dark:fill-slate-400"
                >
                  total
                </text>
              </svg>
            </div>

            <div className="space-y-2">
              {METRICS.map((metric, index) => (
                <div
                  key={`${metric.key}-summary`}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${METRICS[index].dotClass}`}
                    />
                    <span>{metric.label}</span>
                  </div>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {totals[metric.key].toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
