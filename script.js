const STORAGE_KEY = "quranMemorizationProgressV1";

const surahList = document.getElementById("surahList");
const template = document.getElementById("surahTemplate");
const searchInput = document.getElementById("searchInput");
const filterSelect = document.getElementById("filterSelect");
const resetBtn = document.getElementById("resetBtn");

let quranData = [];
let progress = loadProgress();

async function startApp() {
  try {
    const response = await fetch("quran.json");
    quranData = await response.json();
    render();
  } catch (error) {
    surahList.innerHTML = `<p>Could not load quran.json. Open this site using a local server.</p>`;
    console.error(error);
  }
}

function loadProgress() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function getSurahProgress(number) {
  return progress[number] || {
    memorized: false,
    ayahsMemorized: 0,
    lastReviewed: "",
    notes: ""
  };
}

function updateSurah(number, updates) {
  progress[number] = { ...getSurahProgress(number), ...updates };
  saveProgress();
  renderStats();
}

function render() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const filter = filterSelect.value;

  surahList.innerHTML = "";

  quranData
    .filter(surah => {
      const saved = getSurahProgress(surah.number);
      const matchesSearch = `${surah.number} ${surah.name} ${surah.english}`
        .toLowerCase()
        .includes(searchTerm);
      const matchesFilter =
        filter === "all" ||
        (filter === "memorized" && saved.memorized) ||
        (filter === "not-memorized" && !saved.memorized);

      return matchesSearch && matchesFilter;
    })
    .forEach(createSurahCard);

  renderStats();
}

function createSurahCard(surah) {
  const saved = getSurahProgress(surah.number);
  const card = template.content.cloneNode(true);
  const article = card.querySelector(".surah-card");
  const title = card.querySelector(".surah-name");
  const meta = card.querySelector(".surah-meta");
  const check = card.querySelector(".memorized-check");
  const ayahInput = card.querySelector(".ayah-input");
  const reviewInput = card.querySelector(".review-input");
  const notesInput = card.querySelector(".notes-input");

  title.textContent = `${surah.number}. ${surah.name}`;
  meta.textContent = `${surah.english} • ${surah.ayahs} ayahs`;

  check.checked = saved.memorized;
  ayahInput.max = surah.ayahs;
  ayahInput.value = saved.ayahsMemorized;
  reviewInput.value = saved.lastReviewed;
  notesInput.value = saved.notes;

  if (saved.memorized) article.classList.add("memorized");

  check.addEventListener("change", () => {
    const isMemorized = check.checked;
    article.classList.toggle("memorized", isMemorized);
    updateSurah(surah.number, {
      memorized: isMemorized,
      ayahsMemorized: isMemorized ? surah.ayahs : Number(ayahInput.value)
    });
    ayahInput.value = isMemorized ? surah.ayahs : ayahInput.value;
  });

  ayahInput.addEventListener("input", () => {
    let value = Number(ayahInput.value);
    value = Math.max(0, Math.min(value, surah.ayahs));
    ayahInput.value = value;

    const isComplete = value === surah.ayahs;
    check.checked = isComplete;
    article.classList.toggle("memorized", isComplete);

    updateSurah(surah.number, {
      ayahsMemorized: value,
      memorized: isComplete
    });
  });

  reviewInput.addEventListener("change", () => {
    updateSurah(surah.number, { lastReviewed: reviewInput.value });
  });

  notesInput.addEventListener("input", () => {
    updateSurah(surah.number, { notes: notesInput.value });
  });

  surahList.appendChild(card);
}

function renderStats() {
  const totalQuranAyahs = quranData.reduce((sum, surah) => sum + surah.ayahs, 0);
  const memorizedSurahs = quranData.filter(surah => getSurahProgress(surah.number).memorized).length;
  const ayahsMemorized = quranData.reduce((sum, surah) => {
    const saved = getSurahProgress(surah.number);
    return sum + Math.min(Number(saved.ayahsMemorized) || 0, surah.ayahs);
  }, 0);

  document.getElementById("memorizedCount").textContent = memorizedSurahs;
  document.getElementById("totalAyahs").textContent = ayahsMemorized;
  document.getElementById("progressPercent").textContent =
    totalQuranAyahs ? `${Math.round((ayahsMemorized / totalQuranAyahs) * 100)}%` : "0%";
}

searchInput.addEventListener("input", render);
filterSelect.addEventListener("change", render);

resetBtn.addEventListener("click", () => {
  if (confirm("Reset all memorization progress?")) {
    progress = {};
    saveProgress();
    render();
  }
});

startApp();
