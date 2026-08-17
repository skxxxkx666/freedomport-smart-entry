export interface QueryOptions {
  manual: boolean
  debug: boolean
  noTest: boolean
}

export function parseQuery(search: string): QueryOptions {
  const params = new URLSearchParams(search)
  return {
    manual: params.get('manual') === '1',
    debug: params.get('debug') === '1',
    noTest: params.get('no-test') === '1',
  }
}
