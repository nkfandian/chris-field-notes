import {parsePostBlocks} from '@/lib/post-format'

// 网页、邮件和长图共用 lib/post-format.js 的解析结果，保证三端格式一致。
function styled(run,key){
  let node=run.code?<code key={key}>{run.text}</code>:run.text
  if(run.strike)node=<del key={key}>{node}</del>
  if(run.italic)node=<em key={key}>{node}</em>
  if(run.bold)node=<strong key={key}>{node}</strong>
  return node
}

function Inline({runs=[]}){
  const nodes=[]
  for(let index=0;index<runs.length;index++){
    const href=runs[index].href
    if(!href){nodes.push(styled(runs[index],index));continue}
    const start=index
    while(runs[index+1]?.href===href)index++
    nodes.push(<a key={start} href={href} target="_blank" rel="noreferrer">{runs.slice(start,index+1).map((run,offset)=>styled(run,offset))}</a>)
  }
  return nodes
}

function Block({block}){
  if(block.type==='hr')return <hr/>
  if(block.type==='image')return block.src?<figure><img src={block.src} alt={block.alt} loading="lazy" referrerPolicy="no-referrer"/><figcaption>{block.alt==='文章配图'?'':block.alt}</figcaption></figure>:null
  if(block.type==='h1'||block.type==='h2'||block.type==='h3'){const Tag=block.type;return <Tag><Inline runs={block.runs}/></Tag>}
  if(block.type==='ul'||block.type==='ol'){const Tag=block.type;return <Tag>{block.items.map((item,index)=><li key={index}><Inline runs={item}/></li>)}</Tag>}
  if(block.type==='quote')return <blockquote><p><Inline runs={block.runs}/></p></blockquote>
  return <p><Inline runs={block.runs}/></p>
}

export default function PostBody({body}){
  const blocks=parsePostBlocks(body)
  if(!blocks.length)return <p>暂无正文。</p>
  // 连续的居中块合并到同一个 .center / .center-bold 容器，沿用原有样式。
  const output=[]
  for(let index=0;index<blocks.length;index++){
    const block=blocks[index]
    if(block.align!=='center'){output.push(<Block key={index} block={block}/>);continue}
    const className=block.blockBold?'center-bold':'center',group=[]
    while(blocks[index]?.align==='center'&&Boolean(blocks[index].blockBold)===(className==='center-bold'))group.push(<Block key={index} block={blocks[index++]}/>)
    index--
    output.push(<div key={`center-${index}`} className={className}>{group}</div>)
  }
  return output
}
