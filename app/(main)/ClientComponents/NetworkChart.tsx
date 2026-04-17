"use client";

import NetworkChartLoading from "@/app/(main)/ClientComponents/NetworkChartLoading";
import { NezhaAPIMonitor, ServerMonitorChart } from "@/app/types/nezha-api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import getEnv from "@/lib/env-entry";
import { formatTime, nezhaFetcher } from "@/lib/utils";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useCallback, useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import useSWR from "swr";

interface ResultItem {
  created_at: number;
  [key: string]: number | null;
}

export function NetworkChartClient({
  server_id,
  show,
}: {
  server_id: number;
  show: boolean;
}) {
  const t = useTranslations("NetworkChartClient");
  const packetLossLabel = t("packet_loss");
  const { data, error } = useSWR<NezhaAPIMonitor[]>(
    `/api/monitor?server_id=${server_id}`,
    nezhaFetcher,
    {
      refreshInterval:
        Number(getEnv("NEXT_PUBLIC_NezhaFetchInterval")) || 15000,
      isVisible: () => show,
    },
  );

  if (error) {
    return (
      <>
        <div className="flex flex-col items-center justify-center">
          <p className="text-sm font-medium opacity-40">{error.message}</p>
          <p className="text-sm font-medium opacity-40">
            {t("chart_fetch_error_message")}
          </p>
        </div>
        <NetworkChartLoading />
      </>
    );
  }

  if (!data) return <NetworkChartLoading />;

  const transformedData = transformData(data);
  const formattedData = formatData(data);

  const initChartConfig = {
    avg_delay: {
      label: t("avg_delay"),
      color: "hsl(var(--chart-1))",
    },
    packet_loss: {
      label: packetLossLabel,
      color: "hsl(45 100% 60%)",
    },
  } satisfies ChartConfig;

  const chartDataKey = Object.keys(transformedData);

  return (
    <NetworkChart
      chartDataKey={chartDataKey}
      chartConfig={initChartConfig}
      chartData={transformedData}
      serverName={data[0].server_name}
      formattedData={formattedData}
    />
  );
}

