import { $, $$, api, escape, action, share, uploadForm, wireUpload, reportButton, wireReports } from '/locales/en/shared/ui.js';
export async function mount(){
  let page=0,category='',sort='new',query='',request=0;
  const {categories}=await import('/locales/en/shared/editorial.js');
  $('#app').innerHTML=`<div class="row between"><div class="row tabs" id="categories">${[{value:'',label:'All'},...categories].map((c,i)=>`<button class="secondary" aria-pressed="${i===0}" data-category="${c.value}">${c.label}</button>`).join('')}</div><label>Sort by<select id="sort"><option value="new">Newest first</option><option value="top">Most voted</option></select></label></div><form id="search-finds" class="row section-gap"><label for="find-query">Search finds</label><input id="find-query" name="query" maxlength="80" placeholder="Title or description"><button type="submit" class="secondary">Search</button></form><section id="feed" class="finds-grid section-gap"></section><div class="row section-gap"><button id="prev" class="secondary">← Back</button><span id="page" class="small muted"></span><button id="next" class="secondary">Next →</button></div><section class="split section-gap"><div class="stack"><h2>Found something wonderful?</h2><p class="muted">A sign with personality, a mysterious notice, or an inexplicable object. Take a photo and add it to the collection.</p><p class="small muted">Remove other people’s faces, phone numbers, and personal details before uploading. Submissions are reviewed.</p></div>${uploadForm('finds')}</section>`;
  async function load(){const current=++request;const data=await api(`/api/finds?page=${page}&category=${encodeURIComponent(category)}&sort=${sort}&q=${encodeURIComponent(query)}`);if(current!==request)return;
    $('#feed').innerHTML=data.entries.length?data.entries.map(post=>`<article class="panel find-card" id="find-${escape(post.id)}"><img src="/media/${escape(post.id)}" width="480" height="320" alt="${escape(post.title)}" loading="lazy"><div class="find-card-content"><p class="small muted">${escape(post.categoryLabel??post.category)}</p><h3>${escape(post.title)}</h3>${post.body?`<p class="small">${escape(post.body)}</p>`:''}<div class="row between"><button class="vote secondary" data-id="${escape(post.id)}" ${post.voted?'disabled':''}>${post.voted?'✓':'↑'} ${post.votes}</button><button class="text-button share" data-id="${escape(post.id)}">Share ↗</button></div>${reportButton(post.id)}</div></article>`).join(''):'<div class="empty panel"><h3>No finds yet</h3><p class="muted">Try a different search or add a photo.</p></div>';
    $('#prev').disabled=page===0;$('#next').disabled=!data.hasMore;$('#page').textContent=`Page ${page+1}`;
    $$('.vote').forEach(button=>action(button,async()=>{await api('/api/finds/vote',{id:button.dataset.id});await load();}));
    $$('.share').forEach(button=>action(button,()=>share(`${location.origin}/finds/?item=${button.dataset.id}#find-${button.dataset.id}`,'Odd Finds')));wireReports();
  }
  action($('#search-finds'),async()=>{query=$('#find-query').value.trim();page=0;await load();},'submit');
  $$('#categories button').forEach(button=>action(button,async()=>{category=button.dataset.category;page=0;$$('#categories button').forEach(b=>b.setAttribute('aria-pressed',b===button));await load();}));
  $('#sort').addEventListener('change',()=>{sort=$('#sort').value;page=0;load().catch(error=>{import('/locales/en/shared/ui.js').then(({toast})=>toast(error.message));});});
  action($('#prev'),async()=>{if(page>0)page--;await load();});action($('#next'),async()=>{page++;await load();});wireUpload('finds');await load();
  const item=new URLSearchParams(location.search).get('item');
  if(item&&!document.getElementById(`find-${item}`)){
    // A direct item URL is resolved independently of pagination by the server.
    const post=await api(`/api/find?id=${encodeURIComponent(item)}`);
    $('#feed').innerHTML=`<article class="panel stack"><img src="/media/${escape(post.id)}" width="1000" height="700" alt="${escape(post.title)}"><h2>${escape(post.title)}</h2><p>${escape(post.body)}</p><a href="/finds/">All discoveries →</a>${reportButton(post.id)}</article>`;wireReports();
  }
}
