import { NextResponse } from "next/server"
import { createErrorResponse, requireApiSession } from "@/lib/api-route"
import { GetServerData, GetServiceStats } from "@/lib/serverFetchV2"

export const dynamic = "force-dynamic"

export async function GET() {
  const unauthorizedResponse = await requireApiSession()
  if (unauthorizedResponse) {
    return unauthorizedResponse
  }

  try {
    const [data, serviceStats] = await Promise.all([GetServerData(), GetServiceStats()])
    return NextResponse.json(
      {
        ...data,
        service_stats: serviceStats,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error in GET handler:", error)
    return createErrorResponse(error)
  }
}
