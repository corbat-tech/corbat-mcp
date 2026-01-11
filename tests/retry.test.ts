import { describe, expect, it, vi } from 'vitest';
import { isRetryableError, withFileRetry, withRetry } from '../src/utils/retry.js';

describe('withRetry', () => {
  it('should return result on first successful attempt', async () => {
    const operation = vi.fn().mockResolvedValue('success');

    const result = await withRetry(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed', async () => {
    const operation = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValue('success');

    const result = await withRetry(operation, { maxAttempts: 3, baseDelayMs: 10 });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should throw after max attempts exceeded', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('always fails'));

    await expect(withRetry(operation, { maxAttempts: 2, baseDelayMs: 10 })).rejects.toThrow('always fails');

    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should use default options when none provided', async () => {
    const operation = vi.fn().mockResolvedValue('success');

    const result = await withRetry(operation);

    expect(result).toBe('success');
  });

  it('should log retry attempts when verbose is true', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const operation = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValue('success');

    await withRetry(operation, { maxAttempts: 3, baseDelayMs: 10, verbose: true });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('isRetryableError', () => {
  it('should return true for EBUSY error', () => {
    const error = new Error('Resource busy') as NodeJS.ErrnoException;
    error.code = 'EBUSY';

    expect(isRetryableError(error)).toBe(true);
  });

  it('should return true for EAGAIN error', () => {
    const error = new Error('Try again') as NodeJS.ErrnoException;
    error.code = 'EAGAIN';

    expect(isRetryableError(error)).toBe(true);
  });

  it('should return true for ETIMEDOUT error', () => {
    const error = new Error('Timed out') as NodeJS.ErrnoException;
    error.code = 'ETIMEDOUT';

    expect(isRetryableError(error)).toBe(true);
  });

  it('should return false for ENOENT error', () => {
    const error = new Error('Not found') as NodeJS.ErrnoException;
    error.code = 'ENOENT';

    expect(isRetryableError(error)).toBe(false);
  });

  it('should return false for non-Error values', () => {
    expect(isRetryableError('string error')).toBe(false);
    expect(isRetryableError(null)).toBe(false);
    expect(isRetryableError(undefined)).toBe(false);
  });

  it('should return false for errors without code', () => {
    const error = new Error('Generic error');

    expect(isRetryableError(error)).toBe(false);
  });
});

describe('withFileRetry', () => {
  it('should succeed on first attempt', async () => {
    const operation = vi.fn().mockResolvedValue('file content');

    const result = await withFileRetry(operation);

    expect(result).toBe('file content');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable errors', async () => {
    const busyError = new Error('Resource busy') as NodeJS.ErrnoException;
    busyError.code = 'EBUSY';

    const operation = vi.fn().mockRejectedValueOnce(busyError).mockResolvedValue('success');

    const result = await withFileRetry(operation, { maxAttempts: 3, baseDelayMs: 10 });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should not retry on non-retryable errors', async () => {
    const notFoundError = new Error('Not found') as NodeJS.ErrnoException;
    notFoundError.code = 'ENOENT';

    const operation = vi.fn().mockRejectedValue(notFoundError);

    await expect(withFileRetry(operation, { maxAttempts: 3, baseDelayMs: 10 })).rejects.toThrow();

    // Should abort immediately without retrying
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
