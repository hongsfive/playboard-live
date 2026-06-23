/**
 * Recreation Scoreboard App — Shared Data Layer
 * localStorage-backed storage for Game, Repertoire, Session, SessionGameRecord
 */

/* === Storage Helpers === */
const STORAGE_KEYS = {
  GAMES: 'rec_games',
  REPERTOIRES: 'rec_repertoires',
  REPERTOIRE_ITEMS: 'rec_repertoire_items',
  SESSIONS: 'rec_sessions',
  RECORDS: 'rec_records',
  ACTIVE_SESSION: 'rec_active_session',
};

function load(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
  if (window._fbSchedulePush) window._fbSchedulePush();
}
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function inferScoringMode(data = {}) {
  if (data.scoringMode) return data.scoringMode;
  const category = String(data.category || '');
  const name = String(data.name || '');
  const quizKeywords = ['퀴즈', '몸으로 말해요', '스피드'];
  const looksLikeQuiz = category.includes('퀴즈') || quizKeywords.some(keyword => name.includes(keyword));
  return looksLikeQuiz ? 'per_question' : 'fixed_per_game';
}

/* === CRUD Helpers === */
function findAll(key) { return load(key); }
function findById(key, id) { return load(key).find(x => x.id === id); }
function insert(key, item) {
  const list = load(key);
  list.push(item);
  save(key, list);
  return item;
}
function update(key, id, patch) {
  const list = load(key);
  const idx = list.findIndex(x => x.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
  save(key, list);
  return list[idx];
}
function remove(key, id) {
  const list = load(key).filter(x => x.id !== id);
  save(key, list);
}

/* === Game === */
const Game = {
  all() { return findAll(STORAGE_KEYS.GAMES); },
  byId(id) { return findById(STORAGE_KEYS.GAMES, id); },
  create(data) {
    return insert(STORAGE_KEYS.GAMES, {
      id: genId(),
      name: data.name || 'Unnamed Game',
      category: data.category || '',
      description: data.description || '',
      howToPlay: data.howToPlay || '',
      estimatedMinutes: Number(data.estimatedMinutes) || 10,
      materialsText: data.materialsText || '',
      minPlayers: Number(data.minPlayers) || 2,
      recommendedPlayers: Number(data.recommendedPlayers) || 10,
      scoreEnabled: data.scoreEnabled !== false,
      scoringMode: inferScoringMode(data),
      defaultPoints: Number(data.defaultPoints) || 10,
      defaultPointsPerQuestion: Number(data.defaultPointsPerQuestion) || Number(data.defaultPoints) || 10,
      defaultPointsPerPerson: Number(data.defaultPointsPerPerson) || Number(data.defaultPointsPerQuestion) || Number(data.defaultPoints) || 10,
      difficulty: data.difficulty || 'medium',
      energyLevel: data.energyLevel || 'medium',
      tags: data.tags || [],
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },
  update(id, patch) { return update(STORAGE_KEYS.GAMES, id, patch); },
  delete(id) { remove(STORAGE_KEYS.GAMES, id); },
};

/* === Repertoire === */
const Repertoire = {
  all() { return findAll(STORAGE_KEYS.REPERTOIRES); },
  byId(id) { return findById(STORAGE_KEYS.REPERTOIRES, id); },
  create(data) {
    const rep = insert(STORAGE_KEYS.REPERTOIRES, {
      id: genId(),
      title: data.title || 'Untitled Repertoire',
      description: data.description || '',
      audienceType: data.audienceType || 'general',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return rep;
  },
  update(id, patch) { return update(STORAGE_KEYS.REPERTOIRES, id, patch); },
  delete(id) {
    remove(STORAGE_KEYS.REPERTOIRES, id);
    // cascade delete items
    const items = RepertoireItem.byRepertoire(id);
    items.forEach(i => RepertoireItem.delete(i.id));
  },
  items(repertoireId) { return RepertoireItem.byRepertoire(repertoireId); },
  addItem(repertoireId, gameId, customData = {}) {
    const items = RepertoireItem.byRepertoire(repertoireId);
    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.orderIndex)) : -1;
    const game = Game.byId(gameId);
    return RepertoireItem.insert({
      repertoireId,
      gameId,
      orderIndex: maxOrder + 1,
      active: true,
      customPoints: customData.customPoints ?? (game ? (game.scoringMode === 'per_question' ? (game.defaultPointsPerQuestion || game.defaultPoints) : game.scoringMode === 'per_person' ? (game.defaultPointsPerPerson || game.defaultPoints) : game.defaultPoints) : 10),
      customEstimatedMinutes: customData.customEstimatedMinutes ?? (game ? game.estimatedMinutes : 10),
      customNote: customData.customNote || '',
    });
  },
  updateItemOrder(itemIds) {
    itemIds.forEach((id, idx) => {
      RepertoireItem.update(id, { orderIndex: idx });
    });
  },
  removeItem(itemId) { RepertoireItem.delete(itemId); },
  insertItemAfter(targetItemId, gameId, customData = {}) {
    const target = RepertoireItem.byId(targetItemId);
    if (!target) return null;
    const items = RepertoireItem.byRepertoire(target.repertoireId);
    const insertIndex = items.findIndex(i => i.id === targetItemId);
    if (insertIndex === -1) return null;
    const shifted = items.slice(insertIndex + 1);
    shifted.forEach(item => {
      RepertoireItem.update(item.id, { orderIndex: item.orderIndex + 1 });
    });
    const game = Game.byId(gameId);
    return RepertoireItem.insert({
      repertoireId: target.repertoireId,
      gameId,
      orderIndex: target.orderIndex + 1,
      active: true,
      customPoints: customData.customPoints ?? (game ? (game.scoringMode === 'per_question' ? (game.defaultPointsPerQuestion || game.defaultPoints) : game.scoringMode === 'per_person' ? (game.defaultPointsPerPerson || game.defaultPoints) : game.defaultPoints) : 10),
      customEstimatedMinutes: customData.customEstimatedMinutes ?? (game ? game.estimatedMinutes : 10),
      customNote: customData.customNote || '',
    });
  },
  totalEstimatedMinutes(repertoireId) {
    const items = RepertoireItem.byRepertoire(repertoireId).filter(i => i.active);
    return items.reduce((sum, i) => sum + (i.customEstimatedMinutes || 10), 0);
  },
  totalMaterials(repertoireId) {
    const items = RepertoireItem.byRepertoire(repertoireId).filter(i => i.active);
    const materials = new Set();
    items.forEach(item => {
      const game = Game.byId(item.gameId);
      if (game && game.materialsText) {
        game.materialsText.split(',').forEach(m => materials.add(m.trim()));
      }
    });
    return Array.from(materials);
  },
};

/* === RepertoireItem === */
const RepertoireItem = {
  all() { return findAll(STORAGE_KEYS.REPERTOIRE_ITEMS); },
  byId(id) { return findById(STORAGE_KEYS.REPERTOIRE_ITEMS, id); },
  byRepertoire(repertoireId) {
    return findAll(STORAGE_KEYS.REPERTOIRE_ITEMS)
      .filter(i => i.repertoireId === repertoireId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  },
  insert(data) {
    return insert(STORAGE_KEYS.REPERTOIRE_ITEMS, {
      id: genId(),
      repertoireId: data.repertoireId,
      gameId: data.gameId,
      orderIndex: data.orderIndex ?? 0,
      active: data.active !== false,
      customPoints: data.customPoints ?? 10,
      customEstimatedMinutes: data.customEstimatedMinutes ?? 10,
      customNote: data.customNote || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  },
  update(id, patch) { return update(STORAGE_KEYS.REPERTOIRE_ITEMS, id, patch); },
  delete(id) { remove(STORAGE_KEYS.REPERTOIRE_ITEMS, id); },
};

/* === Session === */
const Session = {
  all() { return findAll(STORAGE_KEYS.SESSIONS); },
  byId(id) { return findById(STORAGE_KEYS.SESSIONS, id); },
  create(data) {
    const session = insert(STORAGE_KEYS.SESSIONS, {
      id: genId(),
      repertoireId: data.repertoireId || '',
      title: data.title || 'Untitled Session',
      date: data.date || new Date().toISOString().slice(0, 10),
      leftTeamName: data.leftTeamName || 'Left Team',
      rightTeamName: data.rightTeamName || 'Right Team',
      completedItemIds: [],
      status: data.status || 'planning', // planning | active | completed
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return session;
  },
  update(id, patch) { return update(STORAGE_KEYS.SESSIONS, id, patch); },
  delete(id) {
    remove(STORAGE_KEYS.SESSIONS, id);
    Record.bySession(id).forEach(r => Record.delete(r.id));
  },
  replaceRepertoire(sessionId, repertoireId) {
    return this.update(sessionId, { repertoireId: repertoireId || '' });
  },
  setActive(id) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, id);
    if (window._fbSchedulePush) window._fbSchedulePush();
  },
  getActive() {
    const id = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
    return id ? this.byId(id) : null;
  },
  clearActive() {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
    if (window._fbSchedulePush) window._fbSchedulePush();
  },
  getCompletedItemIds(sessionId) {
    const session = this.byId(sessionId);
    return Array.isArray(session?.completedItemIds) ? session.completedItemIds : [];
  },
  markItemCompleted(sessionId, itemId) {
    const completed = this.getCompletedItemIds(sessionId);
    if (completed.includes(itemId)) return this.byId(sessionId);
    return this.update(sessionId, { completedItemIds: [...completed, itemId], status: 'active' });
  },
  reopenItem(sessionId, itemId) {
    const completed = this.getCompletedItemIds(sessionId);
    return this.update(sessionId, { completedItemIds: completed.filter(id => id !== itemId), status: 'active' });
  },
  getScores(sessionId) {
    const records = Record.bySession(sessionId);
    let leftTotal = 0, rightTotal = 0;
    records.forEach(r => {
      leftTotal += r.leftPoints || 0;
      rightTotal += r.rightPoints || 0;
    });
    return { leftTotal, rightTotal, recordCount: records.length };
  },
};

/* === SessionGameRecord === */
const Record = {
  all() { return findAll(STORAGE_KEYS.RECORDS); },
  byId(id) { return findById(STORAGE_KEYS.RECORDS, id); },
  bySession(sessionId) {
    return findAll(STORAGE_KEYS.RECORDS)
      .filter(r => r.sessionId === sessionId)
      .sort((a, b) => a.roundNumber - b.roundNumber);
  },
  create(data) {
    return insert(STORAGE_KEYS.RECORDS, {
      id: genId(),
      sessionId: data.sessionId,
      repertoireItemId: data.repertoireItemId || '',
      roundNumber: data.roundNumber || 1,
      resultType: data.resultType, // 'left_win' | 'right_win' | 'draw_zero' | 'draw_half' | 'bonus_left' | 'bonus_right' | 'quiz_round'
      questionCount: Number(data.questionCount) || 0,
      correctCountLeft: Number(data.correctCountLeft) || 0,
      correctCountRight: Number(data.correctCountRight) || 0,
      pointsUsed: data.pointsUsed || 0,
      leftPoints: data.leftPoints || 0,
      rightPoints: data.rightPoints || 0,
      note: data.note || '',
      playedAt: new Date().toISOString(),
    });
  },
  update(id, patch) { return update(STORAGE_KEYS.RECORDS, id, patch); },
  delete(id) { remove(STORAGE_KEYS.RECORDS, id); },
  deleteLatest(sessionId) {
    const records = this.bySession(sessionId);
    if (records.length === 0) return null;
    const latest = records[records.length - 1];
    this.delete(latest.id);
    return latest;
  },
  deleteLatestByItem(sessionId, repertoireItemId) {
    const records = this.bySession(sessionId).filter(r => r.repertoireItemId === repertoireItemId);
    if (records.length === 0) return null;
    const latest = records[records.length - 1];
    this.delete(latest.id);
    return latest;
  },
  deleteByItem(sessionId, repertoireItemId) {
    const records = this.bySession(sessionId).filter(r => r.repertoireItemId === repertoireItemId);
    records.forEach(r => this.delete(r.id));
    return records.length;
  },
};

/* === Score Calculation === */
function calculatePoints(resultType, pointsUsed) {
  let leftPoints = 0, rightPoints = 0;
  switch (resultType) {
    case 'left_win':
      leftPoints = pointsUsed;
      break;
    case 'right_win':
      rightPoints = pointsUsed;
      break;
    case 'draw_zero':
      leftPoints = 0;
      rightPoints = 0;
      break;
    case 'draw_half':
      leftPoints = Math.round(pointsUsed / 2);
      rightPoints = Math.round(pointsUsed / 2);
      break;
    case 'bonus_left':
      leftPoints = pointsUsed;
      break;
    case 'bonus_right':
      rightPoints = pointsUsed;
      break;
  }
  return { leftPoints, rightPoints };
}

function calculateQuizPoints(pointsPerQuestion, correctCountLeft, correctCountRight) {
  const unit = Number(pointsPerQuestion) || 0;
  const leftCorrect = Number(correctCountLeft) || 0;
  const rightCorrect = Number(correctCountRight) || 0;
  return {
    leftPoints: leftCorrect * unit,
    rightPoints: rightCorrect * unit,
  };
}

function calculatePersonPoints(pointsPerPerson, countLeft, countRight) {
  const unit = Number(pointsPerPerson) || 0;
  return {
    leftPoints: (Number(countLeft) || 0) * unit,
    rightPoints: (Number(countRight) || 0) * unit,
  };
}

/* === Seed Sample Data === */
function seedSampleData() {
  if (Game.all().length > 0) return; // already has data

  const sampleGames = [
    { name: '계주 릴레이', category: '운동', estimatedMinutes: 15, defaultPoints: 20, materialsText: '배턴 2개, cone 4개', difficulty: 'easy', energyLevel: 'high', minPlayers: 4, recommendedPlayers: 20, scoringMode: 'fixed_per_game' },
    { name: '몸으로 말해요', category: '레크레이션', estimatedMinutes: 10, defaultPoints: 15, defaultPointsPerQuestion: 5, materialsText: '단어 카드', difficulty: 'easy', energyLevel: 'low', minPlayers: 2, recommendedPlayers: 10, scoringMode: 'per_question' },
    { name: '풍선 터뜨리기', category: '게임', estimatedMinutes: 8, defaultPoints: 10, materialsText: '풍선 20개', difficulty: 'easy', energyLevel: 'medium', minPlayers: 4, recommendedPlayers: 16, scoringMode: 'fixed_per_game' },
    { name: '퀴즈 OX', category: '퀴즈', estimatedMinutes: 12, defaultPoints: 15, defaultPointsPerQuestion: 5, materialsText: 'OX 카드', difficulty: 'medium', energyLevel: 'low', minPlayers: 2, recommendedPlayers: 30, scoringMode: 'per_question' },
    { name: '줄다리기', category: '운동', estimatedMinutes: 10, defaultPoints: 20, materialsText: '줄 1개', difficulty: 'easy', energyLevel: 'high', minPlayers: 4, recommendedPlayers: 20, scoringMode: 'fixed_per_game' },
    { name: '음악 의자', category: '레크레이션', estimatedMinutes: 15, defaultPoints: 15, materialsText: '의자, 스피커', difficulty: 'easy', energyLevel: 'medium', minPlayers: 5, recommendedPlayers: 15, scoringMode: 'fixed_per_game' },
    { name: '릴레이 퀴즈', category: '퀴즈', estimatedMinutes: 12, defaultPoints: 15, defaultPointsPerQuestion: 5, materialsText: '보드, 마커', difficulty: 'medium', energyLevel: 'medium', minPlayers: 4, recommendedPlayers: 20, scoringMode: 'per_question' },
    { name: '눈 가리고 걷기', category: '게임', estimatedMinutes: 10, defaultPoints: 10, materialsText: '안대 4개, 장애물', difficulty: 'medium', energyLevel: 'low', minPlayers: 4, recommendedPlayers: 12, scoringMode: 'fixed_per_game' },
    { name: '공 던지기', category: '운동', estimatedMinutes: 8, defaultPoints: 10, materialsText: '공 4개, 바구니', difficulty: 'easy', energyLevel: 'medium', minPlayers: 2, recommendedPlayers: 10, scoringMode: 'fixed_per_game' },
    { name: '팀 이름 짓기', category: '레크레이션', estimatedMinutes: 10, defaultPoints: 5, materialsText: '도화지, 마커', difficulty: 'easy', energyLevel: 'low', minPlayers: 2, recommendedPlayers: 20, scoringMode: 'fixed_per_game' },
    { name: '인간 징검다리', category: '운동', estimatedMinutes: 12, defaultPoints: 15, materialsText: '마커 콘', difficulty: 'medium', energyLevel: 'high', minPlayers: 6, recommendedPlayers: 18, scoringMode: 'fixed_per_game' },
    { name: '그림 맞추기', category: '퀴즈', estimatedMinutes: 10, defaultPoints: 10, defaultPointsPerQuestion: 5, materialsText: '그림 카드', difficulty: 'medium', energyLevel: 'low', minPlayers: 2, recommendedPlayers: 15, scoringMode: 'per_question' },
  ];

  sampleGames.forEach(g => Game.create(g));

  // Create sample repertoire
  const rep = Repertoire.create({ title: '교회 수련회 레퍼토리', audienceType: 'church' });
  const games = Game.all();
  games.slice(0, 6).forEach((g, i) => {
    Repertoire.addItem(rep.id, g.id);
  });

  console.log('[App] Sample data seeded.');
}

/* === Timer === */
let _serverTimeOffset = 0; // Firebase 서버 시간과 로컬 시간의 차이(ms)

const Timer = {
  KEY: 'rec_timer',
  start(durationMs) {
    save(this.KEY, { status: 'running', endAt: Date.now() + _serverTimeOffset + durationMs });
  },
  stop() {
    save(this.KEY, { status: 'idle', endAt: null });
  },
  getState() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : { status: 'idle' };
    } catch { return { status: 'idle' }; }
  },
  getRemainingMs() {
    const st = this.getState();
    if (st.status !== 'running' || !st.endAt) return 0;
    return Math.max(0, st.endAt - (Date.now() + _serverTimeOffset));
  },
};

/* === Firebase Sync === */
let _fbPushTimer = null;
let _fbPushPending = false;

window._fbSchedulePush = function() {
  clearTimeout(_fbPushTimer);
  _fbPushPending = true;
  _fbPushTimer = setTimeout(() => {
    _fbPushTimer = null;
    Firebase.push();
  }, 600);
};

const Firebase = {
  _db: null,
  _initialized: false,

  init(config) {
    this._initialized = false;
    const fbApp = firebase.initializeApp(config);
    this._db = firebase.database(fbApp);

    // 기기 간 시계 오차 보정
    this._db.ref('.info/serverTimeOffset').on('value', snap => {
      _serverTimeOffset = snap.val() || 0;
    });

    this._db.ref('sb').on('value', snap => {
      const data = snap.val();

      if (!this._initialized) {
        this._initialized = true;
        if (data) {
          Object.entries(data).forEach(([k, v]) => {
            localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
          });
          if (typeof window._onFirebaseSync === 'function') window._onFirebaseSync();
        } else {
          // Firebase 비어 있음 — 로컬 데이터 업로드
          setTimeout(() => this.push(), 100);
        }
        return;
      }

      // 자신의 push 에코는 무시 (로컬이 더 최신)
      if (_fbPushPending) return;

      if (!data) return;
      let changed = false;
      Object.entries(data).forEach(([k, v]) => {
        const incoming = typeof v === 'string' ? v : JSON.stringify(v);
        if (localStorage.getItem(k) !== incoming) {
          localStorage.setItem(k, incoming);
          changed = true;
        }
      });
      if (changed && typeof window._onFirebaseSync === 'function') {
        window._onFirebaseSync();
      }
    });
  },

  push() {
    if (!this._db || !this._initialized) return;
    const data = {};
    Object.values(STORAGE_KEYS).forEach(key => {
      const raw = localStorage.getItem(key);
      if (raw === null) return;
      if (key === STORAGE_KEYS.ACTIVE_SESSION) {
        data[key] = raw; // raw string (세션 ID)
      } else {
        try { data[key] = JSON.parse(raw); } catch {}
      }
    });
    const timerRaw = localStorage.getItem(Timer.KEY);
    if (timerRaw) { try { data[Timer.KEY] = JSON.parse(timerRaw); } catch {} }
    this._db.ref('sb').set(data)
      .then(() => setTimeout(() => { _fbPushPending = false; }, 800))
      .catch(e => { _fbPushPending = false; console.warn('[Firebase]', e); });
  },
};

/* === Export for browser === */
window.App = {
  Game, Repertoire, RepertoireItem, Session, Record, Timer, Firebase,
  calculatePoints, calculateQuizPoints, calculatePersonPoints, inferScoringMode, seedSampleData, STORAGE_KEYS,
  load, save, genId,
};

/* === Auto-seed on load === */
document.addEventListener('DOMContentLoaded', () => {
  App.seedSampleData();
});
