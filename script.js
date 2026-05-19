/* ===== STATE ===== */
let questions = [],
  quizOrder = [],
  currentIdx = 0,
  userAnswers = [],
  showWrongOnly = false,
  listCollapsed = false,
  selectedTopics = new Set();
const LABELS = ['A', 'B', 'C', 'D'];

/* ===== TOPIC SELECTOR ===== */
function initTopicSelector() {
  const grid = document.getElementById('topicGrid');
  if (!grid) return;
  grid.innerHTML = '';
  
  Object.keys(LECTURE_DATA).forEach(topic => {
    const qCount = LECTURE_DATA[topic].length;
    const card = document.createElement('div');
    card.className = `topic-card ${selectedTopics.has(topic) ? 'active' : ''}`;
    card.dataset.topic = topic;
    card.onclick = () => toggleTopic(topic);
    
    // Parse title & subtitle
    let title = topic;
    let subtitle = '';
    if (topic.includes(' – ')) {
      const parts = topic.split(' – ');
      title = parts[0];
      subtitle = parts[1];
    } else if (topic.includes(' MCQs')) {
      title = topic.replace(' MCQs', '');
      subtitle = 'MCQs';
    }
    
    card.innerHTML = `
      <div class="topic-info">
        <div class="topic-name">${title}</div>
        <div class="topic-desc">${subtitle}</div>
      </div>
      <div class="topic-badge">${qCount} Qs</div>
      <div class="topic-check">✓</div>
    `;
    grid.appendChild(card);
  });
}

function toggleTopic(topic) {
  if (selectedTopics.has(topic)) {
    selectedTopics.delete(topic);
    questions = questions.filter(q => q.topic !== topic);
  } else {
    selectedTopics.add(topic);
    const qList = LECTURE_DATA[topic].map(q => ({
      id: Date.now() + Math.random(),
      text: q.text,
      options: [...q.options],
      correct: q.correct,
      topic: topic
    }));
    questions.push(...qList);
  }
  updateTopicUI();
  renderSetup();
}

function updateTopicUI() {
  const cards = document.querySelectorAll('.topic-card');
  cards.forEach(card => {
    const topic = card.dataset.topic;
    if (selectedTopics.has(topic)) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
}

function selectAllTopics() {
  Object.keys(LECTURE_DATA).forEach(topic => {
    if (!selectedTopics.has(topic)) {
      selectedTopics.add(topic);
      const qList = LECTURE_DATA[topic].map(q => ({
        id: Date.now() + Math.random(),
        text: q.text,
        options: [...q.options],
        correct: q.correct,
        topic: topic
      }));
      questions.push(...qList);
    }
  });
  updateTopicUI();
  renderSetup();
}

function clearSelectedTopics() {
  selectedTopics.clear();
  questions = questions.filter(q => !q.topic);
  updateTopicUI();
  renderSetup();
}

/* ===== SETUP & PREVIEW ===== */
function renderSetup() {
  const container = document.getElementById('questionsContainer');
  if (!container) return;
  container.innerHTML = '';
  questions.forEach((q, qi) => {
    const div = document.createElement('div');
    div.className = 'q-block-preview';
    div.innerHTML = `
      <div class="q-preview-header">
        <span class="q-preview-num">Question ${qi+1}</span>
        <span class="q-preview-topic">${escHtml(q.topic || 'Custom')}</span>
      </div>
      <div class="q-preview-text">${escHtml(q.text)}</div>
      <div class="q-preview-options">
        ${q.options.map((opt, oi) => `
          <div class="q-preview-opt ${oi === q.correct ? 'correct' : ''}">
            <span class="q-preview-label">${LABELS[oi]}</span>
            <span class="q-preview-opt-text">${escHtml(opt)}</span>
          </div>
        `).join('')}
      </div>
    `;
    container.appendChild(div);
  });
  document.getElementById('qCountBadge').textContent = questions.length;
  validateStart();
}

function validateStart() {
  document.getElementById('startBtn').disabled = questions.length === 0;
}

function toggleCollapse() {
  listCollapsed = !listCollapsed;
  document.getElementById('questionsContainer').classList.toggle('collapsed', listCollapsed);
  document.getElementById('collapseIcon').classList.toggle('open', !listCollapsed);
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

// Initialize Topic Selector, preload ALL lectures, and start solving immediately
initTopicSelector();
selectAllTopics();
startQuiz();