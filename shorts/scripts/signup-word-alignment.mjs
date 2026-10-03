// Map authored phrase boundaries onto measured words, tolerating a small number
// of transcription substitutions. This changes captions/timing, never speech.
const norm=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function alignSignupSpans(texts,words){
 const desired=texts.map(norm),a=desired.join('');let b='';const owners=[];
 for(const [i,w] of words.entries()){const n=norm(w.word);b+=n;owners.push(...Array(n.length).fill(i));}
 if(!a||!b)throw new Error('Missing authored/measured text');
 const n=a.length,m=b.length,dp=Array.from({length:n+1},()=>new Uint16Array(m+1));
 for(let i=0;i<=n;i++)dp[i][0]=i;for(let j=0;j<=m;j++)dp[0][j]=j;
 for(let i=1;i<=n;i++)for(let j=1;j<=m;j++)dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
 const distance=dp[n][m];if(distance/Math.max(n,m)>.04)throw new Error('Transcription differs too much; human review required, no guessed timing.');
 const map=Array(n).fill(null);let i=n,j=m;
 while(i||j){if(i&&j&&dp[i][j]===dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1)){map[--i]=--j;}else if(i&&dp[i][j]===dp[i-1][j]+1)i--;else j--;}
 let cursor=0;const timings=desired.map(s=>{const mapped=map.slice(cursor,cursor+s.length).filter(x=>x!==null);cursor+=s.length;if(!mapped.length)throw new Error('Unaligned span');const first=words[owners[mapped[0]]],last=words[owners[mapped.at(-1)]];return {startSeconds:first.start,endSeconds:last.end};});
 // A measured word can straddle an authored caption boundary. Split that word
 // only for display; no audio edit is made.
 for(let k=1;k<timings.length;k++)if(timings[k].startSeconds<timings[k-1].endSeconds){const boundary=(timings[k].startSeconds+timings[k-1].endSeconds)/2;timings[k-1].endSeconds=boundary;timings[k].startSeconds=boundary;}
 return {timings,editDistance:distance,authoredCharacters:n,transcribedCharacters:m};
}
