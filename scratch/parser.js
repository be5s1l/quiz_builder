const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, 'questions.txt'), 'utf-8');
const lines = content.split(/\r?\n/);

const lectures = {};
let currentLecture = '';
let currentQuestion = null;
let nextIsCorrect = false;

function commitQuestion() {
  if (currentQuestion && currentQuestion.text && currentQuestion.options.length === 4) {
    lectures[currentLecture].push(currentQuestion);
  }
  currentQuestion = null;
  nextIsCorrect = false;
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  // Check if line defines a new lecture / category
  if (line.startsWith('Lecture') || line.startsWith('Marketing Mix MCQs')) {
    commitQuestion();
    currentLecture = line;
    lectures[currentLecture] = [];
    continue;
  }

  if (!currentLecture) continue;

  // Check for question line: e.g. "1) Which of the..." or "1. Which of the..."
  const qm = line.match(/^(\d+)[.)]\s+(.+)/);
  if (qm) {
    commitQuestion();
    currentQuestion = {
      text: qm[2].trim(),
      options: [],
      correct: 0
    };
    continue;
  }

  if (line === '*') {
    nextIsCorrect = true;
    continue;
  }

  if (currentQuestion && currentQuestion.options.length < 4) {
    currentQuestion.options.push(line);
    if (nextIsCorrect) {
      currentQuestion.correct = currentQuestion.options.length - 1;
      nextIsCorrect = false;
    }
  }
}

// Commit the last question
commitQuestion();

// Generate the JS file content
const outputJs = `// Preloaded Static Quiz Questions Database
const LECTURE_DATA = ${JSON.stringify(lectures, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '..', 'questions-data.js'), outputJs, 'utf-8');
console.log('Successfully generated questions-data.js!');
Object.keys(lectures).forEach(lec => {
  console.log(`- ${lec}: ${lectures[lec].length} questions`);
});
