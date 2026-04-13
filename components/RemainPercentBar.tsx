"use client"

import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

export default function RemainPercentBar({
  value,
  className,
}: {
  value: number
  className?: string
}) {
  const clampedValue = Math.max(0, Math.min(100, value))
  const indicatorClassName =
    clampedValue > 60 ? "bg-green-500" : clampedValue > 30 ? "bg-amber-500" : "bg-red-500"

  return (
    <Progress
      value={clampedValue}
      className={cn("h-1.5 w-full bg-muted/70", className)}
      indicatorClassName={indicatorClassName}
    />
  )
}
