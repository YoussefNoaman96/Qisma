export function parseRoute(hash, pathname = '/', base = '/') {
  const root = base.endsWith('/') ? base : `${base}/`;
  const notFound = { page: 'not-found', splitId: null };
  if (![root, root.slice(0, -1), `${root}index.html`].includes(pathname)) return notFound;
  const path = hash === '' || hash === '#' ? '/' : hash.slice(1);
  if (path === '/') return { page: 'split', splitId: null };
  const simple = /^\/(split|login|register)\/?$/u.exec(path);
  if (simple) return { page: simple[1], splitId: null };
  const history = /^\/history(?:\/([A-Za-z0-9_-]{1,128}))?\/?$/u.exec(path);
  return history ? { page: 'history', splitId: history[1] ?? null } : notFound;
}
