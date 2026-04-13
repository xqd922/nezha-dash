import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { NezhaAPISafe } from "@/lib/drivers/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function toPercentage(used: number, total: number) {
  if (total <= 0) {
    return 0
  }

  return (used / total) * 100
}

export function formatNezhaInfo(serverInfo: NezhaAPISafe) {
  return {
    ...serverInfo,
    cpu: serverInfo.status.CPU,
    gpu: serverInfo.status.GPU || 0,
    process: serverInfo.status.ProcessCount || 0,
    up: serverInfo.status.NetOutSpeed / 1024 / 1024 || 0,
    down: serverInfo.status.NetInSpeed / 1024 / 1024 || 0,
    last_active_time_string: serverInfo.last_active
      ? new Date(serverInfo.last_active * 1000).toLocaleString()
      : "",
    boot_time: serverInfo.host.BootTime,
    boot_time_string: serverInfo.host.BootTime
      ? new Date(serverInfo.host.BootTime * 1000).toLocaleString()
      : "",
    online: serverInfo.online_status,
    uptime: serverInfo.status.Uptime || 0,
    version: serverInfo.host.Version || null,
    tcp: serverInfo.status.TcpConnCount || 0,
    udp: serverInfo.status.UdpConnCount || 0,
    arch: serverInfo.host.Arch || "",
    mem_total: serverInfo.host.MemTotal || 0,
    swap_total: serverInfo.host.SwapTotal || 0,
    disk_total: serverInfo.host.DiskTotal || 0,
    platform: serverInfo.host.Platform || "",
    platform_version: serverInfo.host.PlatformVersion || "",
    mem: toPercentage(serverInfo.status.MemUsed, serverInfo.host.MemTotal),
    swap: toPercentage(serverInfo.status.SwapUsed, serverInfo.host.SwapTotal),
    disk: toPercentage(serverInfo.status.DiskUsed, serverInfo.host.DiskTotal),
    stg: toPercentage(serverInfo.status.DiskUsed, serverInfo.host.DiskTotal),
    net_out_transfer: serverInfo.status.NetOutTransfer || 0,
    net_in_transfer: serverInfo.status.NetInTransfer || 0,
    public_note: handlePublicNote(serverInfo.id, serverInfo.public_note || ""),
    country_code: serverInfo.host.CountryCode,
    cpu_info: serverInfo.host.CPU || [],
    gpu_info: serverInfo.host.GPU || [],
    load_1: serverInfo.status.Load1?.toFixed(2) || 0.0,
    load_5: serverInfo.status.Load5?.toFixed(2) || 0.0,
    load_15: serverInfo.status.Load15?.toFixed(2) || 0.0,
  }
}

export function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return "0 Bytes"

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"]

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`
}

export function formatSpeed(valueInMiB: number): string {
  if (valueInMiB >= 1024) {
    return `${(valueInMiB / 1024).toFixed(2)}G/s`
  }

  if (valueInMiB >= 1) {
    return `${valueInMiB.toFixed(2)}M/s`
  }

  return `${(valueInMiB * 1024).toFixed(2)}K/s`
}

export function getDaysBetweenDates(date1: string, date2: string): number {
  const oneDay = 24 * 60 * 60 * 1000 // 一天的毫秒数
  const firstDate = new Date(date1)
  const secondDate = new Date(date2)

  // 计算两个日期之间的天数差异
  return Math.round((firstDate.getTime() - secondDate.getTime()) / oneDay)
}

export const fetcher = (url: string) =>
  fetch(url)
    .then((res) => {
      if (!res.ok) {
        throw new Error(res.statusText)
      }
      return res.json()
    })
    .then((data) => data.data)
    .catch((err) => {
      console.error(err)
      throw err
    })

export const nezhaFetcher = async (url: string) => {
  const res = await fetch(url)

  if (!res.ok) {
    const error = new Error("An error occurred while fetching the data.")
    // @ts-expect-error - res.json() returns a Promise<any>
    error.info = await res.json()
    // @ts-expect-error - res.status is a number
    error.status = res.status
    throw error
  }

  return res.json()
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days}d`
  }
  if (hours > 0) {
    return `${hours}h`
  }
  if (minutes > 0) {
    return `${minutes}m`
  }
  if (seconds >= 0) {
    return `${seconds}s`
  }
  return "0s"
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  const seconds = date.getSeconds().toString().padStart(2, "0")
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

