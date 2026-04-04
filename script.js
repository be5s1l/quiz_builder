const STORAGE_KEY = 'insight_flow_quizzes';

let quizzes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let activeScreen = 'dashboard-screen';

// Editor State
let editorQuizId = null;
let currentQuestionIndex = 0;

// Taking State
let takingQuizId = null;
let takingCurrentIndex = 0;
let userAnswers = [];

// Results State
let showWrongOnly = false;

// ----------------------------------------------------------------------
// UTILS
// ----------------------------------------------------------------------
function saveQuizzes() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quizzes));
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    activeScreen = screenId;
    
    if (screenId === 'dashboard-screen') {
        renderDashboard();
    }
}

// ----------------------------------------------------------------------
// DASHBOARD
// ----------------------------------------------------------------------
function renderDashboard() {
    const list = document.getElementById('dashboard-quiz-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    quizzes.forEach(quiz => {
        const publishedHtml = quiz.status === 'Published' 
            ? '<span class="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-[10px] font-bold uppercase tracking-widest">Published</span>'
            : '<span class="px-3 py-1 bg-surface-container-high text-on-surface-variant rounded-full text-[10px] font-bold uppercase tracking-widest">Draft</span>';
            
        const continueBtn = quiz.status === 'Draft' 
            ? `<button onclick="editQuiz('${quiz.id}')" class="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-sm active:scale-95 transition-all">Continue Building</button>`
            : `<button onclick="startTakingQuiz('${quiz.id}')" class="p-2 rounded-lg text-primary hover:bg-surface-container-low transition-all"><span class="material-symbols-outlined">play_arrow</span></button>
               <button onclick="editQuiz('${quiz.id}')" class="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-all"><span class="material-symbols-outlined">edit</span></button>`;
        
        const card = document.createElement('div');
        card.className = "bg-surface-container-lowest rounded-3xl p-6 flex flex-col md:flex-row gap-6 hover:shadow-xl hover:shadow-primary/5 transition-all";
        card.innerHTML = `
            <div class="w-full md:w-32 h-32 rounded-2xl overflow-hidden bg-surface-container-low shrink-0 flex items-center justify-center relative">
                ${quiz.status === 'Draft' ? '<div class="absolute inset-0 bg-on-background/20 flex items-center justify-center"><span class="material-symbols-outlined text-on-primary text-3xl">edit</span></div>' : ''}
                <span class="material-symbols-outlined text-4xl text-on-surface-variant opacity-50">quiz</span>
            </div>
            <div class="flex-1 flex flex-col justify-between py-1">
                <div>
                    <div class="flex items-center justify-between mb-2">
                        ${publishedHtml}
                        <div class="flex items-center gap-2">
                             <span class="text-xs text-on-surface-variant">Created ${new Date(quiz.createdAt).toLocaleDateString()}</span>
                             <button onclick="deleteQuiz('${quiz.id}')" class="text-error hover:text-error-dim transition-all text-sm material-symbols-outlined">delete</button>
                        </div>
                    </div>
                    <h4 class="text-xl font-bold text-on-surface mb-1">${quiz.title || 'Untitled Quiz'}</h4>
                    <p class="text-sm text-on-surface-variant">${quiz.questions.length} questions included.</p>
                </div>
                <div class="mt-4 flex items-center justify-between">
                    <div class="flex items-center gap-4 text-xs font-bold text-on-surface-variant">
                        <span class="flex items-center gap-1"><span class="material-symbols-outlined text-sm">question_mark</span> ${quiz.questions.length} Qs</span>
                    </div>
                    <div class="flex gap-2">
                        ${continueBtn}
                    </div>
                </div>
            </div>
        `;
        list.appendChild(card);
    });
    
    // Add inside grid
    const addCard = document.createElement('div');
    addCard.onclick = startQuizEditor;
    addCard.className = "bg-surface-container-low border-2 border-dashed border-outline-variant rounded-3xl p-6 flex items-center justify-center group cursor-pointer hover:bg-surface-container-high hover:border-primary transition-all";
    addCard.innerHTML = `
        <div class="flex flex-col items-center gap-4">
            <div class="w-16 h-16 rounded-full bg-surface-container-lowest flex items-center justify-center group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined text-3xl text-primary">add_circle</span>
            </div>
            <span class="text-lg font-bold text-on-surface-variant group-hover:text-primary">Launch New Project</span>
        </div>
    `;
    list.appendChild(addCard);
}

