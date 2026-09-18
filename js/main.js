(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var clamp = function (v, min, max) { return Math.min(max, Math.max(min, v)); };
  var rand = function (min, max) { return min + Math.random() * (max - min); };

  /* ---------- Stars ---------- */

  var styleEl = document.createElement('style');
  styleEl.textContent = '@keyframes star-twinkle{0%,100%{opacity:var(--o,.8)}50%{opacity:.22}}';
  document.head.appendChild(styleEl);

  function spawnStars(container, count) {
    if (!container) return;
    container.innerHTML = '';
    var doc = container.ownerDocument;
    var frag = doc.createDocumentFragment();
    for (var i = 0; i < count; i++) {
      var s = doc.createElement('span');
      var size = rand(1, 2.7);
      var isCyan = Math.random() < 0.22;
      var isBright = Math.random() < 0.14;
      var o = rand(0.25, 0.95);
      s.className = 'star' + (isCyan ? ' cyan' : '') + (isBright && !isCyan ? ' bright' : '');
      s.style.cssText =
        'width:' + size.toFixed(2) + 'px;' +
        'height:' + size.toFixed(2) + 'px;' +
        'left:' + rand(0, 100) + '%;' +
        'top:' + rand(0, 100) + '%;' +
        'opacity:' + o.toFixed(2) + ';' +
        '--o:' + o.toFixed(2) + ';' +
        (reduceMotion ? '' : 'animation:star-twinkle ' + rand(2.4, 7).toFixed(2) + 's ease-in-out ' + rand(0, 4).toFixed(2) + 's infinite;');
      frag.appendChild(s);
    }
    container.appendChild(frag);
  }

  function populateStars() {
    var width = window.innerWidth;
    var density = width < 768 ? 0.05 : 0.07;
    var count = clamp(Math.floor(width * density), 70, 170);
    spawnStars($('.bg-space .stars-field'), Math.floor(count * 0.7));
    spawnStars($('.stage-stars .stars-a'), count);
    spawnStars($('.stage-stars .stars-b'), Math.floor(count * 0.55));
  }

  var starBucket = null;
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    var width = window.innerWidth;
    var bucket = width < 768 ? 's' : width < 1200 ? 'm' : 'l';
    if (bucket === starBucket || reduceMotion) return;
    starBucket = bucket;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      populateStars();
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    }, 200);
  });

  /* ---------- Header ---------- */

  var header = $('#site-header');
  function onScroll() {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 30);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */

  var menuBtn = $('#menu-btn');
  var mobileMenu = $('#mobile-menu');

  function closeMenu() {
    if (!mobileMenu || !menuBtn) return;
    mobileMenu.classList.remove('open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Open menu');
    document.body.style.overflow = '';
  }

  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', function () {
      var isOpen = mobileMenu.classList.toggle('open');
      mobileMenu.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
      menuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      menuBtn.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
      document.body.style.overflow = isOpen ? 'hidden' : '';

      if (isOpen && hasGsap && !reduceMotion) {
        gsap.fromTo('.mobile-menu-nav a[data-menu-link]',
          { y: 26, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.55, stagger: 0.06, ease: 'power3.out', delay: 0.1 }
        );
      }
    });

    $$('#mobile-menu a[data-menu-link]').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobileMenu.classList.contains('open')) closeMenu();
    });
  }

  /* ---------- Rocket particles ---------- */

  var pool = [];
  var poolActive = false;
  var lastSpawn = 0;
  var rafId = null;
  var launchTrigger = null;

  function poolIndex() {
    for (var i = 0; i < pool.length; i++) {
      if (pool[i].state === 'idle') return i;
    }
    return -1;
  }

  function spawnParticle(idx, thrust) {
    var p = pool[idx];
    p.state = 'busy';
    var sx = rand(-0.6, 0.6);
    var life = rand(0.32, 0.8) * (0.55 + thrust);
    var dist = rand(70, 220) * (0.5 + thrust * 0.9);
    gsap.killTweensOf(p.el);
    gsap.set(p.el, {
      x: sx * 6,
      y: 0,
      scale: rand(0.5, 1.3),
      autoAlpha: rand(0.5, 1),
      xPercent: -50,
      yPercent: -50
    });
    gsap.to(p.el, {
      y: dist,
      x: sx * 48,
      autoAlpha: 0,
      duration: life,
      ease: 'power2.out',
      delay: 0.02,
      onComplete: function () {
        p.state = 'idle';
        gsap.set(p.el, { autoAlpha: 0 });
      }
    });
  }

  function particleLoop(ts) {
    if (!poolActive) return;
    var vel = launchTrigger ? Math.abs(launchTrigger.getVelocity()) : 0;
    var thrust = clamp(vel / 60, 0, 1);
    var flame = $('.rocket-flame');
    var trail = $('#rocket-trail');
    if (flame) {
      gsap.to(flame, { scaleY: 0.75 + thrust * 0.75, duration: 0.28, overwrite: 'auto' });
    }
    if (trail) {
      gsap.to(trail, {
        scaleY: 0.6 + thrust * 1.1,
        autoAlpha: 0.35 + thrust * 0.65,
        duration: 0.3,
        overwrite: 'auto'
      });
    }
    if (thrust > 0.22 && ts - lastSpawn > rand(34, 90) * (1.15 - thrust)) {
      lastSpawn = ts;
      var idx = poolIndex();
      if (idx > -1) spawnParticle(idx, thrust);
    }
    rafId = requestAnimationFrame(particleLoop);
  }

  /* ---------- Launch sequence ---------- */

  var zone = $('#launch');
  var rocketWrap = $('#rocket');
  var hudAlt = $('#hud-alt');
  var hudVel = $('#hud-vel');

  function buildParticles() {
    if (!rocketWrap || reduceMotion) return;
    var count = window.innerWidth < 768 ? 14 : 26;
    for (var i = 0; i < count; i++) {
      var el = document.createElement('span');
      el.className = 'particle' + (Math.random() < 0.45 ? ' hot' : '');
      rocketWrap.appendChild(el);
      gsap.set(el, { autoAlpha: 0 });
      pool.push({ el: el, state: 'idle' });
    }
  }

  function pad(n, len) {
    var s = String(Math.round(n));
    while (s.length < len) s = '0' + s;
    return s;
  }

  function initLaunch() {
    if (!hasGsap || !zone || !rocketWrap) return;

    gsap.registerPlugin(ScrollTrigger);
    buildParticles();

    if (reduceMotion) return;

    var tl;
    var ctx = gsap.context(function () {
      tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: zone,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.85,
          invalidateOnRefresh: true,
          onUpdate: function (self) {
            var p = self.progress;
            var alt = clamp(p, 0, 1) * 840;
            var speed = Math.max(0, self.getVelocity());
            if (hudAlt) hudAlt.textContent = pad(alt, 3) + ' KM';
            if (hudVel) hudVel.textContent = (speed / 1000).toFixed(1) + ' KPH';
          }
        }
      });

      var heroCopy = $('.hero-copy');
      var heroStatus = $('.hero-status');
      var scrollHint = $('.scroll-hint');
      var earth = $('.stage-earth');
      var atmo = $('.stage-atmo');
      var stars = $('.stage-stars');
      var starsA = $('.stars-a');
      var starsB = $('.stars-b');

      tl.to(heroCopy, { autoAlpha: 0, scale: 0.86, yPercent: -16, duration: 0.75, ease: 'power1.in' }, 0);
      tl.to(heroStatus, { autoAlpha: 0, y: -20, duration: 0.6 }, 0.08);
      if (scrollHint) tl.to(scrollHint, { autoAlpha: 0 }, 0.03);

      tl.to(earth, { yPercent: 54, autoAlpha: 0, duration: 0.8, ease: 'power1.in' }, 0);
      tl.to(atmo, { autoAlpha: 0, duration: 0.55, ease: 'power1.in' }, 0);

      tl.fromTo(stars, { autoAlpha: 0 }, { autoAlpha: 1, ease: 'power1.out' }, 0);
      tl.fromTo(starsA, { yPercent: 0 }, { yPercent: -14, ease: 'none' }, 0);
      tl.fromTo(starsB, { yPercent: 0 }, { yPercent: -24, ease: 'none' }, 0);

      var fly = -window.innerHeight * 0.58;

      tl.fromTo(
        rocketWrap,
        { xPercent: -50, yPercent: -50, y: 0, x: 0, rotation: 0 },
        {
          xPercent: -50,
          yPercent: -50,
          y: fly,
          x: '6vw',
          duration: 1.06,
          ease: 'power1.in'
        },
        0.06
      );
      tl.to(rocketWrap, { rotation: 5, duration: 0.55, ease: 'sine.in' }, 0.06);
      tl.to(rocketWrap, { rotation: -8, duration: 0.52, ease: 'sine.out' }, 0.72);
    });

    launchTrigger = tl.scrollTrigger;

    ScrollTrigger.create({
      trigger: zone,
      start: 'top top',
      end: 'bottom bottom',
      onToggle: function (self) {
        poolActive = self.isActive;
        if (poolActive && !rafId) {
          rafId = requestAnimationFrame(particleLoop);
        } else if (!poolActive && rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }
    });
  }

  /* ---------- Reveal on scroll ---------- */

  function initReveals() {
    if (!hasGsap || reduceMotion) return;
    gsap.registerPlugin(ScrollTrigger);
    $$('[data-reveal]').forEach(function (el) {
      gsap.fromTo(el,
        { y: 46, autoAlpha: 0 },
        {
          y: 0, autoAlpha: 1, duration: 1, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' }
        }
      );
    });
  }

  /* ---------- Counters ---------- */

  function initCounters() {
    var counters = $$('.count');
    if (!counters.length) return;

    counters.forEach(function (el) {
      var target = parseInt(el.getAttribute('data-count'), 10) || 0;
      if (reduceMotion || !hasGsap) {
        el.textContent = target;
        return;
      }
      var state = { val: 0 };
      gsap.to(state, {
        val: target,
        duration: 1.8,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
        onUpdate: function () {
          el.textContent = Math.round(state.val);
        }
      });
    });
  }

  /* ---------- Missions ---------- */

  function initMissions() {
    $$('.mission-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mission = btn.closest('.mission');
        var open = mission.classList.toggle('open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  }

  /* ---------- Contact form ---------- */

  function validateName(input) {
    return input.value.trim().length >= 2;
  }

  function validateEmail(input) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
  }

  function validateDetails(input) {
    return input.value.trim().length >= 8;
  }

  function initForm() {
    var form = $('#launch-form');
    if (!form) return;

    var nameField = $('#f-name');
    var emailField = $('#f-email');
    var detailsField = $('#f-details');
    var submitBtn = $('#submit-btn');
    var progress = $('.progress');
    var progressFill = $('#progress-fill');
    var statusText = $('#status-text');
    var statusDot = $('#status-dot');

    var validators = [
      { input: nameField, check: validateName },
      { input: emailField, check: validateEmail },
      { input: detailsField, check: validateDetails }
    ];

    validators.forEach(function (v) {
      v.input.addEventListener('input', clearInvalid);
      v.input.addEventListener('blur', markInvalid);
    });

    function markInvalid(e) {
      var input = e.target;
      var entry = validators.filter(function (v) { return v.input === input; })[0];
      if (entry && !entry.check(input)) setInvalid(input);
    }

    function clearInvalid(e) {
      var field = e.target.closest('.field');
      field.classList.remove('invalid');
      e.target.classList.remove('invalid');
      e.target.removeAttribute('aria-invalid');
    }

    function setInvalid(input) {
      input.closest('.field').classList.add('invalid');
      input.classList.add('invalid');
      input.setAttribute('aria-invalid', 'true');
    }

    function checkAll() {
      var ok = true;
      validators.forEach(function (v) {
        if (!v.check(v.input)) {
          setInvalid(v.input);
          ok = false;
        }
      });
      return ok;
    }

    function setStatus(text, cls) {
      if (statusText) {
        statusText.className = cls || '';
        statusText.textContent = text;
      }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!checkAll()) {
        var firstBad = form.querySelector('.field.invalid .input');
        if (firstBad) firstBad.focus();
        return;
      }

      if (statusDot) statusDot.className = 'led led-flag';
      setStatus('TRANSMISSION RECEIVED \u2014 PREPARING LAUNCH SEQUENCE...', 'warming');
      if (progress) progress.classList.add('active');
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.7';

      if (hasGsap && !reduceMotion) {
        gsap.fromTo(submitBtn,
          { scale: 1, boxShadow: '0 0 0 0 rgba(0,240,255,0)' },
          {
            scale: 0.97,
            boxShadow: '0 0 44px rgba(0,240,255,0.7), 0 0 90px rgba(255,69,0,0.35)',
            duration: 0.16,
            yoyo: true,
            repeat: 1,
            ease: 'power2.in'
          }
        );
        gsap.fromTo(progressFill, { xPercent: -100 }, { xPercent: 0, duration: 1.5, ease: 'power2.inOut' });
      } else if (hasGsap) {
        gsap.set(progressFill, { xPercent: 0 });
      } else if (progressFill) {
        progressFill.style.transform = 'translateX(0)';
      }

      window.setTimeout(function () {
        if (statusDot) statusDot.className = 'led led-green';
        setStatus('LAUNCH CONFIRMED \u2014 WE\u2019LL BE IN TOUCH WITHIN 24H', 'success');
        form.reset();
        submitBtn.disabled = false;
        submitBtn.style.opacity = '';

        window.setTimeout(function () {
          if (progress) progress.classList.remove('active');
          if (statusDot) statusDot.className = 'led led-green';
          setStatus('CHANNEL OPEN \u2014 AWAITING TRANSMISSION', '');
        }, 5200);
      }, 1700);
    });
  }

  /* ---------- Init ---------- */

  populateStars();
  starBucket = window.innerWidth < 768 ? 's' : window.innerWidth < 1200 ? 'm' : 'l';

  if (hasGsap) {
    initLaunch();
    initReveals();
    initCounters();
  } else {
    $$('.count').forEach(function (el) {
      el.textContent = el.getAttribute('data-count') || '0';
    });
  }
  initMissions();
  initForm();
})();