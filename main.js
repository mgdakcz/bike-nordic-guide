/* ==========================================================
   Apartamenty Pilice – wspólne skrypty
   Used by: index.html, index_en.html, index_de.html, trasy/index.html

   1. Navigation height
   2. Language selector + flag
   3. Photo carousels            (guide pages)
   4. Search box                 (guide pages)
   5. Route planner              (trasy/index.html – route content lives in trasy/trasy.js)

   Every part checks that its elements exist on the page,
   so the same file can be loaded everywhere.
   ========================================================== */


/* ---------- 1. Navigation height ----------
   The nav bar is fixed to the top of the screen and can wrap onto two
   lines on phones. We measure its real height so the content below
   (hero, search, planner panel) is never hidden behind it. */
function updateNavHeight() {
    const nav = document.querySelector('.top-nav');
    if (nav) {
        document.documentElement.style.setProperty('--nav-height', nav.offsetHeight + 'px');
    }
}
updateNavHeight();
window.addEventListener('resize', updateNavHeight);
window.addEventListener('load', updateNavHeight);


/* ---------- 2. Language selector + flag ----------
   Picking a language opens that page. The flag next to the selector
   follows the chosen language. */
const FLAGS = {
    PL: '<svg viewBox="0 0 16 10" preserveAspectRatio="none"><rect width="16" height="5" fill="#fff"/><rect y="5" width="16" height="5" fill="#DC143C"/></svg>',
    EN: '<svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice"><clipPath id="uk-s"><path d="M0,0 v30 h60 v-30 z"/></clipPath><clipPath id="uk-t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath><g clip-path="url(#uk-s)"><path d="M0,0 v30 h60 v-30 z" fill="#012169"/><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 L60,30 M60,0 L0,30" clip-path="url(#uk-t)" stroke="#C8102E" stroke-width="4"/><path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10"/><path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6"/></g></svg>',
    DE: '<svg viewBox="0 0 5 3" preserveAspectRatio="none"><rect width="5" height="1" fill="#000"/><rect y="1" width="5" height="1" fill="#DD0000"/><rect y="2" width="5" height="1" fill="#FFCE00"/></svg>'
};

function updateLangFlag() {
    const select = document.getElementById('language-selector');
    const flag = document.getElementById('lang-flag');
    if (!select || !flag) return;
    const code = select.options[select.selectedIndex].text.trim().toUpperCase();
    if (FLAGS[code]) flag.innerHTML = FLAGS[code];
}

(function initLanguageSelector() {
    const select = document.getElementById('language-selector');
    if (!select) return;
    updateLangFlag();
    select.addEventListener('change', () => {
        updateLangFlag();
        location = select.value;
    });
})();


/* ---------- 3. Photo carousels ----------
   Every .carousel box shows its photos one after another. */
const CAROUSEL_SPEED_MS = 3500;

document.querySelectorAll('.carousel').forEach(carousel => {
    const slides = carousel.querySelectorAll('img');
    if (slides.length <= 1) return;
    let currentIndex = 0;
    setInterval(() => {
        slides[currentIndex].classList.remove('active');
        currentIndex = (currentIndex + 1) % slides.length;
        slides[currentIndex].classList.add('active');
    }, CAROUSEL_SPEED_MS);
});


/* ---------- 4. Search box ----------
   Hides every card and FAQ question that doesn't contain the typed text. */
function filterContent() {
    const box = document.getElementById('searchInput');
    if (!box) return;
    const input = box.value.toLowerCase();
    document.querySelectorAll('.card, .faq-item').forEach(item => {
        const text = item.innerText.toLowerCase();
        item.style.display = text.includes(input) ? '' : 'none';
    });
}

(function initSearch() {
    const box = document.getElementById('searchInput');
    if (box) box.addEventListener('input', filterContent);
})();


/* ---------- 5. Route planner (trasy/index.html) ----------
   Routes come from TRASY in trasy/trasy.js – edit routes there, not here.
   This part only runs on the page that has the planner. */
