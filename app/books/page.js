import Link from 'next/link'
import {createClient,isConfigured} from '@/lib/supabase/server'
import BooksClient from './books-client'
import './books.css'
export const revalidate=60
export const metadata={title:'书单 / CHRIS FIELD NOTES',description:'阅读中的书、读过的书，以及它们留下的判断。'}
export default async function BooksPage(){let books=[];if(isConfigured()){const db=await createClient();const {data}=await db.from('books').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:false});books=data||[]}return <main className="books-page"><nav><Link href="/">C/ FIELD NOTES</Link><span>READING SYSTEM / 书单</span><Link href="/studio/books">EDIT ↗</Link></nav><header className="books-hero"><small>LIBRARY INDEX / {String(books.length).padStart(3,'0')}</small><h1>读过的书，<em>正在形成的判断。</em></h1><p>书名不是收藏品。这里保存阅读状态、短评、专题书单，以及一本书如何进入后续写作。</p></header><BooksClient initialBooks={books}/></main>}
