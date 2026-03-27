/** Split stored skills string into display tags. */
export function parseSkillTags(skills) {
  if (skills == null || typeof skills !== 'string') return [];
  return skills
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
