async function loadData() {
  try {
    // Essayer d'abord à la racine (cas GitHub Pages upload manuel)
    // Ajout d'un timestamp pour éviter le cache
    const ts = Date.now();
    let res = await fetch('collection.json?t=' + ts);
    
    if (!res.ok) {
        console.log('Echec racine, essai data/');
        res = await fetch('data/collection.json?t=' + ts); // Cas local ou structure dossier respectée
    }
    if (!res.ok) {
        console.log('Echec data/, essai basic');
        res = await fetch('data/collection_basic.json?t=' + ts); // Fallback
    }
    
    if (!res.ok) throw new Error('Fichier non trouvé (HTTP ' + res.status + ')');
    
    const json = await res.json();
    return json;
  } catch (e) {
    document.getElementById('loading').textContent = 'Erreur: ' + e.message;
    document.getElementById('info').textContent = 'Impossible de charger la collection. Vérifiez que collection.json est bien à la racine du site.';
    return { releases: [] };
  }
}

function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean))).sort();
}

function cmpStr(a, b) {
  const aa = (a || '').toString().toLowerCase();
  const bb = (b || '').toString().toLowerCase();
  if (!aa && !bb) return 0;
  if (!aa) return 1;
  if (!bb) return -1;
  return aa.localeCompare(bb);
}

