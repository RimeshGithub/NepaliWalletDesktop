"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { adToBs, bsToAd, daysInBsMonth, BS_MONTHS } from "@/lib/nepali-date"

const TRIGGER_CLASS = "shadow-sm rounded-md p-2.5 bg-white"

// Scrolls inside a fixed height, and never exceeds the space left on screen
const CONTENT_CLASS = "max-h-[min(24rem,var(--radix-select-content-available-height))]"

export function BsDatePicker({
  value,
  onChange,
  disabled,
}: {
  value: string // AD "yyyy-MM-dd"
  onChange: (ad: string) => void // returns AD "yyyy-MM-dd"
  disabled?: boolean
}) {
  const bs = adToBs(value)
  const days = daysInBsMonth(bs.year, bs.month)
  const years = Array.from({ length: 21 }, (_, i) => bs.year - 10 + i)

  const update = (year: number, month: number, day: number) => {
    const safeDay = Math.min(day, daysInBsMonth(year, month)) // e.g. 32 -> 30
    onChange(bsToAd(year, month, safeDay))
  }

  return (
    <div className="flex gap-2">
      {/* Year */}
      <Select
        value={String(bs.year)}
        disabled={disabled}
        onValueChange={(v) => update(Number(v), bs.month, bs.day)}
      >
        <SelectTrigger className={TRIGGER_CLASS}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={CONTENT_CLASS}>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Month */}
      <Select
        value={String(bs.month)}
        disabled={disabled}
        onValueChange={(v) => update(bs.year, Number(v), bs.day)}
      >
        <SelectTrigger className={TRIGGER_CLASS}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={CONTENT_CLASS}>
          {BS_MONTHS.map((m, i) => (
            <SelectItem key={m} value={String(i)}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Day */}
      <Select
        value={String(bs.day)}
        disabled={disabled}
        onValueChange={(v) => update(bs.year, bs.month, Number(v))}
      >
        <SelectTrigger className={TRIGGER_CLASS}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={CONTENT_CLASS}>
          {Array.from({ length: days }, (_, i) => i + 1).map((d) => (
            <SelectItem key={d} value={String(d)}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}