const CATEGORY_FILES: Partial<Record<string, string>> = {
  quest: 'quests.json',
  unique_monster: 'unique-monsters.json',
  achievement: 'achievements.json',
  heart_to_heart: 'heart-to-hearts.json',
  quiet_moment: 'quiet-moments.json',
  collectopaedia: 'collectopaedia.json',
  landmark: 'landmarks.json',
  colony_reconstruction: 'colony-reconstruction.json',
}

export function getCategoryFile(category: string): string | undefined {
  return CATEGORY_FILES[category]
}
