import Link from 'next/link'
import {notFound} from 'next/navigation'
import {createClient,isConfigured} from '@/lib/supabase/server'
import {demoPosts,labels} from '@/lib/demo'
import InteractionForm from '@/app/components/interaction-form'
import PostBody from './post-body'
import ShareTools from './share-tools'
import PostViewTracker from './post-view-tracker'
import SiteHeader from '../../components/site-header'
import SiteFooter from '../../components/site-footer'
import StructuredData from '../../components/structured-data'
import {AUTHOR_ID,AUTHOR_URL,PUBLISHER_ID,RSS_ALTERNATES,SITE_LANGUAGE,SITE_LOCALE,SITE_NAME,SITE_URL,WEBSITE_ID,firstPostImage,ogImage,plainText,seoDescription} from '@/lib/seo'
import './log.css'
import './share.css'

export const revalidate=60
const decode=value=>{try{return decodeURIComponent(value)}catch{return value}}
const dated=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')?`${value}T00:00:00+08:00`:value

async function getPost(slug){
  let post=demoPosts.find(item=>item.slug===slug)
  if(isConfigured()){
    const db=await createClient()
    const {data}=await db.from('posts').select('*').eq('slug',slug).eq('status','published').maybeSingle()
    post=data||post
  }
  return post
}

export async function generateMetadata({params}){
  const slug=decode((await params).slug),post=await getPost(slug)
  if(!post)return {title:'日志未找到',robots:{index:false,follow:false}}
  const path=`/logs/${encodeURIComponent(slug)}`
  const card=ogImage(post.title),contentImage=firstPostImage(post.body)
  const description=seoDescription(post.excerpt||post.body)
  const keywords=[labels[post.domain],...(post.tags||[])].filter(Boolean)
  const images=contentImage?[{url:contentImage,alt:post.title},{url:card,width:1200,height:630,alt:post.title}]:[{url:card,width:1200,height:630,alt:post.title}]
  return {
    title:post.title,
    description,
    keywords,
    authors:[{name:'Chris',url:AUTHOR_URL}],
    creator:'Chris',
    category:labels[post.domain],
    alternates:{canonical:path,languages:{'zh-CN':path,'x-default':path},types:RSS_ALTERNATES},
    openGraph:{type:'article',locale:SITE_LOCALE,url:path,siteName:SITE_NAME,title:post.title,description,publishedTime:dated(post.published_at),modifiedTime:dated(post.updated_at||post.published_at),authors:['Chris'],section:labels[post.domain],tags:keywords,images},
    twitter:{card:'summary_large_image',title:post.title,description,images:images.map(image=>image.url)}
  }
}

export default async function LogPage({params}){
  const slug=decode((await params).slug)
  let post=await getPost(slug),comments=[],books=[],related=[]
  if(isConfigured()){
    const db=await createClient()
    const [{data:commentData},{data:bookData}]=await Promise.all([
      db.rpc('get_public_comments',{p_post_slug:slug}),
      db.from('books').select('id,title,author,review,cover_url').eq('linked_post_slug',slug)
    ])
    comments=commentData||[]
    books=bookData||[]
    if(post){
      const {data}=await db.from('posts').select('id,slug,title,excerpt,domain,published_at').eq('status','published').eq('domain',post.domain).neq('slug',slug).order('published_at',{ascending:false}).limit(3)
      related=data||[]
    }
  }
  if(!post)notFound()
  const url=`${SITE_URL}/logs/${encodeURIComponent(slug)}`
  const text=plainText(post.body||post.excerpt)
  const description=seoDescription(post.excerpt||post.body)
  const images=[firstPostImage(post.body),ogImage(post.title)].filter(Boolean)
  const jsonLd={'@context':'https://schema.org','@graph':[
    {'@type':'BlogPosting','@id':`${url}#article`,url,headline:post.title,description,image:images,datePublished:dated(post.published_at),dateModified:dated(post.updated_at||post.published_at),author:{'@type':'Person','@id':AUTHOR_ID,name:'Chris',url:AUTHOR_URL},publisher:{'@id':PUBLISHER_ID},isPartOf:{'@id':WEBSITE_ID},mainEntityOfPage:{'@type':'WebPage','@id':url},inLanguage:SITE_LANGUAGE,isAccessibleForFree:true,genre:'个人日志',articleSection:labels[post.domain]||post.domain,keywords:[labels[post.domain],...(post.tags||[])].filter(Boolean).join(', '),wordCount:text.length,commentCount:comments.length,about:books.map(book=>({'@type':'Book',name:book.title,author:book.author?{'@type':'Person',name:book.author}:undefined,url:`${SITE_URL}/books#book-${book.id}`}))},
    {'@type':'BreadcrumbList','@id':`${url}#breadcrumb`,itemListElement:[{'@type':'ListItem',position:1,name:'首页',item:SITE_URL},{'@type':'ListItem',position:2,name:'日志',item:`${SITE_URL}/logs`},{'@type':'ListItem',position:3,name:post.title,item:url}]}
  ]}
  return <><SiteHeader current="logs"/><main className="log-page" id="content">
    <PostViewTracker slug={slug}/><StructuredData data={jsonLd}/>
    <article><header><Link className="log-category" href={`/logs?domain=${post.domain}`}>{labels[post.domain]?.split('/ ')[1]||post.domain}</Link><h1>{post.title}</h1>{post.excerpt&&<p>{post.excerpt}</p>}<div className="log-byline"><Link href="/about" rel="author">Chris</Link><time dateTime={dated(post.published_at)}>{post.published_at}</time></div></header><div className="log-body"><PostBody body={post.body||post.excerpt}/></div>{post.tools&&<aside><b>输入与工具</b><p>{post.tools}</p></aside>}</article>
    <ShareTools slug={slug} title={post.title}/>
    {books.length>0&&<section className="linked-section"><header><h2>相关书籍</h2></header><div>{books.map(book=><Link key={book.id} href={`/books#book-${book.id}`}><h3>{book.title}</h3><p>{book.author}</p></Link>)}</div></section>}
    {related.length>0&&<section className="linked-section"><header><h2>相关文章</h2></header><div>{related.map(item=><Link key={item.id} href={`/logs/${encodeURIComponent(item.slug)}`}><span>{labels[item.domain]?.split('/ ')[1]}</span><h3>{item.title}</h3><p>{item.excerpt}</p></Link>)}</div></section>}
    <section className="comment-section"><header><h2>评论</h2><span>{comments.length} 条</span></header><div className="comment-layout"><div className="comment-list">{comments.length?comments.map(comment=><article className="comment" key={comment.id}><header><b>{comment.name}</b><time dateTime={comment.created_at}>{new Date(comment.created_at).toLocaleDateString('zh-CN')}</time></header><p>{comment.body}</p></article>):<p className="comment-empty">暂无评论。</p>}</div><InteractionForm kind="comment" postSlug={slug}/></div></section>
  </main><SiteFooter/></>
}
