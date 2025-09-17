export function extractGoogleDocumentId(rawUrl: string): string | null {
  const trimmed = rawUrl.trim()

  if (!trimmed) return null

  if (/^[a-zA-Z0-9-_]+$/.test(trimmed)) {
    return trimmed
  }

  try {
    const url = new URL(trimmed)

    const patterns = [
      /\/document\/d\/([a-zA-Z0-9-_]+)/,
      /\/file\/d\/([a-zA-Z0-9-_]+)/,
      /\/d\/([a-zA-Z0-9-_]+)/
    ]

    for (const pattern of patterns) {
      const match = url.pathname.match(pattern)
      if (match) {
        return match[1]
      }
    }

    const idParam = url.searchParams.get('id')
    if (idParam && /^[a-zA-Z0-9-_]+$/.test(idParam)) {
      return idParam
    }
  } catch (error) {
    // Ignore invalid URL parse errors and fall through to fallback
  }

  const fallbackMatch = trimmed.match(/([a-zA-Z0-9-_]{10,})/)
  return fallbackMatch ? fallbackMatch[1] : null
}
