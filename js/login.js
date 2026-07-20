/* ==========================================================================
   HACK ACADEMY — Login único com 3 abas (Aluno / Professor / Gestor)

   Fluxo Aluno/Professor:
   1) A pessoa se cadastra em cadastro.html -> registro "Pendente" em
      registration_requests (com e-mail + hash da senha escolhida).
   2) O gestor aprova em admin.html -> status passa a "Aprovado".
   3) A partir daí, a pessoa entra aqui com o MESMO e-mail e a MESMA senha
      usados no cadastro -> acesso total e imediato a todos os cursos.

   Fluxo Gestor:
   - O e-mail e a senha do Gestor ficam na tabela admin_users
     (access_granted = true). Não passa pelo fluxo de aprovação de cadastro.

   IMPORTANTE (transparência de segurança): isso é uma verificação em
   JavaScript no navegador, com a senha comparada por hash (nunca texto
   puro) — é uma proteção razoável para o uso normal da plataforma, mas não
   é autenticação de nível bancário/servidor. Um usuário muito técnico
   poderia manipular o próprio navegador para burlar essa checagem.
   ========================================================================== */

let LOGIN_SELECTED_ROLE = 'aluno';

const LOGIN_ROLE_HINTS = {
  aluno: 'Entre com o e-mail e a senha definidos no seu cadastro aprovado.',
  professor: 'Entre com o e-mail e a senha definidos no seu cadastro aprovado.',
  gestor: 'Acesso restrito à equipe gestora da HACK ACADEMY.'
};

function setupLoginRoleTabs() {
  const tabs = {
    aluno: document.getElementById('tab-aluno'),
    professor: document.getElementById('tab-professor'),
    gestor: document.getElementById('tab-gestor')
  };
  const hint = document.getElementById('login-role-hint');
  const cadastroHint = document.getElementById('login-cadastro-hint');
  if (!tabs.aluno || !tabs.professor || !tabs.gestor) return;

  // Permite pré-selecionar a aba via #gestor / #professor / #aluno na URL.
  const initialHash = (window.location.hash || '').replace('#', '').toLowerCase();
  if (LOGIN_ROLE_HINTS[initialHash]) {
    LOGIN_SELECTED_ROLE = initialHash;
  }

  function activate(role) {
    LOGIN_SELECTED_ROLE = role;
    Object.keys(tabs).forEach((r) => tabs[r].classList.toggle('active', r === role));
    if (hint) hint.textContent = LOGIN_ROLE_HINTS[role];
    if (cadastroHint) cadastroHint.classList.toggle('hidden', role === 'gestor');
    hideLoginError();
  }

  Object.keys(tabs).forEach((role) => {
    tabs[role].addEventListener('click', () => activate(role));
  });

  activate(LOGIN_SELECTED_ROLE);
}

function showLoginError(message) {
  const banner = document.getElementById('login-error-banner');
  const text = document.getElementById('login-error-text');
  if (!banner || !text) return;
  text.textContent = message;
  banner.classList.remove('hidden');
}

function hideLoginError() {
  document.getElementById('login-error-banner')?.classList.add('hidden');
}

/** Busca a solicitação de cadastro mais recente para o e-mail informado. */
async function findRegistrationByEmail(email) {
  const normalized = email.trim().toLowerCase();
  const res = await fetch('tables/registration_requests?limit=500');
  const data = await res.json();
  const matches = (data.data || []).filter((r) => (r.email || '').trim().toLowerCase() === normalized);
  if (matches.length === 0) return null;
  matches.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  return matches[0];
}

/** Busca um administrador/gestor pelo e-mail informado. */
async function findAdminByEmail(email) {
  const normalized = email.trim().toLowerCase();
  const res = await fetch('tables/admin_users?limit=200');
  const data = await res.json();
  const matches = (data.data || []).filter((r) => (r.email || '').trim().toLowerCase() === normalized);
  return matches[0] || null;
}

async function handleAlunoProfessorLogin(email, password) {
  const registration = await findRegistrationByEmail(email);

  if (!registration) {
    showLoginError('Não encontramos um cadastro com este e-mail. Faça sua solicitação de cadastro primeiro.');
    return;
  }
  if (registration.status === 'Pendente') {
    showLoginError('Seu cadastro ainda está pendente de aprovação pela equipe gestora. Você será avisado quando for liberado.');
    return;
  }
  if (registration.status === 'Recusado') {
    showLoginError('Seu cadastro foi recusado pela equipe gestora. Entre em contato para mais informações.');
    return;
  }

  const passwordHash = await hackHashPassword(password);
  if (!registration.password_hash || registration.password_hash !== passwordHash) {
    showLoginError('E-mail ou senha incorretos.');
    return;
  }

  const roleFromRegistration = registration.requested_role === 'Professor' ? 'professor' : 'aluno';
  if (roleFromRegistration !== LOGIN_SELECTED_ROLE) {
    showLoginError(`Este e-mail está cadastrado como ${roleFromRegistration === 'professor' ? 'Professor' : 'Aluno'}. Selecione a aba correta e tente novamente.`);
    return;
  }

  HackAuth.login(registration.name, roleFromRegistration, email);
  redirectAfterLogin(roleFromRegistration === 'professor' ? 'professor.html' : 'aluno.html');
}

async function handleGestorLogin(email, password) {
  const admin = await findAdminByEmail(email);

  if (!admin) {
    showLoginError('Não encontramos um gestor/administrador com este e-mail.');
    return;
  }
  if (!admin.access_granted) {
    showLoginError('Este acesso de gestor está desativado. Fale com o Gestor Master.');
    return;
  }

  const passwordHash = await hackHashPassword(password);
  if (!admin.password_hash || admin.password_hash !== passwordHash) {
    showLoginError('E-mail ou senha incorretos.');
    return;
  }

  HackAuth.login(admin.name, 'gestor', email);
  redirectAfterLogin('admin.html');
}

function redirectAfterLogin(defaultUrl) {
  const redirect = new URLSearchParams(window.location.search).get('redirect');
  window.location.href = redirect || defaultUrl;
}

function setupLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideLoginError();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    if (!email || !password) return;

    const btn = document.getElementById('login-submit-btn');
    const originalLabel = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verificando...';
    }

    try {
      if (LOGIN_SELECTED_ROLE === 'gestor') {
        await handleGestorLogin(email, password);
      } else {
        await handleAlunoProfessorLogin(email, password);
      }
    } catch (err) {
      console.error('Erro ao verificar login', err);
      showLoginError('Não foi possível verificar seu acesso agora. Tente novamente em breve.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalLabel || 'Entrar';
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupLoginRoleTabs();
  setupLoginForm();
});
