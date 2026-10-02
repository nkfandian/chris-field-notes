import {createClient,isConfigured} from '@/lib/supabase/server'
import BooksClient from './books-client'
import SiteHeader from '../components/site-header'
import SiteFooter from '../components/site-footer'
import StructuredData from '../components/structured-data'
import {SITE_LANGUAGE,SITE_URL,pageMetadata} from '@/lib/seo'
import './books.css'
export const revalidate=60
export const metadata=pageMetadata({title:'书单',description:'阅读中的书、读过的书，以及它们留下的判断、短评与专题索引。',path:'/books',keywords:['阅读记录','中文书评','英文书单']})
export default async function BooksPage(){let books=[];if(isConfigured()){const db=await createClient();const {data}=await db.from('books').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:false});books=data||[]}const schema={'@context':'https://schema.org','@type':'CollectionPage',name:'书单',description:'阅读中的书、读过的书，以及它们留下的判断、短评与专题索引。',url:`${SITE_URL}/books`,inLanguage:SITE_LANGUAGE,mainEntity:{'@type':'ItemList',numberOfItems:books.length,itemListElement:books.map((book,index)=>({'@type':'ListItem',position:index+1,url:`${SITE_URL}/books#book-${book.id}`,item:{'@type':'Book','@id':`${SITE_URL}/books#book-${book.id}`,name:book.title,author:book.author?{'@type':'Person',name:book.author}:undefined,image:book.cover_url||undefined,description:book.review||undefined,inLanguage:book.language==='English'?'en':'zh-CN'}}))}};return <><SiteHeader current="books"/><main className="books-page" id="content"><StructuredData data={schema}/><header className="books-head"><h1>书单</h1><p>读过、正在读，以及准备打开的书。每一本都可能成为一篇日志的起点。</p></header><BooksClient initialBooks={books}/></main><SiteFooter/></>}
