import {createClient,isConfigured} from '@/lib/supabase/server'
import BooksClient from './books-client'
import SiteHeader from '../components/site-header'
import SiteFooter from '../components/site-footer'
import StructuredData from '../components/structured-data'
import {SITE_LANGUAGE,SITE_URL,pageMetadata} from '@/lib/seo'
import './books.css'
export const revalidate=60
export const metadata=pageMetadata({title:'书单',description:'读过的一百多本中英文书，附评分、短评与专题书单：中国近现代史、政治、非虚构、何伟作品、《红楼梦》多个版本等，可按语言和专题筛选。',path:'/books',keywords:['已读书单','中文书评','英文书单','中国近现代史','何伟','红楼梦版本']})
export default async function BooksPage(){let books=[];if(isConfigured()){const db=await createClient();const {data}=await db.from('books').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:false});books=data||[]}const schema={'@context':'https://schema.org','@type':'CollectionPage',name:'书单',description:'读过的一百多本中英文书，附评分、短评与专题书单。',url:`${SITE_URL}/books`,inLanguage:SITE_LANGUAGE,mainEntity:{'@type':'ItemList',numberOfItems:books.length,itemListElement:books.map((book,index)=>({'@type':'ListItem',position:index+1,url:`${SITE_URL}/books#book-${book.id}`,item:{'@type':'Book','@id':`${SITE_URL}/books#book-${book.id}`,name:book.title,author:book.author?{'@type':'Person',name:book.author}:undefined,image:book.cover_url||undefined,description:book.review||undefined,inLanguage:book.language==='English'?'en':'zh-CN'}}))}};return <><SiteHeader current="books"/><main className="books-page" id="content"><StructuredData data={schema}/><header className="books-head"><h1>书单</h1></header><BooksClient initialBooks={books}/></main><SiteFooter/></>}
