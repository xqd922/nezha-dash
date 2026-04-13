"use client"

import { ExclamationTriangleIcon } from "@heroicons/react/20/solid"
import { useLocale, useTranslations } from "next-intl"
import { useServerData } from "@/app/context/server-data-context"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { ServiceMonitorStatus } from "@/lib/drivers/types"
import { cn } from "@/lib/utils"

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
    return "bg-linear-to-b from-green-500/90 to-green-600 shadow-[0_1px_2px_rgba(22,163,74,0.3)]"
  }

  return "bg-linear-to-b from-red-500/80 to-red-600/90 shadow-[0_1px_2px_rgba(220,38,38,0.3)]"
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

function toBrowserLocale(locale: string) {
  if (locale === "zh") return "zh-CN"
  if (locale === "zh-TW") return "zh-TW"
  return locale
}

function formatDate(date: Date, locale: string) {
  return date.toLocaleDateString(toBrowserLocale(locale))
}

function formatDateTime(date: Date, locale: string) {
  return date.toLocaleString(toBrowserLocale(locale))
}

function formatCycleDate(value: string, locale: string) {
  const parsedDate = parseDateTime(value)
  return parsedDate ? formatDate(parsedDate, locale) : value
}

function formatNextUpdate(value: string, locale: string) {
  const relativeDate = parseRelativeDuration(value)
  if (relativeDate) {
    return formatDateTime(relativeDate, locale)
  }

  const parsedDate = parseDateTime(value)
  if (parsedDate) {
    return formatDateTime(parsedDate, locale)
  }

  return value
}

export default function ServiceStatsSection() {
  const locale = useLocale()
  const t = useTranslations("ServiceStatsSection")
  const { data: serverData, error, isLoading } = useServerData()

  if (error) {
    return (
      <div className="mt-4 flex items-center gap-1 font-medium text-sm">
        <ExclamationTriangleIcon className="h-4 w-4" />
        {t("error")}
      </div>
    )
  }

  if (isLoading && !serverData) {
    return null
  }

  if (!serverData) {
    return null
  }

  const serviceStats = serverData.service_stats
  if (serviceStats === null || serviceStats === undefined) {
    return null
  }

  const hasTraffic = (serviceStats.cycleTransfers.length ?? 0) > 0
  const hasMonitors = (serviceStats.monitors.length ?? 0) > 0

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
          {serviceStats.cycleTransfers.map((transfer) => {
            const remainingPercent = clampPercent(transfer.transferLeftPercent)
            const usagePercent = clampPercent(100 - remainingPercent)

            return (
              <div
                key={`${transfer.id}-${transfer.rule}-${transfer.serverName}-${transfer.from}`}
                className="w-full rounded-lg border bg-white bg-card px-4 py-3.5 text-card-foreground transition-all duration-200 hover:shadow-xs dark:shadow-none"
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

                    <div className="relative h-1.5">
                      <div className="absolute inset-0 rounded-full bg-neutral-100 dark:bg-neutral-800" />
                      <div
                        className={cn(
                          "absolute inset-y-0 left-0 rounded-full transition-all duration-300",
                          getUsageIndicatorClass(remainingPercent),
                        )}
                        style={{ width: `${Math.min(usagePercent, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                    <span>
                      {formatCycleDate(transfer.from, locale)} - {formatCycleDate(transfer.to, locale)}
                    </span>
                    <span>
                      {t("nextUpdate")}: {formatNextUpdate(transfer.nextCheck, locale)}
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
          {serviceStats.monitors.map((monitor) => (
            <div
              key={`${monitor.type}-${monitor.name}`}
              className="w-full space-y-3 rounded-lg border bg-white bg-card px-4 py-4 text-card-foreground shadow-lg shadow-neutral-200/40 dark:shadow-none"
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
                            "relative h-7 flex-1 cursor-help rounded-[4px] transition-all duration-200 before:absolute before:inset-0 before:rounded-[4px] before:bg-white/10 before:opacity-0 before:transition-opacity hover:before:opacity-100 after:absolute after:inset-0 after:rounded-[4px] after:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]",
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
