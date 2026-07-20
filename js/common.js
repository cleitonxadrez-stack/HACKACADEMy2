/* ==========================================================================
   HACK ACADEMY — Script comum (header, footer, menu, auth simulada)
   ========================================================================== */

/**
 * Carrega um trecho de HTML (header/footer) dentro de um elemento alvo.
 */
async function includeHTML(targetSelector, url) {
  const target = document.querySelector(targetSelector);
  if (!target) return;
  try {
    const res = await fetch(url);
    const html = await res.text();
    target.innerHTML = html;
  } catch (err) {
    console.error('Erro ao carregar ' + url, err);
  }
}

/** Marca o link de navegação ativo com base no atributo data-page do <body>. */
function setActiveNavLink() {
  const page = document.body.getAttribute('data-page');
  if (!page) return;
  document.querySelectorAll('[data-nav]').forEach((link) => {
    if (link.getAttribute('data-nav') === page) {
      link.classList.add('active');
    }
  });
}

/** Configura o menu mobile (abrir/fechar). */
function setupMobileMenu() {
  const btn = document.getElementById('mobile-menu-btn');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => {
    const isOpen = menu.style.maxHeight && menu.style.maxHeight !== '0px';
    if (isOpen) {
      menu.style.maxHeight = '0px';
      btn.setAttribute('aria-expanded', 'false');
      btn.innerHTML = '<i class="fa-solid fa-bars text-xl"></i>';
    } else {
      menu.style.maxHeight = menu.scrollHeight + 'px';
      btn.setAttribute('aria-expanded', 'true');
      btn.innerHTML = '<i class="fa-solid fa-xmark text-xl"></i>';
    }
  });
}

/**
 * Gera um hash SHA-256 (hex) de uma senha usando a Web Crypto API do
 * navegador. Isso evita guardar a senha em texto puro nas tabelas — mas,
 * como este é um site estático (sem servidor de autenticação), não deve ser
 * tratado como segurança de nível bancário: é uma proteção razoável para o
 * uso normal do site, não à prova de um usuário tecnicamente sofisticado
 * manipulando o próprio navegador.
 */
async function hackHashPassword(password) {
  const enc = new TextEncoder().encode(String(password || ''));
  const buffer = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Sessão de usuário usando localStorage — inclui o papel (aluno/professor/gestor). */
const HackAuth = {
  KEY: 'hackacademy_user',
  getUser() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY));
    } catch (e) {
      return null;
    }
  },
  login(name, role, email) {
    localStorage.setItem(this.KEY, JSON.stringify({ name, role, email: email || '' }));
  },
  logout() {
    localStorage.removeItem(this.KEY);
  }
};

/** Atualiza a área de autenticação do header conforme o estado de login. */
function refreshAuthArea() {
  const user = HackAuth.getUser();
  const desktop = document.getElementById('nav-auth-area');
  const mobile = document.getElementById('nav-auth-area-mobile');
  if (!desktop || !mobile) return;

  if (user) {
    const dashboardUrl = user.role === 'gestor' ? 'admin.html' : (user.role === 'professor' ? 'professor.html' : 'aluno.html');
    const html = `
      <a href="${dashboardUrl}" class="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-brand-yellow">
        <span class="w-9 h-9 rounded-full bg-black text-brand-yellow flex items-center justify-center font-semibold">${user.name.charAt(0).toUpperCase()}</span>
        ${user.name.split(' ')[0]}
      </a>
      <button id="logout-btn" class="text-sm font-medium text-slate-500 hover:text-red-500" title="Sair"><i class="fa-solid fa-arrow-right-from-bracket"></i></button>
    `;
    desktop.innerHTML = html;
    mobile.innerHTML = `
      <a href="${dashboardUrl}" class="block px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Minha Área (${user.name.split(' ')[0]})</a>
      <button id="logout-btn-mobile" class="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-slate-50">Sair</button>
    `;
    const doLogout = () => { HackAuth.logout(); window.location.href = 'index.html'; };
    document.getElementById('logout-btn')?.addEventListener('click', doLogout);
    document.getElementById('logout-btn-mobile')?.addEventListener('click', doLogout);
  }
}

/* ==========================================================================
   HackProgress — progresso do aluno por curso (slides, Desafio HACK, certificado)
   Armazenado em localStorage, por usuário (chave = nome do usuário logado).
   Regra de aprovação: acertar 70% ou mais do Desafio HACK (ex.: 7 de 10) libera
   o certificado automaticamente.
   ========================================================================== */
