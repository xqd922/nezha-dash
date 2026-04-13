import { NextResponse } from "next/server"
import { createErrorResponse, requireApiSession } from "@/lib/api-route"
import { GetServiceStats } from "@/lib/serverFetchV2"

export const dynamic = "force-dynamic"

export async function GET() {
  const unauthorizedResponse = await requireApiSession()
  if (unauthorizedResponse) {
    return unauthorizedResponse
  }

  try {
    const data = await GetServiceStats()
    return NextResponse.json(data, { status: 200 })
  } catch (error) {
    console.error("Error in GET handler:", error)
    return createErrorResponse(error)
  }
}
