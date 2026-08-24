import { useCallback, useState } from 'react';
import { api } from '@/lib/api';

/**
 * Export/download links are plain files served by the API, which can't carry
 * an Authorization header from a click — so every download first fetches a
 * 60-second single-purpose token (see GET /api/auth/download-token) and
 * appends it to the URL, then navigates there. Returns a click handler to
 * pass to a button styled like the link it replaces, plus whether a fetch is
 * in flight so the UI can show it.
 */
export function useDownload() {
  const [downloading, setDownloading] = useState(false);

  /** `url` is the full path as it already appears in existing hrefs, e.g. `/api/exports/gl.csv?companyId=...`. */
  const download = useCallback(async (url: string) => {
    setDownloading(true);
    try {
      const res = await api.get<{ token: string }>('/auth/download-token');
      const separator = url.includes('?') ? '&' : '?';
      window.location.href = `${url}${separator}downloadToken=${encodeURIComponent(res.token)}`;
    } finally {
      setDownloading(false);
    }
  }, []);

  return { download, downloading };
}
