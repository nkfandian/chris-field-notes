const header=document.querySelector('.site-header');
const menu=document.querySelector('.menu-button');
menu.addEventListener('click',()=>{const open=header.classList.toggle('nav-open');menu.setAttribute('aria-expanded',String(open))});

const filterButtons=[...document.querySelectorAll('.filters button')];
const entries=[...document.querySelectorAll('.entry')];
filterButtons.forEach(button=>button.addEventListener('click',()=>{
  filterButtons.forEach(item=>item.classList.remove('active'));button.classList.add('active');
  entries.forEach(entry=>entry.classList.toggle('is-hidden',button.dataset.filter!=='all'&&entry.dataset.domain!==button.dataset.filter));
}));

const drawer=document.querySelector('.drawer');
const backdrop=document.querySelector('.drawer-backdrop');
const closeButton=document.querySelector('.drawer-close');
let lastTrigger;
function openDrawer(entry,trigger){
  const [date,thesis,tools]=entry.dataset.meta.split('|');lastTrigger=trigger;
  drawer.querySelector('[data-meta-date]').textContent=date;
  drawer.querySelector('[data-meta-thesis]').textContent=thesis;
  drawer.querySelector('[data-meta-tools]').textContent=tools;
  drawer.classList.add('open');backdrop.classList.add('open');drawer.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';closeButton.focus();
}
function closeDrawer(){drawer.classList.remove('open');backdrop.classList.remove('open');drawer.setAttribute('aria-hidden','true');document.body.style.overflow='';lastTrigger?.focus()}
document.querySelectorAll('.info').forEach(button=>button.addEventListener('click',event=>openDrawer(event.currentTarget.closest('.entry'),event.currentTarget)));
closeButton.addEventListener('click',closeDrawer);backdrop.addEventListener('click',closeDrawer);document.addEventListener('keydown',event=>{if(event.key==='Escape')closeDrawer()});

const count=document.querySelector('[data-count]');
const target=Number(count.dataset.count);let current=0;
const observer=new IntersectionObserver(([item])=>{if(!item.isIntersecting)return;const timer=setInterval(()=>{current=Math.min(target,current+4);count.textContent=String(current).padStart(3,'0');if(current===target)clearInterval(timer)},24);observer.disconnect()},{threshold:.6});observer.observe(count);

const revealObserver=new IntersectionObserver(items=>items.forEach(item=>{if(item.isIntersecting){item.target.animate([{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'none'}],{duration:650,easing:'cubic-bezier(.2,.7,.2,1)',fill:'both'});revealObserver.unobserve(item.target)}}),{threshold:.08});
document.querySelectorAll('.entry,.domain-grid article,.section-label').forEach(item=>revealObserver.observe(item));
