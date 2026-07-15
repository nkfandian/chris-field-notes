'use client'

export async function requestIndexing(paths){
  try{await fetch('/api/indexnow',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({paths})})}catch{}
}
