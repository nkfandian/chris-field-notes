const imagePattern=/!\[([^\]]*)\]\((https?:\/\/[^)\s]+)(?:\s+["'][^"']*["'])?\)|<img[^>]+src=["'](https?:\/\/[^"']+)["'][^>]*>|![^\s]*?(https?:\/\/[^\s]+)|(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp|avif)(?:\?[^\s]*)?)/gi

function safeUrl(url){return /^(https?:\/\/|mailto:)/i.test(url)?url:'#'}
function inline(text,keyPrefix='inline'){
  const source=String(text),pattern=/!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)|\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)|(`[^`]+`)|(?:\*\*|__)(.+?)(?:\*\*|__)|~~(.+?)~~|(?<!\*)\*([^*\n]+)\*(?!\*)|(?<!_)_([^_\n]+)_(?!_)/g
  const nodes=[],plain=[];let cursor=0,match,index=0
  const flush=()=>{if(plain.length){nodes.push(plain.join(''));plain.length=0}}
  while((match=pattern.exec(source))){plain.push(source.slice(cursor,match.index));flush();const value=match[2]||match[4];if(match[1])nodes.push(<img key={`${keyPrefix}-img-${index++}`} src={safeUrl(match[2])} alt={match[1]||'文章配图'}/>);else if(match[3])nodes.push(<a key={`${keyPrefix}-link-${index++}`} href={safeUrl(match[4])} target="_blank" rel="noreferrer">{inline(match[3],`${keyPrefix}-link`)}</a>);else if(match[5])nodes.push(<code key={`${keyPrefix}-code-${index++}`}>{match[5].slice(1,-1)}</code>);else if(match[6])nodes.push(<strong key={`${keyPrefix}-strong-${index++}`}>{inline(match[6],`${keyPrefix}-strong`)}</strong>);else if(match[7])nodes.push(<del key={`${keyPrefix}-del-${index++}`}>{inline(match[7],`${keyPrefix}-del`)}</del>);else nodes.push(<em key={`${keyPrefix}-em-${index++}`}>{inline(value,`${keyPrefix}-em`)}</em>);cursor=match.index+match[0].length}
  plain.push(source.slice(cursor));flush();return nodes
}
function textBlock(text,key){return <p key={key}>{inline(text,key)}</p>}
function renderLines(lines,bi){
  const first=lines[0]||'';const heading=first.match(/^(#{1,3})\s+(.+)$/)
  if(lines.length===1&&/^(---|\*\*\*|___)\s*$/.test(first))return <hr key={`hr-${bi}`}/>
  if(heading&&lines.length===1){const level=heading[1].length;const Tag=`h${level}`;return <Tag key={`h-${bi}`}>{inline(heading[2],`h-${bi}`)}</Tag>}
  if(lines.every(line=>/^[-*+]\s+/.test(line)))return <ul key={`ul-${bi}`}>{lines.map((line,i)=><li key={i}>{inline(line.replace(/^[-*+]\s+/,''),`ul-${bi}-${i}`)}</li>)}</ul>
  if(lines.every(line=>/^\d+\.\s+/.test(line)))return <ol key={`ol-${bi}`}>{lines.map((line,i)=><li key={i}>{inline(line.replace(/^\d+\.\s+/,''),`ol-${bi}-${i}`)}</li>)}</ol>
  if(lines.every(line=>/^>\s?/.test(line)))return <blockquote key={`quote-${bi}`}>{textBlock(lines.map(line=>line.replace(/^>\s?/,'')).join(' '),`quote-${bi}`)}</blockquote>
  return textBlock(lines.join(' '),`p-${bi}`)
}
export default function PostBody({body}){
  const normalized=String(body||'').replace(/\r\n?/g,'\n').trim(),blocks=normalized.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean),output=[]
  blocks.forEach((block,bi)=>{
    const centered=block.match(/^:::(center(?:-bold)?)\s*\n([\s\S]*?)\n:::\s*$/)
    if(centered){const lines=centered[2].split('\n').filter(Boolean);output.push(<div key={`center-${bi}`} className={centered[1]}>{lines.map((line,i)=>textBlock(line,`center-${bi}-${i}`))}</div>);return}
    let cursor=0,match;imagePattern.lastIndex=0
    while((match=imagePattern.exec(block))){const before=block.slice(cursor,match.index).replace(/\n/g,' ');if(before.trim())output.push(textBlock(before,`before-${bi}-${cursor}`));const src=match[2]||match[3]||match[4]||match[5],alt=match[1]||'文章配图';output.push(<figure key={`img-${bi}-${match.index}`}><img src={safeUrl(src)} alt={alt} loading="lazy" referrerPolicy="no-referrer"/><figcaption>{match[1]||''}</figcaption></figure>);cursor=match.index+match[0].length}
    const rest=block.slice(cursor).trim();if(rest){const lines=rest.split('\n').map(line=>line.trim()).filter(Boolean);output.push(renderLines(lines,bi))}
  })
  return output.length?output:<p>暂无正文。</p>
}
