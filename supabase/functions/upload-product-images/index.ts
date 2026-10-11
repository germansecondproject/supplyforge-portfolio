// Draws product images and uploads them to the public `product-images` bucket, for a range of product ids.
// Deploy it only while (re)uploading images, then delete it. The caller must send the token stored in a temporary
// table that only the service role can read:
//   create table public.upload_token (token text); alter table public.upload_token enable row level security;
//   insert into public.upload_token values (gen_random_uuid()::text);
//   POST /functions/v1/upload-product-images  { "from": 1, "to": 500 }  x-upload-token: <token>
// Drop the table when done.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { productImageSVG } from '../../../src/lib/product-image.ts';

Deno.serve(async (req) => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: tokens } = await sb.from('upload_token').select('token');
  const sent = req.headers.get('x-upload-token');
  if (!sent || !tokens?.some((t) => t.token === sent)) return new Response('Forbidden', { status: 403 });
  const { from, to } = await req.json();
  const { data, error } = await sb.from('products').select('slug, name, art').gte('id', from).lte('id', to).order('id');
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let uploaded = 0;
  const failed: string[] = [];
  for (let i = 0; i < data.length; i += 25) {
    await Promise.all(data.slice(i, i + 25).map(async (p) => {
      const svg = new Blob([productImageSVG(p.art, p.name)], { type: 'image/svg+xml' });
      const res = await sb.storage.from('product-images').upload(`${p.slug}.svg`, svg, { upsert: true, contentType: 'image/svg+xml', cacheControl: '604800' });
      if (res.error) failed.push(`${p.slug}: ${res.error.message}`);
      else uploaded++;
    }));
  }
  return Response.json({ uploaded, failed: failed.length, examples: failed.slice(0, 5) });
});
