/**
 * Main application logic
 * Uses SITE_CONFIG from config.js
 */
(function () {
  "use strict";

  // ?preview=1 (used by admin.html) shows the unsaved draft instead of config.js
  const PREVIEW_KEY = "portfolio_config_draft";
  // ?preview=1 (or ?ace_preview=1 inside WordPress, where "preview" is reserved)
  const IS_PREVIEW = /[?&](?:ace_)?preview=1\b/.test(location.search);
  let cfg = window.SITE_CONFIG;
  if (IS_PREVIEW) {
    try {
      const draft = localStorage.getItem(PREVIEW_KEY);
      if (draft) cfg = JSON.parse(draft);
    } catch (e) {
      console.warn("Rascunho do admin inválido", e);
    }
  }
  if (!cfg) {
    console.error("SITE_CONFIG não encontrado. Verifique config.js");
    return;
  }

  const txt = (key, fallback) => (cfg.labels && cfg.labels[key]) || fallback;

  function applySeo() {
    if (!cfg.seo) return;
    if (cfg.seo.title) document.title = cfg.seo.title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta && cfg.seo.description) meta.setAttribute("content", cfg.seo.description);
  }

  // --- Colours: brand + one palette per theme, written as a <style> so both themes stay switchable ---
  function hexToRgba(hex, alpha) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }

  function paletteVars(p) {
    if (!p) return "";
    const map = {
      background: "--bg",
      surface: "--surface",
      card: "--card",
      text: "--text",
      textSoft: "--text-soft",
      textMuted: "--text-muted",
      border: "--border",
      footer: "--footer-bg"
    };
    return Object.keys(map)
      .filter((k) => p[k])
      .map((k) => `${map[k]}:${p[k]};`)
      .join("");
  }

  // any Google Font by name; Poppins is already in index.html
  function applyFont() {
    const t = cfg.theme || {};
    const font = (t.font || "").trim();
    if (font && font !== "Poppins") {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, "+")}:wght@300;400;500;600;700&display=swap`;
      document.head.appendChild(link);
    }
    return font;
  }

  function applyTheme() {
    const c = cfg.colors || {};
    const t = cfg.theme || {};
    let brand = "";
    const font = applyFont();
    if (font) brand += `--font:"${font}", system-ui, sans-serif;--font-display:"${font}", system-ui, sans-serif;`;
    if (t.buttonRadius != null && t.buttonRadius !== "") brand += `--btn-radius:${Number(t.buttonRadius)}px;`;
    if (c.primary) {
      brand += `--primary:${c.primary};`;
      const glow = hexToRgba(c.primary, 0.35);
      if (glow) brand += `--primary-glow:${glow};`;
    }
    if (c.primaryStrong) brand += `--primary-strong:${c.primaryStrong};`;
    if (c.accent) brand += `--accent:${c.accent};`;
    if (c.brandDark) brand += `--brand-dark:${c.brandDark};`;
    if (c.accent && c.primaryStrong) {
      brand += `--primary-grad:linear-gradient(180deg, ${c.accent} 0%, ${c.primaryStrong} 100%);`;
    }

    let style = document.getElementById("theme-vars");
    if (!style) {
      style = document.createElement("style");
      style.id = "theme-vars";
      document.head.appendChild(style);
    }
    style.textContent =
      `:root{${brand}${paletteVars(c.light)}}` +
      `:root[data-theme="dark"]{${paletteVars(c.dark)}}`;
  }

  // --- Light / dark toggle ---
  const THEME_KEY = "site-theme";

  function systemTheme() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function defaultTheme() {
    const d = (cfg.theme && cfg.theme.default) || "light";
    return d === "auto" ? systemTheme() : d;
  }

  function setTheme(mode, persist) {
    document.documentElement.setAttribute("data-theme", mode);
    if (persist) {
      try {
        localStorage.setItem(THEME_KEY, mode);
      } catch (e) {}
    }
    const btn = document.getElementById("theme-toggle");
    if (btn) {
      const dark = mode === "dark";
      btn.setAttribute("aria-pressed", dark);
      btn.setAttribute("aria-label", dark ? "Mudar para modo claro" : "Mudar para modo escuro");
      btn.title = btn.getAttribute("aria-label");
    }
  }

  function initThemeToggle() {
    // the admin preview always shows the configured default
    if (IS_PREVIEW) setTheme(defaultTheme(), false);
    else setTheme(document.documentElement.getAttribute("data-theme") || defaultTheme(), false);

    const btn = document.getElementById("theme-toggle");
    if (!btn) return;
    if (cfg.theme && cfg.theme.showToggle === false) {
      btn.hidden = true;
      return;
    }
    btn.addEventListener("click", () => {
      const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      setTheme(next, !IS_PREVIEW);
    });
  }

  const ICONS = {
    email:
      '<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>',
    phone:
      '<svg viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>',
    youtube:
      '<svg viewBox="0 0 24 24"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.8 15.5v-7l6.2 3.5-6.2 3.5z"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    caret: '<svg class="nav-caret" viewBox="0 0 12 12"><path d="M2.5 4.5L6 8l3.5-3.5"/></svg>',
    arrowDown: '<svg viewBox="0 0 24 24"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
    arrowRight: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    closeCircle:
      '<svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="13" cy="13" r="12"/><path d="M9 9l8 8M17 9l-8 8" stroke-linecap="round"/></svg>'
  };

  const SOCIAL = {
    email: { label: "E-mail", icon: ICONS.email },
    phone: { label: "Telefone", icon: ICONS.phone },
    whatsapp: {
      label: "WhatsApp",
      icon: '<svg viewBox="0 0 24 24"><path d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.4 5 5.1-1.3A9.9 9.9 0 1 0 12.04 2zm5.8 14.1c-.25.7-1.45 1.33-2 1.4-.53.08-1.2.11-1.93-.12-.45-.14-1-.33-1.73-.64-3.04-1.31-5.02-4.37-5.17-4.57-.15-.2-1.24-1.64-1.24-3.13 0-1.5.78-2.23 1.06-2.53.28-.3.6-.38.8-.38h.58c.18 0 .43-.07.68.52.25.6.85 2.08.93 2.23.07.15.12.33.02.53-.1.2-.15.33-.3.5l-.45.53c-.15.15-.3.31-.13.6.17.3.77 1.27 1.66 2.06 1.14 1.02 2.1 1.33 2.4 1.48.3.15.47.13.65-.08.17-.2.75-.87.95-1.17.2-.3.4-.25.67-.15.28.1 1.75.83 2.05.98.3.15.5.22.57.35.08.12.08.72-.17 1.42z"/></svg>'
    },
    facebook: {
      label: "Facebook",
      icon: '<svg viewBox="0 0 24 24"><path d="M14 8.5V6.6c0-.8.2-1.3 1.4-1.3H17V2.2C16.7 2.1 15.7 2 14.6 2 12.2 2 10.6 3.4 10.6 6.1v2.4H8v3.3h2.6V22H14V11.8h2.7l.4-3.3H14z"/></svg>'
    },
    linkedin: {
      label: "LinkedIn",
      icon: '<svg viewBox="0 0 24 24"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.75h4V21H3V9.75zM9.5 9.75h3.8v1.6h.06c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.77 2.6 4.77 6V21h-4v-5c0-1.2-.02-2.73-1.66-2.73-1.67 0-1.92 1.3-1.92 2.64V21h-4V9.75z"/></svg>'
    },
    instagram: {
      label: "Instagram",
      icon: '<svg viewBox="0 0 24 24"><path d="M12 7.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm6-7.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0zM21.9 8.1c-.1-1.6-.4-3-1.6-4.2-1.2-1.2-2.6-1.5-4.2-1.6C14.5 2.2 9.5 2.2 7.9 2.3c-1.6.1-3 .4-4.2 1.6C2.5 5.1 2.2 6.5 2.1 8.1c-.1 1.6-.1 6.6 0 8.2.1 1.6.4 3 1.6 4.2 1.2 1.2 2.6 1.5 4.2 1.6 1.6.1 6.6.1 8.2 0 1.6-.1 3-.4 4.2-1.6 1.2-1.2 1.5-2.6 1.6-4.2.1-1.6.1-6.6 0-8.2z"/></svg>'
    },
    youtube: { label: "YouTube", icon: ICONS.youtube },
    x: {
      label: "X",
      icon: '<svg viewBox="0 0 24 24"><path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.2-8.3L1.8 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z"/></svg>'
    },
    tiktok: {
      label: "TikTok",
      icon: '<svg viewBox="0 0 24 24"><path d="M16.6 2h-3.3v13.4a2.9 2.9 0 1 1-2.9-2.9c.3 0 .6 0 .9.1V9.2a6.3 6.3 0 1 0 5.3 6.2V8.8a7.8 7.8 0 0 0 4.4 1.4V6.9a4.5 4.5 0 0 1-4.4-4.9z"/></svg>'
    }
  };

  function socialLinks() {
    const list = Array.isArray(cfg.social) ? cfg.social : [];
    return list
      .filter((s) => s.url && SOCIAL[s.type])
      .map((s) => {
        const meta = SOCIAL[s.type];
        const ext = isExternal(s.url) ? ' target="_blank" rel="noopener"' : "";
        return `<a href="${s.url}"${ext} aria-label="${meta.label}" title="${meta.label}">${meta.icon}</a>`;
      })
      .join("");
  }

  function initials(name) {
    return (name || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");
  }

  // Render fixed header: logo, menu, social icons, language switcher
  function renderHeader() {
    const logo = document.getElementById("logo");
    if (logo) {
      if (cfg.logoStyle === "logo" && cfg.logoImage) {
        logo.classList.add("logo--image");
        logo.innerHTML = `<img class="logo-img" src="${cfg.logoImage}" alt="${cfg.siteName}" />`;
        logo.setAttribute("aria-label", cfg.siteName);
      } else {
      const avatar = cfg.logoImage
        ? `<img src="${cfg.logoImage}" alt="" />`
        : initials(cfg.siteName);
      logo.innerHTML = `
        <span class="logo-avatar">${avatar}</span>
        <span class="logo-text">
          <span class="logo-name">${(cfg.logoText || cfg.siteName).replace(/\n/g, " ")}</span>
          <span class="logo-sub">${cfg.logoSub || cfg.siteTagline}</span>
        </span>
      `;
      }
    }

    const social = document.getElementById("social-icons");
    const navSocial = document.getElementById("nav-social");
    if (social) social.innerHTML = socialLinks();
    if (navSocial) navSocial.innerHTML = socialLinks();

    renderNav();
    renderLangSwitcher();
    initHeaderBehaviour();
  }

  function navTarget(item) {
    if (item.panel != null) return `href="#hero" data-panel-index="${item.panel}"`;
    if (item.project != null) return `href="#projects" data-project-index="${item.project}"`;
    const external = item.href && item.href.startsWith("http");
    return `href="${item.href || "#"}"${external ? ' target="_blank" rel="noopener"' : ""}`;
  }

  function renderNav() {
    const list = document.getElementById("nav-list");
    if (!list || !cfg.nav) return;

    list.innerHTML = cfg.nav
      .map((item, i) => {
        let children = item.children || [];
        if (item.autoProjects && cfg.projects) {
          children = cfg.projects.map((p, idx) => ({ label: p.title, project: idx }));
        }
        const hasChildren = children.length > 0;
        return `
        <li class="nav-item${hasChildren ? " has-dropdown" : ""}" style="--i:${i}">
          <a class="nav-link" ${navTarget(item)}>${item.label}${hasChildren ? ICONS.caret : ""}</a>
          ${
            hasChildren
              ? `<div class="nav-dropdown">${children
                  .map((c) => `<a ${navTarget(c)}>${c.label}</a>`)
                  .join("")}</div>`
              : ""
          }
        </li>`;
      })
      .join("");
  }

  // --- Language switcher (drives a hidden Google Translate element) ---
  function getCookie(name) {
    const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : "";
  }

  function currentLang() {
    const i18n = cfg.i18n;
    const m = getCookie("googtrans").match(/\/[^/]*\/([^/]+)$/);
    return (m && m[1]) || i18n.defaultLanguage;
  }

  function setTransCookie(value) {
    const host = location.hostname;
    const expire = value ? "" : "; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = `googtrans=${value}; path=/${expire}`;
    if (host && host.includes(".")) {
      document.cookie = `googtrans=${value}; path=/; domain=.${host}${expire}`;
    }
  }

  function loadGoogleTranslate() {
    if (window.google && window.google.translate) return;
    window.googleTranslateElementInit = function () {
      new window.google.translate.TranslateElement(
        { pageLanguage: "auto", autoDisplay: false },
        "google_translate_element"
      );
    };
    const s = document.createElement("script");
    s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    document.body.appendChild(s);
  }

  function applyLanguage(code) {
    const i18n = cfg.i18n;
    if (code === i18n.defaultLanguage) {
      // back to the original text
      setTransCookie("");
      location.reload();
      return;
    }
    setTransCookie(`/auto/${code}`);
    const combo = document.querySelector(".goog-te-combo");
    if (combo) {
      combo.value = code;
      combo.dispatchEvent(new Event("change"));
    } else {
      location.reload();
    }
  }

  function renderLangSwitcher() {
    const wrap = document.getElementById("lang-switcher");
    const i18n = cfg.i18n;
    if (!wrap) return;
    if (!i18n || !i18n.enabled || !i18n.languages) {
      wrap.style.display = "none";
      return;
    }

    const flag = (l) =>
      `<img class="lang-flag" src="https://flagcdn.com/${l.flag}.svg" alt="" width="22" height="16" />`;

    const draw = () => {
      const code = currentLang();
      const cur = i18n.languages.find((l) => l.code === code) || i18n.languages[0];
      wrap.innerHTML = `
        <button class="lang-current" type="button" aria-haspopup="listbox" aria-expanded="false">
          ${flag(cur)}<span class="lang-label">${cur.label}</span><span class="lang-arrow">▼</span>
        </button>
        <div class="lang-menu" role="listbox">
          ${i18n.languages
            .map(
              (l) => `
            <button type="button" role="option" data-lang="${l.code}" class="${
                l.code === cur.code ? "is-active" : ""
              }" aria-selected="${l.code === cur.code}">${flag(l)}<span>${l.label}</span></button>`
            )
            .join("")}
        </div>
      `;
    };
    draw();

    wrap.addEventListener("click", (e) => {
      const opt = e.target.closest("[data-lang]");
      if (opt) {
        const code = opt.dataset.lang;
        wrap.classList.remove("is-open");
        if (code !== currentLang()) {
          applyLanguage(code);
          draw();
        }
        return;
      }
      if (e.target.closest(".lang-current")) {
        const open = wrap.classList.toggle("is-open");
        wrap.querySelector(".lang-current").setAttribute("aria-expanded", open);
      }
    });

    document.addEventListener("click", (e) => {
      if (!wrap.contains(e.target)) wrap.classList.remove("is-open");
    });

    loadGoogleTranslate();
  }

  function initHeaderBehaviour() {
    const header = document.getElementById("site-header");
    const toggle = document.getElementById("nav-toggle");
    const backdrop = document.getElementById("nav-backdrop");
    const nav = document.getElementById("main-nav");
    if (!header) return;

    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const setDrawer = (open) => {
      header.classList.toggle("nav-open", open);
      toggle && toggle.setAttribute("aria-expanded", open);
      document.body.classList.toggle("hax-locked", open);
    };

    toggle && toggle.addEventListener("click", () => setDrawer(!header.classList.contains("nav-open")));
    backdrop && backdrop.addEventListener("click", () => setDrawer(false));

    // the logo goes back to the top, so it also closes an open sheet
    const logoLink = document.getElementById("logo");
    logoLink &&
      logoLink.addEventListener("click", () => {
        setDrawer(false);
        closeProject();
      });

    const isDrawer = () => window.matchMedia("(max-width: 1024px)").matches;

    nav &&
      nav.addEventListener("click", (e) => {
        const link = e.target.closest("a");
        if (!link) return;

        // in the drawer, the first tap on a parent opens its submenu
        const item = link.closest(".nav-item");
        if (isDrawer() && link.classList.contains("nav-link") && item.classList.contains("has-dropdown")) {
          e.preventDefault();
          item.classList.toggle("is-open");
          return;
        }

        if (link.dataset.panelIndex != null) {
          e.preventDefault();
          setDrawer(false);
          window.scrollTo({ top: 0, behavior: "smooth" });
          const hero = document.getElementById("hero");
          const panel = hero && hero.querySelectorAll(".hax-panel")[+link.dataset.panelIndex];
          const hadSheet = closeProject();
          if (panel) setTimeout(() => expand(hero, panel), window.scrollY > 10 || hadSheet ? 450 : 0);
          return;
        }

        if (link.dataset.projectIndex != null) {
          e.preventDefault();
          setDrawer(false);
          openProject(+link.dataset.projectIndex);
          return;
        }

        if (link.getAttribute("href").startsWith("#")) {
          setDrawer(false);
          closeProject();
          collapse(document.getElementById("hero"));
        }
      });

    // highlight the menu entry of the section in view
    const links = [...document.querySelectorAll(".nav-list > .nav-item > .nav-link")];
    const sections = links
      .map((l) => {
        const href = l.getAttribute("href") || "";
        return href.startsWith("#") && href.length > 1 ? document.querySelector(href) : null;
      })
      .filter(Boolean);
    if ("IntersectionObserver" in window && sections.length) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (!en.isIntersecting) return;
            // several entries may point at the same section: mark only the first
            const current = links.find((l) => l.getAttribute("href") === "#" + en.target.id);
            links.forEach((l) => l.classList.toggle("is-current", l === current));
          });
        },
        { rootMargin: "-45% 0px -50% 0px" }
      );
      [...new Set(sections)].forEach((s) => io.observe(s));
    }
  }

  // --- Hero: horizontal accordion ---

  // flex-grow so the open panel takes `share` of the width whatever the panel count
  function growFor(share, count) {
    return ((share * (count - 1)) / (1 - share)).toFixed(2);
  }

  function collapse(hero) {
    if (!hero) return;
    hero.classList.remove("hax-hero--open");
    hero.querySelectorAll(".hax-panel--active").forEach((p) => {
      p.classList.remove("hax-panel--active");
      p.setAttribute("aria-expanded", "false");
    });
  }

  function expand(hero, panel) {
    collapse(hero);
    hero.classList.add("hax-hero--open");
    panel.classList.add("hax-panel--active");
    panel.setAttribute("aria-expanded", "true");
  }

  function renderHero() {
    const hero = document.getElementById("hero");
    if (!hero || !cfg.panels) return;

    const n = cfg.panels.length;
    hero.style.setProperty("--hax-grow-open-d", growFor(0.86, n));
    hero.style.setProperty("--hax-grow-open-t", growFor(0.78, n));
    hero.style.setProperty("--hax-grow-open-m", growFor(0.7, n));

    hero.innerHTML = cfg.panels
      .map((p) => {
        const isProject = p.project != null;
        const link = p.ctaLink || "#";
        const external = !isProject && link.startsWith("http");
        const ctaAttrs = isProject
          ? `href="#projects" data-project-index="${p.project}"`
          : `href="${link}"${external ? ' target="_blank" rel="noopener" data-external' : ""}`;
        const contact = p.showContact
          ? `<div class="hax-panel__contact">
              <a href="tel:${(cfg.phone || "").replace(/\s/g, "")}">${ICONS.phone}${cfg.phone}</a>
              <a href="mailto:${cfg.email}">${ICONS.email}${cfg.email}</a>
            </div>`
          : "";
        return `
      <article class="hax-panel" data-panel="${p.id}" style="background-image:url('${p.bgImage}')"
        tabindex="0" role="button" aria-expanded="false" aria-label="${p.label}">
        <div class="hax-panel__rail" aria-hidden="true">
          <span class="hax-panel__line"></span>
          <h3 class="hax-panel__title">${p.label}</h3>
          <span class="hax-panel__plus">${ICONS.plus}</span>
        </div>
        <div class="hax-panel__num" aria-hidden="true">${p.number}</div>
        <div class="hax-panel__content">
          <p class="hax-panel__csub">${p.subtitle}</p>
          <h2 class="hax-panel__ctitle">${p.title}</h2>
          ${contact}
          <p class="hax-panel__text">${p.description}</p>
          <ul class="hax-panel__meta">
            ${(p.stats || []).map((s) => `<li><strong>${s.value}</strong> ${s.label || ""}</li>`).join("")}
          </ul>
          <a class="hax-panel__cta" ${ctaAttrs}>${isProject ? ICONS.arrowDown : ""}<span>${p.ctaText}</span>${
          isProject ? "" : ICONS.arrowRight
        }</a>
        </div>
        <button class="hax-panel__close" type="button" aria-label="Fechar">${ICONS.close}</button>
      </article>`;
      })
      .join("");

    hero.addEventListener("click", (e) => {
      const panel = e.target.closest(".hax-panel");
      if (!panel) return;

      if (e.target.closest(".hax-panel__close")) {
        e.stopPropagation();
        collapse(hero);
        return;
      }

      const cta = e.target.closest(".hax-panel__cta");
      if (cta) {
        if (cta.dataset.projectIndex != null) {
          e.preventDefault();
          openProject(+cta.dataset.projectIndex);
        } else if (cta.getAttribute("href").startsWith("#")) {
          collapse(hero);
        }
        return;
      }

      // let other links inside the open panel work normally
      if (panel.classList.contains("hax-panel--active")) {
        if (e.target.closest("a, button")) return;
        if (e.target.closest(".hax-panel__content > *")) return;
        collapse(hero);
      } else {
        expand(hero, panel);
      }
    });

    hero.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const panel = e.target.closest(".hax-panel");
      if (!panel || e.target !== panel) return;
      e.preventDefault();
      if (panel.classList.contains("hax-panel--active")) collapse(hero);
      else expand(hero, panel);
    });
  }

  // --- Slide-up project sheets ---
  const paragraphsOf = (text) =>
    String(text || "")
      .split(/\n\s*\n/)
      .filter(Boolean)
      .map((t) => `<p>${t}</p>`)
      .join("");

  const isExternal = (href) => /^https?:\/\//.test(href || "");
  const linkAttrs = (href) =>
    `href="${href}"${isExternal(href) ? ' target="_blank" rel="noopener" data-external' : ""}`;

  function renderProjectSheets() {
    const wrap = document.getElementById("hax-projects");
    if (!wrap || !cfg.projects) return;

    wrap.innerHTML = cfg.projects
      .map((p) => {
        const details = p.details || [];
        const hasCta = p.ctaText && p.ctaLink && p.ctaLink !== "#";
        return `
      <div class="hax-project" role="dialog" aria-modal="true" aria-label="${p.title}">
        <div class="hax-project__inner">
          <button class="hax-project__close" type="button">
            <span>${txt("close", "Fechar")}</span>${ICONS.closeCircle}
          </button>
          <div class="hax-project__head">
            <p class="hax-project__label" style="--d:.45s">${p.number || ""}</p>
            <h2 class="hax-project__title" style="--d:.52s">${p.title}</h2>
            ${p.intro ? `<p class="hax-project__intro" style="--d:.59s">${p.intro}</p>` : ""}
            ${
              hasCta
                ? `<a class="hax-panel__cta" style="--d:.66s" ${linkAttrs(p.ctaLink)}><span>${p.ctaText}</span>${ICONS.arrowRight}</a>`
                : ""
            }
          </div>
          ${p.image ? `<div class="hax-project__image" style="--d:.7s"><img src="${p.image}" alt="${p.title}" loading="lazy" /></div>` : ""}
          <div class="hax-project__cols" style="--d:.2s">
            <div class="hax-project__col-text"><div class="hax-project__desc">${paragraphsOf(p.description)}</div></div>
            ${
              details.length
                ? `<div class="hax-project__col-info"><ul class="hax-project__info">
                ${details.map((d) => `<li><span>${d.label}</span><strong>${d.value}</strong></li>`).join("")}
              </ul></div>`
                : ""
            }
          </div>
          ${
            p.image2
              ? `<div class="hax-project__image-sec" style="--d:.2s"><img src="${p.image2}" alt="" loading="lazy" /></div>`
              : ""
          }
        </div>
      </div>`;
      })
      .join("");

    wrap.addEventListener("click", (e) => {
      if (e.target.closest(".hax-project__close")) closeProject();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      // Escape closes the sheet first and keeps the accordion as it was
      if (closeProject()) return;
      collapse(document.getElementById("hero"));
    });
  }

  function openProject(index) {
    openSheet(document.querySelectorAll("#hax-projects .hax-project")[index]);
  }

  // any slide-up sheet (projects, blog articles)
  function openSheet(sheet) {
    if (!sheet) return;
    closeProject();
    sheet.classList.add("hax-project--open");
    document.documentElement.classList.add("hax-locked", "sheet-open");
    document.body.classList.add("hax-locked");
    sheet.scrollTop = 0;
    const btn = sheet.querySelector(".hax-project__close");
    btn && btn.focus({ preventScroll: true });
  }

  function closeProject() {
    const open = document.querySelectorAll(".hax-project--open");
    open.forEach((s) => s.classList.remove("hax-project--open"));
    if (open.length) {
      document.documentElement.classList.remove("hax-locked", "sheet-open");
      document.body.classList.remove("hax-locked");
    }
    return open.length > 0;
  }

  // --- Scroll reveal ---
  function initReveal() {
    const items = document.querySelectorAll("[data-reveal]");
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          en.target.classList.add("is-visible");
          io.unobserve(en.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    items.forEach((el) => io.observe(el));
  }

  // Render projects ("Sobre nós" cards – each opens its sheet)
  function renderProjects() {
    const section = document.getElementById("projects");
    const header = document.getElementById("projects-header");
    const grid = document.getElementById("projects-grid");
    if (!header || !grid || !cfg.projects) return;

    const sec = cfg.projectsSection || {};
    if (sec.enabled === false || !cfg.projects.length) {
      section.style.display = "none";
      return;
    }
    header.innerHTML = `
      <p class="section-eyebrow">${sec.eyebrow || ""}</p>
      <h2 class="section-title">${sec.title || ""}</h2>
      ${sec.intro ? `<p class="section-intro">${sec.intro}</p>` : ""}
    `;

    grid.innerHTML = cfg.projects
      .map((p, i) => {
        const first = String(p.description || "").split(/\n\s*\n/)[0];
        const details = (p.details || []).slice(0, 4);
        return `
      <article class="project" data-reveal>
        <div class="project-image" data-project-index="${i}" role="button" tabindex="0" aria-label="${p.title}">
          ${p.image ? `<img src="${p.image}" alt="${p.title}" loading="lazy" />` : ""}
        </div>
        <div class="project-info">
          <p class="project-meta">${p.number || ""}</p>
          <h3 class="project-title">${p.title}</h3>
          <p class="project-desc">${first}</p>
          ${
            details.length
              ? `<div class="project-details">${details
                  .map((d) => `<div class="project-detail"><span>${d.label}</span><strong>${d.value}</strong></div>`)
                  .join("")}</div>`
              : ""
          }
          <button class="project-link" type="button" data-project-index="${i}">${sec.linkText || "Ver mais"} →</button>
        </div>
      </article>`;
      })
      .join("");

    // the image opens the same slide-up sheet as the hero buttons
    grid.addEventListener("click", (e) => {
      const img = e.target.closest("[data-project-index]");
      if (img) openProject(+img.dataset.projectIndex);
    });
    grid.addEventListener("keydown", (e) => {
      const img = e.target.closest("[data-project-index]");
      if (img && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        openProject(+img.dataset.projectIndex);
      }
    });
  }

  // Render form section
  function renderForm() {
    const sec = document.getElementById("contact-header");
    const formEl = document.getElementById("contact-form");
    if (!sec || !formEl) return;

    const fs = cfg.formSection || {};
    const ff = cfg.formFields || {};

    sec.innerHTML = `
      <p class="section-eyebrow">${fs.eyebrow || ""}</p>
      <h2 class="section-title">${fs.title || "Contact"}</h2>
      <p class="section-intro">${fs.description || ""}</p>
    `;

    formEl.innerHTML = `
      <div class="form-group">
        <label for="name">${ff.nameLabel || "Name"}</label>
        <input type="text" id="name" name="name" required placeholder="${txt("namePlaceholder", "")}" />
      </div>
      <div class="form-group">
        <label for="email">${ff.emailLabel || "Email"}</label>
        <input type="email" id="email" name="email" required placeholder="${txt("emailPlaceholder", "")}" />
      </div>
      <div class="form-group">
        <label for="phone">${ff.phoneLabel || "Phone"}</label>
        <input type="tel" id="phone" name="phone" placeholder="${txt("phonePlaceholder", "")}" />
      </div>
      <div class="form-group">
        <label for="type">${ff.typeLabel || "Type"}</label>
        <select id="type" name="type" required>
          ${(ff.types || [])
            .map((t) => `<option value="${t.value}">${t.label}</option>`)
            .join("")}
        </select>
      </div>
      <div class="form-group">
        <label for="message">${ff.messageLabel || "Message"}</label>
        <textarea id="message" name="message" required placeholder="${txt("messagePlaceholder", "")}"></textarea>
      </div>
      <button type="submit" class="form-submit">${ff.submitText || "Send"}</button>
      <div id="form-message" class="form-message" role="alert"></div>
    `;

    formEl.addEventListener("submit", handleFormSubmit);
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const msg = document.getElementById("form-message");
    const ff = cfg.formFields || {};

    const data = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      type: form.type.value,
      message: form.message.value.trim(),
      date: new Date().toISOString()
    };

    // cfg.formEndpoint (or window.ACE_FORM_ENDPOINT, set by a CMS) receives the
    // message as JSON; without one, the demo keeps it in this browser
    const endpoint = cfg.formEndpoint || window.ACE_FORM_ENDPOINT;
    if (endpoint) {
      const button = form.querySelector('[type="submit"]');
      if (button) button.disabled = true;
      fetch(endpoint, {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" }, window.ACE_FORM_HEADERS || {}),
        body: JSON.stringify(data)
      })
        .then((r) => {
          if (!r.ok) throw new Error(r.status);
          msg.className = "form-message success";
          msg.textContent = ff.successMessage || "Enviado com sucesso!";
          form.reset();
        })
        .catch(() => {
          msg.className = "form-message error";
          msg.textContent = ff.errorMessage || "Erro ao enviar.";
        })
        .finally(() => {
          if (button) button.disabled = false;
        });
      return;
    }

    try {
      const key = "portfolio_submissions";
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      existing.push(data);
      localStorage.setItem(key, JSON.stringify(existing));

      // Optional: open WhatsApp with pre-filled message for "testemunho" or contact
      if (data.type === "testemunho" || data.type === "email") {
        // just store; user can also use WhatsApp float
      }

      msg.className = "form-message success";
      msg.textContent = ff.successMessage || "Enviado com sucesso!";
      form.reset();

      // Clear message after a few seconds
      setTimeout(() => {
        msg.className = "form-message";
        msg.textContent = "";
      }, 5000);
    } catch (err) {
      msg.className = "form-message error";
      msg.textContent = ff.errorMessage || "Erro ao enviar.";
    }
  }

  // Render map
  function renderMap() {
    const wrap = document.getElementById("map-wrap");
    const addressEl = document.getElementById("map-address");
    if (!wrap || !cfg.map || !cfg.map.enabled) {
      if (wrap) wrap.style.display = "none";
      if (addressEl) addressEl.style.display = "none";
      return;
    }

    const m = cfg.map;
    if (addressEl) {
      addressEl.innerHTML = `
        <span>${m.address || ""}</span>
        ${
          m.directionsUrl
            ? `<a class="map-directions" href="${m.directionsUrl}" target="_blank" rel="noopener">${m.directionsText || "Como chegar"} →</a>`
            : ""
        }`;
    }

    // provider "google" (default): keyless Google Maps embed – works everywhere,
    // also when the page is opened as a local file. "osm": Leaflet map, falls back
    // to Google when Leaflet or its tiles cannot load.
    const googleSrc =
      m.googleMapsEmbed ||
      `https://maps.google.com/maps?q=${m.lat},${m.lng}&z=${m.zoom || 15}&hl=pt&output=embed`;
    const showGoogle = () => {
      wrap.innerHTML = `<iframe src="${googleSrc}" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Mapa"></iframe>`;
    };

    if (m.googleMapsEmbed || m.provider !== "osm" || location.protocol === "file:") {
      showGoogle();
      return;
    }

    wrap.innerHTML = `<div id="map"></div>`;
    const fallback = setTimeout(showGoogle, 8000); // Leaflet never arrived
    const start = () => {
      clearTimeout(fallback);
      try {
        initLeaflet(m, showGoogle);
      } catch (err) {
        showGoogle();
      }
    };
    if (window.L) {
      start();
      return;
    }
    // CSS first, so the map measures its size correctly
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(css);
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => (css.sheet ? start() : css.addEventListener("load", start, { once: true }));
    script.onerror = () => {
      clearTimeout(fallback);
      showGoogle();
    };
    document.body.appendChild(script);
  }

  function initLeaflet(m, onFail) {
    const map = L.map("map", { scrollWheelZoom: false }).setView([m.lat, m.lng], m.zoom || 15);
    // CARTO tiles (OpenStreetMap data) do not reject requests without a Referer
    const tiles = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 20,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);
    let failed = 0;
    tiles.on("tileerror", () => {
      if (++failed === 4 && onFail) onFail(); // tiles blocked: use Google instead
    });
    // brand-coloured pin
    const pin = L.divIcon({
      className: "map-pin",
      html: "<span></span>",
      iconSize: [34, 44],
      iconAnchor: [17, 42],
      popupAnchor: [0, -38]
    });
    const marker = L.marker([m.lat, m.lng], { icon: pin }).addTo(map);
    if (m.address) marker.bindPopup(m.address).openPopup();
    // the map may be laid out before its section is visible
    setTimeout(() => map.invalidateSize(), 400);
  }

  // Render testimonials
  function renderTestimonials() {
    const head = document.getElementById("testimonials-header");
    const track = document.getElementById("testimonials-track");
    const list = cfg.testimonials || [];
    const section = document.getElementById("testimonials");
    if (!track || !section) return;
    if (!list.length) {
      section.style.display = "none";
      return;
    }

    const ts = cfg.testimonialsSection || {};
    if (head) {
      head.innerHTML = `
        <p class="section-eyebrow">${ts.eyebrow || ""}</p>
        <h3 class="section-title">${ts.title || ""}</h3>
      `;
    }

    track.innerHTML = list
      .map((t, i) => {
        const photo = t.photo
          ? `<img class="testimonial-photo" src="${t.photo}" alt="${t.name}" loading="lazy" />`
          : `<span class="testimonial-photo testimonial-photo--initials">${initials(t.name)}</span>`;
        const brand = t.logo
          ? `<img class="testimonial-logo" src="${t.logo}" alt="${t.company || ""}" loading="lazy" />`
          : t.company
          ? `<span class="testimonial-logo testimonial-logo--text">${t.company}</span>`
          : "";
        const role = [t.role, t.company].filter(Boolean).join(", ");
        return `
      <figure class="testimonial-card" role="group" aria-roledescription="slide" aria-label="${i + 1} / ${list.length}">
        <div class="testimonial-top">
          <svg class="testimonial-quote" viewBox="0 0 32 24" aria-hidden="true"><path d="M0 24V14.4C0 6.4 4.3 1.6 12.8 0l1.6 3.2C9.9 4.5 7.6 7.2 7.4 11.2H13V24H0zm18.6 0V14.4C18.6 6.4 22.9 1.6 31.4 0L33 3.2c-4.5 1.3-6.8 4-7 8H31.6V24H18.6z"/></svg>
          ${brand}
        </div>
        ${t.title ? `<h4 class="testimonial-title">${t.title}</h4>` : ""}
        <blockquote class="testimonial-text">${t.text}</blockquote>
        <figcaption class="testimonial-author">
          ${photo}
          <span>
            <span class="testimonial-name">${t.name}</span>
            <span class="testimonial-role">${role}</span>
          </span>
        </figcaption>
      </figure>`;
      })
      .join("");

    initCarousel(section, ts);
  }

  // --- "Porquê a ACE": reasons + counters that count up when seen ---
  function renderWhy() {
    const wrap = document.getElementById("why");
    const w = cfg.whySection;
    if (!wrap) return;
    if (!w || w.enabled === false) {
      wrap.style.display = "none";
      return;
    }
    const features = w.features || [];
    const counters = w.counters || [];
    const hasCta = w.ctaText && w.ctaLink;

    wrap.innerHTML = `
      <div class="why-inner">
        <div class="why-media" data-reveal>
          ${w.image ? `<img src="${w.image}" alt="" loading="lazy" />` : ""}
          ${
            counters.length
              ? `<div class="why-counters">${counters
                  .map(
                    (c) => `
              <div class="why-counter">
                <strong><span data-count="${Number(c.value) || 0}">0</span>${c.suffix || ""}</strong>
                <span>${c.label || ""}</span>
              </div>`
                  )
                  .join("")}</div>`
              : ""
          }
        </div>
        <div class="why-copy">
          <div data-reveal>
            <p class="section-eyebrow">${w.eyebrow || ""}</p>
            <h2 class="section-title">${w.title || ""}</h2>
            ${w.description ? `<p class="section-intro">${w.description}</p>` : ""}
          </div>
          <ul class="why-features">
            ${features
              .map(
                (f, i) => `
            <li class="why-feature" data-reveal style="--d:${0.1 + i * 0.1}s">
              <span class="why-check" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7"/></svg></span>
              <span><strong>${f.title || ""}</strong>${f.text ? `<span>${f.text}</span>` : ""}</span>
            </li>`
              )
              .join("")}
          </ul>
          ${hasCta ? `<a class="hax-panel__cta" data-reveal ${linkAttrs(w.ctaLink)}><span>${w.ctaText}</span>${ICONS.arrowRight}</a>` : ""}
        </div>
      </div>
    `;

    const nums = wrap.querySelectorAll("[data-count]");
    const run = (el) => {
      const target = +el.dataset.count;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        el.textContent = target.toLocaleString("pt-PT");
        return;
      }
      const start = performance.now();
      const dur = 1600;
      const step = (now) => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(target * eased).toLocaleString("pt-PT");
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) =>
          entries.forEach((en) => {
            if (!en.isIntersecting) return;
            run(en.target);
            io.unobserve(en.target);
          }),
        { threshold: 0.6 }
      );
      nums.forEach((n) => io.observe(n));
    } else {
      nums.forEach(run);
    }
  }

  // --- Institutional video: poster first, the player loads on click ---
  function videoSource(url) {
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    if (yt) {
      return { type: "embed", src: `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&rel=0`, id: yt[1] };
    }
    const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeo) return { type: "embed", src: `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1` };
    return { type: "file", src: url };
  }

  function renderVideo() {
    const wrap = document.getElementById("video");
    const v = cfg.videoSection;
    if (!wrap) return;
    if (!v || !v.enabled || !v.url) {
      wrap.style.display = "none";
      return;
    }

    const source = videoSource(v.url);
    // a YouTube link without poster can use the video's own thumbnail
    const poster = v.poster || (source.id ? `https://i.ytimg.com/vi/${source.id}/hqdefault.jpg` : "");

    wrap.innerHTML = `
      <div class="video-head" data-reveal>
        <p class="section-eyebrow">${v.eyebrow || ""}</p>
        <h3 class="section-title">${v.title || ""}</h3>
        ${v.description ? `<p class="section-intro">${v.description}</p>` : ""}
      </div>
      <div class="video-frame" data-reveal style="--d:.12s">
        <button class="video-poster" type="button" aria-label="${txt("playVideo", "Ver vídeo")}: ${v.title || ""}"
          ${poster ? `style="background-image:url('${poster}')"` : ""}>
          <span class="video-play">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>
          </span>
          ${v.duration ? `<span class="video-duration">${v.duration}</span>` : ""}
        </button>
      </div>
    `;

    const frame = wrap.querySelector(".video-frame");
    frame.querySelector(".video-poster").addEventListener("click", () => {
      frame.innerHTML =
        source.type === "embed"
          ? `<iframe src="${source.src}" title="${v.title || "Vídeo"}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`
          : `<video src="${source.src}" ${poster ? `poster="${poster}"` : ""} controls autoplay playsinline></video>`;
      frame.classList.add("is-playing");
    });
  }

  // --- Page sections: order, visibility, background and custom sections ---
  // cfg.sections lists the blocks between the hero and the footer, in order.
  // Built-in types reuse the markup in index.html; custom types are built here.
  const BUILTIN_SECTIONS = ["projects", "why", "contact", "video", "blog", "testimonials", "actions", "follow"];

  function customSectionHtml(sec) {
    const button =
      sec.buttonText && sec.buttonLink
        ? `<a class="hax-panel__cta" ${linkAttrs(sec.buttonLink)}><span>${sec.buttonText}</span>${ICONS.arrowRight}</a>`
        : "";
    const head = (intro) => `
      ${sec.eyebrow ? `<p class="section-eyebrow">${sec.eyebrow}</p>` : ""}
      ${sec.title ? `<h2 class="section-title">${sec.title}</h2>` : ""}
      ${intro ? `<p class="section-intro">${intro}</p>` : ""}`;

    if (sec.type === "textImage") {
      return `
        <div class="page-inner ti-grid ti--${sec.imagePosition === "left" ? "left" : "right"}${sec.image ? "" : " ti--no-image"}">
          <div class="ti-copy" data-reveal>
            ${head("")}
            ${String(sec.text || "")
              .split(/\n\s*\n/)
              .filter(Boolean)
              .map((t) => `<p class="section-intro">${t}</p>`)
              .join("")}
            ${button}
          </div>
          ${sec.image ? `<div class="ti-media" data-reveal style="--d:.12s"><img src="${sec.image}" alt="" loading="lazy" /></div>` : ""}
        </div>`;
    }

    if (sec.type === "cards") {
      const cards = sec.cards || [];
      return `
        <div class="page-inner">
          <div class="section-header" data-reveal>${head(sec.intro)}</div>
          <div class="cards-grid" style="--cols:${Math.min(4, Math.max(1, Number(sec.columns) || 3))}">
            ${cards
              .map(
                (c, i) => `
              <article class="info-card" data-reveal style="--d:${i * 0.08}s">
                ${c.image ? `<div class="info-card-media"><img src="${c.image}" alt="" loading="lazy" /></div>` : ""}
                <div class="info-card-body">
                  ${c.title ? `<h4>${c.title}</h4>` : ""}
                  ${c.text ? `<p>${c.text}</p>` : ""}
                  ${c.link ? `<a ${linkAttrs(c.link)}>${c.linkText || "Saber mais"} →</a>` : ""}
                </div>
              </article>`
              )
              .join("")}
          </div>
          ${button ? `<div class="cards-cta" data-reveal>${button}</div>` : ""}
        </div>`;
    }

    if (sec.type === "banner") {
      return `
        <div class="page-inner banner-inner" data-reveal>
          <div>
            ${sec.title ? `<h2>${sec.title}</h2>` : ""}
            ${sec.text ? `<p>${sec.text}</p>` : ""}
          </div>
          ${button}
        </div>`;
    }
    return "";
  }

  function arrangeSections() {
    const main = document.getElementById("page-sections");
    if (!main) return;
    const builtins = {};
    main.querySelectorAll("[data-section]").forEach((el) => (builtins[el.dataset.section] = el));
    // older configs without "sections" keep the original order
    const list = Array.isArray(cfg.sections) && cfg.sections.length
      ? cfg.sections
      : BUILTIN_SECTIONS.map((t) => ({ id: t, type: t, enabled: true }));
    const used = new Set();

    list.forEach((sec) => {
      let el;
      if (BUILTIN_SECTIONS.includes(sec.type)) {
        el = builtins[sec.type];
        if (!el || used.has(sec.type)) return;
        used.add(sec.type);
      } else {
        el = document.createElement("section");
        el.className = "page-section custom-section" + (sec.type === "banner" ? " custom-banner" : "");
        el.id = sec.id || "";
        el.innerHTML = customSectionHtml(sec);
        if (sec.type === "banner" && sec.image) el.style.backgroundImage = `url('${sec.image}')`;
      }
      el.hidden = sec.enabled === false;
      if (sec.background && sec.type !== "banner") el.dataset.bg = sec.background;
      main.appendChild(el); // appending in list order = the configured order
    });

    // built-in sections removed from the list are not shown
    Object.keys(builtins).forEach((type) => {
      if (!used.has(type)) builtins[type].hidden = true;
    });
  }

  // a section whose content hid itself (disabled, no items…) must not leave an empty band
  function hideEmptySections() {
    document.querySelectorAll("#page-sections > .page-section[data-section]").forEach((sec) => {
      const inner = sec.querySelector(".page-inner > *");
      if (inner && inner.style.display === "none") sec.hidden = true;
    });
  }

  // --- Blog: latest articles ---
  // Posts are sorted by date, so a new article automatically becomes the
  // first highlight. "featured" pins a post to the top when mode = "featured".
  // source: "config" (blogPosts), "json" (a URL returning the same fields)
  // or "wordpress" (a WordPress site; its /wp-json/wp/v2/posts API).
  const stripHtml = (html) => {
    const d = document.createElement("div");
    d.innerHTML = html || "";
    return (d.textContent || "").trim();
  };

  function formatDate(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return iso || "";
    return d.toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" });
  }

  function readingTime(text) {
    const words = String(text || "").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  }

  function fromWordPress(list) {
    return list.map((p) => {
      const media = p._embedded && p._embedded["wp:featuredmedia"] && p._embedded["wp:featuredmedia"][0];
      const terms = (p._embedded && p._embedded["wp:term"] && p._embedded["wp:term"][0]) || [];
      return {
        title: stripHtml(p.title && p.title.rendered),
        date: (p.date || "").slice(0, 10),
        category: terms[0] ? terms[0].name : "",
        author: "",
        excerpt: stripHtml(p.excerpt && p.excerpt.rendered),
        content: stripHtml(p.content && p.content.rendered),
        image: media ? media.source_url : "",
        url: p.link || "",
        featured: !!p.sticky
      };
    });
  }

  function loadBlogPosts(b) {
    const local = (cfg.blogPosts || []).map((p, i) => ({ ...p, _i: i }));
    if (!b.feedUrl || b.source === "config" || !b.source) return Promise.resolve(local);
    let url = b.feedUrl;
    if (b.source === "wordpress" && !/wp-json/.test(url)) {
      url = url.replace(/\/$/, "") + "/wp-json/wp/v2/posts?_embed&per_page=20";
    }
    return fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        const list = b.source === "wordpress" ? fromWordPress(data) : Array.isArray(data) ? data : data.posts || [];
        return list.length ? list : local;
      })
      .catch((err) => {
        console.warn("Blog: não foi possível ler o feed, a usar os artigos do config.", err);
        return local;
      });
  }

  function pickHighlights(posts, b) {
    const sorted = posts
      .filter((p) => p && p.title)
      .slice()
      .sort((x, y) => String(y.date || "").localeCompare(String(x.date || "")));
    if (b.mode === "featured") {
      sorted.sort((x, y) => (y.featured ? 1 : 0) - (x.featured ? 1 : 0)); // stable: dates kept inside each group
    }
    return sorted.slice(0, Math.max(1, Number(b.count) || 3));
  }

  function isNew(p, days) {
    if (!days || !p.date) return false;
    const age = (Date.now() - new Date(p.date).getTime()) / 86400000;
    return age >= 0 && age <= days;
  }

  function postCard(p, b, lead, i) {
    const meta = [
      b.showCategory !== false && p.category ? `<span class="post-cat">${p.category}</span>` : "",
      b.showDate !== false && p.date ? `<time datetime="${p.date}">${formatDate(p.date)}</time>` : "",
      b.showReadingTime !== false && (p.content || p.excerpt)
        ? `<span>${readingTime(p.content || p.excerpt)} min de leitura</span>`
        : ""
    ]
      .filter(Boolean)
      .join('<span class="post-dot" aria-hidden="true"></span>');
    // external articles open their own page; local ones open the reading sheet
    const target = p.url ? linkAttrs(p.url) : `href="#blog" data-post-index="${p._i}"`;
    return `
      <article class="post${lead ? " post--lead" : ""}" data-reveal style="--d:${i * 0.1}s">
        <a class="post-media" ${target} tabindex="-1" aria-hidden="true">
          ${p.image ? `<img src="${p.image}" alt="" loading="lazy" />` : ""}
          ${isNew(p, Number(b.newDays)) ? `<span class="post-badge">Novo</span>` : ""}
          ${p.featured && b.mode === "featured" ? `<span class="post-badge post-badge--pin">Destaque</span>` : ""}
        </a>
        <div class="post-body">
          ${meta ? `<p class="post-meta">${meta}</p>` : ""}
          <h4 class="post-title"><a ${target}>${p.title}</a></h4>
          ${p.excerpt && (lead || b.layout === "grid") ? `<p class="post-excerpt">${p.excerpt}</p>` : ""}
          <a class="post-more" ${target}>${b.readMoreText || "Ler artigo"} <span aria-hidden="true">→</span></a>
        </div>
      </article>`;
  }

  function renderBlogSheets(posts) {
    const wrap = document.getElementById("blog-sheets");
    if (!wrap) return;
    wrap.innerHTML = posts
      .filter((p) => !p.url && p._i != null)
      .map(
        (p) => `
      <div class="hax-project post-sheet" data-post-sheet="${p._i}" role="dialog" aria-modal="true" aria-label="${p.title}">
        <div class="hax-project__inner">
          <button class="hax-project__close" type="button">
            <span>${txt("close", "Fechar")}</span>${ICONS.closeCircle}
          </button>
          <div class="hax-project__head">
            <p class="hax-project__label" style="--d:.45s">${[p.category, formatDate(p.date)].filter(Boolean).join(" · ")}</p>
            <h2 class="hax-project__title" style="--d:.52s">${p.title}</h2>
            ${p.excerpt ? `<p class="hax-project__intro" style="--d:.59s">${p.excerpt}</p>` : ""}
          </div>
          ${p.image ? `<div class="hax-project__image" style="--d:.66s"><img src="${p.image}" alt="" loading="lazy" /></div>` : ""}
          <div class="hax-project__cols" style="--d:.2s">
            <div class="hax-project__col-text"><div class="hax-project__desc">${paragraphsOf(p.content || p.excerpt)}</div></div>
            <div class="hax-project__col-info"><ul class="hax-project__info">
              ${p.author ? `<li><span>Autor</span><strong>${p.author}</strong></li>` : ""}
              ${p.date ? `<li><span>Publicado</span><strong>${formatDate(p.date)}</strong></li>` : ""}
              ${p.category ? `<li><span>Categoria</span><strong>${p.category}</strong></li>` : ""}
              <li><span>Leitura</span><strong>${readingTime(p.content || p.excerpt)} min</strong></li>
            </ul></div>
          </div>
        </div>
      </div>`
      )
      .join("");
  }

  function openPost(i) {
    openSheet(document.querySelector(`#blog-sheets [data-post-sheet="${i}"]`));
  }

  function renderBlog() {
    const wrap = document.getElementById("blog");
    const b = cfg.blogSection;
    if (!wrap) return;
    if (!b || b.enabled === false) {
      wrap.style.display = "none";
      return;
    }

    const draw = (posts) => {
      // feed articles get their own ids for the reading sheet
      posts = posts.map((p, i) => (p._i != null ? p : { ...p, _i: "f" + i }));
      const list = pickHighlights(posts, b);
      if (!list.length) {
        wrap.style.display = "none";
        return;
      }
      wrap.style.display = "";
      const layout = b.layout === "grid" ? "grid" : "highlight";
      wrap.innerHTML = `
        <div class="blog-head" data-reveal>
          <div>
            <p class="section-eyebrow">${b.eyebrow || ""}</p>
            <h3 class="section-title">${b.title || ""}</h3>
            ${b.intro ? `<p class="section-intro">${b.intro}</p>` : ""}
          </div>
          ${
            b.allPostsText && b.allPostsUrl
              ? `<a class="blog-all" ${linkAttrs(b.allPostsUrl)}>${b.allPostsText} <span aria-hidden="true">→</span></a>`
              : ""
          }
        </div>
        <div class="blog-grid blog-grid--${layout}${list.length === 1 ? " blog-grid--single" : ""}" style="--side:${Math.max(1, list.length - 1)}">
          ${list.map((p, i) => postCard(p, b, layout === "highlight" && i === 0, i)).join("")}
        </div>
      `;
      renderBlogSheets(posts);
      // cards added after the first reveal pass still need to animate in
      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver(
          (entries) =>
            entries.forEach((en) => {
              if (!en.isIntersecting) return;
              en.target.classList.add("is-visible");
              io.unobserve(en.target);
            }),
          { threshold: 0.12 }
        );
        wrap.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
      } else {
        wrap.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-visible"));
      }
    };

    // the config posts show at once; a feed (if any) replaces them when it arrives
    draw((cfg.blogPosts || []).map((p, i) => ({ ...p, _i: i })));
    if (b.source && b.source !== "config" && b.feedUrl) loadBlogPosts(b).then(draw);

    wrap.addEventListener("click", (e) => {
      const link = e.target.closest("[data-post-index]");
      if (!link) return;
      e.preventDefault();
      openPost(link.dataset.postIndex);
    });
    const sheets = document.getElementById("blog-sheets");
    if (sheets && !sheets.dataset.aceBound) {
      sheets.dataset.aceBound = "1";
      sheets.addEventListener("click", (e) => {
        if (e.target.closest(".hax-project__close")) closeProject();
      });
    }
  }

  // --- Call-to-action buttons after the testimonials ---
  const ACTION_ICONS = {
    calendar: '<path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M8 13h2M14 13h2M8 17h2"/>',
    graduation: '<path d="M2 9l10-5 10 5-10 5L2 9z"/><path d="M6 11.2V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.8M22 9v6"/>',
    tools: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L3 17.7 6.3 21l6.3-6.3a4 4 0 0 0 5.1-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6z"/>',
    briefcase: '<path d="M4 7h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zM9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3c2.1.7 3.5 2.8 3.5 5.7"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z"/><path d="M4 19a2 2 0 0 1 2-2h13"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    mail: '<path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="M3 7l9 6 9-6"/>',
    whatsapp: '<path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.3l-4.5 1.2z"/><path d="M9 9.5c.3 2.4 2.1 4.2 4.5 4.6l1.1-1.1 1.9.8v1.4c-3.9.3-7.5-3.3-7.2-7.2h1.4l.8 1.9L9 9.5z"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6l8-3z"/><path d="M8.5 12l2.5 2.5 4.5-4.5"/>'
  };

  function renderActions() {
    const wrap = document.getElementById("actions");
    const a = cfg.actionsSection;
    if (!wrap) return;
    const items = (a && a.items) || [];
    if (!a || a.enabled === false || !items.length) {
      wrap.style.display = "none";
      return;
    }
    wrap.innerHTML = `
      ${a.title ? `<h3 class="actions-title" data-reveal>${a.title}</h3>` : ""}
      <div class="actions-row">
        ${items
          .map(
            (it, i) => `
          <a class="action-btn action-btn--${it.style === "outline" ? "outline" : "solid"}${it.image ? " action-btn--has-image" : ""}" data-reveal style="--d:${i * 0.1}s" ${linkAttrs(it.href || "#")}>
            ${it.image ? `<span class="action-media"><img src="${it.image}" alt="" loading="lazy" /></span>` : ""}
            <span class="action-body">
              <span class="action-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">${ACTION_ICONS[it.icon] || ACTION_ICONS.calendar}</svg>
              </span>
              <span class="action-copy">
                <strong>${it.label || ""}</strong>
                ${it.text ? `<span>${it.text}</span>` : ""}
              </span>
              <svg class="action-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </span>
          </a>`
          )
          .join("")}
      </div>
    `;

    // in-page links (#contact) also close an expanded hero slide
    wrap.addEventListener("click", (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (link) collapse(document.getElementById("hero"));
    });
  }

  // --- "Siga-nos": social network buttons ---
  // an item without url borrows the header icon of the same type; no url at all = hidden
  function renderFollow() {
    const wrap = document.getElementById("follow");
    const f = cfg.followSection;
    if (!wrap) return;
    const header = Array.isArray(cfg.social) ? cfg.social : [];
    const items = ((f && f.items) || [])
      .map((it) => {
        const fallback = header.find((s) => s.type === it.type && s.url);
        return { ...it, url: it.url || (fallback && fallback.url) || "" };
      })
      .filter((it) => it.url && SOCIAL[it.type]);
    if (!f || f.enabled === false || !items.length) {
      wrap.style.display = "none";
      return;
    }
    wrap.innerHTML = `
      <div class="follow-head" data-reveal>
        ${f.title ? `<h3 class="follow-title">${f.title}</h3>` : ""}
        ${f.text ? `<p class="follow-text">${f.text}</p>` : ""}
      </div>
      <div class="follow-row">
        ${items
          .map((it, i) => {
            const ext = isExternal(it.url) ? ' target="_blank" rel="noopener"' : "";
            const label = it.label || SOCIAL[it.type].label;
            return `<a class="follow-btn follow-btn--${it.type}" href="${it.url}"${ext} data-reveal style="--d:${i * 0.06}s" aria-label="${label}">
              ${SOCIAL[it.type].icon}<span>${label}</span>
            </a>`;
          })
          .join("")}
      </div>
    `;
  }

  // Testimonials carousel: endless loop (arrows, dots, swipe, keyboard, autoplay).
  // Copies of the first / last cards sit at both ends of the track; when the
  // track lands on a copy it jumps, without animation, to the real card, so the
  // carousel always keeps moving in the same direction.
  function initCarousel(root, opts) {
    const viewport = root.querySelector(".t-viewport");
    const track = root.querySelector(".t-track");
    const dotsEl = root.querySelector(".t-dots");
    const originals = [...track.children];
    const n = originals.length;
    let all = originals; // originals + clones, in track order
    let pv = 1; // cards per view
    let pos = 0; // index in `all` of the first visible card
    let looping = false;
    let timer = null;

    const perView = () =>
      parseInt(getComputedStyle(root).getPropertyValue("--per-view"), 10) || 1;
    const realIndex = () => (((pos - pv) % n) + n) % n;

    function place(animate) {
      if (!animate) track.classList.add("t-jumping");
      track.style.transform = `translateX(${-all[pos].offsetLeft}px)`;
      all.forEach((s, i) => s.classList.toggle("is-active", i >= pos && i < pos + pv));
      [...dotsEl.children].forEach((d, i) => d.setAttribute("aria-current", i === realIndex()));
      if (!animate) {
        void track.offsetWidth; // apply the jump before transitions come back
        track.classList.remove("t-jumping");
      }
    }

    // after landing on a copy, jump to the matching real card
    function normalize() {
      if (!looping) return;
      if (pos >= pv + n) {
        pos -= n;
        place(false);
      } else if (pos < pv) {
        pos += n;
        place(false);
      }
    }

    function setup() {
      const keep = looping ? realIndex() : 0;
      track.querySelectorAll(".t-clone").forEach((c) => c.remove());
      pv = perView();
      looping = n > pv;
      root.classList.toggle("t-static", !looping);

      if (looping) {
        const clone = (el) => {
          const c = el.cloneNode(true);
          c.classList.add("t-clone");
          c.setAttribute("aria-hidden", "true");
          return c;
        };
        originals.slice(-pv).forEach((el) => track.insertBefore(clone(el), originals[0]));
        originals.slice(0, pv).forEach((el) => track.appendChild(clone(el)));
      }
      all = [...track.children];
      pos = looping ? pv + keep : 0;

      dotsEl.innerHTML = looping
        ? originals
            .map((_, i) => `<button type="button" aria-label="Slide ${i + 1}" data-i="${i}"></button>`)
            .join("")
        : "";
      dotsEl.style.display = looping ? "" : "none";
      place(false);
    }

    function go(step, user) {
      if (!looping) return;
      normalize(); // fast clicks: never run past the copies
      pos += step;
      place(true);
      if (user) restart();
    }

    function goTo(i) {
      if (!looping) return;
      normalize();
      pos = pv + i;
      place(true);
      restart();
    }

    track.addEventListener("transitionend", (e) => {
      if (e.target === track && e.propertyName === "transform") normalize();
    });

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function restart() {
      clearInterval(timer);
      if (opts.autoplay === false || reduced || !looping) return;
      timer = setInterval(() => go(1), (opts.interval || 6) * 1000);
    }

    root.querySelectorAll(".t-arrow").forEach((btn) => {
      btn.setAttribute("aria-label", btn.dataset.dir === "1" ? txt("next", "Seguinte") : txt("prev", "Anterior"));
      btn.addEventListener("click", () => go(Number(btn.dataset.dir), true));
    });
    dotsEl.addEventListener("click", (e) => {
      const d = e.target.closest("[data-i]");
      if (d) goTo(+d.dataset.i);
    });
    viewport.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") go(1, true);
      if (e.key === "ArrowLeft") go(-1, true);
    });

    // pause while the visitor is reading
    root.addEventListener("mouseenter", () => clearInterval(timer));
    root.addEventListener("mouseleave", restart);
    root.addEventListener("focusin", () => clearInterval(timer));
    root.addEventListener("focusout", restart);

    // swipe
    let startX = null;
    viewport.addEventListener("pointerdown", (e) => {
      startX = e.clientX;
    });
    viewport.addEventListener("pointerup", (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1, true);
    });

    window.addEventListener("resize", () => {
      if (perView() !== pv) setup();
      else place(false);
    });

    setup();
    restart();
  }

  // Render footer
  function renderFooter() {
    const brand = document.getElementById("footer-brand");
    const extra = document.getElementById("footer-extra");
    const links = document.getElementById("footer-links");
    const copy = document.getElementById("footer-copy");
    const f = cfg.footer || {};

    if (brand) brand.textContent = cfg.siteName;
    if (extra) extra.textContent = f.extraText || "";
    if (links && f.links) {
      links.innerHTML = f.links
        .map((l) => `<a href="${l.href}">${l.label}</a>`)
        .join("");
    }
    if (copy) {
      copy.textContent = f.copyright || `© ${new Date().getFullYear()} ${cfg.siteName}`;
    }

    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el && text != null) el.textContent = text;
    };
    setText("footer-nav-title", f.navTitle);
    setText("footer-contact-title", f.contactTitle);
    setText("footer-bottom-text", f.bottomText);
    setText("footer-address", cfg.address || "");

    const email = document.getElementById("footer-email");
    const phone = document.getElementById("footer-phone");
    const wa = document.getElementById("footer-whatsapp");
    if (email) {
      email.href = "mailto:" + cfg.email;
      email.textContent = cfg.email;
    }
    if (phone) {
      phone.href = "tel:" + (cfg.phone || "").replace(/\s/g, "");
      phone.textContent = cfg.phone;
    }
    if (wa) {
      wa.href =
        "https://wa.me/" + cfg.whatsappNumber + "?text=" + encodeURIComponent(cfg.whatsappMessage || "");
    }
  }

  // Floating WhatsApp button
  function renderWhatsApp() {
    const el = document.getElementById("whatsapp-float");
    if (!el || !cfg.whatsappFloat || !cfg.whatsappFloat.enabled) {
      if (el) el.style.display = "none";
      return;
    }

    const num = cfg.whatsappNumber || "";
    const text = encodeURIComponent(cfg.whatsappMessage || "Olá!");
    const url = `https://wa.me/${num}?text=${text}`;

    el.href = url;
    el.target = "_blank";
    el.rel = "noopener";
    el.classList.toggle("left", cfg.whatsappFloat.position === "left");
    el.setAttribute("aria-label", cfg.whatsappFloat.tooltip || "WhatsApp");

    const tip = el.querySelector(".whatsapp-tooltip");
    if (tip) tip.textContent = cfg.whatsappFloat.tooltip || "WhatsApp";

    const onScroll = () => el.classList.toggle("is-hidden", window.scrollY < window.innerHeight * 0.5);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // Init
  // --- CMS integration -------------------------------------------------------
  // Page builders (Elementor widgets…) can print data-ace-overrides='{"testimonialsSection":{…}}'
  // on a section: those values replace the global config for that section.
  function mergeOverrides(overrides) {
    if (!overrides || typeof overrides !== "object") return;
    Object.keys(overrides).forEach((key) => {
      const value = overrides[key];
      if (Array.isArray(value)) {
        if (value.length) cfg[key] = value;
      } else if (value && typeof value === "object") {
        cfg[key] = Object.assign({}, cfg[key] || {}, value);
      } else if (value !== "" && value != null) {
        cfg[key] = value;
      }
    });
  }

  function collectOverrides(root) {
    (root || document).querySelectorAll("[data-ace-overrides]").forEach((el) => {
      try {
        mergeOverrides(JSON.parse(el.getAttribute("data-ace-overrides")));
      } catch (e) {
        console.warn("ACE: data-ace-overrides inválido", e);
      }
    });
  }

  // which renderers draw each section type
  const SECTION_RENDERERS = {
    hero: () => {
      renderHero();
      renderProjectSheets();
    },
    projects: () => {
      renderProjectSheets();
      renderProjects();
    },
    why: () => renderWhy(),
    contact: () => {
      renderForm();
      renderMap();
    },
    video: () => renderVideo(),
    blog: () => renderBlog(),
    testimonials: () => renderTestimonials(),
    actions: () => renderActions(),
    follow: () => renderFollow()
  };

  // re-draw one section (used by page-builder editors after a change)
  function renderSection(type, overrides, scope) {
    mergeOverrides(overrides);
    const roots =
      type === "hero"
        ? [document.getElementById("hero")]
        : [...document.querySelectorAll(`[data-section="${type}"]`)];
    // fresh copies drop the listeners of the previous render
    roots.filter(Boolean).forEach((el) => {
      if (scope && !scope.contains(el) && !el.contains(scope)) return;
      el.replaceWith(el.cloneNode(true));
    });
    (SECTION_RENDERERS[type] || (() => {}))();
    document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-visible"));
  }

  // pages that do not start with the hero get a solid menu and room for it
  function fitHeaderToPage() {
    const hero = document.getElementById("hero");
    const atTop = hero && hero.offsetParent !== null && hero.getBoundingClientRect().top + window.scrollY < 5;
    document.body.classList.toggle("ace-solid-header", !atTop);
  }

  window.ACE = {
    get config() {
      return cfg;
    },
    renderSection,
    mergeOverrides,
    openProject,
    openPost
  };

  function init() {
    collectOverrides();
    applySeo();
    applyTheme();
    initThemeToggle();
    arrangeSections();
    renderHero();
    renderProjectSheets();
    renderHeader();
    renderProjects();
    renderForm();
    renderMap();
    renderWhy();
    renderVideo();
    renderBlog();
    renderTestimonials();
    renderActions();
    renderFollow();
    renderFooter();
    renderWhatsApp();
    hideEmptySections();
    fitHeaderToPage();
    initReveal();
    openFromPreviewParams();
  }

  // admin.html opens the slide / project being edited: ?preview=1&panel=2
  function openFromPreviewParams() {
    if (!IS_PREVIEW) return;
    const params = new URLSearchParams(location.search);
    const hero = document.getElementById("hero");
    const panel = params.get("panel");
    const project = params.get("project");
    if (panel !== null && hero) {
      const el = hero.querySelectorAll(".hax-panel")[+panel];
      if (el) expand(hero, el);
    }
    if (project !== null) openProject(+project);
    const post = params.get("post");
    if (post !== null) openPost(+post);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
