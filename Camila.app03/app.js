// ════════════════════════════
//  Estado & Constantes
// ════════════════════════════
const STORE_PAC = 'fritsch_pac';
const STORE_AG  = 'fritsch_ag';
const LIMITE    = { total: 3, recorrente: 2, novo: 1 };
const DIAS      = ['seg', 'ter', 'qua', 'qui', 'sex'];
const NOMES_DIA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
const MESES     = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                   'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

let pacientes = load(STORE_PAC) || [];
let agenda    = load(STORE_AG)  || [];

// Semana selecionada: weekKey = ISO da segunda-feira ex: "2026-04-28"
let selectedWeekKey = toWeekKey(new Date());

// Mês exibido no seletor
const today = new Date();
let calYear  = today.getFullYear();
let calMonth = today.getMonth(); // 0-indexed

// ════════════════════════════
//  Utilitários de Data
// ════════════════════════════
function load(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

function persist() {
  localStorage.setItem(STORE_PAC, JSON.stringify(pacientes));
  localStorage.setItem(STORE_AG,  JSON.stringify(agenda));
  render();
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Retorna a segunda-feira da semana de qualquer data */
function getMonday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/** Converte uma data para o weekKey (ISO da segunda-feira) */
function toWeekKey(date) {
  const mon = getMonday(date);
  // formata YYYY-MM-DD sem depender de fuso
  const y = mon.getFullYear();
  const m = String(mon.getMonth() + 1).padStart(2, '0');
  const d = String(mon.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Retorna as 5 datas úteis (seg-sex) da semana de um weekKey */
function weekDatesFromKey(weekKey) {
  const [y, m, d] = weekKey.split('-').map(Number);
  const mon = new Date(y, m - 1, d);
  return DIAS.map((_, i) => {
    const dt = new Date(mon);
    dt.setDate(mon.getDate() + i);
    return dt;
  });
}

function isToday(date) {
  return date.toDateString() === new Date().toDateString();
}

function fmtDate(d) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth()    === b.getMonth()
      && a.getDate()     === b.getDate();
}

// ════════════════════════════
//  Toast
// ════════════════════════════
function toast(msg, type = 'info') {
  const ICONS = { success: '✓', error: '✕', info: '·' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${ICONS[type]}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => {
    el.style.animation = 'slideOut .3s ease forwards';
    setTimeout(() => el.remove(), 280);
  }, 3200);
}

// ════════════════════════════
//  Modal de Confirmação
// ════════════════════════════
function confirmar(titulo, mensagem, onConfirm) {
  document.getElementById('modal')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal';
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-icon">⚠</div>
      <h3>${titulo}</h3>
      <p>${mensagem}</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="modal-cancel">Cancelar</button>
        <button class="btn btn-red"   id="modal-ok">Confirmar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#modal-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#modal-ok').addEventListener('click', () => { overlay.remove(); onConfirm(); });
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  const onKey = e => {
    if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onKey); }
  };
  document.addEventListener('keydown', onKey);
}

// ════════════════════════════
//  Validação
// ════════════════════════════
function validarCampo(id, msg) {
  const input = document.getElementById(id);
  const field = input?.closest('.field');
  if (!input || !input.value.trim()) {
    input?.classList.add('field-error');
    field?.classList.add('has-error');
    if (field && !field.querySelector('.error-msg')) {
      const span = document.createElement('span');
      span.className = 'error-msg';
      span.textContent = msg;
      field.appendChild(span);
    }
    return false;
  }
  input.classList.remove('field-error');
  field?.classList.remove('has-error');
  return true;
}

function limparErros(...ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    el?.classList.remove('field-error');
    el?.closest('.field')?.classList.remove('has-error');
  });
}

