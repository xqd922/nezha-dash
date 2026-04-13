"use client"

import RemainPercentBar from "@/components/RemainPercentBar"
import {
  getDaysBetweenDatesWithAutoRenewal,
  type PublicNoteData,
} from "@/lib/utils"

export default function BillingInfo({ parsedData }: { parsedData: PublicNoteData }) {
  if (!parsedData.billingDataMod) {
    return null
  }

  let isNeverExpire = false
  let daysLeftObject = {
    days: 0,
    cycleLabel: "",
    remainingPercentage: 0,
  }

  const hasBillingDates =
    Boolean(parsedData.billingDataMod.startDate) || Boolean(parsedData.billingDataMod.endDate)

  if (parsedData.billingDataMod.endDate) {
    if (parsedData.billingDataMod.endDate.startsWith("0000-00-00")) {
      isNeverExpire = true
    } else {
      try {
        daysLeftObject = getDaysBetweenDatesWithAutoRenewal(parsedData.billingDataMod)
      } catch (error) {
        console.error(error)
        return <div className="text-[10px] text-red-600">Remaining: Error</div>
      }
    }
  }

  const amount = parsedData.billingDataMod.amount

  return (
    <>
      {amount && amount !== "0" && amount !== "-1" ? (
        <p className="text-[10px] text-muted-foreground">
          Price: {amount}/{parsedData.billingDataMod.cycle}
        </p>
      ) : amount === "0" ? (
        <p className="text-[10px] text-green-600">Free</p>
      ) : amount === "-1" ? (
        <p className="text-[10px] text-pink-600">Usage-based</p>
      ) : null}

      {hasBillingDates ? (
        daysLeftObject.days >= 0 ? (
          <>
            <div className="text-[10px] text-muted-foreground">
              Remaining: {isNeverExpire ? "Indefinite" : `${daysLeftObject.days} days`}
            </div>
            {!isNeverExpire && (
              <RemainPercentBar
                className="mt-0.5"
                value={daysLeftObject.remainingPercentage * 100}
              />
            )}
          </>
        ) : (
          <p className="text-[10px] text-red-600">
            Expired: {daysLeftObject.days * -1} days
          </p>
        )
      ) : null}
    </>
  )
}
