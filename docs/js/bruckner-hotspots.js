/*
 * Clickable models on the plate photographs of bruckner.html.
 *
 * Every entry-plate and comparison image that shows one of the ten collotype
 * sheets gets the same per-model hotspots as bruckner-grid.html, from the same
 * data file. Clicking a model that the page's own live figure can show (same
 * polyhedron) sets that figure's cells directly; anything else lands on the
 * clickable edition, opened at that very model.
 */

const GRID = 'bruckner-grid.html';

async function boot() {
  let plates;
  try {
    plates = await (await fetch('data/bruckner-plates.json')).json();
  } catch {
    return;   // data unavailable: the images simply stay plain
  }
  const byLeaf = new Map(plates.sheets.map(s => [s.leaf, s]));

  document.querySelectorAll('img[data-leaf-img]').forEach(img => {
    const sheet = byLeaf.get(+img.dataset.leafImg);
    if (!sheet) return;
    const wrap = document.createElement('span');
    wrap.className = 'hs-wrap';
    img.parentNode.insertBefore(wrap, img);
    wrap.appendChild(img);
    for (const fig of sheet.figs) {
      const hs = document.createElement('button');
      hs.type = 'button';
      hs.className = 'hs hs-' + (fig.status || 'tbd');
      hs.style.left = (fig.x0 * 100).toFixed(2) + '%';
      hs.style.top = (fig.y0 * 100).toFixed(2) + '%';
      hs.style.width = ((fig.x1 - fig.x0) * 100).toFixed(2) + '%';
      hs.style.height = ((fig.y1 - fig.y0) * 100).toFixed(2) + '%';
      const what = fig.name || (fig.status === 'tbd' ? 'not yet identified' : '');
      hs.title = `Fig. ${fig.fig}` + (what ? ` — ${what}` : '') +
                 (fig.status === 'build' ? ' — click to rebuild it' : '');
      hs.setAttribute('aria-label', hs.title);
      hs.addEventListener('click', ev => {
        ev.stopPropagation();
        activate(img, sheet, fig);
      });
      wrap.appendChild(hs);
    }
  });
}

function activate(img, sheet, fig) {
  const article = img.closest('article.entry');
  const bfigEl = article?.querySelector('.bfig');
  const f = bfigEl && window.bruckner?.figs?.get(bfigEl.id);
  if (fig.status === 'build' && f && bfigEl.dataset.poly === fig.poly) {
    f.start();
    f.setCells(fig.cells);
    // the preset buttons no longer describe the selection unless one matches
    article.querySelectorAll(`[data-target="${bfigEl.id}"]`).forEach(b =>
      b.classList.toggle('on', b.dataset.cells === fig.cells));
    bfigEl.classList.remove('flash');
    void bfigEl.offsetWidth;
    bfigEl.classList.add('flash');
    bfigEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    location.href = `${GRID}#f-${sheet.leaf}-${fig.fig}`;
  }
}

boot();