// ════════════════════════════
//  Cadastro de Paciente
// ════════════════════════════
function cadastrarPaciente() {
  limparErros('nome', 'setor');
  const ok = validarCampo('nome', 'Nome é obrigatório.')
           & validarCampo('setor', 'Setor é obrigatório.');
  if (!ok) return;

  const nome     = document.getElementById('nome').value.trim();
  const idade    = document.getElementById('idade').value.trim();
  const telefone = document.getElementById('telefone').value.trim();
  const setor    = document.getElementById('setor').value.trim();

  if (pacientes.some(p => p.nome.toLowerCase() === nome.toLowerCase()))
    return toast(`Já existe um paciente com o nome "${nome}".`, 'error');

  pacientes.push({ id: uid(), nome, idade, telefone, setor });
  ['nome', 'idade', 'telefone', 'setor'].forEach(id => {
    document.getElementById(id).value = '';
  });
  persist();
  toast(`${nome} cadastrado(a) com sucesso.`, 'success');
}

// ════════════════════════════
//  Agendamento
// ════════════════════════════
function agendarConsulta() {
  const pacienteId = document.getElementById('selectPaciente').value;
  const dia        = document.getElementById('selectDia').value;
  const hora       = document.getElementById('selectHora').value;
  const tipo       = document.getElementById('selectTipo').value;

  if (!pacienteId) return toast('Selecione um paciente.', 'error');

  // Filtra somente os agendamentos DA semana selecionada
  const semana    = agenda.filter(a => a.weekKey === selectedWeekKey);
  const totalRec  = semana.filter(a => a.tipo === 'recorrente').length;
  const totalNovo = semana.filter(a => a.tipo === 'novo').length;
  const total     = semana.length;

  if (total >= LIMITE.total)
    return toast(`Limite de ${LIMITE.total} atendimentos para esta semana atingido.`, 'error');
  if (tipo === 'recorrente' && totalRec >= LIMITE.recorrente)
    return toast('As 2 vagas recorrentes desta semana já estão preenchidas.', 'error');
  if (tipo === 'novo' && totalNovo >= LIMITE.novo)
    return toast('A vaga para novo paciente desta semana já está preenchida.', 'error');

  // Conflito de horário (mesma semana, mesmo dia, mesmo horário)
  if (semana.some(a => a.dia === dia && a.hora === hora))
    return toast(`Já existe uma consulta às ${hora} nesta ${NOMES_DIA[DIAS.indexOf(dia)]}.`, 'error');

  // Mesmo paciente duas vezes na mesma semana
  if (semana.some(a => a.pacienteId === pacienteId))
    return toast('Este paciente já possui um agendamento nesta semana.', 'error');

  const pac = pacientes.find(p => p.id === pacienteId);
  agenda.push({
    id: uid(),
    weekKey: selectedWeekKey,   // ← chave da semana
    pacienteId: pac.id,
    pacienteNome: pac.nome,
    setor: pac.setor,
    dia, hora, tipo
  });
  persist();
  toast(`Consulta de ${pac.nome} confirmada para ${hora}.`, 'success');
}

// ════════════════════════════
//  Remoções
// ════════════════════════════
function removerAgendamento(id) {
  const item = agenda.find(a => a.id === id);
  if (!item) return;
  confirmar(
    'Cancelar agendamento',
    `Deseja cancelar a consulta de <strong>${item.pacienteNome}</strong> marcada para <strong>${item.hora}</strong>?`,
    () => {
      agenda = agenda.filter(a => a.id !== id);
      persist();
      toast('Agendamento cancelado.', 'info');
    }
  );
}

function removerPaciente(id) {
  const pac = pacientes.find(p => p.id === id);
  if (!pac) return;
  const temAgenda = agenda.some(a => a.pacienteId === id);
  const aviso = temAgenda
    ? `<strong>${pac.nome}</strong> tem consulta(s) agendada(s). Ao remover, os agendamentos também serão excluídos.`
    : `Deseja remover <strong>${pac.nome}</strong> do cadastro?`;
  confirmar('Remover paciente', aviso, () => {
    pacientes = pacientes.filter(p => p.id !== id);
    if (temAgenda) agenda = agenda.filter(a => a.pacienteId !== id);
    persist();
    toast('Paciente removido.', 'info');
  });
}

