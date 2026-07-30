import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';

export default function Login({ initialError }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(
    initialError ? '로그인 링크가 만료되었거나 이미 사용되었습니다. 새 링크를 요청하세요. (' + initialError + ')' : ''
  );

  const submit = async (e) => {
    e.preventDefault();
    if (!email || busy) return;
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <div className="authwrap">
      <div className="authcard">
        <div className="bmark">YPO</div>
        <h1>점내 홍보매체</h1>
        <p className="sub">여주 프리미엄 아울렛 · 내부 직원 전용</p>

        {sent ? (
          <p className="okbox">
            <b>{email}</b>로 로그인 링크를 보냈습니다. <b>이 브라우저에서</b> 메일함을 열어 링크를 클릭해야 로그인이 완료됩니다(다른 기기·다른 브라우저에서 열면 실패합니다).
          </p>
        ) : (
          <form onSubmit={submit} className="authform">
            <label className="fld">
              <span>직원 이메일</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
            </label>
            {error && <p className="warnbox">{error}</p>}
            <button className="btn primary wide" type="submit" disabled={busy}>
              {busy ? '전송 중…' : '로그인 링크 받기'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
