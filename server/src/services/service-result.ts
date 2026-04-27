export type ServiceResult<T> =
  | { ok: true; value: T }
  | { ok: false; statusCode: number; error: string };

export function ok<T>(value: T): ServiceResult<T> {
  return { ok: true, value };
}

export function fail<T = never>(statusCode: number, error: string): ServiceResult<T> {
  return { ok: false, statusCode, error };
}
