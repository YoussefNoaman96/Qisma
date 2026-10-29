import { useEffect, useState } from 'react';

function readRoute() {
  const [page, splitId] = window.location.hash.slice(2).split('/');
  return {
    page: ['history', 'login', 'register'].includes(page) ? page : 'split',
    splitId: page === 'history' ? splitId || null : null,
  };
}

// Hash routes work on static hosting and support browser Back/Forward.
export default function usePageRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const updateRoute = () => setRoute(readRoute());
    window.addEventListener('hashchange', updateRoute);
    return () => window.removeEventListener('hashchange', updateRoute);
  }, []);
  return route;
}
