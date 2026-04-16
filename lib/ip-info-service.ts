import getEnv from "@/lib/env-entry";

export interface IPInfo {
  city: CityInfo | null;
  asn: AsnInfo | null;
}

type NamedRecord = {
  geoname_id?: number;
  names?: Record<string, string>;
};

type CountryRecord = NamedRecord & {
  is_in_european_union?: boolean;
  iso_code?: string;
};

type LocationRecord = {
  accuracy_radius?: number;
  latitude?: number;
  longitude?: number;
  time_zone?: string;
};

type PostalRecord = {
  code?: string;
};

export type CityInfo = {
  city?: NamedRecord | null;
  continent?: (NamedRecord & { code?: string }) | null;
  country?: CountryRecord | null;
  location?: LocationRecord | null;
  postal?: PostalRecord | null;
  registered_country?: CountryRecord | null;
};

export type AsnInfo = {
  autonomous_system_number?: number;
  autonomous_system_organization?: string;
};

type MaxMindTraits = {
  autonomous_system_number?: number;
  autonomous_system_organization?: string;
};

type MaxMindCityResponse = {
  city?: NamedRecord | null;
  continent?: (NamedRecord & { code?: string }) | null;
  country?: CountryRecord | null;
  location?: LocationRecord | null;
  postal?: PostalRecord | null;
  registered_country?: CountryRecord | null;
  traits?: MaxMindTraits | null;
};

type MaxMindErrorResponse = {
  code?: string;
  error?: string;
};

class IPInfoService {
  private getConfig() {
    const accountId = getEnv("MAXMIND_ACCOUNT_ID");
    const licenseKey = getEnv("MAXMIND_LICENSE_KEY");
    const endpoint =
      getEnv("MAXMIND_CITY_ENDPOINT") ||
      "https://geolite.info/geoip/v2.1/city";

    if (!accountId || !licenseKey) {
      throw new Error("MaxMind credentials not configured");
    }

    return {
      accountId,
      licenseKey,
      endpoint: endpoint.replace(/\/$/, ""),
    };
  }

  async fetchIPInfo(ip: string): Promise<IPInfo> {
    const { accountId, licenseKey, endpoint } = this.getConfig();

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
        const errorPayload = (await response
          .json()
          .catch(() => null)) as MaxMindErrorResponse | null;
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

      const error = new Error(errorMessage) as Error & { statusCode?: number };
      error.statusCode = statusCode;
      throw error;
    }

    const data = (await response.json()) as MaxMindCityResponse;
    return this.transformResponse(data);
  }

  private transformResponse(data: MaxMindCityResponse): IPInfo {
    return {
      city: data ? {
        city: data.city ?? null,
        continent: data.continent ?? null,
        country: data.country ?? null,
        location: data.location ?? null,
        postal: data.postal ?? null,
        registered_country: data.registered_country ?? null,
      } : null,
      asn: data?.traits ? {
        autonomous_system_number: data.traits.autonomous_system_number,
        autonomous_system_organization:
          data.traits.autonomous_system_organization,
      } : null,
    };
  }

  isEnabled(): boolean {
    return getEnv("NEXT_PUBLIC_ShowIpInfo") === "true";
  }
}

export const ipInfoService = new IPInfoService();
