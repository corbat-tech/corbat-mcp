import pRetry, { AbortError, type Options as PRetryOptions } from 'p-retry';

/**
 * Options for retry operations.
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number;
  /** Base delay in milliseconds for exponential backoff (default: 100) */
  baseDelayMs?: number;
  /** Maximum delay in milliseconds (default: 5000) */
  maxDelayMs?: number;
  /** Whether to log retry attempts to stderr (default: false) */
  verbose?: boolean;
}

/**
 * Default retry options.
 */
const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelayMs: 100,
  maxDelayMs: 5000,
  verbose: false,
};

/**
 * Execute an async operation with exponential backoff retry.
 *
 * @param operation - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the operation
 * @throws The last error if all retries fail
 *
 * @example
 * ```typescript
 * const content = await withRetry(
 *   () => readFile(filePath, 'utf-8'),
 *   { maxAttempts: 3, baseDelayMs: 100 }
 * );
 * ```
 */
export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const pRetryOptions: PRetryOptions = {
    retries: opts.maxAttempts - 1,
    minTimeout: opts.baseDelayMs,
    maxTimeout: opts.maxDelayMs,
    factor: 2,
    onFailedAttempt: opts.verbose
      ? (error) => {
          console.error(`Retry attempt ${error.attemptNumber}/${opts.maxAttempts} failed: ${error.message}`);
        }
      : undefined,
  };

  return pRetry(operation, pRetryOptions);
}

/**
 * Check if an error is retryable (transient).
 * File system errors like EBUSY, EAGAIN, ETIMEDOUT are retryable.
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const nodeError = error as NodeJS.ErrnoException;
    const retryableCodes = ['EBUSY', 'EAGAIN', 'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'];
    return retryableCodes.includes(nodeError.code || '');
  }
  return false;
}

/**
 * Execute a file operation with retry only for transient errors.
 *
 * @param operation - The async file operation to execute
 * @param options - Retry configuration options
 * @returns The result of the operation
 */
export async function withFileRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  return withRetry(async () => {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryableError(error)) {
        throw new AbortError(error instanceof Error ? error.message : String(error));
      }
      throw error;
    }
  }, options);
}
