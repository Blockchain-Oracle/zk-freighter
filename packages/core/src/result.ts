export type Result<T, E extends string = string> = Ok<T> | Err<E>

export interface Ok<T> {
  readonly ok: true
  readonly value: T
}

export interface Err<E extends string> {
  readonly ok: false
  readonly error: E
}

export function createOk<T>(value: T): Ok<T> {
  return { ok: true, value }
}

export function createErr<E extends string>(error: E): Err<E> {
  return { ok: false, error }
}
