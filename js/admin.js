/**
 * Admin – edits SITE_CONFIG and writes it back to js/config.js
 * The site shows the unsaved draft at index.html?preview=1
 */
(function () {
  "use strict";

  const DRAFT_KEY = "portfolio_config_draft";

  // Optional host adapter (WordPress theme, JSON kit…), set before this script:
  // window.ACE_ADMIN = {
  //   format: "js" | "json",        file written by «Guardar» (default js/config.js)
  //   fileName: "config.js",
  //   previewUrl: "index.html",     page shown in the preview pane
  //   save(config) => Promise,      store the config somewhere else (database…)
  //   pickImage(done(url))          open a media library instead of the file picker
  // }
  const HOST = window.ACE_ADMIN || {};
  const FILE_NAME = HOST.fileName || (HOST.format === "json" ? "content.json" : "config.js");

  // ---------- Sections (sidebar) ----------
  // keys: top-level config keys shown in the section
  // preview: anchor / query used for the live preview
  const SECTIONS = [
    { id: "seccoes", title: "Secções da página", icon: "☷", keys: ["sections"], preview: "" },
    { id: "geral", title: "Geral e SEO", icon: "◎", keys: ["seo", "siteName", "siteTagline", "logoStyle", "logoImage", "logoText", "logoSub"], preview: "#hero" },
    { id: "contactos", title: "Contactos", icon: "☎", keys: ["phone", "email", "address", "whatsappNumber", "whatsappMessage", "social"], preview: "#contact" },
    { id: "menu", title: "Menu", icon: "☰", keys: ["nav"], preview: "#hero" },
    { id: "linguas", title: "Línguas", icon: "⚑", keys: ["i18n"], preview: "#hero" },
    { id: "hero", title: "Slides do hero", icon: "▥", keys: ["panels"], preview: "#hero", itemParam: "panel" },
    { id: "projetos", title: "Sobre nós (fichas)", icon: "▦", keys: ["projectsSection", "projects"], preview: "#projects", itemParam: "project" },
    { id: "porque", title: "Porquê a ACE", icon: "✓", keys: ["whySection"], preview: "#why" },
    { id: "formulario", title: "Formulário", icon: "✎", keys: ["formSection", "formFields"], preview: "#contact" },
    { id: "mapa", title: "Mapa", icon: "⌖", keys: ["map"], preview: "#contact" },
    { id: "video", title: "Vídeo institucional", icon: "▶", keys: ["videoSection"], preview: "#video" },
    { id: "blog", title: "Blog", icon: "✍", keys: ["blogSection", "blogPosts"], preview: "#blog", itemParam: "post" },
    { id: "testemunhos", title: "Testemunhos", icon: "❝", keys: ["testimonialsSection", "testimonials"], preview: "#testimonials" },
    { id: "acoes", title: "Botões de ação", icon: "➜", keys: ["actionsSection"], preview: "#actions" },
    { id: "siga", title: "Siga-nos", icon: "♥", keys: ["followSection"], preview: "#follow" },
    { id: "rodape", title: "Rodapé", icon: "▁", keys: ["footer"], preview: "#contact" },
    { id: "whatsapp", title: "WhatsApp", icon: "✆", keys: ["whatsappFloat"], preview: "#contact" },
    { id: "cores", title: "Cores e tema", icon: "◐", keys: ["theme", "colors"], preview: "#projects" },
    { id: "textos", title: "Textos da interface", icon: "Aa", keys: ["labels"], preview: "#projects" }
  ];

  // ---------- Page section types (Secções da página) ----------
  // built-in: content edited in its own admin section · custom: content lives in the section item
  const SECTION_TYPES = {
    projects: { label: "Sobre nós (fichas)", admin: "projetos", anchor: "#projects" },
    why: { label: "Porquê a ACE", admin: "porque", anchor: "#why" },
    contact: { label: "Contacto (formulário e mapa)", admin: "formulario", anchor: "#contact" },
    video: { label: "Vídeo institucional", admin: "video", anchor: "#sec-video" },
    blog: { label: "Blog", admin: "blog", anchor: "#sec-blog" },
    testimonials: { label: "Testemunhos", admin: "testemunhos", anchor: "#sec-testimonials" },
    actions: { label: "Botões de ação", admin: "acoes", anchor: "#sec-actions" },
    follow: { label: "Siga-nos", admin: "siga", anchor: "#sec-follow" },
    textImage: { label: "Texto e imagem", custom: true },
    cards: { label: "Cartões", custom: true },
    banner: { label: "Faixa de destaque", custom: true }
  };
  const isBuiltinSection = (type) => SECTION_TYPES[type] && !SECTION_TYPES[type].custom;

  const CUSTOM_SECTION_TEMPLATES = {
    textImage: {
      eyebrow: "", title: "Novo título", text: "Escreva aqui o texto da secção.",
      image: "", imagePosition: "right", buttonText: "", buttonLink: ""
    },
    cards: {
      eyebrow: "", title: "Novo título", intro: "", columns: 3,
      cards: [
        { image: "", title: "Cartão 1", text: "", link: "", linkText: "Saber mais" },
        { image: "", title: "Cartão 2", text: "", link: "", linkText: "Saber mais" },
        { image: "", title: "Cartão 3", text: "", link: "", linkText: "Saber mais" }
      ],
      buttonText: "", buttonLink: ""
    },
    banner: { title: "Precisa de ajuda com a sua empresa?", text: "Fale connosco e receba uma proposta à medida.", image: "", buttonText: "Contacte-nos", buttonLink: "#contact" }
  };

  function uniqueSectionId(base) {
    const ids = new Set((state.sections || []).map((x) => x.id));
    let n = 1;
    while (ids.has(`${base}-${n}`)) n++;
    return `${base}-${n}`;
  }

  // ---------- Field metadata ----------
  const LABELS = {
    seo: "SEO", title: "Título", description: "Descrição", siteName: "Nome do site", siteTagline: "Slogan",
    logoText: "Nome no logótipo", logoSub: "Subtítulo do logótipo", logoImage: "Foto / avatar do logótipo",
    phone: "Telefone", email: "E-mail", whatsappNumber: "Número de WhatsApp", whatsappMessage: "Mensagem pré-escrita do WhatsApp",
    youtubeUrl: "URL do YouTube", templatesUrl: "URL dos templates", social: "Ícones de contacto e redes sociais", youtube: "YouTube",
    nav: "Itens do menu", label: "Texto", href: "Link", children: "Submenu", panel: "Abre o slide", project: "Abre o projeto",
    autoProjects: "Submenu automático com os projetos",
    i18n: "Seletor de língua", enabled: "Ativo", defaultLanguage: "Língua original do texto", languages: "Línguas",
    code: "Código da língua", flag: "Bandeira",
    panels: "Slides", id: "Identificador", number: "Número", subtitle: "Subtítulo", stats: "Linhas de destaque", value: "Valor",
    showContact: "Mostrar telefone e e-mail", ctaText: "Texto do botão", ctaLink: "Link do botão", bgImage: "Imagem de fundo",
    projectsSection: "Cabeçalho da secção", eyebrow: "Sobretítulo", intro: "Introdução", projects: "Projetos",
    year: "Ano", service: "Serviço", client: "Cliente", location: "Localização", image: "Imagem principal",
    image2: "Segunda imagem", templateLink: "Link do template",
    formSection: "Cabeçalho da secção", formFields: "Campos do formulário", nameLabel: "Rótulo do nome", emailLabel: "Rótulo do e-mail",
    phoneLabel: "Rótulo do telefone", typeLabel: "Rótulo do tipo", types: "Tipos de mensagem", messageLabel: "Rótulo da mensagem",
    submitText: "Texto do botão", successMessage: "Mensagem de sucesso", errorMessage: "Mensagem de erro",
    map: "Mapa", lat: "Latitude", lng: "Longitude", zoom: "Zoom", googleMapsEmbed: "URL embed do Google Maps", address: "Morada",
    testimonialsSection: "Cabeçalho e comportamento", autoplay: "Avançar sozinho", interval: "Segundos entre slides",
    testimonials: "Testemunhos", name: "Nome", role: "Cargo", company: "Empresa", text: "Testemunho", photo: "Foto", logo: "Logótipo da empresa",
    footer: "Rodapé", copyright: "Copyright", links: "Links", extraText: "Texto descritivo", navTitle: "Título da coluna de navegação",
    contactTitle: "Título da coluna de contacto", bottomText: "Texto em baixo à direita",
    whatsappFloat: "Botão flutuante", position: "Posição", tooltip: "Texto ao passar o rato",
    colors: "Cores", background: "Fundo", surface: "Fundo das secções", textMuted: "Texto secundário", accent: "Destaque",
    border: "Linhas e bordas", primary: "Cor principal (botões, «+»)",
    videoSection: "Vídeo", url: "Link do vídeo", poster: "Imagem de capa", duration: "Duração (texto)",
    theme: "Tema claro / escuro", default: "Tema inicial", showToggle: "Mostrar botão claro/escuro",
    primaryStrong: "Verde forte (sobretítulos, hover)", brandDark: "Verde escuro da marca",
    light: "Modo claro", dark: "Modo escuro", card: "Cartões", textSoft: "Texto dos parágrafos",
    logoStyle: "Estilo do logótipo", address: "Morada", type: "Tipo", url: "Link",
    details: "Linhas de detalhe", linkText: "Texto do link nos cartões",
    whySection: "Porquê a ACE", features: "Razões", counters: "Números animados", suffix: "Sufixo (+, %, k…)",
    font: "Fonte", buttonRadius: "Cantos dos botões (px)",
    prev: "Botão «anterior» (leitores de ecrã)", next: "Botão «seguinte» (leitores de ecrã)", playVideo: "Botão «ver vídeo»",
    sections: "Secções (de cima para baixo)", background: "Fundo", imagePosition: "Posição da imagem",
    columns: "Colunas", cards: "Cartões", buttonText: "Texto do botão", buttonLink: "Link do botão", linkText: "Texto do link",
    blogSection: "Secção do blog", blogPosts: "Artigos", count: "Número de artigos em destaque",
    layout: "Disposição", mode: "Ordem dos destaques", newDays: "Dias com etiqueta «Novo»",
    showDate: "Mostrar data", showCategory: "Mostrar categoria", showReadingTime: "Mostrar tempo de leitura",
    readMoreText: "Texto do link «Ler artigo»", allPostsText: "Texto do link «Ver todos»", allPostsUrl: "Link «Ver todos»",
    source: "Origem dos artigos", feedUrl: "Endereço do blog / feed",
    date: "Data de publicação", category: "Categoria", author: "Autor", excerpt: "Resumo", content: "Texto completo",
    featured: "Fixar em destaque",
    actionsSection: "Botões de ação", followSection: "Siga-nos", items: "Botões", icon: "Ícone", style: "Estilo",
    labels: "Textos", close: "Fechar", getTemplate: "Botão do template", namePlaceholder: "Exemplo no campo nome",
    emailPlaceholder: "Exemplo no campo e-mail", phonePlaceholder: "Exemplo no campo telefone", messagePlaceholder: "Exemplo no campo mensagem"
  };

  // labels by full path ("*" = any index) win over LABELS
  const PATH_LABELS = {
    "videoSection.url": "Link do vídeo",
    "sections.*.label": "Nome (aparece só no admin)",
    "sections.*.id": "Âncora (para links do menu)",
    "sections.*.enabled": "Visível no site",
    "sections.*.text": "Texto",
    "sections.*.image": "Imagem",
    "sections.*.cards.*.text": "Texto",
    "sections.*.cards.*.image": "Imagem",
    "sections.*.cards.*.link": "Link (opcional)",
    "blogPosts.*.image": "Imagem do artigo",
    "blogPosts.*.url": "Link externo (opcional)",
    "blogPosts.*.title": "Título",
    "map.address": "Morada (texto por baixo do mapa e no marcador)",
    "map.provider": "Tipo de mapa",
    "map.directionsText": "Texto do link «Como chegar»",
    "map.directionsUrl": "Link «Como chegar»",
    "actionsSection.title": "Título por cima dos botões (opcional)",
    "actionsSection.items.*.label": "Texto do botão",
    "actionsSection.items.*.text": "Texto pequeno (opcional)",
    "actionsSection.items.*.image": "Imagem no topo do botão",
    "followSection.text": "Texto",
    "followSection.items.*.label": "Nome no botão",
    "followSection.items.*.type": "Rede",
    "whySection.image": "Imagem",
    "whySection.counters.*.value": "Número",
    "projects.*.intro": "Introdução (opcional)",
    "projects.*.number": "Sobretítulo (ex.: 01 · História)",
    "projects.*.details.*.label": "Rótulo",
    "projects.*.details.*.value": "Valor",
    "colors.light.text": "Texto (títulos)",
    "colors.dark.text": "Texto (títulos)",
    "colors.light.footer": "Fundo do rodapé",
    "colors.dark.footer": "Fundo do rodapé",
    "colors.accent": "Verde-lima de destaque",
    "colors.primary": "Cor principal (botões, «+»)",
    "seo.title": "Título do separador",
    "seo.description": "Descrição para o Google",
    "formFields.types.*.value": "Código interno",
    "testimonials.*.text": "Testemunho",
    "labels.year": "«Ano» nas fichas",
    "labels.service": "«Serviço» nas fichas",
    "labels.client": "«Cliente» nas fichas",
    "labels.location": "«Localização» nas fichas",
    "labels.close": "Botão «Fechar» da ficha"
  };

  const HINTS = {
    logoImage: "Vazio = iniciais do nome num círculo azul.",
    logoText: "Use Enter para partir o nome em duas linhas.",
    whatsappNumber: "Só dígitos, com o código do país (ex.: 244923000000).",
    "panels.*.project": "Com um projeto escolhido, o botão abre a ficha desse projeto. Sem projeto, usa o «Link do botão».",
    "panels.*.ctaLink": "#contact leva ao formulário; também aceita um URL completo.",
    "panels.*.stats": "Aparecem como «Valor — Texto» no slide aberto.",
    "nav.*.href": "#hero, #projects, #testimonials, #contact ou um URL.",
    "nav.*.children.*.href": "Usado só quando não escolhe slide nem projeto.",
    "i18n.defaultLanguage": "A língua em que o texto do site está escrito. Escolher esta língua no site mostra o texto original.",
    "i18n.languages.*.flag": "Código do país (flagcdn.com): pt, ao, br, gb, fr, es…",
    "i18n.languages.*.code": "Código do Google Translate: pt, en, fr, es, de…",
    "map.googleMapsEmbed": "Vazio = mapa OpenStreetMap com as coordenadas acima.",
    "map.lat": "Mais fácil: use o mapa interativo em baixo.",
    "map.provider": "Google Maps funciona sempre, também com o site aberto como ficheiro. OpenStreetMap mostra o marcador verde da ACE e muda para o Google se não carregar.",
    "map.directionsUrl": "Abre o Google Maps. Atualiza-se sozinho quando muda o local no mapa. Vazio esconde o link.",
    "projects.*.description": "Uma linha em branco cria um novo parágrafo na ficha do projeto.",
    "projects.*.templateLink": "Vazio ou # esconde o botão «Get this template».",
    "testimonials.*.logo": "Vazio = mostra o nome da empresa em texto.",
    "testimonials.*.title": "Frase de destaque por cima do testemunho (opcional).",
    "social.*.url": "mailto:…, tel:…, https://wa.me/…, ou o link da página. Vazio esconde o ícone.",
    logoStyle: "«Logótipo» mostra só a imagem; «Avatar» mostra um círculo com o nome ao lado.",
    "theme.font": "Qualquer fonte do Google Fonts.",
    "theme.buttonRadius": "0 = cantos retos · 8 = suaves · 999 = botões redondos.",
    "projects.*.details": "Aparecem como «Rótulo — Valor» no cartão e na ficha.",
    "projects.*.ctaLink": "Vazio esconde o botão da ficha.",
    sections: "A ordem aqui é a ordem no site. ↑ ↓ mudam a posição, ✕ remove e «Visível no site» esconde sem apagar. Os slides do topo e o rodapé ficam sempre no lugar.",
    "sections.*.id": "Use #esta-ancora num item do menu para levar a esta secção.",
    "sections.*.background": "Fundo da secção: normal, cinza claro ou verde escuro da marca.",
    "sections.*.text": "Uma linha em branco cria um novo parágrafo.",
    "sections.*.image": "Na faixa de destaque, a imagem fica por trás do texto com um véu verde.",
    "blogSection.count": "Quantos artigos aparecem na página inicial (o primeiro fica em destaque).",
    "blogSection.mode": "«Mais recentes»: o artigo novo aparece sozinho em primeiro. «Fixados primeiro»: os artigos com «Fixar em destaque» vêm antes.",
    "blogSection.layout": "«Destaque»: o primeiro artigo grande à esquerda e os outros ao lado. «Grelha»: todos do mesmo tamanho.",
    "blogSection.newDays": "Artigos publicados há menos destes dias mostram a etiqueta «Novo». 0 = nunca.",
    "blogSection.source": "«Artigos deste admin» usa a lista em baixo. Também pode ligar um blog WordPress ou um ficheiro JSON: os artigos novos aparecem sozinhos.",
    "blogSection.feedUrl": "Só para WordPress ou JSON. Ex.: https://blog.aceangola.com — se falhar, usa os artigos daqui.",
    blogPosts: "A ordem no site é pela data: o artigo mais recente aparece sempre primeiro. «Escrever novo artigo» já põe a data de hoje.",
    "blogPosts.*.url": "Vazio = o artigo abre numa janela de leitura no próprio site.",
    "blogPosts.*.content": "Texto que aparece ao abrir o artigo. Uma linha em branco cria um novo parágrafo.",
    "blogPosts.*.featured": "Com a ordem «Fixados primeiro», este artigo fica sempre nos destaques.",
    "actionsSection.items.*.href": "#contact leva ao formulário; também aceita um URL completo.",
    "actionsSection.items.*.image": "Fica colada à parte de cima do botão e aproxima-se ao passar o rato. Vazio = botão sem imagem.",
    "actionsSection.items.*.style": "«Cheio» em verde ou «Contorno» (fica verde ao passar o rato).",
    "followSection.items.*.url": "Vazio = usa o link do mesmo tipo em Contactos. Sem nenhum link, o botão fica escondido.",
    "whySection.counters": "Os números contam de 0 até ao valor quando aparecem no ecrã.",
    "testimonials.*.photo": "Imagem quadrada, de preferência 200×200 px ou maior.",
    "colors.border": "Aceita rgba(...), por exemplo rgba(255,255,255,0.12).",
    "whatsappFloat.position": "Lado do ecrã onde aparece o botão.",
    "videoSection.url": "Cole um link do YouTube ou do Vimeo, ou o caminho de um ficheiro .mp4 (ex.: assets/video.mp4).",
    "videoSection.poster": "Vazio com YouTube = usa a miniatura do próprio vídeo.",
    "videoSection.enabled": "Desligado esconde o bloco do vídeo.",
    "theme.default": "O tema que o visitante vê na primeira visita. Depois, o site lembra a escolha dele.",
    "colors.light": "Cores usadas no modo claro.",
    "colors.dark": "Cores usadas no modo escuro. O hero fica sempre escuro por estar sobre fotografias."
  };

  const TEXTAREA_KEYS = ["excerpt", "content", "description", "text", "intro", "extraText", "whatsappMessage", "successMessage", "errorMessage", "logoText", "messagePlaceholder"];
  const IMAGE_KEYS = ["logoImage", "bgImage", "image", "image2", "photo", "logo", "poster"];

  // blank item used by "Adicionar"; also fills keys missing from older configs
  const TEMPLATES = {
    "sections.*.cards": { image: "", title: "Novo cartão", text: "", link: "", linkText: "Saber mais" },
    blogPosts: {
      title: "Novo artigo", date: "", category: "", author: "", excerpt: "", content: "",
      image: "", url: "", featured: false
    },
    "actionsSection.items": { label: "Novo botão", text: "", image: "", icon: "calendar", href: "#contact", style: "solid" },
    "followSection.items": { type: "facebook", label: "", url: "" },
    social: { type: "facebook", url: "" },
    "projects.*.details": { label: "", value: "" },
    "whySection.features": { title: "Nova razão", text: "" },
    "whySection.counters": { value: 0, suffix: "", label: "" },
    nav: { label: "Novo item", href: "#", autoProjects: false, children: [] },
    "nav.*.children": { label: "Novo subitem", href: "", panel: null, project: null },
    "i18n.languages": { code: "", label: "", flag: "" },
    panels: {
      id: "", number: "", label: "Novo slide", title: "", subtitle: "", description: "", stats: [],
      showContact: false, ctaText: "Saber mais", project: null, ctaLink: "#contact", bgImage: ""
    },
    "panels.*.stats": { value: "", label: "" },
    projects: {
      number: "", title: "Nova ficha", intro: "", description: "", details: [],
      image: "", image2: "", ctaText: "", ctaLink: ""
    },
    "formFields.types": { value: "", label: "" },
    testimonials: { title: "", name: "Novo testemunho", role: "", company: "", text: "", photo: "", logo: "" },
    "footer.links": { label: "", href: "#" }
  };

  const ADD_LABELS = {
    "sections.*.cards": "Adicionar cartão",
    panels: "Adicionar slide", projects: "Adicionar ficha", social: "Adicionar ícone", blogPosts: "Escrever novo artigo",
    "actionsSection.items": "Adicionar botão", "followSection.items": "Adicionar rede",
    "projects.*.details": "Adicionar linha", "whySection.features": "Adicionar razão", "whySection.counters": "Adicionar número", testimonials: "Adicionar testemunho",
    nav: "Adicionar item ao menu", "nav.*.children": "Adicionar subitem", "i18n.languages": "Adicionar língua",
    "panels.*.stats": "Adicionar linha", "formFields.types": "Adicionar tipo", "footer.links": "Adicionar link"
  };

  // ---------- State ----------
  const fileConfig = clone(window.SITE_CONFIG || {});
  let state = clone(fileConfig);
  let savedJson = JSON.stringify(normalize(clone(fileConfig)));
  let fileHandle = null;
  let currentSection = SECTIONS[0].id;
  let previewItem = null; // { param, index }
  let previewHash = ""; // anchor of the page section being edited
  const openItems = new Set(); // paths of expanded cards

  // ---------- Helpers ----------
  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // "panels.2.stats.0.value" -> "panels.*.stats.*.value"
  function pattern(path) {
    return path.replace(/\.\d+(?=\.|$)/g, ".*");
  }

  function getAt(obj, path) {
    return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
  }

  function setAt(obj, path, value) {
    const keys = path.split(".");
    const last = keys.pop();
    const parent = keys.reduce((o, k) => o[k], obj);
    parent[last] = value;
  }

  function labelFor(path) {
    const pat = pattern(path);
    const key = path.split(".").pop();
    return PATH_LABELS[pat] || LABELS[key] || key;
  }

  function hintFor(path) {
    const pat = pattern(path);
    const key = path.split(".").pop();
    return HINTS[pat] || HINTS[key] || "";
  }

  function templateFor(path) {
    return TEMPLATES[pattern(path)];
  }

  // add keys that the editor knows about but the config is missing
  function normalize(cfg) {
    (function walk(node, path) {
      if (Array.isArray(node)) {
        const tpl = templateFor(path);
        node.forEach((item, i) => {
          if (tpl && item && typeof item === "object") {
            Object.keys(tpl).forEach((k) => {
              if (!(k in item)) item[k] = clone(tpl[k]);
            });
          }
          walk(item, `${path}.${i}`);
        });
      } else if (node && typeof node === "object") {
        Object.keys(node).forEach((k) => walk(node[k], path ? `${path}.${k}` : k));
      }
    })(cfg, "");
    return cfg;
  }

  function summaryOf(item, i) {
    if (!item || typeof item !== "object") return `Item ${i + 1}`;
    if (item.type && SECTION_TYPES[item.type]) {
      const t = SECTION_TYPES[item.type];
      // custom sections are named by their title, built-ins by their label
      const name = (t.custom ? item.title || item.label : item.label) || t.label;
      const kind = t.custom && name !== t.label ? ` · ${t.label}` : "";
      return `${name}${kind}${item.enabled === false ? " · oculta" : ""}`;
    }
    const main = item.title || item.label || item.name || item.value || item.code || (item.type && `${item.type}${item.url ? "" : " (escondido)"}`);
    const extra = item.title && item.label ? item.label : item.date || "";
    return [main || `Item ${i + 1}`, extra !== main ? extra : ""].filter(Boolean).join(" · ");
  }

  function thumbOf(item) {
    if (!item || typeof item !== "object") return "";
    const src = item.bgImage || item.image || item.photo || item.logo;
    return src ? `<img class="adm-card-thumb" src="${esc(src)}" alt="" />` : "";
  }

  // ---------- Rendering ----------
  function renderNav() {
    const nav = document.getElementById("adm-nav");
    nav.innerHTML = SECTIONS.map(
      (s) => `
      <button type="button" class="adm-nav-item${s.id === currentSection ? " is-active" : ""}" data-section="${s.id}">
        <span class="adm-nav-icon">${s.icon}</span>${s.title}
        ${countBadge(s)}
      </button>`
    ).join("");
  }

  function countBadge(s) {
    const arr = s.keys.map((k) => state[k]).find(Array.isArray);
    return arr ? `<span class="adm-nav-count">${arr.length}</span>` : "";
  }

  function renderEditor() {
    const section = SECTIONS.find((s) => s.id === currentSection);
    const editor = document.getElementById("adm-editor");
    const keys = section.keys.filter((k) => k in state);
    // loose top-level values (siteName, phone…) share one card
    let html = "";
    let loose = [];
    const flush = () => {
      if (loose.length) html += `<section class="adm-group"><div class="adm-fields">${loose.join("")}</div></section>`;
      loose = [];
    };
    keys.forEach((k) => {
      const v = state[k];
      if (v && typeof v === "object") {
        flush();
        html += renderNode(v, k, 0);
      } else {
        loose.push(renderField(v, k));
      }
    });
    flush();
    editor.innerHTML = `<h1 class="adm-h1">${section.title}</h1>${html}`;
    if (section.id === "mapa") mountMapEditor();
  }

  // ---------- Interactive map (Mapa section) ----------
  const OLC = "23456789CFGHJMPQRVWX";

  // Plus Code (full or short, e.g. "56RQ+9M Luanda") -> [lat, lng]; short codes use `ref`
  function decodePlusCode(input, ref) {
    const m = input.toUpperCase().match(/([23456789CFGHJMPQRVWX]{2,8})\+([23456789CFGHJMPQRVWX]{2,3})?/);
    if (!m) return null;
    let code = m[1] + (m[2] || "");
    if (m[1].length < 8) {
      const la = ref[0] + 90;
      const ln = ref[1] + 180;
      const prefix = OLC[Math.floor(la / 20)] + OLC[Math.floor(ln / 20)] + OLC[Math.floor(la % 20)] + OLC[Math.floor(ln % 20)] + "00";
      code = prefix.slice(0, 8 - m[1].length) + code;
    }
    const res = [20, 1, 0.05, 0.0025, 0.000125];
    let lat = -90;
    let lng = -180;
    const pairs = Math.min(5, Math.floor(code.length / 2));
    for (let i = 0; i < pairs; i++) {
      lat += OLC.indexOf(code[2 * i]) * res[i];
      lng += OLC.indexOf(code[2 * i + 1]) * res[i];
    }
    return [lat + res[pairs - 1] / 2, lng + res[pairs - 1] / 2];
  }

  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    if (loadLeaflet.p) return loadLeaflet.p;
    loadLeaflet.p = new Promise((resolve, reject) => {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(css);
      const js = document.createElement("script");
      js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      js.onload = resolve;
      js.onerror = reject;
      document.head.appendChild(js);
    });
    return loadLeaflet.p;
  }

  function mountMapEditor() {
    const editor = document.getElementById("adm-editor");
    const box = document.createElement("section");
    box.className = "adm-group";
    box.innerHTML = `
      <h2 class="adm-h2">Escolher o local no mapa</h2>
      <form class="adm-map-search" id="map-search">
        <input type="text" id="map-query" placeholder="Morada ou Plus Code (ex.: 56RQ+9M Luanda)" />
        <button class="adm-btn adm-btn--primary" type="submit">Procurar</button>
      </form>
      <p class="adm-hint" id="map-msg">Clique no mapa ou arraste o marcador. O zoom que escolher também fica guardado.</p>
      <div class="adm-map" id="adm-map"></div>
    `;
    editor.appendChild(box);

    loadLeaflet()
      .then(() => {
        const m = state.map;
        const map = window.L.map("adm-map").setView([m.lat, m.lng], m.zoom || 15);
        window.L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
          subdomains: "abcd",
          maxZoom: 20,
          attribution: "&copy; OpenStreetMap &copy; CARTO"
        }).addTo(map);
        const marker = window.L.marker([m.lat, m.lng], { draggable: true }).addTo(map);

        const setField = (key, value) => {
          const el = document.getElementById("f_map_" + key);
          if (el) el.value = value;
        };
        const moveTo = (lat, lng, recenter) => {
          lat = +lat.toFixed(6);
          lng = +lng.toFixed(6);
          state.map.lat = lat;
          state.map.lng = lng;
          setField("lat", lat);
          setField("lng", lng);
          // keep an automatic Google Maps link in step with the pin
          const url = state.map.directionsUrl || "";
          if (!url || /google\.[^/]+\/maps\/search\/\?api=1&query=/.test(url)) {
            state.map.directionsUrl = `https://www.google.com/maps/search/?api=1&query=${lat}%2C${lng}`;
            setField("directionsUrl", state.map.directionsUrl);
          }
          marker.setLatLng([lat, lng]);
          if (recenter) map.setView([lat, lng], Math.max(map.getZoom(), 16));
          changed();
        };

        map.on("click", (e) => moveTo(e.latlng.lat, e.latlng.lng, false));
        marker.on("dragend", () => {
          const p = marker.getLatLng();
          moveTo(p.lat, p.lng, false);
        });
        map.on("zoomend", () => {
          state.map.zoom = map.getZoom();
          setField("zoom", state.map.zoom);
          changed();
        });

        // typing coordinates in the fields moves the pin too
        ["lat", "lng"].forEach((k) => {
          const el = document.getElementById("f_map_" + k);
          el &&
            el.addEventListener("change", () => {
              marker.setLatLng([state.map.lat, state.map.lng]);
              map.panTo([state.map.lat, state.map.lng]);
            });
        });

        const msg = document.getElementById("map-msg");
        document.getElementById("map-search").addEventListener("submit", async (e) => {
          e.preventDefault();
          const q = document.getElementById("map-query").value.trim();
          if (!q) return;
          const plus = decodePlusCode(q, [state.map.lat, state.map.lng]);
          if (plus) {
            moveTo(plus[0], plus[1], true);
            msg.textContent = `Plus Code encontrado: ${plus[0].toFixed(6)}, ${plus[1].toFixed(6)}`;
            return;
          }
          msg.textContent = "A procurar…";
          try {
            const r = await fetch(
              "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=pt&q=" + encodeURIComponent(q)
            );
            const [hit] = await r.json();
            if (!hit) {
              msg.textContent = "Morada não encontrada. Tente outra forma, um Plus Code, ou clique no mapa.";
              return;
            }
            moveTo(+hit.lat, +hit.lon, true);
            msg.textContent = "Encontrado: " + hit.display_name;
          } catch (err) {
            msg.textContent = "Sem ligação ao serviço de pesquisa. Clique no mapa para escolher o local.";
          }
        });

        setTimeout(() => map.invalidateSize(), 50);
      })
      .catch(() => {
        document.getElementById("adm-map").innerHTML =
          '<p class="adm-empty">Não foi possível carregar o mapa (sem internet?). Pode escrever a latitude e longitude acima.</p>';
      });
  }

  function renderNode(value, path, depth) {
    if (Array.isArray(value)) return renderArray(value, path, depth);
    if (value && typeof value === "object") return renderObject(value, path, depth);
    return renderField(value, path);
  }

  function renderObject(obj, path, depth) {
    const inner = Object.keys(obj)
      .map((k) => renderNode(obj[k], `${path}.${k}`, depth + 1))
      .join("");
    if (depth === 0) {
      return `<section class="adm-group"><h2 class="adm-h2">${esc(labelFor(path))}</h2><div class="adm-fields">${inner}</div></section>`;
    }
    if (/\.\d+$/.test(path)) return `<div class="adm-fields">${inner}</div>`; // array item body
    return `<fieldset class="adm-sub"><legend>${esc(labelFor(path))}</legend><div class="adm-fields">${inner}</div></fieldset>`;
  }

  function renderArray(arr, path, depth) {
    const items = arr
      .map((item, i) => {
        const itemPath = `${path}.${i}`;
        const open = openItems.has(itemPath) ? " open" : "";
        return `
        <details class="adm-card" data-item="${itemPath}"${open}>
          <summary>
            <span class="adm-card-handle">${i + 1}</span>
            ${thumbOf(item)}
            <span class="adm-card-title">${esc(summaryOf(item, i))}</span>
            <span class="adm-card-tools">
              <button type="button" data-act="up" data-path="${itemPath}" title="Subir" ${i === 0 ? "disabled" : ""}>↑</button>
              <button type="button" data-act="down" data-path="${itemPath}" title="Descer" ${i === arr.length - 1 ? "disabled" : ""}>↓</button>
              <button type="button" data-act="dup" data-path="${itemPath}" title="Duplicar" ${item && isBuiltinSection(item.type) ? "disabled" : ""}>⧉</button>
              <button type="button" data-act="del" data-path="${itemPath}" title="Apagar" class="is-danger">✕</button>
            </span>
          </summary>
          <div class="adm-card-body">${renderNode(item, itemPath, depth + 1)}</div>
        </details>`;
      })
      .join("");

    const addLabel = ADD_LABELS[pattern(path)] || "Adicionar";
    const hint = hintFor(path);
    const body = `
      ${hint ? `<p class="adm-hint">${esc(hint)}</p>` : ""}
      <div class="adm-list">${items || `<p class="adm-empty">Ainda não há itens.</p>`}</div>
      ${path === "sections" ? addSectionControl() : `<button type="button" class="adm-add" data-act="add" data-path="${path}">+ ${esc(addLabel)}</button>`}`;

    if (depth === 0) {
      return `<section class="adm-group"><h2 class="adm-h2">${esc(labelFor(path))} <span class="adm-count">${arr.length}</span></h2>${body}</section>`;
    }
    return `<fieldset class="adm-sub"><legend>${esc(labelFor(path))}</legend>${body}</fieldset>`;
  }

  // "Adicionar secção": new custom sections, or built-ins that were removed
  function addSectionControl() {
    const present = new Set((state.sections || []).map((x) => x.type));
    const custom = Object.keys(SECTION_TYPES).filter((t) => SECTION_TYPES[t].custom);
    const missing = Object.keys(SECTION_TYPES).filter((t) => !SECTION_TYPES[t].custom && !present.has(t));
    return `
      <div class="adm-add-section">
        <select id="new-section-type" aria-label="Tipo de secção">
          <optgroup label="Nova secção">
            ${custom.map((t) => `<option value="${t}">${esc(SECTION_TYPES[t].label)}</option>`).join("")}
          </optgroup>
          ${
            missing.length
              ? `<optgroup label="Repor secção removida">${missing
                  .map((t) => `<option value="${t}">${esc(SECTION_TYPES[t].label)}</option>`)
                  .join("")}</optgroup>`
              : ""
          }
        </select>
        <button type="button" class="adm-btn adm-btn--primary" data-act="addSection" data-path="sections">+ Adicionar secção</button>
      </div>`;
  }

  function selectOptions(path) {
    const pat = pattern(path);
    const key = path.split(".").pop();
    if (pat === "map.provider") {
      return [["google", "Google Maps (recomendado)"], ["osm", "OpenStreetMap (marcador ACE)"]];
    }
    if (pat === "sections.*.background") {
      return [["default", "Normal"], ["surface", "Cinza claro"], ["brand", "Verde escuro (marca)"]];
    }
    if (pat === "sections.*.imagePosition") {
      return [["right", "Imagem à direita"], ["left", "Imagem à esquerda"]];
    }
    if (pat === "blogSection.layout") {
      return [["highlight", "Destaque + lista"], ["grid", "Grelha"]];
    }
    if (pat === "blogSection.mode") {
      return [["latest", "Mais recentes primeiro"], ["featured", "Fixados primeiro, depois os mais recentes"]];
    }
    if (pat === "blogSection.source") {
      const opts = [["config", "Artigos deste admin"], ["wordpress", "Blog WordPress"], ["json", "Ficheiro / URL JSON"]];
      // inside the WordPress theme the site's own posts can feed the section directly
      if (HOST.platform === "wordpress") opts.unshift(["wp", "Artigos deste WordPress (automático)"]);
      return opts;
    }
    if (pat === "actionsSection.items.*.icon") {
      return [["calendar", "Calendário"], ["graduation", "Formação (capelo)"], ["tools", "Ferramentas"],
        ["briefcase", "Pasta / negócio"], ["chart", "Gráfico"], ["users", "Pessoas"], ["book", "Livro"],
        ["download", "Download"], ["phone", "Telefone"], ["mail", "E-mail"], ["whatsapp", "WhatsApp"], ["shield", "Escudo / garantia"]];
    }
    if (pat === "actionsSection.items.*.style") {
      return [["solid", "Cheio (verde)"], ["outline", "Contorno"]];
    }
    if (pat === "social.*.type" || pat === "followSection.items.*.type") {
      return [["email", "E-mail"], ["phone", "Telefone"], ["whatsapp", "WhatsApp"], ["facebook", "Facebook"],
        ["linkedin", "LinkedIn"], ["instagram", "Instagram"], ["youtube", "YouTube"], ["x", "X (Twitter)"], ["tiktok", "TikTok"]];
    }
    if (pat === "logoStyle") {
      return [["logo", "Logótipo (imagem)"], ["avatar", "Avatar + nome"]];
    }
    if (pat === "theme.font") {
      const fonts = ["Poppins", "Montserrat", "Inter", "DM Sans", "Lato", "Open Sans", "Roboto", "Raleway", "Nunito", "Work Sans"];
      const cur = state.theme && state.theme.font;
      if (cur && !fonts.includes(cur)) fonts.unshift(cur);
      return fonts.map((f) => [f, f]);
    }
    if (pat === "theme.default") {
      return [["light", "Claro"], ["dark", "Escuro"], ["auto", "Automático (sistema do visitante)"]];
    }
    if (pat === "whatsappFloat.position") {
      return [["right", "Direita"], ["left", "Esquerda"]];
    }
    if (pat === "i18n.defaultLanguage") {
      return (state.i18n.languages || []).map((l) => [l.code, l.label || l.code]);
    }
    if (key === "panel" && /^nav\./.test(pat)) {
      return [["", "— nenhum —"]].concat((state.panels || []).map((p, i) => [String(i), `${p.number || i + 1} · ${p.label || p.title}`]));
    }
    if (key === "project" && /^(nav|panels)\./.test(pat)) {
      return [["", "— nenhum —"]].concat((state.projects || []).map((p, i) => [String(i), p.title || `Projeto ${i + 1}`]));
    }
    return null;
  }

  function renderField(value, path) {
    const key = path.split(".").pop();
    const label = labelFor(path);
    const hint = hintFor(path);
    const id = "f_" + path.replace(/\./g, "_");
    let control;
    let wide = false;

    const options = selectOptions(path);
    const secMatch = path.match(/^sections\.(\d+)\.(type|id)$/);
    if (secMatch) {
      const item = state.sections[+secMatch[1]];
      const t = SECTION_TYPES[item.type] || { label: item.type };
      if (secMatch[2] === "type") {
        return `
          <div class="adm-field">
            <label>Tipo</label>
            <div class="adm-section-type">
              <span>${esc(t.label)}</span>
              ${t.admin ? `<button type="button" class="adm-btn adm-btn--small" data-goto="${t.admin}">Editar conteúdo →</button>` : ""}
            </div>
            ${t.admin ? `<p class="adm-hint">O conteúdo desta secção edita-se na sua própria página do admin.</p>` : ""}
          </div>`;
      }
      if (isBuiltinSection(item.type)) {
        return `
          <div class="adm-field">
            <label>${esc(label)}</label>
            <input type="text" value="${esc(t.anchor || "#" + value)}" readonly />
          </div>`;
      }
    }
    if (options) {
      const isRef = key === "panel" || key === "project";
      const cur = value == null ? "" : String(value);
      control = `<select id="${id}" data-path="${path}" data-type="${isRef ? "ref" : "string"}">
        ${options.map(([v, t]) => `<option value="${esc(v)}"${v === cur ? " selected" : ""}>${esc(t)}</option>`).join("")}
      </select>`;
    } else if (key === "date") {
      control = `<input type="date" id="${id}" data-path="${path}" data-type="string" value="${esc(value)}" />`;
    } else if (typeof value === "boolean") {
      control = `<label class="adm-switch"><input type="checkbox" id="${id}" data-path="${path}" data-type="bool"${value ? " checked" : ""} /><span></span></label>`;
    } else if (typeof value === "number") {
      control = `<input type="number" step="any" id="${id}" data-path="${path}" data-type="number" value="${esc(value)}" />`;
    } else if (path.startsWith("colors.")) {
      const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : /^#[0-9a-f]{3}$/i.test(value) ? "#" + value.slice(1).replace(/./g, "$&$&") : null;
      control = `<div class="adm-color">
        <input type="color" data-color-for="${id}" value="${hex || "#000000"}"${hex ? "" : " disabled title=\"Valor rgba: edite no campo de texto\""} />
        <input type="text" id="${id}" data-path="${path}" data-type="string" value="${esc(value)}" />
      </div>`;
    } else if (IMAGE_KEYS.includes(key)) {
      wide = true;
      control = `<div class="adm-image">
        <div class="adm-image-preview${value ? "" : " is-empty"}" data-preview-for="${id}">${value ? `<img src="${esc(value)}" alt="" />` : "Sem imagem"}</div>
        <div class="adm-image-side">
          <input type="text" id="${id}" data-path="${path}" data-type="string" value="${esc(value)}" placeholder="https://… ou assets/imagem.jpg" />
          <div class="adm-image-btns">
            <label class="adm-btn adm-btn--small">Carregar imagem<input type="file" accept="image/*" data-upload-for="${id}" hidden /></label>
            ${value ? `<button type="button" class="adm-btn adm-btn--small adm-btn--ghost" data-clear-for="${id}">Remover</button>` : ""}
          </div>
        </div>
      </div>`;
    } else if (TEXTAREA_KEYS.includes(key) || path === "seo.description" || (typeof value === "string" && value.length > 90)) {
      wide = true;
      const rows = Math.min(10, Math.max(3, Math.ceil(String(value).length / 70)));
      control = `<textarea id="${id}" data-path="${path}" data-type="string" rows="${rows}">${esc(value)}</textarea>`;
    } else {
      control = `<input type="text" id="${id}" data-path="${path}" data-type="string" value="${esc(value)}" />`;
    }

    return `
      <div class="adm-field${wide ? " adm-field--wide" : ""}">
        <label for="${id}">${esc(label)}</label>
        ${control}
        ${hint ? `<p class="adm-hint">${esc(hint)}</p>` : ""}
      </div>`;
  }

  // ---------- Updates ----------
  function readInput(el) {
    const type = el.dataset.type;
    if (type === "bool") return el.checked;
    if (type === "number") return el.value === "" ? 0 : Number(el.value);
    if (type === "ref") return el.value === "" ? null : Number(el.value);
    return el.value;
  }

  function onChange(el) {
    const path = el.dataset.path;
    setAt(state, path, readInput(el));

    // keep the card title and thumbnail in sync
    const card = el.closest(".adm-card");
    if (card) {
      const itemPath = card.dataset.item;
      const i = +itemPath.split(".").pop();
      const item = getAt(state, itemPath);
      card.querySelector(":scope > summary .adm-card-title").textContent = summaryOf(item, i);
    }

    // image preview
    const prev = document.querySelector(`[data-preview-for="${el.id}"]`);
    if (prev) {
      prev.classList.toggle("is-empty", !el.value);
      prev.innerHTML = el.value ? `<img src="${esc(el.value)}" alt="" />` : "Sem imagem";
    }

    // follow the item being edited in the preview (slide / project)
    const section = SECTIONS.find((s) => s.id === currentSection);
    const m = path.match(/^(panels|projects|blogPosts)\.(\d+)/);
    previewItem = m && section.itemParam ? { param: section.itemParam, index: +m[2] } : previewItem;

    // dependent selects (language list, slide / project names) need a redraw
    if (/^(i18n\.languages|panels\.\d+\.(label|title|number)|projects\.\d+\.title)/.test(path)) {
      refreshSelects();
    }

    changed();
  }

  function refreshSelects() {
    document.querySelectorAll("select[data-path]").forEach((sel) => {
      const opts = selectOptions(sel.dataset.path);
      if (!opts) return;
      const cur = sel.value;
      sel.innerHTML = opts.map(([v, t]) => `<option value="${esc(v)}"${v === cur ? " selected" : ""}>${esc(t)}</option>`).join("");
    });
  }

  function structural(act, path) {
    const keys = path.split(".");
    if (act === "addSection") {
      const type = document.getElementById("new-section-type").value;
      const t = SECTION_TYPES[type];
      const item = t.custom
        ? { id: uniqueSectionId(type === "textImage" ? "texto" : type === "cards" ? "cartoes" : "faixa"), type, label: t.label,
            enabled: true, background: type === "banner" ? "brand" : "default", ...clone(CUSTOM_SECTION_TEMPLATES[type]) }
        : { id: type, type, label: t.label, enabled: true, background: "surface" };
      state.sections.push(item);
      openItems.add(`sections.${state.sections.length - 1}`);
      previewHash = t.custom ? "#" + item.id : t.anchor;
    } else if (act === "add") {
      const arr = getAt(state, path);
      const tpl = templateFor(path);
      const item = tpl ? clone(tpl) : arr.length ? blankLike(arr[arr.length - 1]) : "";
      if (path === "blogPosts") {
        item.date = new Date().toISOString().slice(0, 10);
        arr.unshift(item);
        openItems.clear();
        openItems.add("blogPosts.0");
        previewItem = { param: "post", index: 0 };
      } else {
        arr.push(item);
        openItems.add(`${path}.${arr.length - 1}`);
      }
    } else {
      const index = +keys.pop();
      const arrPath = keys.join(".");
      const arr = getAt(state, arrPath);
      if (act === "del") {
        if (!confirm(`Apagar «${summaryOf(arr[index], index)}»?`)) return;
        arr.splice(index, 1);
        fixRefs(arrPath, index, null);
      } else if (act === "dup") {
        if (arrPath === "sections" && isBuiltinSection(arr[index].type)) return;
        const copy = clone(arr[index]);
        if (arrPath === "sections") {
          copy.id = uniqueSectionId(String(copy.id).replace(/-\d+$/, ""));
          copy.label = (copy.label || "") + " (cópia)";
        }
        arr.splice(index + 1, 0, copy);
        fixRefs(arrPath, index + 1, "insert");
        openItems.add(`${arrPath}.${index + 1}`);
      } else if (act === "up" || act === "down") {
        const to = act === "up" ? index - 1 : index + 1;
        if (to < 0 || to >= arr.length) return;
        [arr[index], arr[to]] = [arr[to], arr[index]];
        fixRefs(arrPath, index, to);
      }
    }
    renderEditor();
    renderNav();
    changed();
  }

  // menu items and slide buttons point at slides / projects by index:
  // keep them pointing at the same item after a delete / move / insert
  function fixRefs(arrPath, index, to) {
    const refKey = arrPath === "panels" ? "panel" : arrPath === "projects" ? "project" : null;
    if (!refKey) return;
    const holders = [];
    (state.nav || []).forEach((n) => (n.children || []).forEach((c) => holders.push(c)));
    if (refKey === "project") (state.panels || []).forEach((p) => holders.push(p));
    holders.forEach((h) => {
      const v = h[refKey];
      if (v == null) return;
      if (to === null) h[refKey] = v === index ? null : v > index ? v - 1 : v;
      else if (to === "insert") h[refKey] = v >= index ? v + 1 : v;
      else h[refKey] = v === index ? to : v === to ? index : v;
    });
  }

  function blankLike(sample) {
    if (Array.isArray(sample)) return [];
    if (sample && typeof sample === "object") {
      const o = {};
      Object.keys(sample).forEach((k) => (o[k] = blankLike(sample[k])));
      return o;
    }
    if (typeof sample === "boolean") return false;
    if (typeof sample === "number") return 0;
    return sample === null ? null : "";
  }

  // ---------- Draft, status, preview ----------
  let previewTimer = null;

  function isDirty() {
    return JSON.stringify(state) !== savedJson;
  }

  function changed() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
    } catch (e) {
      toast("Não foi possível guardar o rascunho (imagens demasiado grandes?)", true);
    }
    setStatus();
    clearTimeout(previewTimer);
    previewTimer = setTimeout(reloadPreview, 600);
  }

  function setStatus(text) {
    const el = document.getElementById("adm-status");
    const dirty = isDirty();
    el.dataset.state = dirty ? "dirty" : "saved";
    el.textContent = text || (dirty ? "Alterações por guardar" : "Tudo guardado");
  }

  function previewUrl() {
    const section = SECTIONS.find((s) => s.id === currentSection);
    let q = (HOST.previewParam || "preview") + "=1&t=" + Date.now();
    if (previewItem && section.itemParam === previewItem.param) q += `&${previewItem.param}=${previewItem.index}`;
    const hash = section.id === "seccoes" ? previewHash : section.preview || "";
    const base = HOST.previewUrl || "index.html";
    return `${base}${base.includes("?") ? "&" : "?"}${q}${hash}`;
  }

  function reloadPreview() {
    const frame = document.getElementById("preview-frame");
    if (!document.getElementById("adm-preview").offsetParent && window.innerWidth < 1100) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
    } catch (e) {}
    frame.src = previewUrl();
  }

  // render the site at a real device width and scale it down to fit the pane
  const DEVICE_WIDTH = { desktop: 1440, tablet: 768, mobile: 375 };
  function fitFrame() {
    const wrap = document.getElementById("frame-wrap");
    const frame = document.getElementById("preview-frame");
    const device = wrap.dataset.device || "desktop";
    const pad = device === "desktop" ? 0 : 32;
    const availW = wrap.clientWidth - pad;
    const availH = wrap.clientHeight - pad;
    if (availW <= 0) return;
    const width = DEVICE_WIDTH[device];
    const scale = Math.min(1, availW / width);
    frame.style.width = width + "px";
    frame.style.height = availH / scale + "px";
    frame.style.transform = `scale(${scale})`;
    frame.style.left = (wrap.clientWidth - width * scale) / 2 + "px";
  }

  function toast(msg, isError) {
    const el = document.getElementById("adm-toast");
    el.textContent = msg;
    el.classList.toggle("is-error", !!isError);
    el.classList.add("is-visible");
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("is-visible"), 3500);
  }

  // ---------- File: open / save / download ----------
  function serialize(cfg) {
    if (HOST.format === "json") return JSON.stringify(cfg, null, 2) + "\n";
    const date = new Date().toLocaleString("pt-PT");
    return `/**
 * ============================================
 * CONFIGURAÇÃO COMPLETA DO SITE
 * Editado com admin.html em ${date}.
 * Também pode ser editado à mão.
 * ============================================
 */
const SITE_CONFIG = ${JSON.stringify(cfg, null, 2)};

// Expor globalmente
window.SITE_CONFIG = SITE_CONFIG;
`;
  }

  function parseConfigFile(text) {
    if (HOST.format === "json") return JSON.parse(text);
    // the file only declares SITE_CONFIG; run it in isolation and read the value back
    const body = text.replace(/window\.SITE_CONFIG\s*=\s*SITE_CONFIG\s*;?/, "");
    return new Function(`${body}\nreturn SITE_CONFIG;`)();
  }

  const fsSupported = "showSaveFilePicker" in window;
  const jsTypes =
    HOST.format === "json"
      ? [{ description: "JSON", accept: { "application/json": [".json"] } }]
      : [{ description: "JavaScript", accept: { "text/javascript": [".js"] } }];

  async function openFile() {
    if (!("showOpenFilePicker" in window)) {
      toast("Este browser não deixa abrir ficheiros. Use Chrome ou Edge, ou «Descarregar config.js».", true);
      return;
    }
    try {
      const [handle] = await window.showOpenFilePicker({ types: jsTypes, multiple: false });
      const text = await (await handle.getFile()).text();
      const cfg = parseConfigFile(text);
      if (!cfg || typeof cfg !== "object") throw new Error("SITE_CONFIG não encontrado");
      fileHandle = handle;
      state = normalize(cfg);
      savedJson = JSON.stringify(state);
      document.getElementById("adm-file-name").textContent = handle.name + " · ligado";
      afterLoad("Ficheiro aberto. «Guardar» passa a gravar diretamente nele.");
    } catch (e) {
      if (e.name !== "AbortError") toast("Não foi possível ler o ficheiro: " + e.message, true);
    }
  }

  async function save() {
    // the host stores the config itself (e.g. WordPress database)
    if (HOST.save) {
      try {
        setStatus("A guardar…");
        await HOST.save(JSON.parse(JSON.stringify(state)));
        savedJson = JSON.stringify(state);
        localStorage.removeItem(DRAFT_KEY);
        setStatus();
        toast(HOST.savedMessage || "Alterações publicadas.");
      } catch (e) {
        setStatus();
        toast("Não foi possível guardar: " + (e.message || e), true);
      }
      return;
    }
    const text = serialize(state);
    if (!fsSupported) {
      download(text);
      return;
    }
    try {
      if (!fileHandle) {
        fileHandle = await window.showSaveFilePicker({ suggestedName: FILE_NAME, types: jsTypes });
        document.getElementById("adm-file-name").textContent = fileHandle.name + " · ligado";
      }
      const w = await fileHandle.createWritable();
      await w.write(text);
      await w.close();
      savedJson = JSON.stringify(state);
      localStorage.removeItem(DRAFT_KEY);
      setStatus();
      toast(`${FILE_NAME} guardado. Recarregue o site para ver as alterações publicadas.`);
    } catch (e) {
      if (e.name !== "AbortError") toast("Não foi possível guardar: " + e.message, true);
    }
  }

  function download(text) {
    const blob = new Blob([text], { type: HOST.format === "json" ? "application/json" : "text/javascript" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = FILE_NAME;
    a.click();
    URL.revokeObjectURL(a.href);
    toast(`${FILE_NAME} descarregado. Substitua o ficheiro do site por este.`);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "site-config-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importJson(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        state = normalize(JSON.parse(r.result));
        afterLoad("Cópia importada. Guarde para aplicar ao site.");
        changed();
      } catch (e) {
        toast("Ficheiro JSON inválido.", true);
      }
    };
    r.readAsText(file);
  }

  function afterLoad(msg) {
    openItems.clear();
    renderNav();
    renderEditor();
    setStatus();
    reloadPreview();
    if (msg) toast(msg);
  }

  // ---------- Images: resize and embed ----------
  function uploadImage(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const target = document.getElementById(input.dataset.uploadFor);
    const key = target.dataset.path.split(".").pop();
    const small = ["photo", "logo", "logoImage"].includes(key);
    const keepAlpha = key === "logo" || file.type === "image/png" || file.type === "image/svg+xml";

    if (file.type === "image/svg+xml") {
      const r = new FileReader();
      r.onload = () => applyImage(target, r.result);
      r.readAsDataURL(file);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const max = small ? 400 : 1800;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const data = keepAlpha ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.82);
      URL.revokeObjectURL(img.src);
      applyImage(target, data);
      if (data.length > 600000) toast("Imagem grande: considere usar um link ou a pasta assets/ para o site carregar mais rápido.");
    };
    img.src = URL.createObjectURL(file);
  }

  function applyImage(target, data) {
    target.value = data;
    onChange(target);
    renderEditor(); // shows the "Remover" button
  }

  // ---------- Events ----------
  function bind() {
    document.getElementById("adm-nav").addEventListener("click", (e) => {
      const b = e.target.closest("[data-section]");
      if (!b) return;
      currentSection = b.dataset.section;
      previewItem = null;
      renderNav();
      renderEditor();
      document.getElementById("adm-editor").scrollTop = 0;
      reloadPreview();
    });

    const editor = document.getElementById("adm-editor");
    editor.addEventListener("input", (e) => {
      const el = e.target;
      if (el.dataset.colorFor) {
        const text = document.getElementById(el.dataset.colorFor);
        text.value = el.value;
        onChange(text);
        return;
      }
      if (el.dataset.path && el.type !== "checkbox" && el.tagName !== "SELECT") onChange(el);
    });
    editor.addEventListener("change", (e) => {
      const el = e.target;
      if (el.dataset.uploadFor) return uploadImage(el);
      if (el.dataset.path && (el.type === "checkbox" || el.tagName === "SELECT")) onChange(el);
    });
    editor.addEventListener("click", (e) => {
      const upload = e.target.closest(".adm-image-btns label");
      if (upload && HOST.pickImage) {
        e.preventDefault();
        const target = document.getElementById(upload.querySelector("input").dataset.uploadFor);
        HOST.pickImage((url) => url && applyImage(target, url));
        return;
      }
      const go = e.target.closest("[data-goto]");
      if (go) {
        e.preventDefault();
        currentSection = go.dataset.goto;
        previewItem = null;
        renderNav();
        renderEditor();
        document.getElementById("adm-editor").scrollTop = 0;
        reloadPreview();
        return;
      }
      const btn = e.target.closest("[data-act]");
      if (btn) {
        e.preventDefault();
        structural(btn.dataset.act, btn.dataset.path);
        return;
      }
      const clear = e.target.closest("[data-clear-for]");
      if (clear) {
        const t = document.getElementById(clear.dataset.clearFor);
        applyImage(t, "");
      }
    });
    // remember which cards are open across re-renders, and preview that item
    editor.addEventListener(
      "toggle",
      (e) => {
        const card = e.target.closest && e.target.closest(".adm-card");
        if (!card || e.target !== card) return;
        const path = card.dataset.item;
        if (card.open) openItems.add(path);
        else openItems.delete(path);
        const section = SECTIONS.find((s) => s.id === currentSection);
        const sm = path.match(/^sections\.(\d+)$/);
        if (card.open && sm) {
          const item = state.sections[+sm[1]];
          const t = SECTION_TYPES[item.type] || {};
          previewHash = t.custom ? "#" + item.id : t.anchor || "";
          reloadPreview();
        }
        const m = path.match(/^(panels|projects|blogPosts)\.(\d+)$/);
        if (card.open && m && section.itemParam) {
          previewItem = { param: section.itemParam, index: +m[2] };
          reloadPreview();
        }
      },
      true
    );

    document.getElementById("btn-save").addEventListener("click", save);
    document.getElementById("btn-open").addEventListener("click", openFile);
    document.getElementById("btn-download").addEventListener("click", () => download(serialize(state)));
    document.getElementById("btn-export").addEventListener("click", exportJson);
    document.getElementById("btn-import").addEventListener("click", () => document.getElementById("import-file").click());
    document.getElementById("import-file").addEventListener("change", (e) => {
      if (e.target.files[0]) importJson(e.target.files[0]);
      e.target.value = "";
    });
    document.getElementById("btn-reset").addEventListener("click", () => {
      if (!confirm("Descartar todas as alterações por guardar?")) return;
      state = normalize(JSON.parse(savedJson));
      localStorage.removeItem(DRAFT_KEY);
      afterLoad("Alterações descartadas.");
    });

    const more = document.getElementById("btn-more");
    more.addEventListener("click", () => more.parentElement.classList.toggle("is-open"));
    document.addEventListener("click", (e) => {
      if (!more.parentElement.contains(e.target)) more.parentElement.classList.remove("is-open");
      else if (e.target.closest(".adm-menu-list button")) more.parentElement.classList.remove("is-open");
    });

    document.getElementById("btn-reload").addEventListener("click", reloadPreview);
    document.querySelectorAll("[data-device]").forEach((b) =>
      b.addEventListener("click", () => {
        document.querySelectorAll("[data-device]").forEach((x) => x.classList.toggle("is-active", x === b));
        document.getElementById("frame-wrap").dataset.device = b.dataset.device;
        fitFrame();
      })
    );
    document.getElementById("btn-preview").addEventListener("click", () => {
      document.body.classList.toggle("show-preview");
      fitFrame();
      reloadPreview();
    });

    window.addEventListener("resize", fitFrame);

    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    });

    window.addEventListener("beforeunload", (e) => {
      if (isDirty()) {
        e.preventDefault();
        e.returnValue = "";
      }
    });
  }

  // ---------- Init ----------
  function init() {
    if (!window.SITE_CONFIG) {
      document.getElementById("adm-editor").innerHTML =
        '<p class="adm-empty">Não foi possível carregar js/config.js.</p>';
      return;
    }
    state = normalize(state);

    // a draft from an earlier visit that was never saved
    let draft = null;
    try {
      draft = localStorage.getItem(DRAFT_KEY);
    } catch (e) {}
    if (draft && draft !== savedJson) {
      const banner = document.getElementById("adm-banner");
      banner.hidden = false;
      document.getElementById("btn-restore").onclick = () => {
        state = normalize(JSON.parse(draft));
        banner.hidden = true;
        afterLoad("Rascunho recuperado.");
      };
      document.getElementById("btn-discard").onclick = () => {
        localStorage.removeItem(DRAFT_KEY);
        banner.hidden = true;
        reloadPreview();
      };
    } else {
      localStorage.removeItem(DRAFT_KEY);
    }

    if (!fsSupported) {
      document.getElementById("btn-open").hidden = true;
      document.getElementById("btn-save").textContent = `Descarregar ${FILE_NAME}`;
    }

    // texts of the top bar follow the host
    document.getElementById("adm-file-name").textContent = HOST.label || (HOST.format === "json" ? "content/content.json" : "js/config.js");
    document.getElementById("btn-download").textContent = `Descarregar ${FILE_NAME}`;
    const siteLink = document.querySelector('.adm-preview-bar a[href="index.html"]');
    if (siteLink && HOST.previewUrl) siteLink.href = HOST.previewUrl;
    if (HOST.save) {
      document.getElementById("btn-open").hidden = true;
      document.getElementById("btn-save").textContent = HOST.saveLabel || "Publicar alterações";
    } else if (fsSupported) {
      document.getElementById("btn-open").textContent = `Abrir ${FILE_NAME}`;
      document.getElementById("btn-save").textContent = `Guardar ${FILE_NAME}`;
    }
    bind();
    renderNav();
    renderEditor();
    setStatus();
    fitFrame();
    reloadPreview();
  }

  init();
})();
