import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { pushToDataLayer } from '../lib/gtm';

export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    pushToDataLayer({
      event: 'page_view',
      page_path: location.pathname + location.search,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [location]);

  return null;
}
