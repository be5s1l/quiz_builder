/* ===== DYNAMIC DATABASE MAPPING ===== */
// Reconstruct LECTURE_DATA from the flat questionsData database
const LECTURE_DATA = {};
questionsData.forEach(q => {
  const topicName = q.topic || 'General';
  if (!LECTURE_DATA[topicName]) {
    LECTURE_DATA[topicName] = [];
  }
  const optionStrings = q.options.map(o => o.text);
  const correctIdx = q.options.findIndex(o => o.id === q.correct);
  LECTURE_DATA[topicName].push({
    text: q.question,
    options: optionStrings,
    correct: correctIdx >= 0 ? correctIdx : 0
  });
});

/* ===== STATE & STORAGE ===== */
let questions = [],
  quizOrder = [],
  currentIdx = 0,
  userAnswers = [],
  showWrongOnly = false,
  listCollapsed = false,
  selectedTopics = new Set(),
  activeScreen = 'quizScreen';

const LABELS = ['A', 'B', 'C', 'D'];
const SESSION_KEY = 'quiz_companion_session_v5';

function saveSession() {
  const session = {
    selectedTopics: Array.from(selectedTopics),
    questions: questions,
    quizOrder: quizOrder,
    currentIdx: currentIdx,
    userAnswers: userAnswers,
    activeScreen: activeScreen,
    showWrongOnly: showWrongOnly
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function loadSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return false;
  try {
    const session = JSON.parse(raw);
    selectedTopics = new Set(session.selectedTopics || []);
    questions = session.questions || [];
    quizOrder = session.quizOrder || [];
    currentIdx = session.currentIdx || 0;
    userAnswers = session.userAnswers || [];
    activeScreen = session.activeScreen || 'quizScreen';
    showWrongOnly = session.showWrongOnly || false;
    return questions.length > 0;
  } catch (e) {
    console.error("Error loading session:", e);
    return false;
  }
}

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
  saveSession();
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
  saveSession();
  updateTopicUI();
  renderSetup();
}

function clearSelectedTopics() {
  selectedTopics.clear();
  questions = questions.filter(q => !q.topic);
  saveSession();
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
  const startBtn = document.getElementById('startBtn');
  if (startBtn) {
    startBtn.disabled = questions.length === 0;
  }
}

function toggleCollapse() {
  listCollapsed = !listCollapsed;
  document.getElementById('questionsContainer').classList.toggle('collapsed', listCollapsed);
  document.getElementById('collapseIcon').classList.toggle('open', !listCollapsed);
}

/* ===== QUIZ ===== */
function startQuiz() {
  quizOrder = [...questions.keys()];
  currentIdx = 0;
  userAnswers = new Array(questions.length).fill(null);
  activeScreen = 'quizScreen';
  saveSession();
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
  
  const chosen = userAnswers[qi];
  const correct = q.correct;
  
  q.options.forEach((opt, oi) => {
    const btn = document.createElement('button');
    btn.className = 'opt-btn';
    btn.onclick = () => selectAnswer(oi);
    
    const iconSpan = document.createElement('span');
    iconSpan.className = 'opt-icon';
    iconSpan.textContent = LABELS[oi];
    btn.appendChild(iconSpan);
    
    const textSpan = document.createElement('span');
    textSpan.textContent = opt;
    btn.appendChild(textSpan);
    
    if (chosen !== null) {
      btn.disabled = true;
      if (oi === correct) {
        btn.classList.add('correct');
        iconSpan.textContent = '✓';
      }
      if (oi === chosen && chosen !== correct) {
        btn.classList.add('wrong');
        iconSpan.textContent = '✕';
      }
      if (oi === correct && chosen !== correct) {
        btn.classList.add('reveal-correct');
        iconSpan.textContent = '✓';
      }
    }
    
    list.appendChild(btn);
  });
  
  const prevBtn = document.getElementById('prevBtn');
  if (prevBtn) {
    prevBtn.disabled = currentIdx === 0;
  }
  
  const isLast = currentIdx === tot - 1;
  const isAnswered = chosen !== null;
  
  document.getElementById('nextBtn').style.display = (isAnswered && !isLast) ? 'inline-flex' : 'none';
  document.getElementById('finishBtn').style.display = (isAnswered && isLast) ? 'inline-flex' : 'none';
  
  renderNavRibbon();
}

function selectAnswer(chosen) {
  const qi = quizOrder[currentIdx],
    q = questions[qi],
    correct = q.correct;
  userAnswers[qi] = chosen;
  
  saveSession();

  const btns = document.querySelectorAll('.opt-btn');
  btns.forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === correct) {
      btn.classList.add('correct');
      btn.querySelector('.opt-icon').textContent = '✓';
    }
    if (idx === chosen && chosen !== correct) {
      btn.classList.add('wrong');
      btn.querySelector('.opt-icon').textContent = '✕';
    }
    if (idx === correct && chosen !== correct) {
      btn.classList.add('reveal-correct');
      btn.querySelector('.opt-icon').textContent = '✓';
    }
  });
  
  const isLast = currentIdx === questions.length - 1;
  document.getElementById('nextBtn').style.display = isLast ? 'none' : 'inline-flex';
  document.getElementById('finishBtn').style.display = isLast ? 'inline-flex' : 'none';
  
  renderNavRibbon();
}

