/* ==========================================================================
   HACK ACADEMY — Solicitação de Cadastro (Aluno/Professor)
   Grava a solicitação na tabela `registration_requests` com status "Pendente"
   e a senha definida (já em hash, nunca em texto puro). Um gestor precisa
   aprovar em admin.html para o acesso ser considerado liberado — depois de
   aprovado, o login com esse e-mail + senha libera acesso total e imediato.
   ========================================================================== */

let REG_SELECTED_ROLE = 'Aluno';

function setupRegRoleTabs() {
  const tabAluno = document.getElementById('reg-tab-aluno');
  const tabProfessor = document.getElementById('reg-tab-professor');
  if (!tabAluno || !tabProfessor) return;

  tabAluno.addEventListener('click', () => {
    REG_SELECTED_ROLE = 'Aluno';
    tabAluno.classList.add('active');
    tabProfessor.classList.remove('active');
  });
  tabProfessor.addEventListener('click', () => {
    REG_SELECTED_ROLE = 'Professor';
    tabProfessor.classList.add('active');
    tabAluno.classList.remove('active');
  });
}

function setupRegistrationForm() {
  const form = document.getElementById('registration-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('registration-submit-btn');

    const password = document.getElementById('reg-password').value;
    const passwordConfirm = document.getElementById('reg-password-confirm').value;

    if (password.length < 6) {
      alert('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== passwordConfirm) {
      alert('As senhas não coincidem. Confira e tente novamente.');
      return;
    }

    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    if (!name || !email) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';

    try {
      const passwordHash = await hackHashPassword(password);
      const payload = {
        name,
        email,
        password_hash: passwordHash,
        phone: document.getElementById('reg-phone').value.trim(),
        requested_role: REG_SELECTED_ROLE,
        institution: document.getElementById('reg-institution').value.trim(),
        course_interest: document.getElementById('reg-course').value.trim(),
        message: document.getElementById('reg-message').value.trim(),
        status: 'Pendente'
      };

      const res = await fetch('tables/registration_requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Falha ao enviar solicitação');

      form.classList.add('hidden');
      document.getElementById('registration-success').classList.remove('hidden');
    } catch (err) {
      console.error('Erro ao enviar solicitação de cadastro', err);
      alert('Não foi possível enviar sua solicitação agora. Tente novamente em breve.');
      btn.disabled = false;
      btn.innerHTML = 'Enviar solicitação de cadastro';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupRegRoleTabs();
  setupRegistrationForm();
});
