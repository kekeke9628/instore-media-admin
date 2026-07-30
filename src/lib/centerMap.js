// 배치도(구역 배치도) 이미지 — 배너 시스템의 center-map 버킷과 동일한 구조.
// 고정 파일명 하나(current.png)를 매번 덮어쓴다. 이 프로젝트는 공개 접근이 없으므로
// 버킷을 비공개로 두고 서명 URL로 읽는다(배너 시스템은 public 버킷 + 무인증 읽기였다).
import { supabase } from './supabaseClient.js';

const BUCKET = 'center-map';
const FILE = 'current.png';
const SIGNED_URL_TTL = 60 * 60; // 1시간

export async function uploadCenterMap(blob) {
  const { error } = await supabase.storage.from(BUCKET).upload(FILE, blob, {
    upsert: true,
    cacheControl: 'no-cache',
    contentType: 'image/png',
  });
  if (error) throw error;
}

export async function getCenterMapUrl() {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(FILE, SIGNED_URL_TTL);
  if (error) return null; // 아직 업로드된 배치도가 없음
  return data.signedUrl;
}
