'use strict';
const $=id=>document.getElementById(id);
const audio=$('audio');
const DEFAULT='default';
let currentId=null, objectURL=null, currentFolder=DEFAULT, queueFolder=null, lastSave=0, transition=false;
const dbPromise=new Promise((resolve,reject)=>{
  const req=indexedDB.open('moje-audio',2);
  req.onupgradeneeded=()=>{
    const db=req.result;
    if(!db.objectStoreNames.contains('tracks'))db.createObjectStore('tracks',{keyPath:'id'});
    if(!db.objectStoreNames.contains('folders'))db.createObjectStore('folders',{keyPath:'id'});
  };
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
});
async function op(store,mode,fn){const db=await dbPromise;return new Promise((resolve,reject)=>{const tx=db.transaction(store,mode);let result;try{const req=fn(tx.objectStore(store));if(req){req.onsuccess=()=>result=req.result;req.onerror=()=>reject(req.error)}}catch(e){reject(e);return}tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
const allTracks=()=>op('tracks','readonly',s=>s.getAll());
const getTrack=id=>op('tracks','readonly',s=>s.get(id));
const storeTrack=t=>op('tracks','readwrite',s=>s.put(t));
const deleteTrack=id=>op('tracks','readwrite',s=>s.delete(id));
const allFolders=()=>op('folders','readonly',s=>s.getAll());
const storeFolder=f=>op('folders','readwrite',s=>s.put(f));
const deleteFolder=id=>op('folders','readwrite',s=>s.delete(id));
const folderOf=t=>t.folderId||DEFAULT;
const sorted=ts=>ts.sort((a,b)=>(a.order??a.added??0)-(b.order??b.added??0)||a.name.localeCompare(b.name,'pl'));
const folderTracks=async id=>sorted((await allTracks()).filter(t=>folderOf(t)===id));
function status(s){$('notice').textContent=s}
function format(n){if(!Number.isFinite(n))return '00:00';n=Math.floor(n);const h=Math.floor(n/3600),m=Math.floor(n%3600/60),s=n%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
function human(n){return(n/1024/1024).toFixed(1)+' MB'}
async function updateStorage(){if(!navigator.storage?.estimate)return;try{const s=await navigator.storage.estimate();$('storage').textContent=`Pamięć: ~${human(s.usage||0)} / szacowany limit ${human(s.quota||0)}`}catch{}}
async function refresh(){const folders=(await allFolders()).sort((a,b)=>a.created-b.created);const tracks=await allTracks();const holder=$('folders');holder.replaceChildren();for(const folder of folders){const count=tracks.filter(t=>folderOf(t)===folder.id).length;const btn=document.createElement('button');btn.className='folder'+(folder.id===currentFolder?' selected':'');btn.textContent=`📁 ${folder.name} (${count})`;btn.addEventListener('click',()=>{currentFolder=folder.id;refresh()});holder.append(btn)}
  const active=folders.find(f=>f.id===currentFolder)||folders[0];if(!active)return;currentFolder=active.id;$('folderTitle').textContent=active.name;$('removeFolder').hidden=currentFolder===DEFAULT;
  const list=sorted(tracks.filter(t=>folderOf(t)===currentFolder)),library=$('library');library.replaceChildren();$('playFolder').disabled=!list.length;
  if(!list.length){library.textContent='Ten katalog jest pusty. Dodaj nagrania.';return}
  for(let i=0;i<list.length;i++){const item=list[i],row=document.createElement('div');row.className='track';const play=document.createElement('button');play.className='pick';const name=document.createElement('strong');name.textContent=`${i+1}. ${item.name}`;const details=document.createElement('small');details.textContent=`${human(item.size)} · pozycja: ${format(item.position||0)}`;play.append(name,details);play.addEventListener('click',()=>playTrack(item.id,currentFolder));const controls=document.createElement('div');controls.className='track-controls';
    const up=document.createElement('button');up.textContent='↑';up.title='Przesuń wyżej';up.disabled=i===0;up.addEventListener('click',()=>reorder(list,i,-1));
    const down=document.createElement('button');down.textContent='↓';down.title='Przesuń niżej';down.disabled=i===list.length-1;down.addEventListener('click',()=>reorder(list,i,1));
    const move=document.createElement('button');move.textContent='Przenieś';move.title='Przenieś do katalogu';move.addEventListener('click',()=>moveTrack(item));
    const remove=document.createElement('button');remove.className='remove';remove.textContent='Usuń';remove.addEventListener('click',async()=>{if(!confirm(`Usunąć nagranie „${item.name}” z pamięci aplikacji?`))return;if(currentId===item.id)closeTrack();await deleteTrack(item.id);await refresh();await updateStorage()});
    controls.append(up,down,move,remove);row.append(play,controls);library.append(row)}
}
async function reorder(list,index,delta){const a=list[index],b=list[index+delta];if(!b)return;const x=a.order??a.added??0,y=b.order??b.added??0;a.order=y;b.order=x;await storeTrack(a);await storeTrack(b);await refresh()}
async function moveTrack(track){const folders=await allFolders();const options=folders.map((f,i)=>`${i+1}: ${f.name}`).join('\n');const answer=prompt(`Przenieś „${track.name}” do katalogu:\n${options}\n\nPodaj numer:`);if(answer===null)return;const destination=folders[Number(answer)-1];if(!destination){status('Niepoprawny numer katalogu.');return}if(destination.id===folderOf(track))return;track.folderId=destination.id;track.order=Date.now();await storeTrack(track);if(track.id===currentId)queueFolder=null;await refresh();status(`Przeniesiono do: ${destination.name}`)}
function closeTrack(){audio.pause();audio.removeAttribute('src');audio.load();if(objectURL)URL.revokeObjectURL(objectURL);objectURL=null;currentId=null;queueFolder=null;$('title').textContent='Nie wybrano nagrania';$('context').textContent='';$('seek').disabled=true;for(const b of ['toggle','back','forward'])$(b).disabled=true;syncPlayer()}
async function playTrack(id,folderId,reset=false){try{if(currentId!==null)await saveProgress();const track=await getTrack(id);if(!track)return;closeTrack();currentId=id;queueFolder=folderId||folderOf(track);objectURL=URL.createObjectURL(track.file);audio.src=objectURL;audio.playbackRate=Number($('speed').value);$('title').textContent=track.name;const folder=(await allFolders()).find(f=>f.id===queueFolder);$('context').textContent=`Pętla katalogu: ${folder?.name||'Brak'}`;for(const b of ['toggle','back','forward'])$(b).disabled=false;$('seek').disabled=false;
 audio.addEventListener('loadedmetadata',function seekSaved(){audio.removeEventListener('loadedmetadata',seekSaved);if(Number.isFinite(audio.duration)&&!reset&&track.position>0)audio.currentTime=Math.min(track.position,Math.max(0,audio.duration-0.5));syncPlayer()},{once:true});
 if('mediaSession'in navigator){navigator.mediaSession.metadata=new MediaMetadata({title:track.name,artist:folder?.name||'Moje Audio'});for(const [action,fn] of [['play',()=>audio.play()],['pause',()=>audio.pause()],['seekbackward',()=>seekBy(-15)],['seekforward',()=>seekBy(30)],['nexttrack',()=>nextTrack()],['previoustrack',()=>previousTrack()]])try{navigator.mediaSession.setActionHandler(action,fn)}catch{}}
 await audio.play();syncPlayer();status('Odtwarzanie: '+track.name)
}catch(err){status('Błąd odtwarzania: '+err.message)}}
async function saveProgress(id=currentId,position=audio.currentTime){if(id===null)return;const track=await getTrack(id);if(!track)return;track.position=Number.isFinite(position)?position:0;await storeTrack(track)}
async function nextTrack(){if(transition||currentId===null||!queueFolder)return;transition=true;try{const tracks=await folderTracks(queueFolder);if(!tracks.length){closeTrack();return}const index=tracks.findIndex(t=>t.id===currentId);const next=tracks[(index+1)%tracks.length];await playTrack(next.id,queueFolder,true)}finally{transition=false}}
async function previousTrack(){if(transition||currentId===null||!queueFolder)return;transition=true;try{const tracks=await folderTracks(queueFolder);if(!tracks.length)return;const index=tracks.findIndex(t=>t.id===currentId);await playTrack(tracks[(index-1+tracks.length)%tracks.length].id,queueFolder,true)}finally{transition=false}}
function seekBy(delta){if(Number.isFinite(audio.duration))audio.currentTime=Math.max(0,Math.min(audio.duration,audio.currentTime+delta))}
function syncPlayer(){$('toggle').textContent=audio.paused?'Odtwórz':'Pauza';$('elapsed').textContent=format(audio.currentTime);$('duration').textContent=format(audio.duration);$('seek').value=Number.isFinite(audio.duration)&&audio.duration>0?String(audio.currentTime/audio.duration*100):'0';if('mediaSession'in navigator)navigator.mediaSession.playbackState=audio.paused?'paused':'playing'}
$('createFolder').addEventListener('click',async()=>{const name=prompt('Nazwa nowego katalogu:')?.trim();if(!name)return;if(name.length>80){status('Nazwa katalogu jest za długa.');return}const id=crypto.randomUUID();await storeFolder({id,name,created:Date.now()});currentFolder=id;await refresh()});
$('removeFolder').addEventListener('click',async()=>{if(currentFolder===DEFAULT)return;const id=currentFolder,folders=await allFolders(),folder=folders.find(f=>f.id===id);if(!confirm(`Usunąć katalog „${folder?.name}”? Jego nagrania zostaną przeniesione do „Bez katalogu” (nie będą kasowane).`))return;for(const track of await folderTracks(id)){track.folderId=DEFAULT;track.order=Date.now()+Math.random();await storeTrack(track)}if(queueFolder===id)queueFolder=null;await deleteFolder(id);currentFolder=DEFAULT;await refresh()});
$('playFolder').addEventListener('click',async()=>{const list=await folderTracks(currentFolder);if(list.length)await playTrack(list[0].id,currentFolder,true)});
$('files').addEventListener('change',async e=>{const files=[...e.target.files];if(!files.length)return;const folderId=currentFolder;status(`Importuję ${files.length} plik(ów)...`);let done=0;for(const file of files){if(!/\.(mp3|mp4)$/i.test(file.name))continue;try{await storeTrack({id:crypto.randomUUID(),name:file.name,file,size:file.size,position:0,added:Date.now()+done,order:Date.now()+done,folderId});done++}catch(err){status(`Nie udało się dodać ${file.name}: ${err.message}`);break}}e.target.value='';await refresh();await updateStorage();if(done===files.length)status(`Dodano ${done} plik(ów) do katalogu. Zachowaj oryginały w Plikach.`)});
$('toggle').addEventListener('click',()=>audio.paused?audio.play().catch(e=>status(e.message)):audio.pause());$('back').addEventListener('click',()=>seekBy(-15));$('forward').addEventListener('click',()=>seekBy(30));$('prev').addEventListener('click',previousTrack);$('next').addEventListener('click',nextTrack);$('seek').addEventListener('input',e=>{if(Number.isFinite(audio.duration))audio.currentTime=audio.duration*Number(e.target.value)/100});$('speed').addEventListener('change',()=>audio.playbackRate=Number($('speed').value));
audio.addEventListener('ended',async()=>{const id=currentId;if(id!==null)await saveProgress(id,0);await nextTrack()});audio.addEventListener('timeupdate',()=>{syncPlayer();if(Date.now()-lastSave>5000&&!audio.ended){lastSave=Date.now();saveProgress().catch(console.error)}});for(const ev of ['pause','seeking'])audio.addEventListener(ev,()=>{syncPlayer();if(!audio.ended)saveProgress().catch(console.error)});audio.addEventListener('play',syncPlayer);audio.addEventListener('error',()=>status('Nie można odtworzyć: MP4 może mieć nieobsługiwany kodek.'));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&!audio.ended)saveProgress().catch(console.error)});
(async()=>{try{await dbPromise;const folders=await allFolders();if(!folders.some(f=>f.id===DEFAULT))await storeFolder({id:DEFAULT,name:'Bez katalogu',created:0});await refresh();await updateStorage();if(navigator.storage?.persist)navigator.storage.persist().catch(()=>{});if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(console.error)}catch(err){status('Błąd lokalnej bazy: '+err.message)}})();
