import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs, { existsSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { load as yamlLoad, dump as yamlDump } from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const siteDir = path.join(__dirname, '_site');
const postsDir = path.join(__dirname, 'src', 'posts');
const searchDataFile = path.join(__dirname, 'src', '_data', 'searchData.json');

// Middleware for JSON and form data
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Helper: Run Eleventy Build
function triggerEleventyBuild() {
  console.log('[Viral Son CMS] Triggering 11ty static build...');
  try {
    const output = execSync('npx @11ty/eleventy', { encoding: 'utf-8' });
    console.log('[Viral Son CMS] Build completed successfully.');
    return { success: true, output };
  } catch (err) {
    console.error('[Viral Son CMS] 11ty build error:', err.message);
    return { success: false, error: err.message };
  }
}

// Initial build if _site doesn't exist
if (!existsSync(siteDir)) {
  triggerEleventyBuild();
}

// Helper: Slugify title
function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Helper: Map category to URL and CSS class
function getCategoryMeta(cat) {
  const c = String(cat || 'News').toLowerCase();
  switch (c) {
    case 'technology':
    case 'tech':
      return { category: 'Technology', categoryUrl: '/technology/', categoryClass: 'tech' };
    case 'entertainment':
      return { category: 'Entertainment', categoryUrl: '/entertainment/', categoryClass: 'ent' };
    case 'sports':
      return { category: 'Sports', categoryUrl: '/sports/', categoryClass: 'sports' };
    case 'lifestyle':
      return { category: 'Lifestyle', categoryUrl: '/lifestyle/', categoryClass: 'lifestyle' };
    case 'community':
      return { category: 'Community', categoryUrl: '/community/', categoryClass: 'community' };
    case 'news':
    default:
      return { category: 'News', categoryUrl: '/news/', categoryClass: 'news' };
  }
}

// Helper: Parse single post file
function parsePostFile(filename) {
  const filePath = path.join(postsDir, filename);
  if (!existsSync(filePath)) return null;
  const raw = readFileSync(filePath, 'utf-8');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  let data = {};
  let body = raw;

  if (match) {
    try {
      data = yamlLoad(match[1]) || {};
    } catch (e) {
      console.warn(`Error parsing YAML frontmatter in ${filename}:`, e.message);
    }
    body = match[2] || '';
  }

  const slug = filename.replace(/\.(njk|md)$/, '');
  const wordCount = body.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  const estimatedReadTime = Math.max(1, Math.ceil(wordCount / 200)) + ' min read';

  // Format date string
  let dateStr = '';
  if (data.date) {
    if (data.date instanceof Date) {
      dateStr = data.date.toISOString().split('T')[0];
    } else {
      dateStr = String(data.date).split('T')[0];
    }
  }

  return {
    slug,
    filename,
    title: data.title || slug,
    description: data.description || '',
    excerpt: data.excerpt || data.description || '',
    category: data.category || 'News',
    categoryUrl: data.categoryUrl || `/${(data.category || 'news').toLowerCase()}/`,
    categoryClass: data.categoryClass || 'news',
    author: data.author || 'Viral Son Editorial',
    authorBio: data.authorBio || '',
    date: dateStr || new Date().toISOString().split('T')[0],
    readTime: data.readTime || estimatedReadTime,
    views: data.views || '1.2K views',
    image: data.image || '',
    imageCaption: data.imageCaption || '',
    tags: Array.isArray(data.tags) ? data.tags : (data.tags ? [data.tags] : []),
    permalink: data.permalink || `/posts/${slug}/`,
    draft: !!data.draft,
    layout: data.layout || 'layouts/post.njk',
    content: body.trim(),
    wordCount,
    lastModified: fs.statSync(filePath).mtime
  };
}

// API Routes
// 1. GET /api/posts - List all posts
app.get('/api/posts', (req, res) => {
  try {
    if (!existsSync(postsDir)) {
      return res.json([]);
    }
    const files = readdirSync(postsDir).filter(f => f.endsWith('.njk') || f.endsWith('.md'));
    const posts = files
      .map(file => parsePostFile(file))
      .filter(Boolean)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read posts', details: err.message });
  }
});

// 2. GET /api/posts/:slug - Get single post
app.get('/api/posts/:slug', (req, res) => {
  try {
    const slug = req.params.slug;
    let post = parsePostFile(`${slug}.njk`) || parsePostFile(`${slug}.md`);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read post', details: err.message });
  }
});

// 3. POST /api/posts - Create or publish new post
app.post('/api/posts', (req, res) => {
  try {
    const {
      title,
      slug: customSlug,
      excerpt,
      description,
      category,
      author,
      authorBio,
      date,
      readTime,
      views,
      image,
      imageCaption,
      tags,
      draft,
      content
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const finalSlug = slugify(customSlug || title);
    if (!finalSlug) {
      return res.status(400).json({ error: 'Could not generate a valid URL slug' });
    }

    const catMeta = getCategoryMeta(category);
    const dateFormatted = date ? String(date).split('T')[0] : new Date().toISOString().split('T')[0];
    const tagsArr = Array.isArray(tags)
      ? tags.map(t => String(t).trim()).filter(Boolean)
      : (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : []);

    const wordCount = String(content || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    const computedReadTime = readTime || (Math.max(1, Math.ceil(wordCount / 200)) + ' min read');

    const frontmatterObj = {
      layout: 'layouts/post.njk',
      title: title.trim(),
      description: (description || excerpt || title).trim(),
      excerpt: (excerpt || description || title).trim(),
      category: catMeta.category,
      categoryUrl: catMeta.categoryUrl,
      categoryClass: catMeta.categoryClass,
      author: (author || 'Viral Son Editorial').trim(),
      authorBio: (authorBio || '').trim(),
      date: dateFormatted,
      readTime: computedReadTime,
      views: views || '1.4K views',
      image: (image || '').trim(),
      imageCaption: (imageCaption || '').trim(),
      tags: tagsArr.length > 0 ? tagsArr : ['Trending'],
      permalink: `/posts/${finalSlug}/`,
      draft: !!draft
    };

    const frontmatterYaml = yamlDump(frontmatterObj, {
      lineWidth: -1,
      quotingType: '"',
      forceQuotes: false
    });

    const fileContent = `---\n${frontmatterYaml}---\n\n${(content || '<p>Article draft...</p>').trim()}\n`;
    const targetFile = path.join(postsDir, `${finalSlug}.njk`);

    writeFileSync(targetFile, fileContent, 'utf-8');

    // Update searchData.json
    try {
      if (existsSync(searchDataFile)) {
        let searchList = JSON.parse(readFileSync(searchDataFile, 'utf-8'));
        const permalink = `/posts/${finalSlug}/`;
        const existingIdx = searchList.findIndex(item => item.url === permalink);
        
        // Pretty display date for search index e.g. "October 3, 2026"
        const displayDate = new Date(dateFormatted + 'T12:00:00Z').toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        const searchEntry = {
          title: title.trim(),
          url: permalink,
          category: catMeta.category,
          excerpt: (excerpt || description || title).trim(),
          tags: tagsArr,
          date: displayDate
        };

        if (existingIdx >= 0) {
          searchList[existingIdx] = searchEntry;
        } else {
          searchList.unshift(searchEntry);
        }

        writeFileSync(searchDataFile, JSON.stringify(searchList, null, 2), 'utf-8');
      }
    } catch (e) {
      console.warn('Could not sync searchData.json:', e.message);
    }

    // Trigger 11ty build
    const buildResult = triggerEleventyBuild();

    res.json({
      success: true,
      slug: finalSlug,
      url: `/posts/${finalSlug}/`,
      message: draft ? 'Post draft saved successfully!' : 'Post published successfully!',
      build: buildResult
    });
  } catch (err) {
    console.error('Error saving post:', err);
    res.status(500).json({ error: 'Failed to publish post', details: err.message });
  }
});

// 4. PUT /api/posts/:slug - Update an existing post
app.put('/api/posts/:slug', (req, res) => {
  try {
    const originalSlug = req.params.slug;
    const {
      title,
      slug: newSlug,
      excerpt,
      description,
      category,
      author,
      authorBio,
      date,
      readTime,
      views,
      image,
      imageCaption,
      tags,
      draft,
      content
    } = req.body;

    const targetSlug = slugify(newSlug || originalSlug);
    const catMeta = getCategoryMeta(category);
    const dateFormatted = date ? String(date).split('T')[0] : new Date().toISOString().split('T')[0];
    const tagsArr = Array.isArray(tags)
      ? tags.map(t => String(t).trim()).filter(Boolean)
      : (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : []);

    const wordCount = String(content || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    const computedReadTime = readTime || (Math.max(1, Math.ceil(wordCount / 200)) + ' min read');

    const frontmatterObj = {
      layout: 'layouts/post.njk',
      title: (title || targetSlug).trim(),
      description: (description || excerpt || title || '').trim(),
      excerpt: (excerpt || description || title || '').trim(),
      category: catMeta.category,
      categoryUrl: catMeta.categoryUrl,
      categoryClass: catMeta.categoryClass,
      author: (author || 'Viral Son Editorial').trim(),
      authorBio: (authorBio || '').trim(),
      date: dateFormatted,
      readTime: computedReadTime,
      views: views || '1.4K views',
      image: (image || '').trim(),
      imageCaption: (imageCaption || '').trim(),
      tags: tagsArr.length > 0 ? tagsArr : ['Trending'],
      permalink: `/posts/${targetSlug}/`,
      draft: !!draft
    };

    const frontmatterYaml = yamlDump(frontmatterObj, {
      lineWidth: -1,
      quotingType: '"',
      forceQuotes: false
    });

    const fileContent = `---\n${frontmatterYaml}---\n\n${(content || '').trim()}\n`;

    // If slug changed, delete old file
    if (originalSlug !== targetSlug) {
      const oldFileNjk = path.join(postsDir, `${originalSlug}.njk`);
      const oldFileMd = path.join(postsDir, `${originalSlug}.md`);
      if (existsSync(oldFileNjk)) unlinkSync(oldFileNjk);
      if (existsSync(oldFileMd)) unlinkSync(oldFileMd);
    }

    const newFilePath = path.join(postsDir, `${targetSlug}.njk`);
    writeFileSync(newFilePath, fileContent, 'utf-8');

    // Update searchData.json
    try {
      if (existsSync(searchDataFile)) {
        let searchList = JSON.parse(readFileSync(searchDataFile, 'utf-8'));
        const oldPermalink = `/posts/${originalSlug}/`;
        const newPermalink = `/posts/${targetSlug}/`;

        searchList = searchList.filter(item => item.url !== oldPermalink && item.url !== newPermalink);

        const displayDate = new Date(dateFormatted + 'T12:00:00Z').toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        searchList.unshift({
          title: (title || targetSlug).trim(),
          url: newPermalink,
          category: catMeta.category,
          excerpt: (excerpt || description || title).trim(),
          tags: tagsArr,
          date: displayDate
        });

        writeFileSync(searchDataFile, JSON.stringify(searchList, null, 2), 'utf-8');
      }
    } catch (e) {
      console.warn('Could not sync searchData.json:', e.message);
    }

    const buildResult = triggerEleventyBuild();

    res.json({
      success: true,
      slug: targetSlug,
      url: `/posts/${targetSlug}/`,
      message: 'Post updated and site regenerated successfully!',
      build: buildResult
    });
  } catch (err) {
    console.error('Error updating post:', err);
    res.status(500).json({ error: 'Failed to update post', details: err.message });
  }
});

// 5. DELETE /api/posts/:slug - Delete post
app.delete('/api/posts/:slug', (req, res) => {
  try {
    const slug = req.params.slug;
    const fileNjk = path.join(postsDir, `${slug}.njk`);
    const fileMd = path.join(postsDir, `${slug}.md`);

    let removed = false;
    if (existsSync(fileNjk)) {
      unlinkSync(fileNjk);
      removed = true;
    }
    if (existsSync(fileMd)) {
      unlinkSync(fileMd);
      removed = true;
    }

    if (!removed) {
      return res.status(404).json({ error: 'Post file not found' });
    }

    // Remove from searchData.json
    try {
      if (existsSync(searchDataFile)) {
        let searchList = JSON.parse(readFileSync(searchDataFile, 'utf-8'));
        const permalink = `/posts/${slug}/`;
        searchList = searchList.filter(item => item.url !== permalink);
        writeFileSync(searchDataFile, JSON.stringify(searchList, null, 2), 'utf-8');
      }
    } catch (e) {
      console.warn('Could not sync searchData on delete:', e.message);
    }

    // Trigger rebuild
    triggerEleventyBuild();

    res.json({ success: true, message: `Post "${slug}" deleted successfully` });
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ error: 'Failed to delete post', details: err.message });
  }
});

// 6. POST /api/rebuild - Force site rebuild
app.post('/api/rebuild', (req, res) => {
  const result = triggerEleventyBuild();
  res.json({
    ...result,
    timestamp: new Date().toISOString()
  });
});

// 7. GET /api/stats - CMS Statistics
app.get('/api/stats', (req, res) => {
  try {
    const files = existsSync(postsDir)
      ? readdirSync(postsDir).filter(f => f.endsWith('.njk') || f.endsWith('.md'))
      : [];
    const posts = files.map(file => parsePostFile(file)).filter(Boolean);

    const categories = {};
    let totalViews = 0;
    let draftsCount = 0;
    let publishedCount = 0;

    posts.forEach(p => {
      categories[p.category] = (categories[p.category] || 0) + 1;
      if (p.draft) draftsCount++;
      else publishedCount++;

      // Parse views string like "19.4K views" or "1200"
      const matchViews = (p.views || '').match(/([\d.]+)\s*([kKmM]?)/);
      if (matchViews) {
        let num = parseFloat(matchViews[1]) || 0;
        let unit = (matchViews[2] || '').toLowerCase();
        if (unit === 'k') num *= 1000;
        if (unit === 'm') num *= 1000000;
        totalViews += Math.round(num);
      }
    });

    res.json({
      totalPosts: posts.length,
      publishedCount,
      draftsCount,
      categories,
      totalViews,
      latestPostDate: posts[0] ? posts[0].date : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate stats', details: err.message });
  }
});

// 8. GET /api/settings/ads - Get Google AdSense configuration
const siteJsonPath = path.join(__dirname, 'src', '_data', 'site.json');
const adsTxtRoot = path.join(__dirname, 'ads.txt');
const adsTxtSrc = path.join(__dirname, 'src', 'ads.txt');

app.get('/api/settings/ads', (req, res) => {
  try {
    let siteData = {};
    if (existsSync(siteJsonPath)) {
      siteData = JSON.parse(readFileSync(siteJsonPath, 'utf-8'));
    }
    const googleAdSense = siteData.googleAdSense || {
      clientId: 'ca-pub-9481237418920194',
      slots: {
        leaderboard: '8947291032',
        sidebar: '4920192831',
        inarticle: '3819204918',
        infeed: '5839201847',
        billboard: '9182736450'
      }
    };
    res.json(googleAdSense);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load ad settings', details: err.message });
  }
});

// 9. POST /api/settings/ads - Save Google AdSense configuration & sync ads.txt
app.post('/api/settings/ads', (req, res) => {
  try {
    const { clientId, slots } = req.body;
    if (!clientId) {
      return res.status(400).json({ error: 'Google AdSense Client ID (e.g. ca-pub-XXXXXXXXXXXXXXXX) is required' });
    }

    // Clean client ID
    const cleanClient = clientId.trim();
    const cleanPubId = cleanClient.replace(/^ca-/, '');

    // Update site.json
    let siteData = {};
    if (existsSync(siteJsonPath)) {
      siteData = JSON.parse(readFileSync(siteJsonPath, 'utf-8'));
    }
    siteData.googleAdSense = {
      clientId: cleanClient,
      slots: slots || (siteData.googleAdSense && siteData.googleAdSense.slots) || {
        leaderboard: '8947291032',
        sidebar: '4920192831',
        inarticle: '3819204918',
        infeed: '5839201847',
        billboard: '9182736450'
      }
    };
    writeFileSync(siteJsonPath, JSON.stringify(siteData, null, 2), 'utf-8');

    // Update ads.txt in root and src
    const adsTxtContent = `# Google AdSense Publisher Authorization File for viralson.com\ngoogle.com, ${cleanPubId}, DIRECT, f08c47fec0942fa0\n`;
    writeFileSync(adsTxtRoot, adsTxtContent, 'utf-8');
    writeFileSync(adsTxtSrc, adsTxtContent, 'utf-8');

    // Trigger rebuild to regenerate static pages with updated AdSense script
    const buildResult = triggerEleventyBuild();

    res.json({
      success: true,
      message: 'Google AdSense settings updated, ads.txt synchronized, and site recompiled.',
      clientId: cleanClient,
      pubId: cleanPubId,
      build: buildResult
    });
  } catch (err) {
    console.error('Error updating ad settings:', err);
    res.status(500).json({ error: 'Failed to save ad settings', details: err.message });
  }
});

// Legacy URL 301 Redirects to Canonical 11ty Routes
const legacyRedirects = {
  '/Assets/page/subpage/news.html': '/news/',
  '/Assets/page/subpage/entertainment.html': '/entertainment/',
  '/Assets/page/subpage/technology.html': '/technology/',
  '/Assets/page/subpage/lifestyle.html': '/lifestyle/',
  '/Assets/page/subpage/community.html': '/community/',
  '/Assets/page/subpage/about.html': '/about/',
  '/Assets/page/postdetail/news.html': '/posts/global-climate-summit/',
  '/Assets/page/postdetail/technology.html': '/posts/revolutionary-foldable-phone/',
  '/Assets/page/postdetail/entertainment.html': '/posts/summer-music-festival/',
  '/Assets/page/postdetail/lifestyle.html': '/posts/minimalism-lifestyle/',
  '/Assets/page/postdetail/1T-entertainment.html': '/posts/midnight-whispers/',
  '/Assets/page/postdetail/trac.html': '/posts/midnight-dreams-track/',
  '/Assets/page/postdetail/tra.html': '/posts/midnight-dreams-track/',
  '/Assets/page/postdetail/simple.html': '/posts/simple-post/',
  '/Assets/page/download/music.html': '/download/music/',
  '/Assets/page/download/music0.html': '/download/music0/'
};

for (const [legacyPath, newRoute] of Object.entries(legacyRedirects)) {
  app.get(legacyPath, (req, res) => res.redirect(301, newRoute));
}

// Redirect clean nested index.html
app.get('/**/index.html', (req, res, next) => {
  if (req.path === '/index.html') {
    return next();
  }
  const cleanPath = req.path.replace(/\/index\.html$/, '/') || '/';
  res.redirect(301, cleanPath);
});

// Serve compiled 11ty site
app.use(express.static(siteDir));

// Fallback to repository assets if needed
app.use(express.static(__dirname));

// Fallback 404 to compiled homepage
app.use((req, res) => {
  res.status(404).sendFile(path.join(siteDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Viral Son 11ty & CMS Studio running at http://0.0.0.0:${PORT}`);
});
