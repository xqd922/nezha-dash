"use client"

import { cn, type PublicNoteData } from "@/lib/utils"

export default function PlanInfo({ parsedData }: { parsedData: PublicNoteData }) {
  if (!parsedData.planDataMod) {
    return null
  }

  const extraList =
    parsedData.planDataMod.extra.split(",").length > 1
      ? parsedData.planDataMod.extra.split(",")
      : parsedData.planDataMod.extra.split(",")[0] === ""
        ? []
        : [parsedData.planDataMod.extra]

  const networkRoutes = parsedData.planDataMod.networkRoute
    ? parsedData.planDataMod.networkRoute.split(",")
    : []

  return (
    <section className="mt-0.5 flex flex-wrap items-center gap-1">
      {parsedData.planDataMod.bandwidth !== "" && (
        <p
          className={cn(
            "w-fit rounded-[5px] bg-blue-600 px-[3px] py-[1.5px] text-[9px] text-blue-200 dark:bg-blue-800 dark:text-blue-300",
          )}
        >
          {parsedData.planDataMod.bandwidth}
        </p>
      )}
      {parsedData.planDataMod.trafficVol !== "" && (
        <p
          className={cn(
            "w-fit rounded-[5px] bg-green-600 px-[3px] py-[1.5px] text-[9px] text-green-200 dark:bg-green-800 dark:text-green-300",
          )}
        >
          {parsedData.planDataMod.trafficVol}
        </p>
      )}
      {parsedData.planDataMod.IPv4 === "1" && (
        <p
          className={cn(
            "w-fit rounded-[5px] bg-purple-600 px-[3px] py-[1.5px] text-[9px] text-purple-200 dark:bg-purple-800 dark:text-purple-300",
          )}
        >
          IPv4
        </p>
      )}
      {parsedData.planDataMod.IPv6 === "1" && (
        <p
          className={cn(
            "w-fit rounded-[5px] bg-pink-600 px-[3px] py-[1.5px] text-[9px] text-pink-200 dark:bg-pink-800 dark:text-pink-300",
          )}
        >
          IPv6
        </p>
      )}
      {parsedData.planDataMod.networkRoute && (
        <p
          className={cn(
            "w-fit rounded-[5px] bg-blue-600 px-[3px] py-[1.5px] text-[9px] text-blue-200 dark:bg-blue-800 dark:text-blue-300",
          )}
        >
          {networkRoutes.join("·")}
        </p>
      )}
      {extraList.map((extra) => (
        <p
          key={extra}
          className={cn(
            "w-fit rounded-[5px] bg-stone-600 px-[3px] py-[1.5px] text-[9px] text-stone-200 dark:bg-stone-800 dark:text-stone-300",
          )}
        >
          {extra}
        </p>
      ))}
    </section>
  )
}
