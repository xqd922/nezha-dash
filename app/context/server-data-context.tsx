"use client";

import { createContext, type ReactNode, useContext } from "react";
import useSWR from "swr";
import { ServerApi } from "@/app/types/nezha-api";
import getEnv from "@/lib/env-entry";
import { nezhaFetcher } from "@/lib/utils";

interface ServerDataContextType {
  data: ServerApi | undefined;
  // SWR 错误由 nezhaFetcher 抛出，带 status/info 等自定义字段，保留宽松类型
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: any;
  isLoading: boolean;
}

const ServerDataContext = createContext<ServerDataContextType | undefined>(
  undefined,
);

export function ServerDataProvider({ children }: { children: ReactNode }) {
  const refreshInterval =
    Number(getEnv("NEXT_PUBLIC_NezhaFetchInterval")) || 2000;

  const { data, error, isLoading } = useSWR<ServerApi>(
    "/api/server",
    nezhaFetcher,
    {
      refreshInterval,
      dedupingInterval: 1000,
    },
  );

  return (
    <ServerDataContext.Provider value={{ data, error, isLoading }}>
      {children}
    </ServerDataContext.Provider>
  );
}

export function useServerData() {
  const context = useContext(ServerDataContext);
  if (context === undefined) {
    throw new Error(
      "useServerData must be used within a ServerDataProvider",
    );
  }
  return context;
}
