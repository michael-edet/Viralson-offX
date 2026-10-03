import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const siteDir = path.join(__dirname, '_site');

// Build with Eleventy if _site doesn't exist
if (!existsSync(siteDir)) {
  console.log('[Viral Son] Generating 11ty static site build...');
  try {
    execSync('npx @11ty/eleventy', { stdio: 'inherit' });
  } catch (err) {
    console.error('[Viral Son] 11ty build error:', err);
  }
}

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

// Redirect nested index.html to root
app.get('/**/index.html', (req, res, next) => {
  if (req.path === '/index.html') {
    return next();
  }
  res.redirect(301, '/');
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
  console.log(`Viral Son 11ty app running at http://0.0.0.0:${PORT}`);
});
