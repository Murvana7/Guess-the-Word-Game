// index.js

const inputs = document.querySelector(".word");
const hintTag = document.querySelector(".hint span");
const guessLeft = document.querySelector(".guess span");
const mistakes = document.querySelector(".wrong span");
const resetBtn = document.querySelector(".reset");
const hintBtn = document.querySelector(".showhint");
const hintElement = document.querySelector(".hint");
const typeInput = document.querySelector(".type-input");

let word = "";
let hintText = "";
let correctLetters = [];
let incorrectLetters = [];
let maxGuesses = 0;
let gameOver = false;

const isLetter = (ch) => /^[a-z]$/.test(ch);

function pickRandomWord() {
  const obj = wordList[Math.floor(Math.random() * wordList.length)];
  word = obj.word.toLowerCase();
  hintText = obj.hint;
}

function buildWordBoxes() {
  inputs.innerHTML = "";
  for (let i = 0; i < word.length; i++) {
    const box = document.createElement("input");
    box.type = "text";
    box.disabled = true;
    box.value = ""; // empty
    inputs.appendChild(box);
  }
}

function updateWordDisplay() {
  const boxes = inputs.querySelectorAll("input");
  word.split("").forEach((ch, i) => {
    if (correctLetters.includes(ch)) {
      boxes[i].value = ch;
    }
  });
}

function revealWord() {
  const boxes = inputs.querySelectorAll("input");
  word.split("").forEach((ch, i) => {
    boxes[i].value = ch;
  });
}

function updateStats() {
  guessLeft.textContent = String(maxGuesses);
  mistakes.textContent = incorrectLetters.length ? incorrectLetters.join(", ") : "—";
  hintTag.textContent = hintText;
}

function checkWin() {
  const uniqueLetters = [...new Set(word.split(""))];
  return uniqueLetters.every((ch) => correctLetters.includes(ch));
}

function endGame(win) {
  gameOver = true;
  typeInput.disabled = true;

  if (!win) revealWord();

  setTimeout(() => {
    alert(win ? `🎉 You won! Word: ${word}` : `😢 You lost! Word: ${word}`);
  }, 120);
}

function startNewGame() {
  pickRandomWord();

  maxGuesses = word.length >= 5 ? 8 : 6;
  correctLetters = [];
  incorrectLetters = [];
  gameOver = false;

  // Hide hint at start
  hintElement.style.display = "none";

  buildWordBoxes();
  updateStats();

  typeInput.value = "";
  typeInput.disabled = false;
  typeInput.focus();
}

function handleInput(e) {
  if (gameOver) {
    e.target.value = "";
    return;
  }

  const key = e.target.value.toLowerCase();
  e.target.value = "";

  if (!isLetter(key)) return;

  if (correctLetters.includes(key) || incorrectLetters.includes(key)) return;

  if (word.includes(key)) {
    correctLetters.push(key);
    updateWordDisplay();

    if (checkWin()) endGame(true);
  } else {
    incorrectLetters.push(key);
    maxGuesses--;
    updateStats();

    if (maxGuesses <= 0) endGame(false);
  }

  updateStats();
}

/* EVENTS */
typeInput.addEventListener("input", handleInput);

document.addEventListener("click", () => {
  if (!gameOver) typeInput.focus();
});

resetBtn.addEventListener("click", startNewGame);

hintBtn.addEventListener("click", () => {
  const hidden = getComputedStyle(hintElement).display === "none";
  hintElement.style.display = hidden ? "block" : "none";
});

/* START */
startNewGame();
