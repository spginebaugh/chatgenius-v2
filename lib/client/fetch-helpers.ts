export class FetchError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number = 500
  ) {
    super(message)
    this.name = 'FetchError'
  }
}

export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorMap: Record<string, { message: string; status?: number }> = {}
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof FetchError) {
      throw error
    }

    // Handle known error codes
    if (error instanceof Error && 'code' in error && errorMap[error.code as string]) {
      const mapped = errorMap[error.code as string]
      throw new FetchError(
        mapped.message,
        error.code as string,
        mapped.status || 500
      )
    }

    // Default error handling
    throw new FetchError(
      error instanceof Error ? error.message : 'An unexpected error occurred',
      'UNKNOWN_ERROR',
      500
    )
  }
} 