function deleteQuiz(id) {
    if(confirm("Are you sure you want to delete this quiz?")) {
        quizzes = quizzes.filter(q => q.id !== id);
        saveQuizzes();
        renderDashboard();
    }
}

// ----------------------------------------------------------------------
// EDITOR
// ----------------------------------------------------------------------
function getEditorQuiz() {
    return quizzes.find(q => q.id === editorQuizId);
}

function startQuizEditor() {
    editorQuizId = generateId();
    currentQuestionIndex = 0;
    
    quizzes.push({
        id: editorQuizId,
        title: 'New Quiz',
        createdAt: new Date().toISOString(),
        status: 'Draft',
        questions: [{ text: '', options: ['', '', '', ''], correctIndex: 0 }]
    });
    
    saveQuizzes();
    renderEditor();
    showScreen('editor-screen');
}

function editQuiz(id) {
    editorQuizId = id;
    currentQuestionIndex = 0;
    renderEditor();
    showScreen('editor-screen');
}

function renderEditor() {
    const quiz = getEditorQuiz();
    if (!quiz) return showScreen('dashboard-screen');
    
    renderEditorSidebar(quiz);
    if (quiz.questions.length > 0) {
        renderEditorMainArea(quiz);
        renderEditorLivePreview(quiz);
    } else {
        document.getElementById('editor-main-area').innerHTML = '<div class="text-center p-12 text-on-surface-variant">No questions. Add one to start.</div>';
        document.getElementById('editor-live-preview').style.display = 'none';
    }
}

