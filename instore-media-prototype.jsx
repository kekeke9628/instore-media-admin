import React, { useState, useMemo, useRef, useEffect } from "react";

// ────────────────────────────────────────────────────────────
// 여주 프리미엄 아울렛 · 점내 홍보매체 관리 시스템 · 프로토타입 v4
// ────────────────────────────────────────────────────────────

const DEFAULT_REF = "2026-07-29";
const DAY = 86400000;
const ALERT_DAYS = 3;
const LONG_OPEN = 365;

const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const days = (s, e) => (e ? Math.round((Date.parse(e) - Date.parse(s)) / DAY) + 1 : null);
const diffDays = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const md = (ms) => { const d = new Date(ms); return d.getUTCMonth() + 1 + "/" + d.getUTCDate(); };

// ── 매체 유형 ────────────────────────────────────────────────
const INIT_TYPES = [
  { code: "directory", label: "디렉토리",           spec: "1200×2400mm", faces: 1, color: "#3C6E9E", glyph: "▤", movable: false, openEnded: true,  active: true },
  { code: "ww_fixed",  label: "고정형 웨더워리어", spec: "900×1800mm",  faces: 2, color: "#4B7B58", glyph: "▮", movable: false, openEnded: false, active: true },
  { code: "ww_mobile", label: "이동형 웨더워리어", spec: "700×1600mm",  faces: 2, color: "#C2703D", glyph: "◇", movable: true,  openEnded: false, active: true },
  { code: "duratrans", label: "듀라트란스",         spec: "1030×1456mm", faces: 1, color: "#7A5AA6", glyph: "◫", movable: false, openEnded: false, active: true },
  { code: "fabric",    label: "패브릭홀더",         spec: "1500×2000mm", faces: 1, color: "#BE8A2E", glyph: "▭", movable: false, openEnded: false, active: true },
];
const COUNTS = { directory: 8, ww_fixed: 22, ww_mobile: 12, duratrans: 18, fabric: 14 };

// ── 구역 ─────────────────────────────────────────────────────
const ZONES = {
  WEST_HIGH:   { label: "WEST HIGH",   box: [4, 8, 44, 27] },
  WEST_MIDDLE: { label: "WEST MIDDLE", box: [4, 37, 44, 27] },
  WEST_LOW:    { label: "WEST LOW",    box: [4, 66, 44, 27] },
  EAST_HIGH:   { label: "EAST HIGH",   box: [52, 8, 44, 41] },
  EAST_LOW:    { label: "EAST LOW",    box: [52, 51, 44, 42] },
};
const ZONE_KEYS = Object.keys(ZONES);

const BRANDS = ["나이키", "아디다스", "룰루레몬", "폴로", "코치", "MLB", "정관장", "무신사 스탠다드", "빈폴", "타미힐피거", "크록스", "노스페이스", "게스"];
const CAMPAIGNS = ["여름 기획전", "신상 입고", "시즌오프", "단독 특가", "리뉴얼 오픈", "주말 한정", "브랜드 데이"];

function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── 지점 & 매체 ──────────────────────────────────────────────
const { INIT_SPOTS, INIT_MEDIA } = (() => {
  const R = rng(305);
  const names = {
    WEST_HIGH:   ["W3 정문 홀", "W3 1번 기둥", "W3 엘리베이터", "W3 통로"],
    WEST_MIDDLE: ["W2 정문 홀", "W2 1번 기둥", "W2 2번 기둥", "W2 통로 중단"],
    WEST_LOW:    ["W1 정문 홀", "W1 1번 기둥", "W1 매장 전면", "W1 후문"],
    EAST_HIGH:   ["E3 정문 홀", "E3 1번 기둥", "E3 엘리베이터", "E3 통로", "E3 후문"],
    EAST_LOW:    ["E1 정문 홀", "E1 1번 기둥", "E1 매장 전면", "E1 통로 중단", "E1 후문"],
  };
  const spots = [];
  let sid = 0;
  Object.entries(names).forEach(([zone, arr]) => {
    const [bx, by, bw, bh] = ZONES[zone].box;
    arr.forEach((nm) => {
      sid++;
      spots.push({
        id: "S" + String(sid).padStart(3, "0"), name: nm, zone,
        x: +(bx + 0.14 * bw + R() * bw * 0.72).toFixed(2),
        y: +(by + 0.12 * bh + R() * bh * 0.76).toFixed(2),
        active: true,
      });
    });
  });

  const media = [];
  let mid = 0;
  INIT_TYPES.forEach((t) => {
    for (let i = 1; i <= COUNTS[t.code]; i++) {
      const sp = spots[Math.floor(R() * spots.length)];
      mid++;
      media.push({
        id: "M" + String(mid).padStart(3, "0"), spotId: sp.id, type: t.code,
        name: t.label + " " + String(i).padStart(2, "0"),
        faces: t.faces, spec: "", active: true,
      });
    }
  });
  return { INIT_SPOTS: spots, INIT_MEDIA: media };
})();

// ── 게시물 ───────────────────────────────────────────────────
function buildPostings(ref) {
  const R = rng(13);
  const T0 = Date.parse(ref);
  const out = [];
  let pid = 0;
  const typeOf = (c) => INIT_TYPES.find((t) => t.code === c);

  INIT_MEDIA.forEach((m) => {
    const t = typeOf(m.type);
    if (t.openEnded) {
      pid++;
      out.push({
        id: "P" + String(pid).padStart(4, "0"), mediaId: m.id,
        brand: "센터", title: "",
        start: iso(T0 - (120 + Math.floor(R() * 700)) * DAY), end: null,
        removedAt: null, removalSource: null,
        hue: 210, bytesOrig: Math.round((3 + R() * 8) * 1048576), bytesLight: Math.round((140 + R() * 180) * 1024),
        driveUrl: "https://drive.google.com/file/d/" + Math.random().toString(36).slice(2, 12),
        installPhoto: R() > 0.4,
      });
      return;
    }
    const willStale = R() < 0.22;
    let cursor = T0 - (120 + Math.floor(R() * 300)) * DAY;
    for (let k = 0; k < 24; k++) {
      const dur = 21 + Math.floor(R() * 60);
      const start = cursor, end = start + dur * DAY;
      const ended = end < T0;
      pid++;
      const brand = BRANDS[Math.floor(R() * BRANDS.length)];
      out.push({
        id: "P" + String(pid).padStart(4, "0"), mediaId: m.id, brand,
        title: R() > 0.5 ? CAMPAIGNS[Math.floor(R() * CAMPAIGNS.length)] : "",
        start: iso(start), end: iso(end),
        removedAt: ended ? iso(end + DAY) : null,
        removalSource: ended ? "manual" : null,
        hue: Math.floor(R() * 360),
        bytesOrig: Math.round((2.4 + R() * 9) * 1048576), bytesLight: Math.round((120 + R() * 190) * 1024),
        driveUrl: "https://drive.google.com/file/d/" + Math.random().toString(36).slice(2, 12),
        installPhoto: R() > 0.35,
      });
      if (!ended) break;
      if (willStale && diffDays(iso(end), ref) <= 30) {
        out[out.length - 1].removedAt = null; out[out.length - 1].removalSource = null;
        break;
      }
      cursor = end + DAY;
    }
  });
  return out;
}

const contentOf = (p) => p.title || p.brand;
const statusOf = (p, ref) => {
  if (p.removedAt) return "removed";
  if (p.start > ref) return "upcoming";
  if (!p.end) return "open";
  if (p.end < ref) return "overdue";
  return "live";
};
const ST = {
  live:     { label: "게시중",  color: "#3C6E9E", soft: "#E4EDF4" },
  open:     { label: "미정",    color: "#4B7B58", soft: "#E7F0EA" },
  upcoming: { label: "게시예정", color: "#7A5AA6", soft: "#EEE8F4" },
  overdue:  { label: "만료",    color: "#B4534B", soft: "#F4E5E3" },
  removed:  { label: "철거완료", color: "#9A948A", soft: "#EFEDE9" },
};

// 후속 게시물이 시작됐다면 이전 것은 물리적으로 반드시 철거됐다. 기록 누락이면 자동 채움.
function autoClose(postings, ref) {
  const by = {};
  postings.forEach((p) => (by[p.mediaId] = by[p.mediaId] || []).push(p));
  const out = [];
  Object.values(by).forEach((arr) => {
    const list = arr.slice().sort((a, b) => a.start.localeCompare(b.start));
    list.forEach((p, i) => {
      const nxt = list[i + 1];
      if (!p.removedAt && nxt && nxt.start <= ref) out.push({ ...p, removedAt: nxt.start, removalSource: "auto" });
      else out.push(p);
    });
  });
  return out;
}

function buildState(media, postings, ref) {
  const by = {};
  postings.forEach((p) => (by[p.mediaId] = by[p.mediaId] || []).push(p));
  return media.filter((m) => m.active).map((m) => {
    const list = (by[m.id] || []).slice().sort((a, b) => a.start.localeCompare(b.start));
    const live = list.find((p) => statusOf(p, ref) === "live");
    const open = list.find((p) => statusOf(p, ref) === "open");
    const overdue = list.find((p) => statusOf(p, ref) === "overdue");
    const next = list.find((p) => statusOf(p, ref) === "upcoming");
    const current = live || open || null;
    const removed = list.filter((p) => p.removedAt);
    let emptyDays = 0;
    if (!current && !overdue) {
      const last = removed.length ? removed[removed.length - 1].removedAt : null;
      emptyDays = last ? diffDays(last, ref) : 365;
    }
    return {
      ...m, current, live: live || null, open: open || null, overdue: overdue || null, next: next || null,
      history: list, emptyDays, isEmpty: !current && !overdue,
      openDays: open ? diffDays(open.start, ref) : null,
      dToRemove: live ? diffDays(ref, live.end) : null,
      overdueDays: overdue ? diffDays(overdue.end, ref) : null,
    };
  });
}

