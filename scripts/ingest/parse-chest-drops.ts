import { parseAllNamedTemplates, parseNamedTemplate } from './parse-infobox.ts'

function formatMaterialList(fields: Record<string, string>, prefix: string): string[] {
  const items: string[] = []
  for (let i = 1; i <= 10; i++) {
    const material = fields[`${prefix}${i}`] ?? fields[`material${i}`]
    const rate = fields[`mrate${i}`] ?? fields[`${prefix}rate${i}`]
    if (!material) break
    items.push(rate ? `${material} (${rate}%)` : material)
  }
  return items
}

function formatWeaponList(
  fields: Record<string, string>,
  countKey: string,
  namePrefix: string,
  slotsPrefix: string,
  ratePrefix: string,
): string[] {
  const count = parseInt(fields[countKey] ?? '0', 10)
  const items: string[] = []
  for (let i = 1; i <= Math.max(count, 6); i++) {
    const weapon = fields[`${namePrefix}${i}`]
    if (!weapon) continue
    const slots = fields[`${slotsPrefix}${i}`]
    const rate = fields[`${ratePrefix}${i}`]
    const label = slots ? `${weapon} (${slots} slots)` : weapon
    items.push(rate ? `${label} — ${rate}%` : label)
    if (items.length >= count && count > 0) break
  }
  return items
}

function formatUniqueArmourList(fields: Record<string, string>): string[] {
  const count = parseInt(fields.numberuniquearmours ?? '0', 10)
  const items: string[] = []
  for (let i = 1; i <= Math.max(count, 6); i++) {
    const armour = fields[`uarmour${i}`]
    if (!armour) continue
    const slots = fields[`uaslots${i}`]
    const rate = fields[`uarate${i}`]
    const label = slots ? `${armour} (${slots} slots)` : armour
    items.push(rate ? `${label} — ${rate}%` : label)
    if (items.length >= count && count > 0) break
  }
  return items
}

function formatArmourList(fields: Record<string, string>): string[] {
  const count = parseInt(fields.numberarmours ?? '0', 10)
  const items: string[] = []
  for (let i = 1; i <= Math.max(count, 5); i++) {
    const armour = fields[`armour${i}`]
    if (!armour) continue
    const slots = fields[`aslots${i}`]
    const rate = fields[`arate${i}`]
    const label = slots ? `${armour} (${slots} slots)` : armour
    items.push(rate ? `${label} — ${rate}%` : label)
    if (items.length >= count && count > 0) break
  }
  return items
}

function formatCrystalList(fields: Record<string, string>): string[] {
  const count = parseInt(fields.numbercrystals ?? '0', 10)
  if (count === 0) return []
  const crystals: string[] = []
  for (let i = 1; i <= count; i++) {
    for (const letter of ['a', 'b']) {
      const crystal = fields[`crystal${i}${letter}`]
      if (crystal) crystals.push(crystal)
    }
  }
  const rate = fields.crystalrate
  if (crystals.length === 0) return []
  return rate ? [`${crystals.join(', ')} (${rate}%)`] : crystals
}

export function parseMonsterDrops(wikitext: string): string[] {
  const dropsSection =
    wikitext.match(/==\s*Drops\s*==([\s\S]*?)(?=\n==[^=]|$)/i)?.[1] ?? wikitext
  const lines: string[] = []

  const rates = parseNamedTemplate(dropsSection, 'Chest Rate')
  if (Object.keys(rates).length > 0) {
    const parts: string[] = []
    if (rates.wood) parts.push(`Wood ${rates.wood}%`)
    if (rates.silver) parts.push(`Silver ${rates.silver}%`)
    if (rates.gold) parts.push(`Gold ${rates.gold}%`)
    if (parts.length > 0) lines.push(`Chest rates: ${parts.join(', ')}`)
  }

  for (const wood of parseAllNamedTemplates(dropsSection, 'Chest Wood')) {
    const mats = formatMaterialList(wood, 'material')
    if (mats.length > 0) lines.push(`Wood chest: ${mats.join(', ')}`)
  }

  for (const silver of parseAllNamedTemplates(dropsSection, 'Chest Silver')) {
    const parts: string[] = []
    const crystals = formatCrystalList(silver)
    if (crystals.length > 0) parts.push(`Crystals: ${crystals.join(', ')}`)
    const weapons = formatWeaponList(silver, 'numberweapons', 'weapon', 'wslots', 'wrate')
    if (weapons.length > 0) parts.push(`Weapons: ${weapons.join('; ')}`)
    const armours = formatArmourList(silver)
    if (armours.length > 0) parts.push(`Armour: ${armours.join('; ')}`)
    if (parts.length > 0) lines.push(`Silver chest — ${parts.join(' · ')}`)
  }

  for (const gold of parseAllNamedTemplates(dropsSection, 'Chest Gold')) {
    const parts: string[] = []
    const weapons = formatWeaponList(gold, 'numberweapons', 'weapon', 'wslots', 'wrate')
    if (weapons.length > 0) parts.push(`Weapons: ${weapons.join('; ')}`)
    const uniqueWeapons = formatWeaponList(
      gold,
      'numberuniqueweapons',
      'uweapon',
      'uwslots',
      'uwrate',
    )
    if (uniqueWeapons.length > 0) parts.push(`Unique weapons: ${uniqueWeapons.join('; ')}`)
    const uniqueArmours = formatUniqueArmourList(gold)
    if (uniqueArmours.length > 0) parts.push(`Unique armour: ${uniqueArmours.join('; ')}`)
    if (parts.length > 0) lines.push(`Gold chest — ${parts.join(' · ')}`)
  }

  const normalDrops = dropsSection.match(/==\s*Normal\s*==([\s\S]*?)(?=\n==|$)/i)?.[1]
  if (normalDrops) {
    const mats = formatMaterialList(parseNamedTemplate(normalDrops, 'Normal Drop'), 'item')
    if (mats.length > 0) lines.push(`Normal drops: ${mats.join(', ')}`)
  }

  return lines
}