// ════════════════════════════
//  Navegação Mensal
// ════════════════════════════
function mudarMes(delta) {
  calMonth += delta;
  if (calMonth > 11) { calMonth = 0;  calYear++; }
  if (calMonth < 0)  { calMonth = 11; calYear--; }
  renderMonthPicker();
}

function selecionarSemana(weekKey) {
  selectedWeekKey = weekKey;
  render();
}

function renderMonthPicker() {
  document.getElementById('monthTitle').textContent =
    `${MESES[calMonth]} ${calYear}`;

  const body      = document.getElementById('monthBody');
  body.innerHTML  = '';

  // Primeiro dia do mês e do grid (segunda-feira da semana que contém o dia 1)
  const firstDay  = new Date(calYear, calMonth, 1);
  const gridStart = getMonday(firstDay);
  // Último dia do mês
  const lastDay   = new Date(calYear, calMonth + 1, 0);

  // Itera semana a semana até cobrir o mês inteiro
  const cursor = new Date(gridStart);
  const todayKey   = toWeekKey(new Date());

  while (cursor <= lastDay || cursor.getMonth() < calMonth) {
    const wKey    = toWeekKey(cursor);
    const isSelected  = wKey === selectedWeekKey;
    const isCurrentWk = wKey === todayKey;

    // Conta agendamentos desta semana (para indicador de ponto)
    const count = agenda.filter(a => a.weekKey === wKey).length;

    // Monta a linha da semana (7 dias: seg→dom)
    const row = document.createElement('div');
    row.className = 'month-week-row'
      + (isSelected  ? ' selected'     : '')
      + (isCurrentWk ? ' current-week' : '');
    row.setAttribute('data-week', wKey);
    row.onclick = () => selecionarSemana(wKey);

    // Indicador de vagas usadas
    const indicator = document.createElement('span');
    indicator.className = 'week-indicator';
    if (count > 0) {
      indicator.innerHTML = Array.from({ length: count },
        (_, i) => `<span class="week-dot"></span>`).join('');
    }

    for (let i = 0; i < 7; i++) {
      const dayDate   = new Date(cursor);
      dayDate.setDate(cursor.getDate() + i);
      const isOther   = dayDate.getMonth() !== calMonth;
      const isTodayD  = isToday(dayDate);
      const isWeekend = i >= 5; // sáb e dom

      const cell = document.createElement('span');
      cell.className = 'month-day'
        + (isOther   ? ' other-month' : '')
        + (isTodayD  ? ' today'       : '')
        + (isWeekend ? ' weekend'     : '');
      cell.textContent = dayDate.getDate();
      row.appendChild(cell);
    }

    row.appendChild(indicator);
    body.appendChild(row);

    // Avança 7 dias
    cursor.setDate(cursor.getDate() + 7);

    // Para após cobrir o último dia do mês
    if (cursor > lastDay && cursor.getMonth() !== calMonth) break;
  }
}

