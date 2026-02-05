// index.js

// ---------- Elements ----------
const typeInput = document.querySelector(".type-input");
const wordEl = document.querySelector(".word");

const guessLeftEl = document.querySelector(".guess-left");
const mistakeCountEl = document.querySelector(".mistake-count");
const wrongLettersEl = document.querySelector(".wrong-letters");
const hintTextEl = document.querySelector(".hint-text");

const resetBtn = document.getElementById("resetBtn");
const hintBtn = document.getElementById("hintBtn");
const difficultySel = document.getElementById("difficulty");
const categorySel = document.getElementById("category");
const soundBtn = document.getElementById("soundBtn");

const keyboardEl = document.querySelector(".keyboard");
const parts = document.querySelectorAll(".part");

const modal = document.getElementById("resultModal");
const modalTitle = document.getElementById("modalTitle");
const modalWord = document.getElementById("modalWord");
const playAgainBtn = document.getElementById("playAgainBtn");
const closeModalBtn = document.getElementById("closeModalBtn");

const confettiEl = document.getElementById("confetti");

// Stats elements
const streakVal = document.getElementById("streakVal");
const bestStreakVal = document.getElementById("bestStreakVal");
const winsVal = document.getElementById("winsVal");
const gamesVal = document.getElementById("gamesVal");

// ---------- State ----------
let currentWordObj = null;
let currentWord = "";
let revealed = [];
let wrongLetters = new Set();
let guessedLetters = new Set();

let hintVisible = false;

let maxGuesses = 6;
let guessesLeft = 6;

const DIFF = { easy: 8, medium: 6, hard: 4 };

// ---------- LocalStorage Stats ----------
const LS = {
  streak: "gw_streak",
  bestStreak: "gw_best_streak",
  wins: "gw_wins",
  games: "gw_games",
  sound: "gw_sound",
  category: "gw_category",
  diff: "gw_diff"
};

function getNum(key, fallback = 0) {
  const v = Number(localStorage.getItem(key));
  return Number.isFinite(v) ? v : fallback;
}

let streak = getNum(LS.streak, 0);
let bestStreak = getNum(LS.bestStreak, 0);
let wins = getNum(LS.wins, 0);
let games = getNum(LS.games, 0);

function saveStats() {
  localStorage.setItem(LS.streak, String(streak));
  localStorage.setItem(LS.bestStreak, String(bestStreak));
  localStorage.setItem(LS.wins, String(wins));
  localStorage.setItem(LS.games, String(games));
}

function renderStats() {
  streakVal.textContent = streak;
  bestStreakVal.textContent = bestStreak;
  winsVal.textContent = wins;
  gamesVal.textContent = games;
}

// ---------- Sound (WebAudio) ----------
let soundOn = (localStorage.getItem(LS.sound) ?? "on") === "on";
soundBtn.textContent = `Sound: ${soundOn ? "ON" : "OFF"}`;

let audioCtx = null;
function beep(freq = 440, duration = 0.08, type = "sine", gain = 0.06) {
  if (!soundOn) return;
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = gain;

  o.connect(g);
  g.connect(audioCtx.destination);

  o.start();
  o.stop(audioCtx.currentTime + duration);
}

const SFX = {
  click: () => beep(520, 0.05, "triangle", 0.05),
  correct: () => { beep(660, 0.07, "sine", 0.06); beep(880, 0.07, "sine", 0.05); },
  wrong: () => beep(180, 0.10, "sawtooth", 0.05),
  win: () => { beep(523, 0.10, "sine", 0.06); beep(659, 0.10, "sine", 0.06); beep(784, 0.12, "sine", 0.07); },
  lose: () => { beep(220, 0.12, "square", 0.05); beep(160, 0.16, "square", 0.05); }
};

soundBtn.addEventListener("click", () => {
  soundOn = !soundOn;
  localStorage.setItem(LS.sound, soundOn ? "on" : "off");
  soundBtn.textContent = `Sound: ${soundOn ? "ON" : "OFF"}`;
  SFX.click();
});

// ---------- Modal ----------
function openModal(title) {
  modalTitle.textContent = title;
  modalWord.textContent = currentWord;
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}
function closeModal() {
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
}

// ---------- Confetti ----------
function clearConfetti(){ confettiEl.innerHTML = ""; }
function popConfetti(){
  clearConfetti();
  const pieces = 120;
  for (let i=0;i<pieces;i++){
    const p = document.createElement("div");
    p.className = "piece";
    p.style.background = `hsl(${Math.random()*360} 90% 60%)`;
    p.style.left = Math.random()*100 + "vw";
    p.style.width = (6+Math.random()*8) + "px";
    p.style.height = (10+Math.random()*14) + "px";
    const dur = 2.2 + Math.random()*2.2;
    const delay = Math.random()*0.25;
    p.style.animationDuration = dur + "s";
    p.style.animationDelay = delay + "s";
    p.style.transform = `translateX(${(Math.random()-0.5)*120}px) rotate(${Math.random()*360}deg)`;
    confettiEl.appendChild(p);
    setTimeout(()=>p.remove(), (dur+delay)*1000+200);
  }
  setTimeout(clearConfetti, 5200);
}

// ---------- Keyboard ----------
function buildKeyboard(){
  keyboardEl.innerHTML = "";
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (const ch of letters){
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "key";
    btn.textContent = ch;
    btn.dataset.letter = ch.toLowerCase();

    btn.addEventListener("click", () => {
      if (btn.classList.contains("disabled")) return;
      typeInput.focus();
      SFX.click();
      handleGuess(btn.dataset.letter);
    });

    keyboardEl.appendChild(btn);
  }
}

