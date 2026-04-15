import { auth } from "@/auth";
import getEnv from "@/lib/env-entry";
import { GetServerIP } from "@/lib/serverFetch";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "edge";

interface ResError extends Error {
  statusCode?: number;
  message: string;
}

export type IPInfo = {
  city: MaxMindCityInfo | null;
  asn: MaxMindAsnInfo | null;
};

type MaxMindErrorResponse = {
  code?: string;
  error?: string;
};

type MaxMindNamedRecord = {
  geoname_id?: number;
  names?: Record<string, string>;
};

type MaxMindCountryRecord = MaxMindNamedRecord & {
  is_in_european_union?: boolean;
  iso_code?: string;
};

type MaxMindLocationRecord = {
  accuracy_radius?: number;
  latitude?: number;
  longitude?: number;
  time_zone?: string;
};

type MaxMindPostalRecord = {
  code?: string;
};

type MaxMindCityInfo = {
  city?: MaxMindNamedRecord | null;
  continent?: (MaxMindNamedRecord & { code?: string }) | null;
  country?: MaxMindCountryRecord | null;
  location?: MaxMindLocationRecord | null;
  postal?: MaxMindPostalRecord | null;
  registered_country?: MaxMindCountryRecord | null;
};

type MaxMindAsnInfo = {
  autonomous_system_number?: number;
  autonomous_system_organization?: string;
};

type MaxMindTraits = {
  autonomous_system_number?: number;
  autonomous_system_organization?: string;
};

type MaxMindCityResponse = {
  city?: MaxMindNamedRecord | null;
  continent?: (MaxMindNamedRecord & { code?: string }) | null;
  country?: MaxMindCountryRecord | null;
  location?: MaxMindLocationRecord | null;
  postal?: MaxMindPostalRecord | null;
  registered_country?: MaxMindCountryRecord | null;
  traits?: MaxMindTraits | null;
};

function createRouteError(message: string, statusCode = 500): ResError {
  const error = new Error(message) as ResError;
  error.statusCode = statusCode;
  return error;
}

function getMaxMindConfig() {
  const accountId = getEnv("MAXMIND_ACCOUNT_ID");
  const licenseKey = getEnv("MAXMIND_LICENSE_KEY");
  const endpoint =
    getEnv("MAXMIND_CITY_ENDPOINT") ||
    "https://geolite.info/geoip/v2.1/city";

  if (!accountId || !licenseKey) {
    throw createRouteError(
      "MaxMind credentials are not configured",
      500,
    );
  }

  return {
    accountId,
    licenseKey,
    endpoint: endpoint.replace(/\/$/, ""),
  };
}

async function fetchMaxMindIPInfo(ip: string): Promise<IPInfo> {
  const { accountId, licenseKey, endpoint } = getMaxMindConfig();
  const response = await fetch(`${endpoint}/${encodeURIComponent(ip)}`, {
    headers: {
      Authorization: `Basic ${btoa(`${accountId}:${licenseKey}`)}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let errorMessage = "Failed to fetch IP information from MaxMind";
    let statusCode = response.status;

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const errorPayload =
        (await response.json().catch(() => null)) as MaxMindErrorResponse | null;
      if (errorPayload?.error) {
        errorMessage = errorPayload.error;
      }
      if (errorPayload?.code === "IP_ADDRESS_NOT_FOUND") {
        statusCode = 404;
      } else if (
        errorPayload?.code === "IP_ADDRESS_RESERVED" ||
        errorPayload?.code === "IP_ADDRESS_INVALID"
      ) {
        statusCode = 400;
      }
    }

    throw createRouteError(errorMessage, statusCode);
  }

  const payload = (await response.json()) as MaxMindCityResponse;

  return {
    city: {
      city: payload.city ?? null,
      continent: payload.continent ?? null,
      country: payload.country ?? null,
      location: payload.location ?? null,
      postal: payload.postal ?? null,
      registered_country: payload.registered_country ?? null,
    },
    asn: {
      autonomous_system_number: payload.traits?.autonomous_system_number,
      autonomous_system_organization:
        payload.traits?.autonomous_system_organization,
    },
  };
}

export async function GET(req: NextRequest) {
  if (getEnv("SitePassword")) {
    const session = await auth();
    if (!session) {
      redirect("/");
    }
  }

  if (getEnv("NEXT_PUBLIC_ShowIpInfo") !== "true") {
    return NextResponse.json({ error: "ip info is disabled" }, { status: 400 });
  }

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

    const ip = await GetServerIP({ server_id: serverIdNum });

    if (!ip) {
      return NextResponse.json(
        { error: "server ip is unavailable" },
        { status: 404 },
      );
    }

    const data = await fetchMaxMindIPInfo(ip);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const err = error as ResError;
    console.error("Error in GET handler:", err);
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
