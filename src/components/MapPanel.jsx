import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { clamp } from '../constants.js';
import { ZONES } from '../data/seed.js';
import MapCropModal from './MapCropModal.jsx';

// 배너 시스템 MapCard 성능 구조 재사용 (사양서 2.1):
// - pan은 React state 대신 useRef + 직접 DOM 조작 (pointermove마다 재렌더 없음)
// - 휠 줌 핸들러는 useEffect + ref로 등록해 stale closure를 피한다
// - panToPin: 핀 선택 시 지도를 부드럽게 이동
//
// 핀은 지점(spot) 단위 집계가 아니라 매체 낱개 단위다 — 유형 아이콘 + 상태색으로 표시하고,
// 편집 모드에서 드래그로 옮기면 드롭 즉시 저장되며, 빈 자리를 클릭하면 새 매체를 그 자리에 추가한다.
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const CLICK_SLOP = 6; // 이 픽셀 이내 움직임은 팬이 아니라 클릭으로 본다

export default function MapPanel({ T, types, items, zoneFilter, setZoneFilter, typeFilter, setTypeFilter, selMedia, setSelMedia, onMoveLocal, onMoveCommit, onCreate, mapImage, onMapImage, isEditor }) {
  const wrapRef = useRef(null);
  const stageRef = useRef(null);
  const panRef = useRef({ x: 0, y: 0, zoom: 1 });
  const dragPinRef = useRef(null);
  const panDragRef = useRef(null);
  const pointersRef = useRef(new Map()); // 모바일 핀치줌 — 활성 포인터(터치) 추적
  const pinchRef = useRef(null);

  const [zoom, setZoom] = useState(1);
  const [hover, setHover] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [addAt, setAddAt] = useState(null); // { x, y }
  const [open, setOpen] = useState(false);
  const [cropFile, setCropFile] = useState(null);
  const active = types.filter((t) => t.active);

  const clampPan = (x, y, z, r) => {
    const w = r.width * z, h = r.height * z;
    return { x: clamp(x, r.width - w, 0), y: clamp(y, r.height - h, 0) };
  };

  const applyTransform = () => {
    const st = stageRef.current;
    if (!st) return;
    const { x, y, zoom: z } = panRef.current;
    st.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
  };

  const animateTransform = () => {
    const st = stageRef.current;
    if (!st) return;
    st.style.transition = 'transform .32s cubic-bezier(.25,.8,.25,1)';
    applyTransform();
    window.setTimeout(() => { if (st) st.style.transition = ''; }, 340);
  };

  // 휠 줌 — useEffect + ref로 등록해 stale closure를 피하고, preventDefault를 위해
  // React onWheel(수동 리스너) 대신 네이티브 addEventListener를 쓴다.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onWheel = (e) => {
      e.preventDefault();
      const r = wrap.getBoundingClientRect();
      const cx = e.clientX - r.left, cy = e.clientY - r.top;
      const { x, y, zoom: z } = panRef.current;
      const nz = clamp(z * Math.exp(-e.deltaY * 0.0012), MIN_ZOOM, MAX_ZOOM);
      const contentX = (cx - x) / z, contentY = (cy - y) / z;
      const next = clampPan(cx - contentX * nz, cy - contentY * nz, nz, r);
      panRef.current = { ...next, zoom: nz };
      applyTransform();
      setZoom(nz);
    };
    wrap.addEventListener('wheel', onWheel, { passive: false });
    return () => wrap.removeEventListener('wheel', onWheel);
  }, []);

  const pointerToPct = (e) => {
    const r = wrapRef.current.getBoundingClientRect();
    const { x, y, zoom: z } = panRef.current;
    const px = ((e.clientX - r.left - x) / z / r.width) * 100;
    const py = ((e.clientY - r.top - y) / z / r.height) * 100;
    return { x: clamp(px, 1, 99), y: clamp(py, 1, 99) };
  };

  const panToPin = (item) => {
    const wrap = wrapRef.current;
    if (!wrap || !item) return;
    const r = wrap.getBoundingClientRect();
    const targetZoom = Math.max(panRef.current.zoom, 1.8);
    const next = clampPan(
      r.width / 2 - (item.x / 100) * r.width * targetZoom,
      r.height / 2 - (item.y / 100) * r.height * targetZoom,
      targetZoom,
      r
    );
    panRef.current = { ...next, zoom: targetZoom };
    animateTransform();
    setZoom(targetZoom);
  };

  useEffect(() => {
    if (selMedia) panToPin(items.find((o) => o.id === selMedia));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selMedia]);

  const resetView = () => {
    panRef.current = { x: 0, y: 0, zoom: 1 };
    animateTransform();
    setZoom(1);
  };

  // 데스크톱(휠+드래그)과 모바일(핀치+드래그) 모두 지원 — Pointer Events로 손가락 2개를 추적한다.
  const onWrapPointerDown = (e) => {
    if (e.target.closest('.pin')) return; // 핀 위에서 시작한 드래그는 핀 자체가 처리
    wrapRef.current.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      const r = wrapRef.current.getBoundingClientRect();
      pinchRef.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        zoom: panRef.current.zoom,
        midX: (a.x + b.x) / 2 - r.left,
        midY: (a.y + b.y) / 2 - r.top,
        panX: panRef.current.x,
        panY: panRef.current.y,
      };
      panDragRef.current = null;
    } else if (pointersRef.current.size === 1) {
      panDragRef.current = { sx: e.clientX, sy: e.clientY, moved: false, ...panRef.current };
    }
  };
  const onWrapPointerMove = (e) => {
    if (dragPinRef.current) {
      const p = pointerToPct(e);
      onMoveLocal(dragPinRef.current, +p.x.toFixed(2), +p.y.toFixed(2));
      return;
    }
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2 && pinchRef.current) {
      const [a, b] = [...pointersRef.current.values()];
      const p = pinchRef.current;
      const r = wrapRef.current.getBoundingClientRect();
      const nz = clamp(p.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / p.dist), MIN_ZOOM, MAX_ZOOM);
      const scaleBefore = p.zoom, scaleAfter = nz;
      const contentX = (p.midX - p.panX) / scaleBefore, contentY = (p.midY - p.panY) / scaleBefore;
      const next = clampPan(p.midX - contentX * scaleAfter, p.midY - contentY * scaleAfter, nz, r);
      panRef.current = { ...next, zoom: nz };
      applyTransform();
      setZoom(nz);
      return;
    }
    if (panDragRef.current) {
      const { sx, sy, x, y, zoom: z } = panDragRef.current;
      if (Math.abs(e.clientX - sx) > CLICK_SLOP || Math.abs(e.clientY - sy) > CLICK_SLOP) panDragRef.current.moved = true;
      const r = wrapRef.current.getBoundingClientRect();
      const next = clampPan(x + (e.clientX - sx), y + (e.clientY - sy), z, r);
      panRef.current = { ...next, zoom: z };
      applyTransform();
    }
  };
  const onWrapPointerUp = (e) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (dragPinRef.current) {
      const id = dragPinRef.current;
      dragPinRef.current = null;
      const p = pointerToPct(e);
      onMoveCommit(id, +p.x.toFixed(2), +p.y.toFixed(2));
      return;
    }
    if (panDragRef.current) {
      const wasClick = !panDragRef.current.moved;
      panDragRef.current = null;
      if (wasClick && addMode) {
        setAddAt({ ...pointerToPct(e), clientX: e.clientX, clientY: e.clientY });
        setAddMode(false);
      }
    }
  };

  const tog = (k) => setTypeFilter((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const zoneLabel = (z) => ZONES[z]?.label || z;

  return (
    <div className="mapcard">
      <div className="maphead">
        <div className="mtitle"><b>구역 배치도</b><span>핀 = 매체 · 빨강 = 만료 · 휠로 확대/드래그로 이동</span></div>
        <div className="mtools">
          <select className="sel" value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}>
            <option value="ALL">전체 구역</option>
            {Object.entries(ZONES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <div className="dd">
            <button className="btn" onClick={() => setOpen((v) => !v)}>매체 유형 {typeFilter.size === active.length ? '전체' : typeFilter.size} ▾</button>
            {open && (
              <div className="ddmenu" onMouseLeave={() => setOpen(false)}>
                <div className="ddtop"><button onClick={() => setTypeFilter(new Set(active.map((t) => t.code)))}>전체</button><button onClick={() => setTypeFilter(new Set())}>해제</button></div>
                {active.map((t) => (
                  <label key={t.code}><input type="checkbox" checked={typeFilter.has(t.code)} onChange={() => tog(t.code)} /><i style={{ background: t.color }} />{t.label}</label>
                ))}
              </div>
            )}
          </div>
          <button className="btn" onClick={resetView}>{Math.round(zoom * 100)}% · 리셋</button>
          {isEditor && (
            <label className="btn upload">
              배치도 업로드
              <input type="file" accept="image/*,.pdf,application/pdf" style={{ display: 'none' }} onChange={(e) => { if (e.target.files[0]) setCropFile(e.target.files[0]); e.target.value = ''; }} />
            </label>
          )}
          {isEditor && (
            <button className={'btn' + (editMode ? ' on' : '')} onClick={() => { setEditMode((v) => !v); setAddMode(false); }}>{editMode ? '위치 편집 중' : '위치 편집'}</button>
          )}
          {isEditor && (
            <button className={'btn' + (addMode ? ' on' : '')} onClick={() => { setAddMode((v) => !v); setEditMode(false); }}>{addMode ? '추가할 위치 클릭…' : '+ 매체 추가'}</button>
          )}
        </div>
      </div>

      <div
        className={'mapwrap' + (addMode ? ' addmode' : '')}
        ref={wrapRef}
        onPointerDown={onWrapPointerDown}
        onPointerMove={onWrapPointerMove}
        onPointerUp={onWrapPointerUp}
        onPointerCancel={onWrapPointerUp}
      >
        <div className="mapstage" ref={stageRef}>
          {mapImage ? (
            <img src={mapImage} alt="배치도" className="mapbg-img" />
          ) : (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="mapbg">
              <rect x="0" y="0" width="100" height="100" fill="#D6D6D3" />
              {Object.entries(ZONES).map(([k, z]) => (
                <rect key={k} x={z.box[0]} y={z.box[1]} width={z.box[2]} height={z.box[3]} rx="1.2"
                  fill="#EBEBE8" stroke="#C7C7C3" strokeWidth="0.28" opacity={zoneFilter === 'ALL' || zoneFilter === k ? 1 : 0.32} />
              ))}
            </svg>
          )}
          {!mapImage && Object.entries(ZONES).map(([k, z]) => (
            <span key={k} className="zonelbl" style={{ left: z.box[0] + z.box[2] / 2 + '%', top: z.box[1] + 1.4 + '%', opacity: zoneFilter === 'ALL' || zoneFilter === k ? 1 : 0.3 }}>{z.label}</span>
          ))}
          {items.map((o) => {
            const t = T[o.type]; if (!t) return null;
            const tone = o.overdue ? 'stale' : o.isEmpty ? 'empty' : 'full';
            return (
              <button key={o.id} className={'pin ' + tone + (selMedia === o.id ? ' sel' : '') + (editMode ? ' editable' : '') + (zoom >= 1.5 ? ' zoomed' : '')}
                style={{ left: o.x + '%', top: o.y + '%' }}
                onPointerDown={(e) => {
                  if (!editMode) return;
                  e.stopPropagation();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  dragPinRef.current = o.id;
                }}
                onClick={() => !editMode && !addMode && setSelMedia(o.id)} onMouseEnter={() => setHover(o.id)} onMouseLeave={() => setHover(null)}>
                <div className="pin-inner" style={{ transform: `scale(${1 / zoom})` }}>
                  <span className="pdot">{t.glyph}</span>
                  {(hover === o.id || selMedia === o.id) && (
                    <span className="plabel">
                      {o.name}
                      <i>{o.overdue ? '만료 +' + o.overdueDays + '일' : o.open ? '미정' : o.live ? 'D-' + o.dToRemove : '비어있음'}</i>
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {addAt && createPortal(
        <AddMediaPopover
          types={active} at={addAt} zone={zoneLabel(zoneAtLocal(addAt))}
          onCancel={() => setAddAt(null)}
          onSubmit={(payload) => { onCreate(payload, addAt.x, addAt.y); setAddAt(null); }}
        />,
        document.body
      )}

      <div className="legend">
        <span><i className="lg full" />정상</span><span><i className="lg stale" />만료</span><span><i className="lg vacant" />비어있음</span>
        <span className="lghint">아이콘 = 매체 유형 · 편집 모드에서 드래그로 이동, "+ 매체 추가"로 새 매체 배치</span>
      </div>

      {cropFile && (
        <MapCropModal
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onConfirm={(blob) => { setCropFile(null); onMapImage(blob); }}
        />
      )}
    </div>
  );
}

// 사양서 3.2와 달리 지점이 없으므로, 클릭한 좌표가 속한 구역을 화면에서도 바로 계산해 보여준다.
function zoneAtLocal(pt) {
  for (const [key, z] of Object.entries(ZONES)) {
    const [bx, by, bw, bh] = z.box;
    if (pt.x >= bx && pt.x <= bx + bw && pt.y >= by && pt.y <= by + bh) return key;
  }
  return Object.keys(ZONES)[0];
}

function AddMediaPopover({ types, at, zone, onCancel, onSubmit }) {
  const [type, setType] = useState(types[0]?.code || '');
  const t = types.find((x) => x.code === type);
  const [name, setName] = useState(t ? t.label + ' 신규' : '');
  const [faces, setFaces] = useState(t?.faces || 1);

  useEffect(() => {
    const nt = types.find((x) => x.code === type);
    if (nt) { setName(nt.label + ' 신규'); setFaces(nt.faces); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  return (
    <div className="addpop" style={{ '--ax': at.clientX + 'px', '--ay': at.clientY + 'px' }} onClick={(e) => e.stopPropagation()}>
      <b>새 매체 추가 <i className="sub">{zone}</i></b>
      <select className="sel" value={type} onChange={(e) => setType(e.target.value)}>
        {types.map((x) => <option key={x.code} value={x.code}>{x.label}</option>)}
      </select>
      <input className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="매체명" />
      <input className="inp num" type="number" min="1" max="6" title="면수" value={faces} onChange={(e) => setFaces(+e.target.value)} />
      <div className="addpop-btns">
        <button className="mini" onClick={onCancel}>취소</button>
        <button className="mini ok" disabled={!name || !type} onClick={() => onSubmit({ type, name, faces })}>추가</button>
      </div>
    </div>
  );
}
