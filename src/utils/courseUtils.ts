// src/utils/courseUtils.ts (New file)
/**
 * Generates a course code from the title initials.
 * Example: "Construção Naval e Offshore" -> "CNO"
 * Example: "Introdução à Programação" -> "IP"
 * @param title The course title
 * @returns The generated code (uppercase initials)
 */
export function generateCourseCode(title: string): string {
  if (!title) return '';
  // Ignore small words (adjust list as needed)
  const ignoreWords = new Set(['e', 'de', 'da', 'do', 'dos', 'das', 'a', 'o', 'em', 'para', 'com', 'sem', 'à', 'ao']);
  const words = title.split(/\s+/); // Split by whitespace
  const initials = words
    .filter(word => word.length > 0 && !ignoreWords.has(word.toLowerCase()))
    .map(word => word[0])
    .join('');
  return initials.toUpperCase();
}