function toDateVal(s) {
  if (!s) return Number.POSITIVE_INFINITY;
  const d = new Date(s);
  const t = d.getTime();
  return isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

function readQuery() {
  const p = new URLSearchParams(window.location.search);
  return {
    q: p.get('q') || '',
    genre: p.get('genre') || '',
    style: p.get('style') || '',
    format: p.get('format') || '',
    year: p.get('year') || '',
    sort: p.get('sort') || '',
    sort2: p.get('sort2') || '',
    order: p.get('order') || 'asc',
    group: p.get('group') || '',
    minPrice: p.get('minPrice') || '',
    maxPrice: p.get('maxPrice') || ''
  };
}

function writeQuery(state) {
  const p = new URLSearchParams();
  if (state.q) p.set('q', state.q);
  if (state.genre) p.set('genre', state.genre);
  if (state.style) p.set('style', state.style);
  if (state.format) p.set('format', state.format);
  if (state.year) p.set('year', state.year);
  if (state.sort) p.set('sort', state.sort);
  if (state.sort2) p.set('sort2', state.sort2);
  if (state.order && state.order !== 'asc') p.set('order', state.order);
  if (state.group) p.set('group', state.group);
  if (state.minPrice) p.set('minPrice', state.minPrice);
  if (state.maxPrice) p.set('maxPrice', state.maxPrice);
  const qs = p.toString();
  const url = qs ? `?${qs}` : window.location.pathname;
  window.history.replaceState(null, '', url);
}

function renderFilters(items) {
  const genres = uniq(items.flatMap((r) => r.genres));
  const styles = uniq(items.flatMap((r) => r.styles));
  const formats = uniq(items.flatMap((r) => r.formats));
  const years = uniq(items.map((r) => r.year)).sort((a, b) => (a || 0) - (b || 0));

  const genreSel = document.getElementById('genre');
  const styleSel = document.getElementById('style');
  const formatSel = document.getElementById('format');
  const yearSel = document.getElementById('year');

  for (const g of genres) genreSel.append(new Option(g, g));
  for (const s of styles) styleSel.append(new Option(s, s));
  for (const f of formats) formatSel.append(new Option(f, f));
  for (const y of years) yearSel.append(new Option(y, y));
}

function matchFilter(item, filters) {
  const q = filters.q.toLowerCase();
  const text = [item.title, ...(item.artists || []), ...(item.labels || [])].join(' ').toLowerCase();
  if (q && !text.includes(q)) return false;
  if (filters.genre && !(item.genres || []).includes(filters.genre)) return false;
  if (filters.style && !(item.styles || []).includes(filters.style)) return false;
  if (filters.format && !(item.formats || []).includes(filters.format)) return false;
  if (filters.year && String(item.year) !== String(filters.year)) return false;
  const pavg = Number(item.price_avg);
  const minP = filters.minPrice ? Number(filters.minPrice) : null;
  const maxP = filters.maxPrice ? Number(filters.maxPrice) : null;
  if (minP !== null && isFinite(minP)) {
    if (!isFinite(pavg) || pavg < minP) return false;
  }
  if (maxP !== null && isFinite(maxP)) {
    if (!isFinite(pavg) || pavg > maxP) return false;
  }
  return true;
}

function render(items) {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  for (const r of items) {
    const link = document.createElement('a');
    link.href = r.id ? `https://www.discogs.com/release/${r.id}` : '#';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const card = document.createElement('div');
    card.className = 'card';
    const img = document.createElement('img');
    img.src = r.cover_image || r.thumb || '';
    img.alt = r.title || '';
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = `${(r.artists || []).join(', ')} — ${r.title}`;
    const subtitle = document.createElement('div');
    subtitle.className = 'subtitle';
    const lbl = Array.isArray(r.labels_full) ? r.labels_full.map(l => l.name + (l.catno ? ' — ' + l.catno : '')).join(' · ') : (Array.isArray(r.labels) ? r.labels.join(', ') : '');
    if (lbl) subtitle.textContent = lbl;
    const meta = document.createElement('div');
    meta.className = 'meta';
    const labelCat = Array.isArray(r.labels_full) && r.labels_full.length ? r.labels_full.map(l => l.catno).filter(Boolean).join(', ') : '';
    const country = r.country || '';
    const released = r.released || '';
    const extra = [country, released, labelCat].filter(Boolean).join(' · ');
    meta.textContent = [r.year, r.format_text, extra].filter(Boolean).join(' · ');
    const rating = document.createElement('div');
    rating.className = 'rating';
    const stars = (r.rating && Number(r.rating) > 0) ? '★'.repeat(Math.min(5, Number(r.rating))) : '';
    if (stars) rating.textContent = `Évaluation: ${stars} (${r.rating})`;
    const price = document.createElement('div');
    price.className = 'price';
    if (typeof r.price_avg === 'number' && isFinite(r.price_avg)) {
      const fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: r.currency || 'EUR' });
      price.textContent = `Estimation: ${fmt.format(r.price_avg)}`;
    }
    const market = document.createElement('div');
    market.className = 'market';
    if (typeof r.market_min === 'number' && isFinite(r.market_min) && typeof r.market_max === 'number' && isFinite(r.market_max)) {
      const cur = r.market_currency || r.currency || 'EUR';
      const fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: cur });
      market.textContent = `Marché: ${fmt.format(r.market_min)} – ${fmt.format(r.market_max)}`;
    }
    const btn = document.createElement('button');
    btn.textContent = 'Pistes';
    const details = document.createElement('div');
    details.className = 'details';
    const tl = Array.isArray(r.tracklist) ? r.tracklist : [];
    if (tl.length) {
      const ul = document.createElement('ul');
      for (const t of tl) {
        const li = document.createElement('li');
        const pos = t.position ? t.position + ' ' : '';
        const dur = t.duration ? ' (' + t.duration + ')' : '';
        li.textContent = pos + t.title + dur;
        ul.append(li);
      }
      details.append(ul);
    }
    if (Array.isArray(r.barcode) && r.barcode.length) {
      const bc = document.createElement('div');
      bc.className = 'field';
      bc.textContent = 'Barcodes: ' + r.barcode.join(', ');
      details.append(bc);
    }
    if (r.notes) {
      const notes = document.createElement('div');
      notes.className = 'notes';
      notes.textContent = r.notes;
      details.append(notes);
    }
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      card.classList.toggle('open');
    });
    card.append(img, title, subtitle, meta, rating, price, market, btn, details);
    link.append(card);
    grid.append(link);
  }
}

