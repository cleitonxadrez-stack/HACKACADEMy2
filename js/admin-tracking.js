/* ==========================================================================
   HACK ACADEMY — Painel Admin: Acompanhamento de Cursos, Alunos e Notas
   Lê a tabela `course_progress`, sincronizada automaticamente pela Sala de
   Aula (js/sala-de-aula.js + js/common.js) sempre que um aluno/professor
   avança nos slides ou conclui o Desafio HACK.
   ========================================================================== */

let TRACK_ALL_RECORDS = [];
let TRACK_COURSES_MAP = {};

function trackFormatDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function trackRenderRow(rec) {
  const statusLabel = rec.approved
    ? '<span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700"><i class="fa-solid fa-circle-check mr-1"></i>Aprovado</span>'
    : '<span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700"><i class="fa-solid fa-hourglass-half mr-1"></i>Em andamento</span>';

  const slidesLabel = rec.slides_done
    ? '<span class="text-emerald-600 text-xs"><i class="fa-solid fa-circle-check mr-1"></i>Concluída</span>'
    : '<span class="text-slate-400 text-xs"><i class="fa-solid fa-circle mr-1"></i>Em andamento</span>';

  const scoreLabel = rec.quiz_done
    ? `${rec.quiz_score}/${rec.quiz_total} <span class="text-slate-400">(${rec.percentage}%)</span>`
    : '<span class="text-slate-400">Ainda não fez</span>';

  const certLabel = rec.certificate_code
    ? `<span class="text-xs font-mono bg-slate-100 px-2 py-1 rounded">${rec.certificate_code}</span>`
    : '—';

  return `
    <tr class="border-b border-slate-50 hover:bg-slate-50/60">
      <td class="py-3 px-4">
        <p class="font-medium text-slate-900">${rec.user_name || '—'}</p>
        <p class="text-xs text-slate-400">${rec.user_email || '—'} · ${rec.user_role || 'Aluno'}</p>
      </td>
      <td class="py-3 px-4 text-slate-700">${rec.course_title || rec.course_id}</td>
      <td class="py-3 px-4">${slidesLabel}</td>
      <td class="py-3 px-4 font-medium">${scoreLabel}</td>
      <td class="py-3 px-4">${statusLabel}</td>
      <td class="py-3 px-4">${certLabel}</td>
    </tr>
  `;
}

function trackApplyFilters() {
  const courseFilter = document.getElementById('track-filter-course').value;
  const statusFilter = document.getElementById('track-filter-status').value;
  const search = document.getElementById('track-filter-search').value.trim().toLowerCase();

  let filtered = TRACK_ALL_RECORDS;
  if (courseFilter !== 'Todos') filtered = filtered.filter((r) => r.course_id === courseFilter);
  if (statusFilter === 'Aprovado') filtered = filtered.filter((r) => r.approved);
  if (statusFilter === 'Em andamento') filtered = filtered.filter((r) => !r.approved);
  if (search) {
    filtered = filtered.filter((r) =>
      (r.user_name || '').toLowerCase().includes(search) || (r.user_email || '').toLowerCase().includes(search)
    );
  }

  const tbody = document.getElementById('track-table-body');
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-slate-400 text-sm py-10"><i class="fa-solid fa-inbox mr-2"></i>Nenhum registro encontrado com esses filtros.</td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map(trackRenderRow).join('');
}

function trackPopulateCourseFilter() {
  const select = document.getElementById('track-filter-course');
  const uniqueCourses = {};
  TRACK_ALL_RECORDS.forEach((r) => { uniqueCourses[r.course_id] = r.course_title || r.course_id; });

  select.innerHTML = '<option value="Todos">Todos os cursos</option>' +
    Object.keys(uniqueCourses).map((id) => `<option value="${id}">${uniqueCourses[id]}</option>`).join('');
}

function trackUpdateStats() {
  const total = TRACK_ALL_RECORDS.length;
  const approved = TRACK_ALL_RECORDS.filter((r) => r.approved).length;
  const inProgress = total - approved;
  const withScore = TRACK_ALL_RECORDS.filter((r) => r.quiz_done);
  const avg = withScore.length
    ? Math.round(withScore.reduce((sum, r) => sum + (r.percentage || 0), 0) / withScore.length)
    : 0;

  document.getElementById('stat-track-total').textContent = total;
  document.getElementById('stat-track-approved').textContent = approved;
  document.getElementById('stat-track-inprogress').textContent = inProgress;
  document.getElementById('stat-track-avg').textContent = avg + '%';
}

async function loadCourseTracking() {
  try {
    const res = await fetch('tables/course_progress?limit=500&sort=-updated_at');
    const data = await res.json();
    TRACK_ALL_RECORDS = (data.data || []).sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));

    trackUpdateStats();
    trackPopulateCourseFilter();
    trackApplyFilters();
  } catch (err) {
    console.error('Erro ao carregar acompanhamento de cursos', err);
    document.getElementById('track-table-body').innerHTML = '<tr><td colspan="6" class="text-center text-red-500 text-sm py-10">Não foi possível carregar o acompanhamento agora.</td></tr>';
  }
}

function setupTrackFilters() {
  document.getElementById('track-filter-course')?.addEventListener('change', trackApplyFilters);
  document.getElementById('track-filter-status')?.addEventListener('change', trackApplyFilters);
  document.getElementById('track-filter-search')?.addEventListener('input', trackApplyFilters);
}

document.addEventListener('DOMContentLoaded', () => {
  setupTrackFilters();
  loadCourseTracking();
});
