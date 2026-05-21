/**
 * Lightweight pub/sub toast system — no React context needed.
 * Call `toast.error(msg)` from anywhere (api-client catch blocks, event handlers)
 * and the <ToastContainer> will display it automatically.
 */

export type ToastLevel = 'info' | 'success' | 'warn' | 'error';

export interface ToastMessage {
  id: string;
  message: string;
  level: ToastLevel;
  /** Echoed from the server's X-Request-Id — shown so users can quote it in bug reports. */
  requestId?: string;
}

type Listener = (msg: ToastMessage) => void;
const listeners = new Set<Listener>();

export function subscribeToasts(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function push(message: string, level: ToastLevel, requestId?: string): void {
  const msg: ToastMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    message,
    level,
    requestId,
  };
  listeners.forEach((fn) => fn(msg));
}

export const toast = {
  info:    (message: string)                    => push(message, 'info'),
  success: (message: string)                    => push(message, 'success'),
  warn:    (message: string)                    => push(message, 'warn'),
  error:   (message: string, requestId?: string) => push(message, 'error', requestId),
};
