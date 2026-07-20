/* ==========================================================================
   HACK ACADEMY — Escolas/Pessoas Pré-Autorizadas (base para licenciamento)
   Gerencia a tabela `authorized_organizations`. Hoje é apenas um registro
   organizacional para o gestor mapear escolas/pessoas com licença — não trava
   automaticamente o cadastro/login (isso pode ser implementado depois, se o
   modelo de licenciamento avançar).
   ========================================================================== */

function orgStatusBadge(status) {
  const map = {
    'Ativo': 'bg-emerald-100 text-emerald-700',
    'Suspenso': 'bg-amber-100 text-amber-700',
    'Expirado': 'bg-red-100 text-red-600'
  };
  return `<span class="text-xs font-semibold px-2.5 py-1 rounded-full ${map[status] || 'bg-slate-100 text-slate-600'}">${status}</span>`;
}

function renderOrgCard(org) {
  const icon = org.type === 'Pessoa Individual' ? 'fa-user-check' : 'fa-school';
  return `
    <div class="bg-white rounded-2xl shadow-sm p-4 flex items-start justify-between gap-3" id="org-${org.id}">
      <div class="flex items-start gap-3">
        <span class="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><i class="fa-solid ${icon}"></i></span>
        <div>
          <p class="font-semibold text-slate-900 text-sm">${org.name}</p>
          <p class="text-xs text-slate-400">${org.type} · <span class="font-mono">${org.email_domain_or_email}</span></p>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        ${orgStatusBadge(org.license_status)}
        <button data-id="${org.id}" class="org-remove-btn text-slate-400 hover:text-red-500 text-xs"><i class="fa-solid fa-trash-can"></i></button>
      </div>
    </div>
  `;
}

async function loadOrgs() {
  try {
    const res = await fetch('tables/authorized_organizations?limit=200&sort=-created_at');
    const data = await res.json();
    const orgs = data.data || [];
    const list = document.getElementById('orgs-list');
    if (orgs.length === 0) {
      list.innerHTML = '<p class="text-slate-400 text-sm text-center py-6">Nenhuma escola ou pessoa pré-autorizada cadastrada ainda.</p>';
      return;
    }
    list.innerHTML = orgs.map(renderOrgCard).join('');
    document.querySelectorAll('.org-remove-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Remover esta autorização?')) return;
        await fetch(`tables/authorized_organizations/${btn.getAttribute('data-id')}`, { method: 'DELETE' });
        await loadOrgs();
      });
    });
  } catch (err) {
    console.error('Erro ao carregar escolas/organizações autorizadas', err);
  }
}

function setupAddOrgForm() {
  const form = document.getElementById('add-org-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const reviewer = (typeof HackAuth !== 'undefined') ? HackAuth.getUser() : null;
    const addedBy = (reviewer && reviewer.email) || (reviewer && reviewer.name) || 'gestor';

    const payload = {
      name: document.getElementById('org-name').value.trim(),
      type: document.getElementById('org-type').value,
      email_domain_or_email: document.getElementById('org-email').value.trim().toLowerCase(),
      license_status: document.getElementById('org-status').value,
      max_users: 0,
      notes: '',
      added_by: addedBy
    };
    if (!payload.name || !payload.email_domain_or_email) return;

    try {
      await fetch('tables/authorized_organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      form.reset();
      await loadOrgs();
    } catch (err) {
      console.error('Erro ao adicionar escola/organização autorizada', err);
      alert('Não foi possível adicionar agora.');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupAddOrgForm();
  loadOrgs();
});
