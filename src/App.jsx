import React, { useState, useEffect, useCallback, useRef } from "react";

/* ---------- Design tokens — SUMMERSWEAT ----------
  bg:        #FFF6FB  (blasses Pink-Weiß)
  surface:   #FFFFFF
  ink:       #210B2C  (fast schwarzes Beere-Violett)
  muted:     #8A5A78
  line:      #FFD6EC
  pink:      #FF1F8F  (Primärfarbe)
  violet:    #9B1FE0  (Sekundärfarbe / Intensiv / Erledigt)
--------------------------------------------------- */

const PINK = "#FF1F8F";
const VIOLET = "#9B1FE0";
const INK = "#210B2C";
const MUTED = "#8A5A78";
const LINE = "#FFD6EC";
const BG = "#FFF6FB";
const ALERT = "#FF3B30";

const GLOBAL_STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Space+Grotesk:wght@600;700;800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body { overflow-x: hidden; }
button { touch-action: manipulation; }
@keyframes ss-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
@keyframes ss-pop {
  0% { transform: scale(0.8); opacity: 0.5; }
  100% { transform: scale(1); opacity: 1; }
}
`;

/* ---------- Lokaler Gerätespeicher ----------
  Die App wird nur von einer Person auf einem Gerät genutzt – ein Server-/Cloud-
  Speicher ist dafür nicht nötig. Alle Daten liegen im localStorage des Browsers.
------------------------------------------------ */
const storage = {
  async get(key) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return null;
      return { key, value: raw };
    } catch (err) {
      console.error("Speicher-Lesefehler", err);
      return null;
    }
  },
  async set(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return { key, value };
    } catch (err) {
      console.error("Speicher-Schreibfehler", err);
      return null;
    }
  },
};

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const WEEKDAY_FULL = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
];

const DAY_TITLES = [
  "Tempo-Intervalle",
  "Seilspringen & Sprints",
  "HIIT-Ganzkörper-Zirkel",
  "Tabata-Treppen",
  "Tanz-HIIT",
  "Longrun – ambitioniert",
  "Aktive Erholung",
];

const QUOTES = [
  "Montag-Power: Heute legst du den Ton für die ganze Woche fest! 💥",
  "Dienstag-Energie: Ein Schritt näher an deinem stärksten Ich. 🔥",
  "Mittwoch-Mitte: Du bist schon weiter, als du denkst – weiter geht's! 💪",
  "Donnerstag-Drive: Durchhalten zahlt sich genau jetzt aus. ✨",
  "Freitag-Feuer: Diese Woche fast geschafft – gib nochmal alles! 🚀",
  "Samstag-Stärke: Zeit, dich selbst zu übertreffen. 🌟",
  "Sonntag-Ruhe: Erholung ist Teil des Trainings – gönn sie dir. 🌸",
];

// Fokusbereich-Video: Mo+Do Slim Thighs, Di+Fr Abs, Mi+Sa Arms, So Pause
const FOCUS_AREAS = [
  { label: "Slim Thighs", q: "slim thighs workout beginner zuhause" },
  { label: "Abs", q: "abs workout beginner flacher bauch" },
  { label: "Arms", q: "arm workout ohne geräte frauen" },
  { label: "Slim Thighs", q: "slim thighs workout zuhause" },
  { label: "Abs", q: "abs workout 10 minuten" },
  { label: "Arms", q: "arm toning workout beginner" },
  null,
];

function yt(query) {
  return "https://www.youtube.com/results?search_query=" + encodeURIComponent(query);
}

/* ---------- Timer-Phasen-Baukasten ----------
  Jede Übung bekommt ein "timer"-Array aus Phasen: { type: "work" | "rest", seconds, label, round?, totalRounds?, block?, totalBlocks? }
  Daraus baut der Timer automatisch Countdown, Rundenanzeige und Pausen-Anzeige.
------------------------------------------------ */
function simplePhase(seconds, label) {
  return [{ type: "work", seconds, label: label || null }];
}

function stepsPhases(steps, secondsEach) {
  return steps.map((s) => ({ type: "work", seconds: secondsEach, label: s.label }));
}

function intervalPhases(rounds, workSec, restSec, workLabel, restLabel, labels) {
  const phases = [];
  for (let r = 1; r <= rounds; r++) {
    const wLabel = labels ? labels[(r - 1) % labels.length] : workLabel;
    phases.push({ type: "work", seconds: workSec, label: wLabel, round: r, totalRounds: rounds });
    phases.push({ type: "rest", seconds: restSec, label: restLabel || "Pause", round: r, totalRounds: rounds });
  }
  return phases;
}

function circuitPhases(rounds, exerciseLabels, workSec, restSec, roundRestSec) {
  const phases = [];
  for (let r = 1; r <= rounds; r++) {
    exerciseLabels.forEach((label) => {
      phases.push({ type: "work", seconds: workSec, label, round: r, totalRounds: rounds });
      phases.push({ type: "rest", seconds: restSec, label: "Wechsel", round: r, totalRounds: rounds });
    });
    phases.push({ type: "rest", seconds: roundRestSec, label: "Rundenpause", round: r, totalRounds: rounds });
  }
  return phases;
}

function blockPhases(blocks, roundsPerBlock, workSec, restSec, blockRestSec, workLabel) {
  const phases = [];
  for (let b = 1; b <= blocks; b++) {
    for (let r = 1; r <= roundsPerBlock; r++) {
      phases.push({ type: "work", seconds: workSec, label: workLabel, round: r, totalRounds: roundsPerBlock, block: b, totalBlocks: blocks });
      phases.push({ type: "rest", seconds: restSec, label: "Pause", round: r, totalRounds: roundsPerBlock, block: b, totalBlocks: blocks });
    }
    phases.push({ type: "rest", seconds: blockRestSec, label: "Blockpause", block: b, totalBlocks: blocks });
  }
  return phases;
}

function focusVideoItem(dayId, dayIdx) {
  const f = FOCUS_AREAS[dayIdx];
  if (!f) return null;
  return {
    id: `${dayId}-focus`,
    name: `Bonus: ${f.label}-Workout`,
    meta: "15 Min · Video-Workout",
    intensity: 2,
    met: 5,
    minutes: 15,
    video: true,
    desc: `Gezieltes ${f.label}-Workout zum Abhaken. Folge dem Video Schritt für Schritt und achte auf saubere Ausführung statt Tempo.`,
    q: f.q,
    timer: simplePhase(900, `${f.label}-Workout`),
  };
}

function pilatesItem(dayId) {
  return {
    id: `${dayId}-pilates`,
    name: "Pilates-Kurs",
    meta: "15 Min · Video-Kurs",
    intensity: 1,
    met: 3,
    minutes: 15,
    video: true,
    desc: "Ruhiger Pilates-Flow für Rumpfstabilität, Haltung und aktive Regeneration. Ideal als Ausklang oder separate Einheit.",
    q: "pilates kurs anfänger 15 minuten",
    timer: simplePhase(900, "Pilates"),
  };
}

// intensity: 1 locker, 2 mittel, 3 intensiv
// met: metabolisches Äquivalent (für Kalorienschätzung)
// minutes: tatsächliche Belastungsdauer der Einheit (inkl. Pausen im Intervall) in Minuten
// steps: optionale Liste einzelner Übungen für Zirkel/Intervalle, jeweils mit Piktogramm
// timer: Phasen-Array für die Timer-Funktion
const PLAN = [
  [ // Montag – Tempo-Intervalle
    { id: "mon-1", name: "Dynamisches Aufwärmen", meta: "6 Min", intensity: 1, met: 4, minutes: 6,
      desc: "Je 1 Minute pro Übung, direkt hintereinander. Ziel: Puls auf ca. 60 % deiner geschätzten Maximalherzfrequenz bringen, bevor es intensiv wird.",
      steps: [
        { label: "Kniehebelauf auf der Stelle", emoji: "🏃" },
        { label: "Armkreisen", emoji: "🙆" },
        { label: "Gehende Ausfallschritte", emoji: "🚶" },
        { label: "Lockeres Traben", emoji: "🏃‍♀️" },
        { label: "Hüftrotation", emoji: "🔄" },
        { label: "Steigerungsläufe", emoji: "⚡" },
      ],
      q: "dynamisches aufwärmen vor dem laufen",
      timer: stepsPhases([
        { label: "Kniehebelauf auf der Stelle" },
        { label: "Armkreisen" },
        { label: "Gehende Ausfallschritte" },
        { label: "Lockeres Traben" },
        { label: "Hüftrotation" },
        { label: "Steigerungsläufe" },
      ], 60) },
    { id: "mon-2", name: "Tempo-Intervalle", meta: "6 × (3 Min zügig / 1 Min locker) · ca. 24 Min", intensity: 3, met: 11, minutes: 24,
      desc: "6 Runden: 3 Minuten zügiges Tempo, bei dem du dich nur noch in kurzen Sätzen unterhalten könntest, gefolgt von 1 Minute lockerem Traben zur aktiven Erholung. Das ist der größte Kalorien-Hebel der Woche – versuche, in jeder Tempo-Phase ein minimal höheres oder zumindest stabileres Tempo zu halten als in der Vorwoche.",
      q: "lauf intervalltraining tempo hiit",
      timer: intervalPhases(6, 180, 60, "Zügiges Tempo", "Locker traben") },
    { id: "mon-3", name: "Cooldown & Dehnen", meta: "8 Min", intensity: 1, met: 2.5, minutes: 8,
      desc: "3–4 Minuten ganz locker austraben oder gehen, bis der Puls spürbar runtergeht. Danach Waden, vordere/hintere Oberschenkel und Hüftbeuger je 30 Sekunden pro Seite dehnen.",
      q: "cooldown dehnen nach intervalltraining",
      timer: simplePhase(480, "Cooldown & Dehnen") },
  ],
  [ // Dienstag – Seilspringen & Sprints
    { id: "die-1", name: "Seilspringen Warmup", meta: "5 Min", intensity: 1, met: 4, minutes: 5,
      desc: "Lockeres, gleichmäßiges Springen im eigenen Tempo, um Fußgelenke, Waden und Koordination auf die Belastung vorzubereiten.",
      q: "seilspringen aufwärmen technik",
      timer: simplePhase(300, "Seilspringen") },
    { id: "die-2", name: "Seilspring-HIIT", meta: "10 × (40 Sek maximal / 20 Sek Pause) · ca. 10 Min", intensity: 3, met: 12, minutes: 10,
      desc: "10 Runden volle Power. Wechsle zwischen den drei Sprungarten durch, um verschiedene Muskelgruppen kurz zu belasten – das hält die Herzfrequenz konstant hoch und maximiert den Kalorienverbrauch pro Minute.",
      steps: [
        { label: "Beidbeinig springen", emoji: "🤸" },
        { label: "Boxer-Step", emoji: "🥊" },
        { label: "High-Knee-Skips", emoji: "🏃" },
      ],
      q: "seilspringen hiit tabata workout",
      timer: intervalPhases(10, 40, 20, null, "Pause", ["Beidbeinig springen", "Boxer-Step", "High-Knee-Skips"]) },
    { id: "die-3", name: "Sprint-Intervalle (Treppe oder Strecke)", meta: "8 × 20 Sek Sprint / 40 Sek Gehpause · ca. 8 Min", intensity: 3, met: 11, minutes: 8,
      desc: "8 kurze Sprints mit maximalem Einsatz – bergauf, auf einer Treppe oder auf ebener Strecke. Zwischen den Sprints ruhig zurückgehen. Kurze, harte Sprints verbrennen überproportional viele Kalorien und treiben den Nachbrenneffekt (EPOC) nach dem Training in die Höhe.",
      q: "sprint intervalltraining treppen workout",
      timer: intervalPhases(8, 20, 40, "Sprint", "Gehpause") },
    { id: "die-4", name: "Beweglichkeit Beine", meta: "5 Min", intensity: 1, met: 2.3, minutes: 5,
      desc: "Waden, Oberschenkel und Hüftbeuger dehnen, je Seite mindestens 30 Sekunden halten.",
      q: "beweglichkeit beine dehnen routine",
      timer: simplePhase(300, "Dehnen") },
  ],
  [ // Mittwoch – HIIT-Ganzkörper-Zirkel
    { id: "mit-1", name: "Aufwärmen", meta: "5 Min", intensity: 1, met: 4, minutes: 5,
      desc: "Gelenke lockern (Schultern, Hüfte, Knöchel), dann 2 Minuten Jumping Jacks in lockerem Tempo, um den Puls langsam hochzufahren.",
      q: "aufwärmen cardio workout",
      timer: simplePhase(300, "Aufwärmen") },
    { id: "mit-2", name: "HIIT-Ganzkörper-Zirkel", meta: "5 Runden × 6 Übungen · 45 Sek / 15 Sek Pause · ca. 35 Min", intensity: 3, met: 10, minutes: 35,
      desc: "5 Runden der folgenden 6 Übungen, je 45 Sekunden volle Leistung und 15 Sekunden Wechselpause. Nach einer vollen Runde 1 Minute Pause, dann von vorne. Das ist die ambitionierteste Einheit der Woche und dank ständigem Wechsel von Ober- und Unterkörper besonders effektiv für den Gesamtkalorienverbrauch. Auf sauberen Bewegungsablauf statt Tempo um jeden Preis achten – lieber eine Runde weniger als kollabierende Form.",
      steps: [
        { label: "Burpees", emoji: "🤾" },
        { label: "Mountain Climbers", emoji: "🧗" },
        { label: "Jumping Jacks", emoji: "⭐" },
        { label: "Skater Jumps", emoji: "⛸️" },
        { label: "Hohe Knie auf der Stelle", emoji: "🏃" },
        { label: "Liegestütz mit Strecksprung (oder von den Knien)", emoji: "💪" },
      ],
      q: "hiit ganzkörper zirkeltraining ohne geräte",
      timer: circuitPhases(5, ["Burpees", "Mountain Climbers", "Jumping Jacks", "Skater Jumps", "Hohe Knie", "Liegestütz"], 45, 15, 60) },
    { id: "mit-3", name: "Ausklang", meta: "5 Min", intensity: 1, met: 2.5, minutes: 5,
      desc: "Lockeres Gehen im Raum oder draußen, tief durchatmen, Puls kontrolliert runterfahren lassen. Danach Schultern, Rücken und Beine kurz ausschütteln.",
      q: "cooldown nach hiit workout",
      timer: simplePhase(300, "Ausklang") },
  ],
  [ // Donnerstag – Tabata-Treppen
    { id: "don-1", name: "Aufwärmen", meta: "5 Min", intensity: 1, met: 4, minutes: 5,
      desc: "Zügiges Gehen oder lockeres Traben, dazu Armkreisen und Ausfallschritte, um Beine und Kreislauf vorzubereiten.",
      q: "warm up vor treppentraining",
      timer: simplePhase(300, "Aufwärmen") },
    { id: "don-2", name: "Tabata-Treppensprints", meta: "3 Blöcke × 8 × (20 Sek Sprint / 10 Sek Pause) · ca. 18 Min", intensity: 3, met: 12, minutes: 18,
      desc: "3 Tabata-Blöcke: je 8 Runden 20 Sekunden Treppe hochsprinten (oder ersatzweise Kniehebelauf auf der Stelle in Höchsttempo), 10 Sekunden Pause. Zwischen den 3 Blöcken 2 Minuten aktive Erholung im Gehen. Diese Reizform gehört zu den effizientesten Methoden, um in kurzer Zeit viele Kalorien zu verbrennen.",
      q: "tabata treppensprints workout",
      timer: blockPhases(3, 8, 20, 10, 120, "Sprint") },
    { id: "don-3", name: "Aktive Erholung: Rad oder zügiges Gehen", meta: "15 Min", intensity: 2, met: 6, minutes: 15,
      desc: "Konstantes, spürbar zügiges Tempo halten, um die Beine nach den Sprints auszuspülen, ohne die Intensität komplett rauszunehmen.",
      q: "aktive erholung radfahren nach hiit",
      timer: simplePhase(900, "Aktive Erholung") },
    { id: "don-4", name: "Dehnen", meta: "5 Min", intensity: 1, met: 2.3, minutes: 5,
      desc: "Beine, Gesäß und unteren Rücken sanft dehnen, je Position 30 Sekunden halten.",
      q: "ganzkörper dehnen routine kurz",
      timer: simplePhase(300, "Dehnen") },
  ],
  [ // Freitag – Tanz-HIIT
    { id: "fre-1", name: "Warmup", meta: "5 Min", intensity: 1, met: 4, minutes: 5,
      desc: "Leichtes Mitwippen, Armkreisen und Grundschritte zur Musik, um dich einzugrooven und Gelenke vorzubereiten.",
      q: "dance warm up cardio",
      timer: simplePhase(300, "Warmup") },
    { id: "fre-2", name: "Tanz-HIIT", meta: "30 Min", intensity: 3, met: 7.5, minutes: 30,
      desc: "Einem intensiven Cardio-Dance- oder Dance-HIIT-Video mitfolgen, das bewusst mit Tempo- und Intensitätswechseln arbeitet. Volle Bewegungsamplitude nutzen – große Armbewegungen und tiefe Schritte verbrennen deutlich mehr Kalorien als kleine, vorsichtige Bewegungen.",
      q: "dance hiit cardio workout intensiv",
      timer: simplePhase(1800, "Tanz-HIIT") },
    { id: "fre-3", name: "Cooldown", meta: "5 Min", intensity: 1, met: 2.5, minutes: 5,
      desc: "Ausschütteln, tief atmen, Puls beruhigen, dann Waden und Oberschenkel kurz dehnen.",
      q: "cooldown stretching kurz",
      timer: simplePhase(300, "Cooldown") },
  ],
  [ // Samstag – Longrun, ambitioniert
    { id: "sam-1", name: "Longrun oder ambitionierte Wanderung", meta: "55 Min · ca. 6–8 km", intensity: 2, met: 8, minutes: 55,
      desc: "Längste Einheit der Woche in einem Tempo, das du fast die ganze Strecke durchhalten kannst, ohne komplett auszubrennen. Steigere Distanz oder Tempo langsam von Woche zu Woche (max. +10 % pro Woche). Wegen der langen Dauer ist diese Einheit für den wöchentlichen Gesamtkalorienverbrauch besonders wichtig.",
      q: "longrun laufen tempo steigern",
      timer: simplePhase(3300, "Longrun") },
    { id: "sam-2", name: "Mobility & Dehnen", meta: "10 Min", intensity: 1, met: 2.3, minutes: 10,
      desc: "Ganzkörper-Mobility-Routine zum Ausklang der Woche: Hüfte, unterer Rücken, Waden und Schultern.",
      q: "mobility routine ganzkörper kurz",
      timer: simplePhase(600, "Mobility") },
  ],
  [ // Sonntag – Aktive Erholung
    { id: "son-1", name: "Spaziergang", meta: "25 Min", intensity: 1, met: 3.5, minutes: 25,
      desc: "Ruhig gehen, frische Luft, kein Leistungsdruck. Aktive Erholung unterstützt die Regeneration und trägt trotzdem etwas zum Wochen-Kalorienverbrauch bei.",
      q: "spaziergang erholung aktiv",
      timer: simplePhase(1500, "Spaziergang") },
    { id: "son-2", name: "Yoga / Stretch-Flow", meta: "15 Min", intensity: 1, met: 2.5, minutes: 15,
      desc: "Ruhiger Flow zur Regeneration von Beinen, Hüfte und Rücken nach der intensiven Trainingswoche.",
      q: "yoga stretch flow anfänger 15 minuten",
      timer: simplePhase(900, "Yoga") },
  ],
].map((dayPlan, i) => {
  const dayId = ["mon", "die", "mit", "don", "fre", "sam", "son"][i];
  const extra = [focusVideoItem(dayId, i), pilatesItem(dayId)].filter(Boolean);
  return [...dayPlan, ...extra];
});

const INTENSITY_LABEL = { 1: "Locker", 2: "Mittel", 3: "Intensiv" };
const INTENSITY_COLOR = { 1: "#FFC6E4", 2: "#FF4FA8", 3: VIOLET };

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}
function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function startOfWeek(d) {
  const r = new Date(d);
  const wd = (r.getDay() + 6) % 7; // Monday = 0
  r.setDate(r.getDate() - wd);
  r.setHours(0, 0, 0, 0);
  return r;
}
function fmtShort(d) {
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}
function weekKeyOf(d) {
  return isoDate(startOfWeek(d));
}
function fmtTime(totalSeconds) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

// Kalorienschätzung über MET-Formel: kcal/min = MET * 3.5 * Körpergewicht(kg) / 200
function calcKcal(met, minutes, weightKg) {
  if (!weightKg || weightKg <= 0) return null;
  return Math.round(((met * 3.5 * weightKg) / 200) * minutes);
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [checkins, setCheckins] = useState({}); // { isoDate: [exerciseId,...] }
  const [profile, setProfile] = useState({ weight: null, height: null }); // kg, cm
  const [weightLog, setWeightLog] = useState([]); // [{date, weekKey, weight}]
  const [tab, setTab] = useState("heute");
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weightInput, setWeightInput] = useState("");
  const [profileDraft, setProfileDraft] = useState({ weight: "", height: "" });
  const [saveState, setSaveState] = useState("idle");
  const [timerExercise, setTimerExercise] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [c, p, w] = await Promise.all([
          storage.get("checkins"),
          storage.get("profile"),
          storage.get("weight-log"),
        ]);
        if (c) setCheckins(JSON.parse(c.value));
        if (p) {
          const parsed = JSON.parse(p.value);
          setProfile(parsed);
          setProfileDraft({ weight: parsed.weight ?? "", height: parsed.height ?? "" });
        }
        if (w) setWeightLog(JSON.parse(w.value));
      } catch (err) {
        console.error("Ladefehler", err);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const persistCheckins = useCallback(async (next) => {
    setCheckins(next);
    setSaveState("saving");
    try {
      await storage.set("checkins", JSON.stringify(next));
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 900);
    } catch (err) {
      console.error(err);
      setSaveState("error");
    }
  }, []);

  const toggleExercise = (dateKey, exId) => {
    const current = new Set(checkins[dateKey] || []);
    if (current.has(exId)) current.delete(exId);
    else current.add(exId);
    persistCheckins({ ...checkins, [dateKey]: Array.from(current) });
  };

  const markDone = (dateKey, exId) => {
    const current = new Set(checkins[dateKey] || []);
    if (!current.has(exId)) {
      current.add(exId);
      persistCheckins({ ...checkins, [dateKey]: Array.from(current) });
    }
  };

  const saveProfile = async () => {
    const weight = parseFloat(String(profileDraft.weight).replace(",", "."));
    const height = parseFloat(String(profileDraft.height).replace(",", "."));
    const next = {
      weight: weight > 0 ? weight : null,
      height: height > 0 ? height : null,
    };
    setProfile(next);
    setSaveState("saving");
    try {
      await storage.set("profile", JSON.stringify(next));
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 900);
    } catch (err) {
      console.error(err);
      setSaveState("error");
    }
  };

  const addWeightEntry = async () => {
    const val = parseFloat(weightInput.replace(",", "."));
    if (!val || val <= 0) return;
    const today = new Date();
    const wk = weekKeyOf(today);
    const withoutThisWeek = weightLog.filter((e) => e.weekKey !== wk);
    const next = [...withoutThisWeek, { date: isoDate(today), weekKey: wk, weight: val }].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    setWeightLog(next);
    setWeightInput("");
    // Gewicht im Profil direkt mit aktualisieren, damit die Kalorienschätzung tagesaktuell bleibt
    const nextProfile = { ...profile, weight: val };
    setProfile(nextProfile);
    setProfileDraft((d) => ({ ...d, weight: val }));
    try {
      await Promise.all([
        storage.set("weight-log", JSON.stringify(next)),
        storage.set("profile", JSON.stringify(nextProfile)),
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  if (!loaded) {
    return (
      <div style={{ ...styles.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{GLOBAL_STYLE}</style>
        <div style={{ fontFamily: "Inter, sans-serif", color: MUTED, fontWeight: 700 }}>Lädt …</div>
      </div>
    );
  }

  const weekStart = addDays(startOfWeek(new Date()), weekOffset * 7);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const dayIndex = (d) => (d.getDay() + 6) % 7;
  const todaysPlan = PLAN[dayIndex(selectedDate)];
  const selKey = isoDate(selectedDate);
  const checkedToday = new Set(checkins[selKey] || []);

  const completionFor = (date) => {
    const key = isoDate(date);
    const plan = PLAN[dayIndex(date)];
    const done = (checkins[key] || []).length;
    return plan.length ? done / plan.length : 0;
  };

  const currentWeekKey = weekKeyOf(new Date());
  const weighedInThisWeek = weightLog.find((e) => e.weekKey === currentWeekKey);

  return (
    <div style={styles.app}>
      <style>{GLOBAL_STYLE}</style>
      <div style={styles.shell}>
        <Header />

        <NavTabs tab={tab} setTab={setTab} />

        {tab === "heute" && (
          <DayView
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            plan={todaysPlan}
            checked={checkedToday}
            onToggle={(id) => toggleExercise(selKey, id)}
            onStartTimer={(ex) => setTimerExercise(ex)}
            dayTitle={DAY_TITLES[dayIndex(selectedDate)]}
            quote={QUOTES[dayIndex(selectedDate)]}
            weightKg={profile.weight}
            onGoToProfile={() => setTab("profil")}
          />
        )}

        {tab === "woche" && (
          <WeekView
            weekOffset={weekOffset}
            setWeekOffset={setWeekOffset}
            weekDates={weekDates}
            completionFor={completionFor}
            onPickDay={(d) => {
              setSelectedDate(d);
              setTab("heute");
            }}
          />
        )}

        {tab === "profil" && (
          <ProfileView
            profileDraft={profileDraft}
            setProfileDraft={setProfileDraft}
            onSaveProfile={saveProfile}
            weightLog={weightLog}
            weightInput={weightInput}
            setWeightInput={setWeightInput}
            onAddWeight={addWeightEntry}
            weighedInThisWeek={weighedInThisWeek}
            profile={profile}
          />
        )}

        <SaveIndicator state={saveState} />

        <footer style={styles.footer}>
          Höre auf deinen Körper – an anstrengenden Tagen darf eine Einheit auch mal locker
          oder kürzer ausfallen. Die Kalorienangaben sind Schätzwerte auf Basis deines
          eingetragenen Gewichts und dienen zur Orientierung, nicht als exakte Messung. Alle
          Daten bleiben ausschließlich lokal auf diesem Gerät gespeichert. Bei Fragen zu
          Training, Ernährung oder Wohlbefinden hilft ein Gespräch mit einer Ärztin/einem Arzt
          oder einer erwachsenen Vertrauensperson.
        </footer>
      </div>

      {timerExercise && (
        <TimerOverlay
          exercise={timerExercise}
          onClose={() => setTimerExercise(null)}
          onFinish={() => markDone(selKey, timerExercise.id)}
        />
      )}
    </div>
  );
}

function Logo({ size = 58 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="sgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={PINK} />
          <stop offset="100%" stopColor={VIOLET} />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="496" height="496" rx="120" fill="#FFFFFF" stroke={LINE} strokeWidth="10" />
      <g transform="translate(5.5 48.5) rotate(-8 256 266)">
        <text
          x="256"
          y="330"
          textAnchor="middle"
          style={{ fontFamily: "Fredoka, sans-serif", fontWeight: 700, fontSize: 330 }}
          fill="url(#sgGrad)"
          stroke="#FFFFFF"
          strokeWidth="14"
          paintOrder="stroke"
        >
          S
        </text>
      </g>
      <circle cx="378" cy="146" r="16" fill={PINK} />
      <circle cx="404" cy="180" r="9" fill={VIOLET} />
      <circle cx="426" cy="209" r="5" fill={VIOLET} />
    </svg>
  );
}

function Header() {
  return (
    <div style={styles.header}>
      <div style={styles.headerRow}>
        <Logo size={58} />
        <div>
          <div style={styles.headerEyebrow}>WOCHENPROGRAMM · AUSDAUER & KALORIEN</div>
          <h1 style={styles.headerTitle}>SUMMERSWEAT</h1>
        </div>
      </div>
      <p style={styles.headerSub}>
        6 Wochen ambitioniertes Cardio- &amp; HIIT-Training mit Fokus auf Kalorienverbrauch –
        für mehr Kondition, Energie und ein gutes Körpergefühl.
      </p>
    </div>
  );
}

function NavTabs({ tab, setTab }) {
  const items = [
    { id: "heute", label: "Heute" },
    { id: "woche", label: "Woche" },
    { id: "profil", label: "Profil" },
  ];
  return (
    <div style={styles.navWrap}>
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => setTab(it.id)}
          style={{
            ...styles.navBtn,
            ...(tab === it.id ? styles.navBtnActive : {}),
          }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function DayView({ selectedDate, setSelectedDate, plan, checked, onToggle, onStartTimer, dayTitle, quote, weightKg, onGoToProfile }) {
  const wd = (selectedDate.getDay() + 6) % 7;

  const totalKcal = plan.reduce((sum, ex) => sum + (calcKcal(ex.met, ex.minutes, weightKg) || 0), 0);
  const doneKcal = plan
    .filter((ex) => checked.has(ex.id))
    .reduce((sum, ex) => sum + (calcKcal(ex.met, ex.minutes, weightKg) || 0), 0);

  return (
    <div>
      <div style={styles.dayStrip}>
        {WEEKDAYS.map((w, i) => {
          const active = i === wd;
          return (
            <button
              key={w}
              onClick={() => {
                const d = addDays(startOfWeek(selectedDate), i);
                setSelectedDate(d);
              }}
              style={{
                ...styles.dayPill,
                ...(active ? styles.dayPillActive : {}),
              }}
            >
              {w}
            </button>
          );
        })}
      </div>

      <div style={styles.dayTitleRow}>
        <span style={styles.dayTitleFull}>{WEEKDAY_FULL[wd]}</span>
        <span style={styles.dayTitleTag}>{dayTitle}</span>
      </div>

      <div style={styles.quoteBanner}>{quote}</div>

      {weightKg ? (
        <div style={styles.kcalSummary}>
          <span style={styles.kcalSummaryStrong}>{doneKcal} kcal</span> heute schon verbrannt · geschätzt{" "}
          <span style={styles.kcalSummaryStrong}>{totalKcal} kcal</span>, wenn du das komplette Programm
          durchziehst
        </div>
      ) : (
        <button style={styles.kcalHint} onClick={onGoToProfile}>
          Trag dein Gewicht im Profil ein, um deinen Kalorienverbrauch pro Übung zu sehen →
        </button>
      )}

      <div>
        {plan.map((ex) => {
          const done = checked.has(ex.id);
          const kcal = calcKcal(ex.met, ex.minutes, weightKg);
          return (
            <div key={ex.id} style={{ ...styles.card, ...(done ? styles.cardDone : {}) }}>
              <button
                aria-label={done ? "Als offen markieren" : "Als erledigt markieren"}
                onClick={() => onToggle(ex.id)}
                style={{ ...styles.checkCircle, ...(done ? styles.checkCircleDone : {}) }}
              >
                {done ? "✓" : ""}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.cardTopRow}>
                  <span style={{ ...styles.cardName, ...(done ? styles.strike : {}) }}>
                    {ex.name}
                  </span>
                  <span style={styles.tagGroup}>
                    {ex.video && <span style={styles.videoTag}>🎬 VIDEO</span>}
                    <span
                      style={{
                        ...styles.intensityTag,
                        background: INTENSITY_COLOR[ex.intensity] + "22",
                        color: INTENSITY_COLOR[ex.intensity],
                      }}
                    >
                      {INTENSITY_LABEL[ex.intensity]}
                    </span>
                  </span>
                </div>
                <div style={{ ...styles.cardMeta, ...(done ? styles.strike : {}) }}>
                  {ex.meta}
                  {kcal != null && <span style={styles.kcalTag}> · ≈ {kcal} kcal</span>}
                </div>
                <p style={{ ...styles.cardDesc, ...(done ? styles.strike : {}) }}>{ex.desc}</p>

                {ex.steps && (
                  <div style={styles.stepsList}>
                    {ex.steps.map((s, i) => (
                      <div key={i} style={styles.stepRow}>
                        <span style={styles.stepLabel}>
                          <span style={styles.stepNum}>{i + 1}</span>
                          {s.label}
                        </span>
                        <span style={styles.stepEmoji}>{s.emoji}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={styles.actionRow}>
                  {ex.timer && (
                    <button style={styles.timerBtn} onClick={() => onStartTimer(ex)}>
                      ⏱ Timer starten
                    </button>
                  )}
                  <a href={yt(ex.q)} target="_blank" rel="noopener noreferrer" style={styles.ytLink}>
                    ▶ {ex.video ? "Video ansehen" : "Anleitung suchen"}
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Timer-Overlay ---------- */
function TimerOverlay({ exercise, onClose, onFinish }) {
  const phases = exercise.timer;
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [stage, setStage] = useState("intro"); // intro | countdown | running | finished
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [running, setRunning] = useState(true);
  const audioCtxRef = useRef(null);
  const finishedCalledRef = useRef(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const ensureAudio = () => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtxRef.current = new Ctx();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  };

  const beep = (freq = 880, duration = 0.12, volume = 0.25) => {
    try {
      const ctx = ensureAudio();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.value = volume;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (err) {
      console.error("Audio-Fehler", err);
    }
  };

  const tripleBeep = () => {
    beep(1046, 0.16, 0.3);
    setTimeout(() => beep(1046, 0.16, 0.3), 230);
    setTimeout(() => beep(1046, 0.16, 0.3), 460);
  };

  const handleStart = () => {
    ensureAudio();
    setStage("countdown");
    setSecondsLeft(5);
    setRunning(true);
  };

  const handleSkipPhase = () => {
    if (stage !== "running") return;
    if (phaseIdx >= phases.length - 1) {
      tripleBeep();
      setStage("finished");
    } else {
      const nextIdx = phaseIdx + 1;
      setPhaseIdx(nextIdx);
      setSecondsLeft(phases[nextIdx].seconds);
      beep(740, 0.1);
    }
  };

  // Tick jede Sekunde
  useEffect(() => {
    if (!running) return;
    if (stage !== "countdown" && stage !== "running") return;
    const id = setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);
    return () => clearInterval(id);
  }, [running, stage]);

  // Reaktion auf Countdown-Ablauf / Phasenwechsel
  useEffect(() => {
    if (stage === "countdown") {
      if (secondsLeft <= 0) {
        beep(660, 0.18, 0.3);
        setStage("running");
        setPhaseIdx(0);
        setSecondsLeft(phases[0].seconds);
      } else if (secondsLeft <= 5) {
        beep(440, 0.08);
      }
    } else if (stage === "running") {
      if (secondsLeft <= 0) {
        if (phaseIdx >= phases.length - 1) {
          tripleBeep();
          setStage("finished");
        } else {
          beep(740, 0.1);
          const nextIdx = phaseIdx + 1;
          setPhaseIdx(nextIdx);
          setSecondsLeft(phases[nextIdx].seconds);
        }
      } else if (secondsLeft <= 10) {
        beep(880, 0.09);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  useEffect(() => {
    if (stage === "finished" && !finishedCalledRef.current) {
      finishedCalledRef.current = true;
      onFinish && onFinish();
    }
  }, [stage, onFinish]);

  const phase = phases[phaseIdx] || phases[0];
  const isRest = phase.type === "rest";
  const isCritical = (stage === "running" || stage === "countdown") && secondsLeft <= 10 && secondsLeft > 0;

  const bgGradient =
    stage === "finished"
      ? `linear-gradient(160deg, ${VIOLET}, #5B0EA8)`
      : stage === "intro"
      ? `linear-gradient(160deg, ${PINK}, ${VIOLET})`
      : isRest
      ? `linear-gradient(160deg, #6C2BD9, #3B0764)`
      : `linear-gradient(160deg, ${PINK}, ${VIOLET})`;

  let roundInfo = "";
  if (phase.block) roundInfo = `Block ${phase.block}/${phase.totalBlocks} · Runde ${phase.round}/${phase.totalRounds}`;
  else if (phase.round) roundInfo = `Runde ${phase.round}/${phase.totalRounds}`;

  const phaseNumberInfo = stage === "running" ? `Phase ${phaseIdx + 1}/${phases.length}` : "";

  return (
    <div style={{ ...styles.timerOverlay, background: bgGradient }}>
      <button style={styles.timerCloseBtn} onClick={onClose} aria-label="Timer schließen">
        ✕
      </button>

      {stage === "intro" && (
        <div style={styles.timerCenter}>
          <div style={styles.timerIntroLabel}>{exercise.name}</div>
          <div style={styles.timerIntroSub}>
            Gesamtdauer ≈ {Math.round(phases.reduce((s, p) => s + p.seconds, 0) / 60)} Min
          </div>
          <button style={styles.timerStartBtn} onClick={handleStart}>
            ▶ Start
          </button>
        </div>
      )}

      {stage === "countdown" && (
        <div style={styles.timerCenter}>
          <div style={styles.timerPhaseLabel}>Bereit machen …</div>
          <div style={{ ...styles.timerBigNumber, animation: "ss-pop 0.3s ease-out" }} key={secondsLeft}>
            {secondsLeft > 0 ? secondsLeft : "LOS!"}
          </div>
        </div>
      )}

      {stage === "running" && (
        <div style={styles.timerCenter}>
          {roundInfo && <div style={styles.timerRoundInfo}>{roundInfo}</div>}
          <div style={styles.timerPhaseLabel}>{isRest ? "PAUSE" : phase.label || exercise.name}</div>
          <div
            style={{
              ...styles.timerBigNumber,
              ...(isCritical ? styles.timerBigNumberCritical : {}),
            }}
            key={isCritical ? `crit-${secondsLeft}` : "normal"}
          >
            {fmtTime(secondsLeft)}
          </div>
          <div style={styles.timerProgressTrack}>
            <div
              style={{
                ...styles.timerProgressFill,
                width: `${Math.max(0, Math.min(100, (1 - secondsLeft / phase.seconds) * 100))}%`,
              }}
            />
          </div>
          {phaseNumberInfo && <div style={styles.timerPhaseCount}>{phaseNumberInfo}</div>}

          <div style={styles.timerControls}>
            <button style={styles.timerCtrlBtn} onClick={() => setRunning((r) => !r)}>
              {running ? "⏸ Pause" : "▶ Weiter"}
            </button>
            <button style={styles.timerCtrlBtn} onClick={handleSkipPhase}>
              ⏭ Überspringen
            </button>
          </div>
        </div>
      )}

      {stage === "finished" && (
        <div style={styles.timerCenter}>
          <div style={styles.timerFinishedEmoji}>🎉</div>
          <div style={styles.timerPhaseLabel}>Fertig!</div>
          <div style={styles.timerIntroSub}>{exercise.name} geschafft – super gemacht!</div>
          <button style={styles.timerStartBtn} onClick={onClose}>
            Schließen
          </button>
        </div>
      )}
    </div>
  );
}

