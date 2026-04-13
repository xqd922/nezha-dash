"use client"

import { ExclamationTriangleIcon } from "@heroicons/react/20/solid"
import useSWR from "swr"
import { useTranslations } from "next-intl"
import { Loader } from "@/components/loading/Loader"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { ServiceMonitorStatus, ServiceStats } from "@/lib/drivers/types"
import { cn, nezhaFetcher } from "@/lib/utils"

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(100, Math.max(0, value))
}

function getUptimeColor(uptime: number) {
  if (uptime >= 99) return "text-emerald-500"
  if (uptime >= 95) return "text-amber-500"
  return "text-rose-500"
}

function getDelayColor(delay: number) {
  if (delay < 100) return "text-emerald-500"
  if (delay < 300) return "text-amber-500"
  return "text-rose-500"
}

function getStatusDotClass(status: ServiceMonitorStatus, uptime: number) {
  if (status === "nodata") return "bg-stone-400 dark:bg-stone-600"
  if (uptime >= 99) return "bg-emerald-500"
  if (uptime >= 95) return "bg-amber-500"
  return "bg-rose-500"
}

function getUsageIndicatorClass(remainingPercent: number) {
  if (remainingPercent <= 20) return "bg-rose-500"
  if (remainingPercent <= 50) return "bg-amber-500"
  return "bg-emerald-500"
}

function getDayClass(availability: number) {
  if (availability <= 0) {
    return "bg-stone-300 dark:bg-stone-700"
  }

  if (availability > 50) {
    return "bg-linear-to-b from-green-500/90 shadow-sm to-green-600"
  }

  return "bg-linear-to-b from-red-500/80 shadow-sm to-red-600/90"
}

function parseDateTime(value: string) {
  const normalized = value.trim()
  const mmddyyyyMatch = normalized.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}):(\d{2}))?$/,
  )

  if (mmddyyyyMatch) {
    const [, month, day, year, hour = "0", minute = "0", second = "0"] = mmddyyyyMatch
    return new Date(
      Number.parseInt(year, 10),
      Number.parseInt(month, 10) - 1,
      Number.parseInt(day, 10),
      Number.parseInt(hour, 10),
      Number.parseInt(minute, 10),
      Number.parseInt(second, 10),
    )
  }

  const parsedDate = new Date(normalized)
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate
  }

  return null
}

function parseRelativeDuration(value: string) {
  const matches = [...value.matchAll(/(\d+)([dhms])/g)]
  if (matches.length === 0) {
    return null
  }

  let totalSeconds = 0
  for (const match of matches) {
    const amount = Number.parseInt(match[1], 10)
    switch (match[2]) {
      case "d":
        totalSeconds += amount * 86400
        break
      case "h":
        totalSeconds += amount * 3600
        break
      case "m":
        totalSeconds += amount * 60
        break
      case "s":
        totalSeconds += amount
        break
    }
  }

  if (totalSeconds <= 0) {
    return null
  }

  return new Date(Date.now() + totalSeconds * 1000)
}