// ════════════════════════════
//  Render Principal
// ════════════════════════════
function render() {
  const weekDates = weekDatesFromKey(selectedWeekKey);

  // Label da semana na top-bar
  document.getElementById('weekLabel').textContent =
    `${fmtDate(weekDates[0])} — ${fmtDate(weekDates[4])}`;
  document.getElementById('weekSubtitle').textContent =
    `Semana de ${weekDates[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`;

  // Cabeçalhos do calendário semanal
  DIAS.forEach((d, i) => {
    const cell = document.getElementById(`head-${d}`);
    if (!cell) return;
    const tod = isToday(weekDates[i]);
    cell.className = 'cal-head-cell' + (tod ? ' today' : '');
    cell.innerHTML = `
      <span>${NOMES_DIA[i]}</span>
      <span class="day-date-label">${weekDates[i].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>`;
    document.getElementById(`col-${d}`)?.classList.toggle('today-col', tod);
  });

  // Select de pacientes
  const sel = document.getElementById('selectPaciente');
  const cur = sel.value;
  sel.innerHTML = pacientes.length
    ? [...pacientes]
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .map(p => `<option value="${p.id}" ${p.id === cur ? 'selected' : ''}>${p.nome}</option>`)
        .join('')
    : '<option value="">— sem pacientes —</option>';

  // Lista sidebar
  const lista = document.getElementById('listaPacientes');
  lista.innerHTML = pacientes.length
    ? [...pacientes]
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .map(p => `
          <div class="patient-chip">
            <div class="patient-chip-info">
              <span class="patient-chip-name">${p.nome}</span>
              <span class="patient-chip-sub">${p.setor}${p.idade ? ` · ${p.idade} anos` : ''}</span>
            </div>
            <button class="chip-remove" onclick="removerPaciente('${p.id}')" title="Remover">✕</button>
          </div>`).join('')
    : '<span class="empty-msg">Nenhum paciente ainda.</span>';

  // Stats — filtrado pela semana selecionada
  const semana = agenda.filter(a => a.weekKey === selectedWeekKey);
  const rec    = semana.filter(a => a.tipo === 'recorrente').length;
  const novo   = semana.filter(a => a.tipo === 'novo').length;
  const tot    = semana.length;
  const disp   = LIMITE.total - tot;

  document.getElementById('statTotal').innerHTML = `${tot}<small>/${LIMITE.total}</small>`;
  document.getElementById('statRec').innerHTML   = `${rec}<small>/${LIMITE.recorrente}</small>`;
  document.getElementById('statNovo').innerHTML  = `${novo}<small>/${LIMITE.novo}</small>`;
  document.getElementById('statDisp').textContent = disp;

  document.getElementById('fillTotal').style.width = `${(tot  / LIMITE.total)      * 100}%`;
  document.getElementById('fillRec').style.width   = `${(rec  / LIMITE.recorrente) * 100}%`;
  document.getElementById('fillNovo').style.width  = `${(novo / LIMITE.novo)       * 100}%`;
  document.getElementById('fillDisp').style.width  = `${(disp / LIMITE.total)      * 100}%`;

  // Limpa colunas
  DIAS.forEach(d => {
    const col = document.getElementById(`col-${d}`);
    if (col) col.innerHTML = '';
  });

  // Preenche calendário semanal com os agendamentos da semana selecionada
  [...semana]
    .sort((a, b) => a.hora > b.hora ? 1 : -1)
    .forEach(item => {
      const col = document.getElementById(`col-${item.dia}`);
      if (!col) return;
      const card = document.createElement('div');
      card.className = `appt-card ${item.tipo}`;
      card.innerHTML = `
        <button class="appt-remove" onclick="removerAgendamento('${item.id}')" title="Cancelar">✕</button>
        <div class="appt-name">${item.pacienteNome}</div>
        <div class="appt-meta">${item.hora} · ${item.setor}</div>
        <span class="appt-badge ${item.tipo === 'novo' ? 'badge-novo' : 'badge-rec'}">
          ${item.tipo === 'novo' ? 'Novo' : 'Recorrente'}
        </span>`;
      col.appendChild(card);
    });

  // Hint de coluna vazia
  DIAS.forEach(d => {
    const col = document.getElementById(`col-${d}`);
    if (!col) return;
    col.classList.toggle('empty-hint', col.children.length === 0);
  });

  // Atualiza o seletor mensal (para refletir pontos de agendamento atualizados)
  renderMonthPicker();
}

// ════════════════════════════
//  Inicialização
// ════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  ['nome', 'idade', 'telefone', 'setor'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') cadastrarPaciente();
    });
  });

  ['nome', 'setor'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => limparErros(id));
  });

  render();
});