import rss from '@astrojs/rss';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const postImportResult = import.meta.glob('./posts/*.md', { eager: true });
  const noteImportResult = import.meta.glob('./notes/*.md', { eager: true });

  const postEntries = Object.entries(postImportResult).map(([path, mod]) => ({
    mod: mod as any,
    prefix: 'posts',
    slug: path.split('/').pop()?.replace('.md', '') || '',
  }));

  const noteEntries = Object.entries(noteImportResult).map(([path, mod]) => ({
    mod: mod as any,
    prefix: 'notes',
    slug: path.split('/').pop()?.replace('.md', '') || '',
  }));

  const allItems = [...postEntries, ...noteEntries]
    .filter(item => !item.mod.frontmatter.title?.includes('（必填）'))
    .sort((a, b) =>
      new Date(b.mod.frontmatter.date).getTime() - new Date(a.mod.frontmatter.date).getTime()
    );

  return rss({
    title: 'Jeffrey0117 技術筆記',
    description: '紀錄開發專案時學到的技術、踩過的坑、一些想法。',
    site: context.site!,
    items: allItems.map(item => ({
      title: item.mod.frontmatter.title,
      pubDate: new Date(item.mod.frontmatter.date),
      description: item.mod.frontmatter.description || '',
      link: `/Evernote/${item.prefix}/${item.slug}/`,
    })),
    customData: `<language>zh-TW</language>`,
  });
}
