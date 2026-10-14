/** PostgREST minimal writes can return an empty body with HTTP 201, not only 204. */
export async function restResponse<T>(response:Response):Promise<T>{const body=await response.text();return body.trim()?JSON.parse(body) as T:null as T;}