function WeekView({ weekOffset, setWeekOffset, weekDates, completionFor, onPickDay }) {
  const todayKey = isoDate(new Date());
  // build a winding SVG path across 7 checkpoints
  const W = 640;
  const H = 160;
  const pts = weekDates.map((_, i) => {
    const x = 40 + i * ((W - 80) / 6);
    const y = 80 + Math.sin(i * 1.1) * 34;
    return [x, y];
  });
  const pathD = pts
    .map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`))
    .join(" ");

  return (
    <div>
      <div style={styles.weekNav}>
        <button style={styles.weekArrow} onClick={() => setWeekOffset(weekOffset - 1)}>
          ← 
        </button>
        <div style={styles.weekLabel}>
          {weekOffset === 0 ? "Diese Woche" : weekOffset < 0 ? `Vor ${-weekOffset} Woche(n)` : `In ${weekOffset} Woche(n)`}
        </div>
        <button style={styles.weekArrow} onClick={() => setWeekOffset(weekOffset + 1)}>
          →
        </button>
      </div>

      <div style={styles.trailWrap}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
          <path d={pathD} stroke={LINE} strokeWidth="4" fill="none" />
          {pts.map((p, i) => {
            const rate = completionFor(weekDates[i]);
            const isToday = isoDate(weekDates[i]) === todayKey;
            const r = 14;
            return (
              <g key={i} onClick={() => onPickDay(weekDates[i])} style={{ cursor: "pointer" }}>
                <circle cx={p[0]} cy={p[1]} r={r} fill="#FFFFFF" stroke={LINE} strokeWidth="3" />
                <circle
                  cx={p[0]}
                  cy={p[1]}
                  r={r}
                  fill="none"
                  stroke={rate >= 1 ? VIOLET : PINK}
                  strokeWidth="3"
                  strokeDasharray={`${2 * Math.PI * r * rate} ${2 * Math.PI * r}`}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${p[0]} ${p[1]})`}
                />
                {isToday && <circle cx={p[0]} cy={p[1]} r={r + 6} fill="none" stroke={VIOLET} strokeWidth="2" strokeDasharray="3 3" />}
                <text x={p[0]} y={p[1] + 4} textAnchor="middle" style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, fontWeight: 700, fill: INK }}>
                  {Math.round(rate * 100)}
                </text>
                <text x={p[0]} y={p[1] + r + 20} textAnchor="middle" style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, fill: MUTED }}>
                  {WEEKDAYS[i]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div style={styles.weekList}>
        {weekDates.map((d, i) => {
          const rate = completionFor(d);
          return (
            <button key={i} onClick={() => onPickDay(d)} style={styles.weekRow}>
              <span style={styles.weekRowDay}>
                {WEEKDAY_FULL[i]} <span style={styles.weekRowDate}>{fmtShort(d)}</span>
              </span>
              <span style={styles.weekRowBarTrack}>
                <span style={{ ...styles.weekRowBarFill, width: `${Math.round(rate * 100)}%`, background: rate >= 1 ? VIOLET : PINK }} />
              </span>
              <span style={styles.weekRowPct}>{Math.round(rate * 100)}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProfileView({
  profileDraft,
  setProfileDraft,
  onSaveProfile,
  weightLog,
  weightInput,
  setWeightInput,
  onAddWeight,
  weighedInThisWeek,
  profile,
}) {
  const sorted = [...weightLog].sort((a, b) => a.date.localeCompare(b.date));
  const min = sorted.length ? Math.min(...sorted.map((e) => e.weight)) : 0;
  const max = sorted.length ? Math.max(...sorted.map((e) => e.weight)) : 1;
  const range = Math.max(1, max - min);

  const bmi =
    profile.weight && profile.height
      ? profile.weight / Math.pow(profile.height / 100, 2)
      : null;

  const W = 640;
  const H = 180;
  const pts = sorted.map((e, i) => {
    const x = sorted.length > 1 ? (i / (sorted.length - 1)) * (W - 40) + 20 : W / 2;
    const y = H - 30 - ((e.weight - min) / range) * (H - 60);
    return [x, y];
  });
  const pathD = pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(" ");

  return (
    <div>
      <div style={styles.progressIntro}>
        <div style={styles.dayTitleTag}>PROFIL</div>
        <h3 style={styles.progressTitle}>Gewicht &amp; Größe</h3>
        <p style={styles.cardDesc}>
          Diese Angaben werden genutzt, um deinen Kalorienverbrauch pro Übung zu berechnen. Du
          kannst sie jederzeit aktualisieren.
        </p>
        <div style={styles.progressInputRow}>
          <input
            type="number"
            min="0"
            step="0.1"
            value={profileDraft.weight}
            onChange={(e) => setProfileDraft((d) => ({ ...d, weight: e.target.value }))}
            placeholder="Gewicht (kg)"
            style={styles.input}
          />
          <input
            type="number"
            min="0"
            step="1"
            value={profileDraft.height}
            onChange={(e) => setProfileDraft((d) => ({ ...d, height: e.target.value }))}
            placeholder="Größe (cm)"
            style={styles.input}
          />
          <button onClick={onSaveProfile} style={styles.addBtn}>
            Speichern
          </button>
        </div>
        {bmi && <div style={styles.bmiTag}>BMI ≈ {bmi.toFixed(1)}</div>}
      </div>

      <div style={styles.progressIntro}>
        <div style={styles.dayTitleTag}>WOCHEN-GEWICHTSCHECK · 1×/WOCHE</div>
        <h3 style={styles.progressTitle}>
          {weighedInThisWeek ? "Diese Woche schon eingetragen" : "Gewicht für diese Woche eintragen"}
        </h3>
        <p style={styles.cardDesc}>
          {weighedInThisWeek
            ? `Du hast diese Woche bereits ${weighedInThisWeek.weight} kg eingetragen. Du kannst den Wert bei Bedarf überschreiben.`
            : "Wiege dich am besten immer zur gleichen Tageszeit (z. B. morgens nüchtern) für vergleichbare Werte."}
        </p>
        <div style={styles.progressInputRow}>
          <input
            type="number"
            min="0"
            step="0.1"
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            placeholder="Gewicht diese Woche (kg)"
            style={styles.input}
          />
          <button onClick={onAddWeight} style={styles.addBtn}>
            {weighedInThisWeek ? "Aktualisieren" : "Eintragen"}
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div style={styles.emptyState}>Noch keine Gewichtseinträge. Trag deinen ersten Wochenwert ein!</div>
      ) : (
        <div style={styles.chartWrap}>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
            <path d={pathD} stroke={PINK} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p, i) => (
              <g key={i}>
                <circle cx={p[0]} cy={p[1]} r="5" fill={PINK} />
                <text x={p[0]} y={p[1] - 12} textAnchor="middle" style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11, fontWeight: 700, fill: INK }}>
                  {sorted[i].weight}
                </text>
                <text x={p[0]} y={H - 8} textAnchor="middle" style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, fill: MUTED }}>
                  {fmtShort(new Date(sorted[i].date))}
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}
    </div>
  );
}

