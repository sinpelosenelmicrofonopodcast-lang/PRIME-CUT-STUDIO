/** Bound actual bytes before parsing forms, including requests without Content-Length. */
export async function boundedForm(request: Request, maxBytes = 32000): Promise<FormData | Response> {
  const type = request.headers.get('content-type') || '';
  if (!type.startsWith('application/x-www-form-urlencoded') && !type.startsWith('multipart/form-data'))
    return new Response('Unsupported form encoding', {status: 415});
  const reader = request.body?.getReader();
  if (!reader) return new Response('Empty request', {status: 400});
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); return new Response('Request too large', {status: 413}); }
      parts.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.length; }
    return await new Request(request.url, {method: 'POST', headers: {'Content-Type': type}, body: bytes}).formData();
  } catch { return new Response('Malformed form', {status: 400}); }
}
