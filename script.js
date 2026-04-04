/* ===== STATE ===== */
let questions = [],
  quizOrder = [],
  currentIdx = 0,
  userAnswers = [],
  showWrongOnly = false,
  listCollapsed = false;
const LABELS = ['A', 'B', 'C', 'D'];

/* ===== SETUP ===== */
function addQuestion() {
  questions.push({
    id: Date.now() + Math.random(),
    text: '',
    options: ['', '', '', ''],
    correct: 0
  });
  renderSetup();
  setTimeout(() => {
    const b = document.querySelectorAll('.q-block');
    if (b.length) b[b.length - 1].scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
  }, 50);
}

function removeQuestion(id) {
  questions = questions.filter(q => q.id !== id);
  renderSetup();
}

function clearAll() {
  if (!confirm('Remove all questions?')) return;
  questions = [];
  renderSetup();
}

function renderSetup() {
  const container = document.getElementById('questionsContainer');
  container.innerHTML = '';
  questions.forEach((q, qi) => {
    const div = document.createElement('div');
    div.className = 'q-block';
    div.innerHTML = `
      <button class="remove-btn" onclick="removeQuestion(${q.id})" title="Remove">âœ•</button>
      <label>Question ${qi+1}</label>
      <input type="text" placeholder="Enter your questionâ€¦" value="${escHtml(q.text)}" oninput="updateQuestion(${q.id},'text',this.value)">
      <div class="options-grid" style="margin-top:0.8rem">
        ${q.options.map((opt,oi)=>`<div class="opt-row"><span class="opt-label">${LABELS[oi]}</span><input type="text" placeholder="Option ${LABELS[oi]}" value="${escHtml(opt)}" oninput="updateOption(${q.id},${oi},this.value)"></div>`).join('')}
      </div>
      <div class="correct-row">
        <label>Correct answer</label>
        <select onchange="updateQuestion(${q.id},'correct',+this.value)">
          ${LABELS.map((l,i)=>`<option value="${i}" ${q.correct===i?'selected':''}>${l}</option>`).join('')}
        </select>
      </div>`;
    container.appendChild(div);
  });
  document.getElementById('qCountBadge').textContent = questions.length;
  document.getElementById('clearBtn').style.display = questions.length ? 'inline-flex' : 'none';
  validateStart();
}

function updateQuestion(id, field, val) {
  const q = questions.find(x => x.id === id);
  if (q) q[field] = field === 'correct' ? +val : val;
  validateStart();
}

function updateOption(id, idx, val) {
  const q = questions.find(x => x.id === id);
  if (q) q.options[idx] = val;
  validateStart();
}

function validateStart() {
  document.getElementById('startBtn').disabled = !(questions.length > 0 && questions.every(q => q.text.trim() && q.options.every(o => o.trim())));
}

function toggleCollapse() {
  listCollapsed = !listCollapsed;
  document.getElementById('questionsContainer').classList.toggle('collapsed', listCollapsed);
  document.getElementById('collapseIcon').classList.toggle('open', !listCollapsed);
}

/* ===== FILE IMPORT ===== */
const SKIP_PATTERNS = [/^bloom level/i, /^\d+\/\d+$/, /^correct\s*[âœ…âœ“]?$/i, /^Ø§Ù„ØªØ¹Ù„ÙŠÙ‚Ø§Øª/, /^\s*$/];

function shouldSkip(line) {
  return SKIP_PATTERNS.some(p => p.test(line.trim()));
}

function handleFileImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = ev => parseAndLoad(ev.target.result, file.name);
  r.readAsText(file, 'UTF-8');
  e.target.value = '';
}

const zone = document.getElementById('importZone');
zone.addEventListener('dragover', e => {
  e.preventDefault();
  zone.classList.add('drag-over');
});
zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
zone.addEventListener('drop', e => {
  e.preventDefault();
  zone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) {
    const r = new FileReader();
    r.onload = ev => parseAndLoad(ev.target.result, file.name);
    r.readAsText(file, 'UTF-8');
  }
});

function parseAndLoad(text, filename) {
  const lines = text.split(/\r?\n/);
  const parsed = [];
  let current = null,
    nextIsCorrect = false;

  function commit() {
    if (current && current.text && current.options.length === 4) parsed.push(current);
    current = null;
    nextIsCorrect = false;
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (shouldSkip(line)) continue;
    const qm = line.match(/^(?:Q\s*)?(\d+)[.)]\s+(.+)/i);
    if (qm) {
      commit();
      current = {
        text: qm[2].trim(),
        options: [],
        correct: 0
      };
      continue;
    }
    if (!current) continue;
    if (line === '*') {
      nextIsCorrect = true;
      continue;
    }
    if (current.options.length < 4) {
      current.options.push(line);
      if (nextIsCorrect) {
        current.correct = current.options.length - 1;
        nextIsCorrect = false;
      }
    }
  }
  commit();

  const status = document.getElementById('importStatus');
  if (!parsed.length) {
    status.className = 'import-status err';
    status.textContent = `âš  No questions found in "${filename}". Check the format guide.`;
    return;
  }
  const before = questions.length;
  parsed.forEach(p => questions.push({
    id: Date.now() + Math.random(),
    ...p
  }));
  renderSetup();
  status.className = 'import-status ok';
  status.textContent = `âœ“ Imported ${parsed.length} question${parsed.length>1?'s':''} from "${filename}" â€” total now: ${questions.length}`;
}

