/**
 * Dynamic Media Scene7 viewer block.
 * Parses a viewer URL (e.g. SmartCropVideoViewer.html?…) and
 * initialises the matching s7viewers class.
 */

function getViewerUrl(block) {
  const anchor = block.querySelector('a[href]');
  if (anchor?.href) return anchor.href;
  return block.textContent?.trim() || '';
}

function toHttps(str) {
  return str.replace(/^http:/i, 'https:');
}

function parseViewerUrl(rawUrl) {
  try {
    const url = new URL(toHttps(rawUrl));
    const viewerType = url.pathname.split('/').pop()?.replace(/\.html$/i, '') || '';
    if (!viewerType) return null;

    const get = (key) => {
      const entry = [...url.searchParams].find(([k]) => k.toLowerCase() === key.toLowerCase());
      return entry ? toHttps(entry[1]) : '';
    };

    const base = `${url.protocol}//${url.host}`;
    return {
      viewerType,
      jsUrl: `${base}/s7viewers/html5/js/${viewerType}.js`,
      params: {
        serverurl: get('serverurl') || `${base}/is/image/`,
        contenturl: get('contenturl') || `${base}/is/content/`,
        config: get('config') || '',
        videoserverurl: get('videoserverurl') || `${base}/is/content`,
        asset: get('asset') || '',
      },
    };
  } catch {
    return null;
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load viewer script: ${src}`));
    document.head.appendChild(script);
  });
}

export default async function decorate(block) {
  const rawUrl = getViewerUrl(block);
  if (!rawUrl) return;

  const parsed = parseViewerUrl(rawUrl);
  if (!parsed) return;

  const { viewerType, jsUrl, params } = parsed;

  const containerId = `dm-viewer-${Math.random().toString(36).slice(2, 9)}`;
  const container = document.createElement('div');
  container.id = containerId;
  container.className = 'dm-viewer-stage';

  block.textContent = '';
  block.append(container);

  try {
    await loadScript(jsUrl);
  } catch {
    return;
  }

  const ViewerClass = window.s7viewers?.[viewerType];
  if (!ViewerClass) return;

  const viewer = new ViewerClass({ containerId, params });
  viewer.init();
}
