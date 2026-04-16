import { auth } from "@/auth";
import getEnv from "@/lib/env-entry";
import { GetServerIP } from "@/lib/serverFetch";
import { ipInfoService } from "@/lib/ip-info-service";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export async function GET(req: NextRequest) {
  // 权限检查
  if (getEnv("SitePassword")) {
    const session = await auth();
    if (!session) {
      redirect("/");
    }
  }

  // 功能开关检查
  if (!ipInfoService.isEnabled()) {
    return NextResponse.json(
      { error: "IP info is disabled" },
      { status: 400 },
    );
  }

  // 参数验证
  const { searchParams } = new URL(req.url);
  const server_id = searchParams.get("server_id");

  if (!server_id) {
    return NextResponse.json(
      { error: "server_id is required" },
      { status: 400 },
    );
  }

  try {
    const serverIdNum = parseInt(server_id, 10);
    if (isNaN(serverIdNum)) {
      return NextResponse.json(
        { error: "server_id must be a valid number" },
        { status: 400 },
      );
    }

    // 获取服务器 IP
    const ip = await GetServerIP({ server_id: serverIdNum });
    if (!ip) {
      return NextResponse.json(
        { error: "Server IP unavailable" },
        { status: 404 },
      );
    }

    // 调用 MaxMind API
    const data = await ipInfoService.fetchIPInfo(ip);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching IP info:", error);
    const err = error as Error & { statusCode?: number };
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal server error";
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
