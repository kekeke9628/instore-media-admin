import React from 'react';

export default function Unauthorized({ email, onSignOut }) {
  return (
    <div className="authwrap">
      <div className="authcard">
        <div className="bmark">YPO</div>
        <h1>점내 홍보매체</h1>
        <p className="warnbox">
          <b>{email}</b>은(는) 등록된 직원이 아닙니다. 담당자에게 계정 등록을 요청하세요.
        </p>
        <button className="btn wide" onClick={onSignOut}>다른 계정으로 로그인</button>
      </div>
    </div>
  );
}
