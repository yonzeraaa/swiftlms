export interface ParseResult<T> {
  success: boolean
  data?: T
  error?: string
}

export const parseJSON = <T = any>(jsonString: string): ParseResult<T> => {
  try {
    const data = JSON.parse(jsonString)
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid JSON',
    }
  }
}

export const safeStringify = (obj: any, pretty: boolean = false): string => {
  try {
    return JSON.stringify(obj, null, pretty ? 2 : 0)
  } catch (error) {
    return '{}'
  }
}
