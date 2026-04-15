import fs from "node:fs";
import path from "node:path";
import { auth } from "@/auth";
import getEnv from "@/lib/env-entry";
import { GetServerIP } from "@/lib/serverFetch";
import { type AsnResponse, type CityResponse, Reader } from "maxmind";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ResError extends Error {
  statusCode?: number;
  message: string;
}

export type IPInfo = {
  city: CityResponse;
  asn: AsnResponse;
};

type LookupReaders = {
  cityLookup: Reader<CityResponse>;
  asnLookup: Reader<AsnResponse>;
};

let lookupReaders: LookupReaders | null = null;

function createRouteError(message: string, statusCode = 500): ResError {
  const error = new Error(message) as ResError;
  error.statusCode = statusCode;
  return error;
}

function getLookupReaders(): LookupReaders {
  if (lookupReaders) {
    return lookupReaders;
  }

  try {
    lookupReaders = {
      cityLookup: new Reader<CityResponse>(
        fs.readFileSync(
          path.join(process.cwd(), "lib", "maxmind-db", "GeoLite2-City.mmdb"),
        ),
      ),
      asnLookup: new Reader<AsnResponse>(
        fs.readFileSync(
          path.join(process.cwd(), "lib", "maxmind-db", "GeoLite2-ASN.mmdb"),
        ),
      ),
    };

    return lookupReaders;
  } catch (error) {
    console.error("Failed to initialize IP database readers:", error);

    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      throw createRouteError("IP database files are missing", 500);
    }

    throw createRouteError("IP database is unavailable", 500);
  }
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

    const { cityLookup, asnLookup } = getLookupReaders();
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

