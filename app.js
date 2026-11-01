'use strict';
const $=id=>document.getElementById(id);
const audio=$('audio');
let currentId=null,objectURL=null,lastSave=0;
const dbPromise=new Promise((resolve,reject)=>{
  const req=indexedDB.open('moje-audio',1);
  req.onupgradeneeded=()=>{req.result.createObjectStore('tracks',{keyPath:'id'})};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error);
});
async function databaseOperation(mode,action){
  const db=await dbPromise;
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('tracks',mode),store=tx.objectStore('tracks');
    let result;
    try {const request=action(store);if(request){request.onsuccess=()=>{result=request.result};request.onerror=()=>reject(request.error)}}catch(err){reject(err);return}
    tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
}
const getTrack=id=>databaseOperation('readonly',s=>s.get(id));
const allTracks=()=>databaseOperation('readonly',s=>s.getAll());
const storeTrack=track=>databaseOperation('readwrite',s=>s.put(track));
const deleteTrack=id=>databaseOperation('readwrite',s=>s.delete(id));
function status(text){$('notice').textContent=text}
function format(seconds){if(!Number.isFinite(seconds))return '00:00';let n=Math.floor(seconds);const h=Math.floor(n/3600),m=Math.floor(n%3600/60),s=n%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
function human(bytes){return (bytes/1024/1024).toFixed(1)+' MB'}
async function updateStorage(){if(!navigator.storage?.estimate)return;const info=await navigator.storage.estimate();$('storage').textContent=`Pamięć używana: ~${human(info.usage||0)}; limit szacunkowy: ${human(info.quota||0)}`}
async function renderLibrary(){const list=(await allTracks()).sort((a,b)=>b.added-a.added),holder=$('library');holder.replaceChildren();if(!list.length){holder.textContent='Nie masz jeszcze nagrań.';return}
  for(const item of list){const row=document.createElement('div');row.className='track';const pick=document.createElement('button');pick.className='pick';const name=document.createElement('strong');name.textContent=item.name;const details=document.createElement('small');details.textContent=`${human(item.size)} • zapisano ${format(item.position||0)}`;pick.append(name,details);pick.addEventListener('click',()=>playTrack(item.id));const remove=document.createElement('button');remove.className='remove';remove.textContent='Usuń';remove.addEventListener('click',async()=>{if(!confirm(`Usunąć z biblioteki: ${item.name}?`))return;if(item.id===currentId)closeTrack();await deleteTrack(item.id);await renderLibrary();await updateStorage()});row.append(pick,remove);holder.append(row)}
}
function closeTrack(){audio.pause();audio.removeAttribute('src');audio.load();if(objectURL)URL.revokeObjectURL(objectURL);objectURL=null;currentId=null;$('title').textContent='Nie wybrano nagrania';$('seek').disabled=true;for(const b of ['toggle','back','forward'])$(b).disabled=true;syncPlayer()}
async function playTrack(id){try{if(currentId!==null)await saveProgress();const track=await getTrack(id);if(!track)return;closeTrack();currentId=id;objectURL=URL.createObjectURL(track.file);audio.src=objectURL;audio.playbackRate=Number($('speed').value);$('title').textContent=track.name;for(const b of ['toggle','back','forward'])$(b).disabled=false;$('seek').disabled=false;
  audio.addEventListener('loadedmetadata',function onMetadata(){audio.removeEventListener('loadedmetadata',onMetadata);if(Number.isFinite(audio.duration)&&track.position>0)audio.currentTime=Math.min(track.position,Math.max(0,audio.duration-0.5));syncPlayer()},{once:true});
  if('mediaSession'in navigator){navigator.mediaSession.metadata=new MediaMetadata({title:track.name,artist:'Moje Audio'});for(const [name,action] of [['play',()=>audio.play()],['pause',()=>audio.pause()],['seekbackward',()=>seekBy(-15)],['seekforward',()=>seekBy(30)]]){try{navigator.mediaSession.setActionHandler(name,action)}catch{}}}
  await audio.play();syncPlayer();status('Odtwarzanie: '+track.name)
}catch(err){status('Nie można odtworzyć pliku. Sprawdź kodek audio. '+err.message)}}
function seekBy(delta){if(Number.isFinite(audio.duration))audio.currentTime=Math.max(0,Math.min(audio.duration,audio.currentTime+delta))}
function syncPlayer(){$('toggle').textContent=audio.paused?'Odtwórz':'Pauza';$('elapsed').textContent=format(audio.currentTime);$('duration').textContent=format(audio.duration);$('seek').value=Number.isFinite(audio.duration)&&audio.duration>0?String(100*audio.currentTime/audio.duration):'0';if('mediaSession'in navigator)navigator.mediaSession.playbackState=audio.paused?'paused':'playing'}
async function saveProgress(){if(currentId===null)return;const track=await getTrack(currentId);if(!track)return;track.position=Number.isFinite(audio.currentTime)?audio.currentTime:0;if(audio.ended)track.position=0;await storeTrack(track)}
$('files').addEventListener('change',async event=>{const files=[...event.target.files];if(!files.length)return;status(`Importuję ${files.length} plik(ów)...`);let done=0;for(const file of files){if(!/\.(mp3|mp4)$/i.test(file.name)){status('Pominięto nieobsługiwany format: '+file.name);continue}try{await storeTrack({id:crypto.randomUUID(),name:file.name,file,size:file.size,position:0,added:Date.now()+done});done++}catch(err){status(`Błąd importu ${file.name}: ${err.name}. Być może zabrakło miejsca.`);break}}event.target.value='';await renderLibrary();await updateStorage();if(done===files.length)status(`Zaimportowano ${done} plik(ów). Oryginały zachowaj w aplikacji Pliki.`)});
$('toggle').addEventListener('click',()=>audio.paused?audio.play().catch(err=>status(err.message)):audio.pause());$('back').addEventListener('click',()=>seekBy(-15));$('forward').addEventListener('click',()=>seekBy(30));$('seek').addEventListener('input',event=>{if(Number.isFinite(audio.duration))audio.currentTime=audio.duration*Number(event.target.value)/100});$('speed').addEventListener('change',()=>{audio.playbackRate=Number($('speed').value)});
audio.addEventListener('timeupdate',()=>{syncPlayer();if(Date.now()-lastSave>5000){lastSave=Date.now();saveProgress().catch(console.error)}});for(const event of ['pause','ended','seeking'])audio.addEventListener(event,()=>{syncPlayer();saveProgress().catch(console.error)});audio.addEventListener('play',syncPlayer);audio.addEventListener('error',()=>status('Odtwarzanie nie powiodło się. MP4 może zawierać nieobsługiwany kodek.'));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveProgress().catch(console.error)});
(async()=>{try{await dbPromise;await renderLibrary();await updateStorage();if(navigator.storage?.persist){const granted=await navigator.storage.persist();if(granted)status('Pamięć trwała została przyznana. Zachowaj mimo to kopie nagrań.')}if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(console.error)}catch(err){status('Nie można otworzyć lokalnej bazy danych: '+err.message)}})();
