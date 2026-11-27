/**
 * Safely normalizes Express v5 route parameter values (`string | string[] | undefined`)
 * into a guaranteed string.
 */
export function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] ?? '';
  return param ?? '';
}
