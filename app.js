const app = document.querySelector("#app");
const sets = window.QUIZ_SETS;
const resultStorageKey = "rossella-cardiology-results-v2";
const wrongStorageKey = "rossella-cardiology-wrong-notes-v1";
const historyStorageKey = "rossella-cardiology-history-v1";
const allQuestions = Object.values(sets).flat();
const questionsById = new Map(allQuestions.map(question => [question.id, question]));
let session = null;

const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
})[char]);

const normalize = value => String(value)
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function storedObject(key) {
  try { return JSON.parse(localStorage.getItem(key) || "{}"); }
  catch { return {}; }
}

function storedArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function results() {
  return storedObject(resultStorageKey);
}

function saveResult(setId, score, total) {
  const saved = results();
  const previous = saved[setId];
  saved[setId] = { score, total, best: Math.max(score, previous?.best || 0), date: new Date().toISOString() };
  localStorage.setItem(resultStorageKey, JSON.stringify(saved));
}

function attemptHistory() {
  const saved = storedArray(historyStorageKey);
  if (saved.length) return saved;
  const migrated = Object.entries(results()).map(([setId, item], index) => ({
    id: `migrated-${setId}-${index}`,
    date: item.date || new Date().toISOString(),
    setId,
    label: `TEST ${setId}`,
    isReview: false,
    score: item.score,
    total: item.total || 50,
    answers: [],
    migrated: true,
  }));
  if (migrated.length) localStorage.setItem(historyStorageKey, JSON.stringify(migrated));
  return migrated;
}

function saveAttempt() {
  const history = attemptHistory();
  history.unshift({
    id: `${Date.now()}-${session.setId}`,
    date: new Date().toISOString(),
    setId: session.setId,
    label: session.label,
    isReview: session.isReview,
    score: session.score,
    total: session.questions.length,
    answers: session.answers,
  });
  localStorage.setItem(historyStorageKey, JSON.stringify(history.slice(0, 100)));
}

function wrongIds() {
  try {
    const ids = JSON.parse(localStorage.getItem(wrongStorageKey) || "[]");
    return [...new Set(ids)].filter(id => questionsById.has(id));
  } catch {
    return [];
  }
}

function saveWrongIds(ids) {
  localStorage.setItem(wrongStorageKey, JSON.stringify([...new Set(ids)]));
}

function addWrong(questionId) {
  saveWrongIds([...wrongIds(), questionId]);
}

function removeWrong(questionId) {
  saveWrongIds(wrongIds().filter(id => id !== questionId));
}

function reviewQuestions() {
  return wrongIds().map(id => questionsById.get(id)).filter(Boolean);
}

function showHome() {
  session = null;
  const saved = results();
  const missed = reviewQuestions();
  app.innerHTML = `
    <section class="hero">
      <div class="hero-inner">
        <span class="eyebrow">29 PDFS · 200 QUESTIONS</span>
        <h1>Study clearly.<br>Remember longer.</h1>
        <p class="lead">Choose one of four 50-question tests. Every question has five options, followed by an immediate explanation and exact source page.</p>
        <div class="hero-meta">
          <span class="pill">200 Multiple Choice</span><span class="pill">5 Options Each</span><span class="pill">Figures Included</span>
        </div>
      </div>
      <div class="sticker-field" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
    </section>
    <section class="set-section">
      <div class="section-heading"><span class="eyebrow">CHOOSE A SET</span><h2>Four tests, plus a personal review set.</h2></div>
      <div class="set-grid" aria-label="Choose a test">
        ${Object.keys(sets).map(id => {
          const item = saved[id];
          return `<button class="set-card" type="button" data-set="${id}">
            <span class="set-letter set-${id.toLowerCase()}">${id}</span><h3>Test Set ${id}</h3>
            <p>50 five-option multiple-choice questions with immediate feedback.</p>
            <span class="set-status">${item ? `Latest ${item.score}/${item.total} · Best ${item.best}/${item.total}` : "Start test →"}</span>
          </button>`;
        }).join("")}
        <button class="set-card review-card" type="button" data-review ${missed.length ? "" : "disabled"}>
          <span class="set-letter review-letter">↺</span>
          <div class="review-card-copy"><h3>Wrong Answer Review</h3><p>${missed.length ? `${missed.length} missed ${missed.length === 1 ? "question" : "questions"} ready to review.` : "Missed questions will appear here automatically."}</p></div>
          <span class="set-status">${missed.length ? "Start review →" : "No missed questions yet"}</span>
        </button>
      </div>
    </section>`;
  document.querySelectorAll("[data-set]").forEach(button => button.addEventListener("click", () => startQuiz(button.dataset.set)));
  document.querySelector("[data-review]")?.addEventListener("click", startReview);
  app.focus();
}