const HackProgress = {
  STORAGE_KEY: 'hackacademy_progress_v1',

  _readAll() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  },
  _writeAll(all) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(all));
  },
  _userKey() {
    const user = (typeof HackAuth !== 'undefined') ? HackAuth.getUser() : null;
    return (user && user.name) ? user.name.trim().toLowerCase() : 'visitante';
  },

  /** Retorna o progresso do curso para o usuário atual, com valores padrão. */
  get(courseId) {
    const all = this._readAll();
    const u = this._userKey();
    const defaults = {
      slidesDone: false,
      slidesProgress: 0,
      quizDone: false,
      quizScore: 0,
      quizTotal: 0,
      approved: false,
      certificateCode: null,
      approvedAt: null
    };
    return Object.assign({}, defaults, (all[u] && all[u][courseId]) || {});
  },

  /** Atualiza (merge) o progresso do curso para o usuário atual. */
  set(courseId, patch) {
    const all = this._readAll();
    const u = this._userKey();
    if (!all[u]) all[u] = {};
    all[u][courseId] = Object.assign({}, this.get(courseId), patch);
    this._writeAll(all);
    return all[u][courseId];
  },

  /** Registra o resultado do Desafio HACK e libera o certificado se aprovado (>=70%). */
  registerQuizResult(courseId, score, total) {
    const passed = total > 0 && (score / total) >= 0.7;
    const prev = this.get(courseId);
    const patch = { quizDone: true, quizScore: score, quizTotal: total };
    if (passed) {
      patch.approved = true;
      if (!prev.certificateCode) {
        patch.certificateCode = generateCertificateCode(courseId, this._userKey());
        patch.approvedAt = Date.now();
      }
    }
    return this.set(courseId, patch);
  }
};

/**
 * Sincroniza o progresso do usuário logado em um curso com a tabela
 * `course_progress` (backend), para que o Painel do Gestor possa acompanhar
 * quem está fazendo cada curso, notas do Desafio HACK e aprovações — sem
 * depender apenas do localStorage do navegador do aluno.
 */
async function syncCourseProgressToBackend(course, progress) {
  const user = (typeof HackAuth !== 'undefined') ? HackAuth.getUser() : null;
  if (!user || !course) return;

  const matchKey = (user.email || user.name || '').trim().toLowerCase();
  if (!matchKey) return;

  try {
    const res = await fetch('tables/course_progress?limit=500');
    const data = await res.json();
    const existing = (data.data || []).find((r) => {
      const rKey = (r.user_email || r.user_name || '').trim().toLowerCase();
      return r.course_id === course.id && rKey === matchKey;
    });

    const payload = {
      user_name: user.name || '',
      user_email: user.email || '',
      user_role: user.role === 'professor' ? 'Professor' : 'Aluno',
      course_id: course.id,
      course_title: course.title || '',
      slides_done: !!progress.slidesDone,
      quiz_done: !!progress.quizDone,
      quiz_score: progress.quizScore || 0,
      quiz_total: progress.quizTotal || 0,
      percentage: progress.quizTotal ? Math.round((progress.quizScore / progress.quizTotal) * 100) : 0,
      approved: !!progress.approved,
      certificate_code: progress.certificateCode || '',
      approved_at: progress.approvedAt || null
    };

    if (existing) {
      await fetch(`tables/course_progress/${existing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } else {
      await fetch('tables/course_progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
  } catch (err) {
    console.error('Erro ao sincronizar progresso do curso com o backend', err);
  }
}

/** Gera um código de certificado determinístico (mesmo aluno + curso = mesmo código). */
function generateCertificateCode(courseId, userKey) {
  const seed = `${courseId}-${userKey}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const num = (hash % 9000) + 1000;
  return `HA-2026-${String(num).padStart(4, '0')}`;
}

/** Inicializa header/footer compartilhados em todas as páginas. */
async function initLayout() {
  await Promise.all([
    includeHTML('#header-placeholder', 'includes/header.html'),
    includeHTML('#footer-placeholder', 'includes/footer.html')
  ]);
  setActiveNavLink();
  setupMobileMenu();
  refreshAuthArea();
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

document.addEventListener('DOMContentLoaded', initLayout);
