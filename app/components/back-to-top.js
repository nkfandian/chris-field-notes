'use client'
// 页脚「返回顶部」按钮。之前是纯锚点 <a href="#top">，目标是 position:sticky 的页眉，
// 在各页面点按后经常不滚动（sticky 元素的锚点定位不可靠）。改用 JS 直接滚到顶，可靠。
export default function BackToTop(){
  function scrollToTop(event){
    event.preventDefault()
    window.scrollTo({top:0,behavior:'smooth'})
  }
  return <a href="#top" onClick={scrollToTop}>返回顶部 ↑</a>
}
