.catalog-section { padding: 26px 0 98px; }.catalog-toolbar {
      position: sticky;
      top: 94px;
      z-index: 20;
      margin-bottom: 26px;
      padding: 18px;
      display: grid;
      grid-template-columns: minmax(220px, 1fr) auto;
      gap: 18px;
      align-items: center;
      border: 1px solid var(--line);
      border-radius: 24px;
      background: rgba(10,8,16,.72);
      backdrop-filter: blur(24px) saturate(135%);
      box-shadow: 0 20px 62px rgba(0,0,0,.26), inset 0 1px rgba(255,255,255,.035);
    }.toolbar-title h2 { margin: 0; font-size: clamp(31px, 4vw, 46px); letter-spacing: -.055em; }.toolbar-title p { margin: 7px 0 0; color: var(--muted); font-size: 13px; }.controls { display: flex; align-items: center; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }.search {
      width: min(320px, 100%);
      min-height: 46px;
      padding: 11px 15px;
      outline: none;
      color: #fff;
      border: 1px solid var(--line);
      border-radius: 15px;
      background: rgba(255,255,255,.045);
      transition: border-color .25s ease, box-shadow .25s ease, background .25s ease;
    }.search:focus { border-color: rgba(145,71,255,.6); box-shadow: 0 0 0 5px rgba(145,71,255,.08); background: rgba(255,255,255,.06); }.filters { display: flex; gap: 7px; flex-wrap: wrap; }.filter-btn {
      min-height: 44px;
      padding: 9px 13px;
      border: 1px solid var(--line);
      border-radius: 14px;
      color: #c9c3d1;
      background: rgba(255,255,255,.035);
      font-size: 12px;
      font-weight: 900;
      transition: transform .22s var(--ease), border-color .22s ease, background .22s ease, color .22s ease;
    }.filter-btn:hover { transform: translateY(-3px); border-color: rgba(255,255,255,.2); color: #fff; }.filter-btn.active { color: #fff; border-color: rgba(145,71,255,.4); background: linear-gradient(135deg, rgba(145,71,255,.18), rgba(155,99,255,.1)); box-shadow: inset 0 1px rgba(255,255,255,.05); }.catalog-stream { display: grid; gap: 52px; }.catalog-group { display: grid; gap: 18px; }.group-head {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 18px;
      padding: 0 4px;
    }.group-kicker {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      margin-bottom: 8px;
      color: #c7a8ff;
      font-size: 10px;
      font-weight: 950;
      letter-spacing: .17em;
      text-transform: uppercase;
    }.group-kicker::before {
      content: "";
      width: 24px;
      height: 2px;
      border-radius: 999px;
      background: linear-gradient(90deg, var(--red), var(--orange));
      box-shadow: 0 0 14px rgba(145,71,255,.55);
    }.catalog-group[data-group="released"] .group-kicker { color: #8ff4bd; }.catalog-group[data-group="released"] .group-kicker::before { background: var(--green); box-shadow: 0 0 14px rgba(93,229,165,.4); }.catalog-group[data-group="unknown"] .group-kicker { color: #bdb5ca; }.catalog-group[data-group="unknown"] .group-kicker::before { background: #877f93; box-shadow: none; }.group-head h3 { margin: 0; font-size: clamp(28px, 4vw, 42px); line-height: .98; letter-spacing: -.055em; }.group-head p { max-width: 580px; margin: 8px 0 0; color: var(--muted); line-height: 1.55; font-size: 13px; }.group-count {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      min-height: 38px;
      padding: 8px 12px;
      border: 1px solid var(--line);
      border-radius: 999px;
      color: #ddd7e5;
      background: rgba(255,255,255,.035);
      font-size: 11px;
      font-weight: 950;
    }.section-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 22px;
      perspective: 1300px;
    }.game-card {
      --rx: 0deg;
      --ry: 0deg;
      --lift: 0px;
      position: relative;
      overflow: hidden;
      min-height: 390px;
      aspect-ratio: 16 / 11;
      border: 1px solid var(--line);
      border-radius: 28px;
      color: #fff;
      background: #120d19;
      box-shadow: 0 20px 58px rgba(0,0,0,.34);
      cursor: pointer;
      isolation: isolate;
      opacity: 0;
      transform: translateY(46px) rotateX(var(--rx)) rotateY(var(--ry));
      transform-style: preserve-3d;
      transition: opacity .8s var(--ease), transform .8s var(--ease), border-color .32s ease, box-shadow .32s ease;
      transition-delay: 0ms;
      will-change: transform, opacity;
      outline: none;
    }.game-card.featured { grid-column: span 2; aspect-ratio: 16 / 7.2; }.game-card.is-visible { opacity: 1; transform: translateY(var(--lift)) rotateX(var(--rx)) rotateY(var(--ry)); }.game-card.tilt-ready {
      transition: opacity .8s var(--ease), transform .14s ease-out, border-color .32s ease, box-shadow .32s ease;
      transition-delay: 0ms;
    }.game-card:hover,
    .game-card:focus-visible {
      --lift: -9px;
      border-color: rgba(145,71,255,.38);
      box-shadow: 0 34px 88px rgba(0,0,0,.52), 0 0 0 1px rgba(145,71,255,.065);
    }.game-card:focus-visible { box-shadow: 0 0 0 4px rgba(145,71,255,.22), 0 34px 88px rgba(0,0,0,.52); }.game-card::before {
      content: "";
      position: absolute;
      inset: 0;
      z-index: 5;
      pointer-events: none;
      border-radius: inherit;
      background: radial-gradient(520px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,.13), transparent 42%);
      opacity: 0;
      transition: opacity .3s ease;
    }.game-card:hover::before { opacity: 1; }.card-visual { position: absolute; inset: 0; z-index: -3; overflow: hidden; background: linear-gradient(135deg, #2b2134, #101018); }.card-visual img { width: 100%; height: 100%; display: block; object-fit: cover; transition: transform .8s var(--ease), filter .8s ease; }.game-card:hover .card-visual img,
    .game-card:focus-visible .card-visual img { transform: scale(1.07); filter: saturate(1.12) contrast(1.05); }.card-visual .cover-fallback { width: 100%; height: 100%; display: grid; place-items: center; padding: 22px; color: rgba(255,255,255,.22); font-size: 34px; font-weight: 1000; text-align: center; }.card-shade {
      position: absolute;
      inset: 0;
      z-index: -2;
      pointer-events: none;
      background:
        linear-gradient(to top, rgba(4,3,8,.98) 0%, rgba(4,3,8,.82) 34%, rgba(4,3,8,.1) 76%),
        linear-gradient(135deg, rgba(145,71,255,.16), transparent 42%);
    }.card-top {
      position: absolute;
      inset: 15px 15px auto;
      z-index: 3;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      transform: translateZ(18px);
    }.card-index {
      flex: 0 0 auto;
      padding: 8px 9px;
      border: 1px solid rgba(255,255,255,.15);
      border-radius: 12px;
      color: rgba(255,255,255,.72);
      background: rgba(7,6,11,.52);
      backdrop-filter: blur(12px);
      font-size: 9px;
      font-weight: 950;
      letter-spacing: .14em;
    }.release-badge {
      max-width: calc(100% - 60px);
      padding: 9px 11px;
      border: 1px solid rgba(255,255,255,.16);
      border-radius: 13px;
      color: #fff;
      background: rgba(8,7,12,.72);
      backdrop-filter: blur(12px);
      font-size: 10px;
      font-weight: 950;
      letter-spacing: .04em;
      box-shadow: 0 12px 28px rgba(0,0,0,.3);
    }.release-badge.soon { background: linear-gradient(135deg, rgba(145,71,255,.96), rgba(191,148,255,.9)); border-color: transparent; animation: badgeGlow 2.8s ease-in-out infinite; }.release-badge.released { color: #c8ffe1; background: rgba(24,102,70,.84); }.release-badge.unknown { color: #d6d0e2; }@keyframes badgeGlow { 50% { box-shadow: 0 12px 34px rgba(145,71,255,.34); } }.card-bottom {
      position: absolute;
      inset: auto 0 0;
      z-index: 2;
      padding: 26px;
      transform: translateZ(14px);
    }.featured .card-bottom { max-width: 72%; padding: 34px; }.card-chips { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }.date-chip,
    .coop-badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      width: fit-content;
      padding: 8px 10px;
      border: 1px solid rgba(255,255,255,.16);
      border-radius: 12px;
      color: #ece7f2;
      background: rgba(8,7,12,.62);
      backdrop-filter: blur(12px);
      font-size: 10px;
      font-weight: 950;
      letter-spacing: .035em;
      text-transform: uppercase;
    }.coop-badge { border-color: rgba(93,229,165,.27); color: #caffe2; background: rgba(8,30,22,.58); }.coop-badge::before { content: "👥"; font-size: 12px; }.card-title { margin: 0; max-width: 94%; font-size: clamp(25px, 2.5vw, 34px); line-height: .98; letter-spacing: -.055em; text-wrap: balance; }.featured .card-title { font-size: clamp(34px, 4.2vw, 58px); }.card-summary {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
      max-width: 680px;
      margin: 12px 0 0;
      color: #cbc5d2;
      line-height: 1.55;
      font-size: 13px;
      opacity: .9;
    }.featured .card-summary { font-size: 15px; -webkit-line-clamp: 3; }.card-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 17px;
    }.card-open-hint,
    .steam-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 42px;
      padding: 10px 14px;
      border-radius: 13px;
      font-size: 11px;
      font-weight: 950;
      transition: transform .22s var(--ease), opacity .22s ease, background .22s ease;
    }.card-open-hint { color: #fff; background: linear-gradient(135deg, var(--red), #5c16c5); box-shadow: 0 12px 28px rgba(145,71,255,.2); }.steam-button {
      color: #e8e3ee;
      border: 1px solid rgba(255,255,255,.16);
      background: rgba(8,7,12,.62);
      backdrop-filter: blur(12px);
      opacity: 0;
      transform: translateY(8px);
    }.game-card:hover .steam-button,
    .game-card:focus-within .steam-button { opacity: 1; transform: translateY(0); }.card-open-hint:hover,
    .steam-button:hover { transform: translateY(-2px); }
