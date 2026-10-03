import fs from 'node:fs/promises';
import path from 'node:path';

// Called by the shared build-hyperframes.mjs entry point. Content and timing come
// from candidate + prepared manifests, not from a specific release MP4.
export async function buildSignupComposition({model, outputDir, audioTracks = '', gsapScript}) {
const {duration,bodyEnd,captions,manifest}=model;
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const chapterLabels=['인풋 하나를 추가해주세요.','먼저, 왜 받나요?','인증까지 붙으면','입력에도 규칙이 필요합니다','서버도 확인해야 합니다','기존 회원은 어떻게 할까요?','하나의 사용자 흐름으로'];
const chapters=model.beats.map((beat,i)=>[beat.startSeconds,chapterLabels[i]]);
const ctaTitle=manifest.scenes[1].headline.split('\n');
const html=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>휴대폰 번호 인풋 · 개선안 02</title><link rel="stylesheet" href="style.css"></head><body>
<main id="signup" data-composition-id="aurora-explain" data-start="0" data-duration="${duration}" data-width="1080" data-height="1920">
<div class="ambient" data-layout-ignore></div>
<div id="scene-01" class="scene-content">
<header>${chapters.map(([t,s],i)=>`<h1 class="chapter" id="chapter-${i}">${s}</h1>`).join('')}</header>
<section class="stage" data-layout-allow-overflow>
<div id="camera"><div id="surface"><div id="surface-backdrop" data-layout-ignore></div>
<div id="form-heading"><span>회원가입</span><span class="step">연락처</span></div>
<div id="phone-shell">
<div class="labelrow"><label>휴대폰 번호</label><span id="required">필수</span></div>
<div id="phone-control"><div class="values">
<span id="value-empty">번호를 입력해 주세요</span><span id="value-valid">010-1234-5678</span><span id="value-paste">010 1234 5678</span><span id="value-error">010-12</span>
</div><span id="verified">✓</span><span id="caret"></span></div>
<div class="helper"><span id="hint">본인 명의의 번호를 입력해 주세요</span><span id="error">휴대폰 번호 11자리를 확인해 주세요</span><span id="success">휴대폰 인증이 완료됐어요</span></div>
</div>
<div id="auth"><div id="send">인증번호 받기 <span>→</span></div><div class="otp-label"><span>인증번호</span><span id="timer">02:59</span></div><div class="otp-boxes">${['3','8','1','6','2','4'].map((s,i)=>`<div><span id="digit-${i}">${s}</span></div>`).join('')}</div><div class="auth-links"><span>인증번호가 오지 않나요?</span><span>다시 보내기</span></div></div>
<div id="purpose" class="note"><span>번호를 받는 목적</span><div class="choices"><span id="contact-option">연락처</span><strong id="identity-option">본인 인증 <b>✓</b></strong></div></div>
<div id="contract" class="note"><span>서버: 번호 형식 · 인증 완료 확인</span><div class="payload">01012345678 <span>숫자만 전송하는 예시</span></div><div class="request-note">국가 코드 포함 여부도 함께 결정</div><div class="api-options"><span id="api-duplicate">중복 번호 → 다른 번호</span><span id="api-expired">인증 만료 → 재요청</span></div></div>
<div id="policy" class="note"><span>가입 시점에 따라 달라지는 정책</span><div class="policy-row"><span>기존 회원</span><strong>번호 없음</strong></div><div class="policy-row"><span>신규 회원</span><strong>필수로 받을까?</strong></div></div>
</div></div>
</section>
<footer>${captions.map(([a,b,s],i)=>`<p class="caption" id="caption-${i}">${esc(s)}</p>`).join('')}</footer>
</div>
<section id="cta" class="clip"><div class="cta-content"><p>${esc(ctaTitle[0])}</p><h2>${esc(ctaTitle.slice(1).join(" "))}</h2><div class="url">blog.dohyeon.kr</div><div class="cta-button">프로필 링크에서 읽기 ↗</div></div></section>
${audioTracks}
</main><script src="${gsapScript}"></script><script>window.__timelines=window.__timelines||{};</script><script src="timeline.js"></script></body></html>`;
await fs.writeFile(path.join(outputDir,'index.html'),html);
await fs.writeFile(path.join(outputDir,'timing.json'),JSON.stringify({duration,bodyEnd,chapters,captions,beats:model.beats,timingSource:model.timingSource},null,2));
const js=`window.__timelines=window.__timelines||{};
const tl=gsap.timeline({paused:true});
const beats=${JSON.stringify(model.beats)};
const bodyEnd=${bodyEnd};
// Semantic beat-relative choreography stays aligned when cached speech changes speed.
const B=(i,p=0)=>beats[i].startSeconds+p*(beats[i].endSeconds-beats[i].startSeconds);
const spring=(z=.73,w=12)=>p=>{if(p===0||p===1)return p;const v=Math.sqrt(1-z*z);return 1-Math.exp(-z*w*p)*(Math.cos(w*v*p)+z/v*Math.sin(w*v*p));};
const snap=spring(.72,13),soft=spring(.86,11);
const reveal=(sel,t)=>tl.fromTo(sel,{opacity:0,y:40,scale:.96},{opacity:1,y:0,scale:1,duration:.65,ease:snap},t);
const cam=(t,scale,x,y,d=1)=>tl.to('#camera',{scale,x,y,duration:d,ease:soft},t);
tl.from('#surface',{y:100,scale:.9,opacity:0,duration:1,ease:soft},.12);
tl.from('#phone-control',{scale:.96,duration:.65,ease:'power3.out'},.25);
tl.from('#form-heading',{y:15,opacity:0,duration:.65,ease:'power2.out'},.2);
${chapters.map(([t,s],i)=>`tl.fromTo('#chapter-${i}',{y:22,opacity:0},{y:0,opacity:1,duration:.4,ease:'power3.out'},${t+.08});${i<chapters.length-1?`tl.set('#chapter-${i}',{opacity:0},${chapters[i+1][0]});`:''}`).join('\n')}
${captions.map(([a,b,s],i)=>`tl.set('#caption-${i}',{opacity:1},${a});tl.set('#caption-${i}',{opacity:0},${b});`).join('\n')}
tl.set('#surface-backdrop',{scaleY:.44},0);
tl.to('#surface-backdrop',{scaleY:.73,duration:.8,ease:soft},B(1));
tl.to('#surface-backdrop',{scaleY:1,duration:.8,ease:soft},B(2));
cam(.2,1.02,0,0);cam(B(0,.7),1.12,-12,-30,1.5);
reveal('#purpose',B(1,.04));cam(B(1,.04),1.02,0,-60);
tl.to('#identity-option',{backgroundColor:'#17362f',borderColor:'#5de8c8',color:'#5de8c8',duration:.4},B(1,.7));
tl.to('#contact-option',{opacity:.35,duration:.4},B(1,.7));
tl.to('#purpose',{opacity:0,duration:.25},B(2));
reveal('#auth',B(2,.035));tl.to('#hint',{opacity:1,duration:.3},B(2,.035));
cam(B(2),1.1,-10,-40);cam(B(2,.46),1.17,-6,-110);
tl.fromTo('#timer',{color:'#f7f8ff'},{color:'#54dcff',duration:.55,ease:'power2.out'},B(2,.6));
cam(B(3),1.17,0,35);value('valid',B(3,.18));value('paste',B(3,.43));value('valid',B(3,.58));
const errorAt=B(3,.68), restoreAt=B(3,.90);
value('error',errorAt);
tl.to('#phone-control',{borderColor:'#ff6b82',backgroundColor:'#251019',duration:.2},errorAt);
tl.set('#hint',{opacity:0},errorAt);tl.set('#error',{opacity:1},errorAt);
tl.to('#phone-shell',{x:-14,duration:.07,ease:'power2.out'},errorAt+.15);
tl.to('#phone-shell',{x:12,duration:.08},errorAt+.22);
tl.to('#phone-shell',{x:-7,duration:.08},errorAt+.30);
tl.to('#phone-shell',{x:0,duration:.13},errorAt+.38);
value('valid',restoreAt);tl.set('#error',{opacity:0},restoreAt);tl.set('#hint',{opacity:1},restoreAt);
tl.to('#phone-control',{borderColor:'#54dcff',backgroundColor:'#080914',duration:.4},restoreAt);
reveal('#contract',B(4,.02));cam(B(4),1.06,-6,-70);
tl.to('#auth',{opacity:.45,duration:.4},B(4));cam(B(4,.36),1.14,-18,-105,1.4);
tl.from('#api-duplicate',{y:14,opacity:0,duration:.6,ease:snap},B(4,.53));
tl.from('#api-expired',{y:14,opacity:0,duration:.6,ease:snap},B(4,.70));
tl.to('#api-expired',{borderColor:'#54dcff',color:'#54dcff',duration:.4},B(4,.71));
tl.to('#contract',{opacity:0,duration:.35},B(5));reveal('#policy',B(5,.025));cam(B(5),1.12,0,-130);
cam(B(5,.52),1.14,0,-145,1.4);
cam(B(6),1.02,0,-80,1.2);tl.to('#auth',{opacity:1,duration:.5},B(6));tl.to('#policy',{opacity:0,duration:.4},B(6));
for(let i=0;i<6;i++)tl.fromTo('#digit-'+i,{opacity:0,y:14},{opacity:1,y:0,duration:.25,ease:'power2.out'},B(6,.11+i*.023));
const verifiedAt=B(6,.37);
tl.set('#hint',{opacity:0},verifiedAt);reveal('#success',verifiedAt);reveal('#verified',verifiedAt);
tl.to('#phone-control',{borderColor:'#5de8c8',duration:.4},verifiedAt);tl.set('#caret',{opacity:0},verifiedAt);
cam(B(6,.52),1.13,-12,-25,1.5);
tl.fromTo('#cta',{opacity:0},{opacity:1,duration:.6,ease:'power2.inOut'},bodyEnd);
tl.to('.scene-content',{opacity:0,duration:.25,ease:'power1.out'},bodyEnd);
tl.from('.cta-content p',{y:22,opacity:0,duration:.6,ease:'power2.out'},bodyEnd+.108);
tl.from('.cta-content h2',{y:40,opacity:0,duration:.8,ease:soft},bodyEnd+.158);
tl.from('.url',{y:25,opacity:0,duration:.7,ease:'power3.out'},bodyEnd+.308);
tl.from('.cta-button',{scale:.95,opacity:0,duration:.8,ease:snap},bodyEnd+.458);
function value(name,t){['empty','valid','paste','error'].forEach(n=>tl.set('#value-'+n,{opacity:n===name?1:0},t));}
window.__timelines['aurora-explain']=tl;
`;
await fs.writeFile(path.join(outputDir,'timeline.js'),js);
}
