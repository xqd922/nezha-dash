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

  return (
    <Progress
      value={clampedValue}
      className={cn("h-1 w-[92px] max-w-full rounded-sm", className)}
      indicatorClassName={
        clampedValue < 30 ? "bg-red-500" : clampedValue < 70 ? "bg-orange-400" : "bg-green-500"
      }
    />
  )
}
