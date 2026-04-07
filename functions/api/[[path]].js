const API_BASE = 'https://sdc-assemblies-api.azurewebsites.net';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const targetUrl = API_BASE + url.pathname + url.search;

  const headers = new Headers(context.request.headers);
  headers.delete('host');

  try {
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
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, target: targetUrl }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