function renderGrouped(items, mode) {
  const root = document.getElementById('grid');
  root.innerHTML = '';
  const groups = new Map();
  for (const r of items) {
    if (mode === 'year') {
      const key = r.year ? String(r.year) : 'Inconnue';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    } else if (mode === 'label') {
      let key = 'Sans label';
      if (Array.isArray(r.labels_full) && r.labels_full.length) key = r.labels_full[0].name || key;
      else if (Array.isArray(r.labels) && r.labels.length) key = r.labels[0] || key;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    } else if (mode === 'artist') {
      const names = Array.isArray(r.artists) ? r.artists : [];
      if (!names.length) {
        const k = 'Sans artiste';
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(r);
      } else {
        for (const n of names) {
          const k = n || 'Sans artiste';
          if (!groups.has(k)) groups.set(k, []);
          groups.get(k).push(r);
        }
      }
    }
  }
  const keys = Array.from(groups.keys()).sort((a, b) => cmpStr(a, b));
  for (const k of keys) {
    const section = document.createElement('section');
    section.className = 'group';
    const title = document.createElement('div');
    title.className = 'group-title';
    title.textContent = k;
    const grid = document.createElement('div');
    grid.className = 'grid';
    section.append(title, grid);
    root.append(section);
    for (const r of groups.get(k)) {
      const link = document.createElement('a');
      link.href = r.id ? `https://www.discogs.com/release/${r.id}` : '#';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      const card = document.createElement('div');
      card.className = 'card';
      const img = document.createElement('img');
      img.src = r.cover_image || r.thumb || '';
      img.alt = r.title || '';
      const titleEl = document.createElement('div');
      titleEl.className = 'title';
      titleEl.textContent = `${(r.artists || []).join(', ')} — ${r.title}`;
      const subtitle = document.createElement('div');
      subtitle.className = 'subtitle';
      const lbl = Array.isArray(r.labels_full) ? r.labels_full.map(l => l.name + (l.catno ? ' — ' + l.catno : '')).join(' · ') : (Array.isArray(r.labels) ? r.labels.join(', ') : '');
      if (lbl) subtitle.textContent = lbl;
      const meta = document.createElement('div');
      meta.className = 'meta';
      const labelCat = Array.isArray(r.labels_full) && r.labels_full.length ? r.labels_full.map(l => l.catno).filter(Boolean).join(', ') : '';
      const country = r.country || '';
      const released = r.released || '';
      const extra = [country, released, labelCat].filter(Boolean).join(' · ');
      meta.textContent = [r.year, r.format_text, extra].filter(Boolean).join(' · ');
      const btn = document.createElement('button');
      btn.textContent = 'Pistes';
      const details = document.createElement('div');
      details.className = 'details';
      const tl = Array.isArray(r.tracklist) ? r.tracklist : [];
      if (tl.length) {
        const ul = document.createElement('ul');
        for (const t of tl) {
          const li = document.createElement('li');
          const pos = t.position ? t.position + ' ' : '';
          const dur = t.duration ? ' (' + t.duration + ')' : '';
          li.textContent = pos + t.title + dur;
          ul.append(li);
        }
        details.append(ul);
      }
      if (Array.isArray(r.barcode) && r.barcode.length) {
        const bc = document.createElement('div');
        bc.className = 'field';
        bc.textContent = 'Barcodes: ' + r.barcode.join(', ');
        details.append(bc);
      }
      if (Array.isArray(r.price_suggestions) && r.price_suggestions.length) {
        const pr = document.createElement('div');
        pr.className = 'field';
        const fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: r.currency || 'EUR' });
        pr.textContent = 'Prix estimés: ' + r.price_suggestions.map(e => `${e.condition}: ${fmt.format(e.value)}`).join(' · ');
        details.append(pr);
      }
      if (r.notes) {
        const notes = document.createElement('div');
        notes.className = 'notes';
        notes.textContent = r.notes;
        details.append(notes);
      }
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        card.classList.toggle('open');
      });
      card.append(img, titleEl, subtitle, meta, btn, details);
      link.append(card);
      grid.append(link);
    }
  }
}

