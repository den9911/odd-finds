import { $, $$, api, escape, action, share, uploadForm, wireUpload, reportButton, wireReports } from '/locales/ru/shared/ui.js';
export async function mount(){
  let page=0,category='',sort='new',query='',request=0;
  const {categories}=await import('/locales/ru/shared/editorial.js');
  $('#app').innerHTML=`<div class="row between"><div class="row tabs" id="categories">${[{value:'',label:'Все'},...categories].map((c,i)=>`<button class="secondary" aria-pressed="${i===0}" data-category="${c.value}">${c.label}</button>`).join('')}</div><label>Порядок<select id="sort"><option value="new">Сначала новые</option><option value="top">Больше голосов</option></select></label></div><form id="search-finds" class="row section-gap"><label for="find-query">Поиск находок</label><input id="find-query" name="query" maxlength="80" placeholder="Название или описание"><button type="submit" class="secondary">Найти</button></form><section id="feed" class="finds-grid section-gap"></section><div class="row section-gap"><button id="prev" class="secondary">← Назад</button><span id="page" class="small muted"></span><button id="next" class="secondary">Дальше →</button></div><section class="split section-gap"><div class="stack"><h2>Нашёл что-то прекрасное?</h2><p class="muted">Вывеску с характером, загадочное объявление или предмет, которому сложно найти объяснение. Сфотографируй и добавь в коллекцию.</p><p class="small muted">Перед отправкой убери с фото чужие лица, номера телефонов и другие личные данные. Публикации проходят проверку.</p></div>${uploadForm('finds')}</section>`;
  async function load(){const current=++request;const data=await api(`/api/finds?page=${page}&category=${encodeURIComponent(category)}&sort=${sort}&q=${encodeURIComponent(query)}`);if(current!==request)return;
    $('#feed').innerHTML=data.entries.length?data.entries.map(post=>`<article class="panel find-card" id="find-${escape(post.id)}"><img src="/media/${escape(post.id)}" width="480" height="320" alt="${escape(post.title)}" loading="lazy"><div class="find-card-content"><p class="small muted">${escape(post.categoryLabel??post.category)}</p><h3>${escape(post.title)}</h3>${post.body?`<p class="small">${escape(post.body)}</p>`:''}<div class="row between"><button class="vote secondary" data-id="${escape(post.id)}" ${post.voted?'disabled':''}>${post.voted?'✓':'↑'} ${post.votes}</button><button class="text-button share" data-id="${escape(post.id)}">Поделиться ↗</button></div>${reportButton(post.id)}</div></article>`).join(''):'<div class="empty panel"><h3>Находок пока нет</h3><p class="muted">Попробуй изменить поиск или добавь фотографию.</p></div>';
    $('#prev').disabled=page===0;$('#next').disabled=!data.hasMore;$('#page').textContent=`Страница ${page+1}`;
    $$('.vote').forEach(button=>action(button,async()=>{await api('/api/finds/vote',{id:button.dataset.id});await load();}));
    $$('.share').forEach(button=>action(button,()=>share(`${location.origin}/finds/?item=${button.dataset.id}#find-${button.dataset.id}`,'Бюро находок')));wireReports();
  }
  action($('#search-finds'),async()=>{query=$('#find-query').value.trim();page=0;await load();},'submit');
  $$('#categories button').forEach(button=>action(button,async()=>{category=button.dataset.category;page=0;$$('#categories button').forEach(b=>b.setAttribute('aria-pressed',b===button));await load();}));
  $('#sort').addEventListener('change',()=>{sort=$('#sort').value;page=0;load().catch(error=>{import('/locales/ru/shared/ui.js').then(({toast})=>toast(error.message));});});
  action($('#prev'),async()=>{if(page>0)page--;await load();});action($('#next'),async()=>{page++;await load();});wireUpload('finds');await load();
  const item=new URLSearchParams(location.search).get('item');
  if(item&&!document.getElementById(`find-${item}`)){
    // A direct item URL is resolved independently of pagination by the server.
    const post=await api(`/api/find?id=${encodeURIComponent(item)}`);
    $('#feed').innerHTML=`<article class="panel stack"><img src="/media/${escape(post.id)}" width="1000" height="700" alt="${escape(post.title)}"><h2>${escape(post.title)}</h2><p>${escape(post.body)}</p><a href="/finds/">Все находки →</a>${reportButton(post.id)}</article>`;wireReports();
  }
}
