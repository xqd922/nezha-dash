/**
 * Nezha monitoring system driver implementation
 */

import { connection } from "next/server"
import type { MakeOptional } from "@/app/types/utils"
import getEnv from "@/lib/env-entry"
import { BaseDriver } from "../base"
import type {
  DriverConfig,
  NezhaAPI,
  NezhaAPIMonitor,
  ServerApi,
  ServiceCycleTransfer,
  ServiceMonitor,
  ServiceMonitorDailyPoint,
  ServiceMonitorStatus,
  ServiceStats,
} from "../types"
import { DriverOperationError } from "../types"

type RawServiceMonitor = {
  Monitor?: {
    Type?: number
    Name?: string
  }
  CurrentUp?: number | string
  CurrentDown?: number | string
  TotalUp?: number | string
  TotalDown?: number | string
  Up?: Array<number | string>
  Down?: Array<number | string>
  Delay?: Array<number | string>
}

type NezhaWsServer = {
  ID?: number | string
  id?: number | string
  PublicNote?: string
  public_note?: string
}

type NezhaWsOptions = {
  url: string
  headers?: Record<string, string>
}

const PUBLIC_NOTE_CACHE_TTL_MS = 60_000

const publicNoteCache: {
  data: Map<number, string>
  expiresAt: number
  promise: Promise<Map<number, string>> | null
} = {
  data: new Map<number, string>(),
  expiresAt: 0,
  promise: null,
}

export class NezhaDriver extends BaseDriver {
  private authToken: string | null = null

  constructor() {
    super("nezha", {
      supportsMonitoring: true,
      supportsRealTimeData: true,
      supportsHistoricalData: true,
      supportsIpInfo: true,
      supportsPacketLoss: true,
      supportsServiceStats: true,
      supportsAlerts: false,
    })
  }

  protected async onInitialize(config: DriverConfig): Promise<void> {
    this.authToken = config.auth || getEnv("NezhaAuth") || null

    if (!this.authToken) {
      throw new DriverOperationError(this.name, "initialize", "Authorization token is required")
    }
  }

  async getServers(): Promise<ServerApi> {
    await connection()
    this.ensureInitialized()

    const response = await fetch(`${this.config?.baseUrl}/api/v1/server/details`, {
      ...this.createFetchOptions({
        Authorization: this.authToken || "",
      }),
    })

    const resData = await this.handleFetchResponse(response)

    if (!resData.result) {
      throw new DriverOperationError(this.name, "getServers", "'result' field is missing")
    }

    const nezhaData = resData.result as NezhaAPI[]
    const publicNotes = await this.getCachedPublicNotes()
    const data: ServerApi = {
      live_servers: 0,
      offline_servers: 0,
      total_out_bandwidth: 0,
      total_in_bandwidth: 0,
      total_in_speed: 0,
      total_out_speed: 0,
      result: [],
    }

    const forceShowAllServers = getEnv("ForceShowAllServers") === "true"
    const nezhaDataFiltered = forceShowAllServers
      ? nezhaData
      : nezhaData.filter((element) => !element.hide_for_guest)

    const timestamp = Date.now() / 1000
    data.result = nezhaDataFiltered.map(
      (element: MakeOptional<NezhaAPI, "ipv4" | "ipv6" | "valid_ip">) => {
        element.public_note = element.public_note || publicNotes.get(element.id) || ""
        const isOnline = timestamp - element.last_active <= 180
        element.online_status = isOnline

        if (isOnline) {
          data.live_servers += 1
          data.total_out_bandwidth += element.status.NetOutTransfer
          data.total_in_bandwidth += element.status.NetInTransfer
          data.total_in_speed += element.status.NetInSpeed
          data.total_out_speed += element.status.NetOutSpeed
        } else {
          data.offline_servers += 1
        }

        // Remove sensitive properties
        element.ipv4 = ""
        element.ipv6 = ""
        element.valid_ip = ""

        return element
      },
    )

    return data
  }

  async getServerDetail(serverId: number): Promise<NezhaAPI> {
    await connection()
    this.ensureInitialized()

    const response = await fetch(`${this.config?.baseUrl}/api/v1/server/details?id=${serverId}`, {
      ...this.createFetchOptions({
        Authorization: this.authToken || "",
      }),
    })

    const resData = await this.handleFetchResponse(response)
    const detailDataList = resData.result

    if (!detailDataList || !Array.isArray(detailDataList) || detailDataList.length === 0) {
      throw new DriverOperationError(
        this.name,
        "getServerDetail",
        "'result' field is missing or empty",
      )
    }

    const timestamp = Date.now() / 1000
    const publicNotes = await this.getCachedPublicNotes()
    const detailData = detailDataList.map((element) => {
      element.online_status = timestamp - element.last_active <= 180
      element.public_note = element.public_note || publicNotes.get(element.id) || ""
      element.ipv4 = ""
      element.ipv6 = ""
      element.valid_ip = ""
      return element
    })[0]

    return detailData
  }