function markKey(letter, state){
  const key = keyboardEl.querySelector(`.key[data-letter="${letter}"]`);
  if (!key) return;
  key.classList.add("disabled");
  key.classList.remove("good","bad");
  if (state === "good") key.classList.add("good");
  if (state === "bad") key.classList.add("bad");
}

function resetKeys(){
  keyboardEl.querySelectorAll(".key").forEach(k => k.className = "key");
}

// ---------- Hangman ----------
function resetHangman(){ parts.forEach(p => p.style.opacity = "0"); }
function showHangmanSteps(mistakes){
  const m = Math.min(6, mistakes);
  parts.forEach(p => {
    const step = Number(p.dataset.step);
    p.style.opacity = step <= m ? "1" : "0";
  });
}

// ---------- UI ----------
function renderWord(){
  wordEl.innerHTML = "";
  for (let i=0;i<currentWord.length;i++){
    const box = document.createElement("div");
    box.className = "letter";
    if (revealed[i]) box.textContent = currentWord[i].toUpperCase();
    else { box.textContent = "_"; box.classList.add("empty"); }
    wordEl.appendChild(box);
  }
}

function renderInfo(){
  guessLeftEl.textContent = guessesLeft;
  mistakeCountEl.textContent = wrongLetters.size;

  const wrongArr = Array.from(wrongLetters);
  wrongLettersEl.textContent = wrongArr.length ? wrongArr.join(", ").toUpperCase() : "—";

  hintTextEl.textContent = hintVisible ? currentWordObj.hint : "••••";

  showHangmanSteps(wrongLetters.size);
}

// ---------- Categories ----------
function loadCategories(){
  const cats = Object.keys(wordsByCategory);
  categorySel.innerHTML = "";

  for (const c of cats){
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    categorySel.appendChild(opt);
  }

  const savedCat = localStorage.getItem(LS.category);
  if (savedCat && wordsByCategory[savedCat]) categorySel.value = savedCat;
}

function pickWord(){
  const cat = categorySel.value;
  const list = wordsByCategory[cat] || [];
  const idx = Math.floor(Math.random() * list.length);
  currentWordObj = list[idx];
  currentWord = currentWordObj.word.toLowerCase().trim();
}

function applyDifficulty(){
  const d = difficultySel.value;
  maxGuesses = DIFF[d] ?? 6;
  guessesLeft = maxGuesses;
}

// ---------- Game ----------
function isWin(){
  for (let i=0;i<revealed.length;i++) if (!revealed[i]) return false;
  return true;
}
function isGameOver(){ return guessesLeft <= 0 || isWin(); }

function endWin(){
  wins++;
  games++;
  streak++;
  if (streak > bestStreak) bestStreak = streak;
  saveStats();
  renderStats();

  popConfetti();
  SFX.win();
  openModal("🎉 You won!");
}

function endLose(){
  games++;
  streak = 0;
  saveStats();
  renderStats();

  SFX.lose();
  openModal("💀 You lost!");
}

function resetGame(){
  // save preference
  localStorage.setItem(LS.category, categorySel.value);
  localStorage.setItem(LS.diff, difficultySel.value);

  pickWord();
  applyDifficulty();

  revealed = new Array(currentWord.length).fill(false);
  wrongLetters = new Set();
  guessedLetters = new Set();

  hintVisible = false;
  hintBtn.textContent = "Show Hint";

  closeModal();
  clearConfetti();

  renderWord();
  renderInfo();

  resetHangman();
  resetKeys();

  typeInput.value = "";
  typeInput.focus();
}

function handleGuess(letterRaw){
  if (isGameOver()) return;

  const letter = (letterRaw || "").toLowerCase();
  if (!/^[a-z]$/.test(letter)) return;
  if (guessedLetters.has(letter)) return;

  guessedLetters.add(letter);

  if (currentWord.includes(letter)){
    for (let i=0;i<currentWord.length;i++){
      if (currentWord[i] === letter) revealed[i] = true;
    }
    markKey(letter, "good");
    SFX.correct();
  } else {
    wrongLetters.add(letter);
    guessesLeft--;
    markKey(letter, "bad");
    SFX.wrong();
  }

  renderWord();
  renderInfo();

  if (isWin()) endWin();
  else if (guessesLeft <= 0) endLose();
}

// ---------- Events ----------
document.addEventListener("keydown", (e) => {
  if (modal.classList.contains("show")){
    if (e.key === "Enter") resetGame();
    if (e.key === "Escape") closeModal();
    return;
  }
  if (e.key.length === 1) handleGuess(e.key);
});

typeInput.addEventListener("input", (e) => {
  const v = e.target.value;
  e.target.value = "";
  handleGuess(v);
});

resetBtn.addEventListener("click", () => { SFX.click(); resetGame(); });

hintBtn.addEventListener("click", () => {
  hintVisible = !hintVisible;
  hintBtn.textContent = hintVisible ? "Hide Hint" : "Show Hint";
  SFX.click();
  renderInfo();
});

difficultySel.addEventListener("change", () => { SFX.click(); resetGame(); });
categorySel.addEventListener("change", () => { SFX.click(); resetGame(); });

playAgainBtn.addEventListener("click", () => { SFX.click(); resetGame(); });
closeModalBtn.addEventListener("click", () => { SFX.click(); closeModal(); });

modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

// ---------- Init ----------
loadCategories();

// restore diff preference
const savedDiff = localStorage.getItem(LS.diff);
if (savedDiff && DIFF[savedDiff]) difficultySel.value = savedDiff;

buildKeyboard();
renderStats();
resetGame();
