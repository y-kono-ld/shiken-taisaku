// 計数問題ジェネレーター
// 各テンプレートは乱数で数値を決め、正解・解説付きの大問を返す。
// 値下額＝(元売価−値下売価)×値下売価で売れた数、廃棄額＝元売価×廃棄数、率の分母は売上高（人材教育部指定）。
(function (global) {
  'use strict';

  // ---------- 乱数・端数処理 ----------
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const S = (a, b, s) => R(Math.ceil(a / s), Math.floor(b / s)) * s;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const EPS = 1e-9;
  const p10 = (d) => Math.pow(10, d);
  const rnd = (x, d = 0) => Math.round((x + Math.sign(x) * EPS) * p10(d)) / p10(d);
  const up = (x, d = 0) => Math.ceil(x * p10(d) - EPS) / p10(d);
  const down = (x, d = 0) => Math.floor(x * p10(d) + EPS) / p10(d);
  const isInt = (x) => Math.abs(x - Math.round(x)) < EPS;
  const circled = (i) => (i < 20 ? String.fromCharCode(0x2460 + i) : `(${i + 1})`); // 0→①

  // 表示用
  const f = (x, d) => {
    if (d === undefined) {
      if (isInt(x)) return Math.round(x).toLocaleString('ja-JP');
      const s = (Math.round(x * 1e6) / 1e6).toString();
      const [i, dec] = s.split('.');
      const head = Number(i).toLocaleString('ja-JP');
      return dec.length > 2 ? head + '.' + dec.slice(0, 2) + '…' : head + '.' + dec;
    }
    return x.toLocaleString('ja-JP', { minimumFractionDigits: d, maximumFractionDigits: d });
  };
  const r2 = (pct) => f(pct / 100); // 0.26 のような表示
  const RULE = {
    r0: '円未満四捨五入', r1: '小数点第2位を四捨五入', u0: '円未満切り上げ', d0: '小数点以下切り捨て', d1: '小数点第2位以下を切り捨て',
  };

  // 数値の小問
  const num = (q, ans, unit, dec, exp, extra = {}) => Object.assign({ type: 'num', q, ans, unit, dec, exp }, extra);
  const choice = (q, ans, choices, exp) => ({ type: 'choice', q, ans, choices: shuffle(choices), exp });

  // ================================================================
  // 値入計算の基本型（トレーニー第1回 問1・問2）
  // ================================================================
  const NEIRE = {
    1() { const C = R(120, 1500), m = R(15, 70); const raw = C / (1 - m / 100), a = rnd(raw);
      return num(`原価 ${f(C)} 円、値入率 ${m} %の時の売価はいくらか`, a, '円', 0, [`${f(C)} ÷ ( 1 − ${r2(m)} ) = ${f(raw)} → ${f(a)} 円`], { rule: RULE.r0 }); },
    2() { const P = S(200, 2500, 10), m = R(15, 60); const raw = P * (1 - m / 100), a = rnd(raw);
      return num(`売価 ${f(P)} 円、値入率 ${m} %の時の原価はいくらか`, a, '円', 0, [`${f(P)} × ( 1 − ${r2(m)} ) = ${f(raw)}${isInt(raw) ? '' : ' → ' + f(a)} 円`], { rule: RULE.r0 }); },
    3() { const m = R(15, 45), A = S(50, 600, 10); const raw = A / (m / 100), a = rnd(raw);
      return num(`値入高 ${f(A)} 円、値入率 ${m} %の時の売価はいくらか`, a, '円', 0, [`${f(A)} ÷ ${r2(m)} = ${f(raw)}${isInt(raw) ? '' : ' → ' + f(a)} 円`], { rule: RULE.r0 }); },
    4() { const P = S(200, 2000, 10), A = S(20, Math.floor(P * 0.5), 10); const raw = (P - A) / P * 100, a = rnd(raw, 1);
      return num(`売価 ${f(P)} 円、値入高 ${f(A)} 円の時の原価率はいくらか`, a, '%', 1, [`( ${f(P)} − ${f(A)} ) ÷ ${f(P)} × 100 = ${f(raw)} → ${f(a, 1)} %`], { rule: RULE.r1 }); },
    5() { const C = R(100, 1500), A = S(30, 600, 10);
      return num(`原価 ${f(C)} 円、値入高 ${f(A)} 円の時の売価はいくらか`, C + A, '円', 0, [`${f(C)} + ${f(A)} = ${f(C + A)} 円`], { rule: RULE.r0 }); },
    6() { const C = R(100, 1500), A = R(30, 600); const raw = A / (C + A) * 100, a = rnd(raw, 1);
      return num(`原価 ${f(C)} 円、値入高 ${f(A)} 円の時の値入率はいくらか`, a, '%', 1, [`${f(A)} ÷ ( ${f(C)} + ${f(A)} ) × 100 = ${f(raw)} → ${f(a, 1)} %`], { rule: RULE.r1 }); },
    7() { const P = S(200, 2500, 10), r = R(40, 85); const raw = P * (1 - r / 100), a = rnd(raw);
      return num(`売価 ${f(P)} 円、原価率 ${r} %の時の値入高はいくらか`, a, '円', 0, [`${f(P)} × ( 1 − ${r2(r)} ) = ${f(raw)}${isInt(raw) ? '' : ' → ' + f(a)} 円`], { rule: RULE.r0 }); },
    8() { const r = R(45, 80), A = S(50, 600, 10); const rawP = A / (1 - r / 100), P = rnd(rawP); const rawC = P * r / 100, c1 = rnd(rawC), c2 = P - A;
      return num(`原価率 ${r} %、値入高 ${f(A)} 円の時の原価はいくらか`, c1, '円', 0,
        [`売価　${f(A)} ÷ ( 1 − ${r2(r)} ) = ${f(rawP)} → ${f(P)} 円`, `原価　${f(P)} × ${r2(r)} = ${f(rawC)} → ${f(c1)} 円`, `（ ${f(P)} − ${f(A)} = ${f(c2)} 円でも可）`],
        { rule: RULE.r0, alt: [c2] }); },
    9() { const C = R(100, 1500), m = R(15, 45); const rawP = C / (1 - m / 100), P = rnd(rawP); const rawA = P * m / 100, a1 = rnd(rawA), a2 = P - C;
      return num(`原価 ${f(C)} 円、値入率 ${m} %の時の値入高はいくらか`, a1, '円', 0,
        [`売価　${f(C)} ÷ ( 1 − ${r2(m)} ) = ${f(rawP)} → ${f(P)} 円`, `値入高　${f(P)} × ${r2(m)} = ${f(rawA)} → ${f(a1)} 円`, `（ ${f(P)} − ${f(C)} = ${f(a2)} 円でも可）`],
        { rule: RULE.r0, alt: [a2] }); },
    10() { const P = S(200, 2000, 10), C = R(Math.floor(P * 0.4), Math.floor(P * 0.9)); const raw = (P - C) / P * 100, a = rnd(raw, 1);
      return num(`売価 ${f(P)} 円、原価 ${f(C)} 円の時の値入率はいくらか`, a, '%', 1, [`( ${f(P)} − ${f(C)} ) ÷ ${f(P)} × 100 = ${f(raw)} → ${f(a, 1)} %`], { rule: RULE.r1 }); },
    11() { const P = S(200, 2000, 10), C = R(Math.floor(P * 0.4), Math.floor(P * 0.9)); const raw = C / P * 100, a = rnd(raw, 1);
      return num(`原価 ${f(C)} 円、売価 ${f(P)} 円の時の原価率はいくらか`, a, '%', 1, [`${f(C)} ÷ ${f(P)} × 100 = ${f(raw)} → ${f(a, 1)} %`], { rule: RULE.r1 }); },
    12() { const P = S(200, 2500, 10), A = S(30, Math.floor(P * 0.5), 10);
      return num(`売価 ${f(P)} 円、値入高 ${f(A)} 円の時の原価はいくらか`, P - A, '円', 0, [`${f(P)} − ${f(A)} = ${f(P - A)} 円`], { rule: RULE.r0 }); },
  };
  const neireSet = (types, n) => shuffle(types).slice(0, n).map((t) => NEIRE[t]());

  // ================================================================
  // トレーニー試験 大問テンプレート（第1〜5回を基に数値ランダム化）
  // ================================================================
  const TRAINEE = [];

  // 第1回 問1
  TRAINEE.push({ id: 't1-1', name: '値入計算（売価・原価・原価率）', gen() {
    return { text: '次の問いに答えなさい。', items: neireSet([1, 2, 3, 4, 5, 11, 12], 6) };
  } });

  // 第1回 問2
  TRAINEE.push({ id: 't1-2', name: '値入計算（値入率・値入高）', gen() {
    return { text: '次の問いに答えなさい。', items: neireSet([6, 7, 8, 9, 10, 2], 6) };
  } });

  // 第1回 問3 値下率・ロス率
  TRAINEE.push({ id: 't1-3', name: '値下率・ロス率', gen() {
    const items = [];
    { // ①
      const p = pick([198, 248, 298, 348, 398, 458, 498]), n = R(4, 8), k = R(1, n - 2), d = pick([10, 20, 30]);
      const rawS = p * (n - k) + p * (1 - d / 100) * k, s = rnd(rawS);
      const rawM = p * d / 100 * k, m = rnd(rawM);
      const rawR = m / s * 100, a = rnd(rawR);
      items.push(num('値下率はいくらか', a, '%', 0, [
        `売上高　${f(p)} × ${n - k} + ( ${f(p)} × ${r2(100 - d)} × ${k} ) = ${f(rawS)}${isInt(rawS) ? '' : ' → ' + f(s)} 円`,
        `値下金額　${f(p)} × ${r2(d)} × ${k} = ${f(rawM)}${isInt(rawM) ? '' : ' → ' + f(m)} 円`,
        `値下率　${f(m)} ÷ ${f(s)} × 100 = ${f(rawR)} → ${f(a)} %`],
        { rule: '計算過程及び答えは小数点以下四捨五入', pre: `① 売価 ${f(p)} 円の商品が ${n} パック売れたが、そのうち ${k} パックは ${d} %引きだった。` }));
    }
    { // ②
      const p = S(200, 800, 50), N = R(8, 20); let left = R(1, 4); if ((N - left) % 2) left += 1;
      const sold = N - left, half = sold / 2;
      const s = p * half + p * 0.5 * half, m = p * 0.5 * half, w = p * left;
      const raw = (m + w) / s * 100, a = rnd(raw);
      items.push(num('この商品のロス率はいくらか', a, '%', 0, [
        `売上高　${f(p)} × ${half} + ${f(p)} × 0.5 × ${half} = ${f(s)} 円`,
        `値下金額　${f(p)} × 0.5 × ${half} = ${f(m)} 円`,
        `廃棄金額　${f(p)} × ${left} = ${f(w)} 円`,
        `ロス率　( ${f(m)} + ${f(w)} ) ÷ ${f(s)} × 100 = ${f(raw)} → ${f(a)} %`],
        { rule: '計算過程及び答えは小数点以下四捨五入', pre: `② 売価 ${f(p)} 円の商品を ${N} パック製造して販売したが、${left} パック売れ残った。売れたうちの半分は半額で売れている。残った商品は廃棄した。` }));
    }
    { // ③
      const c = R(150, 600), p1 = up(c / (1 - R(30, 50) / 100), -1) - 2, N = S(60, 200, 10);
      const n1 = R(Math.floor(N * 0.5), Math.floor(N * 0.7)), p2 = S(Math.floor(p1 * 0.6), Math.floor(p1 * 0.85), 10);
      const n2 = R(Math.floor((N - n1) * 0.4), Math.floor((N - n1) * 0.8)), w = N - n1 - n2;
      const s = p1 * n1 + p2 * n2, md = (p1 - p2) * n2, wd = p1 * w;
      const rawM = md / s * 100, aM = rnd(rawM, 1), rawL = (md + wd) / s * 100, aL = rnd(rawL, 1);
      const pre = `③ 原価 ${f(c)} 円の商品を ${N} 個仕入れた。この商品を ${f(p1)} 円で販売したところ ${n1} 個売れた。残りは ${f(p2)} 円で販売して ${n2} 個売れ、残った商品は廃棄した。`;
      items.push(num('(1) 売上高はいくらか', s, '円', 0, [`${f(p1)} × ${n1} + ${f(p2)} × ${n2} = ${f(s)} 円`], { rule: RULE.r1, pre }));
      items.push(num('(2) 値下率はいくらか', aM, '%', 1, [`値下金額　( ${f(p1)} − ${f(p2)} ) × ${n2} = ${f(md)} 円`, `値下率　${f(md)} ÷ ${f(s)} × 100 = ${f(rawM)} → ${f(aM, 1)} %`], { rule: RULE.r1 }));
      items.push(num('(3) ロス率はいくらか', aL, '%', 1, [`廃棄金額　${f(p1)} × ( ${N} − ${n1} − ${n2} ) = ${f(wd)} 円`, `ロス率　( ${f(md)} + ${f(wd)} ) ÷ ${f(s)} × 100 = ${f(rawL)} → ${f(aL, 1)} %`], { rule: RULE.r1 }));
    }
    return { text: '次の問いに答えなさい。', items };
  } });

  // 第1回 問4 歩留まり
  TRAINEE.push({ id: 't1-4', name: '歩留まり率', gen() {
    const items = [];
    { const kg = R(2, 5), g = S(100, 400, 50), inG = kg * 1000 + g, out = S(Math.floor(inG * 0.8), Math.floor(inG * 0.98), 10);
      const raw = out / inG * 100, a = rnd(raw, 1);
      items.push(num('① 歩留まり率はいくらか', a, '%', 1, [`${f(out)} ÷ ( ${f(kg * 1000)} + ${f(g)} ) × 100 = ${f(raw)} → ${f(a, 1)} %`],
        { rule: RULE.r1, pre: `① 鶏肉 ${kg} kg、から揚げ粉 ${g} g から ${f(out)} g のから揚げができた。` })); }
    { const w = S(900, 2000, 50), y = R(60, 85); const raw = w * y / 100, a = rnd(raw);
      items.push(num('② スライス後の正味重量はいくらか', a, 'g', 0, [`${f(w)} × ${r2(y)} = ${f(raw)}${isInt(raw) ? '' : ' → ' + f(a)} g`],
        { rule: 'g未満四捨五入', pre: `② とんかつのあしらい用にキャベツをスライスする。キャベツの重さは ${f(w)} g で歩留まり率は ${y} % だった。` })); }
    { const kg = pick([0.8, 1, 1.2, 1.5, 1.8, 2, 2.5]), y = R(35, 50), sl = pick([10, 12, 15]); const net = kg * 1000 * y / 100, raw = net / sl, a = down(raw);
      items.push(num('③ このタイから何切れの刺身が切れるか', a, '切れ', 0, [`${f(kg * 1000)} × ${r2(y)} = ${f(net)} g`, `${f(net)} ÷ ${sl} = ${f(raw)}${isInt(raw) ? '' : ' → ' + f(a)} 切れ（端数は切り捨て）`],
        { rule: '1切れ未満は切り捨て', pre: `③ 刺身用に重さ ${kg} kg のタイを卸した。タイの歩留まり率は ${y} % だった。刺身1切れの重さが ${sl} g の時、` })); }
    { let C, m, P, raw;
      do { C = S(600, 2800, 10); m = R(25, 45); P = S(Math.ceil(C / 10 / (1 - m / 100)), Math.ceil(C / 10 / (1 - m / 100) / 0.75), 1); P = Math.floor(P / 10) * 10 + 8; raw = (C / 10) / (P * (1 - m / 100)) * 100; } while (raw < 70 || raw > 99);
      const cost = P * (1 - m / 100), a = rnd(raw, 1);
      items.push(num('④ 歩留まり率を何%にしなければいけないか', a, '%', 1, [
        `100g当たり原価　${f(C)} ÷ 10 = ${f(C / 10)} 円`, `売価 ${f(P)} 円・値入率 ${m} %の原価　${f(P)} × ( 1 − ${r2(m)} ) = ${f(cost)}`,
        `歩留まり率　${f(C / 10)} ÷ ${f(cost)} × 100 = ${f(raw)} → ${f(a, 1)} %`],
        { rule: RULE.r1, pre: `④ 1 kg 当たり原価 ${f(C)} 円の肉を商品化し、値入率 ${m} %、100 g 当たり売価 ${f(P)} 円で販売するためには、` })); }
    return { text: '次の問いに答えなさい。', items };
  } });

  // 第2回 問1 レンコン
  TRAINEE.push({ id: 't2-1', name: '歩留まりと原価・売価', gen() {
    const item = pick(['レンコン', 'ごぼう', '長ねぎ', 'ブロッコリー', '白菜']);
    const W = R(5, 12), W2 = rnd(W * R(60, 85) / 100, 1), X = S(W * 600, W * 1500, 100);
    const rawY = W2 / W * 100, y = rnd(rawY, 1);
    const rawC = X / W / (y / 100), c = rnd(rawC);
    const m = R(25, 40), rawP = c / (1 - m / 100), p = up(rawP);
    const P100 = S(Math.ceil(c / 10 * 1.3), Math.ceil(c / 10 * 2.2), 10), m2 = R(20, 35);
    const rawX = P100 * (1 - m2 / 100) * (y / 100), x = rnd(rawX);
    return { text: `${item}を ${W} kg 仕入れ、トリミングを施し商品化したところ、重量が ${W2} kg となった。以下の問いに答えなさい。`, items: [
      num('① 歩留まり率を計算しなさい', y, '%', 1, [`${W2} kg ÷ ${W} kg × 100 = ${f(rawY)} → ${f(y, 1)} %`], { rule: RULE.r1 }),
      num(`② ${item}の原価は ${f(X)} 円だった。商品化した${item}の原価は 1 kg 当たりいくらか`, c, '円', 0, [`${f(X)} ÷ ${W} ÷ ${f(y / 100)} = ${f(rawC)} → ${f(c)} 円`], { rule: RULE.r0 }),
      num(`③ 値入率 ${m} %で販売するとき、1 kg 当たりの売価はいくらにすればよいか`, p, '円', 0, [`${f(c)} ÷ ( 1 − ${r2(m)} ) = ${f(rawP)} → ${f(p)} 円`], { rule: RULE.u0 }),
      num(`④ 100 g 当たり ${P100} 円で販売して値入率を ${m2} %以上確保したい。仕入原価は 1 kg 当たりいくらまでなら良いか`, x * 10, '円', 0, [
        `100g当たりの原価を x とすると　${P100} = x ÷ ${f(y / 100)} ÷ ( 1 − ${r2(m2)} )`,
        `x = ${P100} × ${r2(100 - m2)} × ${f(y / 100)} = ${f(rawX)} → ${f(x)} 円（100g当たり）`, `1 kg 当たりなので ${f(x * 10)} 円`], { rule: RULE.r0 }),
    ] };
  } });

  // 第2回 問2 設定売価
  TRAINEE.push({ id: 't2-2', name: '値引・ロスを見込んだ売価設定', gen() {
    const items = [];
    { const c = R(200, 900), d = pick([10, 20, 30]), g = R(10, 25);
      const raw1 = c / (1 - g / 100), s1 = rnd(raw1), raw2 = s1 / (1 - d / 100), a = rnd(raw2);
      items.push(num('いくらで販売すればよいか', a, '円', 0, [`荒利率 ${g} %を確保する売価　${f(c)} ÷ ( 1 − ${r2(g)} ) = ${f(raw1)} → ${f(s1)} 円`, `${d}%引きで ${f(s1)} 円になる売価　${f(s1)} ÷ ( 1 − ${r2(d)} ) = ${f(raw2)} → ${f(a)} 円`],
        { rule: '計算過程及び答えは円未満四捨五入', pre: `① 原価 ${f(c)} 円の商品を、仮に売価の${d}%引きで販売したとしても、荒利率を ${g} %確保したい。` })); }
    { const c = R(150, 800), L = rnd(R(50, 200) / 10, 1), g = R(12, 30);
      const rawA = c / (1 - g / 100), A = up(rawA), rawG = A * g / 100, G = up(rawG), rawL = A * L / 100, Lo = up(rawL), a = c + G + Lo;
      items.push(num('荒利率を確保するために必要な設定売価はいくらか', a, '円', 0, [
        `荒利率 ${g} %の時の売価　${f(c)} ÷ ( 1 − ${r2(g)} ) = ${f(rawA)} → ${f(A)} 円`, `荒利高　${f(A)} × ${r2(g)} = ${f(rawG)} → ${f(G)} 円`,
        `ロス高　${f(A)} × ${f(L / 100)} = ${f(rawL)} → ${f(Lo)} 円`, `値入高　${f(G)} + ${f(Lo)} = ${f(G + Lo)} 円`, `設定売価　${f(c)} + ${f(G + Lo)} = ${f(a)} 円`],
        { rule: '金額は円未満切り上げ', pre: `② ある商品（原価 ${f(c)} 円）のロス率（値下率＋廃棄率）は ${f(L, 1)} %だった。荒利率 ${g} %を確保したい。` })); }
    { let c, mA, nA, nB, M, Asales, total, rawB, b, rawT;
      do { c = R(40, 150); mA = pick([20, 25, 28, 30, 36, 40]); nA = S(40, 200, 2); nB = S(20, 100, 10); M = mA + R(2, 8);
        Asales = (c * 2) / (1 - mA / 100) * (nA / 2); rawT = c * (nA + nB) / (1 - M / 100); total = up(rawT); rawB = (total - Asales) / nB; b = up(rawB);
      } while (!isInt(Asales) || b <= c);
      items.push(num('B をいくらで売ればよいか', b, '円', 0, [
        `全体の仕入原価　${f(c)} × ${nA + nB} = ${f(c * (nA + nB))} 円`, `値入率 ${M} %の時の売価合計　${f(c * (nA + nB))} ÷ ( 1 − ${r2(M)} ) = ${f(rawT)} → ${f(total)} 円`,
        `A の売価合計　( ${f(c)} × 2 ) ÷ ( 1 − ${r2(mA)} ) × ${nA / 2} = ${f(Asales)} 円`, `B　( ${f(total)} − ${f(Asales)} ) ÷ ${nB} = ${f(rawB)} → ${f(b)} 円`],
        { rule: '計算過程及び答えは円未満切り上げ', pre: `③ 納豆A と納豆B をそれぞれ ${nA} 個と ${nB} 個仕入れた（原価はともに ${c} 円）。A は2個セット、B は1個単体で販売する（A の値入率 ${mA} %）。A、B 合わせて値入率を ${M} %にしたい。` })); }
    return { text: '次の問いに答えなさい。', items };
  } });

  // 第2回 問3 ステーキ値下げ
  TRAINEE.push({ id: 't2-3', name: '値下げ限界と最終荒利率', gen() {
    let p, N, m, n1, g, W, cost, rawNeed, need, rest, rawPer, amt, rate, p2, sold2, sales, rawG, G;
    do {
      p = pick([1980, 2480, 2980, 3480, 3980]); N = S(40, 120, 10); m = pick([35, 40, 45]); n1 = R(Math.floor(N * 0.6), Math.floor(N * 0.8)); g = m - R(5, 12);
      cost = rnd(p * (1 - m / 100)); rawNeed = cost / (1 - g / 100) * N; need = rnd(rawNeed); rest = need - p * n1;
      rawPer = p - rest / (N - n1); amt = rnd(rawPer); rate = down(amt / p * 100, 1);
      p2 = rnd(p * (1 - rate / 100)); W = R(2, Math.max(2, Math.floor((N - n1) * 0.4))); sold2 = N - n1 - W;
      sales = p * n1 + p2 * sold2; rawG = (sales - cost * N) / sales * 100; G = down(rawG, 1);
    } while (rate <= 5 || rate >= 70 || sold2 <= 0 || G <= 0);
    const md = (p - p2) * sold2, wd = p * W, rawL = (md + wd) / sales * 100, L = rnd(rawL, 1);
    return { text: `売価 ${f(p)} 円のサーロインステーキを ${N} パック販売することにした。以下の問いに答えなさい。`, items: [
      num(`① 値入率は ${m} %にしている。1パック当たりの原価はいくらか`, cost, '円', 0, [`${f(p)} × ( 1 − ${r2(m)} ) = ${f(cost)} 円`], { rule: RULE.r0 }),
      num(`② ${n1} パックまでは順調に売れたが、残りは値下げしないと厳しい。最終的な荒利率 ${g} %を確保するには、何 %までの値下げなら良いか`, rate, '%', 1, [
        `荒利率 ${g} %のために必要な合計売価　${f(cost)} ÷ ( 1 − ${r2(g)} ) × ${N} = ${f(rawNeed)} → ${f(need)} 円`,
        `${n1} パック時点の合計売価　${f(p)} × ${n1} = ${f(p * n1)} 円`, `残りの必要金額　${f(need)} − ${f(p * n1)} = ${f(rest)} 円`,
        `1パック当たりの値下げ金額　${f(p)} − ${f(rest)} ÷ ${N - n1} = ${f(rawPer)} → ${f(amt)} 円`,
        `値下げ率　${f(amt)} ÷ ${f(p)} × 100 = ${f(amt / p * 100)} → ${f(rate, 1)} %`], { rule: '金額は円未満四捨五入、％は小数点第2位以下切り捨て' }),
      num(`③ ②の値下率で最後まで販売したところ、${W} パック売れ残り廃棄になった。最終的な荒利率は何 %か`, G, '%', 1, [
        `値下げ後の売価　${f(p)} × ( 1 − ${String(rnd(rate / 100, 3))} ) =${f(p * (1 - rate / 100))} → ${f(p2)} 円`,
        `最終的な販売金額　${f(p * n1)} + ${f(p2)} × ${sold2} = ${f(sales)} 円`,
        `荒利率　( ${f(sales)} − ${f(cost)} × ${N} ) ÷ ${f(sales)} × 100 = ${f(rawG)} → ${f(G, 1)} %`], { rule: '金額は円未満四捨五入、％は小数点第2位以下切り捨て' }),
      num('④ ③の時のロス率は何 %か', L, '%', 1, [
        `値下げ金額合計　( ${f(p)} − ${f(p2)} ) × ${sold2} = ${f(md)} 円`, `廃棄金額合計　${f(p)} × ${W} = ${f(wd)} 円`,
        `ロス率　( ${f(md)} + ${f(wd)} ) ÷ ${f(sales)} × 100 = ${f(rawL)} → ${f(L, 1)} %`], { rule: RULE.r1 }),
    ] };
  } });

  // 第2回 問4 / 第5回 問3 在庫と売上原価
  TRAINEE.push({ id: 't2-4', name: '在庫・売上原価・不明ロス', gen() {
    let o, oc, pIn, pc, e, ec, sales, chg, loss;
    do {
      const cr = R(62, 75) / 100;
      o = S(700, 1800, 1); oc = rnd(o * cr); pIn = S(5000, 9000, 1); pc = rnd(pIn * cr); e = S(600, 1600, 1); ec = rnd(e * cr);
      chg = R(100, 300); loss = R(10, 90); sales = o + pIn - e - chg - loss;
    } while (sales <= 0);
    const cogs = oc + pc - ec, gp = sales - cogs, rawGR = gp / sales * 100, gr = rnd(rawGR, 1), rawLR = loss / sales * 100, lr = rnd(rawLR, 1);
    return { text: '次の資料から、空欄①〜⑤を求めなさい。', rule: '金額は千円未満、％は小数点第2位を四捨五入',
      table: { head: ['項目', '', '金額（千円）'], rows: [
        ['売上高', '', f(sales)], ['期首在庫', '原価', f(oc)], ['', '売価', f(o)], ['期中仕入', '原価', f(pc)], ['', '売価', f(pIn)],
        ['期末在庫', '原価', f(ec)], ['', '売価', f(e)], ['売上原価', '', '①'], ['荒利益高', '', '②'], ['売価変更高', '', f(chg)], ['不明ロス高', '', '③'], ['荒利率', '', '④ %'], ['不明ロス率', '', '⑤ %']] },
      items: [
        num('① 売上原価', cogs, '千円', 0, [`${f(oc)} + ${f(pc)} − ${f(ec)} = ${f(cogs)} 千円`]),
        num('② 荒利益高', gp, '千円', 0, [`${f(sales)} − ${f(cogs)} = ${f(gp)} 千円`]),
        num('③ 不明ロス高', loss, '千円', 0, [`${f(o)} + ${f(pIn)} − ( ${f(sales)} + ${f(e)} + ${f(chg)} ) = ${f(loss)} 千円`]),
        num('④ 荒利率', gr, '%', 1, [`${f(gp)} ÷ ${f(sales)} × 100 = ${f(rawGR)} → ${f(gr, 1)} %`]),
        num('⑤ 不明ロス率', lr, '%', 1, [`${f(loss)} ÷ ${f(sales)} × 100 = ${f(rawLR)} → ${f(lr, 1)} %`]),
      ] };
  } });

  // 第3回 問1 ケース仕入の果物
  TRAINEE.push({ id: 't3-1', name: 'ケース仕入の売上・荒利', gen() {
    const fruit = pick(['桃', 'りんご', '梨', '柿']);
    let q, C, C1, m, P, r1, cost, unitsA, packsA, salesA, grossA, rawRA, rA, rem, r2_, P1, n1, n3, P3, total, allCost, rawF, F;
    do {
      q = pick([6, 8, 9, 10, 12]); C = S(40, 120, 10); C1 = R(Math.floor(C * 0.25), Math.floor(C * 0.45)); m = pick([20, 25, 30]);
      P = S(300, 800, 10) - 2; cost = rnd(P / 2 * (1 - m / 100), 1);
      r1 = R(4, 20); if ((q * C1 - r1) % 2) r1 += 1; unitsA = q * C1; packsA = (unitsA - r1) / 2; salesA = packsA * P;
      grossA = rnd(salesA - cost * 2 * (unitsA / 2), 1); rawRA = grossA / salesA * 100; rA = rnd(rawRA, 1);
      rem = q * (C - C1); r2_ = R(10, 40); P1 = S(150, 400, 10) - 2; n1 = R(Math.floor(rem * 0.3), Math.floor(rem * 0.6));
      let left = rem - r2_ - n1; left -= left % 3; n1 = rem - r2_ - left; n3 = left / 3; P3 = S(Math.floor(P1 * 2.4), Math.floor(P1 * 2.9), 10);
      total = salesA + P1 * n1 + P3 * n3; allCost = rnd(cost * q * C, 1); rawF = (total - allCost) / total * 100; F = rnd(rawF, 1);
    } while (n3 <= 0 || unitsA % 2 || rA <= 0 || F <= 0);
    return { text: '次の問いに答えなさい。', rule: RULE.r1, items: [
      num('(1) 1個当たりの原価はいくらか', cost, '円', 1, [`( ${f(P)} ÷ 2 ) × ( 1 − ${r2(m)} ) = ${f(P / 2 * (1 - m / 100))}${isInt(cost * 10) ? '' : ' → ' + f(cost, 1)} 円`],
        { pre: `① 1c/s ${q} 個入りの${fruit}を ${C} c/s 仕入れた。値入率 ${m} %で2個入り ${f(P)} 円で ${C1} c/s 分を販売したが、そのうち ${r1} 個が傷んでいたので廃棄した。` }),
      num('(2) ここまでの売上高はいくらか', salesA, '円', 1, [`( ${f(unitsA)} − ${r1} ) ÷ 2 × ${f(P)} = ${f(salesA)} 円`]),
      num('(3) 荒利高はいくらか', grossA, '円', 1, [`${f(salesA)} − ( ${f(cost, 1)} × 2 × ${unitsA / 2} ) = ${f(grossA)} 円`]),
      num('(4) 荒利率はいくらか', rA, '%', 1, [`${f(grossA)} ÷ ${f(salesA)} × 100 = ${f(rawRA)} → ${f(rA, 1)} %`]),
      num('(1) 3個入りの販売数はいくつか', n3, 'パック', 0, [`3個入りの販売個数　${f(rem)} − ${r2_} − ${n1} = ${f(n3 * 3)} 個`, `${f(n3 * 3)} ÷ 3 = ${n3} パック`],
        { pre: `② ①のあと、残りの${fruit}を1個入り（売価 ${P1} 円）と3個入り（売価 ${P3} 円）で販売して売り切ったが、詰めている途中で傷んだ${fruit}を ${r2_} 個廃棄した。1個入りの販売数は ${n1} 個だった。` }),
      num('(2) 最終的な売上高はいくらか', total, '円', 1, [`${f(salesA)} + ( ${P1} × ${n1} ) + ( ${P3} × ${n3} ) = ${f(total)} 円`]),
      num('(3) 最終的な荒利率はいくらか', F, '%', 1, [`原価合計　${f(cost, 1)} × ${f(q * C)} = ${f(allCost)} 円`, `( ${f(total)} − ${f(allCost)} ) ÷ ${f(total)} × 100 = ${f(rawF)} → ${f(F, 1)} %`]),
    ] };
  } });

  // 第3回 問2 / 第5回 問2 消耗品を含む原価
  TRAINEE.push({ id: 't3-2', name: '消耗品を含めた原価と値入', gen() {
    const c = S(700, 1800, 10), s = S(100, 300, 10), base = c * 2 + s, m = pick([15, 20, 25]);
    const rawP = base / (1 - m / 100), P = up(rawP);
    const P2 = S(Math.ceil(base * 1.05), Math.floor(base * 1.3), 10), rawR = (P2 - base) / P2 * 100, R2 = rnd(rawR, 1);
    let P3, lim; do { P3 = S(Math.ceil(c * 2 / (1 - m / 100)), Math.ceil((c * 2 + s) / (1 - m / 100)), 10); lim = rnd(P3 * (1 - m / 100)) - c * 2; } while (lim <= 0);
    const P4 = S(Math.floor(base * 0.95), Math.floor(base * 1.15), 10), t4 = P4 * (1 - m / 100), per = down((t4 - s) / 2);
    return { text: `原価 1本 ${f(c)} 円のワインを2本セットで販売することにした。消耗品として化粧箱代など ${s} 円かかる。以下の問いに答えなさい。`, items: [
      num(`(1) 消耗品を原価に含めたセットを値入率 ${m} %で販売するときの売価はいくらか`, P, '円', 0, [`原価合計　${f(c)} × 2 + ${s} = ${f(base)} 円`, `${f(base)} ÷ ( 1 − ${r2(m)} ) = ${f(rawP)}${isInt(rawP) ? '' : ' → ' + f(P)} 円`], { rule: RULE.u0 }),
      num(`(2) 消耗品を原価に含めて売価 ${f(P2)} 円で販売したときの値入率はいくらか`, R2, '%', 1, [`値入高　${f(P2)} − ${f(base)} = ${f(P2 - base)} 円`, `${f(P2 - base)} ÷ ${f(P2)} × 100 = ${f(rawR)} → ${f(R2, 1)} %`], { rule: RULE.r1 }),
      num(`(3) 消耗品を原価に含めて ${f(P3)} 円で販売し、値入率 ${m} %を確保するには、消耗品はいくらに抑えればよいか`, lim, '円', 0, [`原価合計　${f(P3)} × ( 1 − ${r2(m)} ) = ${f(P3 * (1 - m / 100))}${isInt(P3 * (1 - m / 100)) ? '' : ' → ' + f(rnd(P3 * (1 - m / 100)))} 円`, `ワイン2本分の原価　${f(c)} × 2 = ${f(c * 2)} 円`, `${f(rnd(P3 * (1 - m / 100)))} − ${f(c * 2)} = ${f(lim)} 円`], { rule: RULE.r0 }),
      num(`(4) 消耗品（${s} 円）を原価に含めて2本 ${f(P4)} 円で販売し、値入率 ${m} %を確保するには、1本当たり原価をいくらにしなければならないか`, per, '円', 0, [`原価合計　${f(P4)} × ( 1 − ${r2(m)} ) = ${f(t4)} 円`, `ワイン1本分の原価　( ${f(t4)} − ${s} ) ÷ 2 = ${f((t4 - s) / 2)}${isInt((t4 - s) / 2) ? '' : ' → ' + f(per)} 円`], { rule: '計算過程及び答えは小数点以下切り捨て' }),
    ] };
  } });

  // 第3回 問3 相乗積
  TRAINEE.push({ id: 't3-3', name: '相乗積と構成比の入れ替え', gen() {
    let shares, rates, cur, curR, T, shift, lowI, highI;
    do {
      const raw = [R(5, 30), R(15, 40), R(3, 15), R(5, 20), R(10, 30)]; const sum = raw.reduce((a, b) => a + b, 0);
      shares = raw.map((x) => Math.round(x / sum * 100)); shares[4] = 100 - shares.slice(0, 4).reduce((a, b) => a + b, 0);
      rates = [R(5, 30), R(5, 12), R(25, 40), R(10, 25), R(8, 20)];
      lowI = 1; highI = 2; cur = shares.reduce((a, s, i) => a + s * rates[i] / 100, 0); curR = rnd(cur, 1);
      T = Math.ceil(curR) + R(1, 3); shift = rnd((T - curR) / ((rates[highI] - rates[lowI]) / 100), 1);
    } while (shares[4] <= 0 || shift >= shares[lowI]);
    const names = ['A', 'B', 'C', 'D', 'E'];
    const step = (rates[highI] - rates[lowI]) / 100;
    return { text: '次の表について、(1)〜(2)の問いに答えなさい。', rule: '％は小数点第2位を四捨五入',
      table: { head: ['商品', '売上構成比(%)', '荒利率(%)', '相乗積'], rows: names.map((n, i) => [n, shares[i], rates[i], '']).concat([['合計', 100, 'ー', '']]) },
      items: [
        num('(1) 全体荒利率（平均荒利率）は何 %か', curR, '%', 1, [`相乗積＝構成比×荒利率÷100 を合計`, names.map((n, i) => `${n}: ${shares[i]}×${rates[i]}÷100=${f(shares[i] * rates[i] / 100)}`).join('　'), `合計 ${f(cur)} → ${f(curR, 1)} %`]),
        num(`(2) 全体の荒利率 ${T} %を達成するため、B と C の構成比を入れ替える。B から C へ構成比を何 %移動させればよいか`, shift, '%', 1, [
          `B が 1 %動くと相乗積は ${rates[lowI]} ÷ 100 = ${f(rates[lowI] / 100)} 動く`, `C が 1 %動くと相乗積は ${rates[highI]} ÷ 100 = ${f(rates[highI] / 100)} 動く`,
          `B を減らし C を増やすので、1 %当たり ${f(step)} 上がる`, `${T} % − ${f(curR, 1)} % = ${f(T - curR, 1)} %`, `${f(T - curR, 1)} ÷ ${f(step)} = ${f((T - curR) / step)} → ${f(shift, 1)} %`]),
      ] };
  } });

  // 第3回 問4 / 第5回 問1① 丸魚の必要尾数
  TRAINEE.push({ id: 't3-4', name: '丸魚の必要尾数と刺身パック数', gen() {
    const fish = pick(['ぶり', 'カツオ', 'たい']);
    let S0, m, W, P, y, kgRaw, kg, nRaw, n, costRaw, cost, P2, m2, sumRaw, sum, packsRaw, packs, F, L, lossRaw, loss, gp, rawG, G;
    do {
      S0 = S(100000, 300000, 10000); m = pick([25, 30, 35]); W = pick([3, 4, 5, 6, 8]); P = S(150, 400, 10) - 2; y = R(38, 50);
      kgRaw = S0 / (P * 10) / (y / 100); kg = up(kgRaw); nRaw = kg / W; n = up(nRaw);
      costRaw = S0 * (1 - m / 100) / n; cost = up(costRaw);
      P2 = pick([398, 498, 598]); m2 = R(35, 45); sumRaw = cost / (1 - m2 / 100); sum = up(sumRaw); packsRaw = sum / P2; packs = up(packsRaw);
      F = S(Math.floor(S0 * 1.02), Math.floor(S0 * 1.15), 1); L = rnd(R(20, 70) / 10, 1); lossRaw = F * L / 100; loss = up(lossRaw);
      gp = F - loss - cost * n; rawG = gp / F * 100; G = rnd(rawG, 1);
    } while (n < 2 || packs < 3 || G <= 0);
    return { text: `販売予算 ${f(S0)} 円で${fish}を販売することにした（値入率 ${m} %）。${fish}は1尾 ${W} kg の丸魚を仕入れ、卸したうえで販売する。次の問いに答えなさい。`, rule: '％は小数点第2位を四捨五入、その他は小数点以下切り上げ', items: [
      num(`① 刺身用のサクとして 100 g 当たり ${P} 円で販売しようとしたとき、${fish}は何尾必要か（歩留まり率 ${y} %）`, n, '尾', 0, [`1 kg 当たりの売価　${P} × 10 = ${f(P * 10)} 円`, `必要な kg 数　${f(S0)} ÷ ${f(P * 10)} ÷ ${f(y / 100)} = ${f(kgRaw)} → ${f(kg)} kg`, `必要な尾数　${f(kg)} ÷ ${W} = ${f(nRaw)} → ${n} 尾`]),
      num(`② ${fish}1尾当たりの仕入原価はいくらか`, cost, '円', 0, [`必要な仕入原価　${f(S0)} × ( 1 − ${r2(m)} ) = ${f(S0 * (1 - m / 100))} 円`, `1尾当たり　${f(S0 * (1 - m / 100))} ÷ ${n} = ${f(costRaw)} → ${f(cost)} 円`]),
      num(`③ 刺身でも売ることにした。②の原価のとき、売価 ${P2} 円で値入率 ${m2} %以上の刺身を販売する場合、1尾から何パックの刺身を造ればよいか`, packs, 'パック', 0, [`1尾当たりの値入率 ${m2} %の合計売価　${f(cost)} ÷ ( 1 − ${r2(m2)} ) = ${f(sumRaw)} → ${f(sum)} 円`, `${f(sum)} ÷ ${P2} = ${f(packsRaw)} → ${packs} パック`]),
      num(`④ 最終的に${fish}全体での販売金額は ${f(F)} 円、ロス率は ${f(L, 1)} %だった。最終的な荒利率は何 %か`, G, '%', 1, [`原価合計　${f(cost)} × ${n} = ${f(cost * n)} 円`, `ロス金額　${f(F)} × ${f(L / 100)} = ${f(lossRaw)} → ${f(loss)} 円`, `荒利金額　${f(F)} − ${f(loss)} − ${f(cost * n)} = ${f(gp)} 円`, `荒利率　${f(gp)} ÷ ${f(F)} × 100 = ${f(rawG)} → ${f(G, 1)} %`]),
    ] };
  } });

  // 第4回 問1 ソーセージ・サンマ
  TRAINEE.push({ id: 't4-1', name: 'パック販売の売上・ロスとケース発注', gen() {
    const items = [];
    { let c, N, a, n1, packs, P3, P4, K, W, sold3, sold4, sales, gr, rawG, md, wd, rawL, L;
      do { c = R(30, 90); N = S(120, 300, 10); a = R(20, 60); n1 = R(Math.floor(N * 0.4), Math.floor(N * 0.65)); if ((N - n1) % 3) n1 += (N - n1) % 3;
        packs = (N - n1) / 3; P3 = S((c + a) * 3 * 0.85, (c + a) * 3 * 0.97, 10); P4 = S(P3 * 0.6, P3 * 0.8, 10) - 2; K = R(4, Math.min(12, packs - 2)); W = R(1, K - 1);
        sold3 = packs - K; sold4 = K - W; sales = (c + a) * n1 + P3 * sold3 + P4 * sold4; rawG = (sales - c * N) / sales * 100; gr = rnd(rawG, 1);
        md = (P3 - P4) * sold4; wd = P3 * W; rawL = (md + wd) / sales * 100; L = rnd(rawL, 1);
      } while (packs < 8 || gr <= 0);
      const pre = `① 原価1本 ${c} 円のソーセージを ${N} 本仕入れた。値入高を ${a} 円に設定し販売した。${n1} 本売れたところで3本パック ${f(P3)} 円で販売し、残り ${K} パックからは ${P4} 円に値下げした。最終的に ${W} パック売れ残り、廃棄処理をした。`;
      items.push(num('(1) 売上高はいくらか', sales, '円', 1, [`1本の売価　${c} + ${a} = ${c + a} 円`, `パック数は ${c + a}円売：${n1} 本　${f(P3)}円売：${sold3} パック　${P4}円売：${sold4} パック`, `( ${c + a} × ${n1} ) + ( ${f(P3)} × ${sold3} ) + ( ${P4} × ${sold4} ) = ${f(sales)} 円`], { rule: RULE.r1, pre }));
      items.push(num('(2) 荒利率はいくらか', gr, '%', 1, [`原価金額合計　${c} × ${N} = ${f(c * N)} 円`, `( ${f(sales)} − ${f(c * N)} ) ÷ ${f(sales)} × 100 = ${f(rawG)} → ${f(gr, 1)} %`], { rule: RULE.r1 }));
      items.push(num('(3) 値下金額はいくらか', md, '円', 1, [`1パック当たりの値下金額　${f(P3)} − ${P4} = ${f(P3 - P4)} 円`, `${f(P3 - P4)} × ${sold4} = ${f(md)} 円`], { rule: RULE.r1 }));
      items.push(num('(4) ロス率は何 %か', L, '%', 1, [`廃棄金額　${f(P3)} × ${W} = ${f(wd)} 円`, `ロス額　${f(wd)} + ${f(md)} = ${f(wd + md)} 円`, `ロス率　${f(wd + md)} ÷ ${f(sales)} × 100 = ${f(rawL)} → ${f(L, 1)} %`], { rule: RULE.r1 }));
    }
    { const fish = pick(['サンマ', 'アジ', 'イワシ']), Cc = S(2000, 5000, 100), q = pick([20, 24, 25, 27, 30]), p = S(Math.ceil(Cc / q * 1.3), Math.ceil(Cc / q * 1.9), 10) - 2, T = S(20000, 60000, 1000);
      const uc = rnd(Cc / q, 1), rawR = (p - uc) / p * 100, rr = rnd(rawR, 1), per = p * q, rawCs = T / per, cs = up(rawCs);
      const pre = `② 1ケース ${f(Cc)} 円の${fish}（1ケース ${q} 尾入）を1尾 ${p} 円で販売し、${f(T)} 円の売上をつくりたい。`;
      items.push(num('(1) 値入率はいくらか', rr, '%', 1, [`1尾当たりの原価　${f(Cc)} ÷ ${q} = ${f(Cc / q)} → ${f(uc, 1)} 円`, `( ${p} − ${f(uc, 1)} ) ÷ ${p} × 100 = ${f(rawR)} → ${f(rr, 1)} %`], { rule: RULE.r1, pre }));
      items.push(num('(2) 何ケース発注すればいいか', cs, 'ケース', 0, [`1ケース当たりの合計売価　${p} × ${q} = ${f(per)} 円`, `${f(T)} ÷ ${f(per)} = ${f(rawCs)} → ${cs} ケース`], { rule: '端数は切り上げ' }));
    }
    return { text: '次の問いに答えなさい。', items };
  } });

  // 第4回 問2 部門表の空欄
  TRAINEE.push({ id: 't4-2', name: '売上・荒利の表の空欄', gen() {
    let sales, gps, rates, total, cur, E;
    do {
      total = S(50000, 120000, 1000);
      sales = [S(2000, 8000, 1000), S(10000, 25000, 1000), S(8000, 20000, 1000), S(15000, 30000, 1000)];
      E = total - sales.reduce((a, b) => a + b, 0);
      rates = [pick([30, 35, 40, 45, 50]), pick([18, 20, 22, 24, 25]), pick([25, 30, 35]), pick([28, 32, 34, 36]), pick([15, 20, 25, 30])];
    } while (E < 3000);
    sales.push(E); gps = sales.map((s, i) => s * rates[i] / 100);
    const names = ['A', 'B', 'C', 'D', 'E'];
    // 各行で何を隠すか：0=売上 1=荒利金額 2=荒利率（Eは売上と荒利率を隠す）
    const hide = [pick([1, 2]), pick([0, 2]), pick([1, 2]), pick([0, 1]), null];
    const items = []; const rows = [];
    const hole = () => circled(items.length);
    names.forEach((n, i) => {
      const row = [n, f(sales[i]), f(gps[i]), rates[i] + '%'];
      if (i === 4) { row[1] = circled(items.length); row[3] = circled(items.length + 1); }
      else if (hide[i] === 0) { row[1] = hole(); items.push(num(`${hole()} ${n} の売上高`, sales[i], '円', 0, [`${f(gps[i])} ÷ ${r2(rates[i])} = ${f(sales[i])} 円`])); }
      else if (hide[i] === 1) { row[2] = hole(); items.push(num(`${hole()} ${n} の荒利金額`, gps[i], '円', 0, [`${f(sales[i])} × ${r2(rates[i])} = ${f(gps[i])} 円`])); }
      else { row[3] = hole(); items.push(num(`${hole()} ${n} の荒利率`, rates[i], '%', 1, [`${f(gps[i])} ÷ ${f(sales[i])} × 100 = ${f(rates[i], 1)} %`])); }
      rows.push(row);
    });
    const gpAll = gps.reduce((a, b) => a + b, 0), rawAll = gpAll / total * 100, all = rnd(rawAll, 1);
    const eNo = items.length;
    items.push(num(`${circled(eNo)} E の売上高`, E, '円', 0, [`${f(total)} − ( ${sales.slice(0, 4).map((x) => f(x)).join(' + ')} ) = ${f(E)} 円`]));
    items.push(num(`${circled(eNo + 1)} E の荒利率`, rates[4], '%', 1, [`${f(gps[4])} ÷ ${f(E)} × 100 = ${f(rates[4], 1)} %`]));
    items.push(num(`${circled(eNo + 2)} 全体の荒利率`, all, '%', 1, [`荒利金額合計　${gps.map((x) => f(x)).join(' + ')} = ${f(gpAll)} 円`, `${f(gpAll)} ÷ ${f(total)} × 100 = ${f(rawAll)} → ${f(all, 1)} %`]));
    rows.push(['合計', f(total), '', circled(eNo + 2)]);
    return { text: '次の表の空欄を埋め、全体の荒利率を求めなさい。', rule: RULE.r1, table: { head: ['', '売上高(円)', '荒利金額(円)', '荒利率'], rows }, items };
  } });

  // 第4回 問3 歩留まりを考慮した原価
  TRAINEE.push({ id: 't4-3', name: '歩留まりを考慮した原価・歩留まり率', gen() {
    const items = [];
    const a = (label, food, P, m, y) => { const raw = P * (1 - m / 100) * (y / 100), x = rnd(raw);
      return num(`${label} ${food}の原価は 1 kg 当たりいくらまでならいいか`, x * 10, '円', 0, [`100g当たりの原価を x とすると　x = ${P} × ( 1 − ${r2(m)} ) × ${f(y / 100)}`, `x = ${f(raw)} → ${f(x)} 円`, `1 kg 当たりの原価　${f(x)} × 10 = ${f(x * 10)} 円`],
        { rule: RULE.r0, pre: `${label} ${food}を 100 g 当たり ${P} 円で販売して値入率 ${m} %以上を確保したい。歩留まり率は ${y} %とする。` }); };
    items.push(a('①', pick(['かぼちゃの煮物', '里芋の煮物', '筑前煮']), S(150, 300, 10) - 2, R(55, 70), R(80, 95)));
    items.push(a('②', pick(['ぶりの切り身', 'さけの切り身', 'たらの切り身']), S(150, 350, 10), R(30, 40), R(38, 55)));
    let C, P, m, raw; do { C = S(1500, 3500, 10); m = R(30, 45); P = S(Math.ceil(C / 10 / (1 - m / 100)), Math.ceil(C / 10 / (1 - m / 100) / 0.75), 10) - 2; raw = (C / 10) / (P * (1 - m / 100)); } while (raw < 0.7 || raw > 0.99);
    const y3 = rnd(raw, 3);
    items.push(num('③ 歩留まり率を何 %にしなければならないか', rnd(y3 * 100, 1), '%', 1, [`100 g 当たりの原価は ${f(C)} ÷ 1,000 × 100 = ${f(C / 10)} 円`, `歩留まり率を x とすると　${P} = ${f(C / 10)} ÷ x ÷ ( 1 − ${r2(m)} )`, `x = ${f(raw)} → ${f(y3, 3)}`, `歩留まり率　${f(y3, 3)} × 100 = ${f(y3 * 100, 1)} %`],
      { rule: RULE.r1, pre: `③ 原価 ${f(C)} 円（1 kg 当たり）の肉を商品化し、100 g 当たり売価 ${P} 円で値入率 ${m} %を確保したい。` }));
    return { text: '次の問いに答えなさい。', items };
  } });

  // 第4回 問4 PI値
  TRAINEE.push({ id: 't4-4', name: 'PI値', gen() {
    const p = pick([198, 248, 298, 398]), N = S(1500, 4000, 10), pi = S(80, 300, 5), qty = rnd(N * pi / 1000);
    const N2 = N - S(50, 300, 10), q2 = R(Math.floor(N2 * pi / 1000 * 0.85), Math.floor(N2 * pi / 1000 * 1.1)), rawPi = q2 / N2 * 1000, pi2 = rnd(rawPi);
    const N3 = S(1000, 2500, 10), q3 = R(40, 200), p3 = pick([298, 398, 498, 598]), rawQ = q3 / N3 * 1000, qp = rnd(rawQ), amt = p3 * q3, rawA = amt / N3 * 1000, ap = rnd(rawA);
    return { text: '次の問いに答えなさい。', items: [
      num('(1) この商品はどのくらいの数量を仕入れればいいか', qty, '個', 0, [`${f(N)} × ${pi} ÷ 1,000 = ${f(N * pi / 1000)}${isInt(N * pi / 1000) ? '' : ' → ' + f(qty)} 個`],
        { rule: '小数点以下四捨五入', pre: `① ある商品が特売で ${p} 円で販売される。前回の特売の際は早期に欠品してしまった。当日の客数予測は ${f(N)} 人、数量PI値は 1,000 人当たり ${pi} と見込んだ。` }),
      num(`(2) 実際の当日の客数は ${f(N2)} 人、販売数量は ${q2} パックだった。この時の数量PI値はいくらか`, pi2, '', 0, [`${q2} ÷ ${f(N2)} × 1,000 = ${f(rawPi)} → ${pi2}`], { rule: '小数点以下四捨五入' }),
      num('数量PI値', qp, '', 0, [`${q3} ÷ ${f(N3)} × 1,000 = ${f(rawQ)} → ${qp}`],
        { rule: '小数点以下四捨五入', pre: `② 本日の店舗客数は ${f(N3)} 人、豚ロースしゃぶしゃぶ用の販売数は ${q3} パックで売価は ${p3} 円だった。数量PI値と金額PI値はそれぞれいくらになるか。` }),
      num('金額PI値', ap, '', 0, [`販売金額合計　${p3} × ${q3} = ${f(amt)} 円`, `${f(amt)} ÷ ${f(N3)} × 1,000 = ${f(rawA)} → ${f(ap)}`], { rule: '小数点以下四捨五入' }),
    ] };
  } });

  // 第5回 問1 カツオ・キウイ
  TRAINEE.push({ id: 't5-1', name: '丸魚の尾数とケース仕入の荒利', gen() {
    const items = [];
    { const P = S(150, 350, 10) - 2, T = S(100000, 300000, 10000), m = pick([35, 40, 45]), y = R(38, 50), W = pick([1.2, 1.5, 1.6, 2, 2.5]);
      const net = W * 1000 * y / 100, rawPrice = P * net / 100, price = rnd(rawPrice), rawN = T / price, n = up(rawN), tot = T * (1 - m / 100), rawC = tot / n, c = rnd(rawC);
      const pre = `① カツオを 100 g 当たり ${P} 円で販売し ${f(T)} 円の売上をつくりたい。値入率は ${m} %、歩留まり率は ${y} %である（1尾 ${W} kg）。`;
      items.push(num('(1) カツオは何尾必要か', n, '尾', 0, [`1尾の正味重量　${f(W * 1000)} × ${f(y / 100)} = ${f(net)} g`, `1尾分の売価　${P} × ${f(net / 100)} = ${f(rawPrice)} → ${f(price)} 円`, `${f(T)} ÷ ${f(price)} = ${f(rawN)} → ${n} 尾（端数は切り上げ）`], { rule: '円未満四捨五入（尾数は切り上げ）', pre }));
      items.push(num('(2) 1尾当たりの仕入原価はいくらか', c, '円', 0, [`売上達成に必要な原価合計　${f(T)} × ( 1 − ${r2(m)} ) = ${f(tot)} 円`, `${f(tot)} ÷ ${n} = ${f(rawC)} → ${f(c)} 円`], { rule: RULE.r0 }));
    }
    { let q, C, m, k, P, r, units, uc, sales, gp, rawR, rr;
      do { q = pick([25, 28, 30, 33, 36]); C = R(8, 25); m = pick([20, 25, 30]); k = pick([3, 4, 5]); P = S(198, 498, 50) - 2; r = R(6, 40);
        units = q * C - r; uc = rnd(P * (1 - m / 100) / k, 1); sales = P * units / k; gp = rnd(sales - uc * q * C, 1); rawR = gp / sales * 100; rr = rnd(rawR, 1);
      } while (units % k || gp <= 0);
      const pre = `② 1c/s ${q} 個入りのキウイフルーツを ${C} c/s 仕入れた。値入率 ${m} %で ${k} 個 ${P} 円で販売した。販売中に ${r} 個傷んでいるのを見つけ廃棄処分し、残りは売り切った。`;
      items.push(num('(1) 1個当たりの原価金額はいくらか', uc, '円', 1, [`${k} 個 ${P} 円の原価　${P} × ( 1 − ${r2(m)} ) = ${f(P * (1 - m / 100))} 円`, `1個当たり　${f(P * (1 - m / 100))} ÷ ${k} = ${f(P * (1 - m / 100) / k)} → ${f(uc, 1)} 円`], { rule: RULE.r1, pre }));
      items.push(num('(2) 売上高はいくらか', sales, '円', 1, [`販売した総数量　${q} × ${C} − ${r} = ${f(units)} 個`, `${P} × ( ${f(units)} ÷ ${k} ) = ${f(sales)} 円`], { rule: RULE.r1 }));
      items.push(num('(3) 荒利金額はいくらか', gp, '円', 1, [`原価合計　${f(uc, 1)} × ${f(q * C)} = ${f(rnd(uc * q * C, 1))} 円`, `荒利金額　${f(sales)} − ${f(rnd(uc * q * C, 1))} = ${f(gp)} 円`], { rule: RULE.r1 }));
      items.push(num('(4) 荒利率は何 %か', rr, '%', 1, [`${f(gp)} ÷ ${f(sales)} × 100 = ${f(rawR)} → ${f(rr, 1)} %`], { rule: RULE.r1 }));
    }
    return { text: '次の問いに答えなさい。', items };
  } });

  // 第5回 問2 寿司・トンカツ
  TRAINEE.push({ id: 't5-2', name: '消耗品込み原価と付け合わせ量', gen() {
    const items = [];
    { const c = S(300, 700, 10), s = S(30, 100, 10), base = c + s, m = R(55, 70), rawP = base / (1 - m / 100), P = rnd(rawP);
      const P2 = S(Math.ceil(base * 1.6), Math.ceil(base * 2.4), 10), rawR = (P2 - base) / P2 * 100, rr = rnd(rawR, 1);
      const m3 = R(45, 60); let P3; do { P3 = S(Math.ceil(base * 1.1), Math.ceil(base * 2), 10); } while (rnd(P3 * (1 - m3 / 100)) - s <= 0);
      const t3 = rnd(P3 * (1 - m3 / 100)), lim = t3 - s;
      const pre = `① 原価 ${c} 円の握り寿司には、消耗品（醤油やわさび、トレーなど）で別途 ${s} 円の費用が掛かる。`;
      items.push(num(`(1) 消耗品を商品原価に含めて、値入率 ${m} %で販売するときの売価はいくらか`, P, '円', 0, [`原価合計　${c} + ${s} = ${base} 円`, `${base} ÷ ( 1 − ${r2(m)} ) = ${f(rawP)}${isInt(rawP) ? '' : ' → ' + f(P)} 円`], { rule: RULE.r0, pre }));
      items.push(num(`(2) 消耗品を商品原価に含めて、${f(P2)} 円で販売するときの値入率は何 %か`, rr, '%', 1, [`( ${f(P2)} − ${base} ) ÷ ${f(P2)} × 100 = ${f(rawR)}${isInt(rawR * 10) ? '' : ' → ' + f(rr, 1)} %`], { rule: RULE.r1 }));
      items.push(num(`(3) 消耗品を商品原価に含めて ${f(P3)} 円で販売し、値入率 ${m3} %を確保するとき、寿司自体にいくらまで使えるか`, lim, '円', 0, [`原価　${f(P3)} × ( 1 − ${r2(m3)} ) = ${f(P3 * (1 - m3 / 100))}${isInt(P3 * (1 - m3 / 100)) ? '' : ' → ' + f(t3)} 円`, `消耗品を除いた原価　${f(t3)} − ${s} = ${f(lim)} 円`], { rule: RULE.r0 }));
    }
    { let P, m, ck, g0, K, target, other, allow, grams;
      do { P = S(250, 500, 10); m = R(35, 50); ck = S(150, 400, 10); g0 = S(80, 150, 10); target = P * (1 - m / 100);
        allow = S(Math.ceil(ck / 1000 * 30), Math.floor(ck / 1000 * (g0 - 10)), 1); other = target - allow; K = other + ck * g0 / 1000; grams = allow / (ck / 1000);
      } while (!isInt(target) || !isInt(K) || !isInt(grams) || other <= 0 || grams >= g0);
      items.push(num('1パック当たりのキャベツの量を何 g にすればよいか', grams, 'g', 0, [
        `売価 ${P} 円の時の原価　${P} × ( 1 − ${r2(m)} ) = ${f(target)} 円`, `キャベツを除いた原価　${f(K)} − ( ${ck} ÷ 1,000 × ${g0} ) = ${f(other)} 円`,
        `キャベツ分の原価　${f(target)} − ${f(other)} = ${f(allow)} 円`, `キャベツ1 g の原価　${ck} ÷ 1,000 = ${f(ck / 1000)} 円`, `必要なキャベツの g 数　${f(allow)} ÷ ${f(ck / 1000)} = ${f(grams)} g`],
        { pre: `② トンカツ1枚、売価 ${P} 円の販売に際して、1パック当たりキャベツ千切り ${g0} g（千切りの原価 1 kg 当たり ${ck} 円）をはじめ、消耗品を含んだ商品原価は ${f(K)} 円である。売価 ${P} 円で値入率 ${m} %を確保したい。` }));
    }
    return { text: '次の問いに答えなさい。', items };
  } });

  // 第5回 問3 売上原価
  TRAINEE.push({ id: 't5-3', name: '売上原価・荒利金額・ロス高', gen() {
    const items = [];
    { let oc, pc, ec, g, cogs, rawS, s; do { oc = R(400, 1200); pc = R(2000, 5000); ec = R(300, 1000); g = R(20, 32); cogs = oc + pc - ec; rawS = cogs / (1 - g / 100); s = rnd(rawS); } while (cogs <= 0);
      const alt = rnd(s * g / 100);
      const pre = `① 先月の月初原価在庫高は ${f(oc)} 千円、当月仕入原価は ${f(pc)} 千円、月末原価在庫高は ${f(ec)} 千円、荒利率は ${g} %だった。不明ロスや売価変更はなかったこととする。`;
      items.push(num('売上金額はいくらか', s, '千円', 0, [`売上原価　${f(oc)} + ${f(pc)} − ${f(ec)} = ${f(cogs)} 千円`, `${f(cogs)} ÷ ( 1 − ${r2(g)} ) = ${f(rawS)} → ${f(s)} 千円`], { rule: '小数点以下四捨五入', pre }));
      items.push(num('荒利金額はいくらか', s - cogs, '千円', 0, [`${f(s)} − ${f(cogs)} = ${f(s - cogs)} 千円`, `（ ${f(s)} × ${r2(g)} = ${f(s * g / 100)} → ${f(alt)} 千円でも可）`], { rule: '小数点以下四捨五入', alt: [alt] }));
    }
    { const o = R(500, 1200), pIn = R(4000, 8000), chg = R(100, 300), loss = R(20, 120), e = R(500, 1100), s = o + pIn - chg - loss - e;
      items.push(num('ロス高はいくらか', loss, '千円', 0, [`${f(o)} + ${f(pIn)} − ${f(s)} − ${f(chg)} − ${f(e)} = ${f(loss)} 千円`],
        { pre: `② 月初売価在庫高 ${f(o)} 千円、月間仕入売価 ${f(pIn)} 千円、月間売上高 ${f(s)} 千円、売価変更高 ${f(chg)} 千円、月末売価在庫高 ${f(e)} 千円のとき、` })); }
    { let s, oc, pc, ec, cogs; do { s = S(5000, 12000, 100); oc = S(2000, 5000, 10); pc = S(4000, 9000, 10); ec = S(2000, 5000, 10); cogs = oc + pc - ec; } while (cogs <= s * 0.6 || cogs >= s * 0.85);
      const pre = `③ 売上高 ${f(s)} 千円、月初原価在庫高 ${f(oc)} 千円、月間仕入原価 ${f(pc)} 千円、月末原価在庫高 ${f(ec)} 千円の時、`;
      items.push(num('売上原価はいくらか', cogs, '千円', 0, [`${f(oc)} + ${f(pc)} − ${f(ec)} = ${f(cogs)} 千円`], { pre }));
      items.push(num('荒利金額はいくらか', s - cogs, '千円', 0, [`${f(s)} − ${f(cogs)} = ${f(s - cogs)} 千円`]));
    }
    return { text: '次の問いに答えなさい。', items };
  } });

  // 第5回 問4 バラ売り・併売
  TRAINEE.push({ id: 't5-4', name: 'バラ売りの売価と併売の数量', gen() {
    const items = [];
    { let N, X, n1, P, m, per, rawT, T, need, rawB, b;
      do { N = S(60, 200, 10); per = R(180, 320); X = per * N; n1 = R(Math.floor(N * 0.7), Math.floor(N * 0.9)); P = S(per * 1.05, per * 1.3, 10) - 2; m = R(12, 25);
        rawT = X / (1 - m / 100); T = rnd(rawT); need = T - P * n1; rawB = need / ((N - n1) * 3); b = up(rawB);
      } while (need <= 0 || b <= 0);
      items.push(num('バラ販売の1個売価はいくらにすればいいか', b, '円', 0, [`1パック原価　${f(X)} ÷ ${N} = ${f(per)} 円`, `値入率 ${m} %の全体売価　${f(X)} ÷ ( 1 − ${r2(m)} ) = ${f(rawT)} → ${f(T)} 円`, `バラ売りで必要な売上　${f(T)} − ( ${P} × ${n1} ) = ${f(need)} 円`, `${f(need)} ÷ ${N - n1} ÷ 3 = ${f(rawB)} → ${f(b)} 円`],
        { rule: '計算過程及び答えは円未満切り上げ', pre: `① 3食パックのレトルトカレーを ${N} パック ${f(X)} 円で仕入れ、${n1} パックはそのまま1パック ${P} 円で販売し、残りはバラして1食単位で販売する。全体の値入率は ${m} %確保したい。` }));
    }
    { let p, w, fish, ck, uc, T, nf, cs, m2, P2, rb, G, x, y, nb, ns;
      do { p = pick([98, 128, 148, 198, 248]); w = pick([3, 4, 5]); fish = pick([12, 15, 18, 20, 24]); ck = S(300, 1000, 10); uc = up(ck * w / fish);
        T = S(20000, 60000, 1000); nf = up(T / p); cs = up(nf / fish); m2 = pick([35, 40, 45]); P2 = pick([298, 398, 498]);
        rb = rnd((p - uc) / p * 100, 1); G = Math.ceil(rb) + R(0, 3); x = rnd((m2 - G) / (m2 - rb) * 100, 1); y = rnd(100 - x, 1);
        nb = up(T * x / 100 / p); ns = up(T * y / 100 / P2);
      } while (rb <= 5 || G >= m2 - 2 || G <= rb || y <= 0.5);
      const pre = `② アジを1尾 ${p} 円で販売する。アジ ${w} kg ${fish} 尾入りで原価 ${f(ck)} 円/kg。`;
      items.push(num('(1) 1尾原価はいくらか', uc, '円', 0, [`${f(ck)} × ${w} ÷ ${fish} = ${f(ck * w / fish)}${isInt(ck * w / fish) ? '' : ' → ' + f(uc)} 円`], { rule: '％は小数点第2位を四捨五入、その他は小数点以下切り上げ', pre }));
      items.push(num(`(2) 売上目標は ${f(T)} 円である。バラ売りだけをした場合、何ケース必要か`, cs, 'ケース', 0, [`売上に必要な尾数　${f(T)} ÷ ${p} = ${f(T / p)} → ${nf} 尾`, `${nf} ÷ ${fish} = ${f(nf / fish)} → ${cs} ケース`]));
      const exp = [`バラ売りの値入率　( ${p} − ${uc} ) ÷ ${p} × 100 = ${f((p - uc) / p * 100)} → ${f(rb, 1)} %`, `売上構成比をバラ売り x %、刺身 y %とすると`, `x + y = 100、${f(rb, 1)} x + ${m2} y = ${G} × 100`, `x = ${f(x, 1)}　y = ${f(y, 1)}`];
      const pre3 = `(3) 荒利率目標は ${G} %である。刺身も併売することにした。刺身は値入率 ${m2} %で ${P2} 円で販売する。売上目標 ${f(T)} 円で目標を達成するためのバラ売りと刺身の数量はそれぞれいくつか。`;
      items.push(num('バラ売りの数量', nb, '尾', 0, exp.concat([`バラ売り　${f(T)} × ${f(x / 100)} ÷ ${p} = ${f(T * x / 100 / p)} → ${nb} 尾`]), { pre: pre3 }));
      items.push(num('刺身の数量', ns, 'パック', 0, [`刺身　${f(T)} × ${f(y / 100)} ÷ ${P2} = ${f(T * y / 100 / P2)} → ${ns} パック`]));
    }
    return { text: '次の問いに答えなさい。', items };
  } });

  // ================================================================
  // 登用試験 計数（基礎計数の形式）
  // ================================================================
  const TOYO = [];

  TOYO.push({ id: 'k-formula', name: '基本公式', gen() {
    const F = [
      ['売上高', ['客数', '客単価']], ['客数', ['入店客数', '買上率']], ['客単価', ['1品単価', '1人平均買上点数']],
      ['入店客数', ['通行客数', '入店率']], ['値入高', ['売価', '原価'], '−'], ['荒利高', ['売上高', '売上原価'], '−'],
    ];
    const pool = ['客数', '客単価', '入店客数', '買上率', '1品単価', '1人平均買上点数', '通行客数', '入店率', '売価', '原価', '売上高', '売上原価', '買上点数', '荒利高', '値入高', '仕入原価'];
    const items = [];
    shuffle(F).forEach(([lhs, rhs, op]) => {
      const sign = op || '×';
      rhs.forEach((ans, i) => {
        const shown = rhs.map((r, j) => (j === i ? '（　？　）' : `（${r}）`)).join(` ${sign} `);
        const similar = (p) => p.includes(ans) || ans.includes(p) || rhs.some((r) => r.includes(p) || p.includes(r));
        const others = shuffle(pool.filter((p) => p !== ans && p !== lhs && !similar(p))).slice(0, 3);
        items.push(choice(`${lhs} ＝ ${shown}`, ans, [ans].concat(others), [`${lhs} ＝ ${rhs.join(` ${sign} `)}`]));
      });
    });
    [['値入率', '値入高', '売価'], ['荒利率', '荒利高', '売上高']].forEach(([lhs, top, ans]) => {
      const others = shuffle(pool.filter((p) => p !== ans && p !== top)).slice(0, 3);
      items.push(choice(`${lhs} ＝ ${top} ÷（　？　）× 100`, ans, [ans].concat(others), [`${lhs} ＝ ${top} ÷ ${ans} × 100`]));
    });
    return { text: '次の空欄にあてはまる語句を選びなさい。', items };
  } });

  TOYO.push({ id: 'k-dept', name: '部門別実績表', gen() {
    const depts = ['青果部門', '食肉部門', '水産部門', '惣菜部門', 'ベーカリー部門', 'デイリー部門', '加食部門', '住居関連部門', 'その他部門'];
    const pr = [[120, 180], [280, 360], [240, 320], [220, 300], [160, 220], [130, 180], [240, 300], [220, 300], [180, 240]];
    let rows, total, pts;
    do {
      rows = depts.map((d, i) => { let k, u; do { k = R(4, 70); u = R(pr[i][0], pr[i][1]); } while ((k * u) % 100); return { d, pts: k * 1000, u, s: k * u }; });
      total = rows.reduce((a, r) => a + r.s, 0); pts = rows.reduce((a, r) => a + r.pts, 0);
    } while (total < 40000 || total > 90000);
    rows.forEach((r) => { r.c = rnd(r.s / total, 3); });
    const avg = rnd(total * 1000 / pts, 1);
    const items = [];
    const twoHoles = R(0, rows.length - 1); // 過去問どおり空欄は計10個（1部門だけ2個）
    const tRows = rows.map((r, ri) => {
      const mode = ri === twoHoles ? pick(['cu', 'cp']) : pick(['c', 's', 'p', 'u']);
      const cell = { s: f(r.s), c: f(r.c * 100, 1), p: f(r.pts), u: f(r.u) };
      const add = (key) => {
        const no = circled(items.length);
        cell[key] = no;
        if (key === 's') items.push(num(`${no} ${r.d}の売上`, r.s, '千円', 0, [`${f(r.pts)} 点 × ${r.u} 円 ÷ 1,000 = ${f(r.s)} 千円`]));
        if (key === 'c') items.push(num(`${no} ${r.d}の構成比`, rnd(r.c * 100, 1), '%', 1, [`${f(r.s)} ÷ ${f(total)} × 100 = ${f(r.s / total * 100)} → ${f(r.c * 100, 1)} %`]));
        if (key === 'p') items.push(num(`${no} ${r.d}の買上点数`, r.pts, '点', 0, [`${f(r.s)} 千円 × 1,000 ÷ ${r.u} 円 = ${f(r.pts)} 点`]));
        if (key === 'u') items.push(num(`${no} ${r.d}の平均単価`, r.u, '円', 0, [`${f(r.s)} 千円 × 1,000 ÷ ${f(r.pts)} 点 = ${f(r.u)} 円`]));
      };
      mode.split('').forEach(add);
      return [r.d, cell.s, cell.c, cell.p, cell.u];
    });
    tRows.push(['合計', f(total), '100.0', f(pts), f(avg, 1)]);
    return { text: '次の表の空欄を求めなさい（構成比は％で小数点第2位を四捨五入）。', table: { head: ['部門名', '売上(千円)', '構成比(%)', '買上点数', '平均単価(円)'], rows: tRows }, items };
  } });

  TOYO.push({ id: 'k-store', name: '店舗の月間実績', gen() {
    let s, cust, pts, enter;
    do { cust = S(30000, 90000, 30); s = S(90000, 300000, 3000); pts = S(cust * 10, cust * 16, 1000); enter = S(cust * 1.2, cust * 1.7, 1000); } while (!isInt(s * 1000 / pts));
    const perDay = s / 30, custDay = cust / 30, rawPt = pts / cust, pt = rnd(rawPt, 1), unit = s * 1000 / pts;
    return { text: 'あるお店の1ヶ月の実績から次の問いに答えよ（1ヶ月は30日とする）。', table: { head: ['項目', '実績'], rows: [['売上高', `${f(s)} 千円`], ['入店客数', `${f(enter)} 人`], ['買上げ客数', `${f(cust)} 人`], ['買上げ総点数', `${f(pts)} 点`]] }, items: [
      num('① 1日当たりの平均売上高はいくらか', perDay, '千円', 0, [`${f(s)} 千円 ÷ 30 日 = ${f(perDay)} 千円`]),
      num('② 1日当たりの平均買上げ客数は何人か', custDay, '人', 0, [`${f(cust)} 人 ÷ 30 日 = ${f(custDay)} 人`]),
      num('③ 1人当たり買上げ点数は何点か', pt, '点', 1, [`${f(pts)} 点 ÷ ${f(cust)} 人 = ${f(rawPt)} → ${f(pt, 1)} 点`], { rule: RULE.r1 }),
      num('④ 平均1品単価はいくらか', unit, '円', 0, [`${f(s)} 千円 ÷ ${f(pts)} 点 = ${f(unit)} 円`]),
    ] };
  } });

  TOYO.push({ id: 'k-melon', name: '値入高・値入率', gen() {
    const item = pick(['メロン', 'すいか', 'ぶどう', '桃']);
    const C = S(300, 1500, 10), P = S(C * 1.2, C * 1.6, 10), rawR = (P - C) / P * 100, rr = rnd(rawR, 1);
    return { text: `${item}を1個 ${f(C)} 円で仕入れて ${f(P)} 円の価格を付けた。この時の値入高と値入率を求めよ。`, items: [
      num('値入高', P - C, '円', 0, [`${f(P)} 円 − ${f(C)} 円 = ${f(P - C)} 円`]),
      num('値入率', rr, '%', 1, [`${f(P - C)} ÷ ${f(P)} × 100 = ${f(rawR)}${isInt(rawR * 10) ? '' : ' → ' + f(rr, 1)} %`], { rule: RULE.r1 }),
    ] };
  } });

  TOYO.push({ id: 'k-eraser', name: '値入率から売価', gen() {
    let C, m, P; do { C = S(30, 400, 5); m = pick([20, 25, 30, 40, 50]); P = C / (1 - m / 100); } while (!isInt(P));
    const n = S(20, 200, 10), item = pick(['消しゴム', 'ボールペン', 'ノート', '洗剤']);
    return { text: `${item}を1個 ${C} 円で ${n} 個仕入れた。値入率 ${m} %を確保するには1個当たりいくらで販売すれば良いか。またその時の売価の合計はいくらになるか。`, items: [
      num('売価（1個）', P, '円', 0, [`${C} 円 ÷ ( 1 − ${r2(m)} ) = ${f(P)} 円`]),
      num('売価合計', P * n, '円', 0, [`${f(P)} 円 × ${n} 個 = ${f(P * n)} 円`]),
    ] };
  } });

  TOYO.push({ id: 'k-table', name: '値入の表', gen() {
    const names = ['Ａ', 'Ｂ', 'Ｃ', 'Ｄ', 'Ｅ'];
    const patterns = shuffle([['a', 'r', 'p'], ['c', 'm', 'p'], ['c', 'a', 'p'], ['c', 'm', 'r'], ['c', 'm', 'r']]);
    const items = [];
    const rows = names.map((n, i) => {
      let c, m, p, a; do { m = pick([10, 12.5, 15, 20, 25, 30, 35, 37.5, 40, 45, 50, 60]); p = S(500, 10000, 100); c = p * (1 - m / 100); a = p - c; } while (!isInt(c));
      const r = 100 - m; const given = patterns[i];
      const vals = { c: f(c), a: f(a), m: f(m, 1), r: f(r, 1), p: f(p) };
      const exps = {
        c: `仕入原価　${f(p)} − ${f(a)} = ${f(c)} 円`, a: `値入高　${f(p)} − ${f(c)} = ${f(a)} 円`, m: `値入率　${f(a)} ÷ ${f(p)} × 100 = ${f(m, 1)} %`,
        r: `原価率　${f(c)} ÷ ${f(p)} × 100 = ${f(r, 1)} %`, p: `仕入売価　${f(c)} ÷ ( 1 − ${f(m / 100)} ) = ${f(p)} 円`,
      };
      const label = { c: '仕入原価', a: '値入高', m: '値入率', r: '原価率', p: '仕入売価' };
      const unit = { c: '円', a: '円', m: '%', r: '%', p: '円' };
      ['c', 'a', 'm', 'r', 'p'].forEach((k) => {
        if (given.includes(k)) return;
        const no = circled(items.length);
        vals[k] = no;
        const v = { c, a, m, r, p }[k];
        items.push(num(`${no} 商品${n}の${label[k]}`, v, unit[k], unit[k] === '%' ? 1 : 0, [exps[k]]));
      });
      return [n, vals.c, vals.a, vals.m, vals.r, vals.p];
    });
    return { text: '次の表の空欄を埋めなさい（％は小数点第2位を四捨五入）。', table: { head: ['商品', '仕入原価(円)', '値入高(円)', '値入率(%)', '原価率(%)', '仕入売価(円)'], rows }, items };
  } });

  TOYO.push({ id: 'k-suika', name: '荒利高・荒利率', gen() {
    const item = pick(['すいか', 'キャベツ', '白菜', 'パイナップル']);
    const C = S(100, 800, 10), P = S(C * 1.2, C * 2, 10), rawR = (P - C) / P * 100, rr = rnd(rawR, 1);
    return { text: `1個 ${f(C)} 円で仕入れた${item}を ${f(P)} 円で販売した。この時の荒利高と荒利率を求めよ。`, rule: RULE.r1, items: [
      num('荒利高', P - C, '円', 0, [`${f(P)} 円 − ${f(C)} 円 = ${f(P - C)} 円`]),
      num('荒利率', rr, '%', 1, [`${f(P - C)} ÷ ${f(P)} × 100 = ${f(rawR)}${isInt(rawR * 10) ? '' : ' → ' + f(rr, 1)} %`]),
    ] };
  } });

  TOYO.push({ id: 'k-juice', name: '荒利率から荒利高・原価', gen() {
    let n, s, g, gp, c; do { n = S(20, 120, 10); s = S(3000, 20000, 100); g = pick([15, 20, 25, 30]); gp = s * g / 100; c = (s - gp) / n; } while (!isInt(gp) || !isInt(c));
    const item = pick(['ジュース', 'お茶', '牛乳', 'ヨーグルト']);
    return { text: `${item}を ${n} 本販売し ${f(s)} 円の売上高であった。荒利率が ${g} %であった場合の合計の荒利高と1本当たりの仕入原価はいくらか。`, items: [
      num('荒利高（合計）', gp, '円', 0, [`${f(s)} × ${r2(g)} = ${f(gp)} 円`]),
      num('仕入原価（1本）', c, '円', 0, [`( ${f(s)} − ${f(gp)} ) ÷ ${n} = ${f(c)} 円`]),
    ] };
  } });

  TOYO.push({ id: 'k-tofu', name: '値下率・廃棄率・売変率', gen() {
    const item = pick(['豆腐', '油揚げ', '納豆', 'もやし']);
    let c, N, p, n1, p2, n2, w, s, md, wd;
    do { c = R(20, 80); N = S(15, 40, 1); p = S(c * 1.4, c * 2, 10); n1 = R(Math.floor(N * 0.4), Math.floor(N * 0.7)); p2 = S(p * 0.6, p * 0.9, 10); n2 = R(1, N - n1 - 1); w = N - n1 - n2; s = p * n1 + p2 * n2; md = (p - p2) * n2; wd = p * w; } while (w < 1 || p2 >= p);
    const pct = (x) => { const raw = x / s * 100; return [raw, rnd(raw, 1)]; };
    const [rm, am] = pct(md), [rw, aw] = pct(wd), [rc, ac] = pct(md + wd);
    return { text: `原価 ${c} 円の${item}を ${N} 個仕入れ、1個 ${p} 円で販売した。${p} 円の売価で ${n1} 個売れたが、${N - n1} 個残り ${p2} 円に値下げしたら ${n2} 個売れ、残りは販売期限が切れたために ${w} 個廃棄した。`, rule: RULE.r1, items: [
      num('① 売上高', s, '円', 0, [`( ${p} × ${n1} ) + ( ${p2} × ${n2} ) = ${f(s)} 円`]),
      num('② 値下高', md, '円', 0, [`( ${p} − ${p2} ) × ${n2} = ${f(md)} 円`]),
      num('③ 値下率', am, '%', 1, [`${f(md)} ÷ ${f(s)} × 100 = ${f(rm)} → ${f(am, 1)} %`]),
      num('④ 廃棄高', wd, '円', 0, [`${p} × ${w} = ${f(wd)} 円`]),
      num('⑤ 廃棄率', aw, '%', 1, [`${f(wd)} ÷ ${f(s)} × 100 = ${f(rw)} → ${f(aw, 1)} %`]),
      num('⑥ 売変高', md + wd, '円', 0, [`${f(md)} + ${f(wd)} = ${f(md + wd)} 円`]),
      num('⑦ 売変率', ac, '%', 1, [`${f(md + wd)} ÷ ${f(s)} × 100 = ${f(rc)} → ${f(ac, 1)} %`]),
    ] };
  } });

  TOYO.push({ id: 'k-loss', name: '値入・値下・廃棄・荒利', gen() {
    let c, N, p, left, p2, n2, w, s, md, wd, gp;
    do { c = R(30, 300); N = S(50, 200, 10); p = S(c * 1.3, c * 1.8, 10); left = R(Math.floor(N * 0.05), Math.floor(N * 0.25)); p2 = S(p * 0.5, p * 0.85, 1); n2 = R(1, left - 1); w = left - n2;
      s = p * (N - left) + p2 * n2; md = (p - p2) * n2; wd = p * w; gp = s - c * N; } while (w < 1 || gp <= 0 || left < 3);
    const mr = rnd((p - c) / p * 100, 1), rawL = (md + wd) / s * 100, L = rnd(rawL, 1), rawG = gp / s * 100, G = rnd(rawG, 1);
    return { text: `原価が1個 ${c} 円の商品を ${N} 個仕入れ、1個 ${p} 円で販売した。夕方には ${left} 個残っていたので ${p2} 円に値下げした。${n2} 個は売れたが、残りは商品価値がなくなり廃棄した。金額は1個当たりではなく合計金額を求めよ。`, rule: RULE.r1, items: [
      num('(1) 値入高', (p - c) * N, '円', 0, [`( ${p} − ${c} ) × ${N} = ${f((p - c) * N)} 円`]),
      num('(2) 値入率', mr, '%', 1, [`( ${p} − ${c} ) ÷ ${p} × 100 = ${f((p - c) / p * 100)}${isInt((p - c) / p * 1000) ? '' : ' → ' + f(mr, 1)} %`]),
      num('(3) 値下高', md, '円', 0, [`( ${p} − ${p2} ) × ${n2} = ${f(md)} 円`]),
      num('(4) 廃棄高', wd, '円', 0, [`${p} × ${w} = ${f(wd)} 円`]),
      num('(5) 売上高', s, '円', 0, [`( ${p} × ${N - left} ) + ( ${p2} × ${n2} ) = ${f(s)} 円`]),
      num('(6) ロス率', L, '%', 1, [`${f(md)} + ${f(wd)} = ${f(md + wd)} 円`, `${f(md + wd)} ÷ ${f(s)} × 100 = ${f(rawL)} → ${f(L, 1)} %`]),
      num('(7) 荒利高', gp, '円', 0, [`${f(s)} − ( ${c} × ${N} ) = ${f(gp)} 円`]),
      num('(8) 荒利率', G, '%', 1, [`${f(gp)} ÷ ${f(s)} × 100 = ${f(rawG)} → ${f(G, 1)} %`]),
    ] };
  } });

  TOYO.push({ id: 'k-pork', name: 'kg単価と100g売価', gen() {
    let kg, X; do { kg = R(5, 20); X = S(kg * 400, kg * 2000, 10); } while (!isInt(X / kg));
    const c = X / kg, m = pick([25, 30, 35, 40]), raw = c / (1 - m / 100) / 10, P = up(raw);
    const meat = pick(['豚肉', '牛肉', '鶏肉']);
    return { text: `${meat}を ${kg} kg 仕入れたら、仕入金額は ${f(X)} 円だった。`, items: [
      num('(1) 1 kg 当たりの原価はいくらか', c, '円', 0, [`${f(X)} ÷ ${kg} = ${f(c)} 円`]),
      num(`(2) 値入率 ${m} %を確保して販売したい場合の、100 g 当たりの売価はいくらか`, P, '円', 0, [`${f(c)} ÷ ( 1 − ${r2(m)} ) = ${f(c / (1 - m / 100))} 円（1 kg 当たり）`, `${f(c / (1 - m / 100))} ÷ 10 = ${f(raw)} → ${f(P)} 円（値入率を下回らないよう円未満切り上げ）`], { rule: RULE.u0 }),
    ] };
  } });

  // ---------- 出題 ----------
  function build(list) {
    return list.map((t, i) => {
      const p = t.gen();
      return Object.assign({ id: t.id, no: i + 1, name: t.name }, p);
    });
  }
  const makeToyo = () => build(TOYO);
  const makeTrainee = () => build(shuffle(TRAINEE).slice(0, 4));

  // 採点：数値入力を正規化して小数桁で比較
  function parseNum(s) {
    if (s == null) return null;
    const t = String(s).normalize('NFKC').replace(/[,，円%％gｇ個本尾人点件千]/g, '').replace(/[−ー―‐]/g, '-').trim();
    if (!t || !/^-?\d*\.?\d+$/.test(t)) return null;
    return Number(t);
  }
  function checkNum(item, input) {
    const v = parseNum(input);
    if (v === null) return false;
    const tol = 0.5 / p10(item.dec || 0) + EPS;
    return [item.ans].concat(item.alt || []).some((a) => Math.abs(v - a) < tol && Math.abs(rnd(v, item.dec || 0) - a) < EPS * 10);
  }

  global.Keisu = { makeToyo, makeTrainee, checkNum, parseNum, TRAINEE, TOYO, fmt: f };
})(typeof window !== 'undefined' ? window : globalThis);
