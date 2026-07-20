export function collectopaediaSlotId(setId: string, slotIndex: number): string {
  return `${setId}-slot-${slotIndex}`
}

/** Story progression order for XC1 Collectopaedia regions */
export const COLLECTOPAEDIA_REGION_ORDER: string[] = [
  'Colony 9',
  'Tephra Cave',
  "Bionis' Leg",
  'Colony 6',
  'Satorl Marsh',
  "Bionis' Interior",
  'Makna Forest',
  'Frontier Village',
  'Eryth Sea',
  'Alcamoth',
  'Valak Mountain',
  'Sword Valley',
  'Galahad Fortress',
  'Fallen Arm',
  'Mechonis Field',
  "Bionis' Shoulder",
]

/** Wiki column order for XC1 Collectopaedia types */
export const COLLECTOPAEDIA_TYPE_ORDER: string[] = [
  'Veg',
  'Fruit',
  'Flower',
  'Bug',
  'Animal',
  'Nature',
  'Parts',
  'Part',
  'Strange',
]

export function compareCollectopaediaTypes(a: string, b: string): number {
  const order = new Map(COLLECTOPAEDIA_TYPE_ORDER.map((type, index) => [type, index]))
  const indexA = order.get(a)
  const indexB = order.get(b)
  if (indexA !== undefined && indexB !== undefined) return indexA - indexB
  if (indexA !== undefined) return -1
  if (indexB !== undefined) return 1
  return a.localeCompare(b)
}

export function compareCollectopaediaRegions(a: string, b: string): number {
  const order = new Map(COLLECTOPAEDIA_REGION_ORDER.map((region, index) => [region, index]))
  const indexA = order.get(a)
  const indexB = order.get(b)
  if (indexA !== undefined && indexB !== undefined) return indexA - indexB
  if (indexA !== undefined) return -1
  if (indexB !== undefined) return 1
  return a.localeCompare(b)
}

export function sortCollectopaediaRegions(regions: string[]): string[] {
  const order = new Map(COLLECTOPAEDIA_REGION_ORDER.map((region, index) => [region, index]))
  return [...regions].sort((a, b) => {
    const indexA = order.get(a)
    const indexB = order.get(b)
    if (indexA !== undefined && indexB !== undefined) return indexA - indexB
    if (indexA !== undefined) return -1
    if (indexB !== undefined) return 1
    return a.localeCompare(b)
  })
}