function downloadTemplate() {
  const tmpl = `1) What is the primary goal of entrepreneurship?
*
Correct answer option
Wrong option B
Wrong option C
Wrong option D

2) Another question?
*
Correct answer
Wrong option B
Wrong option C
Wrong option D`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([tmpl], {
    type: 'text/plain'
  }));
  a.download = 'quiz-template.txt';
  a.click();
}

function showFormatHelp() {
  document.getElementById('formatModal').classList.remove('hidden');
}

function closeModal(e) {
  if (e.target === document.getElementById('formatModal')) document.getElementById('formatModal').classList.add('hidden');
}

/* ===== QUIZ ===== */
function startQuiz() {
  quizOrder = shuffle([...questions.keys()]);
  currentIdx = 0;
  userAnswers = new Array(questions.length).fill(null);
  showScreen('quizScreen');
  renderQuestion();
}

function renderQuestion() {
  const qi = quizOrder[currentIdx],
    q = questions[qi],
    tot = questions.length;
  document.getElementById('progressBar').style.width = (currentIdx / tot * 100) + '%';
  document.getElementById('qCounter').textContent = `Question ${currentIdx+1} of ${tot}`;
  document.getElementById('qText').textContent = q.text;
  const list = document.getElementById('optionsList');
  list.innerHTML = '';
  q.options.forEach((opt, oi) => {
    const btn = document.createElement('button');
    btn.className = 'opt-btn';
    btn.innerHTML = `<span class="opt-icon">${LABELS[oi]}</span>${escHtml(opt)}`;
    btn.onclick = () => selectAnswer(oi);
    list.appendChild(btn);
  });
  document.getElementById('nextBtn').style.display = 'none';
  document.getElementById('finishBtn').style.display = 'none';
}

function selectAnswer(chosen) {
  const qi = quizOrder[currentIdx],
    q = questions[qi],
    correct = q.correct;
  userAnswers[qi] = chosen;
  const btns = document.querySelectorAll('.opt-btn');
  btns.forEach(b => b.disabled = true);
  btns[chosen].classList.add(chosen === correct ? 'correct' : 'wrong');
  btns[chosen].querySelector('.opt-icon').textContent = chosen === correct ? 'âœ“' : 'âœ—';
  if (chosen !== correct) {
    btns[correct].classList.add('reveal-correct');
    btns[correct].querySelector('.opt-icon').textContent = 'âœ“';
  }
  const isLast = currentIdx === questions.length - 1;
  document.getElementById('nextBtn').style.display = isLast ? 'none' : 'inline-flex';
  document.getElementById('finishBtn').style.display = isLast ? 'inline-flex' : 'none';
}

function nextQuestion() {
  currentIdx++;
  renderQuestion();
}

/* ===== RESULTS ===== */
function showResults() {
  const correct = userAnswers.filter((a, i) => a === questions[i].correct).length,
    total = questions.length,
    pct = Math.round(correct / total * 100);
  setTimeout(() => {
    document.getElementById('scoreArc').style.strokeDashoffset = 2 * Math.PI * 62 * (1 - pct / 100);
  }, 100);
  document.getElementById('scoreNum').textContent = `${correct}/${total}`;
  document.getElementById('resultTitle').textContent = pct === 100 ? 'ðŸ† Perfect Score!' : pct >= 70 ? 'ðŸŽ‰ Great Job!' : pct >= 40 ? 'ðŸ“š Keep Practicing' : 'ðŸ’ª Try Again!';
  document.getElementById('resultSub').textContent = `You answered ${correct} out of ${total} correctly (${pct}%)`;
  document.getElementById('progressBar').style.width = '100%';
  showScreen('resultsScreen');
  renderReview();
}

function renderReview() {
  const list = document.getElementById('reviewList');
  list.innerHTML = '';
  questions.forEach((q, qi) => {
    const chosen = userAnswers[qi],
      isRight = chosen === q.correct;
    if (showWrongOnly && isRight) return;
    const div = document.createElement('div');
    div.className = `review-item ${isRight?'all-correct':'had-wrong'}`;
    div.innerHTML = `<div class="review-q"><span class="review-badge ${isRight?'badge-correct':'badge-wrong'}">${isRight?'âœ“ Correct':'âœ— Wrong'}</span>${escHtml(q.text)}</div><div class="review-answers">${q.options.map((opt,oi)=>{ let cls='r-neutral',icon='â—‹'; if(oi===q.correct){cls='r-correct';icon='âœ“';} if(oi===chosen&&oi!==q.correct){cls='r-wrong';icon='âœ—';} return ` < div class = "review-opt ${cls}" > < span class = "r-icon" > $ {
      icon
    } < /span>${LABELS[oi]}. ${escHtml(opt)}</div > `; }).join('')}</div>`;
    list.appendChild(div);
  });
  if (!list.innerHTML) list.innerHTML = '<div style="color:var(--correct);text-align:center;padding:2rem;font-family:\'Syne\',sans-serif;font-weight:700;">âœ“ All answers correct!</div>';
}

function toggleWrongOnly() {
  showWrongOnly = !showWrongOnly;
  document.getElementById('wrongToggle').classList.toggle('on', showWrongOnly);
  renderReview();
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function backToSetup() {
  showScreen('setupScreen');
  renderSetup();
}

function restartQuiz() {
  startQuiz();
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}