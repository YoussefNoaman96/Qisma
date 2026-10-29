import { useEffect, useState } from 'react';
import { parseRoute } from '../lib/routes';

function readRoute() {
  return parseRoute(window.location.hash, window.location.pathname, import.meta.env.BASE_URL);
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
