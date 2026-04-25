// ════════════════════════════
//  Estado
// ════════════════════════════
let pacientes = JSON.parse(localStorage.getItem('fritsch_pac')) || [];
let agenda    = JSON.parse(localStorage.getItem('fritsch_ag'))  || [];

const DIAS = ['seg','ter','qua','qui','sex'];
const LIMITE = { total: 3, recorrente: 2, novo: 1 };

// ════════════════════════════
//  Persistência
// ════════════════════════════
function persist() {
  localStorage.setItem('fritsch_pac', JSON.stringify(pacientes));
  localStorage.setItem('fritsch_ag',  JSON.stringify(agenda));
  render();
}

// ════════════════════════════
//  Toast
// ════════════════════════════
function toast(msg, type = 'info') {
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut .3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, 3200);
}

// ════════════════════════════
//  Modal de confirmação
// ════════════════════════════
function confirmar(titulo, mensagem, onConfirm) {
  // Remove modal anterior se existir
  document.getElementById('modal')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal';
  overlay.innerHTML = `
    <div class="modal-box">
      <h3>${titulo}</h3>
      <p>${mensagem}</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="modal-cancel">Cancelar</button>
        <button class="btn btn-red"   id="modal-confirm">Confirmar</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  overlay.querySelector('#modal-cancel').addEventListener('click',  () => overlay.remove());
  overlay.querySelector('#modal-confirm').addEventListener('click', () => { overlay.remove(); onConfirm(); });
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

// ════════════════════════════
//  Validação de campos
// ════════════════════════════
function validarCampo(id, mensagem) {
  const input = document.getElementById(id);
  const field = input.closest('.field');

  if (!input.value.trim()) {
    input.classList.add('field-error');
    field.classList.add('has-error');
    // Cria msg de erro se não existir
    if (!field.querySelector('.error-msg')) {
      const msg = document.createElement('span');
      msg.className = 'error-msg';
      msg.textContent = mensagem;
      field.appendChild(msg);
    }
    return false;
  }

  input.classList.remove('field-error');
  field.classList.remove('has-error');
  return true;
}

function limparErros(ids) {
  ids.forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;
    input.classList.remove('field-error');
    input.closest('.field')?.classList.remove('has-error');
  });
}

// ════════════════════════════
//  Cadastro de paciente
// ════════════════════════════
function cadastrarPaciente() {
  limparErros(['nome', 'setor']);

  const nomeOk  = validarCampo('nome',  'Nome é obrigatório.');
  const setorOk = validarCampo('setor', 'Setor é obrigatório.');
  if (!nomeOk || !setorOk) return;

  const nome     = document.getElementById('nome').value.trim();
  const idade    = document.getElementById('idade').value;
  const telefone = document.getElementById('telefone').value.trim();
  const setor    = document.getElementById('setor').value.trim();

  pacientes.push({ id: Date.now(), nome, idade, telefone, setor });
  ['nome','idade','telefone','setor'].forEach(id => document.getElementById(id).value = '');
  persist();
  toast(`${nome} cadastrado(a) com sucesso!`, 'success');
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

  const totalRec  = agenda.filter(a => a.tipo === 'recorrente').length;
  const totalNovo = agenda.filter(a => a.tipo === 'novo').length;
  const total     = agenda.length;

  if (total >= LIMITE.total)
    return toast(`Limite de ${LIMITE.total} atendimentos semanais atingido.`, 'error');
  if (tipo === 'recorrente' && totalRec >= LIMITE.recorrente)
    return toast('As 2 vagas para recorrentes já estão preenchidas.', 'error');
  if (tipo === 'novo' && totalNovo >= LIMITE.novo)
    return toast('A vaga para novo paciente já está preenchida.', 'error');

  const conflito = agenda.find(a => a.dia === dia && a.hora === hora);
  if (conflito)
    return toast(`Já existe uma consulta às ${hora} neste dia.`, 'error');

  const paciente = pacientes.find(p => p.id == pacienteId);
  agenda.push({
    id: Date.now(),
    pacienteId: paciente.id,
    pacienteNome: paciente.nome,
    setor: paciente.setor,
    dia, hora, tipo
  });

  persist();
  toast(`Consulta de ${paciente.nome} agendada para ${hora}.`, 'success');
}

// ════════════════════════════
//  Remoções (com confirmação)
// ════════════════════════════
function removerAgendamento(id) {
  const item = agenda.find(a => a.id === id);
  if (!item) return;
  confirmar(
    'Cancelar agendamento',
    `Deseja realmente cancelar a consulta de <strong>${item.pacienteNome}</strong> às ${item.hora}?`,
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
    ? `<strong>${pac.nome}</strong> possui consulta(s) agendada(s). Ao remover, os agendamentos também serão excluídos.`
    : `Deseja remover <strong>${pac.nome}</strong> do cadastro?`;

  confirmar('Remover paciente', aviso, () => {
    pacientes = pacientes.filter(p => p.id !== id);
    if (temAgenda) agenda = agenda.filter(a => a.pacienteId !== id);
    persist();
    toast('Paciente removido.', 'info');
  });
}

// ════════════════════════════
//  Datas da semana atual
// ════════════════════════════
function getWeekDates() {
  const now  = new Date();
  const day  = now.getDay(); // 0=dom
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const seg  = new Date(now);
  seg.setDate(diff);

  return DIAS.map((_, i) => {
    const d = new Date(seg);
    d.setDate(seg.getDate() + i);
    return d;
  });
}

function isToday(date) {
  const t = new Date();
  return date.getDate() === t.getDate()
      && date.getMonth() === t.getMonth()
      && date.getFullYear() === t.getFullYear();
}

// ════════════════════════════
//  Render
// ════════════════════════════
function render() {
  const weekDates = getWeekDates();

  // Label da semana
  const fmt = d => d.toLocaleDateString('pt-BR', { day:'2-digit', month:'short' });
  document.getElementById('weekLabel').textContent =
    `${fmt(weekDates[0])} — ${fmt(weekDates[4])}`;

  // Cabeçalho do calendário com datas e highlight do dia atual
  const nomes = ['Segunda','Terça','Quarta','Quinta','Sexta'];
  DIAS.forEach((d, i) => {
    const cell = document.getElementById(`head-${d}`);
    if (!cell) return;
    const today = isToday(weekDates[i]);
    cell.className = 'cal-head-cell' + (today ? ' today' : '');
    cell.innerHTML = `
      <span>${nomes[i]}</span>
      <span class="day-date">${weekDates[i].toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}</span>`;

    // Highlight na coluna
    const col = document.getElementById(`col-${d}`);
    if (col) {
      if (today) col.classList.add('today-col');
      else col.classList.remove('today-col');
    }
  });

  // Select de pacientes
  const sel = document.getElementById('selectPaciente');
  const cur = sel.value;
  sel.innerHTML = pacientes.length
    ? pacientes.map(p =>
        `<option value="${p.id}" ${p.id == cur ? 'selected' : ''}>${p.nome}</option>`
      ).join('')
    : '<option value="">— sem pacientes —</option>';

  // Lista sidebar
  const lista = document.getElementById('listaPacientes');
  lista.innerHTML = pacientes.length
    ? pacientes.map(p => `
        <div class="patient-chip">
          <span>${p.nome}<span style="color:#475569;font-size:.7rem;"> · ${p.setor}</span></span>
          <button class="chip-remove" onclick="removerPaciente(${p.id})" title="Remover paciente">✕</button>
        </div>`).join('')
    : '<span class="empty-msg">Nenhum paciente ainda.</span>';

  // Stats
  const rec  = agenda.filter(a => a.tipo === 'recorrente').length;
  const novo = agenda.filter(a => a.tipo === 'novo').length;
  const tot  = agenda.length;
  const disp = LIMITE.total - tot;

  document.getElementById('statTotal').innerHTML = `${tot}<small>/${LIMITE.total}</small>`;
  document.getElementById('statRec').innerHTML   = `${rec}<small>/${LIMITE.recorrente}</small>`;
  document.getElementById('statNovo').innerHTML  = `${novo}<small>/${LIMITE.novo}</small>`;
  document.getElementById('statDisp').textContent = disp;

  document.getElementById('fillTotal').style.width = `${(tot / LIMITE.total)      * 100}%`;
  document.getElementById('fillRec').style.width   = `${(rec / LIMITE.recorrente) * 100}%`;
  document.getElementById('fillNovo').style.width  = `${(novo / LIMITE.novo)      * 100}%`;
  document.getElementById('fillDisp').style.width  = `${(disp / LIMITE.total)     * 100}%`;

  // Limpa colunas do calendário
  DIAS.forEach(d => {
    const col = document.getElementById(`col-${d}`);
    if (col) col.innerHTML = '';
  });

  // Preenche calendário ordenado por hora
  [...agenda]
    .sort((a, b) => a.hora > b.hora ? 1 : -1)
    .forEach(item => {
      const col = document.getElementById(`col-${item.dia}`);
      if (!col) return;
      const card = document.createElement('div');
      card.className = `appt-card ${item.tipo}`;
      card.innerHTML = `
        <button class="appt-remove" onclick="removerAgendamento(${item.id})" title="Cancelar">✕</button>
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
    if (!col.children.length) col.classList.add('empty-hint');
    else col.classList.remove('empty-hint');
  });
}

// ════════════════════════════
//  Atalhos de teclado (Enter)
// ════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // Enter nos campos do cadastro dispara salvar
  ['nome','idade','telefone','setor'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') cadastrarPaciente();
    });
  });

  // Remove erro ao começar a digitar
  ['nome','setor'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      limparErros([id]);
    });
  });

  render();
});