  protected async onGetServerMonitor(serverId: number): Promise<NezhaAPIMonitor[]> {
    await connection()
    this.ensureInitialized()

    const response = await fetch(`${this.config?.baseUrl}/api/v1/monitor/${serverId}`, {
      ...this.createFetchOptions({
        Authorization: this.authToken || "",
      }),
    })

    const resData = await this.handleFetchResponse(response)
    const monitorData = resData.result as NezhaAPIMonitor[]

    if (!monitorData) {
      throw new DriverOperationError(this.name, "getServerMonitor", "'result' field is missing")
    }

    // Check if packet loss calculation is enabled (default to true for backward compatibility)
    const enablePacketLoss = getEnv("EnablePacketLossCalculation") !== "false"

    // Calculate packet loss for each monitor if enabled
    const enhancedMonitorData = monitorData.map((monitor) => {
      if (enablePacketLoss && monitor.avg_delay?.length > 0) {
        const packetLossRates = this.calculatePacketLoss(monitor.avg_delay)
        return {
          ...monitor,
          packet_loss: packetLossRates,
        } as NezhaAPIMonitor
      }
      return monitor
    })

    return enhancedMonitorData
  }

  protected async onGetServerIP(serverId: number): Promise<string> {
    await connection()
    this.ensureInitialized()

    const response = await fetch(`${this.config?.baseUrl}/api/v1/server/details`, {
      ...this.createFetchOptions({
        Authorization: this.authToken || "",
      }),
    })

    const resData = await this.handleFetchResponse(response)

    if (!resData.result) {
      throw new DriverOperationError(this.name, "getServerIP", "'result' field is missing")
    }

    const nezhaData = resData.result as NezhaAPI[]
    const server = nezhaData.find((element) => element.id === serverId)

    if (!server) {
      throw new DriverOperationError(
        this.name,
        "getServerIP",
        `Server with ID ${serverId} not found`,
      )
    }

    return server?.valid_ip || server?.ipv4 || server?.ipv6 || ""
  }

