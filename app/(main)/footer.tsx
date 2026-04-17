import { useTranslations } from "next-intl"
import pack from "@/package.json"

const GITHUB_URL = "https://github.com/hamster1963/nezha-dash"
const SOURCE_URL = "https://github.com/xqd922/nezha-dash/tree/cloudflare"
const PERSONAL_URL = "https://buycoffee.top"

type LinkProps = {
  href: string
  children: React.ReactNode
}

const FooterLink = ({ href, children }: LinkProps) => (
  <a
    href={href}
    target="_blank"
    className="cursor-pointer font-normal underline decoration-2 decoration-yellow-500 underline-offset-2 transition-colors hover:decoration-yellow-600 dark:decoration-yellow-500/60 dark:hover:decoration-yellow-500/80"
    rel="noreferrer"
  >
    {children}
  </a>
)

const baseTextStyles =
  "text-[13px] font-light tracking-tight text-neutral-600/50 dark:text-neutral-300/50"

export default function Footer() {
  const t = useTranslations("Footer")
  const version = pack.version
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mx-auto flex w-full max-w-5xl items-center justify-between">
      <section className="flex flex-col">
        <p className={`mt-3 flex gap-1 ${baseTextStyles}`}>
          {t("p_146-598_Findthecodeon")}{" "}
          <FooterLink href={GITHUB_URL}>{t("a_303-585_GitHub")}</FooterLink>
          <FooterLink href={SOURCE_URL}>{version}</FooterLink>
        </p>
        <section className={`mt-1 flex items-center gap-2 ${baseTextStyles}`}>
          {t("section_607-869_2020")}
          {currentYear} <FooterLink href={PERSONAL_URL}>{t("a_800-850_Hamster1963")}</FooterLink>
        </section>
      </section>
    </footer>
  )
}
