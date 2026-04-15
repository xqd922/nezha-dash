import { auth } from "@/auth";
import getEnv from "@/lib/env-entry";
import { GetServerIP } from "@/lib/serverFetch";
import type { AsnResponse, CityResponse } from "mmdb-lib";
import { Reader } from "mmdb-lib";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "edge";

interface ResError extends Error {
  statusCode?: number;
  message: string;
}

export type IPInfo = {
  city: CityResponse | null;
  asn: AsnResponse | null;
};

type LookupReaders = {
  cityLookup: Reader<CityResponse>;
  asnLookup: Reader<AsnResponse>;
};

let lookupReadersPromise: Promise<LookupReaders> | null = null;

function createRouteError(message: string, statusCode = 500): ResError {
  const error = new Error(message) as ResError;
  error.statusCode = statusCode;
  return error;
}

async function createLookupReader<T extends CityResponse | AsnResponse>(
  req: NextRequest,
  assetPath: string,
): Promise<Reader<T>> {
  const assetUrl = new URL(assetPath, req.nextUrl.origin);
  const response = await fetch(assetUrl, { cache: "no-store" });

  if (!response.ok) {
    throw createRouteError(
      `IP database file is unavailable: ${assetUrl.pathname}`,
      500,
    );
  }

  return new Reader<T>(Buffer.from(await response.arrayBuffer()));
}

async function getLookupReaders(req: NextRequest): Promise<LookupReaders> {
  if (!lookupReadersPromise) {
    lookupReadersPromise = Promise.all([
      createLookupReader<CityResponse>(req, "/maxmind-db/GeoLite2-City.mmdb"),
      createLookupReader<AsnResponse>(req, "/maxmind-db/GeoLite2-ASN.mmdb"),
    ])
      .then(([cityLookup, asnLookup]) => ({
        cityLookup,
        asnLookup,
      }))
      .catch((error) => {
        lookupReadersPromise = null;
        console.error("Failed to initialize IP database readers:", error);
        throw createRouteError("IP database is unavailable", 500);
      });
  }

  return lookupReadersPromise;
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

    const { cityLookup, asnLookup } = await getLookupReaders(req);
    const ip = await GetServerIP({ server_id: serverIdNum });

    if (!ip) {
      return NextResponse.json(
        { error: "server ip is unavailable" },
        { status: 404 },
      );
    }

    const data: IPInfo = {
      city: cityLookup.get(ip) as CityResponse,
      asn: asnLookup.get(ip) as AsnResponse,
    };

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    const err = error as ResError;
    console.error("Error in GET handler:", err);
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
