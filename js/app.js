// 社内試験対策アプリ本体（保存は端末のブラウザ内 localStorage）
(function () {
  'use strict';

  const APP_VERSION = '2026.09.15f';
  const LS = { current: 'shiken.v1.current', history: 'shiken.v1.history', name: 'shiken.v1.name', miss: 'shiken.v1.yogoMiss', missKiso: 'shiken.v1.kisoMiss', missKeisu: 'shiken.v1.keisuMiss' };
  // 練習1回の出題数と目安時間（分/問）
  const DRILL_COUNTS = { kiso: [10, 20, 30], yogo: [10, 20, 30], keisu: [5, 10, 15] };
  const DRILL_MIN = { kiso: 0.3, yogo: 0.4, keisu: 1.2 };
  const SUBJECTS = { kiso: '基礎知識', keisu: '計数', yogo: '初歩用語' };
  const EXAM_TYPES = { toyo: '登用試験', trainee: 'トレーニー試験' };
  const LIMIT_MIN = 90;
  const PASS = 70;
  const YOGO_PER_PAGE = 10;
  const FULL_HISTORY_KEEP = 15;

  const $app = document.getElementById('app');
  const $sheet = document.getElementById('sheet');
  let BANK = null;
  let exam = null; // 受験中データ
  let ui = { view: 'home', subj: null, page: 0, reviewSubj: null, reviewAll: false, recordId: null };
  let timerId = null;

  // ---------- 汎用 ----------
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const circled = (n) => (n < 20 ? String.fromCharCode(0x2460 + n) : `(${n + 1})`);
  const pad = (n) => String(n).padStart(2, '0');
  const fmtDate = (ms) => { const d = new Date(ms); return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const fmtDur = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}分${pad(s % 60)}秒`; };
  const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const remove = (k) => { try { localStorage.removeItem(k); } catch (e) { /* noop */ } };
  const unitSpan = (u) => (u ? `<span class="unit">${esc(u)}</span>` : '<span class="unit"></span>');

  function hash(str) { // FNV-1a 32bit
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
  }

  // 用語の表記ゆれ吸収：全半角・大小文字・空白・記号・長音、ひらがな→カタカナ
  function normTerm(s) {
    return String(s || '').normalize('NFKC').toLowerCase()
      .replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
      .replace(/[\s・･.\-ー－―‐〜~「」『』【】"'’、。,，!！?？/／]/g, '');
  }
  function acceptList(t) {
    const out = new Set();
    [t.term].concat(t.accept || []).forEach((a) => {
      out.add(normTerm(a));
      const noParen = String(a).replace(/[（(][^）)]*[）)]/g, '');
      if (noParen !== a) out.add(normTerm(noParen));
      const m = String(a).match(/[（(]([^）)]*)[）)]/); if (m) out.add(normTerm(m[1]));
    });
    out.delete('');
    return out;
  }

  // ---------- 問題作成 ----------
  function buildSubject(key, type) {
    if (key === 'kiso') {
      return BANK.kiso.sections.filter((s) => s.core).map((s) => ({
        kind: 'kiso', title: s.title, text: s.text,
        blanks: s.blanks.map((b) => ({ answer: b.answer, choices: shuffle(b.choices) })),
      }));
    }
    if (key === 'keisu') {
      const probs = type === 'trainee' ? Keisu.makeTrainee() : Keisu.makeToyo();
      return probs.map((p, i) => Object.assign({ kind: 'keisu', title: `問${i + 1}` }, p));
    }
    const n = BANK.yogo.terms.filter((t) => t.core).length;
    const picked = shuffle(BANK.yogo.terms).slice(0, n);
    const pages = [];
    for (let i = 0; i < picked.length; i += YOGO_PER_PAGE) {
      pages.push({ kind: 'yogo', title: `${i + 1}〜${Math.min(i + YOGO_PER_PAGE, picked.length)}`, terms: picked.slice(i, i + YOGO_PER_PAGE).map((t) => ({ id: t.id, meaning: t.meaning, hint: t.hint || '', term: t.term, accept: t.accept || [] })) });
    }
    return pages;
  }

  function newExam(type, mode, subjects, drillCount) { // mode: honban | drill
    const now = Date.now();
    const e = {
      id: 'e' + now.toString(36) + Math.random().toString(36).slice(2, 6), app: APP_VERSION,
      type, mode, name: (load(LS.name, '') || '').trim(), startedAt: now,
      deadline: mode === 'honban' ? now + LIMIT_MIN * 60 * 1000 : null,
      subjects: subjects.map((k) => ({ key: k, pages: mode === 'drill' ? buildDrill(k, type, drillCount) : buildSubject(k, type) })), ans: {}, checked: {},
    };
    return e;
  }

  // ---------- 科目別の練習（小刻み出題） ----------
  // 前に間違えた問題を出題数の半分まで優先し、残りはランダム
  function pickPriority(pool, idOf, missKey, count) {
    const miss = load(missKey, {});
    const missed = shuffle(pool.filter((x) => miss[idOf(x)] > 0)).slice(0, Math.floor(count / 2));
    const rest = shuffle(pool.filter((x) => !missed.includes(x)));
    const out = missed.concat(rest.slice(0, count - missed.length));
    while (out.length < count && pool.length) out.push(pool[Math.floor(Math.random() * pool.length)]);
    return shuffle(out);
  }
  function markMiss(missKey, id, good) {
    const miss = load(missKey, {});
    if (good) { if (miss[id]) { miss[id] -= 1; if (miss[id] <= 0) delete miss[id]; } } else { miss[id] = (miss[id] || 0) + 1; }
    store(missKey, miss);
  }
  const MISS_KEY = { yogo: LS.miss, kiso: LS.missKiso, keisu: LS.missKeisu };
  // 小問が前の小問の答えを使って解く大問
  const CHAINED = new Set(['t1-3', 't2-1', 't2-3', 't3-1', 't3-3', 't3-4', 't4-1', 't5-1', 't5-3', 't5-4', 'k-loss', 'k-tofu']);

  // 基礎知識の空欄1つを1問にする（直前の見出し行を文脈として添える）
  function kisoOne(s, bi) {
    const lines = s.text.split('\n');
    const li = lines.findIndex((l) => l.includes(`{{${bi}}}`));
    const fill = (l, target) => l.replace(/\{\{(\d+)\}\}/g, (m, n) => (Number(n) === target ? '{{0}}' : (target === null ? s.blanks[Number(n)].answer : '＿＿'))).trim();
    let ctx = '';
    for (let j = li - 1; j >= 0; j--) { if (/^\s*[○〈ⅠⅡⅢⅣⅤ]/.test(lines[j])) { ctx = fill(lines[j], null); break; } }
    return { kind: 'kiso', id: `${s.id}-${bi}`, title: s.title, text: (ctx ? ctx + '\n' : '') + fill(lines[li], bi), blanks: [{ answer: s.blanks[bi].answer, choices: shuffle(s.blanks[bi].choices) }] };
  }

  function buildDrill(subj, type, count) {
    if (subj === 'yogo') {
      return pickPriority(BANK.yogo.terms, (t) => t.id, LS.miss, count).map((t, i) => ({
        kind: 'yogo', title: String(i + 1), terms: [{ id: t.id, meaning: t.meaning, hint: t.hint || '', term: t.term, accept: t.accept || [] }],
      }));
    }
    if (subj === 'kiso') {
      const pool = [];
      BANK.kiso.sections.filter((s) => s.core).forEach((s) => s.blanks.forEach((b, bi) => pool.push({ s, bi })));
      return pickPriority(pool, (x) => `${x.s.id}-${x.bi}`, LS.missKiso, count).map((x) => kisoOne(x.s, x.bi));
    }
    // 計数は小問1つを1問にする。前の小問の答えを使う大問（CHAINED）だけ「前の問いの答え」を添える
    const tpls = type === 'trainee' ? Keisu.TRAINEE : Keisu.TOYO;
    return pickPriority(tpls, (t) => t.id, LS.missKeisu, count).map((t, i) => {
      const prob = t.gen();
      const ii = Math.floor(Math.random() * prob.items.length);
      let start = ii;
      while (start > 0 && !prob.items[start].pre) start--;
      const it = prob.items[ii];
      const given = (CHAINED.has(t.id) ? prob.items.slice(start, ii) : []).map((g) => ({ q: g.q, a: g.type === 'choice' ? g.ans : `${Keisu.fmt(g.ans, g.dec)} ${g.unit || ''}`.trim() }));
      return {
        kind: 'keisu', title: `問${i + 1}`, id: t.id, name: t.name, text: prob.text, rule: prob.rule, table: prob.table, given,
        items: [Object.assign({}, it, { pre: prob.items[start].pre || '' })],
      };
    });
  }

  // 小問の一覧（採点・進捗用）
  function itemsOf(subj, si) {
    const list = [];
    subj.pages.forEach((p, pi) => {
      if (p.kind === 'kiso') p.blanks.forEach((b, bi) => list.push({ key: `${si}-${pi}-${bi}`, pi, kind: 'kiso', p, b, bi }));
      if (p.kind === 'keisu') p.items.forEach((it, ii) => list.push({ key: `${si}-${pi}-${ii}`, pi, kind: 'keisu', p, it, ii }));
      if (p.kind === 'yogo') p.terms.forEach((t, ti) => list.push({ key: `${si}-${pi}-${ti}`, pi, kind: 'yogo', p, t, ti }));
    });
    return list;
  }
  const answered = (v) => v !== undefined && v !== null && String(v).trim() !== '';

  function isCorrect(x, v) {
    if (!answered(v)) return false;
    if (x.kind === 'kiso') return v === x.b.answer;
    if (x.kind === 'keisu') return x.it.type === 'choice' ? v === x.it.ans : Keisu.checkNum(x.it, v);
    return acceptList(x.t).has(normTerm(v));
  }

  function grade(e) {
    const scores = {};
    e.subjects.forEach((s, si) => {
      const items = itemsOf(s, si);
      const c = items.filter((x) => isCorrect(x, e.ans[x.key])).length;
      scores[s.key] = { correct: c, total: items.length, score: items.length ? Math.floor(c / items.length * 100) : 0 };
    });
    const pass = e.subjects.every((s) => scores[s.key].score >= PASS);
    return { scores, pass };
  }

  // ---------- 保存 ----------
  let saveTimer = null;
  function saveCurrent(now) {
    if (!exam) return;
    clearTimeout(saveTimer);
    const run = () => { if (!store(LS.current, exam)) alert('端末の保存容量が不足しています。履歴を削除してください。'); };
    if (now) run(); else saveTimer = setTimeout(run, 300);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveCurrent(true); });

  function pushHistory(rec) {
    const hist = load(LS.history, []);
    hist.unshift(rec);
    hist.forEach((h, i) => { if (i >= FULL_HISTORY_KEEP) delete h.exam; });
    while (hist.length && !store(LS.history, hist)) {
      const idx = hist.map((h) => !!h.exam).lastIndexOf(true);
      if (idx <= 0) { hist.pop(); } else { delete hist[idx].exam; }
    }
  }

  // ---------- 画面切替 ----------
  function go(view, extra) { Object.assign(ui, { view }, extra || {}); closeSheet(); render(); window.scrollTo(0, 0); }
  function render() {
    clearInterval(timerId);
    if (ui.view === 'exam' && exam) return renderExam();
    if (ui.view === 'result') return renderResult();
    return renderHome();
  }

  // ================= ホーム =================
  function renderHome() {
    const name = load(LS.name, '');
    const cur = load(LS.current, null);
    const hist = load(LS.history, []);
    const nKiso = BANK.kiso.sections.filter((s) => s.core).reduce((a, s) => a + s.blanks.length, 0);
    const nYogo = BANK.yogo.terms.filter((t) => t.core).length;
    $app.innerHTML = `
      <header class="appbar"><h1>社内試験対策</h1><div class="sub">登用試験・トレーニー試験　3科目 ${LIMIT_MIN}分／各科目${PASS}点以上で合格</div></header>
      <main class="wrap">
        ${cur ? `<section class="card" style="border:2px solid var(--accent)">
          <h2>受験の途中です</h2>
          <p class="muted">${esc(EXAM_TYPES[cur.type])}・${cur.mode === 'honban' ? '本番モード' : '練習（' + cur.subjects.map((s) => SUBJECTS[s.key]).join('・') + '）'}　開始 ${fmtDate(cur.startedAt)}</p>
          ${cur.deadline ? `<p class="muted">残り時間：${cur.deadline > Date.now() ? fmtDur(cur.deadline - Date.now()) : '時間切れ（再開すると採点します）'}</p>` : ''}
          <div class="btn-grid"><button class="btn primary" data-act="resume">再開する</button><button class="btn danger" data-act="discard">破棄する</button></div>
        </section>` : ''}
        <section class="card">
          <label class="lbl" for="name">氏名（結果画面に表示されます）</label>
          <input id="name" type="text" autocomplete="name" placeholder="例：山田 太郎" value="${esc(name)}">
        </section>
        <section class="card">
          <h2>本番モード（3科目・${LIMIT_MIN}分）</h2>
          <div class="btn-grid">
            <button class="btn primary exam-btn" data-act="start" data-type="toyo"><span class="t">登用試験</span><span class="d">基礎知識 ${nKiso}問／計数 63問／初歩用語 ${nYogo}問</span></button>
            <button class="btn primary exam-btn" data-act="start" data-type="trainee"><span class="t">トレーニー試験</span><span class="d">基礎知識 ${nKiso}問／計数 大問4題／初歩用語 ${nYogo}問</span></button>
          </div>
          <p class="muted" style="margin-top:10px">計数の数値と初歩用語の出題語は毎回変わります。時間になると自動で提出されます。</p>
        </section>
        <section class="card">
          <h2>科目別の練習（1回5〜10分）</h2>
          <div class="btn-grid">
            <button class="btn" data-act="drill" data-subj="kiso" data-type="toyo">基礎知識</button>
            <button class="btn" data-act="drill" data-subj="yogo" data-type="toyo">初歩用語</button>
            <button class="btn" data-act="drill" data-subj="keisu" data-type="toyo">計数（登用形式）</button>
            <button class="btn" data-act="drill" data-subj="keisu" data-type="trainee">計数（トレーニー形式）</button>
          </div>
          <p class="muted" style="margin-top:10px">1問ずつ、その場で答え合わせをします。前に間違えた問題を優先して出します。</p>
        </section>
        <section class="card">
          <div class="row" style="margin-bottom:6px"><h2 class="grow" style="margin:0">受験履歴</h2>
            <button class="btn small ghost" data-act="export">書き出し</button><button class="btn small ghost" data-act="import">読み込み</button></div>
          ${hist.length ? `<ul class="hist">${hist.map((h) => histRow(h)).join('')}</ul>` : '<p class="muted">まだ履歴はありません。</p>'}
          <input id="importFile" type="file" accept="application/json,.json" hidden>
        </section>
        <p class="foot">受験履歴はこのスマホのブラウザ内だけに保存されます（会社には送信されません）。<br>ブラウザのデータを消すと履歴も消えるので、必要に応じて「書き出し」で保存してください。<br>ホーム画面に追加するとアプリのように使えます。　ver ${APP_VERSION}</p>
      </main>`;

    const $name = document.getElementById('name');
    $name.addEventListener('input', () => store(LS.name, $name.value));
    $app.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => homeAction(b.dataset)));
    document.getElementById('importFile').addEventListener('change', importHistory);
  }

  function recTitle(h) {
    if (h.mode === 'honban') return EXAM_TYPES[h.type];
    const k = Object.keys(h.result.scores)[0];
    return k === 'keisu' ? `計数（${h.type === 'trainee' ? 'トレーニー' : '登用'}形式）の練習` : `${SUBJECTS[k]}の練習`;
  }
  function histRow(h) {
    const r = h.result;
    const label = h.mode === 'honban' ? `<span class="badge ${r.pass ? 'ok' : 'ng'}">${r.pass ? '合格' : '不合格'}</span>` : '<span class="badge pr">練習</span>';
    const sc = Object.keys(r.scores).map((k) => `${SUBJECTS[k]} ${r.scores[k].score}`).join('　');
    return `<li><button data-act="record" data-id="${esc(h.id)}">${label}<span class="grow"><b>${esc(recTitle(h))}</b>　<span class="muted">${fmtDate(h.submittedAt)}</span><br><span class="muted">${esc(sc)}</span></span><span class="muted">›</span></button></li>`;
  }

  function homeAction(d) {
    if (d.act === 'resume') { exam = load(LS.current, null); if (exam) enterExam(); return; }
    if (d.act === 'discard') { if (confirm('途中の受験データを破棄します。よろしいですか？')) { remove(LS.current); render(); } return; }
    if (d.act === 'record') { go('result', { recordId: d.id, reviewSubj: null, reviewAll: false }); return; }
    if (d.act === 'export') return exportHistory();
    if (d.act === 'import') return document.getElementById('importFile').click();
    if (d.act === 'drill') {
      const subj = d.subj, unit = '問';
      const missN = Object.values(load(MISS_KEY[subj], {})).filter((v) => v > 0).length;
      const title = subj === 'keisu' ? `計数（${d.type === 'trainee' ? 'トレーニー' : '登用'}形式）` : SUBJECTS[subj];
      const how = { kiso: '空欄1つずつ4択で答えます。', yogo: '意味を見て用語を入力します。', keisu: '計算問題を1問ずつ解いて、答え合わせをします。' }[subj];
      openSheet(`<h3>${esc(title)}の練習</h3><p class="muted">${how}${missN ? `前に間違えた問題（${missN}）を優先して出します。` : ''}</p>
        <div class="choices">${DRILL_COUNTS[subj].map((n) => `<button class="btn primary" data-n="${n}">${n} ${unit}<span style="font-weight:400;font-size:13px">（約${Math.max(1, Math.round(n * DRILL_MIN[subj]))}分）</span></button>`).join('')}</div>
        <div style="margin-top:12px"><button class="btn ghost" data-close>やめる</button></div>`);
      $sheet.querySelectorAll('[data-n]').forEach((b) => b.addEventListener('click', () => {
        if (load(LS.current, null) && !confirm('途中の受験データがあります。破棄して新しく始めますか？')) return;
        exam = newExam(d.type || 'toyo', 'drill', [subj], Number(b.dataset.n));
        saveCurrent(true);
        enterExam();
      }));
      return;
    }
    if (d.act === 'start' || d.act === 'practice') {
      if (load(LS.current, null) && !confirm('途中の受験データがあります。破棄して新しく始めますか？')) return;
      if (d.act === 'start') {
        if (!(load(LS.name, '') || '').trim()) { alert('本番モードは氏名を入力してから始めてください。'); document.getElementById('name').focus(); return; }
        if (!confirm(`${EXAM_TYPES[d.type]}（3科目・${LIMIT_MIN}分）を開始します。途中でアプリを閉じても時間は進みます。`)) return;
        exam = newExam(d.type, 'honban', ['kiso', 'keisu', 'yogo']);
      } else {
        exam = newExam(d.type, 'practice', [d.subj]);
      }
      saveCurrent(true);
      enterExam();
    }
  }

  function exportHistory() {
    const hist = load(LS.history, []);
    if (!hist.length) { alert('書き出す履歴がありません。'); return; }
    const blob = new Blob([JSON.stringify({ app: 'shiken-taisaku', version: APP_VERSION, exportedAt: Date.now(), history: hist })], { type: 'application/json' });
    const a = document.createElement('a');
    const d = new Date();
    a.href = URL.createObjectURL(blob);
    a.download = `試験対策_履歴_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  function importHistory(ev) {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const data = JSON.parse(rd.result);
        if (data.app !== 'shiken-taisaku' || !Array.isArray(data.history)) throw new Error('形式が違います');
        const hist = load(LS.history, []);
        const ids = new Set(hist.map((h) => h.id));
        const add = data.history.filter((h) => h && h.id && h.result && !ids.has(h.id));
        const merged = hist.concat(add).sort((a, b) => b.submittedAt - a.submittedAt);
        merged.forEach((h, i) => { if (i >= FULL_HISTORY_KEEP) delete h.exam; });
        store(LS.history, merged);
        alert(`${add.length} 件の履歴を読み込みました。`);
        render();
      } catch (e) { alert('読み込めませんでした：' + e.message); }
    };
    rd.readAsText(file);
  }

  // ================= 受験 =================
  function enterExam() {
    if (exam.deadline && Date.now() >= exam.deadline) { submit(true); return; }
    ui.subj = 0; ui.page = 0;
    if (exam.mode === 'drill') {
      exam.checked = exam.checked || {};
      const first = exam.subjects[0].pages.findIndex((p, pi) => !drillChecked(pi));
      ui.page = first < 0 ? exam.subjects[0].pages.length - 1 : first;
    }
    go('exam');
  }

  // ================= 科目別の練習（1問ずつ答え合わせ） =================
  const drillChecked = (pi) => !!(exam.checked[`p${pi}`] || exam.checked[`0-${pi}-0`]);

  function renderDrill() {
    const s = exam.subjects[0], pages = s.pages, pi = ui.page, p = pages[pi];
    const items = itemsOf(s, 0);
    const mine = items.filter((x) => x.pi === pi);
    const checked = drillChecked(pi);
    const doneItems = items.filter((x) => drillChecked(x.pi));
    const okN = doneItems.filter((x) => isCorrect(x, exam.ans[x.key])).length;
    const donePages = pages.filter((_, i) => drillChecked(i)).length;
    const last = pi === pages.length - 1;
    const subjLabel = s.key === 'keisu' ? `計数（${exam.type === 'trainee' ? 'トレーニー' : '登用'}形式）` : SUBJECTS[s.key];
    const resultBox = (ok, answerHtml, yourHtml) => `<div class="drill-result ${ok ? 'ok' : 'ng'}"><div class="mark">${ok ? '◯ 正解' : '✕ 不正解'}</div><div>正解：${answerHtml}</div>${ok ? '' : `<div class="muted">あなたの答え：${yourHtml}</div>`}</div>`;

    let body = '', foot = '';
    const nextBtn = `<button class="btn primary" data-act="${last ? 'finish' : 'dnext'}">${last ? '結果を見る' : '次へ ›'}</button>`;

    if (p.kind === 'yogo') {
      const x = mine[0], t = x.t, v = exam.ans[x.key] || '', ok = isCorrect(x, v);
      const others = (t.accept || []).filter((a) => normTerm(a) !== normTerm(t.term));
      body = `<p class="muted" style="margin:0 0 6px">意味にあてはまる用語を書きなさい。</p>
        <p style="font-size:18px;margin:0 0 8px">${esc(t.meaning)}</p>
        ${t.hint ? `<div class="muted" style="margin-bottom:8px;font-size:12px">ヒント：${esc(t.hint)}</div>` : ''}
        <form id="drillForm" action="#" autocomplete="off"><input id="drillIn" type="text" enterkeyhint="${checked ? 'next' : 'done'}" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="用語を入力" value="${esc(v)}" ${checked ? 'readonly' : ''}></form>
        ${checked ? resultBox(ok, `<b>${esc(t.term)}</b>${others.length ? `<span class="muted">（${others.map(esc).join('・')} も可）</span>` : ''}`, answered(v) ? esc(v) : '（わからない）') : ''}`;
      foot = checked ? `<span></span>${nextBtn}` : '<button class="btn" data-act="skip">わからない</button><button class="btn primary" data-act="check">回答する</button>';
    } else if (p.kind === 'kiso') {
      const x = mine[0], b = p.blanks[0], v = exam.ans[x.key], ok = isCorrect(x, v);
      const text = esc(p.text).replace('{{0}}', checked ? `<span class="blank filled ${ok ? '' : 'wrong'}">${esc(b.answer)}</span>` : '<span class="blank active">　？　</span>');
      body = `<p class="muted" style="margin:0 0 4px">${esc(p.title)}</p>
        <div class="kiso-text" style="font-size:17px">${text}</div>
        <div class="choices" style="margin-top:12px">${b.choices.map((c) => `<button class="choice ${checked && c === b.answer ? 'right' : ''} ${checked && c === v && c !== b.answer ? 'bad' : ''}" data-act="pick" data-val="${esc(c)}" ${checked ? 'disabled' : ''}>${esc(c)}</button>`).join('')}</div>
        ${checked ? resultBox(ok, `<b>${esc(b.answer)}</b>`, answered(v) ? esc(v) : '（わからない）') : ''}`;
      foot = checked ? `<span></span>${nextBtn}` : '<button class="btn" data-act="skip">わからない</button><span></span>';
    } else {
      if (!checked) {
        body = renderPage(p, 0, pi).replace(/^<section class="card">|<\/section>$/g, '');
        foot = '<span></span><button class="btn primary" data-act="check">答え合わせ</button>';
      } else {
        const c = mine.filter((x) => isCorrect(x, exam.ans[x.key])).length;
        body = `<div class="qhead"><h2>${esc(p.title)}　${esc(p.name || '')}</h2><span class="badge ${c === mine.length ? 'ok' : 'ng'}">${mine.length === 1 ? (c ? '正解' : '不正解') : `${c} / ${mine.length} 正解`}</span></div>
          <p class="qtext">${esc(p.text)}</p>${p.rule ? `<p class="rule">※${esc(p.rule)}</p>` : ''}${renderTable(p.table)}
          ${mine.map((x) => {
            const it = x.it, v = exam.ans[x.key], ok = isCorrect(x, v);
            const ans = it.type === 'choice' ? esc(it.ans) : `${esc(Keisu.fmt(it.ans, it.dec))} ${esc(it.unit || '')}${it.alt && it.alt.length ? `（${it.alt.map((a) => esc(Keisu.fmt(a, it.dec))).join('・')}も可）` : ''}`;
            return `${it.pre ? `<div class="pre">${esc(it.pre)}</div>` : ''}${x.ii === 0 ? givenBox(p.given) : ''}<div class="item"><p class="q">${ok ?'<b style="color:var(--ok)">◯</b>' : '<b style="color:var(--ng)">✕</b>'} ${esc(it.q)}</p>
              <div class="ans">正解：<b>${ans}</b>　<span class="mine ${ok ? 'ok' : ''}">あなた：${answered(v) ? esc(v) : '（未回答）'}</span></div>
              <div class="exp" style="background:var(--bg);border-radius:8px;padding:8px 10px;margin-top:6px;font-size:13px;white-space:pre-wrap">${it.exp.map(esc).join('\n')}</div></div>`;
          }).join('')}`;
        foot = `<span></span>${nextBtn}`;
      }
    }

    $app.innerHTML = `
      <div class="exambar"><div class="top" style="padding-bottom:8px">
        <button class="btn small ghost" data-act="home">‹ 中断</button>
        <div class="grow" style="text-align:center"><div class="muted" style="line-height:1.2">${esc(subjLabel)}・練習</div><div class="timer">${pi + 1} / ${pages.length}</div></div>
        <span class="badge ok" style="font-size:14px">正解 ${okN}/${doneItems.length}</span>
      </div></div>
      <div class="progress"><i style="width:${donePages / pages.length * 100}%"></i></div>
      <main class="wrap"><section class="card">${body}<div class="drill-actions">${foot}</div></section></main>`;
    window.scrollTo(0, 0);

    const judge = () => {
      exam.checked[`p${pi}`] = true;
      const good = mine.every((x) => isCorrect(x, exam.ans[x.key]));
      const id = p.kind === 'yogo' ? p.terms[0].id : p.id;
      if (id) markMiss(MISS_KEY[s.key], id, good);
      saveCurrent(true);
      renderDrill();
      const nb = $app.querySelector('[data-act="dnext"],[data-act="finish"]');
      if (nb) nb.focus({ preventScroll: true });
    };
    const act = (dset) => {
      const a = dset.act;
      if (a === 'home') { saveCurrent(true); exam = null; go('home'); return; }
      if (a === 'pick') { exam.ans[mine[0].key] = dset.val; judge(); return; }
      if (a === 'skip') { exam.ans[mine[0].key] = ''; judge(); return; }
      if (a === 'check') {
        if (p.kind === 'yogo') { const $in = document.getElementById('drillIn'); if (!answered($in.value)) { $in.focus(); return; } exam.ans[mine[0].key] = $in.value; }
        if (p.kind === 'keisu' && !mine.some((x) => answered(exam.ans[x.key])) && !confirm('まだ何も入力していません。答え合わせをしますか？')) return;
        judge(); return;
      }
      if (a === 'choice') { // 計数の選択式
        exam.ans[dset.key] = dset.val; saveCurrent();
        $app.querySelectorAll(`.choice[data-key="${dset.key}"]`).forEach((c) => c.classList.toggle('on', c.dataset.val === dset.val));
        return;
      }
      if (a === 'dnext') { ui.page++; renderDrill(); const i = document.getElementById('drillIn'); if (i) i.focus(); return; }
      if (a === 'finish') submit(false);
    };
    $app.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => act(b.dataset)));
    const form = document.getElementById('drillForm');
    if (form) form.addEventListener('submit', (ev) => { ev.preventDefault(); act({ act: checked ? (last ? 'finish' : 'dnext') : 'check' }); });
    if (p.kind === 'keisu' && !checked) {
      const inputs = Array.from($app.querySelectorAll('input[data-key]'));
      inputs.forEach((inp, idx) => {
        inp.addEventListener('input', () => { exam.ans[inp.dataset.key] = inp.value; saveCurrent(); });
        inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.isComposing) { ev.preventDefault(); if (idx < inputs.length - 1) inputs[idx + 1].focus(); else inp.blur(); } });
      });
    }
  }

  function subjProgress(si) {
    const s = exam.subjects[si];
    const items = itemsOf(s, si);
    return { done: items.filter((x) => answered(exam.ans[x.key])).length, total: items.length };
  }

  function renderExam() {
    if (exam.mode === 'drill') return renderDrill();
    const s = exam.subjects[ui.subj];
    const page = s.pages[ui.page];
    const pr = subjProgress(ui.subj);
    const title = `${EXAM_TYPES[exam.type]}${exam.mode === 'honban' ? '' : '・練習'}`;
    $app.innerHTML = `
      <div class="exambar">
        <div class="top">
          <button class="btn small ghost" data-act="home" aria-label="ホームへ">‹ 中断</button>
          <div class="grow" style="text-align:center"><div class="muted" style="line-height:1.2">${esc(title)}</div><div id="timer" class="timer">--:--</div></div>
          <button class="btn small primary" data-act="nav">一覧・提出</button>
        </div>
        ${exam.subjects.length > 1 ? `<div class="tabs">${exam.subjects.map((x, i) => { const p = subjProgress(i); return `<button class="tab ${i === ui.subj ? 'on' : ''}" data-act="subj" data-i="${i}">${SUBJECTS[x.key]}<small>${p.done}/${p.total}</small></button>`; }).join('')}</div>` : ''}
      </div>
      <div class="progress"><i style="width:${pr.total ? pr.done / pr.total * 100 : 0}%"></i></div>
      <main class="wrap" id="page">${renderPage(page, ui.subj, ui.page)}</main>
      <nav class="pager">
        <button class="btn" data-act="prev" ${ui.page === 0 ? 'disabled' : ''}>‹ 前へ</button>
        <button class="mid" data-act="nav">${ui.page + 1} / ${s.pages.length}</button>
        ${ui.page < s.pages.length - 1 ? '<button class="btn primary" data-act="next">次へ ›</button>'
          : (ui.subj < exam.subjects.length - 1 ? `<button class="btn primary" data-act="nextsubj">${SUBJECTS[exam.subjects[ui.subj + 1].key]} ›</button>` : '<button class="btn primary" data-act="nav">提出へ</button>')}
      </nav>`;
    bindExam();
    tick();
    timerId = setInterval(tick, 1000);
  }

  function tick() {
    const el = document.getElementById('timer');
    if (!el || !exam) return;
    if (exam.deadline) {
      const left = exam.deadline - Date.now();
      if (left <= 0) { clearInterval(timerId); saveCurrent(true); alert('試験時間が終了しました。自動で提出します。'); submit(true); return; }
      const sec = Math.ceil(left / 1000);
      el.textContent = `残り ${Math.floor(sec / 60)}:${pad(sec % 60)}`;
      el.classList.toggle('low', sec <= 300);
    } else {
      const sec = Math.floor((Date.now() - exam.startedAt) / 1000);
      el.textContent = `経過 ${Math.floor(sec / 60)}:${pad(sec % 60)}`;
    }
  }

  // 練習で1問だけ出すとき、前の小問とその答えを参考として表示
  function givenBox(given) {
    if (!given || !given.length) return '';
    return `<div class="given"><div class="muted" style="font-size:12px;margin-bottom:2px">前の問いの答え（この問題で使います）</div>${given.map((g) => `<div>${esc(g.q)} → <b>${esc(g.a)}</b></div>`).join('')}</div>`;
  }

  function renderTable(t) {
    if (!t) return '';
    const cell = (v) => { const s = String(v); const hole = /^[（(].*[）)]$|^[①-⑳]/.test(s); return `<td class="${hole ? 'hole' : ''}">${esc(s)}</td>`; };
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${t.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${t.rows.map((r) => `<tr>${r.map(cell).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function renderPage(p, si, pi) {
    if (p.kind === 'kiso') {
      const html = esc(p.text).replace(/\{\{(\d+)\}\}/g, (m, n) => {
        const bi = Number(n); const v = exam.ans[`${si}-${pi}-${bi}`];
        return `<button class="blank ${answered(v) ? 'filled' : ''}" data-act="blank" data-bi="${bi}"><span class="no">${circled(bi)}</span>${answered(v) ? esc(v) : '　　'}</button>`;
      });
      return `<section class="card"><div class="qhead"><h2>${esc(p.title)}</h2><span class="muted">空欄 ${p.blanks.length}</span></div>
        <p class="muted" style="margin-top:-6px">空欄をタップして答えを選んでください。</p><div class="kiso-text">${html}</div></section>`;
    }
    if (p.kind === 'keisu') {
      const items = p.items.map((it, ii) => {
        const key = `${si}-${pi}-${ii}`; const v = exam.ans[key];
        const pre = (it.pre ? `<div class="pre">${esc(it.pre)}</div>` : '') + (ii === 0 ? givenBox(p.given) : '');
        const rule = it.rule ? `<p class="rule">※${esc(it.rule)}</p>` : '';
        if (it.type === 'choice') {
          return `${pre}<div class="item"><p class="q">${esc(it.q)}</p><div class="choices">${it.choices.map((c) => `<button class="choice ${v === c ? 'on' : ''}" data-act="choice" data-key="${key}" data-val="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>`;
        }
        return `${pre}<div class="item"><p class="q">${esc(it.q)}</p>${rule}<div class="numin"><input type="text" inputmode="decimal" enterkeyhint="next" autocomplete="off" data-key="${key}" value="${esc(v || '')}" aria-label="${esc(it.q)}">${unitSpan(it.unit)}</div></div>`;
      }).join('');
      return `<section class="card"><div class="qhead"><h2>${esc(p.title)}</h2><span class="muted">${p.items.length > 1 ? `${p.items.length}問` : esc(p.name || '')}</span></div>
        <p class="qtext">${esc(p.text)}</p>${p.rule ? `<p class="rule">※${esc(p.rule)}</p>` : ''}${renderTable(p.table)}${items}</section>`;
    }
    const terms = p.terms.map((t, ti) => {
      const key = `${si}-${pi}-${ti}`;
      return `<div class="yogo"><p class="m"><b>${esc(p.title.split('〜')[0] * 1 + ti)}.</b> ${esc(t.meaning)}</p>${t.hint ? `<div class="hint">ヒント：${esc(t.hint)}</div>` : ''}
        <input type="text" enterkeyhint="next" autocomplete="off" autocapitalize="off" spellcheck="false" data-key="${key}" value="${esc(exam.ans[key] || '')}" placeholder="用語を入力" aria-label="用語"></div>`;
    }).join('');
    return `<section class="card"><div class="qhead"><h2>初歩用語 ${esc(p.title)}</h2></div><p class="muted" style="margin-top:-6px">意味にあてはまる用語を書きなさい。</p>${terms}</section>`;
  }

  function bindExam() {
    $app.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', (ev) => examAction(b.dataset, ev)));
    const inputs = Array.from($app.querySelectorAll('input[data-key]'));
    inputs.forEach((inp, idx) => {
      inp.addEventListener('input', () => { exam.ans[inp.dataset.key] = inp.value; saveCurrent(); refreshTabs(); });
      inp.addEventListener('keydown', (ev) => {
        if (ev.key !== 'Enter' || ev.isComposing) return;
        ev.preventDefault();
        if (idx < inputs.length - 1) inputs[idx + 1].focus();
        else inp.blur();
      });
    });
  }

  function refreshTabs() {
    const pr = subjProgress(ui.subj);
    const bar = $app.querySelector('.progress > i'); if (bar) bar.style.width = `${pr.total ? pr.done / pr.total * 100 : 0}%`;
    const tabs = $app.querySelectorAll('.tab small');
    tabs.forEach((el, i) => { const p = subjProgress(i); el.textContent = `${p.done}/${p.total}`; });
  }

  function examAction(d) {
    const s = exam.subjects[ui.subj];
    if (d.act === 'home') { saveCurrent(true); exam = null; go('home'); return; }
    if (d.act === 'prev' && ui.page > 0) { ui.page--; go('exam'); return; }
    if (d.act === 'next' && ui.page < s.pages.length - 1) { ui.page++; go('exam'); return; }
    if (d.act === 'nextsubj') { ui.subj++; ui.page = 0; go('exam'); return; }
    if (d.act === 'subj') { ui.subj = Number(d.i); ui.page = 0; go('exam'); return; }
    if (d.act === 'nav') { openNav(); return; }
    if (d.act === 'choice') {
      exam.ans[d.key] = d.val; saveCurrent();
      $app.querySelectorAll(`.choice[data-key="${d.key}"]`).forEach((c) => c.classList.toggle('on', c.dataset.val === d.val));
      refreshTabs(); return;
    }
    if (d.act === 'blank') { openBlank(Number(d.bi)); }
  }

  // 穴埋めの選択パネル：画面下に小さく出し、問題文は隠さない（該当の空欄をパネルの上へスクロール）
  function openBlank(bi) {
    const p = exam.subjects[ui.subj].pages[ui.page];
    const b = p.blanks[bi];
    const key = `${ui.subj}-${ui.page}-${bi}`;
    const long = b.choices.some((c) => c.length > 9);
    openSheet(`<div class="row" style="margin-bottom:8px"><h3 class="grow" style="margin:0">${circled(bi)} にあてはまる語句</h3>
        <button class="btn small ghost" data-clear>消す</button><button class="btn small ghost" data-close>閉じる ✕</button></div>
      <div class="choices ${long ? '' : 'two'}">${b.choices.map((c) => `<button class="choice ${exam.ans[key] === c ? 'on' : ''}" data-val="${esc(c)}">${esc(c)}</button>`).join('')}</div>`, 'dock');
    $app.querySelectorAll('.blank.active').forEach((el) => el.classList.remove('active'));
    const el = $app.querySelector(`.blank[data-bi="${bi}"]`);
    if (el) {
      el.classList.add('active');
      const h = $sheet.querySelector('.panel').offsetHeight;
      document.body.style.paddingBottom = `${h}px`;
      const r = el.getBoundingClientRect();
      const visible = window.innerHeight - h;
      window.scrollBy({ top: r.top - visible * 0.45, behavior: 'smooth' });
    }
    $sheet.querySelectorAll('.choice').forEach((c) => c.addEventListener('click', () => {
      exam.ans[key] = c.dataset.val; saveCurrent(); updateBlank(bi);
      const next = p.blanks.findIndex((x, j) => j > bi && !answered(exam.ans[`${ui.subj}-${ui.page}-${j}`]));
      if (next >= 0) openBlank(next); else closeSheet();
    }));
    $sheet.querySelector('[data-clear]').addEventListener('click', () => { delete exam.ans[key]; saveCurrent(); updateBlank(bi); closeSheet(); });
  }
  function updateBlank(bi) {
    const el = $app.querySelector(`.blank[data-bi="${bi}"]`);
    const v = exam.ans[`${ui.subj}-${ui.page}-${bi}`];
    if (el) { el.classList.toggle('filled', answered(v)); el.innerHTML = `<span class="no">${circled(bi)}</span>${answered(v) ? esc(v) : '　　'}`; }
    refreshTabs();
  }

  function openNav() {
    const s = exam.subjects[ui.subj];
    const items = itemsOf(s, ui.subj);
    const grid = s.pages.map((p, pi) => {
      const its = items.filter((x) => x.pi === pi);
      const done = its.filter((x) => answered(exam.ans[x.key])).length;
      const cls = done === its.length ? 'done' : done > 0 ? 'part' : '';
      return `<button class="${cls} ${pi === ui.page ? 'cur' : ''}" data-pi="${pi}">${p.kind === 'yogo' ? pi * YOGO_PER_PAGE + 1 : pi + 1}</button>`;
    }).join('');
    const totals = exam.subjects.map((x, i) => { const p = subjProgress(i); return `${SUBJECTS[x.key]} ${p.done}/${p.total}`; }).join('　');
    openSheet(`<h3>${SUBJECTS[s.key]}：ページ一覧</h3><p class="muted">塗りつぶし＝全問回答済み／黄枠＝一部回答</p>
      <div class="navgrid">${grid}</div>
      <p class="muted">回答状況：${esc(totals)}</p>
      <div class="btn-grid"><button class="btn ghost" data-close>戻る</button><button class="btn primary" data-submit>提出して採点</button></div>`);
    $sheet.querySelectorAll('[data-pi]').forEach((b) => b.addEventListener('click', () => { ui.page = Number(b.dataset.pi); go('exam'); }));
    $sheet.querySelector('[data-submit]').addEventListener('click', () => {
      const left = exam.subjects.reduce((a, x, i) => { const p = subjProgress(i); return a + (p.total - p.done); }, 0);
      const msg = left ? `未回答が ${left} 問あります。提出してよろしいですか？` : '提出して採点します。よろしいですか？';
      if (confirm(msg)) submit(false);
    });
  }

  function openSheet(html, variant) {
    $sheet.className = `sheet ${variant || ''}`;
    $sheet.innerHTML = `<div class="panel" role="dialog" aria-modal="${variant === 'dock' ? 'false' : 'true'}">${html}</div>`;
    $sheet.hidden = false;
    $sheet.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeSheet));
  }
  function closeSheet() {
    $sheet.hidden = true; $sheet.innerHTML = ''; $sheet.className = 'sheet';
    document.body.style.paddingBottom = '';
    $app.querySelectorAll('.blank.active').forEach((el) => el.classList.remove('active'));
  }
  $sheet.addEventListener('click', (ev) => { if (ev.target === $sheet) closeSheet(); });

  function submit(auto) {
    clearInterval(timerId);
    const now = exam.deadline ? Math.min(Date.now(), exam.deadline) : Date.now();
    const result = grade(exam);
    const name = exam.name || (load(LS.name, '') || '').trim();
    const codeSrc = [exam.id, name, exam.type, exam.mode, now, JSON.stringify(result.scores)].join('|');
    const rec = { id: exam.id, type: exam.type, mode: exam.mode, name, startedAt: exam.startedAt, submittedAt: now, auto: !!auto, result, code: hash(codeSrc), exam };
    pushHistory(rec);
    remove(LS.current);
    exam = null;
    go('result', { recordId: rec.id, reviewSubj: null, reviewAll: false });
  }

  // ================= 結果 =================
  function renderResult() {
    const hist = load(LS.history, []);
    const h = hist.find((x) => x.id === ui.recordId);
    if (!h) { go('home'); return; }
    const r = h.result;
    const keys = Object.keys(r.scores);
    if (!ui.reviewSubj || !keys.includes(ui.reviewSubj)) ui.reviewSubj = keys[0];
    const honban = h.mode === 'honban';
    $app.innerHTML = `
      <header class="appbar"><div class="row"><button class="btn small ghost" style="color:inherit;border-color:rgba(255,255,255,.4)" data-act="home">‹ ホーム</button><h1 class="grow" style="text-align:center">採点結果</h1><span style="width:70px"></span></div></header>
      <main class="wrap">
        <section class="verdict ${honban ? (r.pass ? 'ok' : 'ng') : 'ok'}">
          <div class="muted" style="color:inherit">${honban ? `${esc(EXAM_TYPES[h.type])}　本番モード` : esc(recTitle(h))}</div>
          <div class="big">${honban ? (r.pass ? '合　格' : '不合格') : '練習結果'}</div>
          <div class="meta">${esc(h.name || '（氏名未入力）')}　${fmtDate(h.submittedAt)}　所要 ${fmtDur(h.submittedAt - h.startedAt)}${h.auto ? '（時間切れ提出）' : ''}</div>
          <div class="meta">確認コード <span class="code">${esc(h.code)}</span></div>
        </section>
        <section class="card">
          ${keys.map((k) => { const s = r.scores[k]; const ok = s.score >= PASS; return `<div class="score"><div class="lbl2"><span>${SUBJECTS[k]}</span><span style="color:var(--${ok ? 'ok' : 'ng'})">${s.score} 点</span></div>
            <div class="bar"><i class="${ok ? 'ok' : 'ng'}" style="width:${s.score}%"></i><b></b></div><div class="muted">${s.correct} / ${s.total} 問正解　（合格ライン ${PASS} 点）</div></div>`; }).join('')}
          ${honban ? `<p class="muted">3科目すべて ${PASS} 点以上で合格です。</p>` : ''}
        </section>
        <section class="card" id="review">${h.exam ? renderReview(h) : '<p class="muted">古い履歴のため、解答の詳細は保存されていません。</p>'}</section>
        <div class="btn-grid"><button class="btn danger" data-act="delete">この履歴を削除</button><button class="btn primary" data-act="home">ホームへ</button></div>
      </main>`;
    $app.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
      const d = b.dataset;
      if (d.act === 'home') go('home');
      if (d.act === 'rsubj') { ui.reviewSubj = d.k; renderResult(); }
      if (d.act === 'rall') { ui.reviewAll = d.v === '1'; renderResult(); }
      if (d.act === 'delete' && confirm('この履歴を削除します。よろしいですか？')) { store(LS.history, hist.filter((x) => x.id !== h.id)); go('home'); }
    }));
  }

  function renderReview(h) {
    const e = h.exam;
    const si = e.subjects.findIndex((s) => s.key === ui.reviewSubj);
    const s = e.subjects[si];
    const items = itemsOf(s, si);
    const rows = items.map((x) => ({ x, v: e.ans[x.key], ok: isCorrect(x, e.ans[x.key]) })).filter((o) => ui.reviewAll || !o.ok);
    const tabs = e.subjects.length > 1 ? `<div class="seg">${e.subjects.map((x) => `<button class="${x.key === ui.reviewSubj ? 'on' : ''}" data-act="rsubj" data-k="${x.key}">${SUBJECTS[x.key]}</button>`).join('')}</div>` : '';
    const filt = `<div class="seg"><button class="${ui.reviewAll ? '' : 'on'}" data-act="rall" data-v="0">間違いのみ</button><button class="${ui.reviewAll ? 'on' : ''}" data-act="rall" data-v="1">すべて</button></div>`;
    const mine = (v, ok) => `<div class="ans">あなたの答え：<span class="mine ${ok ? 'ok' : ''}">${answered(v) ? esc(v) : '（未回答）'}</span></div>`;
    let lastPage = -1;
    const body = rows.map(({ x, v, ok }) => {
      let head = '';
      if (x.pi !== lastPage) {
        lastPage = x.pi;
        if (x.kind !== 'yogo') head = `<h3 style="font-size:15px;margin:14px 0 4px">${esc(x.p.title)}${x.kind === 'keisu' && x.p.name ? '　' + esc(x.p.name) : ''}</h3>`;
        if (x.kind === 'keisu') head += `<p class="muted" style="white-space:pre-wrap;margin:0 0 4px">${esc(x.p.text)}</p>${renderTable(x.p.table)}`;
      }
      if (x.kind === 'kiso') {
        const line = (x.p.text.split('\n').find((l) => l.includes(`{{${x.bi}}}`)) || '').replace(/\{\{(\d+)\}\}/g, (m, n) => (Number(n) === x.bi ? '【　】' : x.p.blanks[Number(n)].answer));
        return `${head}<div class="rv"><p class="q">${circled(x.bi)} ${esc(line.trim())}</p><div class="ans">正解：<b>${esc(x.b.answer)}</b></div>${mine(v, ok)}</div>`;
      }
      if (x.kind === 'keisu') {
        const it = x.it;
        const ctx = (it.pre ? `<p class="muted" style="white-space:pre-wrap;margin:0 0 4px">${esc(it.pre)}</p>` : '') + (x.ii === 0 ? givenBox(x.p.given) : '');
        const ans = it.type === 'choice' ? esc(it.ans) : `${esc(Keisu.fmt(it.ans, it.dec))} ${esc(it.unit || '')}${it.alt && it.alt.length ? `（${it.alt.map((a) => esc(Keisu.fmt(a, it.dec))).join('・')}も可）` : ''}`;
        return `${head}<div class="rv">${ctx}<p class="q">${esc(it.q)}</p><div class="ans">正解：<b>${ans}</b></div>${mine(v, ok)}<div class="exp">${it.exp.map(esc).join('\n')}</div></div>`;
      }
      const t = x.t;
      const others = (t.accept || []).filter((a) => normTerm(a) !== normTerm(t.term));
      return `<div class="rv"><p class="q">${esc(t.meaning)}</p><div class="ans">正解：<b>${esc(t.term)}</b>${others.length ? `<span class="muted">（${others.map(esc).join('・')} も可）</span>` : ''}</div>${mine(v, ok)}</div>`;
    }).join('');
    return `<h2>解答の確認</h2>${tabs}${filt}${body || '<p class="muted">間違いはありません。</p>'}`;
  }

  // ---------- 起動 ----------
  async function boot() {
    try {
      const [kiso, yogo] = await Promise.all(['data/kiso.json', 'data/yogo.json'].map((u) => fetch(u, { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(u); return r.json(); })));
      BANK = { kiso, yogo };
    } catch (e) {
      $app.innerHTML = `<div class="wrap"><section class="card"><h2>問題データを読み込めませんでした</h2><p class="muted">電波の良い場所で再読み込みしてください。（${esc(e.message)}）</p></section></div>`;
      return;
    }
    render();
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }
  boot();
})();