function SaveIndicator({ state }) {
  if (state === "idle") return null;
  const text = state === "saving" ? "Speichert …" : state === "saved" ? "Gespeichert" : "Fehler beim Speichern";
  return <div style={styles.saveIndicator}>{text}</div>;
}

const styles = {
  app: {
    minHeight: "100vh",
    background: BG,
    fontFamily: "Inter, sans-serif",
    color: INK,
    padding: "max(20px, env(safe-area-inset-top)) 16px 60px",
    boxSizing: "border-box",
    width: "100%",
    overflowX: "hidden",
  },
  shell: { maxWidth: 640, margin: "0 auto" },
  header: { marginBottom: 20 },
  headerRow: { display: "flex", alignItems: "center", gap: 14, marginBottom: 10 },
  headerEyebrow: {
    fontFamily: "IBM Plex Mono, monospace",
    fontSize: 11,
    letterSpacing: "0.12em",
    color: PINK,
    fontWeight: 700,
  },
  headerTitle: {
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: "clamp(30px, 9vw, 42px)",
    fontWeight: 800,
    margin: "4px 0 0",
    letterSpacing: "-0.02em",
    background: `linear-gradient(90deg, ${PINK}, ${VIOLET})`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  headerSub: { color: MUTED, fontSize: 15, margin: 0, lineHeight: 1.5, fontWeight: 500 },
  navWrap: { display: "flex", gap: 8, margin: "20px 0 18px", borderBottom: `2px solid ${LINE}`, paddingBottom: 12, flexWrap: "wrap" },
  navBtn: {
    fontFamily: "Space Grotesk, sans-serif",
    fontWeight: 700,
    fontSize: 14,
    border: "none",
    background: "transparent",
    color: MUTED,
    padding: "10px 16px",
    borderRadius: 20,
    cursor: "pointer",
    minHeight: 40,
  },
  navBtnActive: { background: `linear-gradient(90deg, ${PINK}, ${VIOLET})`, color: "#FFFFFF" },
  dayStrip: { display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" },
  dayPill: {
    fontFamily: "IBM Plex Mono, monospace",
    fontSize: 13,
    fontWeight: 700,
    border: `2px solid ${LINE}`,
    background: "#FFFFFF",
    color: MUTED,
    padding: "10px 14px",
    borderRadius: 12,
    cursor: "pointer",
    minHeight: 40,
  },
  dayPillActive: { background: PINK, borderColor: PINK, color: "#FFFFFF" },
  dayTitleRow: { display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14, flexWrap: "wrap" },
  dayTitleFull: { fontFamily: "Space Grotesk, sans-serif", fontWeight: 800, fontSize: 22, color: INK },
  dayTitleTag: {
    fontFamily: "IBM Plex Mono, monospace",
    fontSize: 11,
    letterSpacing: "0.06em",
    color: PINK,
    fontWeight: 700,
  },
  quoteBanner: {
    background: `linear-gradient(135deg, ${PINK}, ${VIOLET})`,
    color: "#FFFFFF",
    fontFamily: "Space Grotesk, sans-serif",
    fontWeight: 700,
    fontSize: 14.5,
    padding: "14px 18px",
    borderRadius: 16,
    marginBottom: 14,
    lineHeight: 1.4,
  },
  kcalSummary: {
    background: "#FFE3F2",
    border: `2px solid #FFB6DE`,
    color: INK,
    borderRadius: 14,
    padding: "10px 14px",
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 14,
    lineHeight: 1.5,
  },
  kcalSummaryStrong: { fontFamily: "Space Grotesk, sans-serif", fontWeight: 800, color: PINK },
  kcalHint: {
    display: "block",
    width: "100%",
    textAlign: "left",
    background: "#FFE3F2",
    border: `2px dashed ${PINK}`,
    color: PINK,
    borderRadius: 14,
    padding: "12px 14px",
    fontSize: 14,
    marginBottom: 14,
    cursor: "pointer",
    fontFamily: "Inter, sans-serif",
    fontWeight: 700,
    minHeight: 44,
  },
  kcalTag: { color: PINK, fontWeight: 700 },
  card: {
    display: "flex",
    gap: 14,
    background: "#FFFFFF",
    border: `2px solid ${LINE}`,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  cardDone: { background: "#FBF2FF", borderColor: "#E7C6FA" },
  checkCircle: {
    minWidth: 36,
    height: 36,
    borderRadius: "50%",
    border: `2px solid ${LINE}`,
    background: "#FFFFFF",
    color: "#FFFFFF",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 16,
    lineHeight: "32px",
    flexShrink: 0,
  },
  checkCircleDone: { background: VIOLET, borderColor: VIOLET },
  cardTopRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" },
  cardName: { fontFamily: "Space Grotesk, sans-serif", fontWeight: 800, fontSize: 16.5, color: INK },
  tagGroup: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" },
  videoTag: {
    fontFamily: "IBM Plex Mono, monospace",
    fontSize: 10,
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: 8,
    background: `${VIOLET}22`,
    color: VIOLET,
    whiteSpace: "nowrap",
  },
  intensityTag: { fontFamily: "IBM Plex Mono, monospace", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 8, whiteSpace: "nowrap" },
  cardMeta: { fontFamily: "IBM Plex Mono, monospace", fontSize: 12.5, color: MUTED, marginTop: 2, fontWeight: 600 },
  cardDesc: { fontSize: 14, color: INK, lineHeight: 1.58, margin: "8px 0", opacity: 0.85 },
  strike: { textDecoration: "line-through", opacity: 0.5 },
  stepsList: { display: "flex", flexDirection: "column", gap: 6, margin: "10px 0" },
  stepRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: BG,
    border: `1px solid ${LINE}`,
    borderRadius: 10,
    padding: "9px 12px",
  },
  stepLabel: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: INK },
  stepNum: {
    fontFamily: "IBM Plex Mono, monospace",
    fontSize: 11,
    fontWeight: 700,
    color: "#FFFFFF",
    background: PINK,
    width: 18,
    height: 18,
    borderRadius: "50%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepEmoji: { fontSize: 19 },
  actionRow: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 },
  timerBtn: {
    fontFamily: "Space Grotesk, sans-serif",
    fontWeight: 700,
    fontSize: 13.5,
    color: "#FFFFFF",
    background: `linear-gradient(90deg, ${PINK}, ${VIOLET})`,
    border: "none",
    borderRadius: 12,
    padding: "10px 16px",
    cursor: "pointer",
    minHeight: 40,
  },
  ytLink: { fontSize: 13.5, fontWeight: 700, color: PINK, textDecoration: "none", padding: "10px 4px" },
  weekNav: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  weekArrow: { border: `2px solid ${LINE}`, background: "#FFFFFF", borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 16, fontWeight: 700, color: PINK, minHeight: 40 },
  weekLabel: { fontFamily: "Space Grotesk, sans-serif", fontWeight: 700, fontSize: 15, color: INK },
  trailWrap: { background: "#FFFFFF", border: `2px solid ${LINE}`, borderRadius: 18, padding: "12px 8px", marginBottom: 18 },
  weekList: { display: "flex", flexDirection: "column", gap: 8 },
  weekRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#FFFFFF",
    border: `2px solid ${LINE}`,
    borderRadius: 14,
    padding: "12px 14px",
    cursor: "pointer",
    textAlign: "left",
    minHeight: 44,
  },
  weekRowDay: { fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13, width: 130, flexShrink: 0, color: INK },
  weekRowDate: { color: MUTED, fontWeight: 500 },
  weekRowBarTrack: { flex: 1, height: 8, background: "#FFE9F5", borderRadius: 6, overflow: "hidden" },
  weekRowBarFill: { display: "block", height: "100%", borderRadius: 6 },
  weekRowPct: { fontFamily: "IBM Plex Mono, monospace", fontSize: 12, fontWeight: 700, width: 40, textAlign: "right", color: INK },
  progressIntro: { background: "#FFFFFF", border: `2px solid ${LINE}`, borderRadius: 18, padding: 18, marginBottom: 16 },
  progressTitle: { fontFamily: "Space Grotesk, sans-serif", fontSize: 20, fontWeight: 800, margin: "6px 0", color: INK },
  progressInputRow: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" },
  input: { flex: 1, minWidth: 120, border: `2px solid ${LINE}`, borderRadius: 12, padding: "12px 12px", fontSize: 16, fontFamily: "IBM Plex Mono, monospace", fontWeight: 600, color: INK, minHeight: 44 },
  addBtn: { background: `linear-gradient(90deg, ${PINK}, ${VIOLET})`, color: "#FFFFFF", border: "none", borderRadius: 12, padding: "12px 20px", fontWeight: 700, cursor: "pointer", fontFamily: "Space Grotesk, sans-serif", minHeight: 44 },
  bmiTag: {
    marginTop: 12,
    display: "inline-block",
    fontFamily: "IBM Plex Mono, monospace",
    fontSize: 12,
    fontWeight: 700,
    background: "#FFE9F5",
    color: INK,
    padding: "6px 12px",
    borderRadius: 10,
  },
  emptyState: { textAlign: "center", color: MUTED, padding: "30px 0", fontSize: 14, fontWeight: 600 },
  chartWrap: { background: "#FFFFFF", border: `2px solid ${LINE}`, borderRadius: 18, padding: 12 },
  saveIndicator: { position: "fixed", bottom: "max(16px, env(safe-area-inset-bottom))", right: 16, background: `linear-gradient(90deg, ${PINK}, ${VIOLET})`, color: "#FFFFFF", fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 20, fontFamily: "IBM Plex Mono, monospace", zIndex: 500 },
  footer: { marginTop: 30, fontSize: 13, color: MUTED, lineHeight: 1.6, borderTop: `2px solid ${LINE}`, paddingTop: 16, fontWeight: 500 },

  /* Timer-Overlay */
  timerOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "max(20px, env(safe-area-inset-top)) 20px max(20px, env(safe-area-inset-bottom))",
    fontFamily: "Inter, sans-serif",
  },
  timerCloseBtn: {
    position: "absolute",
    top: "max(16px, env(safe-area-inset-top))",
    right: 16,
    width: 44,
    height: 44,
    borderRadius: "50%",
    border: "none",
    background: "rgba(255,255,255,0.2)",
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: 700,
    cursor: "pointer",
  },
  timerCenter: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", maxWidth: 480, textAlign: "center" },
  timerIntroLabel: { fontFamily: "Space Grotesk, sans-serif", fontWeight: 800, fontSize: "clamp(24px, 7vw, 34px)", color: "#FFFFFF", marginBottom: 10 },
  timerIntroSub: { fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 15, color: "rgba(255,255,255,0.85)", marginBottom: 30 },
  timerStartBtn: {
    fontFamily: "Space Grotesk, sans-serif",
    fontWeight: 800,
    fontSize: 20,
    color: PINK,
    background: "#FFFFFF",
    border: "none",
    borderRadius: 20,
    padding: "18px 44px",
    cursor: "pointer",
    minHeight: 56,
  },
  timerPhaseLabel: {
    fontFamily: "Space Grotesk, sans-serif",
    fontWeight: 800,
    fontSize: "clamp(24px, 8vw, 40px)",
    color: "#FFFFFF",
    marginBottom: 8,
    letterSpacing: "0.01em",
  },
  timerRoundInfo: {
    fontFamily: "IBM Plex Mono, monospace",
    fontWeight: 700,
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 10,
    letterSpacing: "0.05em",
  },
  timerBigNumber: {
    fontFamily: "IBM Plex Mono, monospace",
    fontWeight: 700,
    fontSize: "clamp(4.5rem, 24vw, 9rem)",
    color: "#FFFFFF",
    lineHeight: 1,
    margin: "10px 0",
  },
  timerBigNumberCritical: {
    fontSize: "clamp(6rem, 34vw, 13rem)",
    color: ALERT,
    animation: "ss-pulse 1s ease-in-out infinite",
  },
  timerProgressTrack: {
    width: "100%",
    height: 10,
    background: "rgba(255,255,255,0.25)",
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 10,
  },
  timerProgressFill: { display: "block", height: "100%", background: "#FFFFFF", borderRadius: 8 },
  timerPhaseCount: {
    fontFamily: "IBM Plex Mono, monospace",
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    marginTop: 12,
    fontWeight: 600,
  },
  timerControls: { display: "flex", gap: 12, marginTop: 34, flexWrap: "wrap", justifyContent: "center" },
  timerCtrlBtn: {
    fontFamily: "Space Grotesk, sans-serif",
    fontWeight: 700,
    fontSize: 15,
    color: "#FFFFFF",
    background: "rgba(255,255,255,0.18)",
    border: "2px solid rgba(255,255,255,0.4)",
    borderRadius: 16,
    padding: "12px 20px",
    cursor: "pointer",
    minHeight: 48,
  },
  timerFinishedEmoji: { fontSize: 64, marginBottom: 10 },
};
