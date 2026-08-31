// Throwaway probe: does Netlify's edge HTML injection apply to a response
// produced by an edge function? Deleted once answered.
export default async (): Promise<Response> =>
  new Response('<!doctype html><html><head><title>probe</title></head><body>probe</body></html>', {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });

export const config = { path: '/__probe' };
