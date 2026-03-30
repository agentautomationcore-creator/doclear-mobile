/**
 * Debug logger — only logs in development mode.
 * Use instead of console.log to prevent logs in production builds.
 */
export const log = __DEV__
  ? (...args: any[]) => console.log(...args)
  : (..._args: any[]) => {};