function formatDate(date: Date) {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

function formatDateTime(date: Date) {
  const hours = `${date.getHours()}`.padStart(2, "0")
  const minutes = `${date.getMinutes()}`.padStart(2, "0")
  const seconds = `${date.getSeconds()}`.padStart(2, "0")
  return `${formatDate(date)} ${hours}:${minutes}:${seconds}`
}

function formatCycleDate(value: string) {
  const parsedDate = parseDateTime(value)
  return parsedDate ? formatDate(parsedDate) : value
}

function formatNextUpdate(value: string) {
  const relativeDate = parseRelativeDuration(value)
  if (relativeDate) {
    return formatDateTime(relativeDate)
  }

  const parsedDate = parseDateTime(value)
  if (parsedDate) {
    return formatDateTime(parsedDate)
  }

  return value
}

export default function ServiceStatsSection() {
  const t = useTranslations("ServiceStatsSection")
  const { data, error, isLoading } = useSWR<ServiceStats | null>("/api/service", nezhaFetcher, {
    refreshInterval: 10_000,
    dedupingInterval: 1_000,
  })

  if (error) {
    return (
      <div className="mt-4 flex items-center gap-1 font-medium text-sm">
        <ExclamationTriangleIcon className="h-4 w-4" />
        {t("error")}
      </div>
    )
  }

  if (isLoading && !data) {
    return (
      <div className="mt-4 flex items-center gap-1 font-medium text-sm">
        <Loader visible={true} />
        {t("loading")}
      </div>
    )
  }

  if (data === null) {
    return null
  }

  const hasTraffic = (data?.cycleTransfers.length ?? 0) > 0
  const hasMonitors = (data?.monitors.length ?? 0) > 0

  if (!hasTraffic && !hasMonitors) {
    return (
      <div className="mt-4 flex items-center gap-1 font-medium text-sm">
        <ExclamationTriangleIcon className="h-4 w-4" />
        {t("empty")}
      </div>
    )
  }

  return (
    <div className="mx-auto mt-4 w-full">
      {hasTraffic && (
        <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {data?.cycleTransfers.map((transfer) => {
            const remainingPercent = clampPercent(transfer.transferLeftPercent)
            const usagePercent = clampPercent(100 - remainingPercent)

            return (
              <div
                key={`${transfer.id}-${transfer.rule}-${transfer.serverName}-${transfer.from}`}
                className="w-full rounded-lg border bg-card bg-white px-4 py-3.5 text-card-foreground transition-all duration-200 hover:shadow-xs dark:shadow-none"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-neutral-800 text-sm dark:text-neutral-200">
                      {transfer.serverName}
                    </span>
                    <div className="rounded bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-600 text-xs dark:text-emerald-400">
                      {transfer.rule}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-1">
                        <span className="font-medium text-neutral-800 text-sm dark:text-neutral-200">
                          {transfer.currentUsage}
                        </span>
                        <span className="text-neutral-500 text-xs dark:text-neutral-400">
                          / {transfer.max}
                        </span>
                      </div>
                      <span className="font-medium text-neutral-600 text-xs dark:text-neutral-300">
                        {usagePercent.toFixed(1)}%
                      </span>
                    </div>

                    <Progress
                      value={usagePercent}
                      indicatorClassName={getUsageIndicatorClass(remainingPercent)}
                      className="h-1.5"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                    <span>
                      {formatCycleDate(transfer.from)} - {formatCycleDate(transfer.to)}
                    </span>
                    <span>
                      {t("nextUpdate")}: {formatNextUpdate(transfer.nextCheck)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </section>
      )}

      {hasMonitors && (
        <section
          className={cn("grid grid-cols-1 gap-2 md:gap-4", {
            "mt-4 md:grid-cols-2": hasTraffic,
          })}
        >
          {data?.monitors.map((monitor) => (
            <div
              key={`${monitor.type}-${monitor.name}`}
              className="w-full space-y-3 rounded-lg border bg-card bg-white px-4 py-4 text-card-foreground shadow-lg shadow-neutral-200/40 dark:shadow-none"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-2.5 w-2.5 rounded-full transition-colors",
                      getStatusDotClass(monitor.status, monitor.availability),
                    )}
                  />
                  <span className="font-medium text-sm">{monitor.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "font-medium text-sm transition-colors",
                      getDelayColor(monitor.averageDelay),
                    )}
                  >
                    {monitor.averageDelay.toFixed(0)}ms
                  </span>
                  <Separator className="h-4" orientation="vertical" />
                  <span
                    className={cn(
                      "font-medium text-sm transition-colors",
                      getUptimeColor(monitor.availability),
                    )}
                  >
                    {monitor.availability.toFixed(1)}% {t("uptime")}
                  </span>
                </div>
              </div>

              <div className="flex gap-[3px] rounded-lg bg-muted/30 p-1">
                {monitor.daily.map((point, index) => (
                  <TooltipProvider delayDuration={50} key={`${monitor.name}-${point.label}-${index}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "relative h-7 flex-1 cursor-help rounded-[4px] transition-all duration-200 before:absolute before:inset-0 before:rounded-[4px] before:bg-white/10 before:opacity-0 before:transition-opacity hover:before:opacity-100",
                            getDayClass(point.availability),
                          )}
                        />
                      </TooltipTrigger>
                      <TooltipContent className="overflow-hidden p-0">
                        <div className="bg-popover px-3 py-2">
                          <p className="mb-2 font-medium text-sm">{point.label}</p>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground text-xs">{t("uptime")}:</span>
                              <span
                                className={cn(
                                  "font-medium text-xs",
                                  point.availability > 95 ? "text-green-500" : "text-red-500",
                                )}
                              >
                                {point.availability.toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground text-xs">{t("delay")}:</span>
                              <span
                                className={cn(
                                  "font-medium text-xs",
                                  point.delay < 100
                                    ? "text-green-500"
                                    : point.delay < 300
                                      ? "text-yellow-500"
                                      : "text-red-500",
                                )}
                              >
                                {point.delay.toFixed(0)}ms
                              </span>
                            </div>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>

              <div className="flex justify-between text-stone-500 text-xs dark:text-stone-400">
                <span>30 {t("daysAgo")}</span>
                <span>{t("today")}</span>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
