import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let channel_id: string | null = null;
    try {
      const body = await req.json();
      channel_id = body?.channel_id ?? null;
    } catch { /* no body */ }

    // Get channel(s)
    let channelsQuery = supabase.from('channels').select('*').eq('is_active', true);
    if (channel_id) channelsQuery = channelsQuery.eq('id', channel_id);
    const { data: channels } = await channelsQuery;

    if (!channels?.length) {
      return new Response(JSON.stringify({ ok: true, processed: 0, added: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalAdded = 0;

    for (const channel of channels) {
      if (!channel.rss_url) continue;

      try {
        const res = await fetch(channel.rss_url, {
          headers: {
            'User-Agent': 'KostromaOS/28 RSS Reader',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          },
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) {
          console.error(`RSS fetch failed for ${channel.rss_url}: ${res.status}`);
          continue;
        }

        const xmlText = await res.text();

        interface RssItem {
          title: string;
          description: string;
          link: string;
          pubDate: string;
          imageUrl: string;
        }

        const items: RssItem[] = [];

        // ── Helper: extract CDATA-aware tag ──────────────────────
        const getTag = (block: string, tag: string): string => {
          const patterns = [
            new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'),
            new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'),
          ];
          for (const p of patterns) {
            const m = block.match(p);
            if (m) return m[1].trim();
          }
          return '';
        };

        // ── Helper: extract best image URL from RSS block ────────
        const extractImage = (block: string, description: string): string => {
          // 1. media:content url="..."
          const mediaContent = block.match(/<media:content[^>]+url=["']([^"']+)["']/i);
          if (mediaContent) return mediaContent[1];

          // 2. media:thumbnail url="..."
          const mediaThumbnail = block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
          if (mediaThumbnail) return mediaThumbnail[1];

          // 3. enclosure url="..." type="image/..."
          const encImage = block.match(/<enclosure[^>]+type=["']image[^"']*["'][^>]+url=["']([^"']+)["']/i)
            || block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image[^"']*["']/i);
          if (encImage) return encImage[1];

          // 4. Any enclosure url
          const encAny = block.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
          if (encAny) {
            const url = encAny[1];
            if (/\.(jpg|jpeg|png|gif|webp|svg)/i.test(url)) return url;
          }

          // 5. <image><url>...</url></image>
          const imgTag = block.match(/<image[^>]*>[\s\S]*?<url[^>]*>([\s\S]*?)<\/url>/i);
          if (imgTag) return imgTag[1].trim();

          // 6. img src in description HTML
          const imgSrc = description.match(/<img[^>]+src=["']([^"']+)["']/i);
          if (imgSrc) return imgSrc[1];

          // 7. og:image in description HTML
          const ogImg = description.match(/og:image[^"']*["']([^"']+)["']/i);
          if (ogImg) return ogImg[1];

          return '';
        };

        // ── Parse <item> blocks ───────────────────────────────────
        const itemMatches = xmlText.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi);
        for (const match of itemMatches) {
          const block = match[1];

          let title = getTag(block, 'title').replace(/<[^>]*>/g, '').trim();
          if (!title) continue;

          const rawDescription = getTag(block, 'description');
          const imageUrl = extractImage(block, rawDescription);

          // Strip HTML from description
          let description = rawDescription
            .replace(/<[^>]*>/g, '')
            .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
            .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 900);

          // link: try <link> tag first, then <guid isPermaLink="true">
          let link = getTag(block, 'link').trim();
          if (!link) {
            const guidMatch = block.match(/<guid[^>]*isPermaLink=["']true["'][^>]*>([\s\S]*?)<\/guid>/i);
            if (guidMatch) link = guidMatch[1].trim();
            else link = getTag(block, 'guid').trim();
          }

          const pubDate = getTag(block, 'pubDate') || getTag(block, 'dc:date') || getTag(block, 'updated');

          items.push({ title, description, link, pubDate, imageUrl });
          if (items.length >= 30) break;
        }

        // ── Load existing links + titles for dedup ────────────────
        const { data: existingPosts } = await supabase
          .from('channel_posts')
          .select('title, link')
          .eq('channel_id', channel.id);

        const existingTitles = new Set((existingPosts || []).map((p: any) => p.title?.trim()));
        const existingLinks  = new Set((existingPosts || []).map((p: any) => p.link?.trim()).filter(Boolean));

        let channelAdded = 0;

        for (const item of items) {
          // Deduplicate by link (primary) or title (fallback)
          if (item.link && existingLinks.has(item.link.trim())) continue;
          if (existingTitles.has(item.title.trim())) continue;

          const publishedAt = item.pubDate
            ? (() => { try { return new Date(item.pubDate).toISOString(); } catch { return new Date().toISOString(); } })()
            : new Date().toISOString();

          const { error } = await supabase.from('channel_posts').insert({
            channel_id: channel.id,
            title:       item.title,
            content:     item.description || null,
            link:        item.link || null,
            image_url:   item.imageUrl || null,
            published_at: publishedAt,
          });

          if (!error) {
            totalAdded++;
            channelAdded++;
            existingTitles.add(item.title.trim());
            if (item.link) existingLinks.add(item.link.trim());
          }
        }

        // Update channel RSS stats
        await supabase.from('channels').update({
          rss_last_parsed: new Date().toISOString(),
          rss_posts_added: (channel.rss_posts_added || 0) + channelAdded,
        }).eq('id', channel.id);

      } catch (e) {
        console.error(`RSS parse error for channel ${channel.id} (${channel.rss_url}):`, e);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, processed: channels.length, added: totalAdded }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('RSS parse function error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