function startQuiz(setId) {
  session = { setId, label: `TEST ${setId}`, questions: sets[setId], index: 0, score: 0, answered: false, isReview: false, answers: [] };
  renderQuestion();
}

function startReview() {
  const questions = reviewQuestions();
  if (!questions.length) return;
  session = { setId: "REVIEW", label: "WRONG ANSWER REVIEW", questions, index: 0, score: 0, answered: false, isReview: true, answers: [] };
  renderQuestion();
}

function renderQuestion() {
  const question = session.questions[session.index];
  const progress = (session.index / session.questions.length) * 100;
  app.innerHTML = `<section class="quiz-shell">
    <div class="quiz-topline"><span class="eyebrow">${session.label}</span><span class="progress-label">Question ${session.index + 1} of ${session.questions.length} · Score ${session.score}</span></div>
    <div class="progress-track" aria-label="Progress"><div class="progress-bar" style="width:${progress}%"></div></div>
    <article class="question-card">
      <div class="question-head"><span class="type-badge">SCELTA MULTIPLA</span><span class="topic">${escapeHtml(question.topic)}</span></div>
      ${question.image ? `<figure class="question-image"><img src="${escapeHtml(question.image)}" alt="${escapeHtml(question.imageAlt)}"><figcaption>Reference figure from the same PDF · Original p.${question.imagePage || question.page}</figcaption></figure>` : ""}
      <h2 class="prompt">${escapeHtml(question.prompt)}</h2>
      <div class="answer-area" id="answerArea">
        <div class="mcq-grid">${question.options.map((option, index) => `<button class="mcq-button" type="button" data-option="${escapeHtml(option)}"><span>${String.fromCharCode(65 + index)}</span>${escapeHtml(option)}</button>`).join("")}</div>
      </div>
    </article>
  </section>`;
  session.answered = false;
  document.querySelectorAll("[data-option]").forEach(button => button.addEventListener("click", () => grade(button.dataset.option)));
  app.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function grade(given) {
  if (session.answered) return;
  session.answered = true;
  const question = session.questions[session.index];
  const correct = normalize(given) === normalize(question.answer);
  if (correct) {
    session.score += 1;
    if (session.isReview) removeWrong(question.id);
  } else {
    addWrong(question.id);
  }
  session.answers.push({ id: question.id, correct, chosen: given });

  document.querySelectorAll("[data-option]").forEach(button => {
    button.disabled = true;
    if (normalize(button.dataset.option) === normalize(question.answer)) button.classList.add("correct-choice");
    if (!correct && normalize(button.dataset.option) === normalize(given)) button.classList.add("selected-wrong");
  });

  const feedback = document.createElement("div");
  feedback.className = `feedback ${correct ? "correct" : "incorrect"}`;
  feedback.setAttribute("role", "status");
  feedback.innerHTML = `<div class="feedback-title">${correct ? "Correct" : "Added to Wrong Answer Review"}</div>
    <div class="feedback-answer">Correct answer: ${escapeHtml(question.displayAnswer)}</div>
    <p class="explanation">${escapeHtml(question.explanation)}</p>
    <div class="citation"><strong>Source</strong><br>${escapeHtml(question.source)} · Original PDF p.${question.page}</div>`;
  document.querySelector("#answerArea").append(feedback);
  const row = document.createElement("div");
  row.className = "next-row";
  row.innerHTML = `<button class="primary-button" id="nextButton" type="button">${session.index === session.questions.length - 1 ? "View results" : "Next question →"}</button>`;
  document.querySelector(".question-card").append(row);
  document.querySelector("#nextButton").addEventListener("click", nextQuestion);
  document.querySelector("#nextButton").focus();
}

function nextQuestion() {
  if (session.index < session.questions.length - 1) {
    session.index += 1;
    renderQuestion();
  } else {
    saveAttempt();
    if (!session.isReview) saveResult(session.setId, session.score, session.questions.length);
    renderResult();
  }
}

function renderResult() {
  const total = session.questions.length;
  const percent = Math.round((session.score / total) * 100);
  const remaining = reviewQuestions().length;
  const title = session.isReview ? "Review complete." : "Test complete.";
  const message = session.isReview
    ? (remaining ? `${remaining} ${remaining === 1 ? "question remains" : "questions remain"} in your Wrong Answer Review.` : "You cleared every question in your Wrong Answer Review.")
    : (percent >= 80 ? "Great result. Any missed questions are ready in your personal review set." : "Review the explanations, then use Wrong Answer Review to reinforce the missed concepts.");
  app.innerHTML = `<section class="result-card">
    <span class="eyebrow">${session.label} COMPLETE</span><h1 class="result-title">${title}</h1>
    <div class="score-ring" style="--score-angle:${percent * 3.6}deg"><strong>${session.score}/${total}</strong></div>
    <p class="lead result-copy">${message}</p>
    <div class="result-actions">
      ${session.isReview && remaining ? `<button class="primary-button" id="reviewAgainButton">Review remaining</button>` : (!session.isReview ? `<button class="primary-button" id="retryButton">Retry this test</button>` : "")}
      <button class="ghost-button" id="allSetsButton">Back to test selection</button>
    </div>
  </section>`;
  document.querySelector("#retryButton")?.addEventListener("click", () => startQuiz(session.setId));
  document.querySelector("#reviewAgainButton")?.addEventListener("click", startReview);
  document.querySelector("#allSetsButton").addEventListener("click", showHome);
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

function analytics() {
  const history = attemptHistory();
  const tests = history.filter(item => !item.isReview);
  const reviews = history.filter(item => item.isReview);
  const scoredTests = tests.filter(item => Number(item.total) > 0);
  const average = scoredTests.length
    ? Math.round(scoredTests.reduce((sum, item) => sum + (item.score / item.total) * 100, 0) / scoredTests.length)
    : 0;
  const best = scoredTests.length
    ? Math.max(...scoredTests.map(item => Math.round((item.score / item.total) * 100)))
    : 0;
  const questionStats = new Map();
  const topicStats = new Map();

  tests.forEach(attempt => {
    (attempt.answers || []).forEach(answer => {
      const question = questionsById.get(answer.id);
      if (!question) return;
      const questionRow = questionStats.get(answer.id) || { id: answer.id, attempts: 0, wrong: 0, question };
      questionRow.attempts += 1;
      if (!answer.correct) questionRow.wrong += 1;
      questionStats.set(answer.id, questionRow);

      const topic = question.topic || "Other";
      const topicRow = topicStats.get(topic) || { topic, attempts: 0, wrong: 0 };
      topicRow.attempts += 1;
      if (!answer.correct) topicRow.wrong += 1;
      topicStats.set(topic, topicRow);
    });
  });

  const mostMissed = [...questionStats.values()]
    .filter(row => row.wrong > 0)
    .sort((a, b) => b.wrong - a.wrong || (b.wrong / b.attempts) - (a.wrong / a.attempts))
    .slice(0, 10);
  const weakTopics = [...topicStats.values()]
    .filter(row => row.wrong > 0)
    .map(row => ({ ...row, accuracy: Math.round(((row.attempts - row.wrong) / row.attempts) * 100) }))
    .sort((a, b) => a.accuracy - b.accuracy || b.wrong - a.wrong)
    .slice(0, 8);
  const recentTests = tests.slice(0, 6).reverse();
  return { history, tests, reviews, average, best, mostMissed, weakTopics, recentTests };
}

function adviceFor(data) {
  if (!data.tests.length) {
    return ["Complete one of the 50-question tests to generate personalized study advice."];
  }
  const advice = [];
  if (data.weakTopics.length) {
    const weakest = data.weakTopics[0];
    advice.push(`Prioritize “${weakest.topic}”. Your recorded accuracy in this area is ${weakest.accuracy}%. Re-read the cited PDF pages before another attempt.`);
  }
  const repeated = data.mostMissed.filter(row => row.wrong >= 2);
  if (repeated.length) {
    advice.push(`${repeated.length} ${repeated.length === 1 ? "question has" : "questions have"} been missed more than once. Review these first and explain each answer aloud before retrying.`);
  }
  if (data.average < 60) {
    advice.push("Use shorter sessions: review one topic, complete 10–15 questions, then revisit the same material the next day.");
  } else if (data.average < 80) {
    advice.push("Your foundation is developing. Focus on the two weakest topics and use Wrong Answer Review after every full test.");
  } else {
    advice.push("Your overall accuracy is strong. Shift attention to repeated misses and keep a spaced review interval of 2–3 days.");
  }
  if (wrongIds().length) {
    advice.push(`You currently have ${wrongIds().length} ${wrongIds().length === 1 ? "question" : "questions"} waiting in Wrong Answer Review.`);
  }
  return advice;
}

function questionSummary(question) {
  const text = question.prompt.replace(/^.*?\n/, "").replace(/_+/g, "…");
  return text.length > 170 ? `${text.slice(0, 167)}…` : text;
}

function renderHistory(showDetails = false) {
  const target = document.querySelector("#historyContent");
  const data = analytics();
  if (!data.history.length) {
    target.innerHTML = `<div class="history-empty"><span class="set-letter review-letter">↗</span><h3>No completed tests yet</h3><p>Complete a test to see scores, trends, weak areas, and personalized recommendations.</p></div>`;
    return;
  }

  const trend = data.recentTests.length
    ? `<div class="trend-chart" aria-label="Recent accuracy trend">${data.recentTests.map(item => {
        const percent = Math.round((item.score / item.total) * 100);
        return `<div class="trend-column"><span style="height:${Math.max(8, percent)}%"></span><small>${item.setId}<br>${percent}%</small></div>`;
      }).join("")}</div>`
    : `<p class="muted-note">Complete a full test to begin the score trend.</p>`;

  target.innerHTML = `
    <div class="history-summary">
      <div class="metric-card"><small>Completed tests</small><strong>${data.tests.length}</strong></div>
      <div class="metric-card"><small>Average accuracy</small><strong>${data.average}%</strong></div>
      <div class="metric-card"><small>Best accuracy</small><strong>${data.best}%</strong></div>
      <div class="metric-card"><small>Review rounds</small><strong>${data.reviews.length}</strong></div>
    </div>
    <section class="history-section"><div class="history-section-head"><div><span class="eyebrow">RECENT TREND</span><h3>Accuracy over time</h3></div></div>${trend}</section>
    <section class="history-section">
      <div class="history-section-head"><div><span class="eyebrow">ATTEMPT LOG</span><h3>When and how you scored</h3></div></div>
      <div class="attempt-list">${data.history.slice(0, 12).map(item => {
        const percent = Math.round((item.score / item.total) * 100);
        return `<div class="attempt-row"><div><strong>${escapeHtml(item.isReview ? "Wrong Answer Review" : `Test Set ${item.setId}`)}</strong><small>${formatDate(item.date)}${item.migrated ? " · Imported summary" : ""}</small></div><span>${item.score}/${item.total} · ${percent}%</span></div>`;
      }).join("")}</div>
    </section>
    <button class="primary-button history-more" id="historyMoreButton" type="button">${showDetails ? "Hide detailed analysis" : "Show detailed analysis"}</button>
    ${showDetails ? `
      <section class="history-section analysis-section">
        <div class="history-section-head"><div><span class="eyebrow">WEAK AREAS</span><h3>Topic accuracy</h3></div></div>
        ${data.weakTopics.length ? `<div class="topic-list">${data.weakTopics.map(row => `<div class="topic-row"><div><strong>${escapeHtml(row.topic)}</strong><small>${row.wrong} missed of ${row.attempts} attempts</small></div><span class="accuracy-pill">${row.accuracy}%</span></div>`).join("")}</div>` : `<p class="muted-note">Detailed topic statistics will appear after a newly completed test.</p>`}
      </section>
      <section class="history-section">
        <div class="history-section-head"><div><span class="eyebrow">MOST MISSED</span><h3>Questions to revisit first</h3></div></div>
        ${data.mostMissed.length ? `<div class="missed-list">${data.mostMissed.map(row => `<article class="missed-row"><div><strong>${row.wrong}× missed</strong><p>${escapeHtml(questionSummary(row.question))}</p><small>${escapeHtml(row.question.source)} · p.${row.question.page}</small></div></article>`).join("")}</div>` : `<p class="muted-note">No question-level data is available yet.</p>`}
      </section>
      <section class="advice-card"><span class="eyebrow">STUDY RECOMMENDATIONS</span><h3>Your next best steps</h3><ul>${adviceFor(data).map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>
    ` : ""}`;
  document.querySelector("#historyMoreButton")?.addEventListener("click", () => renderHistory(!showDetails));
}

function openHistory() {
  renderHistory(false);
  document.querySelector("#historyDialog").showModal();
}

document.querySelector("#homeButton").addEventListener("click", showHome);
document.querySelector("#historyButton").addEventListener("click", openHistory);
document.querySelector("#closeHistory").addEventListener("click", () => document.querySelector("#historyDialog").close());
showHome();
