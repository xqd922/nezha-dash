import Link from "next/link"
import { useTranslations } from "next-intl"
import BillingInfo from "@/components/BillingInfo"
import PlanInfo from "@/components/PlanInfo"
import ServerFlag from "@/components/ServerFlag"
import ServerUsageBar from "@/components/ServerUsageBar"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import type { NezhaAPISafe } from "@/lib/drivers/types"
import getEnv from "@/lib/env-entry"
import { GetFontLogoClass, GetOsName, MageMicrosoftWindows } from "@/lib/logo-class"
import { cn, formatBytes, formatNezhaInfo, formatSpeed, parsePublicNote } from "@/lib/utils"

export default function ServerCard({ serverInfo }: { serverInfo: NezhaAPISafe }) {
  const t = useTranslations("ServerCard")
  const { id, name, country_code, online, cpu, up, down, mem, stg, host, public_note } =
    formatNezhaInfo(serverInfo)

  const showFlag = getEnv("NEXT_PUBLIC_ShowFlag") === "true"
  const showNetTransfer = getEnv("NEXT_PUBLIC_ShowNetTransfer") === "true"
  const fixedTopServerName = getEnv("NEXT_PUBLIC_FixedTopServerName") === "true"
  const parsedData = parsePublicNote(public_note)

  const saveSession = () => {
    sessionStorage.setItem("fromMainPage", "true")
  }

  return online ? (
    <Link onClick={saveSession} href={`/server/${id}`} prefetch={true}>
      <Card
        className={cn(
          "flex cursor-pointer flex-col items-center justify-start gap-3 p-3 transition-colors hover:bg-accent/50 md:px-5",
          {
            "flex-col": fixedTopServerName,
            "lg:flex-row": !fixedTopServerName,
          },
        )}
      >
        <section
          className={cn("grid items-center gap-2", {
            "lg:w-40": !fixedTopServerName,
          })}
          style={{ gridTemplateColumns: "auto auto 1fr" }}
        >
          <span className="h-2 w-2 shrink-0 self-center rounded-full bg-green-500" />
          <div
            className={cn(
              "flex items-center justify-center",
              showFlag ? "min-w-[17px]" : "min-w-0",
            )}
          >
            {showFlag ? <ServerFlag country_code={country_code} /> : null}
          </div>
          <div className="relative flex flex-col">
            <p
              className={cn(
                "break-normal font-bold tracking-tight",
                showFlag ? "text-xs" : "text-sm",
              )}
            >
              {name}
            </p>
            <div
              className={cn("hidden lg:block", {
                "lg:hidden": fixedTopServerName,
              })}
            >
              {parsedData?.billingDataMod && <BillingInfo parsedData={parsedData} />}
            </div>
          </div>
        </section>
        <div
          className={cn("-mt-2 flex items-center gap-2 lg:hidden", {
            "lg:flex": fixedTopServerName,
          })}
        >
          {parsedData?.billingDataMod && <BillingInfo parsedData={parsedData} />}
        </div>
        <div className="flex flex-col items-center gap-2 lg:items-start">
          <section
            className={cn("grid grid-cols-5 items-center gap-3", {
              "lg:grid-cols-6 lg:gap-4": fixedTopServerName,
            })}
          >
            {fixedTopServerName && (
              <div className={"col-span-1 hidden items-center gap-2 lg:flex lg:flex-row"}>
                <div className="font-semibold text-xs">
                  {host.Platform.includes("Windows") ? (
                    <MageMicrosoftWindows className="size-[10px]" />
                  ) : (
                    <p className={`fl-${GetFontLogoClass(host.Platform)}`} />
                  )}
                </div>
                <div className={"flex w-14 flex-col"}>
                  <p className="text-muted-foreground text-xs">{t("System")}</p>
                  <div className="flex items-center font-semibold text-[10.5px]">
                    {host.Platform.includes("Windows") ? "Windows" : GetOsName(host.Platform)}
                  </div>
                </div>
              </div>
            )}
            <div className={"flex w-14 flex-col"}>
              <p className="text-muted-foreground text-xs">{t("CPU")}</p>
              <div className="flex items-center font-semibold text-xs">{cpu.toFixed(2)}%</div>
              <ServerUsageBar value={cpu} />
            </div>
            <div className={"flex w-14 flex-col"}>
              <p className="text-muted-foreground text-xs">{t("Mem")}</p>
              <div className="flex items-center font-semibold text-xs">{mem.toFixed(2)}%</div>
              <ServerUsageBar value={mem} />
            </div>
            <div className={"flex w-14 flex-col"}>
              <p className="text-muted-foreground text-xs">{t("STG")}</p>
              <div className="flex items-center font-semibold text-xs">{stg.toFixed(2)}%</div>
              <ServerUsageBar value={stg} />
            </div>
            <div className={"flex w-14 flex-col"}>
              <p className="text-muted-foreground text-xs">{t("Upload")}</p>
              <div className="flex items-center font-semibold text-xs">{formatSpeed(up)}</div>
            </div>
            <div className={"flex w-14 flex-col"}>
              <p className="text-muted-foreground text-xs">{t("Download")}</p>
              <div className="flex items-center font-semibold text-xs">{formatSpeed(down)}</div>
            </div>
          </section>
          {showNetTransfer && (
            <section className={"flex w-full items-center justify-between gap-1"}>
              <Badge
                variant="secondary"
                className="flex-1 items-center justify-center text-nowrap rounded-[8px] border-muted-50 text-[11px] shadow-md shadow-neutral-200/30 dark:shadow-none"
              >
                {t("Upload")}:{formatBytes(serverInfo.status.NetOutTransfer)}
              </Badge>
              <Badge
                variant="outline"
                className="flex-1 items-center justify-center text-nowrap rounded-[8px] text-[11px] shadow-md shadow-neutral-200/30 dark:shadow-none"
              >
                {t("Download")}:{formatBytes(serverInfo.status.NetInTransfer)}
              </Badge>
            </section>
          )}
          {parsedData?.planDataMod && <PlanInfo parsedData={parsedData} />}
        </div>
      </Card>
    </Link>
  ) : (
    <Link onClick={saveSession} href={`/server/${id}`} prefetch={true}>
      <Card
        className={cn(
          "flex cursor-pointer flex-col items-center justify-start gap-3 p-3 transition-colors hover:bg-accent/50 sm:gap-0 md:px-5",
          showNetTransfer ? "min-h-[123px] lg:min-h-[91px]" : "min-h-[93px] lg:min-h-[61px]",
          {
            "flex-col": fixedTopServerName,
            "lg:flex-row": !fixedTopServerName,
          },
        )}
      >
        <section
          className={cn("grid items-center gap-2", {
            "lg:w-40": !fixedTopServerName,
          })}
          style={{ gridTemplateColumns: "auto auto 1fr" }}
        >
          <span className="h-2 w-2 shrink-0 self-center rounded-full bg-red-500" />
          <div
            className={cn(
              "flex items-center justify-center",
              showFlag ? "min-w-[17px]" : "min-w-0",
            )}
          >
            {showFlag ? <ServerFlag country_code={country_code} /> : null}
          </div>
          <div className="relative flex flex-col">
            <p
              className={cn(
                "max-w-[108px] break-normal font-bold tracking-tight",
                showFlag ? "text-xs" : "text-sm",
              )}
            >
              {name}
            </p>
            <div
              className={cn("hidden lg:block", {
                "lg:hidden": fixedTopServerName,
              })}
            >
              {parsedData?.billingDataMod && <BillingInfo parsedData={parsedData} />}
            </div>
          </div>
        </section>
        <div
          className={cn("flex items-center gap-2 lg:hidden", {
            "lg:flex": fixedTopServerName,
          })}
        >
          {parsedData?.billingDataMod && <BillingInfo parsedData={parsedData} />}
        </div>
        {parsedData?.planDataMod && <PlanInfo parsedData={parsedData} />}
      </Card>
    </Link>
  )
}
