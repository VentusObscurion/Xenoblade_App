const CATEGORY_FILES: Partial<Record<string, string>> = {
  quest: 'quests.json',
  unique_monster: 'unique-monsters.json',
  achievement: 'achievements.json',
  heart_to_heart: 'heart-to-hearts.json',
  quiet_moment: 'quiet-moments.json',
  item: 'items.json',
  collectopaedia: 'collectopaedia.json',
  landmark: 'landmarks.json',
  colony_reconstruction: 'colony-reconstruction.json',
  colony_immigrant: 'colony-immigrants.json',
  person: 'persons.json',
  blade: 'blades.json',
  hero: 'heroes.json',
  merc_mission: 'merc-missions.json',
}

export function getCategoryFile(category: string): string | undefined {
  return CATEGORY_FILES[category]
}
