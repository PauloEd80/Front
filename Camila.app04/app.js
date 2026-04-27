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

const _today        = new Date();
let selectedWeekKey = toWeekKey(_today);
let calYear         = _today.getFullYear();
let calMonth        = _today.getMonth();      // mini calendar
let fullCalYear     = _today.getFullYear();
let fullCalMonth    = _today.getMonth();      // full calendar overlay

// ════════════════════════════
//  Utilitários de Dados
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

// ════════════════════════════
//  Utilitários de Data
// ════════════════════════════

/** Segunda-feira da semana que contém 'date' */
function getMonday(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day  = d.getDay();                        // 0=dom … 6=sab
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/** "YYYY-MM-DD" da segunda-feira da semana de date */
function toWeekKey(date) {
  const m = getMonday(date);
  const y = m.getFullYear();
  const mo = String(m.getMonth() + 1).padStart(2, '0');
  const d  = String(m.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

/** "YYYY-MM-DD" de qualquer data */
function toDayKey(date) {
  const y  = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d  = String(date.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

/** Datas seg–sex da semana identificada por weekKey */
function weekDatesFromKey(weekKey) {
  const [y, m, d] = weekKey.split('-').map(Number);
  const mon = new Date(y, m - 1, d);
  return DIAS.map((_, i) => {
    const dt = new Date(mon);
    dt.setDate(mon.getDate() + i);
    return dt;
  });
}

/** Data exata de um agendamento (Date object) */
function apptDate(appt) {
  const [y, m, d] = appt.weekKey.split('-').map(Number);
  const mon    = new Date(y, m - 1, d);
  const offset = DIAS.indexOf(appt.dia);
  const dt     = new Date(mon);
  dt.setDate(mon.getDate() + offset);
  return dt;
}

function isToday(date) {
  return toDayKey(date) === toDayKey(new Date());
}

function fmtDate(d) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
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
  overlay.querySelector('#modal-ok').addEventListener('click',     () => { overlay.remove(); onConfirm(); });
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

  const semana    = agenda.filter(a => a.weekKey === selectedWeekKey);
  const totalRec  = semana.filter(a => a.tipo === 'recorrente').length;
  const totalNovo = semana.filter(a => a.tipo === 'novo').length;

  if (semana.length >= LIMITE.total)
    return toast(`Limite de ${LIMITE.total} atendimentos para esta semana atingido.`, 'error');
  if (tipo === 'recorrente' && totalRec >= LIMITE.recorrente)
    return toast('As 2 vagas recorrentes desta semana já estão preenchidas.', 'error');
  if (tipo === 'novo' && totalNovo >= LIMITE.novo)
    return toast('A vaga para novo paciente desta semana já está preenchida.', 'error');
  if (semana.some(a => a.dia === dia && a.hora === hora))
    return toast(`Já existe uma consulta às ${hora} nesta ${NOMES_DIA[DIAS.indexOf(dia)]}.`, 'error');
  if (semana.some(a => a.pacienteId === pacienteId))
    return toast('Este paciente já possui agendamento nesta semana.', 'error');

  const pac = pacientes.find(p => p.id === pacienteId);
  agenda.push({
    id: uid(), weekKey: selectedWeekKey,
    pacienteId: pac.id, pacienteNome: pac.nome,
    setor: pac.setor, dia, hora, tipo
  });
  persist();
  toast(`Consulta de ${pac.nome} confirmada para ${hora}.`, 'success');
}

// ════════════════════════════
//  Remoções com confirmação
// ════════════════════════════
function removerAgendamento(id) {
  const item = agenda.find(a => a.id === id);
  if (!item) return;
  confirmar(
    'Cancelar agendamento',
    `Você tem certeza que quer excluir o agendamento de <strong>${item.pacienteNome}</strong> às <strong>${item.hora}</strong>?`,
    () => {
      agenda = agenda.filter(a => a.id !== id);
      persist();
      toast('Agendamento removido.', 'info');
    }
  );
}

function removerPaciente(id) {
  const pac = pacientes.find(p => p.id === id);
  if (!pac) return;
  const temAgenda = agenda.some(a => a.pacienteId === id);
  confirmar(
    'Excluir cadastro',
    temAgenda
      ? `Você tem certeza que quer excluir o cadastro de <strong>${pac.nome}</strong>? Todos os agendamentos deste paciente também serão removidos.`
      : `Você tem certeza que quer excluir o cadastro de <strong>${pac.nome}</strong>?`,
    () => {
      pacientes = pacientes.filter(p => p.id !== id);
      if (temAgenda) agenda = agenda.filter(a => a.pacienteId !== id);
      persist();
      toast('Cadastro removido.', 'info');
    }
  );
}

// ════════════════════════════
//  Calendário Mini — Navegação
// ════════════════════════════
function mudarMes(delta) {
  calMonth += delta;
  if (calMonth > 11) { calMonth = 0;  calYear++;  }
  if (calMonth < 0)  { calMonth = 11; calYear--;  }
  renderMonthPicker();
}

function selecionarSemana(weekKey) {
  selectedWeekKey = weekKey;
  // Sincroniza o mês exibido se necessário
  const [y, m] = weekKey.split('-').map(Number);
  calYear  = y;
  calMonth = m - 1;
  render();
}

/**
 * Renderiza o mini-calendário mensal.
 * BUG CORRIGIDO: usa apenas `while (cursor <= lastDay)` —
 * a condição anterior `|| cursor.getMonth() < calMonth`
 * causava semanas extras em dezembro e outros meses.
 */
function renderMonthPicker() {
  document.getElementById('monthTitle').textContent = `${MESES[calMonth]} ${calYear}`;

  const body      = document.getElementById('monthBody');
  body.innerHTML  = '';

  const firstDay  = new Date(calYear, calMonth, 1);
  const lastDay   = new Date(calYear, calMonth + 1, 0);  // último dia do mês
  const gridStart = getMonday(firstDay);                  // segunda da primeira semana
  const todayKey  = toWeekKey(new Date());

  const cursor = new Date(gridStart);

  // Itera semana a semana até cobrir todos os dias do mês
  while (cursor <= lastDay) {
    const wKey       = toWeekKey(cursor);
    const isSelected = wKey === selectedWeekKey;
    const isCurrent  = wKey === todayKey;
    const count      = agenda.filter(a => a.weekKey === wKey).length;

    const row = document.createElement('div');
    row.className = 'month-week-row'
      + (isSelected ? ' selected'     : '')
      + (isCurrent  ? ' current-week' : '');
    row.onclick = () => selecionarSemana(wKey);

    // 7 dias (seg → dom)
    for (let i = 0; i < 7; i++) {
      const dayDate  = new Date(cursor);
      dayDate.setDate(cursor.getDate() + i);

      const cell = document.createElement('span');
      cell.className = 'month-day'
        + (dayDate.getMonth() !== calMonth ? ' other-month' : '')
        + (isToday(dayDate)               ? ' today'       : '')
        + (i >= 5                         ? ' weekend'     : '');
      cell.textContent = dayDate.getDate();
      row.appendChild(cell);
    }

    // Indicador de agendamentos
    const ind = document.createElement('span');
    ind.className = 'week-indicator';
    for (let k = 0; k < count; k++) {
      const dot = document.createElement('span');
      dot.className = 'week-dot';
      ind.appendChild(dot);
    }
    row.appendChild(ind);

    body.appendChild(row);
    cursor.setDate(cursor.getDate() + 7);
  }
}

// ════════════════════════════
//  Calendário Completo — Overlay
// ════════════════════════════
function abrirCalendarioCompleto() {
  fullCalYear  = calYear;
  fullCalMonth = calMonth;
  renderFullCalendar();
  document.getElementById('fullcalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function fecharCalendarioCompleto() {
  document.getElementById('fullcalOverlay').classList.remove('open');
  document.body.style.overflow = '';
  esconderTooltip();
}

function fecharSeBackground(e) {
  if (e.target.id === 'fullcalOverlay') fecharCalendarioCompleto();
}

function mudarMesFull(delta) {
  fullCalMonth += delta;
  if (fullCalMonth > 11) { fullCalMonth = 0;  fullCalYear++;  }
  if (fullCalMonth < 0)  { fullCalMonth = 11; fullCalYear--;  }
  renderFullCalendar();
}

function renderFullCalendar() {
  document.getElementById('fullCalTitle').textContent =
    `${MESES[fullCalMonth]} ${fullCalYear}`;

  const body      = document.getElementById('fullCalBody');
  body.innerHTML  = '';

  const firstDay  = new Date(fullCalYear, fullCalMonth, 1);
  const lastDay   = new Date(fullCalYear, fullCalMonth + 1, 0);
  const gridStart = getMonday(firstDay);

  // Monta índice: dayKey → lista de agendamentos
  const apptsByDay = {};
  agenda.forEach(appt => {
    const key = toDayKey(apptDate(appt));
    if (!apptsByDay[key]) apptsByDay[key] = [];
    apptsByDay[key].push(appt);
  });

  const cursor = new Date(gridStart);

  while (cursor <= lastDay) {
    // Linha de semana
    const weekRow = document.createElement('div');
    weekRow.className = 'fullcal-week';

    for (let i = 0; i < 7; i++) {
      const dayDate  = new Date(cursor);
      dayDate.setDate(cursor.getDate() + i);
      const dayKey   = toDayKey(dayDate);
      const appts    = apptsByDay[dayKey] || [];
      const isOther  = dayDate.getMonth() !== fullCalMonth;
      const isTod    = isToday(dayDate);
      const isWknd   = i >= 5;

      const cell = document.createElement('div');
      cell.className = 'fullcal-day'
        + (isOther ? ' other-month' : '')
        + (isTod   ? ' today'       : '')
        + (isWknd  ? ' weekend'     : '');

      // Número do dia
      const num = document.createElement('span');
      num.className = 'fullcal-day-num';
      num.textContent = dayDate.getDate();
      cell.appendChild(num);

      // Dots dos agendamentos
      if (appts.length > 0) {
        const dotsWrap = document.createElement('div');
        dotsWrap.className = 'fullcal-dots';

        appts.forEach(appt => {
          const dot = document.createElement('span');
          dot.className = `fullcal-dot ${appt.tipo}`;
          // Tooltip no hover
          dot.addEventListener('mouseenter', e => mostrarTooltip(e, appt));
          dot.addEventListener('mouseleave', esconderTooltip);
          dot.addEventListener('mousemove',  e => moverTooltip(e));
          dotsWrap.appendChild(dot);
        });

        cell.appendChild(dotsWrap);
      }

      weekRow.appendChild(cell);
    }

    body.appendChild(weekRow);
    cursor.setDate(cursor.getDate() + 7);
  }
}

// ════════════════════════════
//  Tooltip
// ════════════════════════════
function mostrarTooltip(e, appt) {
  const tip = document.getElementById('apptTooltip');
  const badge = appt.tipo === 'novo' ? 'Novo Paciente' : 'Recorrente';
  tip.innerHTML = `
    <div class="tip-name">${appt.pacienteNome}</div>
    <div class="tip-meta">${appt.hora} · ${appt.setor}</div>
    <div class="tip-badge ${appt.tipo}">${badge}</div>`;
  tip.classList.add('visible');
  moverTooltip(e);
}

function moverTooltip(e) {
  const tip  = document.getElementById('apptTooltip');
  const rect = tip.getBoundingClientRect();
  let x = e.clientX + 14;
  let y = e.clientY - 10;
  if (x + rect.width  > window.innerWidth  - 12) x = e.clientX - rect.width  - 14;
  if (y + rect.height > window.innerHeight - 12) y = e.clientY - rect.height - 10;
  tip.style.left = `${x}px`;
  tip.style.top  = `${y}px`;
}

function esconderTooltip() {
  document.getElementById('apptTooltip').classList.remove('visible');
}

// ════════════════════════════
//  Render Principal
// ════════════════════════════
function render() {
  const weekDates = weekDatesFromKey(selectedWeekKey);

  // Labels
  document.getElementById('weekLabel').textContent =
    `${fmtDate(weekDates[0])} — ${fmtDate(weekDates[4])}`;
  document.getElementById('weekSubtitle').textContent =
    `Semana de ${weekDates[0].toLocaleDateString('pt-BR',
      { day: '2-digit', month: 'long', year: 'numeric' })}`;

  // Cabeçalhos da grade semanal
  DIAS.forEach((d, i) => {
    const cell = document.getElementById(`head-${d}`);
    if (!cell) return;
    const tod = isToday(weekDates[i]);
    cell.className = 'cal-head-cell' + (tod ? ' today' : '');
    cell.innerHTML = `
      <span>${NOMES_DIA[i]}</span>
      <span class="day-date-label">
        ${weekDates[i].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
      </span>`;
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
            <button class="chip-remove" onclick="removerPaciente('${p.id}')" title="Excluir cadastro">✕</button>
          </div>`).join('')
    : '<span class="empty-msg">Nenhum paciente ainda.</span>';

  // Stats (filtrado pela semana selecionada)
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

  // Limpa e preenche colunas da grade semanal
  DIAS.forEach(d => {
    const col = document.getElementById(`col-${d}`);
    if (col) col.innerHTML = '';
  });

  [...semana]
    .sort((a, b) => a.hora > b.hora ? 1 : -1)
    .forEach(item => {
      const col = document.getElementById(`col-${item.dia}`);
      if (!col) return;
      const card = document.createElement('div');
      card.className = `appt-card ${item.tipo}`;
      card.innerHTML = `
        <button class="appt-remove" onclick="removerAgendamento('${item.id}')" title="Excluir agendamento">✕</button>
        <div class="appt-name">${item.pacienteNome}</div>
        <div class="appt-meta">${item.hora} · ${item.setor}</div>
        <span class="appt-badge ${item.tipo === 'novo' ? 'badge-novo' : 'badge-rec'}">
          ${item.tipo === 'novo' ? 'Novo' : 'Recorrente'}
        </span>`;
      col.appendChild(card);
    });

  DIAS.forEach(d => {
    const col = document.getElementById(`col-${d}`);
    if (!col) return;
    col.classList.toggle('empty-hint', col.children.length === 0);
  });

  renderMonthPicker();

  // Atualiza o calendário completo se estiver aberto
  if (document.getElementById('fullcalOverlay').classList.contains('open')) {
    renderFullCalendar();
  }
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

  // Fechar fullcal com Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') fecharCalendarioCompleto();
  });

  render();
});