function renderEditorSidebar(quiz) {
    const sidebar = document.getElementById('editor-sidebar-list');
    sidebar.innerHTML = '<div class="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold px-3 mb-4 opacity-50">Quiz Outline</div>';
    
    // Add title edit box at the top
    sidebar.innerHTML += `
        <div class="px-3 mb-6">
            <label class="block text-[10px] font-bold text-on-surface-variant mb-1 uppercase">Quiz Title</label>
            <input type="text" onchange="updateQuizTitle(event.target.value)" value="${quiz.title}" class="w-full bg-surface-container-low border-none rounded-lg p-2 text-sm font-bold text-on-surface focus:ring-1 focus:ring-primary" placeholder="Quiz Title" />
        </div>
        <div class="px-3 mb-4 flex gap-2">
             <button onclick="publishQuiz()" class="flex-1 bg-primary text-on-primary py-2 rounded-lg font-bold text-xs hover:scale-95 transition-all shadow-md">Publish</button>
             <button onclick="saveAsDraft()" class="flex-1 bg-surface-container-high text-on-surface py-2 rounded-lg font-bold text-xs hover:bg-surface-variant transition-all">Save</button>
        </div>
    `;

    quiz.questions.forEach((q, idx) => {
        const isActive = idx === currentQuestionIndex;
        const btnClass = isActive 
            ? "w-full flex items-center justify-between px-3 py-3 text-sm font-bold text-[#4a40e0] dark:text-[#9795ff] bg-surface-container-lowest rounded-xl shadow-sm transition-all duration-150"
            : "w-full flex items-center justify-between px-3 py-3 text-sm font-medium text-[#5a5781] dark:text-[#aca8d7] hover:bg-[#e3dfff] dark:hover:bg-[#2d283e] rounded-xl transition-all";
            
        const btn = document.createElement('button');
        btn.className = btnClass;
        btn.onclick = () => { currentQuestionIndex = idx; renderEditor(); };
        btn.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-[20px]">${isActive ? 'quiz' : 'help'}</span>
                Question ${idx + 1}
            </div>
            <span class="material-symbols-outlined text-sm hover:text-error" onclick="event.stopPropagation(); deleteQuestion(${idx})">delete</span>
        `;
        sidebar.appendChild(btn);
    });
}

function renderEditorMainArea(quiz) {
    const q = quiz.questions[currentQuestionIndex];
    if(!q) return;

    const mainArea = document.getElementById('editor-main-area');
    mainArea.innerHTML = `
        <section class="space-y-6">
            <div class="flex justify-between items-end">
                <div>
                    <span class="text-primary font-bold text-sm tracking-wider uppercase">Editing Question ${currentQuestionIndex + 1}</span>
                    <h1 class="text-3xl font-extrabold text-on-surface mt-1">Refine your inquiry</h1>
                </div>
            </div>
            <div class="bg-surface-container-lowest p-8 rounded-3xl shadow-[0_40px_60px_-15px_rgba(74,64,224,0.06)]">
                <label class="block text-xs font-bold text-on-surface-variant mb-3 uppercase tracking-tight">Question Text</label>
                <textarea oninput="updateQuestionText(event.target.value)" class="w-full bg-surface-container-low border-none rounded-2xl p-6 text-xl font-headline font-semibold text-on-surface placeholder:text-on-surface-variant/40 focus:ring-2 focus:ring-primary transition-all" placeholder="Enter your question here..." rows="3">${q.text}</textarea>
            </div>
        </section>
        
        <section class="space-y-6">
            <div class="flex items-center justify-between">
                <h2 class="text-xl font-bold text-on-surface">Answer Choices</h2>
                <button onclick="addCurrentQuestionChoice()" class="flex items-center gap-2 text-primary font-bold text-sm px-4 py-2 hover:bg-primary-container/20 rounded-xl transition-all">
                    <span class="material-symbols-outlined text-lg">add</span> Add Choice
                </button>
            </div>
            <div class="grid grid-cols-1 gap-4" id="editor-choices-list"></div>
        </section>
    `;

    const choicesList = document.getElementById('editor-choices-list');
    q.options.forEach((opt, idx) => {
        const isCorrect = q.correctIndex === idx;
        const choice = document.createElement('div');
        choice.className = `group flex items-center gap-6 bg-surface-container-lowest p-5 rounded-2xl border-2 ${isCorrect ? 'border-primary' : 'border-transparent hover:border-primary/20'} transition-all`;
        
        choice.innerHTML = `
            <div class="relative flex items-center justify-center">
                <input onchange="setCorrectChoice(${idx})" ${isCorrect ? 'checked' : ''} class="w-6 h-6 text-primary border-outline-variant focus:ring-primary ring-offset-background bg-surface-container-low cursor-pointer" name="correct_answer" type="radio"/>
                <span class="absolute -top-6 text-[10px] font-black text-primary ${isCorrect ? 'opacity-100' : 'opacity-0'} transition-opacity">CORRECT</span>
            </div>
            <div class="flex-1">
                <input oninput="updateChoiceText(${idx}, event.target.value)" class="w-full bg-transparent border-none p-0 text-on-surface font-medium focus:ring-0" type="text" placeholder="Option text..." value="${opt}"/>
            </div>
            <button onclick="deleteChoice(${idx})" class="p-2 text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity hover:text-error">
                <span class="material-symbols-outlined">delete</span>
            </button>
        `;
        choicesList.appendChild(choice);
    });
}

function renderEditorLivePreview(quiz) {
    const preview = document.getElementById('editor-live-preview');
    preview.style.display = 'block';
    const q = quiz.questions[currentQuestionIndex];
    if(!q) return;

    const percentage = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;
    
    let choicesHtml = '';
    q.options.forEach((opt, idx) => {
        if (q.correctIndex === idx) {
            choicesHtml += `<div class="p-2.5 bg-primary/10 rounded-lg text-[11px] font-bold text-primary flex items-center gap-2 line-clamp-1"><span class="material-symbols-outlined text-[14px]">check_circle</span>${opt || '...'}</div>`;
        } else {
            choicesHtml += `<div class="p-2.5 bg-surface-container-low rounded-lg text-[11px] text-on-surface-variant line-clamp-1">${opt || '...'}</div>`;
        }
    });

    preview.innerHTML = `
        <div class="flex items-center justify-between mb-6">
            <span class="text-xs font-bold text-primary uppercase tracking-tighter">Live Preview</span>
            <span class="material-symbols-outlined text-primary-container" style="font-variation-settings: 'FILL' 1;">visibility</span>
        </div>
        <div class="space-y-4">
            <div class="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                <div class="h-full bg-primary rounded-full transition-all" style="width: ${percentage}%"></div>
            </div>
            <div class="text-[11px] font-bold text-on-surface-variant mb-4">Question ${currentQuestionIndex + 1} of ${quiz.questions.length}</div>
            <div class="space-y-3">
                <div class="p-3 bg-surface-container-lowest rounded-xl shadow-sm border border-primary/10">
                    <p class="text-[13px] font-semibold text-on-surface leading-tight">${q.text || '...'}</p>
                </div>
                <div class="grid grid-cols-1 gap-2">${choicesHtml}</div>
            </div>
        </div>
    `;
}

function updateQuizTitle(val) {
    const quiz = getEditorQuiz();
    if(quiz) {
        quiz.title = val;
        saveQuizzes();
    }
}

function addQuestion() {
    const quiz = getEditorQuiz();
    if(!quiz) return;
    quiz.questions.push({ text: '', options: ['', '', '', ''], correctIndex: 0 });
    currentQuestionIndex = quiz.questions.length - 1;
    saveQuizzes();
    renderEditor();
}

function deleteQuestion(idx) {
    const quiz = getEditorQuiz();
    if(!quiz || quiz.questions.length <= 1) return alert("You must have at least one question.");
    quiz.questions.splice(idx, 1);
    if(currentQuestionIndex >= quiz.questions.length) {
        currentQuestionIndex = quiz.questions.length - 1;
    }
    saveQuizzes();
    renderEditor();
}

function updateQuestionText(val) {
    const quiz = getEditorQuiz();
    if(quiz) {
        quiz.questions[currentQuestionIndex].text = val;
        saveQuizzes();
        renderEditorLivePreview(quiz); // Only update preview to avoid losing focus
    }
}

function updateChoiceText(idx, val) {
    const quiz = getEditorQuiz();
    if(quiz) {
        quiz.questions[currentQuestionIndex].options[idx] = val;
        saveQuizzes();
        renderEditorLivePreview(quiz); // Only update preview
    }
}

function setCorrectChoice(idx) {
    const quiz = getEditorQuiz();
    if(quiz) {
        quiz.questions[currentQuestionIndex].correctIndex = idx;
        saveQuizzes();
        renderEditor(); // Full re-render to update radio buttons and styling
    }
}

function addCurrentQuestionChoice() {
    const quiz = getEditorQuiz();
    if(quiz) {
        quiz.questions[currentQuestionIndex].options.push('');
        saveQuizzes();
        renderEditor();
    }
}

function deleteChoice(idx) {
    const quiz = getEditorQuiz();
    if(quiz) {
        const q = quiz.questions[currentQuestionIndex];
        if(q.options.length <= 2) return alert("You must have at least 2 options.");
        q.options.splice(idx, 1);
        if(q.correctIndex >= q.options.length) {
            q.correctIndex = 0;
        } else if (q.correctIndex > idx) {
            q.correctIndex--;
        }
        saveQuizzes();
        renderEditor();
    }
}

function publishQuiz() {
    const quiz = getEditorQuiz();
    if(quiz) {
        quiz.status = 'Published';
        saveQuizzes();
        showScreen('dashboard-screen');
    }
}

function saveAsDraft() {
    const quiz = getEditorQuiz();
    if(quiz) {
        quiz.status = 'Draft';
        saveQuizzes();
        showScreen('dashboard-screen');
    }
}

// ----------------------------------------------------------------------
// TAKING QUIZ
// ----------------------------------------------------------------------
function getTakingQuiz() {
    return quizzes.find(q => q.id === takingQuizId);
}

function startTakingQuiz(id) {
    takingQuizId = id;
    takingCurrentIndex = 0;
    userAnswers = [];
    renderTakingScreen();
    showScreen('taking-screen');
}

function renderTakingScreen() {
    const quiz = getTakingQuiz();
    if (!quiz || takingCurrentIndex >= quiz.questions.length) {
        return finishQuiz();
    }

    const q = quiz.questions[takingCurrentIndex];
    const percentage = ((takingCurrentIndex) / quiz.questions.length) * 100;
    
    document.getElementById('taking-question-title').innerText = `Question ${takingCurrentIndex + 1} of ${quiz.questions.length}`;
    document.getElementById('taking-progress-text').innerText = `${Math.round(percentage)}% complete`;
    document.getElementById('taking-progress-bar').style.width = `${percentage}%`;
    document.getElementById('taking-question-text').innerText = q.text;

    // Insight (randomly static for mock)
    document.getElementById('taking-pro-insight').innerText = "Take your time and read carefully. You bypass cognitive bias by evaluating every option neutrally.";

    const container = document.getElementById('taking-choices-container');
    container.innerHTML = '';
    
    const userSelected = userAnswers[takingCurrentIndex];

    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
    
    q.options.forEach((opt, idx) => {
        const isSelected = userSelected === idx;
        const btn = document.createElement('button');
        
        btn.className = isSelected 
            ? "group relative flex flex-col items-start p-6 rounded-xl text-left bg-surface-container-lowest ring-2 ring-primary transition-all duration-200"
            : "group relative flex flex-col items-start p-6 rounded-xl text-left bg-surface-container-lowest hover:bg-surface-container-high transition-all duration-200 focus:outline-none";
            
        btn.onclick = () => {
            userAnswers[takingCurrentIndex] = idx;
            renderTakingScreen();
        };

        const checkHtml = isSelected 
            ? `<div class="absolute top-4 right-4 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                 <span class="material-symbols-outlined text-white text-sm" style="font-variation-settings: 'wght' 700;">check</span>
               </div>`
            : '';

        const labelColorHtml = isSelected 
            ? `<span class="font-label text-primary-dim font-bold text-xs mb-3 tracking-widest">OPTION ${labels[idx]}</span>`
            : `<span class="font-label text-on-surface-variant font-bold text-xs mb-3 tracking-widest">OPTION ${labels[idx]}</span>`;
            
        const textStyling = isSelected 
            ? `<p class="font-body text-lg font-semibold text-on-surface">${opt}</p>`
            : `<p class="font-body text-lg font-medium text-on-surface">${opt}</p>`;

        btn.innerHTML = checkHtml + labelColorHtml + textStyling;
        container.appendChild(btn);
    });
}

function takingNextQuestion() {
    const quiz = getTakingQuiz();
    if(userAnswers[takingCurrentIndex] === undefined) {
        return alert("Please select an answer.");
    }
    takingCurrentIndex++;
    if(takingCurrentIndex >= quiz.questions.length) {
        finishQuiz();
    } else {
        renderTakingScreen();
    }
}

// ----------------------------------------------------------------------
// RESULTS SCREEN
// ----------------------------------------------------------------------
function finishQuiz() {
    renderResults();
    showScreen('results-screen');
}

function renderResults() {
    const quiz = getTakingQuiz();
    if(!quiz) return;
    
    let correctCount = 0;
    quiz.questions.forEach((q, idx) => {
        if(userAnswers[idx] === q.correctIndex) correctCount++;
    });
    
    const percentage = correctCount / quiz.questions.length;
    
    document.getElementById('resultSub').innerText = `You got ${correctCount} out of ${quiz.questions.length} correct`;
    document.getElementById('scoreNum').innerText = `${correctCount}/${quiz.questions.length}`;
    
    // Circle animation logic
    // length is 389.6 (pi * r*2 -> 3.14 * 124 ≈ 389.5)
    setTimeout(() => {
        const offset = 389.6 - (389.6 * percentage);
        document.getElementById('scoreArc').style.strokeDashoffset = offset;
    }, 100);

    const reviewList = document.getElementById('reviewList');
    reviewList.innerHTML = '';
    
    quiz.questions.forEach((q, idx) => {
        const selected = userAnswers[idx];
        const isCorrect = selected === q.correctIndex;
        
        if (showWrongOnly && isCorrect) return;

        const el = document.createElement('div');
        el.className = "bg-surface-container-lowest p-6 rounded-2xl w-full text-left";
        
        let answersHtml = '';
        q.options.forEach((opt, optIdx) => {
            let styling = "text-on-surface-variant";
            let icon = "";
            
            if (optIdx === q.correctIndex) {
                 styling = "text-primary font-bold bg-primary/10 px-2 py-1 rounded-md";
                 icon = '<span class="material-symbols-outlined text-sm inline-block mr-1 align-middle">check_circle</span>';
            } else if (optIdx === selected) {
                 styling = "text-error font-medium bg-error/10 px-2 py-1 rounded-md line-through";
                 icon = '<span class="material-symbols-outlined text-sm inline-block mr-1 align-middle">cancel</span>';
            }
            
            answersHtml += `<div class="${styling} text-sm mb-1">${icon} ${opt}</div>`;
        });
        
        el.innerHTML = `
            <h4 class="font-headline font-bold text-on-surface mb-3">${idx + 1}. ${q.text}</h4>
            <div class="pl-2 border-l-2 border-surface-container-highest space-y-2">
                ${answersHtml}
            </div>
        `;
        
        reviewList.appendChild(el);
    });
}

function toggleWrongOnly() {
    showWrongOnly = document.getElementById('wrongOnlyToggle').checked;
    renderResults();
}

// ----------------------------------------------------------------------
// INIT
// ----------------------------------------------------------------------

// If no quizzes at all, create a demo one for show
if (quizzes.length === 0) {
    quizzes.push({
        id: generateId(),
        title: "Demo Quiz: Architecture Basics",
        createdAt: new Date().toISOString(),
        status: 'Published',
        questions: [
            {
                text: "What is the primary purpose of fluid grids in web architecture?",
                options: ["To rigidly align all items vertically", "To adapt to various screen sizes seamlessly", "To increase page load times", "To enforce strict symmetry"],
                correctIndex: 1
            },
            {
                text: "Which of the following describes 'negative space'?",
                options: ["Areas of a design that have dark background colors", "The unused area around UI elements that provides breathing room", "Gaps in CSS properties", "An outdated UX pattern"],
                correctIndex: 1
            }
        ]
    });
    saveQuizzes();
}

// Boot up
document.addEventListener('DOMContentLoaded', () => {
    showScreen('dashboard-screen');
});

// Polyfill functions so HTML attributes onclick don't fail without window scope
window.showScreen = showScreen;
window.startQuizEditor = startQuizEditor;
window.editQuiz = editQuiz;
window.deleteQuiz = deleteQuiz;
window.addQuestion = addQuestion;
window.deleteQuestion = deleteQuestion;
window.addCurrentQuestionChoice = addCurrentQuestionChoice;
window.deleteChoice = deleteChoice;
window.updateQuizTitle = updateQuizTitle;
window.updateQuestionText = updateQuestionText;
window.updateChoiceText = updateChoiceText;
window.setCorrectChoice = setCorrectChoice;
window.publishQuiz = publishQuiz;
window.saveAsDraft = saveAsDraft;
window.startTakingQuiz = startTakingQuiz;
window.takingNextQuestion = takingNextQuestion;
window.toggleWrongOnly = toggleWrongOnly;