export function formatTime12(timestamp: number): string {
  // example: 3:45 PM
  const date = new Date(timestamp)
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const ampm = hours >= 12 ? "PM" : "AM"
  const hours12 = hours % 12 || 12
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${ampm}`
}

export interface BillingData {
  startDate: string
  endDate: string
  autoRenewal: string
  cycle: string
  amount: string
}

export interface PlanData {
  bandwidth: string
  trafficVol: string
  trafficType: string
  IPv4: string
  IPv6: string
  networkRoute: string
  extra: string
}

export interface PublicNoteData {
  billingDataMod?: BillingData
  planDataMod?: PlanData
}

export function parsePublicNote(publicNote: string): PublicNoteData | null {
  try {
    if (!publicNote) {
      return null
    }

    const data = JSON.parse(publicNote)
    if (!data.billingDataMod && !data.planDataMod) {
      return null
    }

    const result: PublicNoteData = {}

    if (data.billingDataMod) {
      result.billingDataMod = {
        startDate: data.billingDataMod.startDate || "",
        endDate: data.billingDataMod.endDate || "",
        autoRenewal: data.billingDataMod.autoRenewal || "",
        cycle: data.billingDataMod.cycle || "",
        amount: data.billingDataMod.amount || "",
      }
    }

    if (data.planDataMod) {
      result.planDataMod = {
        bandwidth: data.planDataMod.bandwidth || "",
        trafficVol: data.planDataMod.trafficVol || "",
        trafficType: data.planDataMod.trafficType || "",
        IPv4: data.planDataMod.IPv4 || "",
        IPv6: data.planDataMod.IPv6 || "",
        networkRoute: data.planDataMod.networkRoute || "",
        extra: data.planDataMod.extra || "",
      }
    }

    return result.billingDataMod || result.planDataMod ? result : null
  } catch (error) {
    console.error("Error parsing public note:", error)
    return null
  }
}

export function handlePublicNote(serverId: number, publicNote: string): string {
  if (typeof window === "undefined") {
    return publicNote || ""
  }

  const storageKey = `server_${serverId}_public_note`
  const storedNote = sessionStorage.getItem(storageKey)

  if (!publicNote && storedNote) {
    return storedNote
  }

  if (publicNote) {
    sessionStorage.setItem(storageKey, publicNote)
    return publicNote
  }

  return ""
}

export function getNextCycleTime(startDate: number, months: number, specifiedDate: number): number {
  if (!Number.isFinite(startDate) || months <= 0 || !Number.isFinite(specifiedDate)) {
    throw new Error("Invalid billing cycle inputs")
  }

  const start = new Date(startDate)
  const checkDate = new Date(specifiedDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(checkDate.getTime())) {
    throw new Error("Invalid billing cycle dates")
  }

  let nextDate = new Date(start)
  while (nextDate.getTime() <= checkDate.getTime()) {
    nextDate = new Date(nextDate)
    nextDate.setMonth(nextDate.getMonth() + months)
  }

  return nextDate.getTime()
}

export function getDaysBetweenDatesWithAutoRenewal({
  autoRenewal,
  cycle,
  startDate,
  endDate,
}: BillingData): {
  days: number
  cycleLabel: string
  remainingPercentage: number
} {
  let months = 1
  let cycleLabel = cycle

  switch (cycle.toLowerCase()) {
    case "月":
    case "m":
    case "mo":
    case "month":
    case "monthly":
      cycleLabel = "月"
      months = 1
      break
    case "年":
    case "y":
    case "yr":
    case "year":
    case "annual":
      cycleLabel = "年"
      months = 12
      break
    case "季":
    case "q":
    case "qr":
    case "quarterly":
      cycleLabel = "季"
      months = 3
      break
    case "半年":
    case "h":
    case "half":
    case "semi-annually":
      cycleLabel = "半年"
      months = 6
      break
    default:
      break
  }

  const nowTime = Date.now()
  const endTime = new Date(endDate).getTime()

  if (autoRenewal !== "1") {
    const totalDays = Math.max(1, getDaysBetweenDates(endDate, startDate))
    const days = getDaysBetweenDates(endDate, new Date(nowTime).toISOString())
    return {
      days,
      cycleLabel,
      remainingPercentage: Math.min(1, days / totalDays),
    }
  }

  if (nowTime < endTime) {
    const days = getDaysBetweenDates(endDate, new Date(nowTime).toISOString())
    return {
      days,
      cycleLabel,
      remainingPercentage: Math.min(1, days / (30 * months)),
    }
  }

  const nextTime = getNextCycleTime(endTime, months, nowTime)
  const diff = getDaysBetweenDates(
    new Date(nextTime).toISOString(),
    new Date(nowTime).toISOString(),
  )
  return {
    days: diff,
    cycleLabel,
    remainingPercentage: Math.min(1, diff / (30 * months)),
  }
}

// Emoji flag to country code mapping
const EMOJI_TO_COUNTRY_CODE: { [key: string]: string } = {
  "🇭🇰": "HK", // Hong Kong
  "🇨🇳": "CN", // China
  "🇯🇵": "JP", // Japan
  "🇸🇬": "SG", // Singapore
  "🇩🇪": "DE", // Germany
  "🇳🇱": "NL", // Netherlands
  "🇺🇸": "US", // United States
  "🇬🇧": "GB", // United Kingdom
  "🇫🇷": "FR", // France
  "🇰🇷": "KR", // South Korea
  "🇦🇺": "AU", // Australia
  "🇨🇦": "CA", // Canada
  "🇧🇷": "BR", // Brazil
  "🇮🇳": "IN", // India
  "🇷🇺": "RU", // Russia
  "🇮🇹": "IT", // Italy
  "🇪🇸": "ES", // Spain
  "🇹🇼": "TW", // Taiwan
  "🇲🇴": "MO", // Macau
  "🇹🇭": "TH", // Thailand
  "🇲🇾": "MY", // Malaysia
  "🇻🇳": "VN", // Vietnam
  "🇵🇭": "PH", // Philippines
  "🇮🇩": "ID", // Indonesia
  "🇳🇴": "NO", // Norway
  "🇸🇪": "SE", // Sweden
  "🇫🇮": "FI", // Finland
  "🇩🇰": "DK", // Denmark
  "🇨🇭": "CH", // Switzerland
  "🇦🇹": "AT", // Austria
  "🇧🇪": "BE", // Belgium
  "🇮🇪": "IE", // Ireland
  "🇵🇹": "PT", // Portugal
  "🇵🇱": "PL", // Poland
  "🇨🇿": "CZ", // Czech Republic
  "🇭🇺": "HU", // Hungary
  "🇬🇷": "GR", // Greece
  "🇹🇷": "TR", // Turkey
  "🇺🇦": "UA", // Ukraine
  "🇷🇴": "RO", // Romania
  "🇧🇬": "BG", // Bulgaria
  "🇭🇷": "HR", // Croatia
  "🇸🇮": "SI", // Slovenia
  "🇸🇰": "SK", // Slovakia
  "🇱🇹": "LT", // Lithuania
  "🇱🇻": "LV", // Latvia
  "🇪🇪": "EE", // Estonia
  "🇮🇸": "IS", // Iceland
  "🇱🇺": "LU", // Luxembourg
  "🇲🇹": "MT", // Malta
  "🇨🇾": "CY", // Cyprus
}

// Function to check if a string is an emoji flag
export function isEmojiFlag(str: string): boolean {
  const flagEmojiRegex = /[\u{1F1E6}-\u{1F1FF}]{2}/u
  return flagEmojiRegex.test(str)
}

// Function to convert emoji flag to country code
export function convertEmojiToCountryCode(emoji: string): string | null {
  if (!isEmojiFlag(emoji)) {
    return emoji.toUpperCase() // Return as-is if it's already a country code
  }
  return EMOJI_TO_COUNTRY_CODE[emoji] || null
}

// Function to get country code for map display (handles both emoji and country codes)
export function getCountryCodeForMap(countryIdentifier: string): string | null {
  if (!countryIdentifier) return null

  // If it's an emoji, convert it to country code
  if (isEmojiFlag(countryIdentifier)) {
    return EMOJI_TO_COUNTRY_CODE[countryIdentifier] || null
  }

  // If it's already a country code, return as-is
  return countryIdentifier.toUpperCase()
}