// ────────────────────────────────────────────────────────────
export default function App() {
  const [ref, setRef] = useState(DEFAULT_REF);
  const [types, setTypes] = useState(INIT_TYPES);
  const [media, setMedia] = useState(INIT_MEDIA);
  const [postings, setPostings] = useState(() => buildPostings(DEFAULT_REF));
  const [spots, setSpots] = useState(INIT_SPOTS);
  const [savedSpots, setSavedSpots] = useState(INIT_SPOTS);
  const [undoStack, setUndoStack] = useState([]);
  const [tab, setTab] = useState("posts");
  const [selSpot, setSelSpot] = useState(null);
  const [selMedia, setSelMedia] = useState(null);
  const [typeFilter, setTypeFilter] = useState(new Set(INIT_TYPES.map((t) => t.code)));
  const [zoneFilter, setZoneFilter] = useState("ALL");
  const [toast, setToast] = useState("");
  const [narrow, setNarrow] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [mapImage, setMapImage] = useState(null);

  useEffect(() => {
    const on = () => setNarrow(window.innerWidth <= 980);
    on(); window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const flash = (m) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  const T = useMemo(() => Object.fromEntries(types.map((t) => [t.code, t])), [types]);
  const state = useMemo(() => buildState(media, autoClose(postings, ref), ref), [media, postings, ref]);
  const byId = useMemo(() => Object.fromEntries(state.map((o) => [o.id, o])), [state]);
  const spotName = (id) => spots.find((s) => s.id === id)?.name || "-";

  const visible = useMemo(
    () => state.filter((o) => typeFilter.has(o.type) && (zoneFilter === "ALL" || spots.find((s) => s.id === o.spotId)?.zone === zoneFilter)),
    [state, typeFilter, zoneFilter, spots]
  );

  const spotStats = useMemo(() => {
    const map = {};
    spots.forEach((s) => (map[s.id] = { total: 0, stale: 0, empty: 0 }));
    visible.forEach((o) => {
      const s = map[o.spotId]; if (!s) return;
      s.total++;
      if (o.overdue) s.stale++;
      if (o.isEmpty) s.empty++;
    });
    return map;
  }, [spots, visible]);

  const kpi = useMemo(() => {
    const live = state.filter((o) => o.live).length;
    const open = state.filter((o) => o.open).length;
    const stale = state.filter((o) => o.overdue).length;
    const longOpen = state.filter((o) => o.open && o.openDays >= LONG_OPEN).length;
    const week = state.filter((o) => o.live && o.dToRemove >= 0 && o.dToRemove <= 7).length;
    return { total: state.length, live, open, stale, longOpen, week };
  }, [state]);

  const alerts = useMemo(() => ({
    soon: state.filter((o) => o.live && o.dToRemove >= 0 && o.dToRemove <= ALERT_DAYS).sort((a, b) => a.dToRemove - b.dToRemove),
    stale: state.filter((o) => o.overdue).sort((a, b) => b.overdueDays - a.overdueDays),
  }), [state]);

  const moveSpot = (id, x, y) => { setUndoStack((p) => [...p, spots]); setSpots((prev) => prev.map((s) => (s.id === id ? { ...s, x, y } : s))); };
  const dirty = JSON.stringify(spots) !== JSON.stringify(savedSpots);

  const markRemoved = (id) => { setPostings((prev) => prev.map((p) => (p.id === id ? { ...p, removedAt: ref, removalSource: "manual" } : p))); flash("철거 완료로 기록했습니다."); };
  const undoRemoved = (id) => { setPostings((prev) => prev.map((p) => (p.id === id ? { ...p, removedAt: null, removalSource: null } : p))); flash("철거 기록을 취소했습니다."); };
  const addPosting = (p) => { setPostings((prev) => [...prev, { ...p, id: "P" + Date.now() }]); flash("게시물을 등록했습니다."); };
  const adjustEnd = (id, newEnd) => setPostings((prev) => prev.map((p) => (p.id === id ? { ...p, end: newEnd } : p)));

  const addType = (t) => { setTypes((prev) => [...prev, t]); flash("매체 유형을 추가했습니다."); };
  const toggleType = (code) => setTypes((prev) => prev.map((t) => (t.code === code ? { ...t, active: !t.active } : t)));
  const editType = (code, patch) => { setTypes((prev) => prev.map((t) => (t.code === code ? { ...t, ...patch } : t))); flash("매체 유형을 수정했습니다."); };
  const addMedia = (m, n) => {
    const base = media.length;
    const list = [];
    for (let i = 0; i < n; i++) list.push({ ...m, id: "M" + String(base + i + 1).padStart(3, "0"), name: m.name + " " + String(i + 1).padStart(2, "0"), active: true });
    setMedia((prev) => [...prev, ...list]);
    flash(n + "개 매체를 등록했습니다.");
  };
  const removeMedia = (id) => {
    const used = postings.some((p) => p.mediaId === id);
    if (used) { setMedia((prev) => prev.map((m) => (m.id === id ? { ...m, active: false } : m))); flash("게시 이력이 있어 보관 처리했습니다."); }
    else { setMedia((prev) => prev.filter((m) => m.id !== id)); flash("매체를 삭제했습니다."); }
  };
  const restoreMedia = (id) => { setMedia((prev) => prev.map((m) => (m.id === id ? { ...m, active: true } : m))); flash("보관을 해제했습니다."); };
  const moveMediaSpot = (id, spotId) => { setMedia((prev) => prev.map((m) => (m.id === id ? { ...m, spotId } : m))); flash("매체 위치를 변경했습니다."); };

  const cropMapImage = (file) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const targetRatio = 2; // mapwrap aspect-ratio 16/8
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      const curRatio = img.width / img.height;
      if (curRatio > targetRatio) { sw = img.height * targetRatio; sx = (img.width - sw) / 2; }
      else { sh = img.width / targetRatio; sy = (img.height - sh) / 2; }
      const cv = document.createElement("canvas");
      cv.width = 1600; cv.height = 800;
      cv.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
      setMapImage(cv.toDataURL("image/jpeg", 0.85));
      URL.revokeObjectURL(url);
      flash("배치도 이미지를 중앙 기준으로 잘라 적용했습니다.");
    };
    img.src = url;
  };

  const TABS = { posts: "홍보물 관리", status: "매체 현황", gallery: "게시물", timeline: "타임라인", manage: "매체 관리", alert: "알람 예정" };
  const ctx = { T, types, spots, spotName, ref };

  return (
    <div className={"app" + (narrow ? " narrow" : "")}>
      <style>{CSS}</style>

      <aside className="side">
        <div className="brand">
          <div className="bmark">YPO</div>
          <div><b>점내 홍보매체</b><span>여주 프리미엄 아울렛</span></div>
        </div>
        <div className="sidekpi">
          <div className="skv"><em>게시중</em><b>{kpi.live + kpi.open}<i>/{kpi.total}</i></b></div>
          <div className="skv bad"><em>만료</em><b>{kpi.stale}</b></div>
        </div>
        <nav>
          {Object.entries(TABS).map(([k, v]) => (
            <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
              {v}{k === "posts" && kpi.stale > 0 && <em className="red">{kpi.stale}</em>}
            </button>
          ))}
        </nav>
        <button className="btn primary wide" onClick={() => setAddOpen(true)}>+ 게시물 등록</button>
        <label className="reffield">기준일<input type="date" value={ref} onChange={(e) => setRef(e.target.value)} /></label>
        <div className="sidefoot">내부 직원 전용 · 프로토타입</div>
      </aside>

      <main>
        <MapPanel
          {...ctx} stats={spotStats} zoneFilter={zoneFilter} setZoneFilter={setZoneFilter}
          typeFilter={typeFilter} setTypeFilter={setTypeFilter}
          selSpot={selSpot} setSelSpot={setSelSpot} onMove={moveSpot}
          dirty={dirty} canUndo={undoStack.length > 0} mapImage={mapImage} onMapImage={cropMapImage}
          onSave={() => { setSavedSpots(spots); setUndoStack([]); flash("지점 위치를 저장했습니다."); }}
          onCancel={() => { setSpots(savedSpots); setUndoStack([]); }}
          onUndo={() => { if (!undoStack.length) return; setSpots(undoStack[undoStack.length - 1]); setUndoStack((p) => p.slice(0, -1)); }}
        />

        <div className="tabs">
          {Object.entries(TABS).map(([k, v]) => (
            <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{v}{k === "posts" && kpi.stale > 0 && <em>{kpi.stale}</em>}</button>
          ))}
        </div>

        <div className="panel">
          {tab === "posts" && <PostsPanel {...ctx} state={state} postings={postings} media={media} onRemove={markRemoved} onUndo={undoRemoved} onPick={setSelMedia} />}
          {tab === "status" && <StatusPanel {...ctx} state={visible} postings={postings} media={media} onPick={setSelMedia} />}
          {tab === "gallery" && <GalleryPanel {...ctx} postings={postings} media={media} onPick={setSelMedia} />}
          {tab === "timeline" && <TimelinePanel {...ctx} state={state} onPick={setSelMedia} />}
          {tab === "manage" && (
            <ManagePanel {...ctx} media={media} postings={postings}
              onAddType={addType} onToggleType={toggleType} onEditType={editType}
              onAddMedia={addMedia} onRemoveMedia={removeMedia} onRestoreMedia={restoreMedia} onMoveSpot={moveMediaSpot} />
          )}
          {tab === "alert" && <AlertPanel alerts={alerts} kpi={kpi} />}
        </div>
      </main>

      {selSpot && (
        <SpotSheet {...ctx} spot={spots.find((s) => s.id === selSpot)} list={state.filter((o) => o.spotId === selSpot)}
          onClose={() => setSelSpot(null)} onPick={(id) => { setSelSpot(null); setSelMedia(id); }} />
      )}
      {selMedia && byId[selMedia] && (
        <MediaSheet {...ctx} o={byId[selMedia]} onClose={() => setSelMedia(null)} onRemove={markRemoved} onMoveSpot={moveMediaSpot} />
      )}
      {addOpen && <AddModal {...ctx} media={media} postings={postings} onClose={() => setAddOpen(false)} onAdd={addPosting} onAdjustEnd={adjustEnd} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

// ── 지도 ─────────────────────────────────────────────────────
function MapPanel({ T, types, spots, stats, zoneFilter, setZoneFilter, typeFilter, setTypeFilter, selSpot, setSelSpot, onMove, dirty, onSave, onCancel, onUndo, canUndo, mapImage, onMapImage }) {
  const wrap = useRef(null);
  const [drag, setDrag] = useState(null);
  const [hover, setHover] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [open, setOpen] = useState(false);
  const active = types.filter((t) => t.active);

  const pos = (e) => { const r = wrap.current.getBoundingClientRect(); return { x: clamp(((e.clientX - r.left) / r.width) * 100, 1, 99), y: clamp(((e.clientY - r.top) / r.height) * 100, 1, 99) }; };
  const tog = (k) => setTypeFilter((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const shown = spots.filter((s) => zoneFilter === "ALL" || s.zone === zoneFilter);

  return (
    <div className="mapcard">
      <div className="maphead">
        <div className="mtitle"><b>구역 배치도</b><span>핀 = 지점 · 빨강 = 떼야 할 게 있음</span></div>
        <div className="mtools">
          <select className="sel" value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}>
            <option value="ALL">전체 구역</option>
            {Object.entries(ZONES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <div className="dd">
            <button className="btn" onClick={() => setOpen((v) => !v)}>매체 유형 {typeFilter.size === active.length ? "전체" : typeFilter.size} ▾</button>
            {open && (
              <div className="ddmenu" onMouseLeave={() => setOpen(false)}>
                <div className="ddtop"><button onClick={() => setTypeFilter(new Set(active.map((t) => t.code)))}>전체</button><button onClick={() => setTypeFilter(new Set())}>해제</button></div>
                {active.map((t) => (
                  <label key={t.code}><input type="checkbox" checked={typeFilter.has(t.code)} onChange={() => tog(t.code)} /><i style={{ background: t.color }} />{t.label}</label>
                ))}
              </div>
            )}
          </div>
          <label className="btn upload">
            배치도 이미지
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => e.target.files[0] && onMapImage(e.target.files[0])} />
          </label>
          <button className={"btn" + (editMode ? " on" : "")} onClick={() => setEditMode((v) => !v)}>{editMode ? "위치 편집 중" : "위치 편집"}</button>
        </div>
      </div>

      {dirty && (
        <div className="editbar">
          <span>지점 위치가 변경되었습니다 <em>미저장</em></span>
          <div><button className="eb-undo" onClick={onUndo} disabled={!canUndo}>↶ 되돌리기</button><button className="eb-cancel" onClick={onCancel}>변경 취소</button><button className="eb-save" onClick={onSave}>위치 저장</button></div>
        </div>
      )}

      <div className="mapwrap" ref={wrap} onPointerMove={(e) => { if (drag) { const p = pos(e); onMove(drag, +p.x.toFixed(2), +p.y.toFixed(2)); } }} onPointerUp={() => setDrag(null)}>
        {mapImage ? (
          <img src={mapImage} alt="배치도" className="mapbg-img" />
        ) : (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="mapbg">
            <rect x="0" y="0" width="100" height="100" fill="#F2EFE9" />
            {Object.entries(ZONES).map(([k, z]) => (
              <rect key={k} x={z.box[0]} y={z.box[1]} width={z.box[2]} height={z.box[3]} rx="1.2"
                fill="#FBFAF7" stroke="#DAD3C6" strokeWidth="0.28" opacity={zoneFilter === "ALL" || zoneFilter === k ? 1 : 0.32} />
            ))}
          </svg>
        )}
        {!mapImage && Object.entries(ZONES).map(([k, z]) => (
          <span key={k} className="zonelbl" style={{ left: z.box[0] + z.box[2] / 2 + "%", top: z.box[1] + 1.4 + "%", opacity: zoneFilter === "ALL" || zoneFilter === k ? 1 : 0.3 }}>{z.label}</span>
        ))}
        {shown.map((s) => {
          const st = stats[s.id]; if (!st || !st.total) return null;
          const tone = st.stale ? "stale" : st.empty === st.total ? "empty" : "full";
          return (
            <button key={s.id} className={"pin " + tone + (selSpot === s.id ? " sel" : "") + (editMode ? " editable" : "")}
              style={{ left: s.x + "%", top: s.y + "%" }}
              onPointerDown={(e) => { if (!editMode) return; e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); setDrag(s.id); }}
              onClick={() => !editMode && setSelSpot(s.id)} onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)}>
              <span className="pdot">{st.total}</span>
              {st.stale > 0 && <span className="pbadge">{st.stale}</span>}
              {(hover === s.id || selSpot === s.id) && <span className="plabel">{s.name}<i>매체 {st.total}{st.stale ? " · 만료 " + st.stale : " · 정상"}</i></span>}
            </button>
          );
        })}
      </div>

      <div className="legend">
        <span><i className="lg full" />정상</span><span><i className="lg stale" />만료 있음</span><span><i className="lg empty" />비어있음</span>
        <span className="lghint">핀 안 숫자 = 매체 수 · 빨간 배지 = 떼야 할 수</span>
      </div>
    </div>
  );
}

// ── 홍보물 관리 (통합) ────────────────────────────────────────
function PostsPanel({ T, types, spotName, state, postings, media, ref, onRemove, onUndo, onPick }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeSel, setTypeSel] = useState(new Set(types.map((t) => t.code)));
  const [q, setQ] = useState("");
  const [rangeOn, setRangeOn] = useState(false);
  const [from, setFrom] = useState("2025-01-01");
  const [to, setTo] = useState(DEFAULT_REF);
  const mName = (id) => media.find((m) => m.id === id)?.name || "-";

  const toggleType = (c) => setTypeSel((prev) => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n; });

  // 기간 지정 시: 전체 이력에서 그 기간과 겹치는 게시물을 검색한다.
  const historyRows = useMemo(() => {
    if (!rangeOn) return [];
    return postings
      .filter((p) => typeSel.has(media.find((m) => m.id === p.mediaId)?.type))
      .filter((p) => (p.end || "9999-12-31") >= from && p.start <= to)
      .filter((p) => !q || (contentOf(p) + p.brand + mName(p.mediaId)).toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.start.localeCompare(a.start));
  }, [rangeOn, postings, typeSel, from, to, q, media]);

  // 기본: 현재 상태 기준, 만료가 맨 앞
  const order = { overdue: 0, live: 1, open: 2, upcoming: 3 };
  const currentRows = useMemo(() => {
    return state
      .filter((o) => typeSel.has(o.type))
      .filter((o) => statusFilter === "all" || (statusFilter === "overdue" ? o.overdue : statusFilter === "live" ? o.live : statusFilter === "open" ? o.open : true))
      .filter((o) => !q || (o.name + spotName(o.spotId) + (o.current?.brand || "") + (o.current ? contentOf(o.current) : "")).toLowerCase().includes(q.toLowerCase()))
      .map((o) => ({ o, p: o.overdue || o.current }))
      .sort((a, b) => {
        const sa = a.p ? statusOf(a.p, ref) : "none", sb = b.p ? statusOf(b.p, ref) : "none";
        const oa = order[sa] ?? 9, ob = order[sb] ?? 9;
        if (oa !== ob) return oa - ob;
        const ea = a.p?.end || "9999-12-31", eb = b.p?.end || "9999-12-31";
        return ea.localeCompare(eb);
      });
  }, [state, typeSel, statusFilter, q, spotName]);

  return (
    <div>
      <div className="toolrow">
        <input className="inp" placeholder="업체명 · 내용 · 매체명 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="chk"><input type="checkbox" checked={rangeOn} onChange={(e) => setRangeOn(e.target.checked)} />기간으로 조회</label>
        {rangeOn && (
          <>
            <input className="inp date" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span className="sub">~</span>
            <input className="inp date" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </>
        )}
      </div>
      <div className="toolrow">
        <div className="seg wrap">
          {types.map((t) => (
            <button key={t.code} className={typeSel.has(t.code) ? "on" : ""} onClick={() => toggleType(t.code)}>{t.label}</button>
          ))}
        </div>
        {!rangeOn && (
          <div className="seg">
            {[["overdue", "만료"], ["live", "게시중"], ["open", "미정"], ["all", "전체"]].map(([k, v]) => (
              <button key={k} className={statusFilter === k ? "on" : ""} onClick={() => setStatusFilter(k)}>{v}</button>
            ))}
          </div>
        )}
        <span className="count mono">{(rangeOn ? historyRows.length : currentRows.length)}건</span>
      </div>

      {!rangeOn ? (
        <div className="scroll tall">
          <table>
            <thead><tr><th>매체</th><th>유형</th><th>지점</th><th>업체명</th><th>내용</th><th>철거예정</th><th>상태</th><th className="r">조치</th></tr></thead>
            <tbody>
              {currentRows.map(({ o, p }) => {
                const t = T[o.type];
                return (
                  <tr key={o.id} onClick={() => onPick(o.id)}>
                    <td><b>{o.name}</b></td>
                    <td><span className="chip" style={{ background: t.color + "1A", color: t.color }}>{t.label}</span></td>
                    <td>{spotName(o.spotId)}</td>
                    <td>{p ? p.brand : <span className="sub">—</span>}</td>
                    <td className="sub">{p ? contentOf(p) : "—"}</td>
                    <td className="mono">{p ? (p.end || "미정") : "—"}</td>
                    <td>
                      {o.overdue ? <span className="tag over">만료 +{o.overdueDays}일</span>
                        : o.open ? <span className="tag open">미정 {o.openDays}일째</span>
                        : o.live ? <span className="tag live">D-{o.dToRemove}</span>
                        : <span className="tag vacant">비어있음</span>}
                    </td>
                    <td className="r" onClick={(e) => e.stopPropagation()}>
                      {o.overdue && <button className="mini ok" onClick={() => onRemove(o.overdue.id)}>철거 완료</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="scroll tall">
          <table>
            <thead><tr><th>매체</th><th>업체명</th><th>내용</th><th>게시</th><th>철거예정</th><th>실제철거</th><th className="r">기간</th><th>상태</th></tr></thead>
            <tbody>
              {historyRows.map((p) => {
                const s = ST[statusOf(p, ref)];
                return (
                  <tr key={p.id} onClick={() => onPick(p.mediaId)}>
                    <td>{mName(p.mediaId)}</td>
                    <td><b>{p.brand}</b></td>
                    <td className="sub">{contentOf(p)}</td>
                    <td className="mono">{p.start}</td>
                    <td className="mono">{p.end || "미정"}</td>
                    <td className="mono">{p.removedAt || <span className="sub">—</span>}{p.removalSource === "auto" && <span className="autotag">자동</span>}</td>
                    <td className="r mono">{p.end ? days(p.start, p.end) + "일" : "—"}</td>
                    <td><span className="chip" style={{ background: s.soft, color: s.color }}>{s.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── 매체 현황 ────────────────────────────────────────────────
function StatusPanel({ T, spotName, state, postings, media, onPick }) {
  const [q, setQ] = useState("");
  const [rangeOn, setRangeOn] = useState(false);
  const [from, setFrom] = useState("2025-01-01");
  const [to, setTo] = useState(DEFAULT_REF);
  const mName = (id) => media.find((m) => m.id === id)?.name || "-";

  const rows = state.filter((o) => !q || (o.name + spotName(o.spotId) + (o.current?.brand || "")).toLowerCase().includes(q.toLowerCase()));

  const historyRows = useMemo(() => {
    if (!rangeOn) return [];
    return postings
      .filter((p) => (p.end || "9999-12-31") >= from && p.start <= to)
      .filter((p) => !q || (contentOf(p) + p.brand + mName(p.mediaId)).toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.start.localeCompare(a.start));
  }, [rangeOn, postings, from, to, q]);

  return (
    <div>
      <div className="toolrow">
        <input className="inp" placeholder="매체명 · 지점 · 업체명 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="chk"><input type="checkbox" checked={rangeOn} onChange={(e) => setRangeOn(e.target.checked)} />기간으로 조회</label>
        {rangeOn && (<><input className="inp date" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /><span className="sub">~</span><input className="inp date" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></>)}
        <span className="count mono">{(rangeOn ? historyRows.length : rows.length)}건</span>
      </div>
      {!rangeOn ? (
        <div className="scroll tall">
          <table>
            <thead><tr><th>매체</th><th>유형</th><th>지점</th><th>업체명</th><th>내용</th><th>상태</th></tr></thead>
            <tbody>
              {rows.map((o) => {
                const p = o.overdue || o.current;
                const t = T[o.type];
                return (
                  <tr key={o.id} onClick={() => onPick(o.id)}>
                    <td><b>{o.name}</b></td>
                    <td><span className="chip" style={{ background: t.color + "1A", color: t.color }}>{t.label}</span></td>
                    <td>{spotName(o.spotId)}{t.movable && <i className="sub">이동형</i>}</td>
                    <td>{p ? p.brand : <span className="sub">—</span>}</td>
                    <td className="sub">{p ? contentOf(p) : "—"}</td>
                    <td>
                      {o.overdue ? <span className="tag over">만료 +{o.overdueDays}일</span>
                        : o.open ? <span className="tag open">미정</span>
                        : o.live ? <span className="tag live">D-{o.dToRemove}</span>
                        : <span className="tag vacant">비어있음</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="scroll tall">
          <table>
            <thead><tr><th>매체</th><th>업체명</th><th>내용</th><th>게시</th><th>철거예정</th><th>실제철거</th><th className="r">기간</th><th>상태</th></tr></thead>
            <tbody>
              {historyRows.map((p) => {
                const s = ST[statusOf(p, DEFAULT_REF)];
                return (
                  <tr key={p.id} onClick={() => onPick(p.mediaId)}>
                    <td>{mName(p.mediaId)}</td>
                    <td><b>{p.brand}</b></td>
                    <td className="sub">{contentOf(p)}</td>
                    <td className="mono">{p.start}</td>
                    <td className="mono">{p.end || "미정"}</td>
                    <td className="mono">{p.removedAt || <span className="sub">—</span>}{p.removalSource === "auto" && <span className="autotag">자동</span>}</td>
                    <td className="r mono">{p.end ? days(p.start, p.end) + "일" : "—"}</td>
                    <td><span className="chip" style={{ background: s.soft, color: s.color }}>{s.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── 게시물 (이미지 카드) ──────────────────────────────────────
function GalleryPanel({ media, postings, ref, onPick }) {
  const order = { overdue: 0, live: 1, open: 2, upcoming: 3, removed: 4 };
  const [filter, setFilter] = useState("overdue");
  const [q, setQ] = useState("");
  const [rangeOn, setRangeOn] = useState(false);
  const [from, setFrom] = useState("2025-01-01");
  const [to, setTo] = useState(ref);
  const mName = (id) => media.find((m) => m.id === id)?.name || "-";
  const rows = postings.filter((p) => {
    if (rangeOn) { if ((p.end || "9999-12-31") < from || p.start > to) return false; }
    else if (filter !== "all" && statusOf(p, ref) !== filter) return false;
    if (!q) return true;
    return (contentOf(p) + p.brand + mName(p.mediaId)).toLowerCase().includes(q.toLowerCase());
  }).sort((a, b) => rangeOn ? b.start.localeCompare(a.start) : (order[statusOf(a, ref)] ?? 9) - (order[statusOf(b, ref)] ?? 9) || b.start.localeCompare(a.start));

  return (
    <div>
      <div className="toolrow">
        <input className="inp" placeholder="업체명 · 내용 · 매체 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="chk"><input type="checkbox" checked={rangeOn} onChange={(e) => setRangeOn(e.target.checked)} />기간으로 조회</label>
        {rangeOn ? (
          <><input className="inp date" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /><span className="sub">~</span><input className="inp date" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></>
        ) : (
          <div className="seg">
            {[["overdue", "만료"], ["live", "게시중"], ["open", "미정"], ["upcoming", "예정"], ["removed", "철거완료"], ["all", "전체"]].map(([k, v]) => (
              <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{v}</button>
            ))}
          </div>
        )}
        <span className="count mono">{rows.length}건</span>
      </div>
      <div className="cgrid">
        {rows.slice(0, 60).map((p) => {
          const s = ST[statusOf(p, ref)];
          return (
            <div className="ccard" key={p.id} onClick={() => onPick(p.mediaId)}>
              <div className="cthumb" style={{ background: `linear-gradient(150deg, hsl(${p.hue} 42% 52%), hsl(${(p.hue + 40) % 360} 38% 38%))` }}>
                <span className="cver mono">{p.start.slice(5)} ~ {p.end ? p.end.slice(5) : "미정"}</span>
                {p.installPhoto && <span className="cshot">설치사진 ✓</span>}
              </div>
              <div className="cbody">
                <b>{p.brand}</b><i className="sub">{contentOf(p)} · {mName(p.mediaId)}</i>
                <div className="crow"><span className="chip" style={{ background: s.soft, color: s.color }}>{s.label}</span><span className="sub mono">{(p.bytesLight / 1024).toFixed(0)}KB</span></div>
                <div className="csize mono">원본 {(p.bytesOrig / 1048576).toFixed(1)}MB → 경량 {(p.bytesLight / 1024).toFixed(0)}KB<b> {Math.round((1 - p.bytesLight / p.bytesOrig) * 100)}% ↓</b></div>
                <a className="lnk" href={p.driveUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>원본(드라이브)</a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 타임라인 (이력조회 통합) ─────────────────────────────────
function TimelinePanel({ spotName, state, ref, onPick }) {
  const [span, setSpan] = useState(120);
  const [q, setQ] = useState("");
  const [asTable, setAsTable] = useState(false);
  const [rangeOn, setRangeOn] = useState(false);
  const [from, setFrom] = useState(iso(Date.parse(ref) - 90 * DAY));
  const [to, setTo] = useState(ref);
  const T0 = Date.parse(ref);
  const start = rangeOn ? Date.parse(from) : T0 - 30 * DAY;
  const effSpan = rangeOn ? Math.max(1, diffDays(from, to)) : span;
  const ticks = []; for (let d = 0; d <= effSpan; d += Math.max(15, Math.round(effSpan / 8))) ticks.push(d);

  const rows = state
    .filter((o) => !q || (o.name + o.history.map((p) => p.brand + contentOf(p)).join(" ")).toLowerCase().includes(q.toLowerCase()))
    .filter((o) => !rangeOn || o.history.some((p) => (p.end || "9999-12-31") >= from && p.start <= to))
    .slice(0, 60);
  const flatRows = rows.flatMap((o) => o.history.map((p) => ({ o, p })))
    .filter(({ p }) => !rangeOn || ((p.end || "9999-12-31") >= from && p.start <= to))
    .sort((a, b) => b.p.start.localeCompare(a.p.start));

  return (
    <div>
      <div className="toolrow">
        <input className="inp" placeholder="업체명 · 내용 · 매체명 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="chk"><input type="checkbox" checked={rangeOn} onChange={(e) => setRangeOn(e.target.checked)} />기간으로 조회</label>
        {rangeOn ? (
          <><input className="inp date" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /><span className="sub">~</span><input className="inp date" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></>
        ) : (
          !asTable && <div className="seg">{[60, 120, 240].map((s) => <button key={s} className={span === s ? "on" : ""} onClick={() => setSpan(s)}>{s}일</button>)}</div>
        )}
        <button className={"btn" + (asTable ? " on" : "")} onClick={() => setAsTable((v) => !v)}>{asTable ? "그래프로 보기" : "표로 보기"}</button>
      </div>

      {!asTable ? (
        <div className="scroll tall">
          <div className="tl">
            <div className="tlhead"><span /><div className="tlticks">{ticks.map((d) => <i key={d} style={{ left: (d / effSpan) * 100 + "%" }}>{md(start + d * DAY)}</i>)}{!rangeOn && <b className="tlnow" style={{ left: (30 / effSpan) * 100 + "%" }} />}</div></div>
            {rows.map((o) => (
              <div className="tlrow" key={o.id}>
                <span className="tlname" title={o.name}>{o.name}</span>
                <div className="tlbar">
                  {o.history.map((p) => {
                    const s = clamp(diffDays(iso(start), p.start), 0, effSpan);
                    const e = clamp(p.end ? diffDays(iso(start), p.end) + 1 : effSpan, 0, effSpan);
                    if (e <= 0 || s >= effSpan) return null;
                    return (
                      <i key={p.id} className={"seg-" + statusOf(p, ref)} style={{ left: (s / effSpan) * 100 + "%", width: ((e - s) / effSpan) * 100 + "%" }} title={p.brand + " " + p.start + "~" + (p.end || "미정")}>
                        <b onClick={(e2) => { e2.stopPropagation(); onPick(o.id); }}>{p.brand}</b>
                      </i>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="scroll tall">
          <table>
            <thead><tr><th>매체</th><th>업체명</th><th>내용</th><th>게시</th><th>철거예정</th><th>실제철거</th><th className="r">기간</th><th>상태</th></tr></thead>
            <tbody>
              {flatRows.map(({ o, p }) => {
                const s = ST[statusOf(p, ref)];
                return (
                  <tr key={p.id} onClick={() => onPick(o.id)}>
                    <td>{o.name}<i className="sub">{spotName(o.spotId)}</i></td>
                    <td><b>{p.brand}</b></td>
                    <td className="sub">{contentOf(p)}</td>
                    <td className="mono">{p.start}</td>
                    <td className="mono">{p.end || "미정"}</td>
                    <td className="mono">{p.removedAt || <span className="sub">—</span>}{p.removalSource === "auto" && <span className="autotag">자동</span>}</td>
                    <td className="r mono">{p.end ? days(p.start, p.end) + "일" : "—"}</td>
                    <td><span className="chip" style={{ background: s.soft, color: s.color }}>{s.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── 매체 관리 ────────────────────────────────────────────────
function ManagePanel({ T, types, spots, spotName, media, postings, onAddType, onToggleType, onEditType, onAddMedia, onRemoveMedia, onRestoreMedia, onMoveSpot }) {
  const [sec, setSec] = useState("media");
  const [editing, setEditing] = useState(null);
  const [edit, setEdit] = useState({});
  const [nt, setNt] = useState({ label: "", spec: "", faces: 1, color: "#5E7B8A", glyph: "▪", movable: false, openEnded: false });
  const [nm, setNm] = useState({ type: types[0]?.code || "", spotId: spots[0]?.id || "", name: "", count: 1, faces: types[0]?.faces || 1 });
  const [q, setQ] = useState("");

  const countOf = (code) => media.filter((m) => m.type === code && m.active).length;
  const rows = media.filter((m) => !q || (m.name + m.id + spotName(m.spotId)).toLowerCase().includes(q.toLowerCase()));

  const startEdit = (t) => { setEditing(t.code); setEdit({ label: t.label, spec: t.spec, faces: t.faces, glyph: t.glyph, color: t.color }); };
  const saveEdit = () => { onEditType(editing, edit); setEditing(null); };

  return (
    <div>
      <div className="toolrow">
        <div className="seg"><button className={sec === "media" ? "on" : ""} onClick={() => setSec("media")}>매체</button><button className={sec === "type" ? "on" : ""} onClick={() => setSec("type")}>매체 유형</button></div>
        <span className="count mono">{sec === "media" ? media.filter((m) => m.active).length + "개 운영중" : types.length + "종"}</span>
      </div>

      {sec === "type" && (
        <>
          <div className="scroll" style={{ maxHeight: 340, marginBottom: 16 }}>
            <table>
              <thead><tr><th>아이콘</th><th>유형</th><th>기본 규격</th><th className="r">면수</th><th>이동형</th><th>종료일</th><th className="r">등록 매체</th><th className="r">관리</th></tr></thead>
              <tbody>
                {types.map((t) => {
                  const isEd = editing === t.code;
                  return (
                    <tr key={t.code}>
                      <td>{isEd ? <input className="iconinp" value={edit.glyph} onChange={(e) => setEdit({ ...edit, glyph: e.target.value })} maxLength={2} /> : <span className="chip" style={{ background: t.color + "1A", color: t.color }}>{t.glyph}</span>}</td>
                      <td>{isEd ? <input className="inp" value={edit.label} onChange={(e) => setEdit({ ...edit, label: e.target.value })} /> : t.label}</td>
                      <td className="sub">{isEd ? <input className="inp" value={edit.spec} onChange={(e) => setEdit({ ...edit, spec: e.target.value })} /> : (t.spec || "—")}</td>
                      <td className="r mono">{isEd ? <input className="inp num" type="number" min="1" max="6" value={edit.faces} onChange={(e) => setEdit({ ...edit, faces: +e.target.value })} /> : t.faces}</td>
                      <td className="sub">{t.movable ? "예" : "—"}</td>
                      <td className="sub">{t.openEnded ? "미정 기본" : "필수"}</td>
                      <td className="r mono">{countOf(t.code)}</td>
                      <td className="r">
                        {isEd ? (
                          <><button className="mini ok" onClick={saveEdit}>저장</button><button className="mini" onClick={() => setEditing(null)}>취소</button></>
                        ) : (
                          <><button className="mini" onClick={() => startEdit(t)}>수정</button><button className="mini" onClick={() => onToggleType(t.code)}>{t.active ? "보관" : "복구"}</button></>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <section className="block">
            <h3>매체 유형 추가</h3>
            <div className="formrow">
              <input className="inp" placeholder="유형명" value={nt.label} onChange={(e) => setNt({ ...nt, label: e.target.value })} />
              <input className="inp" placeholder="기본 규격 (예: 900×1800mm)" value={nt.spec} onChange={(e) => setNt({ ...nt, spec: e.target.value })} />
              <input className="inp num" type="number" min="1" max="6" title="면수" value={nt.faces} onChange={(e) => setNt({ ...nt, faces: +e.target.value })} />
              <input className="iconinp" placeholder="아이콘" value={nt.glyph} onChange={(e) => setNt({ ...nt, glyph: e.target.value })} maxLength={2} />
              <input className="colorinp" type="color" value={nt.color} onChange={(e) => setNt({ ...nt, color: e.target.value })} />
              <label className="chk"><input type="checkbox" checked={nt.movable} onChange={(e) => setNt({ ...nt, movable: e.target.checked })} />이동형</label>
              <label className="chk"><input type="checkbox" checked={nt.openEnded} onChange={(e) => setNt({ ...nt, openEnded: e.target.checked })} />종료일 미정 기본</label>
              <button className="btn primary" disabled={!nt.label} onClick={() => { onAddType({ ...nt, code: "t" + Date.now(), active: true }); setNt({ label: "", spec: "", faces: 1, color: "#5E7B8A", glyph: "▪", movable: false, openEnded: false }); }}>추가</button>
            </div>
          </section>
        </>
      )}

      {sec === "media" && (
        <>
          <section className="block">
            <h3>매체 추가 <span>면수는 유형 기본값을 불러오되 확인 후 수정할 수 있습니다</span></h3>
            <div className="formrow">
              <select className="sel" value={nm.type} onChange={(e) => { const t = T[e.target.value]; setNm({ ...nm, type: e.target.value, faces: t.faces }); }}>
                {types.filter((t) => t.active).map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
              </select>
              <select className="sel" value={nm.spotId} onChange={(e) => setNm({ ...nm, spotId: e.target.value })}>
                {spots.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input className="inp" placeholder="매체명 접두" value={nm.name} onChange={(e) => setNm({ ...nm, name: e.target.value })} />
              <input className="inp num" type="number" min="1" max="6" title="면수" value={nm.faces} onChange={(e) => setNm({ ...nm, faces: +e.target.value })} />
              <input className="inp num" type="number" min="1" max="50" title="개수" value={nm.count} onChange={(e) => setNm({ ...nm, count: +e.target.value })} />
              <button className="btn primary" disabled={!nm.name} onClick={() => { onAddMedia({ type: nm.type, spotId: nm.spotId, name: nm.name, faces: nm.faces, spec: "" }, clamp(nm.count, 1, 50)); setNm({ ...nm, name: "", count: 1 }); }}>추가</button>
            </div>
            <p className="hint">앞쪽 숫자 입력은 면수, 뒤쪽은 등록할 개수입니다.</p>
          </section>

          <div className="toolrow"><input className="inp" placeholder="매체명 · 지점 검색" value={q} onChange={(e) => setQ(e.target.value)} /><span className="count mono">{rows.length}건</span></div>
          <div className="scroll tall">
            <table>
              <thead><tr><th>매체</th><th>유형</th><th>지점</th><th className="r">면수</th><th className="r">게시 이력</th><th className="r">관리</th></tr></thead>
              <tbody>
                {rows.map((m) => {
                  const t = T[m.type];
                  const hist = postings.filter((p) => p.mediaId === m.id).length;
                  return (
                    <tr key={m.id} className={m.active ? "" : "archived"}>
                      <td><b>{m.name}</b><i className="sub mono">{m.id}</i></td>
                      <td>{t && <span className="chip" style={{ background: t.color + "1A", color: t.color }}>{t.label}</span>}</td>
                      <td>{t?.movable ? <select className="sel mini-sel" value={m.spotId} onChange={(e) => onMoveSpot(m.id, e.target.value)}>{spots.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select> : spotName(m.spotId)}</td>
                      <td className="r mono">{m.faces}</td>
                      <td className="r mono">{hist}건</td>
                      <td className="r">{m.active ? <button className="mini no" onClick={() => onRemoveMedia(m.id)}>{hist ? "보관" : "삭제"}</button> : <button className="mini" onClick={() => onRestoreMedia(m.id)}>복구</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>게시 이력이 있는 매체는 삭제하면 과거 기록이 사라지므로 <b>보관 처리</b>됩니다.</p>
        </>
      )}
    </div>
  );
}

// ── 알람 예정 ────────────────────────────────────────────────
function AlertPanel({ alerts, kpi }) {
  return (
    <div className="alertwrap">
      <p className="hint">매일 09:00 KST · 기준일 D-{ALERT_DAYS} 조건으로 발송</p>

      <section className="block">
        <h3>① 철거 예고 <span>{alerts.soon.length}건</span></h3>
        {alerts.soon.length === 0 && <p className="empty">해당 없음</p>}
        {alerts.soon.map((o) => (
          <div className="slack" key={o.id}><b>⏳ {o.dToRemove === 0 ? "오늘" : o.dToRemove + "일 후"} 철거</b><span>[{o.name}] {o.live.brand} (~{o.live.end})</span></div>
        ))}
      </section>

      <section className="block">
        <h3>② 만료 <span>{alerts.stale.length}건</span></h3>
        {alerts.stale.length === 0 && <p className="empty">해당 없음</p>}
        {alerts.stale.length > 0 && (
          <div className="slack danger">
            <b>🚨 만료된 게시물 {alerts.stale.length}건</b>
            <span>{alerts.stale.slice(0, 4).map((o) => `[${o.name}] ${o.overdue.brand} +${o.overdueDays}일`).join(" / ")}{alerts.stale.length > 4 ? ` 외 ${alerts.stale.length - 4}건` : ""}</span>
          </div>
        )}
      </section>

      <section className="block">
        <h3>③ 주간 요약 <span>매주 월 09:00</span></h3>
        <div className="slack"><b>📋 이번 주 점내 홍보매체</b><span>게시중 {kpi.live + kpi.open}/{kpi.total} · 만료 {kpi.stale} · 미정 {kpi.open}(장기 {kpi.longOpen})</span></div>
      </section>
    </div>
  );
}

// ── 지점 시트 ────────────────────────────────────────────────
function SpotSheet({ T, spot, list, onClose, onPick }) {
  if (!spot) return null;
  const bad = list.filter((o) => o.overdue).length;
  return (
    <div className="sheet">
      <div className="shead"><div><b>{spot.name}</b><i>{ZONES[spot.zone].label} · 매체 {list.length}개{bad ? " · 떼야 할 것 " + bad + "개" : " · 모두 정상"}</i></div><button onClick={onClose}>✕</button></div>
      <div className="sbody">
        {list.length === 0 && <p className="empty">등록된 매체가 없습니다.</p>}
        {list.map((o) => (
          <div className="mrow" key={o.id} onClick={() => onPick(o.id)}>
            <span className="mglyph" style={{ background: T[o.type].color + "1A", color: T[o.type].color }}>{T[o.type].glyph}</span>
            <div className="mtxt"><b>{o.name}</b><i>{o.overdue ? o.overdue.brand : o.current ? o.current.brand : T[o.type].spec}</i></div>
            {o.overdue ? <span className="tag over">만료 +{o.overdueDays}</span> : o.open ? <span className="tag open">미정</span> : o.live ? <span className="tag live">D-{o.dToRemove}</span> : <span className="tag vacant">비어있음</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 매체 상세 ────────────────────────────────────────────────
function MediaSheet({ T, spots, spotName, o, onClose, onRemove, onMoveSpot }) {
  const t = T[o.type];
  const cur = o.overdue || o.current;
  const past = o.history.filter((p) => p.id !== cur?.id).slice().reverse();
  return (
    <div className="sheet">
      <div className="shead"><div><b>{o.name}</b><i>{spotName(o.spotId)} · {t.label} · {o.spec || t.spec} · {o.faces}면</i></div><button onClick={onClose}>✕</button></div>
      <div className="sbody">
        {t.movable && (
          <div className="movebox"><span>이동형 매체 · 현재 위치</span><select className="sel" value={o.spotId} onChange={(e) => onMoveSpot(o.id, e.target.value)}>{spots.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        )}
        <h4>{o.overdue ? "지금 걸려 있는 것 (만료)" : o.open ? "지금 걸려 있는 것 (미정)" : "현재 게시물"}</h4>
        {o.overdue && <p className="warnbox">{o.overdue.end}에 철거 예정이었습니다. <b>+{o.overdueDays}일</b> 경과했습니다.</p>}
        {o.open && <p className="okbox">종료일이 정해지지 않았습니다. <b>{o.openDays}일째</b> 게시 중입니다.{o.openDays >= LONG_OPEN && " 1년이 넘었으니 한 번 확인해 보세요."}</p>}
        {cur ? (
          <>
            <div className="bigthumb" style={{ background: `linear-gradient(150deg, hsl(${cur.hue} 42% 52%), hsl(${(cur.hue + 40) % 360} 38% 38%))` }}><span>{cur.brand}</span></div>
            <div className="statgrid">
              <div><em>업체명</em><b>{cur.brand}</b></div>
              <div><em>내용</em><b>{contentOf(cur)}</b></div>
              <div><em>게시일</em><b className="mono">{cur.start}</b></div>
              <div><em>철거 예정</em><b className="mono">{cur.end || "미정"}</b></div>
            </div>
            <button className={"btn wide" + (o.overdue ? " danger" : "")} onClick={() => onRemove(cur.id)}>철거 완료로 기록{o.overdue ? ` (+${o.overdueDays}일 지연)` : ""}</button>
          </>
        ) : <p className="empty">비어있습니다 · {o.emptyDays >= 365 ? "365+" : o.emptyDays}일째</p>}

        <h4>게시 이력 <span className="sub">{past.length}건</span></h4>
        <div className="thumbrow">{past.map((p) => (<div className="tsmall" key={p.id} title={p.brand + " " + p.start + "~" + (p.end || "미정")}><i style={{ background: `linear-gradient(150deg, hsl(${p.hue} 40% 55%), hsl(${(p.hue + 40) % 360} 36% 40%))` }} /><em className="mono">{p.start.slice(2, 7)}</em></div>))}</div>
        <table className="mini-t">
          <tbody>{past.map((p) => (<tr key={p.id}><td>{p.brand}</td><td className="mono sub">{p.start} ~ {p.end || "미정"}</td><td className="r sub mono">{p.removedAt ? "철거 " + p.removedAt.slice(5) : "—"}</td></tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ── 게시물 등록 ──────────────────────────────────────────────
function AddModal({ T, media, postings, ref, onClose, onAdd, onAdjustEnd }) {
  const live = media.filter((m) => m.active);
  const [mediaId, setMediaId] = useState(live[0]?.id || "");
  const m = live.find((x) => x.id === mediaId);
  const t = m ? T[m.type] : null;

  const [brand, setBrand] = useState("");
  const [title, setTitle] = useState("");
  const [start, setStart] = useState(ref);
  const [noEnd, setNoEnd] = useState(false);
  const [end, setEnd] = useState(iso(Date.parse(ref) + 30 * DAY));
  const [drive, setDrive] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(null);

  const mediaPostings = (id) => postings.filter((p) => p.mediaId === id).sort((a, b) => b.start.localeCompare(a.start));

  useEffect(() => {
    if (!t) return;
    setNoEnd(!!t.openEnded);
    setConflict(null);
    const last = mediaPostings(mediaId)[0];
    if (last) setStart(last.end ? iso(Date.parse(last.end) + DAY) : ref);
    else setStart(ref);
  }, [mediaId]);

  const process = (f) => {
    setBusy(true);
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      const make = (max, q) => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        return { url: cv.toDataURL("image/webp", q), w: cv.width, h: cv.height };
      };
      const view = make(1600, 0.75), thumb = make(400, 0.7);
      const b = (d) => Math.round((d.length - d.indexOf(",") - 1) * 0.75);
      setResult({ w: img.width, h: img.height, ratio: (img.width / img.height).toFixed(2), orig: f.size, view: { ...view, bytes: b(view.url) }, thumb: { ...thumb, bytes: b(thumb.url) } });
      setBusy(false); URL.revokeObjectURL(url);
    };
    img.onerror = () => { setBusy(false); setResult(null); };
    img.src = url;
  };

  const specRatio = useMemo(() => { const spec = m?.spec || t?.spec || ""; const n = spec.match(/(\d+)\D+(\d+)/); return n ? +n[1] / +n[2] : null; }, [m, t]);
  const mismatch = result && specRatio && Math.abs(+result.ratio - specRatio) / specRatio > 0.08;

  const findOverlap = () => {
    const newEndEff = noEnd ? "9999-12-31" : end;
    return mediaPostings(mediaId).find((p) => {
      const pEndEff = p.end || "9999-12-31";
      return start <= pEndEff && p.start <= newEndEff;
    });
  };

  const doAdd = () => {
    onAdd({ mediaId, brand, title, start, end: noEnd ? null : end, removedAt: null, removalSource: null,
      hue: Math.floor(Math.random() * 360), bytesOrig: result?.orig || 0, bytesLight: result?.view.bytes || 0, driveUrl: drive || "#", installPhoto: false });
    onClose();
  };

  const submit = () => {
    if (!mediaId || !brand) return;
    const ov = findOverlap();
    if (ov && !conflict) { setConflict(ov); return; }
    if (ov && conflict) { onAdjustEnd(ov.id, iso(Date.parse(start) - DAY)); }
    doAdd();
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="mbox" onClick={(e) => e.stopPropagation()}>
        <div className="mhead"><b>게시물 등록</b><button onClick={onClose}>✕</button></div>
        <div className="mbody">
          <label className="fld"><span>매체</span><select value={mediaId} onChange={(e) => setMediaId(e.target.value)}>{live.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          {t && <p className="hint">{t.label} · 규격 <b>{m.spec || t.spec}</b> · {m.faces}면{t.movable ? " · 이동형" : ""}</p>}
          <label className="fld"><span>업체명</span><input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="예: 나이키" /></label>
          <label className="fld"><span>내용 (선택)</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="비워두면 업체명이 그대로 들어갑니다" /></label>
          <div className="fld2">
            <label className="fld"><span>게시일</span><input type="date" value={start} onChange={(e) => { setStart(e.target.value); setConflict(null); }} /></label>
            <label className="fld"><span>철거 예정일</span><input type="date" value={end} disabled={noEnd} onChange={(e) => { setEnd(e.target.value); setConflict(null); }} /></label>
          </div>
          <label className="chk"><input type="checkbox" checked={noEnd} onChange={(e) => { setNoEnd(e.target.checked); setConflict(null); }} />종료일 미정 (미정 상태) — 철거 알람 대상에서 제외됩니다</label>
          <label className="fld"><span>원본 위치</span><input value={drive} onChange={(e) => setDrive(e.target.value)} placeholder="구글드라이브 링크" /></label>

          {conflict && (
            <div className="conflictbox">
              겹치는 게시물이 있습니다 — <b>{conflict.brand}</b> ({conflict.start} ~ {conflict.end || "미정"}).<br />
              그대로 진행하면 이 게시물의 철거 예정일이 <b>{iso(Date.parse(start) - DAY)}</b>로 조정됩니다.
              <div className="conflictbtns"><button className="mini" onClick={() => setConflict(null)}>취소</button><button className="mini ok" onClick={submit}>그대로 진행</button></div>
            </div>
          )}

          <div className="drop">
            <input type="file" accept="image/*" onChange={(e) => e.target.files[0] && process(e.target.files[0])} />
            <p>이미지를 올리면 브라우저에서 <b>WebP 2단</b>(1600px / 400px)으로 변환합니다. 원본은 업로드되지 않습니다.</p>
          </div>
          {busy && <p className="hint">변환 중…</p>}
          {result && (
            <div className="rbox">
              <div className="rline"><span>원본</span><b className="mono">{result.w}×{result.h} · {(result.orig / 1048576).toFixed(2)}MB</b></div>
              <div className="rline"><span>view (1600px)</span><b className="mono">{result.view.w}×{result.view.h} · {(result.view.bytes / 1024).toFixed(0)}KB</b></div>
              <div className="rline"><span>thumb (400px)</span><b className="mono">{result.thumb.w}×{result.thumb.h} · {(result.thumb.bytes / 1024).toFixed(0)}KB</b></div>
              <div className="rline total"><span>절감</span><b className="mono">{Math.round((1 - result.view.bytes / result.orig) * 100)}%</b></div>
              {mismatch && <p className="warnbox">⚠ 매체 규격 비율({specRatio.toFixed(2)})과 이미지 비율({result.ratio})이 다릅니다.</p>}
              <div className="rprev"><img src={result.thumb.url} alt="" /><i className="sub">썸네일 미리보기</i></div>
            </div>
          )}
        </div>
        <div className="mfoot"><button className="btn" onClick={onClose}>취소</button><button className="btn primary" onClick={submit} disabled={!brand || !!conflict}>등록</button></div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;800&family=IBM+Plex+Mono:wght@400;600&family=Noto+Sans+KR:wght@400;500;700&display=swap');
*{box-sizing:border-box}
.app{--bg:#F5F2EA;--card:#fff;--line:#E2DBCC;--ink:#26241F;--ink2:#7A7263;--brass:#A67F3A;--brass-soft:#EFE6D3;
  display:flex;min-height:100vh;background:var(--bg);color:var(--ink);
  font-family:'Noto Sans KR',-apple-system,sans-serif;font-size:14px;line-height:1.55}
.mono{font-family:'IBM Plex Mono',monospace;font-variant-numeric:tabular-nums}
.app button{font-family:inherit}

.side{width:230px;flex:0 0 230px;background:#23211E;color:#EFEBE3;padding:20px 16px;display:flex;flex-direction:column;gap:16px;position:sticky;top:0;height:100vh}
.brand{display:flex;gap:11px;align-items:center;padding-bottom:14px;border-bottom:1px solid #3A362E}
.bmark{width:38px;height:38px;border-radius:6px;background:var(--brass);color:#1c1a17;display:grid;place-items:center;font-weight:800;font-size:12px;font-family:'Big Shoulders Display',sans-serif;letter-spacing:.03em}
.brand b{display:block;font-size:16px;font-family:'Big Shoulders Display',sans-serif;font-weight:800;letter-spacing:.02em;text-transform:uppercase}
.brand span{font-size:10.5px;color:#9A9287;letter-spacing:.04em}
.sidekpi{display:flex;flex-direction:column;gap:7px;padding:12px;background:#2C2A26;border-radius:11px}
.skv{display:flex;justify-content:space-between;align-items:baseline}
.skv em{font-style:normal;font-size:11.5px;color:#9A9287}
.skv b{font-size:16px;font-family:'IBM Plex Mono',monospace}
.skv i{font-style:normal;font-size:11px;color:#9A9287}
.skv.bad b{color:#E07C72}
.side nav{display:flex;flex-direction:column;gap:2px}
.side nav button{background:none;border:0;color:#C3BCB1;text-align:left;padding:8px 11px;border-radius:8px;font-size:13.5px;cursor:pointer;display:flex;align-items:center;gap:7px}
.side nav button:hover{background:#2C2A26;color:#fff}
.side nav button.on{background:var(--brass);color:#23211E;font-weight:700}
.side nav em{font-style:normal;margin-left:auto;background:#B4534B;color:#fff;font-size:10.5px;padding:1px 7px;border-radius:10px;font-family:'IBM Plex Mono'}
.reffield{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#C3BCB1;background:#2C2A26;border-radius:9px;padding:8px 10px}
.reffield input{border:1px solid #454138;background:#1c1a17;color:#EFEBE3;border-radius:6px;padding:4px 7px;font-size:12px;font-family:inherit}
.sidefoot{margin-top:auto;font-size:11px;color:#777064}

main{flex:1;min-width:0;padding:20px 24px 60px;display:flex;flex-direction:column;gap:16px}

.mapcard{background:var(--card);border:1px solid var(--line);border-radius:6px;overflow:hidden}
.maphead{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 18px;border-bottom:2px solid var(--ink);flex-wrap:wrap}
.mtitle b{font-size:16px;font-family:'Big Shoulders Display',sans-serif;font-weight:800;letter-spacing:.03em;text-transform:uppercase}
.mtitle span{font-size:11.5px;color:var(--ink2);margin-left:9px}
.mtools{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
.btn{border:1px solid var(--line);background:#fff;padding:7px 12px;border-radius:8px;font-size:12.5px;font-weight:600;cursor:pointer;color:var(--ink)}
.btn:hover{border-color:var(--brass)}
.btn.on{background:var(--brass);border-color:var(--brass);color:#fff}
.btn.primary{background:#23211E;border-color:#23211E;color:#fff}
.btn.danger{background:#B4534B;border-color:#B4534B;color:#fff}
.btn.wide{width:100%;margin-top:10px}
.btn.upload{position:relative;overflow:hidden}
.btn:disabled{opacity:.4;cursor:default}
.sel{border:1px solid var(--line);border-radius:8px;padding:7px 9px;font-size:12.5px;background:#fff;font-family:inherit}
.mini-sel{padding:4px 6px;font-size:11.5px}
.dd{position:relative}
.ddmenu{position:absolute;right:0;top:calc(100% + 5px);background:#fff;border:1px solid var(--line);border-radius:10px;padding:8px;z-index:30;box-shadow:0 10px 28px rgba(0,0,0,.1);min-width:200px}
.ddtop{display:flex;gap:5px;margin-bottom:6px}
.ddtop button{flex:1;border:1px solid var(--line);background:#FAF8F4;border-radius:6px;padding:5px;font-size:11.5px;cursor:pointer}
.ddmenu label{display:flex;align-items:center;gap:7px;padding:5px 4px;font-size:12.5px;cursor:pointer}
.ddmenu label i{width:9px;height:9px;border-radius:3px;display:inline-block}

.editbar{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:10px 18px 0;padding:10px 14px;background:#FBF6EC;border:1px solid #E7D9BC;border-radius:11px;font-size:13px;flex-wrap:wrap}
.editbar em{font-style:normal;background:#C2703D;color:#fff;font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:12px;margin-left:6px}
.editbar>div{display:flex;gap:6px}
.eb-undo,.eb-cancel,.eb-save{border:1px solid var(--line);background:#fff;padding:6px 12px;border-radius:8px;font-size:12.5px;font-weight:600;cursor:pointer}
.eb-save{background:var(--brass);border-color:var(--brass);color:#fff}
.eb-undo:disabled{opacity:.4;cursor:default}

.mapwrap{position:relative;width:100%;aspect-ratio:16/8;touch-action:none;overflow:hidden}
.mapbg{position:absolute;inset:0;width:100%;height:100%}
.mapbg-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.zonelbl{position:absolute;transform:translateX(-50%);font-size:10.5px;font-weight:700;color:#A79E8D;letter-spacing:.5px;pointer-events:none}
.pin{position:absolute;transform:translate(-50%,-56%);border:0;background:none;padding:0;cursor:pointer;z-index:5}
.pin.editable{cursor:grab}
.pdot{position:relative;display:flex;align-items:flex-end;justify-content:center;padding-bottom:5px;width:28px;height:34px;font-size:11px;font-weight:700;font-family:'IBM Plex Mono',monospace;color:#fff;
  clip-path:polygon(50% 0%,100% 18%,100% 100%,0% 100%,0% 18%);
  box-shadow:0 2px 6px rgba(0,0,0,.25)}
.pdot::after{content:"";position:absolute;top:7px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:rgba(255,255,255,.85)}
.pin.full .pdot{background:#4B7B58}
.pin.stale .pdot{background:#B4534B;box-shadow:0 0 0 3px rgba(180,83,75,.2),0 2px 6px rgba(0,0,0,.22)}
.pin.empty .pdot{background:#A79E8D}
.pin.sel .pdot{outline:2.5px solid var(--brass);outline-offset:2px}
.pbadge{position:absolute;top:-6px;right:-8px;background:#B4534B;color:#fff;font-size:10px;font-weight:700;min-width:15px;height:15px;line-height:13px;text-align:center;border-radius:9px;border:1.5px solid #fff;font-family:'IBM Plex Mono'}
.plabel{position:absolute;left:50%;top:calc(100% + 7px);transform:translateX(-50%);background:#23211E;color:#fff;padding:6px 10px;border-radius:8px;font-size:11.5px;white-space:nowrap;z-index:25;pointer-events:none}
.plabel i{display:block;font-style:normal;color:#B5AC9E;font-size:10.5px;margin-top:2px}
.legend{display:flex;gap:16px;align-items:center;padding:10px 18px;border-top:1px solid var(--line);font-size:11.5px;color:var(--ink2);flex-wrap:wrap}
.legend span{display:flex;align-items:center;gap:6px}
.lg{width:10px;height:12px;display:inline-block;clip-path:polygon(50% 0%,100% 22%,100% 100%,0% 100%,0% 22%)}
.lg.full{background:#4B7B58}.lg.stale{background:#B4534B}.lg.empty{background:#B5AFA4}
.lghint{margin-left:auto;color:#A79E8D}

.tabs{display:flex;gap:3px;border-bottom:1px solid var(--line);overflow-x:auto}
.tabs button{border:0;background:none;padding:10px 12px;font-weight:600;font-size:13.5px;color:var(--ink2);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap;display:flex;gap:6px;align-items:center}
.tabs button.on{color:var(--ink);border-bottom-color:var(--brass)}
.tabs em{font-style:normal;background:#B4534B;color:#fff;font-size:10.5px;padding:1px 7px;border-radius:10px;font-family:'IBM Plex Mono'}

.panel{background:var(--card);border:1px solid var(--line);border-radius:6px;padding:18px}
.block{margin-bottom:22px}
.block h3{font-size:13.5px;margin:0 0 10px;display:flex;align-items:baseline;gap:9px;flex-wrap:wrap}
.block h3 span{font-weight:400;font-size:11.5px;color:var(--ink2)}

.toolrow{display:flex;gap:9px;align-items:center;margin-bottom:12px;flex-wrap:wrap}
.formrow{display:flex;gap:9px;align-items:center;flex-wrap:wrap;margin-bottom:8px}
.inp{flex:1;min-width:130px;border:1px solid var(--line);border-radius:9px;padding:8px 12px;font-size:13px;font-family:inherit}
.inp.date{flex:0 0 148px;min-width:0}
.inp.num{flex:0 0 64px;min-width:0;text-align:center;padding:8px 6px}
.iconinp{width:52px;text-align:center;border:1px solid var(--line);border-radius:8px;padding:7px 4px;font-size:14px;font-family:inherit}
.colorinp{width:38px;height:34px;border:1px solid var(--line);border-radius:8px;padding:2px;background:#fff}
.chk{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--ink2)}
.seg{display:flex;border:1px solid var(--line);border-radius:9px;overflow:hidden;flex-wrap:wrap}
.seg.wrap{flex-wrap:wrap}
.seg button{border:0;background:#fff;padding:7px 12px;font-size:12.5px;cursor:pointer;border-right:1px solid var(--line);color:var(--ink2)}
.seg button:last-child{border-right:0}
.seg button.on{background:#23211E;color:#fff;font-weight:600}
.count{margin-left:auto;font-size:12px;color:var(--ink2)}

.scroll{overflow:auto;max-height:420px;border:1px solid var(--line);border-radius:11px}
.scroll.tall{max-height:540px}
table{width:100%;border-collapse:collapse;font-size:13px}
thead th{position:sticky;top:0;background:#F7F5F1;text-align:left;padding:9px 12px;font-size:11.5px;color:var(--ink2);font-weight:600;border-bottom:1px solid var(--line);white-space:nowrap;z-index:2}
tbody td{padding:9px 12px;border-bottom:1px solid #F0ECE4;vertical-align:middle}
tbody tr:hover{background:#FBF9F5}
tbody tr.archived{opacity:.45}
.r{text-align:right}
.sub{color:var(--ink2);font-style:normal;font-size:11.5px;display:block}
.chip{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;white-space:nowrap}
.tag{display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;white-space:nowrap}
.tag.live{background:#E4EDF4;color:#3C6E9E}
.tag.open{background:#E7F0EA;color:#4B7B58}
.tag.vacant{background:#EFEDE9;color:#777064}
.tag.over{background:#F4E5E3;color:#B4534B}
.empty{color:var(--ink2);font-size:13px;padding:18px;text-align:center}
.mini{border:1px solid var(--line);background:#fff;border-radius:7px;padding:5px 11px;font-size:11.5px;font-weight:600;cursor:pointer;white-space:nowrap}
.mini.ok{border-color:#4B7B58;color:#4B7B58}
.mini.no{border-color:#B4534B;color:#B4534B}
.autotag{display:inline-block;background:#EFEDE9;color:#777064;font-size:10px;padding:1px 6px;border-radius:10px;margin-left:6px}

.cgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(215px,1fr));gap:14px}
.ccard{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fff;cursor:pointer}
.ccard:hover{border-color:var(--brass)}
.cthumb{aspect-ratio:3/4;position:relative}
.cver{position:absolute;top:8px;left:8px;background:rgba(0,0,0,.55);color:#fff;font-size:10px;padding:2px 8px;border-radius:20px}
.cshot{position:absolute;bottom:8px;right:8px;background:rgba(75,123,88,.92);color:#fff;font-size:10px;padding:2px 7px;border-radius:20px}
.cbody{padding:11px 12px 12px}
.cbody b{font-size:13px;display:block;line-height:1.35}
.crow{display:flex;justify-content:space-between;align-items:center;margin:7px 0 5px}
.csize{font-size:10.5px;color:var(--ink2);margin:5px 0 7px}
.csize b{display:inline;color:#4B7B58;font-size:10.5px}
.lnk{font-size:11.5px;color:#3C6E9E;text-decoration:none}

.modal{position:fixed;inset:0;background:rgba(35,33,30,.5);display:grid;place-items:center;z-index:60;padding:16px}
.mbox{background:#fff;border-radius:15px;width:min(520px,100%);max-height:90vh;display:flex;flex-direction:column;overflow:hidden}
.mhead{display:flex;justify-content:space-between;align-items:center;padding:15px 18px;border-bottom:1px solid var(--line)}
.mhead b{font-size:15px}
.mhead button{border:0;background:none;font-size:17px;cursor:pointer;color:var(--ink2)}
.mbody{padding:16px 18px;overflow:auto;display:flex;flex-direction:column;gap:11px}
.mfoot{padding:13px 18px;border-top:1px solid var(--line);display:flex;justify-content:flex-end;gap:8px}
.fld{display:flex;flex-direction:column;gap:5px;font-size:12.5px}
.fld2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.fld span{color:var(--ink2);font-weight:600}
.fld input,.fld select{border:1px solid var(--line);border-radius:8px;padding:8px 11px;font-size:13px;font-family:inherit}
.fld input:disabled{background:#F4F2EE;color:#A79E8D}
.hint{font-size:11.5px;color:var(--ink2);margin:0;line-height:1.7}
.conflictbox{font-size:12px;color:#A8781F;background:#FBF6EC;border:1px solid #E7D9BC;border-radius:9px;padding:10px 12px;line-height:1.7}
.conflictbtns{margin-top:8px;display:flex;gap:6px}
.drop{border:1.5px dashed var(--line);border-radius:11px;padding:14px;text-align:center;background:#FCFBF8}
.drop p{font-size:11.5px;color:var(--ink2);margin:9px 0 0}
.rbox{border:1px solid var(--line);border-radius:11px;padding:12px}
.rline{display:flex;justify-content:space-between;font-size:12px;padding:3px 0}
.rline span{color:var(--ink2)}
.rline.total{border-top:1px solid var(--line);margin-top:5px;padding-top:7px}
.rline.total b{color:#4B7B58;font-weight:700}
.warnbox{font-size:11.5px;color:#A8781F;background:#FBF6EC;border-radius:7px;padding:8px 10px;margin:8px 0 0;line-height:1.7}
.okbox{font-size:11.5px;color:#3E6449;background:#E7F0EA;border-radius:7px;padding:8px 10px;margin:0 0 10px;line-height:1.7}
.rprev{margin-top:10px;text-align:center}
.rprev img{max-width:130px;border-radius:8px;border:1px solid var(--line)}
.movebox{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#F8F1E4;border:1px solid #E7D9BC;border-radius:10px;padding:9px 12px;margin-bottom:14px;font-size:12px;color:#8A6A20}

.tl{min-width:640px;padding:12px}
.tlhead{display:flex;gap:10px;margin-bottom:8px}
.tlhead>span{width:150px;flex:0 0 150px}
.tlticks{flex:1;position:relative;height:16px;border-bottom:1px solid var(--line)}
.tlticks i{position:absolute;font-style:normal;font-size:10px;color:var(--ink2);font-family:'IBM Plex Mono';transform:translateX(-50%)}
.tlnow{position:absolute;top:0;height:600px;width:1.5px;background:#B4534B;z-index:1}
.tlrow{display:flex;gap:10px;align-items:center;margin-bottom:4px}
.tlname{width:150px;flex:0 0 150px;font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink2)}
.tlbar{flex:1;position:relative;height:19px;background:#F2EFE9;border-radius:5px;overflow:hidden}
.tlbar i{position:absolute;top:0;height:19px;border-radius:5px;display:flex;align-items:center;padding:0 6px;overflow:hidden}
.tlbar i b{font-size:10px;color:#fff;white-space:nowrap;font-weight:500;cursor:pointer;text-decoration:underline}
.seg-live{background:#3C6E9E}
.seg-open{background:#4B7B58}
.seg-upcoming{background:#7A5AA6}
.seg-removed{background:#B5AFA4}
.seg-overdue{background:#B4534B}

.alertwrap .slack{border:1px solid var(--line);border-left:3px solid #4A154B;border-radius:9px;padding:11px 14px;margin-bottom:7px;background:#FCFBF8}
.alertwrap .slack.danger{border-left-color:#B4534B;background:#FCF3F1}
.slack b{display:block;font-size:13px;margin-bottom:3px}
.slack span{display:block;font-size:12.5px}

.sheet{position:fixed;right:0;top:0;bottom:0;width:min(430px,100%);background:#fff;border-left:1px solid var(--line);box-shadow:-12px 0 40px rgba(0,0,0,.1);z-index:50;display:flex;flex-direction:column}
.shead{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:16px 18px;border-bottom:1px solid var(--line)}
.shead b{font-size:15px;display:block}
.shead i{font-style:normal;font-size:11.5px;color:var(--ink2)}
.shead button{border:0;background:none;font-size:17px;cursor:pointer;color:var(--ink2)}
.sbody{padding:16px 18px;overflow:auto}
.sbody h4{font-size:12.5px;margin:18px 0 8px;color:var(--ink2)}
.statgrid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:10px}
.statgrid div{border:1px solid var(--line);border-radius:9px;padding:9px 11px}
.statgrid em{font-style:normal;font-size:11px;color:var(--ink2);display:block}
.statgrid b{font-size:13.5px}
.mrow{display:flex;align-items:center;gap:11px;padding:10px 4px;border-bottom:1px solid #F0ECE4;cursor:pointer}
.mrow:hover{background:#FBF9F5}
.mglyph{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;font-size:15px;flex:0 0 32px}
.mtxt{flex:1;min-width:0}
.mtxt b{font-size:12.5px;display:block}
.mtxt i{font-style:normal;font-size:11px;color:var(--ink2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}
.bigthumb{aspect-ratio:3/4;max-height:220px;border-radius:11px;display:grid;place-items:center;color:#fff;font-size:13px;font-weight:600;padding:14px;text-align:center}
.thumbrow{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px}
.tsmall{flex:0 0 54px;text-align:center}
.tsmall i{display:block;width:54px;height:72px;border-radius:7px}
.tsmall em{font-style:normal;font-size:10px;color:var(--ink2);display:block;margin-top:3px}
.mini-t{font-size:12px;margin-top:10px}
.mini-t td{padding:6px 4px;border-bottom:1px solid #F0ECE4}

.toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);background:#23211E;color:#fff;padding:10px 18px;border-radius:22px;font-size:13px;z-index:80}

.app.narrow{flex-direction:column}
.app.narrow .side{width:100%;flex:none;height:auto;position:relative;flex-direction:row;align-items:center;gap:14px;padding:12px 16px;overflow-x:auto}
.app.narrow .side nav{flex-direction:row;flex:1}
.app.narrow .sidekpi{flex-direction:row;gap:14px;padding:8px 12px}
.app.narrow .sidefoot{display:none}
.app.narrow .reffield{flex-direction:row;gap:6px}
.app.narrow .btn.wide{width:auto;margin-top:0;white-space:nowrap}
.app.narrow main{padding:14px}
.app.narrow .mapwrap{aspect-ratio:4/3}
.app.narrow .sheet{width:100%}
@media(max-width:600px){
  .cgrid{grid-template-columns:1fr}
  .side nav button{font-size:12.5px;padding:7px 9px}
}
`;
