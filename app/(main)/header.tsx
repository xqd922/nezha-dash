"use client";

import { AnimateCountClient } from "@/components/AnimatedCount";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ModeToggle } from "@/components/ThemeSwitcher";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import getEnv from "@/lib/env-entry";
import { DateTime } from "luxon";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

function Header() {
  const t = useTranslations("Header");
  const customLogo = getEnv("NEXT_PUBLIC_CustomLogo");
  const customTitle = getEnv("NEXT_PUBLIC_CustomTitle");
  const customDescription = getEnv("NEXT_PUBLIC_CustomDescription");

  const router = useRouter();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <section className="flex items-center justify-between">
        <section
          onClick={() => {
            sessionStorage.removeItem("selectedTag");
            router.push(`/`);
          }}
          className="flex cursor-pointer items-center text-base font-medium"
        >
          <div className="mr-1 flex flex-row items-center justify-start">
            <img
              width={40}
              height={40}
              alt="apple-touch-icon"
              src={customLogo ? customLogo : "/apple-touch-icon.png"}
              className="relative m-0! border-2 border-transparent h-6 w-6 object-cover object-top p-0! dark:hidden"
            />
            <img
              width={40}
              height={40}
              alt="apple-touch-icon"
              src={customLogo ? customLogo : "/apple-touch-icon-dark.png"}
              className="relative m-0! border-2 border-transparent h-6 w-6 object-cover object-top p-0! hidden dark:block"
            />
          </div>
          {customTitle ? customTitle : "NezhaDash"}
          <Separator
            orientation="vertical"
            className="mx-2 hidden h-4 w-[1px] md:block"
          />
          <p className="hidden text-sm font-medium opacity-40 md:block">
            {customDescription
              ? customDescription
              : t("p_1079-1199_Simpleandbeautifuldashbo")}
          </p>
        </section>
        <section className="flex items-center gap-2">
          <Links />
          <LanguageSwitcher />
          <ModeToggle />
        </section>
      </section>
      <Overview />
    </div>
  );
}

type links = {
  link: string;
  name: string;
};

function Links() {
  const linksEnv = getEnv("NEXT_PUBLIC_Links");

  const links: links[] | null = linksEnv ? JSON.parse(linksEnv) : null;

  if (!links) return null;

  return (
    <div className="flex items-center gap-2">
      {links.map((link, index) => {
        return (
          <a
            key={index}
            href={link.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm font-medium opacity-50 transition-opacity hover:opacity-100"
          >
            {link.name}
          </a>
        );
      })}
    </div>
  );
}

// https://github.com/streamich/react-use/blob/master/src/useInterval.ts
const useCurrentTime = () => {
  const [time, setTime] = useState({
    hh: DateTime.now().setLocale("en-US").hour,
    mm: DateTime.now().setLocale("en-US").minute,
    ss: DateTime.now().setLocale("en-US").second,
  });

  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = DateTime.now().setLocale("en-US");
      setTime({ hh: now.hour, mm: now.minute, ss: now.second });
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  return time;
};

function Overview() {
  const t = useTranslations("Overview");
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const time = useCurrentTime();
  return (
    <section className={"mt-10 flex flex-col md:mt-16"}>
      <p className="text-base font-semibold">{t("p_2277-2331_Overview")}</p>
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-medium opacity-50">
          {t("p_2390-2457_wherethetimeis")}
        </p>
        {mounted ? (
          <div className="flex items-center text-sm font-medium">
            <AnimateCountClient count={time.hh} minDigits={2} />
            <span className="mb-px text-sm font-medium opacity-50">:</span>
            <AnimateCountClient count={time.mm} minDigits={2} />
            <span className="mb-px text-sm font-medium opacity-50">:</span>
            <span className="text-sm font-medium">
              <AnimateCountClient count={time.ss} minDigits={2} />
            </span>
          </div>
        ) : (
          <Skeleton className="h-[20px] w-[50px] rounded-[5px] bg-muted-foreground/10 animate-none"></Skeleton>
        )}
      </div>
    </section>
  );
}
export default Header;