function nextQuestion() {
  if (currentIdx < questions.length - 1) {
    currentIdx++;
    saveSession();
    renderQuestion();
  }
}

function prevQuestion() {
  if (currentIdx > 0) {
    currentIdx--;
    saveSession();
    renderQuestion();
  }
}

function jumpToQuestion(idx) {
  currentIdx = idx;
  saveSession();
  renderQuestion();
}

function renderNavRibbon() {
  const ribbon = document.getElementById('qNavRibbon');
  if (!ribbon) return;
  ribbon.innerHTML = '';
  
  quizOrder.forEach((qi, idx) => {
    const bubble = document.createElement('button');
    bubble.className = 'q-bubble';
    
    const chosen = userAnswers[qi];
    const correct = questions[qi].correct;
    
    if (idx === currentIdx) {
      bubble.classList.add('active');
    }
    
    if (chosen !== null) {
      if (chosen === correct) {
        bubble.classList.add('correct');
      } else {
        bubble.classList.add('wrong');
      }
    }
    
    bubble.textContent = idx + 1;
    bubble.onclick = () => jumpToQuestion(idx);
    ribbon.appendChild(bubble);
  });
  
  const activeBubble = ribbon.querySelector('.q-bubble.active');
  if (activeBubble) {
    activeBubble.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    });
  }
}

/* ===== RESULTS ===== */
function showResults() {
  const correct = userAnswers.filter((a, i) => a === questions[i].correct).length,
    total = questions.length,
    pct = Math.round(correct / total * 100);
    
  setTimeout(() => {
    const scoreArc = document.getElementById('scoreArc');
    if (scoreArc) {
      scoreArc.style.strokeDashoffset = 2 * Math.PI * 62 * (1 - pct / 100);
    }
  }, 100);
  
  document.getElementById('scoreNum').textContent = `${correct}/${total}`;
  document.getElementById('resultTitle').textContent = pct === 100 ? '🏆 Perfect Score!' : pct >= 70 ? '🎉 Great Job!' : pct >= 40 ? '📚 Keep Practicing' : '💪 Try Again!';
  document.getElementById('resultSub').textContent = `You answered ${correct} out of ${total} correctly (${pct}%)`;
  document.getElementById('progressBar').style.width = '100%';
  
  activeScreen = 'resultsScreen';
  saveSession();
  
  showScreen('resultsScreen');
  renderReview();
}

function renderReview() {
  const list = document.getElementById('reviewList');
  if (!list) return;
  list.innerHTML = '';
  questions.forEach((q, qi) => {
    const chosen = userAnswers[qi],
      isRight = chosen === q.correct;
    if (showWrongOnly && isRight) return;
    const div = document.createElement('div');
    div.className = `review-item ${isRight?'all-correct':'had-wrong'}`;
    div.innerHTML = `<div class="review-q"><span class="review-badge ${isRight?'badge-correct':'badge-wrong'}">${isRight?'✓ Correct':'✗ Wrong'}</span>${escHtml(q.text)}</div><div class="review-answers">${q.options.map((opt,oi)=>{ let cls='r-neutral',icon='○'; if(oi===q.correct){cls='r-correct';icon='✓';} if(oi===chosen&&oi!==q.correct){cls='r-wrong';icon='✗';} return `<div class="review-opt ${cls}"><span class="r-icon">${icon}</span>${LABELS[oi]}. ${escHtml(opt)}</div>`; }).join('')}</div>`;
    list.appendChild(div);
  });
  if (!list.innerHTML) list.innerHTML = '<div style="color:var(--correct);text-align:center;padding:2rem;font-family:\'Syne\',sans-serif;font-weight:700;">✓ All answers correct!</div>';
}

function toggleWrongOnly() {
  showWrongOnly = !showWrongOnly;
  const toggleEl = document.getElementById('wrongToggle');
  if (toggleEl) {
    toggleEl.classList.toggle('on', showWrongOnly);
  }
  saveSession();
  renderReview();
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) {
    target.classList.add('active');
  }
}

function backToSetup() {
  activeScreen = 'setupScreen';
  saveSession();
  showScreen('setupScreen');
  renderSetup();
  initTopicSelector();
}

function restartQuiz() {
  startQuiz();
}

function resetQuiz() {
  localStorage.removeItem(SESSION_KEY);
  selectedTopics.clear();
  questions = [];
  quizOrder = [];
  currentIdx = 0;
  userAnswers = [];
  activeScreen = 'quizScreen';
  initTopicSelector();
  selectAllTopics();
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

// ===== APP INITIALIZATION =====
initTopicSelector();
if (loadSession()) {
  updateTopicUI();
  if (activeScreen === 'quizScreen') {
    showScreen('quizScreen');
    renderQuestion();
  } else if (activeScreen === 'resultsScreen') {
    showResults();
  } else {
    showScreen('setupScreen');
    renderSetup();
  }
} else {
  selectAllTopics();
  startQuiz();
}