function attachHandlers(state) {
  const q = document.getElementById('search');
  const genre = document.getElementById('genre');
  const style = document.getElementById('style');
  const format = document.getElementById('format');
  const year = document.getElementById('year');
  const sort = document.getElementById('sort');
  const sort2 = document.getElementById('sort2');
  const orderSel = document.getElementById('order');
  const groupSel = document.getElementById('group');
  const copyBtn = document.getElementById('copy');
  const resetBtn = document.getElementById('reset');
  const statsToggle = document.getElementById('statsToggle');
  const recentToggle = document.getElementById('recentToggle');
  const minPrice = document.getElementById('minPrice');
  const maxPrice = document.getElementById('maxPrice');

  const initial = readQuery();
  q.value = initial.q;
  genre.value = initial.genre;
  style.value = initial.style;
  format.value = initial.format;
  year.value = initial.year;
  sort.value = initial.sort;
  sort2.value = initial.sort2;
  orderSel.value = initial.order;
  groupSel.value = initial.group;
  if (minPrice) minPrice.value = initial.minPrice;
  if (maxPrice) maxPrice.value = initial.maxPrice;

  const update = () => {
    const filters = {
      q: q.value || '',
      genre: genre.value || '',
      style: style.value || '',
      format: format.value || '',
      year: year.value || '',
      minPrice: minPrice ? (minPrice.value || '') : '',
      maxPrice: maxPrice ? (maxPrice.value || '') : ''
    };
    let list = state.items.filter((i) => matchFilter(i, filters));
    const s = sort.value || '';
    const s2 = sort2.value || '';
    const ord = orderSel.value || 'asc';
    const compFor = (k) => {
      if (k === 'released') return (a, b) => toDateVal(a.released) - toDateVal(b.released);
      if (k === 'country') return (a, b) => cmpStr(a.country, b.country);
      if (k === 'title') return (a, b) => cmpStr(a.title, b.title);
      if (k === 'artist') return (a, b) => cmpStr((a.artists || []).join(' '), (b.artists || []).join(' '));
      if (k === 'price') return (a, b) => (Number(a.price_avg) || Number.POSITIVE_INFINITY) - (Number(b.price_avg) || Number.POSITIVE_INFINITY);
      return null;
    };
    const c1 = compFor(s);
    const c2 = compFor(s2);
    if (c1 || c2) {
      list.sort((a, b) => {
        let r = c1 ? c1(a, b) : 0;
        if (r !== 0) return r;
        r = c2 ? c2(a, b) : 0;
        if (r !== 0) return r;
        return cmpStr(a.title, b.title);
      });
    }
    if (ord === 'desc') list.reverse();
    const groupMode = groupSel.value || '';
    writeQuery({ ...filters, sort: s, sort2: s2, order: ord, group: groupMode });
    if (groupMode) renderGrouped(list, groupMode);
    else render(list);
    renderStatsFrom(list);
    renderRecentFrom(state.items);
    document.getElementById('info').textContent = `${list.length} / ${state.items.length}`;
  };

  q.addEventListener('input', update);
  genre.addEventListener('change', update);
  style.addEventListener('change', update);
  format.addEventListener('change', update);
  year.addEventListener('change', update);
  sort.addEventListener('change', update);
  sort2.addEventListener('change', update);
  orderSel.addEventListener('change', update);
  groupSel.addEventListener('change', update);
  if (minPrice) minPrice.addEventListener('input', update);
  if (maxPrice) maxPrice.addEventListener('input', update);
  copyBtn.addEventListener('click', async () => {
    const href = window.location.href;
    try { await navigator.clipboard.writeText(href); } catch {}
    const info = document.getElementById('info');
    const prev = info.textContent;
    info.textContent = 'URL copiée';
    setTimeout(() => { info.textContent = prev; }, 1500);
  });
  resetBtn.addEventListener('click', () => {
    q.value = '';
    genre.value = '';
    style.value = '';
    format.value = '';
    year.value = '';
    sort.value = '';
    sort2.value = '';
    orderSel.value = 'asc';
    groupSel.value = '';
    update();
  });
  statsToggle.addEventListener('click', () => {
    const el = document.getElementById('stats');
    const hidden = el.hasAttribute('hidden');
    if (hidden) el.removeAttribute('hidden'); else el.setAttribute('hidden', '');
    update();
  });
  recentToggle.addEventListener('click', () => {
    const el = document.getElementById('recent');
    const hidden = el.hasAttribute('hidden');
    if (hidden) el.removeAttribute('hidden'); else el.setAttribute('hidden', '');
    update();
  });
  update();
}

function tally(list, extractor) {
  const map = new Map();
  for (const r of list) {
    const keys = extractor(r);
    for (const k of keys) {
      if (!k) continue;
      map.set(k, (map.get(k) || 0) + 1);
    }
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20);
}

