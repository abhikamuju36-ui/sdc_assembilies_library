const API_BASE = 'https://solidworksassemblieslibrary-atenaghyenffd2cv.canadacentral-01.azurewebsites.net';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const targetUrl = API_BASE + url.pathname + url.search;

  const headers = new Headers(context.request.headers);
  headers.delete('host');

  const response = await fetch(targetUrl, {
    method: context.request.method,
    headers,
    body: ['GET', 'HEAD'].includes(context.request.method) ? undefined : context.request.body,
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.set('Access-Control-Allow-Origin', '*');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
