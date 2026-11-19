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
    // 只收有標題、日期也解析得出來的（新版 @astrojs/rss 對壞資料會整個擋下 build）
    .filter(item => {
      const fm = item.mod.frontmatter || {};
      const title = typeof fm.title === 'string' ? fm.title.trim() : '';
      if (!title || title.includes('（必填）')) return false;
      return !Number.isNaN(new Date(fm.date).getTime());
    })
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
      link: `/EverNote/${item.prefix}/${item.slug}/`,
    })),
    customData: `<language>zh-TW</language>`,
  });
}