export const NetworkChart = React.memo(function NetworkChart({
  chartDataKey,
  chartConfig,
  chartData,
  serverName,
  formattedData,
}: {
  chartDataKey: string[];
  chartConfig: ChartConfig;
  chartData: ServerMonitorChart;
  serverName: string;
  formattedData: ResultItem[];
}) {
  const t = useTranslations("NetworkChart");

  const defaultChart = "All";
  const packetLossLabel = t("packet_loss");
  const peakCutLabel = t("peak_cut");
  const forcePeakCutEnabled =
    getEnv("NEXT_PUBLIC_ForcePeakCutEnabled") === "true";

  const [activeChart, setActiveChart] = React.useState(defaultChart);
  const [isPeakEnabled, setIsPeakEnabled] = React.useState(
    forcePeakCutEnabled,
  );

  const handleButtonClick = useCallback(
    (chart: string) => {
      setActiveChart((prev) => (prev === chart ? defaultChart : chart));
    },
    [defaultChart],
  );

  const getColorByIndex = useCallback(
    (chart: string) => {
      const index = chartDataKey.indexOf(chart);
      return `hsl(var(--chart-${(index % 10) + 1}))`;
    },
    [chartDataKey],
  );

  const chartStats = useMemo(() => {
    const stats: Record<string, { minDelay: number; maxDelay: number }> = {};

    chartDataKey.forEach((key) => {
      const data = chartData[key] || [];

      if (data.length === 0) {
        stats[key] = { minDelay: 0, maxDelay: 0 };
        return;
      }

      const delays = data.map((item) => item.avg_delay);
      stats[key] = {
        minDelay: Math.min(...delays),
        maxDelay: Math.max(...delays),
      };
    });

    return stats;
  }, [chartData, chartDataKey]);

  const chartButtons = useMemo(
    () =>
      chartDataKey.map((key) => {
        const stats = chartStats[key];
        const packetLossItems = chartData[key].filter(
          (item) => item.packet_loss !== undefined,
        );
        const averagePacketLoss =
          packetLossItems.length > 0
            ? packetLossItems.reduce(
                (sum, item) => sum + (item.packet_loss ?? 0),
                0,
              ) / packetLossItems.length
            : null;

        return (
          <button
            type="button"
            key={key}
            data-active={activeChart === key}
            className="relative z-30 flex min-w-0 cursor-pointer flex-col justify-center gap-1 border-b border-neutral-200 px-6 py-4 text-left data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-6 dark:border-neutral-800"
            onClick={() => handleButtonClick(key)}
          >
            <span className="truncate whitespace-nowrap text-xs text-muted-foreground">
              {key}
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-md font-bold leading-none sm:text-lg">
                {chartData[key][chartData[key].length - 1].avg_delay.toFixed(2)}
                ms
              </span>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-green-500">
                  ↓{stats.minDelay.toFixed(0)}
                </span>
                <span className="text-red-500">↑{stats.maxDelay.toFixed(0)}</span>
                {averagePacketLoss !== null && (
                  <span className="text-muted-foreground">
                    {averagePacketLoss.toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      }),
    [activeChart, chartData, chartDataKey, chartStats, handleButtonClick],
  );

  const chartElements = useMemo(() => {
    if (activeChart !== defaultChart) {
      return [
        <Area
          key="packet-loss-area"
          isAnimationActive={false}
          dataKey="packet_loss"
          stroke="none"
          fill="hsl(45 100% 60%)"
          fillOpacity={0.3}
          yAxisId="packet-loss"
        />,
        <Line
          key="delay-line"
          isAnimationActive={false}
          strokeWidth={1}
          type="linear"
          dot={false}
          dataKey="avg_delay"
          stroke={getColorByIndex(activeChart)}
          yAxisId="delay"
        />,
      ];
    }

    return chartDataKey.map((key) => (
      <Line
        key={key}
        isAnimationActive={false}
        strokeWidth={1}
        type="linear"
        dot={false}
        dataKey={key}
        stroke={getColorByIndex(key)}
        connectNulls={true}
        yAxisId="delay"
      />
    ));
  }, [activeChart, defaultChart, chartDataKey, getColorByIndex]);

  const processedData = useMemo(() => {
    if (!isPeakEnabled) {
      return activeChart === defaultChart
        ? formattedData
        : chartData[activeChart];
    }

    const data = (
      activeChart === defaultChart ? formattedData : chartData[activeChart]
    ) as ResultItem[];
    const windowSize = 11;
    const alpha = 0.3;

    const getMedian = (values: number[]) => {
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    const processValues = (values: number[]) => {
      if (values.length === 0) return null;

      const median = getMedian(values);
      const deviations = values.map((value) => Math.abs(value - median));
      const medianDeviation = getMedian(deviations) * 1.4826;

      const validValues = values.filter(
        (value) =>
          Math.abs(value - median) <= 3 * medianDeviation && value <= median * 3,
      );

      if (validValues.length === 0) return median;

      let ewma = validValues[0];
      for (let i = 1; i < validValues.length; i++) {
        ewma = alpha * validValues[i] + (1 - alpha) * ewma;
      }

      return ewma;
    };

    const ewmaHistory: Record<string, number> = {};

    return data.map((point, index) => {
      if (index < windowSize - 1) return point;

      const window = data.slice(index - windowSize + 1, index + 1);
      const smoothed = { ...point } as ResultItem;

      if (activeChart === defaultChart) {
        chartDataKey.forEach((key) => {
          const values = window
            .map((item) => item[key])
            .filter((value) => value !== undefined && value !== null) as number[];

          if (values.length > 0) {
            const processed = processValues(values);
            if (processed !== null) {
              if (ewmaHistory[key] === undefined) {
                ewmaHistory[key] = processed;
              } else {
                ewmaHistory[key] =
                  alpha * processed + (1 - alpha) * ewmaHistory[key];
              }
              smoothed[key] = ewmaHistory[key];
            }
          }
        });
      } else {
        const values = window
          .map((item) => item.avg_delay)
          .filter((value) => value !== undefined && value !== null) as number[];

        if (values.length > 0) {
          const processed = processValues(values);
          if (processed !== null) {
            if (ewmaHistory.current === undefined) {
              ewmaHistory.current = processed;
            } else {
              ewmaHistory.current =
                alpha * processed + (1 - alpha) * ewmaHistory.current;
            }
            smoothed.avg_delay = ewmaHistory.current;
          }
        }
      }

      return smoothed;
    });
  }, [
    activeChart,
    chartData,
    chartDataKey,
    defaultChart,
    formattedData,
    isPeakEnabled,
  ]);

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch space-y-0 overflow-hidden rounded-t-lg p-0 sm:flex-row">
        <div className="flex flex-none flex-col justify-center gap-1 border-b px-6 py-4">
          <CardTitle className="flex flex-none items-center gap-0.5 text-md">
            {serverName}
          </CardTitle>
          <div className="flex items-center justify-between">
            <CardDescription className="mr-2 text-xs">
              {chartDataKey.length} {t("ServerMonitorCount")}
            </CardDescription>
            <div className="flex items-center space-x-2">
              <Switch
                id="Peak"
                checked={isPeakEnabled}
                onCheckedChange={setIsPeakEnabled}
              />
              <Label className="text-xs" htmlFor="Peak">
                {peakCutLabel}
              </Label>
            </div>
          </div>
        </div>
        <div className="grid w-full grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
          {chartButtons}
        </div>
      </CardHeader>
      <CardContent className="py-4 pr-2 pl-0 sm:pt-6 sm:pr-6 sm:pb-6 sm:pl-2">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <ComposedChart
            accessibilityLayer
            data={processedData}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="created_at"
              tickLine={true}
              tickSize={3}
              axisLine={false}
              tickMargin={8}
              minTickGap={80}
              ticks={processedData
                .filter((item, index, array) => {
                  if (array.length < 6) {
                    return index === 0 || index === array.length - 1;
                  }

                  const timeSpan =
                    array[array.length - 1].created_at - array[0].created_at;
                  const hours = timeSpan / (1000 * 60 * 60);

                  if (hours <= 12) {
                    return (
                      index === 0 ||
                      index === array.length - 1 ||
                      new Date(item.created_at).getMinutes() % 60 === 0
                    );
                  }

                  const date = new Date(item.created_at);
                  return date.getMinutes() === 0 && date.getHours() % 2 === 0;
                })
                .map((item) => item.created_at)}
              tickFormatter={(value) => {
                const date = new Date(value);
                const minutes = date.getMinutes();
                return minutes === 0
                  ? `${date.getHours()}:00`
                  : `${date.getHours()}:${minutes.toString().padStart(2, "0")}`;
              }}
            />
            <YAxis
              yAxisId="delay"
              tickLine={false}
              axisLine={false}
              tickMargin={15}
              minTickGap={20}
              tickFormatter={(value) => `${value}ms`}
            />
            {activeChart !== defaultChart && (
              <YAxis
                yAxisId="packet-loss"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickMargin={15}
                minTickGap={20}
                tickFormatter={(value) => `${value}%`}
              />
            )}
            <ChartTooltip
              isAnimationActive={false}
              content={
                <ChartTooltipContent
                  indicator={"line"}
                  labelKey="created_at"
                  labelFormatter={(_, payload) => {
                    return formatTime(payload[0].payload.created_at);
                  }}
                  formatter={(value, name) => {
                    let formattedValue: string;
                    let label: string;

                    if (name === "packet_loss") {
                      formattedValue = `${Number(value).toFixed(2)}%`;
                      label = packetLossLabel;
                    } else if (name === "avg_delay") {
                      formattedValue = `${Number(value).toFixed(2)}ms`;
                      label = t("avg_delay");
                    } else {
                      formattedValue = `${Number(value).toFixed(2)}ms`;
                      label = name as string;
                    }

                    return (
                      <div className="flex flex-1 items-center justify-between leading-none">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="ml-2 font-medium tabular-nums text-foreground">
                          {formattedValue}
                        </span>
                      </div>
                    );
                  }}
                />
              }
            />
            {activeChart === defaultChart && (
              <ChartLegend
                content={(props: any) => (
                  <ChartLegendContent
                    payload={props.payload}
                    verticalAlign={props.verticalAlign}
                  />
                )}
              />
            )}
            {chartElements}
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
});

const transformData = (data: NezhaAPIMonitor[]) => {
  const monitorData: ServerMonitorChart = {};

  data.forEach((item) => {
    const monitorName = item.monitor_name;

    if (!monitorData[monitorName]) {
      monitorData[monitorName] = [];
    }

    for (let i = 0; i < item.created_at.length; i++) {
      monitorData[monitorName].push({
        created_at: item.created_at[i],
        avg_delay: item.avg_delay[i],
        packet_loss: item.packet_loss?.[i] ?? 0,
      });
    }
  });

  return monitorData;
};

const formatData = (rawData: NezhaAPIMonitor[]) => {
  const result: { [time: number]: ResultItem } = {};

  const allTimes = new Set<number>();
  rawData.forEach((item) => {
    item.created_at.forEach((time) => allTimes.add(time));
  });

  const allTimeArray = Array.from(allTimes).sort((a, b) => a - b);

  rawData.forEach((item) => {
    const { monitor_name, created_at, avg_delay } = item;

    allTimeArray.forEach((time) => {
      if (!result[time]) {
        result[time] = { created_at: time };
      }

      const timeIndex = created_at.indexOf(time);
      result[time][monitor_name] =
        timeIndex !== -1 ? avg_delay[timeIndex] : null;

      if (item.packet_loss) {
        result[time][`${monitor_name}_packet_loss`] =
          timeIndex !== -1 ? item.packet_loss[timeIndex] : null;
      }
    });
  });

  return Object.values(result).sort((a, b) => a.created_at - b.created_at);
};