(function initPlanner() {
    if (typeof TRASY === 'undefined' || !document.getElementById('grid')) return;

    // Photos are in img/trasy/. ZDJECIA is only set in the single-file version.
    const IMG = f => (typeof ZDJECIA !== 'undefined' && ZDJECIA[f]) ? ZDJECIA[f] : 'img/trasy/' + f;
    const DMAP = { latwa: 1, srednia: 2, trudna: 3 };
    const DIFF = { 1: 'Łatwa', 2: 'Średnia', 3: 'Trudna' };

    const ROUTES = TRASY.map(t => ({
        id: t.id,
        type: t.typ === 'rower' ? 'bike' : 'nw',
        zone: t.gdzie === 'blisko' ? 'near' : 'far',
        name: t.nazwa,
        diffs: t.trudnosc.map(d => DMAP[d]),
        km: +t.km,
        min: +t.minuty,
        loop: !!t.petla,
        gondola: t.gondola,
        gondolaNote: t.gondolaUwagi,
        runner: t.wozekBiegowy,
        kids: t.dzieci,
        kidsAge: t.dzieciOdLat,
        food: t.jedzenie,
        why: t.opis,
        tip: t.wskazowka,
        nav: t.nawigacja || '',
        drive: t.dojazd || '',
        photos: t.zdjecia.map(IMG)
    }));

    const state = { type: 'all', zone: 'all', diff: 'all', kids: false, gondola: false, runner: false, food: false };

    // The plan is kept in this browser only
    let plan = { days: 3, items: [] };
    try {
        const saved = JSON.parse(localStorage.getItem('planer-tras') || 'null');
        if (saved && Array.isArray(saved.items)) plan = saved;
    } catch (e) {}
    function save() {
        try { localStorage.setItem('planer-tras', JSON.stringify(plan)); } catch (e) {}
    }

    const $ = id => document.getElementById(id);
    const byId = id => ROUTES.find(r => r.id === id);
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const kmFmt = n => (Math.round(n * 10) / 10).toString().replace('.', ',');
    function minFmt(m) {
        const h = Math.floor(m / 60), mm = m % 60;
        return h ? `${h} h${mm ? ` ${mm} min` : ''}` : `${mm} min`;
    }

    function matches(r) {
        if (state.type !== 'all' && r.type !== state.type) return false;
        if (state.zone !== 'all' && r.zone !== state.zone) return false;
        if (state.diff !== 'all' && !r.diffs.includes(+state.diff)) return false;
        if (state.kids && !r.kids) return false;
        if (state.gondola && !r.gondola) return false;
        if (state.runner && !r.runner) return false;
        if (state.food && !r.food) return false;
        return true;
    }

    function fact(ok, label, note) {
        if (ok === null || ok === undefined) return '';
        return `<li class="${ok ? 'yes' : 'no'}">${esc(label)}${note ? ` <small>(${esc(note)})</small>` : ''}</li>`;
    }

    function card(r) {
        const inPlan = plan.items.some(i => i.id === r.id);
        const p = r.photos;
        const zoneLbl = r.type === 'bike'
            ? (r.zone === 'near' ? 'Rower · do 10 km' : 'Rower · do 50 km')
            : (r.zone === 'near' ? 'Nordic Walking · na miejscu' : 'Nordic Walking · z dojazdem');
        const d = r.diffs.map(x => `<span class="diff d${x}">${DIFF[x]}</span>`).join('');
        const noFacts = [r.kids, r.food, r.gondola, r.runner].every(v => v === null || v === undefined);
        const hasMore = r.why.length > 1 || r.tip || p.length > 1;

        return `<article class="route">
    <div class="photo"><img src="${p[0]}" alt="${esc(r.name)}" loading="lazy"><span class="tag">${zoneLbl}</span></div>
    <div class="body">
      <h3>${esc(r.name)}</h3>
      <div class="stats">${d}<span class="stat"><b>${String(r.km).replace('.', ',')} km</b></span><span class="stat">· ok. ${minFmt(r.min)}</span><span class="stat">· ${r.loop ? 'pętla' : 'w jedną stronę'}</span></div>
      <ul class="facts" ${noFacts ? 'hidden' : ''}>
        ${fact(r.kids, r.kidsAge ? `Dzieci od ${r.kidsAge} lat` : 'Dla dzieci')}
        ${fact(r.food, 'Jedzenie na trasie')}
        ${fact(r.gondola, 'Wózek gondola', r.gondolaNote)}
        ${fact(r.runner, 'Wózek biegowy')}
      </ul>
      <p class="why">${esc(r.why[0])}</p>
      <details class="more" ${hasMore ? '' : 'hidden'}><summary>Więcej i wskazówka od nas</summary>
        ${r.why.slice(1).map(t => `<p class="why">${esc(t)}</p>`).join('')}
        ${r.tip ? `<p class="frame tip"><b>Wskazówka od lokalsów</b>${esc(r.tip)}</p>` : ''}
        <div class="thumbs">${p.slice(1).map(src => `<img src="${src}" alt="" loading="lazy">`).join('')}</div>
      </details>
      <div class="actions">
        ${r.nav ? `<a class="btn btn-outline" href="${esc(r.nav)}" target="_blank" rel="noopener"><i class="fa-solid fa-person-walking"></i> Nawiguj</a>` : `<span class="btn btn-ghost">Mapa wkrótce</span>`}
        ${r.drive ? `<a class="btn btn-outline" href="${esc(r.drive)}" target="_blank" rel="noopener"><i class="fa-solid fa-car"></i> Dojazd autem</a>` : ''}
        <button class="btn ${inPlan ? 'added' : ''}" data-add="${r.id}" type="button">${inPlan ? '<i class="fa-solid fa-check"></i> W planie' : '<i class="fa-solid fa-plus"></i> Do planu'}</button>
      </div>
    </div>
  </article>`;
    }

    function renderGrid() {
        const list = ROUTES.filter(matches);
        $('grid').innerHTML = list.length
            ? list.map(card).join('')
            : `<div class="empty">Żadna trasa nie spełnia wszystkich warunków. Spróbuj odznaczyć któryś filtr.</div>`;
        $('resCount').textContent = `${list.length} z ${ROUTES.length} tras`;
        $('resTitle').textContent = state.type === 'bike' ? 'Trasy rowerowe'
            : state.type === 'nw' ? 'Trasy Nordic Walking'
            : 'Wszystkie trasy';
    }

    function renderPlan() {
        $('days').innerHTML = [1, 2, 3, 4, 5, 6, 7]
            .map(n => `<option value="${n}" ${n === plan.days ? 'selected' : ''}>${n}</option>`).join('');
        plan.items.forEach(i => { if (i.day > plan.days) i.day = plan.days; });

        const has = plan.items.length > 0;
        $('total').hidden = !has;
        $('planActions').hidden = !has;
        $('fab').innerHTML = '<i class="fa-solid fa-route"></i> ' + (has ? `Mój plan · ${plan.items.length}` : 'Mój plan');
        if (!has) {
            $('planBody').innerHTML = `<p class="planempty">Dodaj trasy przyciskiem „+ Do planu” i przypisz je do kolejnych dni.</p>`;
            return;
        }

        let html = '', tkm = 0, tmin = 0;
        for (let d = 1; d <= plan.days; d++) {
            const items = plan.items.filter(i => i.day === d).map(i => byId(i.id)).filter(Boolean);
            const km = items.reduce((a, r) => a + r.km, 0);
            const mn = items.reduce((a, r) => a + r.min, 0);
            tkm += km; tmin += mn;
            html += `<div class="day"><div class="dayhead"><h4>Dzień ${d}</h4><span>${items.length ? `${kmFmt(km)} km · ok. ${minFmt(mn)}` : ''}</span></div>`;
            html += items.length
                ? items.map(r => `<div class="pitem"><span class="nm">${esc(r.name)}<small>${r.type === 'bike' ? 'Rower' : 'Nordic Walking'} · ${kmFmt(r.km)} km</small></span>
      <select aria-label="Dzień dla: ${esc(r.name)}" data-day="${r.id}">${Array.from({ length: plan.days }, (_, k) => `<option value="${k + 1}" ${k + 1 === d ? 'selected' : ''}>Dz. ${k + 1}</option>`).join('')}</select>
      <button class="x" data-rm="${r.id}" aria-label="Usuń ${esc(r.name)}" type="button">×</button></div>`).join('')
                : `<p class="dayempty">Dzień wolny od tras.</p>`;
            html += `</div>`;
        }
        $('planBody').innerHTML = html;
        const n = plan.items.length;
        $('total').innerHTML = `<span>Razem ${n} ${n === 1 ? 'trasa' : n < 5 ? 'trasy' : 'tras'}</span><b>${kmFmt(tkm)} km · ok. ${minFmt(tmin)}</b>`;
    }

    function planText() {
        let out = 'Mój plan tras (rower i Nordic Walking)\n';
        for (let d = 1; d <= plan.days; d++) {
            const items = plan.items.filter(i => i.day === d).map(i => byId(i.id)).filter(Boolean);
            if (!items.length) continue;
            out += `\nDzień ${d}\n`;
            items.forEach(r => {
                out += `- ${r.name} (${r.type === 'bike' ? 'rower' : 'Nordic Walking'}, ${kmFmt(r.km)} km, ok. ${minFmt(r.min)})`
                    + (r.nav ? '\n  Nawigacja: ' + r.nav : '')
                    + (r.drive ? '\n  Dojazd: ' + r.drive : '')
                    + '\n';
            });
        }
        return out;
    }

    function status(msg) {
        const s = $('status');
        s.textContent = msg;
        clearTimeout(status.t);
        status.t = setTimeout(() => s.textContent = '', 3000);
    }

    function toggle(id) {
        const i = plan.items.findIndex(x => x.id === id);
        if (i >= 0) {
            plan.items.splice(i, 1);
            status('Usunięto z planu.');
        } else {
            // New route goes to the day with the fewest routes
            const counts = Array.from({ length: plan.days }, (_, k) => plan.items.filter(x => x.day === k + 1).length);
            const day = counts.indexOf(Math.min(...counts)) + 1;
            plan.items.push({ id, day });
            status(`Dodano do dnia ${day}.`);
        }
        save(); renderGrid(); renderPlan();
    }

    // Clicks: filter chips, add / remove buttons
    document.addEventListener('click', e => {
        const c = e.target.closest('.chip');
        if (c) {
            if (c.dataset.f) {
                state[c.dataset.f] = c.dataset.v;
                document.querySelectorAll(`.chip[data-f="${c.dataset.f}"]`).forEach(b => b.setAttribute('aria-pressed', b === c));
            } else if (c.dataset.t) {
                state[c.dataset.t] = !state[c.dataset.t];
                c.setAttribute('aria-pressed', state[c.dataset.t]);
            }
            renderGrid();
            return;
        }
        const a = e.target.closest('[data-add]'); if (a) { toggle(a.dataset.add); return; }
        const r = e.target.closest('[data-rm]');  if (r) { toggle(r.dataset.rm); return; }
    });

    $('f-reset').addEventListener('click', () => {
        Object.assign(state, { type: 'all', zone: 'all', diff: 'all', kids: false, gondola: false, runner: false, food: false });
        document.querySelectorAll('.chip').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === 'all'));
        renderGrid();
    });

    // Changes: number of days, moving a route to another day
    document.addEventListener('change', e => {
        if (e.target.id === 'days') { plan.days = +e.target.value; save(); renderPlan(); }
        if (e.target.dataset.day) {
            const it = plan.items.find(x => x.id === e.target.dataset.day);
            if (it) { it.day = +e.target.value; save(); renderPlan(); }
        }
    });

    $('clearPlan').addEventListener('click', () => {
        plan.items = [];
        save(); renderGrid(); renderPlan();
        status('Plan wyczyszczony.');
    });

    $('copyPlan').addEventListener('click', () => {
        const txt = planText(), fb = $('copyfallback');
        const fallback = () => {
            fb.hidden = false; fb.value = txt; fb.focus(); fb.select();
            status('Zaznaczyliśmy plan poniżej. Skopiuj go skrótem Ctrl+C / Cmd+C.');
        };
        try {
            navigator.clipboard.writeText(txt).then(() => {
                fb.hidden = true;
                status('Plan skopiowany. Wklej go do wiadomości lub notatek.');
            }, fallback);
        } catch (err) { fallback(); }
    });

    $('fab').addEventListener('click', () => $('plan').scrollIntoView({ behavior: 'smooth' }));

    // Route counts in the intro
    $('nBike').textContent = ROUTES.filter(r => r.type === 'bike').length;
    $('nNw').textContent = ROUTES.filter(r => r.type === 'nw').length;
    $('nAll').textContent = ROUTES.length;

    if (typeof MAPA_WSZYSTKICH_TRAS !== 'undefined' && MAPA_WSZYSTKICH_TRAS) {
        const a = $('mapAll');
        a.href = MAPA_WSZYSTKICH_TRAS;
        a.hidden = false;
    }

    renderGrid();
    renderPlan();
})();
