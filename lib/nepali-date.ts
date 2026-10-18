import NepaliDate from "nepali-date-converter"
import { format } from "date-fns"

export const BS_MONTHS = [
  "Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
  "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra",
]

// "yyyy-MM-dd" (AD) -> { year, month (0-indexed), day }
export function adToBs(ad: string) {
  const [y, m, d] = ad.split("-").map(Number)
  const bs = new NepaliDate(new Date(y, m - 1, d)).getBS()
  return { year: bs.year, month: bs.month, day: bs.date }
}

// BS (month 0-indexed) -> "yyyy-MM-dd" (AD)
export function bsToAd(year: number, month: number, day: number) {
  return format(new NepaliDate(year, month, day).toJsDate(), "yyyy-MM-dd")
}

// Derived from the same converter, so it can never disagree with it
export function daysInBsMonth(year: number, month: number) {
  const first = new NepaliDate(year, month, 1).toJsDate()
  const next = month === 11 ? new NepaliDate(year + 1, 0, 1) : new NepaliDate(year, month + 1, 1)
  return Math.round((next.toJsDate().getTime() - first.getTime()) / 86400000)
}