(() => {
  // ---------- KO / EN ----------
  // Korean lives in the markup; English sits in data-en* attributes. The original Korean is kept in data-ko* on first switch.
  const ATTRS = [['data-en', null], ['data-en-alt', 'alt'], ['data-en-aria', 'aria-label']];
  const META = {
    ko: { desc: 'Skul: The Hero Slayer를 만든 서울의 액션 게임 스튜디오, 사우스포게임즈.', toggle: 'EN', toggleLang: 'en', toggleLabel: 'EN, switch to English' },
    en: { desc: 'SouthPAW Games is the Seoul action game studio behind Skul: The Hero Slayer.', toggle: 'KO', toggleLang: 'ko', toggleLabel: 'KO, 한국어로 보기' },
  };
  const toggle = document.querySelector('[data-lang-toggle]');
  const descTags = document.querySelectorAll('meta[name="description"], meta[property="og:description"]');
  let current = 'ko';

  function apply(lang) {
    for (const [src, attr] of ATTRS) {
      document.querySelectorAll(`[${src}]`).forEach((el) => {
        const store = src.replace('data-en', 'data-ko');
        if (!el.hasAttribute(store)) el.setAttribute(store, attr ? (el.getAttribute(attr) || '') : el.textContent);
        const value = lang === 'en' ? el.getAttribute(src) : el.getAttribute(store);
        if (attr) el.setAttribute(attr, value); else el.textContent = value;
      });
    }
    const m = META[lang];
    document.documentElement.lang = lang;
    descTags.forEach((tag) => { tag.content = m.desc; });
    if (toggle) { toggle.textContent = m.toggle; toggle.lang = m.toggleLang; toggle.setAttribute('aria-label', m.toggleLabel); }
    current = lang;
  }

  let saved = null;
  try { saved = localStorage.getItem('sp-lang'); } catch (e) { /* storage blocked: fall back to detection */ }
  const fromUrl = new URLSearchParams(location.search).get('lang');
  const detected = (navigator.language || 'ko').toLowerCase().startsWith('ko') ? 'ko' : 'en';
  const initial = ['ko', 'en'].includes(fromUrl) ? fromUrl : (['ko', 'en'].includes(saved) ? saved : detected);
  if (initial === 'en') apply('en');

  toggle?.addEventListener('click', () => {
    const next = current === 'ko' ? 'en' : 'ko';
    apply(next);
    try { localStorage.setItem('sp-lang', next); } catch (e) { /* not saved; the switch still works for this visit */ }
  });

  // ---------- contact form ----------
  // data-endpoint is empty until the form is wired to a mail service; until then nothing is sent and the page says so.
  const T = {
    ko: { email: '이메일 주소를 name@example.com 형식으로 적어 주세요.', message: '메시지 내용을 적어 주세요.', idle: '문의 폼을 준비하고 있습니다. 메시지는 전송되지 않았습니다.', sending: '보내는 중…', ok: '보냈습니다. 적어 주신 주소로 답장 드리겠습니다.', fail: '전송하지 못했습니다. 잠시 뒤 다시 보내 주세요.' },
    en: { email: 'Write the email address as name@example.com.', message: 'Write your message.', idle: 'This form is not connected yet. Your message was not sent.', sending: 'Sending…', ok: 'Sent. We will reply to the address you gave.', fail: 'That did not go through. Try again in a minute.' },
  };
  document.querySelectorAll('form[data-endpoint]').forEach((form) => {
    const help = form.querySelector('#form-help');
    const button = form.querySelector('button[type="submit"]');
    const fields = [...form.querySelectorAll('input, textarea')];
    const errorOf = (f) => f.parentElement.querySelector('.field__error');
    const clear = (f) => { f.removeAttribute('aria-invalid'); f.removeAttribute('aria-describedby'); errorOf(f).textContent = ''; };
    fields.forEach((f) => f.addEventListener('input', () => clear(f)));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const t = T[current];
      help.textContent = '';
      let first = null;
      fields.forEach((f) => {
        clear(f);
        if (f.type === 'email') f.value = f.value.trim();
        if (!f.value.trim() || !f.checkValidity()) {
          f.setAttribute('aria-invalid', 'true');
          f.setAttribute('aria-describedby', errorOf(f).id);
          errorOf(f).textContent = f.type === 'email' ? t.email : t.message;
          first = first || f;
        }
      });
      if (first) { first.focus(); return; }
      if (!form.dataset.endpoint) { help.textContent = t.idle; return; }
      button.setAttribute('aria-busy', 'true');
      help.textContent = t.sending;
      fetch(form.dataset.endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then((r) => { help.textContent = r.ok ? t.ok : t.fail; if (r.ok) form.reset(); })
        .catch(() => { help.textContent = t.fail; })
        .finally(() => button.removeAttribute('aria-busy'));
    });
  });

  // ---------- hero video: muted loop, paused for reduced motion, with a pause button ----------
  const heroVideo = document.querySelector('video[data-autoplay]');
  const videoToggle = document.querySelector('[data-video-toggle]');
  if (heroVideo) {
    // phones show a 4:3 crop of the loop, so they also get the matching poster
    if (heroVideo.dataset.posterMobile && matchMedia('(max-width: 48rem)').matches) heroVideo.poster = heroVideo.dataset.posterMobile;
    const L = { ko: ['배경 영상 일시정지', '배경 영상 재생'], en: ['Pause background video', 'Play background video'] };
    const setState = (paused) => {
      if (!videoToggle) return;
      videoToggle.setAttribute('aria-pressed', String(paused));
      const label = L[current][paused ? 1 : 0];
      videoToggle.setAttribute('aria-label', label);
      videoToggle.setAttribute('data-ko-aria', L.ko[paused ? 1 : 0]);
      videoToggle.setAttribute('data-en-aria', L.en[paused ? 1 : 0]);
    };
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setState(true); } else { heroVideo.play().then(() => setState(false)).catch(() => setState(true)); }
    videoToggle?.addEventListener('click', () => {
      if (heroVideo.paused) { heroVideo.play().then(() => setState(false)).catch(() => {}); } else { heroVideo.pause(); setState(true); }
    });
  }

  // ---------- studio gallery: thumbnails choose the large photo ----------
  document.querySelectorAll('[data-gallery]').forEach((g) => {
    const main = g.querySelector('.gallery__main');
    const thumbs = g.querySelectorAll('.gallery__thumb');
    thumbs.forEach((t) => t.addEventListener('click', () => {
      const img = t.querySelector('img');
      main.src = t.dataset.src;
      ['alt', 'data-en-alt', 'data-ko-alt'].forEach((a) => { if (img.hasAttribute(a)) main.setAttribute(a, img.getAttribute(a)); else main.removeAttribute(a); });
      thumbs.forEach((o) => o.setAttribute('aria-pressed', String(o === t)));
    }));
  });

  // ---------- trailer: load YouTube only when asked ----------
  document.querySelectorAll('.trailer[data-yt]').forEach((link) => link.addEventListener('click', (e) => {
    e.preventDefault();
    const frame = document.createElement('iframe');
    frame.src = `https://www.youtube-nocookie.com/embed/${link.dataset.yt}?autoplay=1&rel=0`;
    frame.title = 'Skul: The Hero Slayer trailer';
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    const box = document.createElement('div');
    box.className = 'trailer';
    box.append(frame);
    link.replaceWith(box);
    frame.focus();
  }));
})();
