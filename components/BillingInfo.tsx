"use client"

import { useTranslations } from "next-intl"
import RemainPercentBar from "@/components/RemainPercentBar"
import { cn, getDaysBetweenDatesWithAutoRenewal, type PublicNoteData } from "@/lib/utils"

export default function BillingInfo({ parsedData }: { parsedData: PublicNoteData }) {
  const t = useTranslations("billingInfo")

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
        return (
          <div className={cn("text-[11px] text-muted-foreground text-red-600 leading-tight")}>
            {t("remaining")}: {t("error")}
          </div>
        )
      }
    }
  }

  const amount = parsedData.billingDataMod.amount

  return daysLeftObject.days >= 0 ? (
    <>
      {amount && amount !== "0" && amount !== "-1" ? (
        <p className="text-[11px] text-muted-foreground leading-tight">
          {t("price")}: {amount}/{parsedData.billingDataMod.cycle}
        </p>
      ) : amount === "0" ? (
        <p className="text-[11px] text-green-600 leading-tight">{t("free")}</p>
      ) : amount === "-1" ? (
        <p className="text-[11px] text-pink-600 leading-tight">{t("usage-based")}</p>
      ) : null}

      {hasBillingDates && (
        <div className="text-[11px] text-muted-foreground leading-tight">
          {t("remaining")}:{" "}
          {isNeverExpire ? t("indefinite") : `${daysLeftObject.days} ${t("days")}`}
        </div>
      )}

      {hasBillingDates && !isNeverExpire && (
        <RemainPercentBar className="mt-0.5" value={daysLeftObject.remainingPercentage * 100} />
      )}
    </>
  ) : (
    <>
      {amount && amount !== "0" && amount !== "-1" ? (
        <p className="text-[11px] text-muted-foreground leading-tight">
          {t("price")}: {amount}/{parsedData.billingDataMod.cycle}
        </p>
      ) : amount === "0" ? (
        <p className="text-[11px] text-green-600 leading-tight">{t("free")}</p>
      ) : amount === "-1" ? (
        <p className="text-[11px] text-pink-600 leading-tight">{t("usage-based")}</p>
      ) : null}

      <p className={cn("text-[11px] text-muted-foreground text-red-600 leading-tight")}>
        {t("expired")}: {daysLeftObject.days * -1} {t("days")}
      </p>
    </>
  )
}
