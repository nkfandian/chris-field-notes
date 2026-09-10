'use client'

import {useRef} from 'react'

const tools = [
  ['h2','H2','小标题'],['h3','H3','三级标题'],['bold','B','加粗'],['italic','I','斜体'],['strike','S','删除线'],
  ['ul','•','无序列表'],['ol','1.','有序列表'],['quote','“','引用'],['center','↔','居中'],['center-bold','B↔','居中加粗'],
  ['link','↗','链接'],['image','▧','图片'],['hr','—','分隔线'],['clear','Tx','清除格式']
]

function linePrefix(value,prefix) {
  return value.split('\n').map(line => `${prefix}${line.replace(/^#{1,6}\s+|^>\s?|^[-*+]\s+|^\d+\.\s+/,'')}`).join('\n')
}

export default function MarkdownEditor({value,onChange}) {
  const textareaRef = useRef(null)
  function update(next,selectionStart,selectionEnd) {
    onChange(next)
    requestAnimationFrame(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(selectionStart,selectionEnd)
    })
  }
  function apply(kind) {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart, end = textarea.selectionEnd
    const selected = value.slice(start,end) || (kind==='link'?'链接文字':kind==='image'?'图片说明':'选中的文字')
    let replacement = selected, nextStart = start, nextEnd = start + selected.length
    if (kind==='bold') replacement=`**${selected}**`, nextStart=start+2, nextEnd=nextStart+selected.length
    if (kind==='italic') replacement=`*${selected}*`, nextStart=start+1, nextEnd=nextStart+selected.length
    if (kind==='strike') replacement=`~~${selected}~~`, nextStart=start+2, nextEnd=nextStart+selected.length
    if (kind==='h2') replacement=linePrefix(selected,'## '), nextStart=start+3, nextEnd=start+replacement.length
    if (kind==='h3') replacement=linePrefix(selected,'### '), nextStart=start+4, nextEnd=start+replacement.length
    if (kind==='ul') replacement=linePrefix(selected,'- '), nextStart=start, nextEnd=start+replacement.length
    if (kind==='ol') replacement=selected.split('\n').map((line,index)=>`${index+1}. ${line.replace(/^\d+\.\s+/,'')}`).join('\n'), nextStart=start, nextEnd=start+replacement.length
    if (kind==='quote') replacement=linePrefix(selected,'> '), nextStart=start, nextEnd=start+replacement.length
    if (kind==='center') replacement=`:::center\n${selected}\n:::`, nextStart=start+10, nextEnd=nextStart+selected.length
    if (kind==='center-bold') replacement=`:::center-bold\n${selected}\n:::`, nextStart=start+15, nextEnd=nextStart+selected.length
    if (kind==='link') replacement=`[${selected}](https://example.com)`, nextStart=start+selected.length+3, nextEnd=nextStart+'https://example.com'.length
    if (kind==='image') replacement=`![${selected}](https://example.com/image.jpg)`, nextStart=start+selected.length+4, nextEnd=nextStart+'https://example.com/image.jpg'.length
    if (kind==='hr') replacement='\n---\n', nextStart=start+1, nextEnd=nextStart+3
    if (kind==='clear') replacement=selected.replace(/\*\*|__|~~|[`*_]/g,''), nextStart=start, nextEnd=start+replacement.length
    update(value.slice(0,start)+replacement+value.slice(end),nextStart,nextEnd)
  }
  return <div className="markdown-editor">
    <div className="markdown-toolbar" role="toolbar" aria-label="正文格式工具">
      <div className="toolbar-group">{tools.slice(0,5).map(([kind,label,title])=><button type="button" key={kind} onClick={()=>apply(kind)} aria-label={title} title={title} className={kind==='italic'?'toolbar-italic':''}>{label}</button>)}</div>
      <div className="toolbar-group">{tools.slice(5,10).map(([kind,label,title])=><button type="button" key={kind} onClick={()=>apply(kind)} aria-label={title} title={title}>{label}</button>)}</div>
      <div className="toolbar-group">{tools.slice(10).map(([kind,label,title])=><button type="button" key={kind} onClick={()=>apply(kind)} aria-label={title} title={title}>{label}</button>)}</div>
    </div>
    <textarea ref={textareaRef} className="body" rows="16" value={value||''} onChange={event=>onChange(event.target.value)} aria-label="正文内容" />
    <details className="markdown-help"><summary>格式说明</summary><p>选择文字后点击工具按钮，链接和图片按钮会插入示例地址，请替换为实际地址。</p><div><code>## 小标题</code><code>**加粗**</code><code>*斜体*</code><code>- 列表项</code><code>&gt; 引用</code><code>:::center-bold</code></div></details>
  </div>
}
