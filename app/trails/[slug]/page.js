import Link from 'next/link'
import {notFound} from 'next/navigation'
import Logo from '../../components/logo'
import {createClient,isConfigured} from '@/lib/supabase/server'
import '../trails.css'

export const revalidate=60

const uuid='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const identifierPrefix=new RegExp(`^(?:legacy-[a-z0-9_-]+|${uuid})\\s*(?:—|–|-)\\s*`,'i')
const labelledIdentifier=new RegExp(`^(${uuid})\\s*(?:—|–|-)\\s*(.+)$`,'i')
const labelledSlug=/^([a-z0-9]+(?:-[a-z0-9]+)+)\s*(?:—|–)\s*(.+)$/i
const key=v=>String(v||'').trim().toLowerCase()
const cleanLabel=v=>String(v||'').replace(identifierPrefix,'').trim()
const candidateKeys=item=>{
  const reference=key(item.reference_id)
  const label=String(item.label||'').trim()
  const legacyFromLabel=label.match(/^legacy-([a-z0-9_-]+)/i)?.[1]
  const uuidLabel=label.match(labelledIdentifier)
  const slugLabel=label.match(labelledSlug)
  const slugReference=String(item.reference_id||'').trim().match(labelledSlug)
  return [...new Set([reference,reference.replace(/^legacy-/,''),key(legacyFromLabel),key(uuidLabel?.[1]),key(uuidLabel?.[2]),key(slugLabel?.[1]),key(slugLabel?.[2]),key(slugReference?.[1]),key(slugReference?.[2]),key(cleanLabel(label))].filter(Boolean))]
}
const indexRows=(rows,fields)=>{
  const index=new Map()
  for(const row of rows||[])for(const field of fields){const value=key(row[field]);if(value){index.set(value,row);index.set(`legacy-${value}`,row)}}
  return index
}
const resolveItem=(item,postIndex,bookIndex)=>{
  const index=item.item_type==='post'?postIndex:item.item_type==='book'?bookIndex:null
  if(!index)return null
  for(const candidate of candidateKeys(item)){const match=index.get(candidate);if(match)return match}
  return null
}

export async function generateMetadata({params}){const slug=decodeURIComponent((await params).slug);if(!isConfigured())return {title:'阅读轨迹'};const db=await createClient();const {data}=await db.from('trails').select('title,summary').eq('slug',slug).eq('status','published').maybeSingle();return data?{title:data.title,description:data.summary,openGraph:{title:data.title,description:data.summary,images:[`/api/og?title=${encodeURIComponent(data.title)}`]}}:{title:'阅读轨迹'}}

export default async function TrailPage({params}){
  if(!isConfigured())notFound()
  const slug=decodeURIComponent((await params).slug),db=await createClient()
  const {data:trail}=await db.from('trails').select('*').eq('slug',slug).eq('status','published').maybeSingle()
  if(!trail)notFound()
  const {data:items}=await db.from('trail_items').select('*').eq('trail_id',trail.id).order('position')
  const [{data:postRows},{data:bookRows}]=await Promise.all([
    db.from('posts').select('id,slug,firebase_id,title,excerpt').eq('status','published'),
    db.from('books').select('id,firebase_id,title,author,review')
  ])
  const postIndex=indexRows(postRows,['id','slug','firebase_id','title'])
  const bookIndex=indexRows(bookRows,['id','firebase_id','title'])
  return <main className="trail-detail"><nav><Link href="/trails">← 全部轨迹</Link><Link href="/"><Logo compact/></Link></nav><header><small>CURATED TRAIL / {String(items?.length||0).padStart(2,'0')} STOPS</small><h1>{trail.title}</h1><p>{trail.summary}</p></header><ol>{(items||[]).map((item,i)=>{const target=resolveItem(item,postIndex,bookIndex);const href=target?(item.item_type==='post'?`/logs/${encodeURIComponent(target.slug)}`:`/books#book-${target.id}`):null;const title=target?.title||cleanLabel(item.label)||'未命名条目';return <li key={item.id}><span>{String(i+1).padStart(2,'0')}</span><div><small>{item.item_type.toUpperCase()}</small><h2>{title}</h2><p>{item.note||target?.excerpt||target?.review}</p>{href&&<Link href={href}>打开这一站 →</Link>}</div></li>})}</ol></main>
}
