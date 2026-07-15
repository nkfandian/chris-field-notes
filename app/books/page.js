import Link from 'next/link'
import {createClient,isConfigured} from '@/lib/supabase/server'
import BooksClient from './books-client'
import Logo from '../components/logo'
import StructuredData from '../components/structured-data'
import {SITE_LANGUAGE,SITE_URL,pageMetadata} from '@/lib/seo'
import './books.css'
import './book-anchor.css'
export const revalidate=60
export const metadata=pageMetadata({title:'书单',description:'阅读中的书、读过的书，以及它们留下的判断、短评与专题索引。',path:'/books',keywords:['阅读记录','中文书评','英文书单']})
export default async function BooksPage(){let books=[];if(isConfigured()){const db=await createClient();const {data}=await db.from('books').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:false});books=data||[]}const schema={'@context':'https://schema.org','@type':'CollectionPage',name:'书单',description:'阅读中的书、读过的书，以及它们留下的判断、短评与专题索引。',url:`${SITE_URL}/books`,inLanguage:SITE_LANGUAGE,mainEntity:{'@type':'ItemList',numberOfItems:books.length,itemListElement:books.map((book,index)=>({'@type':'ListItem',position:index+1,url:`${SITE_URL}/books#book-${book.id}`,item:{'@type':'Book','@id':`${SITE_URL}/books#book-${book.id}`,name:book.title,author:book.author?{'@type':'Person',name:book.author}:undefined,image:book.cover_url||undefined,description:book.review||undefined,inLanguage:book.language==='English'?'en':'zh-CN'}}))}};return <main className="books-page"><StructuredData data={schema}/><nav><Link href="/" aria-label="CHRIS / FIELD NOTES 首页"><Logo compact/></Link><span>READING SYSTEM / 书单</span></nav><header className="books-hero"><small>LIBRARY INDEX / {String(books.length).padStart(3,'0')}</small><h1>读过的书，<em>正在形成的判断。</em></h1><p>书名不是收藏品。这里保存阅读状态、短评、专题书单，以及一本书如何进入后续写作。</p></header><BooksClient initialBooks={books}/></main>}
