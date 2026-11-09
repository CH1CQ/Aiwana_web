/* アイワナ公式サイト v3.50：動きのJavaScript
   ・ページ切り替え（ADAY）・メニュー（スマホ幅。v3.19：ヘッダーの下から降りる黄色い面＋三本線→×）
   ・ヘッダー（スマホ幅）：白／黄色の2枚。出ている方が上へ引っ込んでから、次の方が上から出る（0.3秒ずつ・速さは一定）。Caseの固定中はどちらも出さない
   ・ヘッダー（PC幅）：下へスクロールで隠れ、上へで出る（みんなの銀行）。両脇はフッターが画面の高さの85%まで上がると消える
   ・Case（スマホ幅）：白い面を画面の高さで固定し、スクロール量に合わせてカードを入れ替える（⑦）。
     CSSのスクロール連動（animation-timeline）に対応したブラウザはCSSだけで動く。未対応のブラウザはここで進み具合を計算してキーフレームを動かす
   ほかの動き（KVのふよふよ、見出しの現れ方、ホバー）はCSSだけで動く */
(() => {
  const page = document.querySelector('.page');
  document.documentElement.classList.add('js');

  /* ページを開いたときの位置：
     ・リンクで来たとき（navigate）は必ず先頭から。アプリ内の表示（WKWebView）で前のページのスクロール位置が引き継がれ、途中から表示されていたため
     ・戻る／進むのときは、離れる前に保存した位置へ（ブラウザの復元は使わない）
     ・#付きのリンクで来たときは、その位置へ瞬時に。なめらかなスクロールは読み込み後に有効にする */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const navType = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0] || {}).type || 'navigate';
  const key = 'aiwana:scroll:' + location.pathname + location.hash;
  window.addEventListener('pagehide', () => { try { sessionStorage.setItem(key, String(window.scrollY)); } catch (e) {} });
  function placeOnLoad() {
    if (navType === 'back_forward') {
      let y = 0; try { y = Number(sessionStorage.getItem(key)) || 0; } catch (e) {}
      window.scrollTo(0, y);
    } else if (location.hash) {
      const t = document.getElementById(location.hash.slice(1));
      if (t) t.scrollIntoView({ behavior: 'instant', block: 'start' });
    } else {
      window.scrollTo(0, 0);
    }
  }
  placeOnLoad();
  // 読み込みが済んで位置を合わせてから、ページを現す（0.6秒）。それまでの位置の飛びは見せない。読み込みが遅くても1.5秒で現す
  let settledAt = 0;
  function ready() {
    if (page.classList.contains('ready')) return;
    placeOnLoad();
    requestAnimationFrame(() => {
      page.classList.add('ready');
      settledAt = performance.now();
      // KVの現れ方はここから（キャッチコピー→0.2秒後にイラスト→さらに0.2秒後にボタンと注記。ご主人様 2026-11-03「コピー、イラスト、ボタンの順」。間は v3.17 で 0.3秒→0.2秒）
      requestAnimationFrame(() => {
        document.querySelectorAll('.rv-kv:not(.rv-kv2):not(.rv-kv3)').forEach((el) => el.classList.add('is-in'));
        setTimeout(() => document.querySelectorAll('.rv-kv2').forEach((el) => el.classList.add('is-in')), 200);
        setTimeout(() => document.querySelectorAll('.rv-kv3').forEach((el) => el.classList.add('is-in')), 400);
      });
      setTimeout(() => document.documentElement.classList.add('smooth'), 200);
    });
  }
  window.addEventListener('load', ready);
  setTimeout(ready, 1500);

  /* 現れ方（ADAYと同じ）：画面に入ったら1回だけ .is-in を付ける（.in は幅の枠のクラスなので別名）。動きを減らす設定なら最初から表示 */
  const rvs = [...document.querySelectorAll('.rv:not(.rv-kv)')];
  if (rvs.length) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      rvs.forEach((el) => el.classList.add('is-in'));
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
      }, { threshold: 0 });
      rvs.forEach((el) => io.observe(el));
    }
  }

  const SDA = typeof CSS !== 'undefined' && CSS.supports('animation-timeline: view()') && !/nosda/.test(location.search);
  if (SDA) page.classList.add('sda');

  /* Q&Aのトグル（サポート）：押すと aria-expanded を反転。開閉の動きはCSS */
  document.querySelectorAll('.faq-q').forEach((b) => b.addEventListener('click', () => {
    b.setAttribute('aria-expanded', b.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
  }));
  // 開いている中身（答え）を押しても閉じる（ご主人様 2026-11-04）。中のリンクはそのまま飛ぶ
  document.querySelectorAll('.faq-c').forEach((c) => c.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    const b = document.getElementById(c.getAttribute('aria-labelledby'));
    if (b && b.getAttribute('aria-expanded') === 'true') b.setAttribute('aria-expanded', 'false');
  }));

  /* ページ切り替え（ADAYと同じ）：今のページが0.3秒で消えてから移動。移動先は0.6秒かけて現れる（CSSの pageIn） */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-goto]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const go = () => { page.classList.add('leaving'); setTimeout(() => { location.href = a.href; }, 300); };
    // メニューの中のリンクは、メニューが閉じ切ってから（0.3秒後）ページを消し始める（ご主人様 2026-11-04「先に完全にメニューが閉じてから」）
    if (a.closest('.mnu') && menuOpen) { closeMenu(); setTimeout(go, MENU_CLOSE); } else { closeMenu(true); go(); }
  });
  window.addEventListener('pageshow', () => page.classList.remove('leaving'));

  /* メニュー（スマホ幅）v3.19：三本線を押すと開閉。開く＝黄色い面がヘッダーの下から降りる（0.5秒。CSSの transition）。閉じる＝面が縁の波ごと上に戻る（0.3秒）。項目を押したときは、閉じ切ってから移る。
     開いている間はページのスクロールを止め（html.mnu-lock）、白いヘッダーに固定する。ページ切り替えのときは動きなしで閉じる（immediate） */
  const menu = document.querySelector('.mnu');
  const burgers = [...document.querySelectorAll('[data-open-menu]')];
  const MENU_CLOSE = 320; // 面が閉じる0.3秒（CSS .mnu-sheet）＋少し
  let menuOpen = false;
  let timer;
  function setBurgers(open) {
    burgers.forEach((b) => { b.setAttribute('aria-expanded', open ? 'true' : 'false'); b.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く'); });
  }
  function openMenu() {
    if (!menu || menuOpen) return;
    clearTimeout(timer);
    menuOpen = true;
    menu.classList.remove('now');
    // v3.50：先に .show（見える状態・面は画面の外）にして1〜2フレーム置き、次の描画で .open を付ける。
    // 見えない状態から一度に動かすと iPad で途中の絵が描かれず一瞬で出ていたため
    menu.classList.add('show');
    menu.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('mnu-lock');
    setBurgers(true);
    requestAnimationFrame(() => requestAnimationFrame(() => { if (menuOpen) menu.classList.add('open'); }));
  }
  function closeMenu(immediate) {
    if (!menu || !menuOpen) return;
    clearTimeout(timer);
    menuOpen = false;
    if (immediate === true) { menu.classList.add('now'); timer = setTimeout(() => menu.classList.remove('now'), 50); }
    menu.classList.remove('open');
    menu.classList.remove('show');
    menu.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('mnu-lock');
    setBurgers(false);
  }
  burgers.forEach((b) => b.addEventListener('click', () => { if (menuOpen) closeMenu(); else openMenu(); }));
  document.querySelectorAll('[data-close-menu]').forEach((el) => el.addEventListener('click', () => closeMenu()));
  // トップのメニュー（#about など）：メニューが閉じ切ってから、その位置へなめらかに移る
  document.querySelectorAll('.mnu-nav a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const href = a.getAttribute('href');
    const t = document.getElementById(href.slice(1));
    closeMenu();
    setTimeout(() => {
      if (t) { t.scrollIntoView({ behavior: document.documentElement.classList.contains('smooth') ? 'smooth' : 'auto', block: 'start' }); try { history.pushState(null, '', href); } catch (err) {} }
      else if (href === '#top') { window.scrollTo({ top: 0, behavior: 'smooth' }); }
    }, MENU_CLOSE);
  }));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  /* スマホ幅のヘッダー：'w'（白）／'y'（黄）／'none'。目標が変わったら、出ている方を引っ込め（0.3秒）、次を出す（0.3秒） */
  const hw = document.querySelector('.hdr-w');
  const hy = document.querySelector('.hdr-y');
  const el = { w: hw, y: hy };
  let shown = hw && hw.classList.contains('on') ? 'w' : 'none';
  let want = shown;
  let busy = false;
  function hdrStep() {
    if (want === shown) { busy = false; return; }
    busy = true;
    if (shown !== 'none') {
      el[shown].classList.remove('on');
      shown = 'none';
    } else {
      el[want].classList.add('on');
      shown = want;
    }
    setTimeout(hdrStep, 320);
  }
  function setHdr(t) {
    if (!hw || !hy) return;
    want = t;
    if (!busy) hdrStep();
  }

  /* Case（スマホ幅＝599px以下・画面の高さ600px以上・動きを減らす設定でないとき。v3.40 まで899px以下）
     白い面はどちらの方式でも fixed で止める（sticky は iOS で震える）。カード：対応ブラウザ（.sda）はCSSだけで動く。未対応（.jsmode）は進み具合 p を計算してアニメーションの時刻にする
     p の範囲：固定している間（Caseの上端が画面の上に来てから、画面の高さ×2.4だけ進むまで） */
  const caseSec = document.querySelector('.case');
  const pin = caseSec && caseSec.querySelector('.case-pin');
  const cards = caseSec ? [...caseSec.querySelectorAll('.uc-card')] : [];
  const mq = window.matchMedia('(max-width: 599px) and (min-height: 600px)'); // v3.40：スマホ幅だけ（599px以下。タブレット幅（iPad mini 744など）では縦に並べるだけ）
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let anims = [];
  if (!SDA) page.classList.add('jsmode');
  function caseSetup() {
    if (!caseSec) return;
    const on = mq.matches && !reduce.matches;
    page.classList.toggle('case-anim', on);
    caseSec.classList.remove('is-fixed', 'is-end');
    anims = [];
    if (on && !SDA) {
      void caseSec.offsetHeight;
      anims = cards.map((c) => c.getAnimations()[0]).filter(Boolean);
    }
    if (on) caseTick();
  }
  function caseActive() {
    return caseSec && page.classList.contains('case-anim');
  }
  function caseTick() {
    if (!caseActive()) return;
    const r = caseSec.getBoundingClientRect();
    const ih = window.innerHeight;
    const dist = r.height - ih;
    if (dist <= 0) return;
    const t = -r.top;
    // 白い面：固定の前＝そのまま／固定中＝fixed／固定のあと＝Caseの下端（両方式とも）
    caseSec.classList.toggle('is-fixed', t >= 0 && t < dist);
    caseSec.classList.toggle('is-end', t >= dist);
    if (SDA) return;
    const p = Math.min(1, Math.max(0, t / dist));
    anims.forEach((a) => { a.currentTime = p * 1000; });
  }

  /* ヘッダーと両脇 */
  const phdr = document.querySelector('.phdr');
  const sides = document.querySelectorAll('.side');
  const foot = document.querySelector('.foot');
  const fv = document.getElementById('top');
  const HDR = 64;
  let lastY = window.scrollY || 0;
  let dir = 0;
  function headers() {
    const y = window.scrollY || 0;
    const dy = y - lastY;
    if (Math.abs(dy) >= 6 || y <= 0) { lastY = y; dir = y <= 0 ? -1 : (dy > 0 ? 1 : -1); }
    if (!settledAt || performance.now() - settledAt < 600) dir = -1;
    // Caseを固定している間（見出しが画面の上から164pxに近づいてから、固定が解けるまで）はヘッダーを出さない
    let inCase = false;
    if (caseActive()) {
      const r = caseSec.getBoundingClientRect();
      inCase = r.top <= HDR + 100 && r.bottom > window.innerHeight;
    }
    if (hw && hy && menuOpen) { setHdr('w'); return; }
    if (hw && hy) {
      const edge = fv ? fv.offsetTop + fv.offsetHeight - HDR : 120;
      // .no-yhdr のページ（規約・ポリシー）は黄色を出さず、白だけ
      const noY = page.classList.contains('no-yhdr');
      setHdr(inCase ? 'none' : (!noY && dir > 0 && y > edge ? 'y' : 'w'));
    }
    // PC幅：下へ（先頭40pxより下）で隠し、上へで出す
    if (phdr) phdr.classList.toggle('hide', dir > 0 && y > 40);
    if (foot && sides.length) {
      const off = foot.getBoundingClientRect().top < window.innerHeight * 0.85;
      sides.forEach((s) => s.classList.toggle('off', off));
    }
  }

  /* 丸の中の数字（Featureの 1・2・3）：字面の中心を円の中心に合わせる
     canvas の measureText で字のインクの上下を測り、高さ0のインラインブロックでベースラインの位置を取り、差を --nudge に入れる */
  function centerDigits() {
    const nums = document.querySelectorAll('.num');
    if (!nums.length) return;
    const cv = document.createElement('canvas');
    const ctx = cv.getContext && cv.getContext('2d');
    if (!ctx) return;
    nums.forEach((n) => {
      const cs = getComputedStyle(n);
      ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const m = ctx.measureText(n.textContent.trim());
      if (typeof m.actualBoundingBoxAscent !== 'number') return;
      let probe = n.querySelector('.bl');
      if (!probe) { probe = document.createElement('i'); probe.className = 'bl'; n.appendChild(probe); }
      n.style.setProperty('--nudge', '0px');
      const baseline = probe.getBoundingClientRect().top;
      const box = n.parentElement.getBoundingClientRect();
      const inkCenter = baseline - (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
      const nudge = box.top + box.height / 2 - inkCenter;
      n.style.setProperty('--nudge', nudge.toFixed(2) + 'px');
    });
  }
  /* サポートのQと矢印（v3.21・v3.22）：同じ仕組みで、Qの字面の中心と矢印の箱の中心を、質問の字面（1行なら1行、2行なら2行分）の中心に合わせる
     ブラウザ（WebKit／Chrome）で行の中の字の位置が1px前後違い、1行のときQが少し下に見えたため（ご主人様 2026-11-04） */
  function centerQ() {
    const rows = document.querySelectorAll('.faq-q');
    if (!rows.length) return;
    const cv = document.createElement('canvas');
    const ctx = cv.getContext && cv.getContext('2d');
    if (!ctx) return;
    rows.forEach((row) => {
      const q = row.querySelector('.qm');
      const t = row.querySelector('.faq-t');
      if (!q || !t) return;
      let cs = getComputedStyle(q);
      ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const mq = ctx.measureText('Q');
      if (typeof mq.actualBoundingBoxAscent !== 'number') return;
      let pq = q.querySelector('.bl');
      if (!pq) { pq = document.createElement('i'); pq.className = 'bl'; q.appendChild(pq); }
      q.style.setProperty('--nudge', '0px');
      const qCenter = pq.getBoundingClientRect().top - (mq.actualBoundingBoxAscent - mq.actualBoundingBoxDescent) / 2;
      cs = getComputedStyle(t);
      ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const mt = ctx.measureText(t.textContent.trim().slice(0, 8));
      let pt = t.querySelector('.bl');
      if (!pt) { pt = document.createElement('i'); pt.className = 'bl'; t.insertBefore(pt, t.firstChild); }
      const lh = parseFloat(cs.lineHeight) || 26;
      const tCenter = pt.getBoundingClientRect().top - (mt.actualBoundingBoxAscent - mt.actualBoundingBoxDescent) / 2 + (t.getBoundingClientRect().height - lh) / 2;
      q.style.setProperty('--nudge', (tCenter - qCenter).toFixed(2) + 'px');
      // 矢印の箱（26px）も、中心を質問の字面の中心に合わせる（v3.22）
      const ic = row.querySelector('.faq-i');
      const svg = ic && ic.querySelector('svg');
      if (ic && svg) {
        // 矢印（SVGそのもの）の中心を質問の字面の中心に合わせる（v3.25）。箱は回さない（回るのはSVGの中の線）ので、top で動かして問題ない
        ic.style.setProperty('--nudge', '0px');
        const sr = svg.getBoundingClientRect();
        ic.style.setProperty('--nudge', (tCenter - (sr.top + sr.height / 2)).toFixed(2) + 'px');
      }
    });
  }
  function centerAll() { centerDigits(); centerQ(); }
  centerAll();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(centerAll);
  window.addEventListener('load', centerAll);

  let raf = 0;
  function onScroll() {
    if (raf) return;
    raf = requestAnimationFrame(() => { raf = 0; headers(); caseTick(); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { caseSetup(); headers(); centerQ(); }, 150); });
  mq.addEventListener('change', caseSetup);
  window.addEventListener('load', () => { caseSetup(); headers(); });
  caseSetup();
  headers();
})();
