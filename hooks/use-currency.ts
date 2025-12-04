import { storage } from "@/lib/storage"

export function getCurrency() {
  return storage.getData().settings.currency
}