function renderStatsFrom(list) {
  const stats = document.getElementById('stats');
  if (stats.hasAttribute('hidden')) return;
  stats.innerHTML = '';
  const blocks = [
    { title: 'Genres', rows: tally(list, r => r.genres || []) },
    { title: 'Styles', rows: tally(list, r => r.styles || []) },
    { title: 'Artistes', rows: tally(list, r => r.artists || []) },
    { title: 'Labels', rows: tally(list, r => (r.labels_full ? r.labels_full.map(l => l.name) : (r.labels || []))) },
    { title: 'Formats', rows: tally(list, r => r.formats || []) },
    { title: 'Années', rows: tally(list, r => [r.year]) }
  ];
  for (const b of blocks) {
    const h = document.createElement('h3');
    h.textContent = b.title;
    const row = document.createElement('div');
    row.className = 'row';
    for (const [key, count] of b.rows) {
      const it = document.createElement('div');
      it.className = 'item';
      const k = document.createElement('span');
      k.textContent = key;
      const c = document.createElement('span');
      c.textContent = String(count);
      it.append(k, c);
      row.append(it);
    }
    stats.append(h, row);
  }
}

function renderRecentFrom(items) {
  const container = document.getElementById('recent');
  if (container.hasAttribute('hidden')) return;
  container.innerHTML = '';
  const title = document.createElement('div');
  title.className = 'recent-title';
  title.textContent = 'Derniers ajouts';
  const grid = document.createElement('div');
  grid.className = 'grid';
  const sorted = [...items].sort((a, b) => toDateVal(b.date_added) - toDateVal(a.date_added)).slice(0, 30);
  for (const r of sorted) {
    const link = document.createElement('a');
    link.href = r.id ? `https://www.discogs.com/release/${r.id}` : '#';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const card = document.createElement('div');
    card.className = 'card';
    const img = document.createElement('img');
    img.src = r.cover_image || r.thumb || '';
    img.alt = r.title || '';
    const titleEl = document.createElement('div');
    titleEl.className = 'title';
    titleEl.textContent = `${(r.artists || []).join(', ')} — ${r.title}`;
    const subtitle = document.createElement('div');
    subtitle.className = 'subtitle';
    const lbl = Array.isArray(r.labels_full) ? r.labels_full.map(l => l.name + (l.catno ? ' — ' + l.catno : '')).join(' · ') : (Array.isArray(r.labels) ? r.labels.join(', ') : '');
    if (lbl) subtitle.textContent = lbl;
    const meta = document.createElement('div');
    meta.className = 'meta';
    const labelCat = Array.isArray(r.labels_full) && r.labels_full.length ? r.labels_full.map(l => l.catno).filter(Boolean).join(', ') : '';
    const country = r.country || '';
    const released = r.released || '';
    const extra = [country, released, labelCat].filter(Boolean).join(' · ');
    meta.textContent = [r.year, r.format_text, extra].filter(Boolean).join(' · ');
    card.append(img, titleEl, subtitle, meta);
    link.append(card);
    grid.append(link);
  }
  container.append(title, grid);
}

(async function init() {
  const loading = document.getElementById('loading');
  const info = document.getElementById('info');
  
  if (loading) loading.textContent = 'Chargement en cours... (JS démarré)';
  
  const data = await loadData();
  
  if (loading) loading.style.display = 'none';
  
  if (!data || !data.releases) {
      if (loading) {
          loading.style.display = 'block';
          loading.textContent = 'Erreur critique : Données invalides (data ou data.releases manquant)';
          loading.style.color = 'red';
      }
      return;
  }
  
  const items = (data.releases || []).map((r) => r);
  
  if (items.length === 0) {
     info.textContent = 'Collection vide (0 éléments trouvés dans le fichier).';
     info.style.color = 'orange';
  } else {
     // Debug info temporaire
     const debugMsg = document.createElement('div');
     debugMsg.style.color = '#888';
     debugMsg.style.fontSize = '0.8em';
     debugMsg.style.marginBottom = '10px';
     debugMsg.textContent = `Succès : ${items.length} albums chargés. Affichage...`;
     document.querySelector('main').insertBefore(debugMsg, document.getElementById('grid'));
  }
  
  renderFilters(items);
  attachHandlers({ items });
})();