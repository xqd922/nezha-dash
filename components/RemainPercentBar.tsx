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
  return (
    <Progress
      aria-label={"Server Usage Bar"}
      aria-labelledby={"Server Usage Bar"}
      value={value}
      className={cn("h-[3px] w-[70px] rounded-sm", className)}
      indicatorClassName={value < 30 ? "bg-red-500" : value < 70 ? "bg-orange-400" : "bg-green-500"}
    />
  )
}