  protected async onGetServiceStats(): Promise<ServiceStats | null> {
    await connection()
    this.ensureInitialized()

    const response = await fetch(`${this.config?.baseUrl}/service`, {
      ...this.createFetchOptions({
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Authorization: this.authToken || "",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new DriverOperationError(
        this.name,
        "getServiceStats",
        `HTTP ${response.status}: ${errorText}`,
      )
    }

    const html = await response.text()

    return {
      fetchedAt: Date.now(),
      monitors: this.parseServiceMonitors(html),
      cycleTransfers: this.parseCycleTransfers(html),
    }
  }

  protected async onHealthCheck(): Promise<void> {
    this.ensureInitialized()

    const response = await fetch(`${this.config?.baseUrl}/api/v1/server/details`, {
      ...this.createFetchOptions({
        Authorization: this.authToken || "",
      }),
    })

    if (!response.ok) {
      throw new DriverOperationError(this.name, "healthCheck", `HTTP ${response.status}`)
    }
  }

  private async getCachedPublicNotes(): Promise<Map<number, string>> {
    const now = Date.now()
    if (publicNoteCache.expiresAt > now) {
      return publicNoteCache.data
    }

    if (publicNoteCache.promise) {
      return publicNoteCache.promise
    }

    publicNoteCache.promise = this.fetchPublicNotes()
      .then((notes) => {
        publicNoteCache.data = notes
        publicNoteCache.expiresAt = Date.now() + PUBLIC_NOTE_CACHE_TTL_MS
        return notes
      })
      .catch((error) => {
        console.warn("Failed to load Nezha public notes from websocket:", error)
        publicNoteCache.data = new Map<number, string>()
        publicNoteCache.expiresAt = Date.now() + PUBLIC_NOTE_CACHE_TTL_MS
        return publicNoteCache.data
      })
      .finally(() => {
        publicNoteCache.promise = null
      })

    return publicNoteCache.promise
  }

  private async fetchPublicNotes(): Promise<Map<number, string>> {
    if (!this.config?.baseUrl || !this.authToken) {
      return new Map<number, string>()
    }

    const wsBaseUrl = this.config.baseUrl.replace(/^http/i, "ws")
    const token = this.authToken.trim()
    const candidates: NezhaWsOptions[] = [
      {
        url: `${wsBaseUrl}/ws/server`,
        headers: { Authorization: token },
      },
      {
        url: `${wsBaseUrl}/api/v1/ws/server`,
        headers: { Authorization: token },
      },
      {
        url: `${wsBaseUrl}/ws?token=${encodeURIComponent(token)}`,
      },
      {
        url: `${wsBaseUrl}/ws`,
        headers: { Authorization: token },
      },
      {
        url: `${wsBaseUrl}/ws`,
      },
    ]

    for (const candidate of candidates) {
      const publicNotes = await this.readPublicNotesFromWebSocket(candidate)
      if (publicNotes.size > 0) {
        return publicNotes
      }
    }

    return new Map<number, string>()
  }

  private async readPublicNotesFromWebSocket({
    url,
    headers,
  }: NezhaWsOptions): Promise<Map<number, string>> {
    const wsModule = await import("ws")
    const WebSocketClient = wsModule.WebSocket ?? wsModule.default
    if (!WebSocketClient) {
      return new Map<number, string>()
    }

    return new Promise((resolve) => {
      let settled = false
      let ws: InstanceType<typeof WebSocketClient> | null = null

      const finalize = (publicNotes = new Map<number, string>()) => {
        if (settled) {
          return
        }

        settled = true
        clearTimeout(timeoutId)
        try {
          ws?.terminate()
        } catch {
          // Ignore websocket cleanup errors.
        }
        resolve(publicNotes)
      }

      const timeoutId = setTimeout(() => finalize(), 10_000)

      try {
        ws = new WebSocketClient(url, {
          headers,
          handshakeTimeout: 8_000,
        })
      } catch {
        finalize()
        return
      }

      ws.once("message", (message) => {
        finalize(this.extractPublicNotes(message.toString()))
      })
      ws.once("unexpected-response", () => {
        finalize()
      })
      ws.once("error", () => {
        finalize()
      })
      ws.once("close", () => {
        finalize()
      })
    })
  }

  private extractPublicNotes(rawMessage: string): Map<number, string> {
    let payload: unknown

    try {
      payload = JSON.parse(rawMessage)
    } catch {
      return new Map<number, string>()
    }

    if (!payload || typeof payload !== "object") {
      return new Map<number, string>()
    }

    const payloadObject = payload as {
      servers?: NezhaWsServer[]
      result?: NezhaWsServer[]
    }
    const servers = Array.isArray(payloadObject.servers)
      ? payloadObject.servers
      : Array.isArray(payloadObject.result)
        ? payloadObject.result
        : []

    return servers.reduce((notes, server) => {
      const idValue = server.id ?? server.ID
      const serverId =
        typeof idValue === "number"
          ? idValue
          : typeof idValue === "string"
            ? Number.parseInt(idValue, 10)
            : Number.NaN
      const publicNote = server.public_note ?? server.PublicNote ?? ""

      if (Number.isFinite(serverId) && typeof publicNote === "string" && publicNote.trim()) {
        notes.set(serverId, publicNote)
      }

      return notes
    }, new Map<number, string>())
  }

  private parseServiceMonitors(html: string): ServiceMonitor[] {
    const payload = this.extractBalancedAssignment(html, "services")
    if (!payload) {
      return []
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(payload)
    } catch (error) {
      console.warn("Failed to parse Nezha service monitor payload:", error)
      return []
    }

    if (!parsed || typeof parsed !== "object") {
      return []
    }

    const rawMonitors = Array.isArray(parsed)
      ? parsed
      : Object.values(parsed as Record<string, RawServiceMonitor>)

    return rawMonitors
      .map((item) => this.normalizeServiceMonitor(item as RawServiceMonitor))
      .filter((item): item is ServiceMonitor => item !== null)
  }

  private normalizeServiceMonitor(service: RawServiceMonitor): ServiceMonitor | null {
    const name = service.Monitor?.Name?.trim()
    if (!name) {
      return null
    }

    const type = this.toNumber(service.Monitor?.Type)
    const delays = Array.isArray(service.Delay)
      ? service.Delay.map((value) => this.toNumber(value))
      : []
    const up = Array.isArray(service.Up) ? service.Up.map((value) => this.toNumber(value)) : []
    const down = Array.isArray(service.Down)
      ? service.Down.map((value) => this.toNumber(value))
      : []

    const currentAvailability = this.calculateAvailabilityPercent(
      service.CurrentUp,
      service.CurrentDown,
    )
    const availability = this.calculateAvailabilityPercent(service.TotalUp, service.TotalDown)
    const averageDelay = this.calculateAverageDelay(delays)
    const status = this.getMonitorStatus(currentAvailability)
    const daily = this.buildDailyPoints(up, down, delays)

    return {
      type,
      typeLabel: this.getServiceTypeLabel(type),
      name,
      currentAvailability,
      availability,
      averageDelay,
      status,
      daily,
    }
  }

  private buildDailyPoints(
    up: number[],
    down: number[],
    delays: number[],
  ): ServiceMonitorDailyPoint[] {
    const length = Math.max(up.length, down.length, delays.length)
    const points: ServiceMonitorDailyPoint[] = []

    for (let index = 0; index < length; index += 1) {
      const availability = this.calculateAvailabilityPercent(up[index], down[index])
      points.push({
        label: this.getDaysAgoLabel(length - index - 1),
        availability,
        delay: this.toNumber(delays[index]),
        status: this.getMonitorStatus(availability),
      })
    }

    return points
  }

  private parseCycleTransfers(html: string): ServiceCycleTransfer[] {
    const rowMatches = [...html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)]

    return rowMatches
      .map((match) => this.extractCycleTransferRow(match[1]))
      .filter((row): row is ServiceCycleTransfer => row !== null)
  }

  private extractCycleTransferRow(rowHtml: string): ServiceCycleTransfer | null {
    const columns = [...rowHtml.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map((match) =>
      this.stripHtml(match[1]),
    )

    if (columns.length !== 10 || !/^\d+$/.test(columns[0])) {
      return null
    }

    const transferLeftPercentMatch = columns[9].match(/\/\s*([\d.]+)\s*%/)

    return {
      id: Number.parseInt(columns[0], 10),
      rule: columns[1],
      serverName: columns[2],
      from: columns[3],
      to: columns[4],
      max: columns[5],
      min: columns[6],
      nextCheck: columns[7],
      currentUsage: columns[8],
      transferLeft: columns[9],
      transferLeftPercent: this.toNumber(transferLeftPercentMatch?.[1]),
    }
  }

  private extractBalancedAssignment(source: string, key: string): string | null {
    const keyIndex = source.indexOf(`${key}:`)
    if (keyIndex === -1) {
      return null
    }

    let startIndex = keyIndex + key.length + 1
    while (startIndex < source.length && /\s/.test(source[startIndex])) {
      startIndex += 1
    }

    const firstChar = source[startIndex]
    if (firstChar !== "{" && firstChar !== "[") {
      return null
    }

    const stack: string[] = [firstChar === "{" ? "}" : "]"]
    let quote: string | null = null
    let isEscaped = false

    for (let index = startIndex + 1; index < source.length; index += 1) {
      const char = source[index]

      if (quote) {
        if (isEscaped) {
          isEscaped = false
          continue
        }

        if (char === "\\") {
          isEscaped = true
          continue
        }

        if (char === quote) {
          quote = null
        }
        continue
      }

      if (char === '"' || char === "'" || char === "`") {
        quote = char
        continue
      }

      if (char === "{") {
        stack.push("}")
        continue
      }

      if (char === "[") {
        stack.push("]")
        continue
      }

      const expected = stack[stack.length - 1]
      if (char === expected) {
        stack.pop()
        if (stack.length === 0) {
          return source.slice(startIndex, index + 1)
        }
      }
    }

    return null
  }

  private calculateAvailabilityPercent(
    up: number | string | undefined,
    down: number | string | undefined,
  ): number {
    const currentUp = this.toNumber(up)
    const currentDown = this.toNumber(down)
    const total = currentUp + currentDown

    if (total === 0) {
      return currentUp > 0 ? 100 : 0
    }

    if (currentUp === 0) {
      return Number.parseFloat(((0.00001 / total) * 100).toFixed(5))
    }

    return Number.parseFloat(((currentUp / total) * 100).toFixed(2))
  }

  private calculateAverageDelay(delays: number[]): number {
    const nonZeroDelays = delays.filter((value) => value > 0)
    if (nonZeroDelays.length === 0) {
      return 0
    }

    const total = nonZeroDelays.reduce((sum, value) => sum + value, 0)
    return Number.parseFloat((total / nonZeroDelays.length).toFixed(2))
  }

  private getMonitorStatus(percent: number): ServiceMonitorStatus {
    if (percent === 0) {
      return "nodata"
    }

    if (percent > 95) {
      return "good"
    }

    if (percent > 80) {
      return "warning"
    }

    return "danger"
  }

  private getServiceTypeLabel(type: number): string {
    switch (type) {
      case 1:
        return "HTTP GET"
      case 2:
        return "ICMP Ping"
      case 3:
        return "TCP Ping"
      default:
        return "Service"
    }
  }

  private getDaysAgoLabel(daysAgo: number): string {
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)
    const month = `${date.getMonth() + 1}`.padStart(2, "0")
    const day = `${date.getDate()}`.padStart(2, "0")
    return `${month}-${day}`
  }

  private stripHtml(html: string): string {
    return this.decodeHtmlEntities(html.replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim()
  }

  private decodeHtmlEntities(value: string): string {
    return value
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  }

  private toNumber(value: number | string | undefined): number {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : 0
    }

    if (typeof value !== "string") {
      return 0
    }

    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
}
