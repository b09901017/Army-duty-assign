"use strict";

var PEOPLE=[{id:1,code:"01",name:"李愷宸"},{id:2,code:"02",name:"江偉綸"},{id:3,code:"03",name:"陳柏翰"},{id:4,code:"04",name:"鄧旭辰"},{id:5,code:"05",name:"廖翊滕"},{id:6,code:"06",name:"陳俊穎"},{id:7,code:"07",name:"林柏宇"},{id:8,code:"08",name:"林崇浩"}];
var ORDER=[1,2,3,4,5,6,7,8];
var PERIODS=[{key:"AM",label:"上午",meal:"早"},{key:"NOON",label:"午",meal:"午"},{key:"PM",label:"晚",meal:"晚"}];
var GROUPS=[{key:"AM",label:"上午"},{key:"NOON",label:"午"},{key:"AFT",label:"下午"},{key:"PM",label:"晚"},{key:"GC",label:"公差"}];
var C={bg:"#F1F3EE",surface:"#fff",ink:"#20261E",sub:"#6C7268",line:"#E3E5DC",green:"#3B6147",greenDeep:"#2A4634",greenSoft:"#E9EFE8",brass:"#A9793F",brassSoft:"#F5ECDB",amber:"#9A6B14",amberSoft:"#F7EFDB",red:"#B0453C",redSoft:"#F6E5E2"};
var PAL=["#3B6147","#4E6E8E","#8E5A6E","#6E7D3D","#B06A3C","#4C7D74","#7A6BA8","#997A2E","#A65A5A","#5B8C6E","#54708A","#8A6D3B","#6B5B95","#3F7D6E","#A34E5E","#5F8C3A","#7E6248","#4670A0","#9C5B7C","#4A8577"];
var STORE_KEY="duty-board-v3";
/* 雲端同步網址：部署 Apps Script 後，把 /exec 網址貼到下面這一行（只需改這一行）。
   填好後全隊用同一份 index.html 就會自動連到同一份試算表，App 內不用再輸入網址。
   留空字串則沿用舊的「手動輸入網址」流程，不會壞。 */
var DEFAULT_SYNC_URL="https://script.google.com/macros/s/AKfycbwDGPUZUg4JTEDHzbcqkSTsIEcbxVMgtrJofsvJu1cOzp3u377k188T7a04HJCRCfRW/exec";
/* 編輯密碼：預設鎖住＝唯讀。你自己開一次 網址?edit=0000 或點右上「唯讀」輸入密碼即可永久解鎖本機。
   想換密碼改這一行；想在自己手機切回唯讀預覽，開 網址?edit=lock。 */
var EDIT_CODE="0000";
function checkUnlock(){
  try{
    var q=((typeof location!=="undefined"&&location.search)||"")+" "+((typeof location!=="undefined"&&location.hash)||"");
    var m=q.match(/edit=([0-9A-Za-z]+)/);
    if(m){if(m[1]==="lock"){localStorage.removeItem("duty-edit-ok");return false;}if(m[1]===EDIT_CODE){localStorage.setItem("duty-edit-ok","1");return true;}}
    return localStorage.getItem("duty-edit-ok")==="1";
  }catch(e){return false;}
}

var ICON={plus:'<path d="M12 5v14"/><path d="M5 12h14"/>',minus:'<path d="M5 12h14"/>',x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',check:'<path d="M20 6 9 17l-5-5"/>',rotate:'<path d="M3 12a9 9 0 1 0 9-9 9.7 9.7 0 0 0-6.7 2.7L3 8"/><path d="M3 3v5h5"/>',copy:'<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',wand:'<path d="M4 20 14 10"/><path d="m17 3 1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z"/>',trash:'<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',board:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>',chart:'<path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/>',lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 8v4l2.5 2.5"/>',pencil:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>'};
function icon(n,s,c){s=s||18;c=c||"currentColor";return '<svg width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="none" stroke="'+c+'" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+ICON[n]+'</svg>';}
function esc(s){return String(s).replace(/\uFFFD/g,"").replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];});}
function nameOf(id){return state.names[id];}
function short2(n){n=String(n||"");return n.length<=2?n:n.slice(-2);}   // 行程時間軸用：取名字後兩字
function absColor(r){return r==="補休"?C.amber:r==="大公差"?GCOLORS["大公差"]:r==="休假"?"#4C7D74":r==="其他"?C.sub:C.brass;} // 不在原因配色（自訂→古銅）
function personByCode(pid){for(var i=0;i<PEOPLE.length;i++)if(PEOPLE[i].id===pid)return PEOPLE[i];return null;}
function splitColon(line){var i=line.search(/[：:]/);if(i<0)return null;return {label:line.slice(0,i).trim(),colon:line[i],rhs:line.slice(i+1)};}
var GCOLORS={"打飯":"#C08743","公差":"#5479A6","打掃":"#4F8A6A","大公差":"#9C4A6E","小公差":"#6B5B95","站哨":"#3E7B8C","分菜":"#B06A3C"};
function deriveGroup(cat){if(cat==="大公差")return "大公差";if(cat==="小公差")return "小公差";if(/分菜/.test(cat))return "分菜";if(/(早打|午打|晚打)/.test(cat)||cat==="打飯")return "打飯";if(/公差|車場|鋁床|經理|保槍|安官|衛哨|哨/.test(cat))return "公差";return "打掃";}
function dutyGroup(d){if(d.extra==="big")return "大公差";if(d.extra==="small")return "小公差";if(d.fenca&&d.fenca!=="head")return "分菜";if(d.kind==="meal")return "打飯";return d.period==="GC"?"公差":"打掃";}
function catColor(cat){var g=(typeof HIST!=="undefined"&&HIST.cg&&HIST.cg[cat])||deriveGroup(cat);return GCOLORS[g]||"#888";}
function sum(o){var s=0;for(var k in o)s+=o[k];return s;}
function todayLabel(){var d=new Date();return (d.getMonth()+1)+"/"+d.getDate();}
// 目前這天：以 state.activeDate（點開／解析的那天）為準。雲端不傳原文 raw，別台 pull 下來 gongban.raw 是空的，
// 舊寫法會退回 schedule.date（可能是重貼的別天準則）→ 整個排班頁誤判成別天。所以一律先信 activeDate。
function curDate(){return state.activeDate||extractDate(state.gongban.raw)||(state.schedule&&state.schedule.date)||todayLabel();}
function dnum(md){var m=(md||"").match(/(\d{1,2})\/(\d{1,2})/);return m?parseInt(m[1],10)*100+parseInt(m[2],10):0;}
function mdToDate(md){var m=(md||"").match(/(\d{1,2})\/(\d{1,2})/);if(!m)return null;return new Date(new Date().getFullYear(),parseInt(m[1],10)-1,parseInt(m[2],10));}
function dateToMD(d){return (d.getMonth()+1)+"/"+d.getDate();}
function addDaysMD(md,n){var d=mdToDate(md);if(!d)return md;d.setDate(d.getDate()+n);return dateToMD(d);}
function spanMin(str){str=(str||"").replace(/\s/g,"");if(!str)return null;var p=str.split(/[-~\u301c\uff5e\u2013]/);var s=toMin(p[0]);if(s==null)return null;var e=p[1]?toMin(p[1]):s;return [s,e];}
function fmtSpan(str){var p=(str||"").replace(/\s/g,"").split(/[-~\u301c\uff5e\u2013]/);return p[1]?(hmFmt(p[0])+"\u2013"+hmFmt(p[1])):hmFmt(p[0]);}
// 排休／不在：一個人一天可以有多筆（例：補休 0530-0740 ＋ 1220-1430）。
// 存法：只有一筆時維持舊格式（物件），兩筆以上存陣列 → 舊版與試算表仍讀得到單筆。
function absOne(x){if(!x)return null;if(typeof x==="string")return {reason:x,range:""};if(!x.reason)return null;return {reason:x.reason,range:x.range||(x.until?("0530-"+x.until):"")};}
function absNorm(v){var out=[];if(!v)return out;var arr=Array.isArray(v)?v:[v];arr.forEach(function(x){var o=absOne(x);if(o)out.push(o);});
  out.sort(function(a,b){if(!a.range)return -1;if(!b.range)return 1;var x=spanMin(a.range),y=spanMin(b.range);return ((x?x[0]:0)-(y?y[0]:0));});return out;}
function absenceRecs(pid,md){return absNorm(state.absence[md]&&state.absence[md][pid]);}
function absenceRec(pid,md){var a=absenceRecs(pid,md);return a.length?a[0]:null;}   // 代表值：整天不在優先，否則最早的時段
function absentReason(pid,md){var r=absenceRec(pid,md);return r?r.reason:null;}
function fullDayOut(pid,md){return absenceRecs(pid,md).some(function(r){return !r.range;});}
function restRange(pid,md){var r=absenceRecs(pid,md).filter(function(x){return x.range;});return r.length?r[0].range:"";}
function restBlock(pid,duty){var d=spanMin(duty.schedTime||duty.time||"");if(!d)return null;var hit=null;
  absenceRecs(pid,curDate()).forEach(function(rec){if(hit||!rec.range)return;var r=spanMin(rec.range);if(!r)return;if(d[0]<r[1]&&d[1]>r[0])hit=(rec.reason||"補休")+" "+fmtSpan(rec.range);});
  return hit;}
function writeAbs(pid,md,list){
  list=(list||[]).filter(function(x){return x&&x.reason;});
  if(!list.length){clearAbsent(pid,md);return;}
  if(!state.absence[md])state.absence[md]={};
  state.absence[md][pid]=(list.length===1)?{reason:list[0].reason,range:list[0].range||""}:list.map(function(x){return {reason:x.reason,range:x.range||""};});}
function setAbsent(pid,md,rec){var o=absOne(rec);writeAbs(pid,md,o?[o]:[]);}          // 取代當天全部
function addAbsent(pid,md,rec){                                                        // 追加一筆（同一天可多個時段）
  var o=absOne(rec);if(!o)return;
  var list=absenceRecs(pid,md);
  if(!o.range)list=[o];                                                                // 整天不在 → 蓋掉當天其他時段
  else{list=list.filter(function(x){return x.range&&!(x.range===o.range&&x.reason===o.reason);});list.push(o);}
  writeAbs(pid,md,list);}
function delAbsentAt(pid,md,i){var list=absenceRecs(pid,md);if(i<0||i>=list.length)return;list.splice(i,1);writeAbs(pid,md,list);}
function clearAbsent(pid,md){if(state.absence[md]){delete state.absence[md][pid];if(!Object.keys(state.absence[md]).length)delete state.absence[md];}}
function personAbsences(pid){var out=[];for(var md in state.absence){absenceRecs(pid,md).forEach(function(r,i){out.push({md:md,reason:r.reason,range:r.range||"",i:i,k:dnum(md)});});}
  out.sort(function(a,b){if(a.k!==b.k)return a.k-b.k;var x=a.range?spanMin(a.range):null,y=b.range?spanMin(b.range):null;return ((x?x[0]:-1)-(y?y[0]:-1));});return out;}
function syncAvail(){var cd=curDate();PEOPLE.forEach(function(p){state.available[p.id]=!fullDayOut(p.id,cd);});}
function extractDate(t){var m=t.match(/(\d{1,2})\s*[\/月]\s*(\d{1,2})/);return m?(parseInt(m[1],10)+"/"+parseInt(m[2],10)):null;}
function pord(p){return p==="AM"?0:p==="NOON"?1:2;}

/* ---------- 狀態 ---------- */
function loadSaved(){try{var r=localStorage.getItem(STORE_KEY);if(r)return JSON.parse(r);}catch(e){}return null;}
var saved=loadSaved();
function migrateLog(s){
  if(!s)return [];
  if(s.log)return s.log;
  var entries=[];
  if(s.history){for(var id in s.history){var h=s.history[id];for(var cat in h){for(var i=0;i<h[cat];i++)entries.push({p:parseInt(id,10),c:cat});}}}
  else if(s.counts){for(var id2 in s.counts){for(var j=0;j<s.counts[id2];j++)entries.push({p:parseInt(id2,10),c:"先前紀錄"});}}
  return entries.length?[{id:1,date:"先前",entries:entries}]:[];
}
var state={
  names:(function(){var o={};PEOPLE.forEach(function(p){o[p.id]=p.name;});if(saved&&saved.names)for(var k in saved.names)o[k]=saved.names[k];return o;})(),
  log:migrateLog(saved),
  mealQueue:(function(){if(saved&&saved.mealQueue&&saved.mealQueue.length===8)return saved.mealQueue.slice();if(saved&&typeof saved.mealPtr==="number"){var p=((saved.mealPtr%8)+8)%8;return ORDER.slice(p).concat(ORDER.slice(0,p));}return ORDER.slice();})(),
  available:(function(){var o={};PEOPLE.forEach(function(p){o[p.id]=true;});return o;})(),
  gongban:{raw:"",meta:[],loaded:false},
  duties:[],
  guard:(saved&&saved.guard)?saved.guard:{raw:"",meta:[],days:[],loaded:false,committed:false},
  guardWeeks:(saved&&saved.guardWeeks)?saved.guardWeeks:{},activeGuardWeek:(saved&&saved.activeGuardWeek)?saved.activeGuardWeek:"",
  guardTally:(function(){var o={};PEOPLE.forEach(function(p){o[p.id]=0;});if(saved&&saved.guardTally)for(var k in saved.guardTally)o[k]=saved.guardTally[k];return o;})(),
  guardPaste:"",
  sheet:null,
  page:"board",
  showPaste:false,showPreview:false,
  addForm:{open:false,name:"",period:"AM",count:1,keepAll:false,extra:null,time:""},
  importOpen:false,confirmReset:false,confirmDelDay:"",backupOpen:false,showGuardPaste:false,confirmGuardClear:false,
  syncUrl:(function(){if(DEFAULT_SYNC_URL&&/script\.google\.com/.test(DEFAULT_SYNC_URL))return DEFAULT_SYNC_URL;try{return localStorage.getItem("duty-sync-url")||"";}catch(e){return "";}})(),
  syncStatus:"",syncOpen:false,
  schedule:(function(){var d=saved&&saved.schedule;return (d&&d.items)?d:{raw:"",items:[],title:"",loaded:false,date:""};})(),
  schedPaste:"",showSchedPaste:false,
  plans:(saved&&saved.plans)?saved.plans:{},
  dayView:{mode:"A",date:""},
  absence:(saved&&saved.absence)?saved.absence:{},
  absForm:{reason:"補休",start:"",len:1,range:""},
  tomb:(saved&&saved.tomb)||{},tombIds:(saved&&saved.tombIds)||{},wipe:(saved&&saved.wipe)||0,stateTs:(saved&&saved.stateTs)||0,
  evtForm:{id:null,md:"",label:"",range:"",group:"公差",people:[],keepAll:false},
  boards:(saved&&saved.boards)?saved.boards:{},
  activeDate:(saved&&saved.activeDate)?saved.activeDate:"",
  boardMode:"edit",boardOpen:false,boardView:"list",tlFree:null,tlCluster:null,tlRest:null,
  boardOthersOpen:false,daysOpen:false,guardTallyOpen:false,
  readOnly:!checkUnlock()
};
(function(){var d=state.activeDate,b=d&&state.boards[d];if(b&&b.duties){state.gongban={raw:b.raw,meta:b.meta,loaded:true};state.duties=b.duties;if(b.schedule&&b.schedule.items)state.schedule=b.schedule;}else{state.activeDate="";}})();
// 站哨多週：把舊的單週 state.guard 折進 guardWeeks（第一次升級用），並補上 activeGuardWeek
(function(){var g=state.guard;if(g&&g.loaded&&g.days&&g.days.length){var k=state.activeGuardWeek||guardWeekKey(g);if(k){state.activeGuardWeek=k;if(!state.guardWeeks[k])state.guardWeeks[k]={raw:g.raw||"",meta:g.meta||[],days:g.days||[],committed:!!g.committed,ts:Date.now()};}}})();
var pasteText="",importText="",restoreText="",syncInput="";
function saveBoard(){if(!state.activeDate||!state.gongban.loaded)return;var prev=state.boards[state.activeDate];state.boards[state.activeDate]={raw:state.gongban.raw||"",meta:state.gongban.meta,duties:state.duties,schedule:state.schedule,committed:(prev&&prev.committed)||false,wd:(prev&&prev.wd)||"",imported:!!(prev&&prev.imported),ts:Date.now()};}
function loadBoard(date){saveBoard();var b=state.boards[date];if(!b)return false;state.gongban={raw:b.raw||"",meta:b.meta||[],loaded:true};state.duties=b.duties;state.schedule=(b.schedule&&b.schedule.items)?b.schedule:{raw:"",items:[],title:"",loaded:false,date:""};state.activeDate=date;syncAvail();return true;}
function boardDates(){return Object.keys(state.boards).sort(function(a,b){return dnum(a)-dnum(b);});}
/* ---------- 站哨多週（比照 boards：active 週在 state.guard，歷史存 guardWeeks，逐週 ts 合併） ---------- */
function guardWeekKey(g){var days=(g&&g.days)||[];for(var i=0;i<days.length;i++){var mon=mondayOf(days[i].date);if(mon)return dateToMD(mon);}for(var j=0;j<days.length;j++){if(days[j].date)return days[j].date;}return "";}
function saveGuardWeek(){if(!state.guard||!state.guard.loaded||!(state.guard.days&&state.guard.days.length))return;var key=state.activeGuardWeek||guardWeekKey(state.guard);if(!key)return;state.activeGuardWeek=key;state.guardWeeks[key]={raw:state.guard.raw||"",meta:state.guard.meta||[],days:state.guard.days||[],committed:!!state.guard.committed,ts:Date.now()};}
function loadGuardWeek(key){saveGuardWeek();var w=state.guardWeeks[key];if(!w)return false;state.guard={raw:w.raw||"",meta:w.meta||[],days:w.days||[],loaded:true,committed:!!w.committed};state.activeGuardWeek=key;return true;}
function guardWeekList(){return Object.keys(state.guardWeeks).sort(function(a,b){return dnum(b)-dnum(a);});}   // 最近的週在前
function guardWeekLabel(w){var d=(w&&w.days)||[];if(!d.length)return "?";var a=d[0].date||"",b=d[d.length-1].date2||d[d.length-1].date||"";return a+(b&&b!==a?("–"+b):"");}
function persistLocal(){try{saveBoard();saveGuardWeek();localStorage.setItem(STORE_KEY,JSON.stringify({names:state.names,log:state.log,mealQueue:state.mealQueue,guard:state.guard,guardWeeks:state.guardWeeks,activeGuardWeek:state.activeGuardWeek,guardTally:state.guardTally,schedule:state.schedule,plans:state.plans,absence:state.absence,boards:state.boards,activeDate:state.activeDate,tomb:state.tomb,tombIds:state.tombIds,wipe:state.wipe,stateTs:state.stateTs}));}catch(e){}}
function persist(){state.stateTs=Date.now();dirty=true;persistLocal();pushSync();}
var SYNC_KEY="duty-sync-url",pushT=null,lastPushAt=0,pollTimer=null,pulledOk=false,pendingPush=false,dirty=false;
function slimBoards(){
  var out={};
  for(var d in state.boards){var b=state.boards[d];if(!b)continue;
    var sc=b.schedule||{};
    out[d]={meta:b.meta||[],duties:b.duties||[],wd:b.wd||"",committed:!!b.committed,imported:!!b.imported,ts:b.ts||0,
      schedule:{items:(sc.items||[]),title:sc.title||"",date:sc.date||"",loaded:!!(sc.items&&sc.items.length)}};
  }
  return out;
}
function payload(){return JSON.stringify({names:state.names,log:state.log,mealQueue:state.mealQueue,guard:state.guard,guardWeeks:state.guardWeeks,guardTally:state.guardTally,plans:state.plans,absence:state.absence,boards:slimBoards(),tomb:state.tomb,tombIds:state.tombIds,wipe:state.wipe,stateTs:state.stateTs});}
/* ---------- 合併（逐日，不整塊覆蓋）----------
   規則：同一天取「後修改的」；刪除靠墓碑 tomb[日期]=時間；清空統計靠 wipe=時間。
   這樣某支裝置資料不全時，只會補上、不會把別人的歷史削掉。 */
function mdOf(x){return String(x).replace(/[（(].*$/,"");}
function dayKey(x){var s=String(x==null?"":x).replace(/[（(].*$/,"");var m=s.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);return m?(parseInt(m[1],10)+"/"+parseInt(m[2],10)):s.trim();}
function mergeTomb(rt){var out={};for(var k in state.tomb)out[k]=state.tomb[k];for(var k2 in (rt||{}))if(!out[k2]||rt[k2]>out[k2])out[k2]=rt[k2];return out;}
function killed(md,ts,tomb,wipe){ts=ts||0;if(wipe&&ts<=wipe)return true;if(tomb[md]&&ts<=tomb[md])return true;return false;}
function mergeBoards(rem,tomb,wipe){
  var out={},keys={},d;
  for(d in state.boards)keys[d]=1;
  for(d in (rem||{}))keys[d]=1;
  for(d in keys){
    var loc=state.boards[d],r=(rem||{})[d];
    var lts=(loc&&loc.ts)||0,rts=(r&&r.ts)||0;
    var win=(!loc)?r:(!r)?loc:(rts>lts?r:loc);
    if(!win)continue;
    if(killed(d,Math.max(lts,rts),tomb,0))continue;   // 被刪掉的那天不要復活（wipe 只清統計，不清排班板）
    var sc=win.schedule||{};
    out[d]={meta:win.meta||[],duties:win.duties||[],wd:win.wd||"",committed:!!win.committed,imported:!!win.imported,ts:Math.max(lts,rts),
      raw:(loc&&loc.raw)||"",  // 原文只存本機，雲端不傳，合併時保留
      schedule:{items:sc.items||[],title:sc.title||"",date:sc.date||"",loaded:!!(sc.items&&sc.items.length),raw:(loc&&loc.schedule&&loc.schedule.raw)||""}};
  }
  return out;
}
function mergeIds(ri){var out={};for(var k in state.tombIds)out[k]=state.tombIds[k];for(var k2 in (ri||{}))if(!out[k2]||ri[k2]>out[k2])out[k2]=ri[k2];return out;}
function mergeGuardWeeks(remWeeks,remGuard){
  // 逐週合併：同一週取 ts 較新者；並把對方的單週 guard（舊版沒有 guardWeeks）折進來，避免歷史被吃掉
  var out={},keys={},k,fold=null,fk="";
  for(k in state.guardWeeks)keys[k]=1;
  for(k in (remWeeks||{}))keys[k]=1;
  if(remGuard&&remGuard.days&&remGuard.days.length){fk=guardWeekKey(remGuard);if(fk){fold={raw:remGuard.raw||"",meta:remGuard.meta||[],days:remGuard.days||[],committed:!!remGuard.committed,ts:remGuard.ts||0};keys[fk]=1;}}
  for(k in keys){
    var cands=[];
    if(state.guardWeeks[k])cands.push(state.guardWeeks[k]);
    if((remWeeks||{})[k])cands.push(remWeeks[k]);
    if(fold&&fk===k)cands.push(fold);
    if(!cands.length)continue;
    var win=cands[0];for(var i=1;i<cands.length;i++)if((cands[i].ts||0)>(win.ts||0))win=cands[i];
    out[k]={raw:win.raw||"",meta:win.meta||[],days:win.days||[],committed:!!win.committed,ts:win.ts||0};
  }
  return out;
}
function mergeLog(rem,tomb,wipe,tids){
  var by={},i,e;
  function add(list){for(i=0;i<(list||[]).length;i++){e=list[i];var id=String(e.id),old=by[id];if(!old||(e.ts||0)>=(old.ts||0))by[id]=e;}}
  add(state.log);add(rem||[]);
  var out=[];
  for(var id in by){e=by[id];
    if(tids[id]&&(e.ts||0)<=tids[id])continue;         // 這筆被刪過
    if(killed(mdOf(e.date),e.ts,tomb,wipe))continue;   // 這天被刪過／統計被清空
    out.push(e);}
  out.sort(function(a,b){return dnum(a.date)-dnum(b.date);});
  return out;
}
function mergePlans(rem,tomb,wipe){
  var out={},keys={},d;
  for(d in state.plans)keys[d]=1;
  for(d in (rem||{}))keys[d]=1;
  for(d in keys){
    var loc=state.plans[d],r=(rem||{})[d];
    var lts=(loc&&loc.ts)||0,rts=(r&&r.ts)||0;
    var win=(!loc)?r:(!r)?loc:(rts>lts?r:loc);
    if(!win)continue;
    if(killed(d,Math.max(lts,rts),tomb,0))continue;
    out[d]=win;
  }
  return out;
}
function syncBadge(){var el=document.getElementById("syncdot");if(el)el.style.background=state.syncStatus==="on"?C.green:state.syncStatus==="err"?C.red:C.line;}
function pushNow(){
  if(state.readOnly){flash("唯讀模式無法上傳");return;}
  if(!state.syncUrl){flash("尚未連線雲端");return;}
  if(!pulledOk){flash("還沒讀到雲端資料，先同步一次再上傳");pendingPush=true;pullSync();return;}
  saveBoard();saveGuardWeek();   // 存住目前正在編的排班板＋站哨週，按一下就把「該有的」全部備份上去
  var body=payload(),n=Object.keys(state.boards).length;
  flash("上傳中…（"+n+" 天排班板）");
  lastPushAt=Date.now();
  fetch(state.syncUrl,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:body})
    .then(function(){dirty=false;state.syncStatus="on";syncBadge();flash("已備份到雲端："+n+" 天排班板＋行程");})
    .catch(function(){state.syncStatus="err";syncBadge();flash("上傳失敗，檢查網路後再試");});
}
function pushSync(){
  if(state.readOnly)return;
  if(!state.syncUrl)return;
  // 保險：沒成功讀過雲端就不准上傳，否則會用本機的空資料覆蓋掉別人的歷史
  if(!pulledOk){pendingPush=true;pullSync();return;}
  clearTimeout(pushT);
  pushT=setTimeout(function(){
    lastPushAt=Date.now();
    fetch(state.syncUrl,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:payload()}).then(function(){dirty=false;state.syncStatus="on";syncBadge();}).catch(function(){state.syncStatus="err";syncBadge();});
  },400);
}
function applyRemote(o){
  if(!o||!o.names)return false;
  var tomb=mergeTomb(o.tomb),tids=mergeIds(o.tombIds),wipe=Math.max(state.wipe||0,o.wipe||0);
  var nb=mergeBoards(o.boards,tomb,wipe),nl=mergeLog(o.log,tomb,wipe,tids),np=mergePlans(o.plans,tomb,wipe),ngw=mergeGuardWeeks(o.guardWeeks,o.guard);
  var cur=JSON.stringify({names:state.names,l:state.log,p:state.plans,t:state.tomb,w:state.wipe,b:slimBoards(),mq:state.mealQueue,g:state.guard,gw:state.guardWeeks,gt:state.guardTally,ab:state.absence});
  state.names=o.names;
  // 排休／站哨／打飯順序這幾項是整份存的，沒有逐日時間戳。
  // 只有在「雲端比較新」而且「本機沒有還沒上傳的修改」時才套用，否則會蓋掉你剛排好的東西。
  var remoteNewer=(o.stateTs||0)>(state.stateTs||0);
  if(remoteNewer&&!dirty){
    if(o.mealQueue&&o.mealQueue.length===8)state.mealQueue=o.mealQueue;
    if(o.guardTally)state.guardTally=o.guardTally;
    if(o.absence)state.absence=o.absence;
    state.stateTs=o.stateTs||state.stateTs;
  }
  state.log=nl;state.plans=np;state.tomb=tomb;state.tombIds=tids;state.wipe=wipe;state.boards=nb;state.guardWeeks=ngw;
  // 站哨 active 週跟著逐週合併結果走（沒有本機未上傳的修改時）；新裝置沒 active 又還沒排過 → 自動載入最新一週
  var agk=state.activeGuardWeek;
  if(!agk&&!(state.guard&&state.guard.loaded)){var wl=guardWeekList();if(wl.length)agk=state.activeGuardWeek=wl[0];}
  var gw=agk&&ngw[agk];
  if(gw&&!dirty)state.guard={raw:gw.raw||"",meta:gw.meta||[],days:gw.days||[],loaded:true,committed:!!gw.committed};
  // 讓「編輯中的那天」跟著合併結果走，否則等一下 saveBoard() 會用舊資料蓋回去
  var ad=state.activeDate,b=ad&&state.boards[ad];
  if(b){state.gongban={raw:b.raw||"",meta:b.meta||[],loaded:true};state.duties=b.duties;if(b.schedule&&b.schedule.items.length)state.schedule=b.schedule;}
  else if(ad){state.activeDate="";state.gongban={raw:"",meta:[],loaded:false};state.duties=[];}
  syncAvail();   // 排休是資料，出勤是派生值 → 拉到新資料後要重算，否則看起來像沒存到
  var now=JSON.stringify({names:state.names,l:state.log,p:state.plans,t:state.tomb,w:state.wipe,b:slimBoards(),mq:state.mealQueue,g:state.guard,gw:state.guardWeeks,gt:state.guardTally,ab:state.absence});
  if(now===cur)return false;
  persistLocal();return true;
}
function pullSync(){
  if(!state.syncUrl)return;
  if(Date.now()-lastPushAt<3000)return;
  fetch(state.syncUrl).then(function(r){return r.text();}).then(function(txt){
    var o={};try{o=JSON.parse(txt);}catch(e){return;}
    state.syncStatus="on";pulledOk=true;
    if(applyRemote(o)){fixMealTimes();render();}else syncBadge();
    if(pendingPush){pendingPush=false;pushSync();}
  }).catch(function(){state.syncStatus="err";syncBadge();});
}
function startPoll(){if(pollTimer)clearInterval(pollTimer);pollTimer=setInterval(pullSync,20000);}
function connectSync(url){
  url=(url||"").trim();if(!url){flash("先貼上網址");return;}
  state.syncUrl=url;try{localStorage.setItem(SYNC_KEY,url);}catch(e){}
  state.syncStatus="sync";render();
  fetch(url).then(function(r){return r.text();}).then(function(txt){
    var o={};try{o=JSON.parse(txt);}catch(e){}
    if(o&&o.names){applyRemote(o);flash("已連上雲端，載入共用紀錄");}else{pushSync();flash("已連上雲端，已上傳本機紀錄");}
    state.syncStatus="on";state.syncOpen=false;startPoll();render();
  }).catch(function(){state.syncStatus="err";flash("連不上，檢查網址或部署設定（要選『任何人』）");render();});
}
function disconnectSync(){state.syncUrl="";try{localStorage.removeItem(SYNC_KEY);}catch(e){}state.syncStatus="";state.syncOpen=false;if(pollTimer)clearInterval(pollTimer);flash("已中斷同步（改回只存本機）");render();}

var HIST={h:{},cg:{},g:{}};
function getHistory(){var h={},cg={},g={};PEOPLE.forEach(function(p){h[p.id]={};g[p.id]={};});
  // 排班板（b_）紀錄依「天」去重：同一天只留最新一筆，避免舊版不同日期格式造成重複計次。臨時行程（x_）各自保留。
  var boardByDay={},list=[];
  state.log.forEach(function(e){if(isExtra(e)){list.push(e);return;}var k=dayKey(e.date),old=boardByDay[k];if(!old||(e.ts||0)>=(old.ts||0))boardByDay[k]=e;});
  for(var k in boardByDay)list.push(boardByDay[k]);
  list.forEach(function(e){e.entries.forEach(function(x){if(!h[x.p])h[x.p]={};h[x.p][x.c]=(h[x.p][x.c]||0)+1;var grp=x.g||deriveGroup(x.c);cg[x.c]=grp;if(!g[x.p])g[x.p]={};g[x.p][grp]=(g[x.p][grp]||0)+1;});});return {h:h,cg:cg,g:g};}
function refreshHist(){HIST=getHistory();}
function sortCats(cats,h){var go={"打掃":0,"公差":1,"大公差":2,"小公差":3,"打飯":4,"分菜":5};return cats.sort(function(a,b){var ga=go[HIST.cg[a]||deriveGroup(a)],gb=go[HIST.cg[b]||deriveGroup(b)];return ga-gb||h[b]-h[a];});}
function total(id){return sum(HIST.h[id]||{});}
function groupTotal(id,grp){return (HIST.g[id]&&HIST.g[id][grp])||0;}
function nonMealTotal(id){return total(id)-groupTotal(id,"打飯");}

var toastT=null;
function flash(m){var t=document.getElementById("toast");t.textContent=m;t.className="toast show";clearTimeout(toastT);toastT=setTimeout(function(){t.className="toast";},2200);}

function blockOf(d){if(d.block!==undefined)return d.block;if(d.kind==="meal"){return d.label.indexOf("早")>=0?"AM":d.label.indexOf("午")>=0?"NOON":null;}if(d.period==="GC")return null;return d.period;}

/* ---------- 解析公版 ---------- */
function stripNum(s){return s.replace(/^[\(（]?\s*\d+\s*[\)）]?[\.、]?\s*/,"").trim();}
/* 班長把人數寫在最前面：如「3營部馬路」「2垃圾間」「1打冰桶」→ 回傳 3/2/1。
   排除序號寫法：「(3）分菜」「3.打掃」「3、掃地」→ 回傳 0（那不是人數）。 */
function leadingCount(s){s=String(s||"");if(/^\s*[\(（]/.test(s))return 0;var m=s.match(/^\s*(\d+)\s*(.?)/);if(!m)return 0;if(/[\)）.．、，:：]/.test(m[2]))return 0;var n=parseInt(m[1],10);return (n>0&&n<=8)?n:0;}
function extractTime(label){var m=label.match(/^(\d{3,4}\s*[-~～]\s*\d{3,4}|\d{3,4})\s*/);if(m)return {time:m[1].replace(/\s/g,""),rest:label.slice(m[0].length).trim()};return {time:null,rest:label};}
function count261Token(tok){tok=(tok||"").trim();var m;if(/^[（(]?\s*261\s*[）)]?$/.test(tok))return 1;m=tok.match(/^261\s*[*＊]\s*(\d+)$/);if(m)return parseInt(m[1],10);m=tok.match(/^261\s*梯\s*[（(]\s*(\d+)\s*[）)]\s*員?$/);if(m)return parseInt(m[1],10);m=tok.match(/^261\s*梯\s*(\d+)\s*員?$/);if(m)return parseInt(m[1],10);m=tok.match(/^261\s*[（(]\s*(\d+)\s*[）)]$/);if(m)return parseInt(m[1],10);return 0;}
function find261(line){var m=line.match(/261\s*梯\s*[（(]\s*(\d+)\s*[）)]/);if(m)return {n:parseInt(m[1],10),s:m[0]};m=line.match(/261\s*梯\s*(\d+)\s*員/);if(m)return {n:parseInt(m[1],10),s:m[0]};m=line.match(/261\s*[*＊]\s*(\d+)/);if(m)return {n:parseInt(m[1],10),s:m[0]};m=line.match(/261\s*[（(]\s*(\d+)\s*[）)]/);if(m)return {n:parseInt(m[1],10),s:m[0]};m=line.match(/[（(]\s*261\s*[）)]/);if(m)return {n:1,s:m[0]};if(/(?:^|[^0-9])261(?:[^0-9*＊梯]|$)/.test(line))return {n:1,s:"261"};return null;}
function timeBlock(t){return "T"+t.replace(/[-~～]/,"");}
// 認出「我們班 8 人」的名字（含前綴如「二兵陳俊穎」「中士林崇浩」→ 用子字串比對；含 NAME_ALIASES 變體字）
function ourNames(){var m={};PEOPLE.forEach(function(p){m[p.id]=[state.names[p.id]];});for(var k in NAME_ALIASES){if(m[NAME_ALIASES[k]])m[NAME_ALIASES[k]].push(k);}return m;}
function ourIdsIn(str){str=String(str||"");if(!str)return [];var nm=ourNames(),out=[];PEOPLE.forEach(function(p){var arr=nm[p.id];for(var i=0;i<arr.length;i++){if(arr[i]&&arr[i].length>=2&&str.indexOf(arr[i])>=0){out.push(p.id);break;}}});return out;}
function parseGongban(text){
  var lines=text.replace(/\r/g,"").split("\n"),section="",sub="AM",fenca=false,duties=[];
  function nameAhead(idx){var buf="";for(var j=idx+1;j<lines.length&&j<idx+4;j++){var nl=lines[j];if(!nl.trim()||nl.indexOf("🔷")>=0||nl.indexOf("🔵")>=0||/[：:]/.test(nl))break;buf+=" "+nl;}return buf;}   // 名字寫在標籤下一行的情形
  var meta=lines.map(function(raw,idx){
    var line=raw,t=line.trim();
    if(line.indexOf("🔷")>=0||line.indexOf("🔵")>=0){fenca=false;section=line.indexOf("公差")>=0?"gongcha":line.indexOf("打飯")>=0?"meal":"clean";if(/上午/.test(t))sub="AM";else if(/下午/.test(t))sub="AFT";else if(/(晚間|晚上|晚)/.test(t))sub="PM";else if(/(中午|午)/.test(t))sub="NOON";return {type:"static",text:raw};}
    var sc=splitColon(line);
    if(!sc){var tmm=t.match(/^(\d{3,4})(?!\d)/);if(tmm){var hh=parseInt(tmm[1].length===3?tmm[1].slice(0,1):tmm[1].slice(0,2),10);sub=hh<11?"AM":hh<13?"NOON":hh<17?"AFT":"PM";}else if(/上午/.test(t))sub="AM";else if(/下午/.test(t))sub="AFT";else if(/(晚間|晚上|晚)/.test(t))sub="PM";else if(/(中午|午)/.test(t))sub="NOON";return {type:"static",text:raw};}   // 無冒號的時間標記行（如「2100打掃」）依時間切時段
    var rawLabel=stripNum(sc.label);if(!rawLabel)return {type:"static",text:raw};
    var lc=leadingCount(sc.label);   // 班長把人數寫在最前面（如 3營部馬路）
    var et=extractTime(rawLabel),disp=et.rest||rawLabel,time=et.time;
    var isAlert=/🚨/.test(raw);
    var starM=disp.match(/[\*＊]\s*(\d+)/),starN=starM?parseInt(starM[1],10):0;
    var ptm=disp.match(/[（(]\s*(\d{3,4})/);if(!time&&ptm)time=ptm[1];
    disp=disp.replace(/^[🔷🔵🚨🔺🔸🔹⬇️➡️]+\s*/,"").replace(/[（(][^）)]*[）)]/g,"").replace(/[\*＊]\s*\d+\s*員?/g,"").trim();
    if(!disp)return {type:"static",text:raw};
    var period=section==="gongcha"?"GC":sub;
    var mine=ourIdsIn(sc.rhs);if(!mine.length)mine=ourIdsIn(nameAhead(idx));   // 公版已填我們班的名字→自動填上
    var mm=disp.match(/(早打|午打|晚打)/)||rawLabel.match(/(早打|午打|晚打)/);
    if(mm){var per=mm[1]==="早打"?"AM":mm[1]==="午打"?"NOON":"PM";var mc=sc.rhs.match(/^\s*(\d+)/);var mcount=mc?parseInt(mc[1],10):1;var dm={id:"d"+idx,kind:"meal",mode:"append",label:disp,time:null,period:per,block:per,count:(mine.length||mcount||1),assigned:mine.slice(),keepAll:false,removed:false,original:raw,extra:null,schedTime:"",timeSrc:"",prefilled:!!mine.length};duties.push(dm);return {type:"duty",dutyId:dm.id};}
    if(/分菜/.test(disp)){fenca=true;var dh={id:"d"+idx,kind:"fill",mode:"append",label:disp,time:null,period:"GC",block:null,count:1,assigned:[],keepAll:false,removed:false,original:raw,extra:null,schedTime:"",timeSrc:"",fenca:"head"};duties.push(dh);return {type:"duty",dutyId:dh.id};}
    if(fenca){var fm=disp.match(/^(早餐|中餐|晚餐|早|中|晚)$/);if(fm){var fs=/早/.test(fm[1])?"AM":/中/.test(fm[1])?"NOON":"PM";var df={id:"d"+idx,kind:"fill",mode:"append",label:"分菜"+(fs==="AM"?"早":fs==="NOON"?"中":"晚"),time:null,period:"GC",block:null,count:(mine.length||1),assigned:mine.slice(),keepAll:false,removed:false,original:raw,extra:null,schedTime:"",timeSrc:"",fenca:fs,prefilled:!!mine.length};duties.push(df);return {type:"duty",dutyId:df.id};}else{fenca=false;}}
    var blk=time?timeBlock(time):(period==="GC"?null:period);
    if(mine.length){var dn={id:"d"+idx,kind:"fill",mode:"append",label:disp,time:time,period:period,block:blk,count:mine.length,assigned:mine.slice(),keepAll:false,removed:false,original:raw,extra:(isAlert?"small":null),schedTime:(time||""),timeSrc:"",prefilled:true};duties.push(dn);return {type:"duty",dutyId:dn.id};}   // 公版已填我們班名字→直接填，不用 261
    var toks=sc.rhs.split(/[+、,，]/).map(function(x){return x.trim();}),tok261=null,cnt=1;
    for(var i=0;i<toks.length;i++){var c=count261Token(toks[i]);if(c>0){tok261=toks[i];cnt=c;break;}}
    if(tok261){var d1={id:"d"+idx,kind:"fill",mode:"replace",label:disp,time:time,period:period,block:blk,count:(cnt>1?cnt:(lc||cnt)),assigned:[],keepAll:false,removed:false,original:raw,tok261:tok261,extra:(isAlert?"small":null),schedTime:(time||""),timeSrc:""};duties.push(d1);return {type:"duty",dutyId:d1.id};}
    var f=find261(sc.rhs);
    if(f){var d2={id:"d"+idx,kind:"fill",mode:"replace",label:disp,time:time,period:period,block:blk,count:(f.n>1?f.n:(lc||f.n)),assigned:[],keepAll:false,removed:false,original:raw,tok261:f.s,extra:(isAlert?"small":null),schedTime:(time||""),timeSrc:""};duties.push(d2);return {type:"duty",dutyId:d2.id};}
    var pk=0;
    if(!sc.rhs.trim()){for(var j=idx+1;j<lines.length&&j<idx+4;j++){var nl=lines[j];if(nl.indexOf("🔷")>=0||!nl.trim()||/[：:]/.test(nl))break;var ff=find261(nl);if(ff){pk=ff.n;break;}}}
    var d3={id:"d"+idx,kind:"fill",mode:"append",label:disp,time:time,period:period,block:blk,count:(starN||lc||pk||1),assigned:[],keepAll:false,removed:false,original:raw,extra:(isAlert?"small":null),schedTime:(time||""),timeSrc:""};
    duties.push(d3);return {type:"duty",dutyId:d3.id};
  });
  return {meta:meta,duties:duties};
}
function dutyById(id){for(var i=0;i<state.duties.length;i++)if(state.duties[i].id===id)return state.duties[i];return null;}
function fillReplace(d){
  var s=d.original,pat=d.tok261||"261";
  var esc=pat.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  var re=new RegExp("([+、])?"+esc);
  if(d.removed)return s.replace(re,"");
  if(d.keepAll)return s;
  var names=d.assigned.map(nameOf);
  if(!names.length)return s.replace(re,"");
  return s.replace(re,function(mm,sep){var j=sep||"+";return (sep||"")+names.join(j);});
}
function fillAppend(d){
  if(d.removed)return d.original;
  var s=d.original.replace(/\s+$/,"");
  var names=d.keepAll?["261"]:d.assigned.map(nameOf);
  if(!names.length)return d.original;
  var sc=splitColon(s),rhs=sc?sc.rhs:"";
  if(/^\s*\d+\s*$/.test(rhs))return s+" "+names.join("、");
  var sep=rhs.indexOf("、")>=0?"、":(rhs.indexOf("+")>=0?"+":"、");
  var last=s.slice(-1);
  if(last==="、"||last==="，"||last==="+")return s+names.join(sep);
  if(last==="："||last===":")return s+names.join(sep);
  return s+sep+names.join(sep);
}
function rebuildLine(m){
  if(m.type==="static")return m.text;
  var d=dutyById(m.dutyId);if(!d)return "";
  if(d.prefilled)return d.removed?"":d.original;   // 公版本來就填好名字→原樣輸出，不再重複附加
  return d.mode==="replace"?fillReplace(d):fillAppend(d);
}
function buildFilled(){
  var base=state.gongban.meta.map(rebuildLine).join("\n");
  var extra=state.duties.filter(function(d){return d.kind==="manual"&&!d.removed&&(d.keepAll||d.assigned.length);}).map(function(d){return d.label+"："+(d.keepAll?"261":d.assigned.map(nameOf).join("+"));});
  return base+(extra.length?"\n"+extra.join("\n"):"");
}
function hm4(range){var s=String(range||"").split(/[-~–—]/)[0].replace(/\D/g,"");if(s.length===3)s="0"+s;return s.slice(0,4);}
function noColon(s){return String(s||"").replace(/[:：]/g,"").replace(/[–—~]/g,"-");}  // 00:00–02:00 → 0000-0200
function copyDutyLine(it){var g=it.group,lb=it.label||"";
  if(g==="站哨")return noColon(lb);                // 站哨 0000-0200（已含時段）
  if(!lb)return g+(it.range?(" "+noColon(it.range)):"");   // 補休／不在 → 補休 2200-2400
  if(g==="打飯"){var s=/早/.test(lb)?"早":/(午|中)/.test(lb)?"午":/晚/.test(lb)?"晚":"";return "打飯"+s;}
  if(g==="打掃")return "掃"+lb;
  if(g==="分菜")return lb;                        // 分菜早／中／晚
  if(g==="公差"||g==="大公差"||g==="小公差")return g+"："+lb;
  return lb;}
function buildPersonList(){
  var lp=livePlan();
  var dl=lp.date+(lp.weekday?("（"+lp.weekday+"）"):"");
  var out=["📋 "+dl+" 個人分工","━━━━━━━━━━━"];
  var outMap={};(lp.outs||[]).forEach(function(o){outMap[o.pid]=o.reason;});
  PEOPLE.forEach(function(p){
    out.push("");
    var whole=outMap[p.id],items=personDayItems(lp,p.id);
    // 整天不在的人：全班一起的勤務（261）不用列，只寫他不在
    if(whole)items=items.filter(function(it){return !it.keepAll;});
    out.push(p.id+"　"+nameOf(p.id)+(whole?("（"+whole+"·整天不在）"):""));
    if(whole&&!items.length)return;
    if(!items.length){out.push("· （今日無勤務）");return;}
    var timed=[],untimed=[];
    items.forEach(function(it){
      var line=copyDutyLine(it);if(!line)return;
      var selfTimed=(it.group==="站哨")||!it.label;   // 站哨、補休：整行已含時段
      if(selfTimed){timed.push({min:(it.min==null?99999:it.min),text:line});}
      else if(it.range){timed.push({min:(it.min==null?99999:it.min),text:hm4(it.range)+" "+line});}
      else untimed.push(line);
    });
    timed.sort(function(a,b){return a.min-b.min;});
    timed.forEach(function(t){out.push(t.text);});
    untimed.forEach(function(u){out.push("- "+u);});
  });
  return out.join("\n").replace(/\s+$/,"");
}
function shiftStartHH(code){var h=parseInt(String(code).slice(0,2),10);return isNaN(h)?0:(h%24);}   // 起始時，24→0（2402＝該日 00:00 起，不是 24:00）
function shiftStartMin(code){return shiftStartHH(code)*60;}
function guardRange(code){var a=code.slice(0,2),b=code.slice(2,4);return (a==="24"?"00":a)+"00-"+b+"00";}   // 2402→0000-0200、2224→2200-2400（同一天內的分鐘）
function shiftHM(code){var a=code.slice(0,2),b=code.slice(2,4);return (a==="24"?"00":a)+":00–"+(b==="24"?"00":b)+":00";}
// 站哨這班「屬於哪一天／哪個時段」補休：夜哨(起22/00/02/04→隔早或當早 0550-0740)、午哨(起12/13→當日 1400-1600)
function guardRestInfo(sh){var nh=shiftStartHH(sh.code);if(nh>=22||nh<6)return {kind:"夜哨",date:(nh>=22?addDaysMD(sh.date,1):sh.date),def:"0550-0740"};if(nh>=12&&nh<14)return {kind:"午哨",date:sh.date,def:"1400-1600"};return null;}
function guardCarryEvents(md){   // 跨夜哨兩天都畫：22xx（前晚，屬前一天）補到隔天最上、24xx/00xx（凌晨，屬後一天）補到前一天最下
  var out=[];
  (state.guard&&state.guard.days?state.guard.days:[]).forEach(function(day){(day.shifts||[]).forEach(function(sh){
    if(!sh.assigned.length)return;
    var d=sh.date||day.date,nh=shiftStartHH(sh.code),lab="站哨 "+shiftHM(sh.code)+(sh.loc?(" "+sh.loc):"")+"（跨夜）";
    if(nh===22&&addDaysMD(d,1)===md)out.push({range:guardRange(sh.code),min:-1,label:lab,group:"站哨",people:sh.assigned.slice(),keepAll:false,carry:true,pin:"top"});
    else if(nh===0&&addDaysMD(d,-1)===md)out.push({range:guardRange(sh.code),min:1441,label:lab,group:"站哨",people:sh.assigned.slice(),keepAll:false,carry:true,pin:"bottom"});
  });});
  return out;
}
function normMD(s){var m=String(s||"").match(/(\d{1,2})\s*\/\s*(\d{1,2})/);return m?(parseInt(m[1],10)+"/"+parseInt(m[2],10)):"";}
function parseGuard(text){
  var lines=text.replace(/\r/g,"").split("\n"),days=[],meta=[],si=0;
  var curDay=null;
  lines.forEach(function(raw){
    var t=raw.trim();
    var dm=t.match(/^(\d{1,2})\s*\/\s*(\d{1,2})/);
    if(dm&&/[-−–—~]/.test(t)){
      var ds=t.match(/(\d{1,2})\s*\/\s*(\d{1,2})/g)||[];
      var d1=normMD(ds[0]||""),d2=ds[1]?normMD(ds[1]):addDaysMD(d1,1);
      curDay={date:d1,date2:d2,range:t,shifts:[]};days.push(curDay);
      meta.push({type:"day",dayIdx:days.length-1});return;
    }
    var sm=t.match(/^(\d{4})\s*([（(][^）)]*[）)])?/);
    if(sm&&curDay){
      var code=sm[1],st=parseInt(code.slice(0,2),10);
      // 只有 22:00–23:59 起的班（如 2224）在午夜前＝第一天；24:00 以後與白天（0–21、24）都算第二天
      var toD2=!(st>=22&&st<24);
      var sh={id:"g"+(si++),code:code,loc:sm[2]||"",assigned:ourIdsIn(t.slice(sm[0].length)),date:(toD2?curDay.date2:curDay.date)};   // 衛哨表已寫名字（如「二兵陳俊穎」）→ 自動填上站哨的人
      curDay.shifts.push(sh);meta.push({type:"shift",shiftId:sh.id});return;
    }
    meta.push({type:"static",text:raw});
  });
  return {days:days,meta:meta};
}
function guardShiftById(id){for(var i=0;i<state.guard.days.length;i++){var s=state.guard.days[i].shifts;for(var j=0;j<s.length;j++)if(s[j].id===id)return s[j];}return null;}
function guardCount(){var n=0;state.guard.days.forEach(function(d){n+=d.shifts.length;});return n;}
function buildGuardFilled(){
  return state.guard.meta.map(function(m){
    if(m.type==="static")return m.text;
    if(m.type==="day"){var d=state.guard.days[m.dayIdx];return d?d.range:"";}
    if(m.type==="shift"){var sh=guardShiftById(m.shiftId);if(!sh)return "";return sh.code+sh.loc+(sh.assigned.length?" "+sh.assigned.map(nameOf).join("、"):"");}
    return "";
  }).join("\n");
}
function guardAuto(){
  var load={};PEOPLE.forEach(function(p){load[p.id]=state.guardTally[p.id]||0;});
  state.guard.days.forEach(function(day){
    var used={};
    day.shifts.forEach(function(sh){
      var need=sh.assigned.length||1;sh.assigned=[];
      for(var c=0;c<need;c++){
        var cand=PEOPLE.filter(function(p){return !used[p.id]&&sh.assigned.indexOf(p.id)<0;});if(!cand.length)cand=PEOPLE.filter(function(p){return sh.assigned.indexOf(p.id)<0;});if(!cand.length)break;
        cand.sort(function(a,b){return load[a.id]-load[b.id]||a.id-b.id;});
        var pk=cand[0];sh.assigned.push(pk.id);used[pk.id]=true;load[pk.id]++;
      }
    });
  });
  persist();flash("已依站哨次數平均分配");render();
}
function guardCommit(){
  if(state.guard.committed){flash("本週已計入過（避免重複）");return;}
  var n=0;state.guard.days.forEach(function(day){day.shifts.forEach(function(sh){sh.assigned.forEach(function(pid){state.guardTally[pid]=(state.guardTally[pid]||0)+1;n++;});});});
  if(!n){flash("還沒有指派站哨");return;}
  state.guard.committed=true;persist();flash("已計入本週站哨（"+n+" 班）");render();
}
function guardUncommit(){
  if(!state.guard.committed){flash("本週還沒計入，不用取消");return;}
  var n=0;state.guard.days.forEach(function(day){day.shifts.forEach(function(sh){sh.assigned.forEach(function(pid){state.guardTally[pid]=Math.max(0,(state.guardTally[pid]||0)-1);n++;});});});
  state.guard.committed=false;persist();flash("已取消本週計入（扣回 "+n+" 班，可重新分配）");render();
}
function guardTallyAdj(pid,delta){pid=parseInt(pid,10);state.guardTally[pid]=Math.max(0,(state.guardTally[pid]||0)+delta);persist();render();}
function guardTallyClear(){PEOPLE.forEach(function(p){state.guardTally[p.id]=0;});state.guard.committed=false;state.confirmGuardClear=false;persist();flash("已清空站哨累積次數");render();}
var NAME_ALIASES={"廖翊縢":5,"江偉倫":2}; // 已知變體字→本班 id（安全白名單；遇到新變體再往這裡加）
function filledNameMap(){var m={};PEOPLE.forEach(function(p){m[state.names[p.id]]=p.id;});for(var k in NAME_ALIASES)if(m[k]===undefined)m[k]=NAME_ALIASES[k];return m;}
function extractLabelTime(s){
  var str=(s||"").replace(/[🔷🔵🚨🔺🔸🔹⬇️➡️]/g,"");
  function ok(t){var h=parseInt(t.slice(0,2),10),mi=parseInt(t.slice(2,4),10);return h<24&&mi<60;}
  var m=str.match(/^\s*(\d{4})(?:\s*[-~～]\s*(\d{4}))?/);
  if(m&&ok(m[1]))return (m[2]&&ok(m[2]))?(m[1]+"-"+m[2]):m[1];
  var re=/(?:^|[^0-9])(\d{4})(?:\s*[-~～]\s*(\d{4}))?/g,mm;
  while((mm=re.exec(str))){if(ok(mm[1]))return (mm[2]&&ok(mm[2]))?(mm[1]+"-"+mm[2]):mm[1];}
  return "";
}
function parseFilled(text){
  var lines=text.replace(/\r/g,"").split("\n"),dateLabel=extractDate(text)||todayLabel(),entries=[],section="",fenca=false;
  var nmeMap=filledNameMap();
  function clean(s){return s.replace(/^[🔷🔵🚨🔺🔸🔹⬇️➡️]+\s*/,"").replace(/[（(][^）)]*[）)]/g,"").replace(/[\*＊]\s*\d+\s*員?/g,"").replace(/^[\(（]?\s*\d+\s*[\)）]?[\.、]?\s*/,"").replace(/\uFFFD/g,"").trim();}
  function slot(lb){return /早/.test(lb)?"早":/(中|午)/.test(lb)?"中":/晚/.test(lb)?"晚":"";}
  function pickIds(str){
    var toks=str.split(/[+、,，\s]+/).map(function(x){return x.trim();}).filter(Boolean);
    var all=/八人一起|全班|全員/.test(str)||toks.some(function(x){return /^261(\s*[\*＊（(]\s*\d+\s*[）)]?)?$/.test(x)||/^261梯全員?$/.test(x);});
    var out=[];if(all){PEOPLE.forEach(function(p){out.push(p.id);});}else toks.forEach(function(tk){if(Object.prototype.hasOwnProperty.call(nmeMap,tk))out.push(nmeMap[tk]);});
    return {list:out,all:all};
  }
  for(var li=0;li<lines.length;li++){
    var line=lines[li];
    if(line.indexOf("🔷")>=0){fenca=false;section=line.indexOf("公差")>=0?"gongcha":line.indexOf("打飯")>=0?"meal":line.indexOf("打掃")>=0?"clean":"other";continue;}
    var sc=splitColon(line);if(!sc)continue;
    var isAlert=/🚨/.test(line);
    var lb=clean(sc.label);if(!lb)continue;
    if(/^(衛哨|站哨|衛哨表|本週衛哨)$/.test(lb))continue;          // 站哨區塊另有統計，不計入
    if(/回診|看診|門診|就診|返診/.test(lb))continue;               // 就醫屬不在，不算勤務
    var g,cat;
    if(/(早打|午打|晚打)/.test(lb)){g="打飯";cat=/早打/.test(lb)?"早打":/午打/.test(lb)?"午打":"晚打";}
    else if(/分菜/.test(lb)){fenca=true;var sl=slot(lb);cat=sl?("分菜"+sl):"分菜";g="分菜";}
    else if(fenca&&/^(早餐|中餐|晚餐|早|中|午|晚)$/.test(lb)){g="分菜";cat="分菜"+slot(lb);}
    else if(isAlert){g="小公差";cat=lb;}
    else{fenca=false;g=(section==="clean")?"打掃":"公差";cat=lb;}
    var tm=extractLabelTime(sc.label);
    var r=pickIds(sc.rhs);
    if(!r.list.length&&!r.all){                                    // 冒號後沒人 → 往下一行找名字
      var buf=[];
      for(var k=li+1;k<lines.length&&k<li+4;k++){
        var nx=lines[k];if(!nx.trim())break;
        if(/[：:]/.test(nx))break;if(/[🔷🚨🔵]/.test(nx))break;
        buf.push(nx.trim());
      }
      if(buf.length){var r2=pickIds(buf.join("、"));if(r2.list.length||r2.all)r=r2;}
    }
    if(r.all){PEOPLE.forEach(function(p){entries.push({p:p.id,c:cat,g:g,t:tm});});}
    else r.list.forEach(function(pid){entries.push({p:pid,c:cat,g:g,t:tm});});
  }
  return {date:dateLabel,entries:entries};
}

/* ---------- 分配 ---------- */
function computeConflicts(){   // 用真實分鐘重疊判卡到（跟時間軸一致）：同一人被排到「時段真的重疊」的兩項才算卡到（key＝勤務id:pid）
  var res={},list=state.duties.filter(function(d){return !d.removed&&!d.keepAll;});
  list.forEach(function(a){var sa=dutyEffSpan(a);if(!sa)return;a.assigned.forEach(function(pid){
    for(var i=0;i<list.length;i++){var b=list[i];if(b===a||b.assigned.indexOf(pid)<0)continue;var sb=dutyEffSpan(b);if(sb&&sa[0]<sb[1]&&sa[1]>sb[0]){res[a.id+":"+pid]=true;break;}}
  });});
  return res;
}
function occupiesFor(duty){var o={},sd=dutyEffSpan(duty);if(!sd)return o;state.duties.forEach(function(x){if(x===duty||x.removed||x.keepAll)return;var sx=dutyEffSpan(x);if(!sx||!(sd[0]<sx[1]&&sd[1]>sx[0]))return;x.assigned.forEach(function(pid){if(o[pid]===undefined)o[pid]=x.label;});});return o;}
function autoAssign(){
  refreshHist();
  // 1) 打飯：輪流隊列，補休者保留順位、回來先輪到
  var q=state.mealQueue.slice();
  var meals=state.duties.filter(function(d){return d.kind==="meal"&&!d.removed&&!d.prefilled;}).sort(function(a,b){return pord(a.period)-pord(b.period);});   // 公版已填好的（prefilled）不被自動分配蓋掉
  meals.forEach(function(m){
    var need=m.count||1;m.assigned=[];
    for(var c=0;c<need;c++){
      var idx=-1;
      for(var i=0;i<q.length;i++){var pid=q[i];if(state.available[pid]&&m.assigned.indexOf(pid)<0&&!restBlock(pid,m)){idx=i;break;}}
      if(idx<0)break;
      var pid=q[idx];m.assigned.push(pid);q.splice(idx,1);q.push(pid);
    }
  });
  // 自動補休：午打/夜哨/午哨排到的人，其補休時段不再排其他勤務
  var _amd=curDate().replace(/[（(].*$/,""),IRa=impliedRestsFrom(state.duties,_amd);
  function implBlk(pid,d){var sp=dutyEffSpan(d);if(!sp)return false;for(var q2=0;q2<IRa.length;q2++){var r=IRa[q2];if(r.people.indexOf(pid)>=0&&r.s!=null&&sp[0]<r.e&&sp[1]>r.s)return true;}return false;}
  // 2) 其他勤務：同一項做過最少的人優先，其次整體較少
  var work={};PEOPLE.forEach(function(p){work[p.id]=nonMealTotal(p.id);});
  var pset={AM:{},NOON:{},PM:{}};
  state.duties.forEach(function(d){if(d.removed||d.keepAll)return;var b=blockOf(d);d.assigned.forEach(function(pid){if(d.kind!=="meal")work[pid]=(work[pid]||0)+1;if(b)pset[b][pid]=true;});});
  var catWork={};
  function cw(cat,pid){if(!catWork[cat])catWork[cat]={};if(catWork[cat][pid]===undefined)catWork[cat][pid]=(HIST.h[pid]&&HIST.h[pid][cat])||0;return catWork[cat][pid];}
  state.duties.forEach(function(d){if(d.kind==="meal"||d.removed||d.keepAll)return;d.assigned.forEach(function(pid){catWork[d.label]=catWork[d.label]||{};catWork[d.label][pid]=cw(d.label,pid)+1;});});
  var avail=PEOPLE.filter(function(p){return state.available[p.id];}),short=false;
  state.duties.forEach(function(d){
    if(d.kind==="meal"||d.removed||d.keepAll||d.prefilled)return;
    var b=blockOf(d),cat=d.label,need=d.count-d.assigned.length;
    for(var i=0;i<need;i++){
      var cand=avail.filter(function(p){if(d.assigned.indexOf(p.id)>=0)return false;if(b&&pset[b][p.id])return false;if(restBlock(p.id,d))return false;if(implBlk(p.id,d))return false;return true;});
      if(!cand.length){short=true;break;}
      cand.sort(function(a,c){return cw(cat,a.id)-cw(cat,c.id)||work[a.id]-work[c.id]||a.id-c.id;});
      var pk=cand[0];d.assigned.push(pk.id);work[pk.id]++;catWork[cat]=catWork[cat]||{};catWork[cat][pk.id]=cw(cat,pk.id)+1;if(b)pset[b][pk.id]=true;
    }
  });
  flash(short?"已分配，但有時段人手不足":"已分配（打飯輪流·勤務均分）");render();
}
function commit(){
  var entries=[];
  state.duties.forEach(function(d){
    if(d.removed)return;
    var g=dutyGroup(d),cat=d.label;
    if(d.keepAll){PEOPLE.forEach(function(p){entries.push({p:p.id,c:cat,g:g});});}
    else{d.assigned.forEach(function(pid){entries.push({p:pid,c:cat,g:g});});}
  });
  if(!entries.length){flash("目前沒有可計入的分配");return;}
  var date=state.activeDate||extractDate(state.gongban.raw)||todayLabel();
  savePlan(date);
  var dk=dayKey(date),lid="b_"+dk;
  state.log=state.log.filter(function(e){return isExtra(e)||dayKey(e.date)!==dk;});
  state.log.push({id:lid,date:dk,entries:entries,ts:Date.now()});
  var bd=state.boards[date];
  if(!(bd&&bd.committed)){
    var mealPpl=[];state.duties.filter(function(d){return d.kind==="meal"&&!d.removed;}).sort(function(a,b){return pord(a.period)-pord(b.period);}).forEach(function(d){d.assigned.forEach(function(pid){mealPpl.push(pid);});});
    mealPpl.forEach(function(pid){var i=state.mealQueue.indexOf(pid);if(i>=0){state.mealQueue.splice(i,1);state.mealQueue.push(pid);}});
  }
  saveBoard();if(state.boards[date])state.boards[date].committed=true;
  persist();
  flash("已更新統計與行程（"+date+"）");render();
}
function fallbackCopy(text){
  try{
    var ta=document.createElement("textarea");
    ta.value=text;ta.setAttribute("readonly","");
    ta.style.position="fixed";ta.style.top="0";ta.style.left="0";ta.style.width="1px";ta.style.height="1px";ta.style.opacity="0";
    document.body.appendChild(ta);ta.focus();ta.select();
    try{ta.setSelectionRange(0,text.length);}catch(e){}
    var ok=false;try{ok=document.execCommand("copy");}catch(e){}
    document.body.removeChild(ta);
    flash(ok?"已複製":"複製失敗，請長按預覽文字選取");
  }catch(e){flash("複製失敗，請長按預覽文字選取");}
}
function copyText(text){
  if(!text)return;
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){flash("已複製");},function(){fallbackCopy(text);});
      return;
    }
  }catch(e){}
  fallbackCopy(text);
}
function removeOne(pid,cat){for(var i=state.log.length-1;i>=0;i--){var e=state.log[i];for(var j=0;j<e.entries.length;j++){if(e.entries[j].p===pid&&e.entries[j].c===cat){e.entries.splice(j,1);if(!e.entries.length)state.log.splice(i,1);return true;}}}return false;}
function clearPerson(pid){for(var i=state.log.length-1;i>=0;i--){var e=state.log[i];e.entries=e.entries.filter(function(x){return x.p!==pid;});if(!e.entries.length)state.log.splice(i,1);}}
function delDayAll(date){
  var md=String(date).replace(/[（(].*$/,"");var lid="b_"+md;
  state.tomb[md]=Date.now();   // 墓碑：讓其他裝置也刪掉，不會被合併復活
  state.log=state.log.filter(function(e){return String(e.id)!==lid&&!(isExtra(e)&&String(e.date).replace(/[（(].*$/,"")===md);});
  if(state.plans[md])delete state.plans[md];
  if(state.boards[md])delete state.boards[md];
  if(state.activeDate===md){state.activeDate="";state.gongban={raw:"",meta:[],loaded:false};state.duties=[];state.boardOpen=false;}
  if(state.dayView.date===md)state.dayView.date="";
  state.confirmDelDay="";
  persist();flash("已刪除 "+md+"（行程＋統計）");render();
}

/* ---------- 片段 ---------- */
function badge(code,size,tone){var bg=tone==="mute"?C.line:C.greenDeep,col=tone==="mute"?C.sub:"#fff";return '<span style="width:'+size+'px;height:'+size+'px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;background:'+bg+';color:'+col+';font-size:12px;font-weight:700;font-variant-numeric:tabular-nums;letter-spacing:.5px;flex-shrink:0;">'+code+'</span>';}
function card(inner,extra){return '<div style="background:'+C.surface+';border:1px solid '+C.line+';border-radius:16px;padding:15px;'+(extra||"")+'">'+inner+'</div>';}
function label(t){return '<div style="font-size:12px;font-weight:800;letter-spacing:1px;color:'+C.sub+';">'+t+'</div>';}
function mondayOf(md){var d=mdToDate(md);if(!d)return null;d.setHours(0,0,0,0);var wd=d.getDay();var diff=(wd===0?6:wd-1);d.setDate(d.getDate()-diff);return d;}
function boardTabs(){
  var dates=boardDates();if(!dates.length)return "";
  var mode=state.boardMode||"edit";
  var pencil='<button class="btn" data-action="board-mode" style="flex:0 0 auto;display:flex;align-items:center;gap:4px;padding:6px 11px;border-radius:999px;font-size:12px;font-weight:800;border:1px solid '+(mode==="edit"?C.brass:C.line)+';background:'+(mode==="edit"?C.brassSoft:C.surface)+';color:'+(mode==="edit"?C.amber:C.sub)+';white-space:nowrap;">'+icon(mode==="edit"?"pencil":"eye",13,mode==="edit"?C.amber:C.sub)+(mode==="edit"?"編輯":"閱讀")+'</button>';
  var chip=function(d,pre){var on=d===state.activeDate,b=state.boards[d];return '<button class="btn" data-action="board-load" data-d="'+esc(d)+'" style="flex:0 0 auto;display:flex;align-items:center;gap:4px;padding:6px 11px;border-radius:999px;font-size:12.5px;font-weight:700;border:1px solid '+(on?C.green:C.line)+';background:'+(on?C.greenSoft:C.surface)+';color:'+(on?C.greenDeep:C.sub)+';white-space:nowrap;">'+(pre?'<span style="font-size:10.5px;font-weight:800;color:'+(on?C.green:C.brass)+';">'+pre+'</span>':"")+esc(d)+(b.wd?"（"+esc(b.wd)+"）":"")+(b.committed?icon("check",11,on?C.green:C.sub):"")+'</button>';};
  // 只留今天／明天在最前面，其餘日期收合（點「其他」展開，仍依週一分週）
  var today=todayLabel(),tomo=addDaysMD(today,1),primary=[];
  if(state.boards[today])primary.push(chip(today,"今天"));
  if(state.boards[tomo])primary.push(chip(tomo,"明天"));
  var others=dates.filter(function(d){return d!==today&&d!==tomo;});
  var toggle=others.length?('<button class="btn" data-action="board-others" style="flex:0 0 auto;display:flex;align-items:center;gap:3px;padding:6px 11px;border-radius:999px;font-size:12px;font-weight:800;border:1px solid '+C.line+';background:'+C.surface+';color:'+C.sub+';white-space:nowrap;">'+(state.boardOthersOpen?"收合 ▾":("其他 "+others.length+" ▸"))+'</button>'):"";
  var topRow='<div style="display:flex;gap:6px;align-items:center;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:2px;">'+pencil+primary.join("")+toggle+'</div>';
  var expand="";
  if(state.boardOthersOpen&&others.length){
    var weeks={},order=[];
    others.forEach(function(d){var mon=mondayOf(d),key=mon?(""+mon.getTime()):"na";if(!weeks[key]){weeks[key]={t:mon?mon.getTime():-1,mon:mon,items:[]};order.push(key);}weeks[key].items.push(d);});
    order.sort(function(a,b){return weeks[b].t-weeks[a].t;});
    var todayMon=mondayOf(today),tt=todayMon?todayMon.getTime():0,DAY=86400000;
    expand=order.map(function(key){
      var wk=weeks[key];wk.items.sort(function(a,b){return dnum(a)-dnum(b);});
      var wlab,ago=-99;
      if(wk.t<0)wlab="其他";
      else{ago=Math.round((tt-wk.t)/(7*DAY));wlab=ago===0?"本週":ago===1?"上週":ago===2?"上上週":(ago>2?ago+"週前":(wk.mon.getMonth()+1)+"/"+wk.mon.getDate()+" 那週");}
      var tag='<span style="flex:0 0 auto;font-size:11px;font-weight:800;color:'+(ago===0?C.green:C.sub)+';background:'+(ago===0?C.greenSoft:C.bg)+';border:1px solid '+(ago===0?C.green:C.line)+';border-radius:8px;padding:4px 8px;white-space:nowrap;">'+wlab+'</span>';
      var chips=wk.items.map(function(d){return chip(d,"");}).join("");
      var scroller='<div style="flex:1;min-width:0;display:flex;gap:6px;align-items:center;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:2px;">'+chips+'</div>';
      return '<div style="display:flex;gap:6px;align-items:center;margin-top:8px;">'+tag+scroller+'</div>';
    }).join("");
  }
  return '<div style="margin-top:10px;padding-bottom:2px;">'+topRow+expand+'</div>';
}
function header(){var d=new Date().toLocaleDateString("zh-TW",{month:"2-digit",day:"2-digit",weekday:"short"});var title=state.page==="board"?"排班板":state.page==="guard"?"排站哨":state.page==="day"?"行程":"統計";var dot=state.syncUrl?'<div style="margin-left:auto;display:flex;align-items:center;gap:5px;font-size:11px;color:'+C.sub+';"><span id="syncdot" style="width:8px;height:8px;border-radius:999px;background:'+(state.syncStatus==="on"?C.green:state.syncStatus==="err"?C.red:C.line)+';"></span>雲端</div>':"";var lock=state.readOnly?'<button class="btn" data-action="unlock" style="margin-left:'+(dot?'8px':'auto')+';display:flex;align-items:center;gap:4px;padding:5px 10px;border-radius:999px;border:1px solid '+C.brass+';background:'+C.brassSoft+';color:'+C.amber+';font-size:11.5px;font-weight:800;">'+icon("lock",12,C.amber)+'唯讀</button>':"";return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;"><div style="width:36px;height:36px;border-radius:10px;background:'+C.greenDeep+';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;">261</div><div><div style="font-size:18px;font-weight:800;">'+title+'</div><div style="font-size:12px;color:'+C.sub+';">'+d+' · 8 員</div></div>'+dot+lock+'</div>';}

function pasteCard(){
  if(state.readOnly){return card('<div style="display:flex;align-items:center;gap:8px;color:'+C.amber+';font-weight:700;font-size:13px;">'+icon("lock",16,C.amber)+' 唯讀模式</div><div style="font-size:12.5px;color:'+C.sub+';margin-top:6px;line-height:1.6;">你可以看<b>行程</b>、<b>統計</b>、<b>站哨</b>頁。排班的當天分工請看「行程」頁（每人卡片）。<br>要編輯請點右上角「唯讀」輸入密碼解鎖。</div>');}
  var showBox=!state.gongban.loaded||state.showPaste||!state.boardOpen;
  if(showBox){return card(label("貼上今天的公版")+'<textarea data-input="paste" placeholder="把班長給的整份公版貼進來，會自動抓出所有含 261 的勤務和打飯。" style="width:100%;height:120px;margin-top:10px;padding:12px;border-radius:10px;border:1px solid '+C.line+';background:'+C.bg+';font-size:13.5px;line-height:1.6;outline:none;resize:vertical;font-family:ui-monospace,Menlo,monospace;">'+esc(pasteText)+'</textarea><button class="btn" data-action="parse" style="width:100%;margin-top:10px;padding:13px;border-radius:11px;border:none;background:'+C.greenDeep+';color:#fff;font-weight:800;font-size:15px;">解析勤務</button>');}
  var n=state.duties.filter(function(d){return !d.removed;}).length;
  return '<div style="margin-top:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;background:'+C.greenSoft+';border:1px solid '+C.green+';border-radius:12px;padding:11px 14px;"><div style="display:flex;align-items:center;gap:8px;color:'+C.greenDeep+';font-weight:700;font-size:13.5px;">'+icon("check",16,C.green)+' '+esc(state.activeDate||"")+' · '+n+' 項</div><div style="display:flex;gap:12px;"><button class="btn" data-action="repaste" style="border:none;background:transparent;color:'+C.green+';font-weight:700;font-size:13px;text-decoration:underline;">重新貼上</button><button class="btn" data-action="board-close" style="border:none;background:transparent;color:'+C.sub+';font-weight:700;font-size:13px;">收起</button></div></div>';
}
function availCard(){var cd=curDate(),md=cd.replace(/[（(].*$/,"");var impl=impliedRestsExpanded(state.duties,md);
  var chips=PEOPLE.map(function(p){
    var recs=absenceRecs(p.id,cd),rec=recs.length?recs[0]:null,full=fullDayOut(p.id,cd),on=!full;
    var myImpl=impl.filter(function(r){return r.pid===p.id;});
    var hasRest=rec||myImpl.length,restCol=rec?absColor(rec.reason):C.amber;
    var tags=recs.map(function(r){return '<span style="color:'+absColor(r.reason)+';">'+esc(r.reason)+(r.range?fmtSpan(r.range):"")+'</span>';}).concat(myImpl.map(function(r){return '<span style="color:'+C.amber+';">補休'+esc(fmtSpan(r.range))+'<span style="opacity:.65;">自</span></span>';}));
    var tag=tags.length?'<span style="font-size:9.5px;font-weight:800;margin-left:1px;">'+tags.join("・")+'</span>':"";
    return '<button class="btn tap" data-action="avail" data-id="'+p.id+'" style="display:flex;align-items:center;gap:5px;padding:5px 9px 5px 5px;border-radius:999px;border:1px solid '+(hasRest?restCol:C.green)+';background:'+(hasRest?restCol+"12":C.greenSoft)+';color:'+(on?C.greenDeep:C.sub)+';opacity:'+(on?1:0.9)+';">'+badge(p.code,20,on?"green":"mute")+'<span style="font-size:12.5px;font-weight:600;text-decoration:'+(full?"line-through":"none")+';">'+esc(nameOf(p.id))+'</span>'+tag+'</button>';
  }).join("");
  return '<div style="margin-top:14px;">'+card(label("今日出勤（"+esc(cd)+"）· 點掉＝整天不排；補休帶「自」＝站哨/午打自動")+'<div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:9px;">'+chips+'</div><button class="btn" data-action="open-absence" style="width:100%;margin-top:11px;padding:9px;border-radius:10px;border:1px dashed '+C.line+';background:transparent;color:'+C.sub+';font-weight:700;font-size:12.5px;display:flex;align-items:center;justify-content:center;gap:6px;">'+icon("calendar",14)+' 排休／不在（補休時段、大公差整週…）</button>')+'</div>';}
function mealCell(period){
  var d=null;state.duties.forEach(function(x){if(x.kind==="meal"&&x.period===period&&!x.removed)d=x;});
  var pl=PERIODS.filter(function(p){return p.key===period;})[0].meal;
  if(!d)return '<div style="flex:1;text-align:center;padding:11px 4px;border-radius:11px;background:'+C.bg+';color:'+C.sub+';"><div style="font-size:12px;font-weight:800;">'+pl+'</div><div style="font-size:12px;margin-top:4px;color:'+C.line+';">—</div></div>';
  var filled=d.assigned.length>0;
  var who=filled?d.assigned.map(function(id){return esc(nameOf(id));}).join("、"):"指派";
  var cnt=d.count>1?('<div style="font-size:10px;font-weight:700;margin-top:2px;color:'+(d.assigned.length===d.count?C.green:C.amber)+';">'+d.assigned.length+'/'+d.count+'</div>'):"";
  return '<button class="btn" data-action="pick" data-duty="'+d.id+'" style="flex:1;text-align:center;padding:10px 4px;border-radius:11px;border:1px solid '+(filled?C.green:C.line)+';background:'+(filled?C.greenSoft:C.surface)+';overflow:hidden;"><div style="font-size:12px;font-weight:800;color:'+C.green+';">'+pl+'</div><div style="font-size:12.5px;font-weight:700;margin-top:4px;color:'+(filled?C.greenDeep:C.sub)+';line-height:1.3;word-break:break-all;">'+who+'</div>'+cnt+'</button>';
}
function mealsRow(){
  var _q=state.mealQueue.slice(),_pk=[],_u={};for(var _i=0;_i<_q.length&&_pk.length<3;_i++){var _p=_q[_i];if(state.available[_p]&&!_u[_p]){_pk.push(personByCode(_p).code);_u[_p]=true;}}var nx=_pk.join("→")||"—";
  return '<div style="margin-top:14px;">'+card(label("打飯（號碼輪流）")+'<div style="display:flex;gap:8px;margin-top:9px;">'+mealCell("AM")+mealCell("NOON")+mealCell("PM")+'</div><div style="font-size:11px;color:'+C.sub+';margin-top:8px;">輪序：接下來 '+nx+' 起（自動分配用，記到隔天）</div>')+'</div>';
}
function fencaCell(slot){
  var d=null;state.duties.forEach(function(x){if(x.fenca===slot&&!x.removed)d=x;});
  var lab=slot==="AM"?"早":slot==="NOON"?"中":"晚";
  if(!d)return '<div style="flex:1;text-align:center;padding:11px 4px;border-radius:11px;background:'+C.bg+';color:'+C.sub+';"><div style="font-size:12px;font-weight:800;">'+lab+'</div><div style="font-size:12px;margin-top:4px;color:'+C.line+';">—</div></div>';
  var filled=d.assigned.length>0;
  var who=filled?d.assigned.map(function(id){return esc(nameOf(id));}).join("、"):"指派";
  var cnt=d.count>1?('<div style="font-size:10px;font-weight:700;margin-top:2px;color:'+(d.assigned.length===d.count?C.green:C.amber)+';">'+d.assigned.length+'/'+d.count+'</div>'):"";
  return '<button class="btn" data-action="pick" data-duty="'+d.id+'" style="flex:1;text-align:center;padding:10px 4px;border-radius:11px;border:1px solid '+(filled?GCOLORS["分菜"]:C.line)+';background:'+(filled?GCOLORS["分菜"]+"14":C.surface)+';overflow:hidden;"><div style="font-size:12px;font-weight:800;color:'+GCOLORS["分菜"]+';">'+lab+'</div><div style="font-size:12.5px;font-weight:700;margin-top:4px;color:'+(filled?C.ink:C.sub)+';line-height:1.3;word-break:break-all;">'+who+'</div>'+cnt+'</button>';
}
function fencaRow(){
  if(!state.duties.some(function(d){return d.fenca&&d.fenca!=="head"&&!d.removed;}))return "";
  return '<div style="margin-top:14px;">'+card(label("分菜（早中晚·會填到各自位置）")+'<div style="display:flex;gap:8px;margin-top:9px;">'+fencaCell("AM")+fencaCell("NOON")+fencaCell("PM")+'</div>')+'</div>';
}
function dutyRow(d,conf){
  var b=blockOf(d),over=d.assigned.length>d.count,under=d.assigned.length<d.count,right;
  if(d.keepAll)right='<span style="font-size:11.5px;font-weight:800;color:'+C.green+';background:'+C.greenSoft+';padding:3px 8px;border-radius:7px;">全班261</span>';
  else{var sc=over?C.red:under?C.amber:C.green,sb=over?C.redSoft:under?C.amberSoft:C.greenSoft;right='<span style="font-size:11.5px;font-weight:800;color:'+sc+';background:'+sb+';padding:3px 8px;border-radius:7px;">'+d.assigned.length+'/'+d.count+'</span>';}
  var who;
  if(d.keepAll)who='<span style="font-size:12.5px;color:'+C.sub+';">八人一起</span>';
  else if(d.assigned.length)who=d.assigned.map(function(pid){var bad=conf[d.id+":"+pid];return '<span style="font-size:12.5px;font-weight:700;color:'+(bad?C.red:C.greenDeep)+';">'+esc(nameOf(pid))+'</span>';}).join('<span style="color:'+C.line+';">、</span>');
  else who='<span style="font-size:12.5px;color:'+C.sub+';">點我指派</span>';
  var tag=d.kind==="manual"?'<span style="font-size:10px;font-weight:700;color:'+C.brass+';background:'+C.brassSoft+';padding:1px 6px;border-radius:5px;margin-left:6px;">手動</span>':"";
  var extag=d.extra?(function(){var gc=d.extra==="big"?GCOLORS["大公差"]:GCOLORS["小公差"];return '<span style="font-size:10px;font-weight:800;color:'+gc+';background:'+gc+'1A;padding:1px 6px;border-radius:5px;margin-left:5px;">'+(d.extra==="big"?"大":"小")+'</span>';})():"";
  var timetag=d.schedTime?'<span style="font-size:10px;font-weight:700;color:'+C.sub+';margin-left:5px;font-variant-numeric:tabular-nums;">'+esc(hmFmt(d.schedTime))+'</span>':"";
  return '<button class="btn" data-action="pick" data-duty="'+d.id+'" style="width:100%;display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:12px;border:1px solid '+C.line+';background:'+C.surface+';margin-bottom:7px;text-align:left;"><span style="font-weight:800;color:'+C.ink+';flex-shrink:0;max-width:46%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;">'+esc(d.label)+tag+extag+timetag+'</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+who+'</span>'+right+'</button>';
}
function dutyList(){
  var items=state.duties.filter(function(d){return (d.kind==="fill"||d.kind==="manual")&&!d.removed&&!d.fenca;});
  var conf=computeConflicts(),out="";
  GROUPS.forEach(function(p){var ds=items.filter(function(d){return d.period===p.key;});if(!ds.length)return;out+='<div style="display:flex;align-items:center;gap:8px;margin:16px 4px 8px;"><span style="font-size:13px;font-weight:800;color:'+C.green+';letter-spacing:1px;">'+p.label+'</span><div style="flex:1;height:1px;background:'+C.line+';"></div></div>';ds.forEach(function(d){out+=dutyRow(d,conf);});});
  out+=addDutyBlock();return out;
}
function addDutyBlock(){
  var f=state.addForm;
  if(!f.open)return '<button class="btn" data-action="open-add" style="width:100%;margin-top:10px;padding:11px;border-radius:12px;border:1.5px dashed '+C.line+';background:transparent;color:'+C.sub+';font-weight:700;font-size:13.5px;display:flex;align-items:center;justify-content:center;gap:6px;">'+icon("plus",15)+' 手動新增勤務</button>';
  var seg=GROUPS.map(function(p){var on=f.period===p.key;return '<button class="btn" data-action="af-period" data-p="'+p.key+'" style="flex:1;padding:8px 0;border-radius:8px;font-size:12px;font-weight:700;border:1px solid '+(on?C.green:C.line)+';background:'+(on?C.greenSoft:C.surface)+';color:'+(on?C.greenDeep:C.sub)+';">'+p.label+'</button>';}).join("");
  var stepper=f.keepAll?"":'<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:12.5px;color:'+C.sub+';">人數</span><div style="display:flex;align-items:center;gap:2px;border:1px solid '+C.line+';border-radius:9px;padding:2px;"><button class="btn" data-action="af-dec" style="width:28px;height:28px;border-radius:7px;border:none;background:'+C.bg+';color:'+C.green+';display:flex;align-items:center;justify-content:center;">'+icon("minus",14)+'</button><span style="width:24px;text-align:center;font-size:15px;font-weight:800;">'+f.count+'</span><button class="btn" data-action="af-inc" style="width:28px;height:28px;border-radius:7px;border:none;background:'+C.bg+';color:'+C.green+';display:flex;align-items:center;justify-content:center;">'+icon("plus",14)+'</button></div></div>';
  return card(label("手動新增勤務")+'<input data-input="af-name" value="'+esc(f.name)+'" placeholder="勤務名稱" style="width:100%;margin-top:10px;padding:10px 12px;border-radius:10px;border:1px solid '+C.line+';background:'+C.bg+';font-size:14px;outline:none;" /><div style="display:flex;gap:6px;margin-top:9px;">'+seg+'</div><div style="display:flex;gap:6px;margin-top:8px;">'+[[null,"一般",C.green],["big","大公差",GCOLORS["大公差"]],["small","小公差",GCOLORS["小公差"]]].map(function(o){var on=(f.extra||null)===o[0];return '<button class="btn" data-action="af-extra" data-ex="'+(o[0]||"none")+'" style="flex:1;padding:7px 0;border-radius:8px;font-size:12px;font-weight:700;border:1px solid '+(on?o[2]:C.line)+';background:'+(on?o[2]+"1A":C.surface)+';color:'+(on?o[2]:C.sub)+';">'+o[1]+'</button>';}).join("")+'</div><input data-input="af-time" value="'+esc(f.time||"")+'" placeholder="時間（可留白，例 0800）" style="width:100%;margin-top:9px;padding:9px 12px;border-radius:10px;border:1px solid '+C.line+';background:'+C.bg+';font-size:13.5px;outline:none;font-family:ui-monospace,Menlo,monospace;" /><div style="display:flex;align-items:center;justify-content:space-between;margin-top:11px;"><button class="btn" data-action="af-keepall" style="display:flex;align-items:center;gap:7px;padding:7px 10px;border-radius:9px;border:1px solid '+(f.keepAll?C.green:C.line)+';background:'+(f.keepAll?C.greenSoft:C.surface)+';color:'+(f.keepAll?C.greenDeep:C.sub)+';font-size:12.5px;font-weight:600;"><span style="width:15px;height:15px;border-radius:5px;border:1.5px solid '+(f.keepAll?C.green:C.sub)+';background:'+(f.keepAll?C.green:"transparent")+';display:flex;align-items:center;justify-content:center;">'+(f.keepAll?icon("check",10,"#fff"):"")+'</span>八人一起</button>'+stepper+'</div><div style="display:flex;gap:8px;margin-top:12px;"><button class="btn" data-action="af-cancel" style="flex:1;padding:10px;border-radius:10px;border:1px solid '+C.line+';background:'+C.surface+';color:'+C.sub+';font-weight:700;font-size:13.5px;">取消</button><button class="btn" data-action="af-add" style="flex:2;padding:10px;border-radius:10px;border:none;background:'+C.green+';color:#fff;font-weight:700;font-size:13.5px;">加入</button></div>',"margin-top:10px;");
}
function boardActions(){return '<div style="margin-top:18px;"><button class="btn" data-action="auto" style="width:100%;padding:14px;border-radius:14px;border:none;background:'+C.greenDeep+';color:#fff;font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;gap:7px;box-shadow:0 6px 16px rgba(42,70,52,.22);">'+icon("wand",18,"#fff")+' 自動分配</button></div><button class="btn" data-action="copy-filled" style="width:100%;margin-top:8px;padding:14px;border-radius:14px;border:none;background:'+C.brass+';color:#fff;font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;gap:7px;">'+icon("copy",18,"#fff")+' 複製填好的公版（給班長）</button><button class="btn" data-action="copy-persons" style="width:100%;margin-top:8px;padding:14px;border-radius:14px;border:1.5px solid '+C.green+';background:'+C.greenSoft+';color:'+C.greenDeep+';font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;gap:7px;">'+icon("copy",18)+' 複製個人分工（給大家）</button><button class="btn" data-action="toggle-preview" style="width:100%;margin-top:8px;padding:9px;border:none;background:transparent;color:'+C.sub+';font-size:13px;font-weight:700;">'+(state.showPreview?"收起預覽 ▲":"預覽 ▼")+'</button>';}
function previewCard(){return card('<div style="font-size:11px;font-weight:800;letter-spacing:1px;color:'+C.sub+';margin-bottom:6px;">填好的公版</div><pre style="margin:0;font-size:12.5px;line-height:1.65;white-space:pre-wrap;word-break:break-word;color:'+C.ink+';font-family:ui-monospace,Menlo,monospace;">'+esc(buildFilled())+'</pre><div style="height:1px;background:'+C.line+';margin:12px 0;"></div><div style="font-size:11px;font-weight:800;letter-spacing:1px;color:'+C.sub+';margin-bottom:6px;">個人分工</div><pre style="margin:0;font-size:12.5px;line-height:1.65;white-space:pre-wrap;word-break:break-word;color:'+C.ink+';font-family:ui-monospace,Menlo,monospace;">'+esc(buildPersonList())+'</pre>',"margin-top:2px;");}
function commitBtn(){return '<button class="btn" data-action="commit" style="width:100%;margin-top:12px;padding:13px;border-radius:14px;border:1.5px solid '+C.green+';background:'+C.greenSoft+';color:'+C.greenDeep+';font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;gap:7px;">'+icon("check",17)+' 計入統計／更新行程（可重複）</button>';}

/* ---------- 統計 ---------- */
function statsCard(p){
  var G=HIST.g[p.id]||{},order=["打掃","公差","大公差","小公差","打飯","分菜"];
  var tot=total(p.id);
  var seg=order.filter(function(g){return G[g];}).map(function(g){return '<div style="width:'+(tot?(G[g]/tot*100):0)+'%;background:'+GCOLORS[g]+';"></div>';}).join("");
  var gs=order.filter(function(g){return G[g];});
  var chips=gs.length?gs.map(function(g){var col=GCOLORS[g];return '<span style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:800;color:'+col+';background:'+col+'1A;padding:3px 9px;border-radius:999px;"><span style="width:7px;height:7px;border-radius:999px;background:'+col+';"></span>'+g+' '+G[g]+'</span>';}).join(""):'<span style="font-size:11.5px;color:'+C.sub+';">尚未排過</span>';
  return '<button class="btn tap" data-action="open-person" data-id="'+p.id+'" style="text-align:left;background:'+C.surface+';border:1px solid '+C.line+';border-radius:14px;padding:12px;"><div style="display:flex;align-items:center;gap:8px;">'+badge(p.code,22,"green")+'<span style="flex:1;min-width:0;font-size:14px;font-weight:800;color:'+C.ink+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(nameOf(p.id))+'</span></div><div style="margin-top:8px;display:flex;align-items:baseline;gap:3px;"><span style="font-size:22px;font-weight:800;color:'+C.greenDeep+';font-variant-numeric:tabular-nums;">'+tot+'</span><span style="font-size:11px;color:'+C.sub+';">次</span></div><div style="display:flex;height:7px;border-radius:4px;overflow:hidden;background:'+C.line+';margin-top:6px;">'+seg+'</div><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;">'+chips+'</div></button>';
}
function importBlock(){
  if(!state.importOpen)return '<button class="btn" data-action="open-import" style="width:100%;padding:12px;border-radius:12px;border:1.5px dashed '+C.green+';background:transparent;color:'+C.green+';font-weight:700;font-size:13.5px;display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:10px;">'+icon("plus",15)+' 貼上已填好的公版來記錄</button>';
  return card(label("貼上已填好名字的公版")+'<div style="font-size:11.5px;color:'+C.sub+';margin-top:6px;">會找出裡面我們 8 個人的名字，照勤務名稱記一次（打飯算一類、公差也會記），日期自動抓公版上的。</div><textarea data-input="import" placeholder="貼上已經填好我們名字的整份公版…" style="width:100%;height:110px;margin-top:10px;padding:12px;border-radius:10px;border:1px solid '+C.line+';background:'+C.bg+';font-size:13px;line-height:1.6;outline:none;resize:vertical;font-family:ui-monospace,Menlo,monospace;">'+esc(importText)+'</textarea><div style="display:flex;gap:8px;margin-top:10px;"><button class="btn" data-action="cancel-import" style="flex:1;padding:11px;border-radius:10px;border:1px solid '+C.line+';background:'+C.surface+';color:'+C.sub+';font-weight:700;font-size:13.5px;">取消</button><button class="btn" data-action="do-import" style="flex:2;padding:11px;border-radius:10px;border:none;background:'+C.green+';color:#fff;font-weight:700;font-size:13.5px;">解析並記錄</button></div>',"margin-bottom:10px;");
}
function daysBlock(){
  if(!state.log.length)return '';
  var ro=state.readOnly;
  var byDay={},keys=[];
  state.log.forEach(function(e){var md=String(e.date).replace(/[（(].*$/,"");if(!byDay[md]){byDay[md]={md:md,date:e.date,n:0};keys.push(md);}byDay[md].n+=e.entries.length;});
  keys.sort(function(a,b){return dnum(b)-dnum(a);});
  var rows=keys.map(function(md){
    var e=byDay[md];
    var right;
    if(ro)right="";
    else if(state.confirmDelDay===md)right='<div style="display:flex;gap:6px;"><button class="btn" data-action="del-day-cancel" style="border:1px solid '+C.line+';background:'+C.surface+';color:'+C.sub+';font-weight:700;font-size:12px;border-radius:8px;padding:5px 10px;">取消</button><button class="btn" data-action="del-day-go" data-md="'+esc(md)+'" style="border:none;background:'+C.red+';color:#fff;font-weight:700;font-size:12px;border-radius:8px;padding:5px 10px;">確定刪</button></div>';
    else right='<button class="btn" data-action="del-day-ask" data-md="'+esc(md)+'" style="display:flex;align-items:center;gap:5px;border:none;background:transparent;color:'+C.red+';font-weight:700;font-size:12.5px;">'+icon("trash",14)+' 刪這天</button>';
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border:1px solid '+C.line+';border-radius:11px;margin-bottom:7px;background:'+C.surface+';"><div><span style="font-size:14px;font-weight:800;">'+esc(e.date)+'</span><span style="font-size:12px;color:'+C.sub+';margin-left:8px;">'+e.n+' 人次</span></div>'+right+'</div>';
  }).join("");
  var open=state.daysOpen;
  var head='<button class="btn" data-action="toggle-days" style="width:100%;display:flex;align-items:center;gap:8px;padding:2px 0;margin-top:2px;border:none;background:transparent;text-align:left;">'+label(ro?("各天紀錄（"+keys.length+"）"):("各天紀錄（"+keys.length+"）· 刪這天＝行程＋統計一起刪"))+'<span style="margin-left:auto;font-size:11.5px;font-weight:700;color:'+C.sub+';white-space:nowrap;">'+(open?"收合 ▾":"展開 ▸")+'</span></button>';
  return head+(open?'<div style="margin-top:9px;">'+rows+'</div>':"");
}
function backupBlock(){
  if(!state.backupOpen)return '<button class="btn" data-action="open-backup" style="width:100%;margin-top:10px;padding:11px;border-radius:11px;border:1px solid '+C.line+';background:'+C.surface+';color:'+C.sub+';font-weight:700;font-size:12.5px;">備份／換手機還原</button>';
  var code=JSON.stringify({v:3,names:state.names,log:state.log,mealQueue:state.mealQueue});
  return card(label("備份碼（複製存起來或傳給隊友）")+'<textarea readonly onclick="this.select()" style="width:100%;height:80px;margin-top:9px;padding:11px;border-radius:10px;border:1px solid '+C.line+';background:'+C.bg+';font-size:11px;line-height:1.5;outline:none;resize:vertical;font-family:ui-monospace,Menlo,monospace;">'+esc(code)+'</textarea><button class="btn" data-action="copy-backup" style="width:100%;margin-top:8px;padding:11px;border-radius:10px;border:none;background:'+C.brass+';color:#fff;font-weight:700;font-size:13.5px;display:flex;align-items:center;justify-content:center;gap:6px;">'+icon("copy",15,"#fff")+' 複製備份碼</button>'
    +'<div style="font-size:12px;font-weight:800;letter-spacing:1px;color:'+C.sub+';margin-top:14px;">還原（貼上備份碼，會覆蓋現有紀錄）</div><textarea data-input="restore" placeholder="貼上另一支手機複製出來的備份碼…" style="width:100%;height:70px;margin-top:9px;padding:11px;border-radius:10px;border:1px solid '+C.line+';background:'+C.bg+';font-size:11px;line-height:1.5;outline:none;resize:vertical;font-family:ui-monospace,Menlo,monospace;">'+esc(restoreText)+'</textarea><div style="display:flex;gap:8px;margin-top:8px;"><button class="btn" data-action="close-backup" style="flex:1;padding:11px;border-radius:10px;border:1px solid '+C.line+';background:'+C.surface+';color:'+C.sub+';font-weight:700;font-size:13px;">收起</button><button class="btn" data-action="do-restore" style="flex:1;padding:11px;border-radius:10px;border:none;background:'+C.green+';color:#fff;font-weight:700;font-size:13px;">還原</button></div>'
    ,"margin-top:10px;");
}
function bakedUrl(){return DEFAULT_SYNC_URL&&/script\.google\.com/.test(DEFAULT_SYNC_URL);}
function syncBlock(){
  if(bakedUrl()){
    var bon=state.syncStatus==="on",ber=state.syncStatus==="err";
    var bcol=bon?C.green:ber?C.red:C.sub,btxt=bon?"已連線 · 每 20 秒自動同步 · 全隊共用同一份":ber?"連線異常，稍後自動重試":"連線中…";
    var nb=Object.keys(state.boards).length;
    var upBtn=state.readOnly?"":'<button class="btn" data-action="push-now" style="width:100%;margin-top:8px;padding:10px;border-radius:10px;border:1px solid '+C.brass+';background:'+C.brassSoft+';color:'+C.amber+';font-weight:800;font-size:13px;">↑ 立即備份到雲端（'+nb+' 天排班板＋行程）</button>';
    return card('<div style="display:flex;align-items:center;gap:8px;"><span style="width:9px;height:9px;border-radius:999px;background:'+bcol+';"></span><span style="font-size:13px;font-weight:700;color:'+bcol+';">'+btxt+'</span><span style="margin-left:auto;">'+icon("check",15,C.green)+'</span></div><button class="btn" data-action="pull-now" style="width:100%;margin-top:10px;padding:10px;border-radius:10px;border:1px solid '+C.line+';background:'+C.surface+';color:'+C.green+';font-weight:700;font-size:13px;">立即同步</button>'+upBtn,"margin-top:10px;");
  }
  if(!state.syncUrl&&!state.syncOpen)return '<button class="btn" data-action="open-sync" style="width:100%;margin-top:10px;padding:11px;border-radius:11px;border:1.5px dashed '+C.green+';background:transparent;color:'+C.green+';font-weight:700;font-size:12.5px;">☁ 設定雲端同步（多人共用同一份）</button>';
  if(state.syncUrl&&!state.syncOpen){
    var on=state.syncStatus==="on",er=state.syncStatus==="err";
    var col=on?C.green:er?C.red:C.sub,txt=on?"已連線 · 每 20 秒自動同步":er?"連線異常，稍後重試":"連線中…";
    return card('<div style="display:flex;align-items:center;gap:8px;"><span style="width:9px;height:9px;border-radius:999px;background:'+col+';"></span><span style="font-size:13px;font-weight:700;color:'+col+';">'+txt+'</span></div><div style="display:flex;gap:8px;margin-top:10px;"><button class="btn" data-action="pull-now" style="flex:1;padding:10px;border-radius:10px;border:1px solid '+C.line+';background:'+C.surface+';color:'+C.green+';font-weight:700;font-size:13px;">立即同步</button><button class="btn" data-action="open-sync" style="flex:1;padding:10px;border-radius:10px;border:1px solid '+C.line+';background:'+C.surface+';color:'+C.sub+';font-weight:700;font-size:13px;">設定</button></div>',"margin-top:10px;");
  }
  var left=state.syncUrl?'<button class="btn" data-action="disconnect-sync" style="flex:1;padding:11px;border-radius:10px;border:1px solid '+C.redSoft+';background:'+C.redSoft+';color:'+C.red+';font-weight:700;font-size:13px;">中斷</button>':'<button class="btn" data-action="close-sync" style="flex:1;padding:11px;border-radius:10px;border:1px solid '+C.line+';background:'+C.surface+';color:'+C.sub+';font-weight:700;font-size:13px;">取消</button>';
  return card(label("雲端同步網址（Apps Script 的 /exec）")+'<div style="font-size:11.5px;color:'+C.sub+';margin-top:6px;">先在 Google 試算表建立 Apps Script 並部署成「任何人」，把 /exec 網址貼進來。全隊貼同一個網址＝共用同一份。</div><input data-input="syncurl" value="'+esc(syncInput||state.syncUrl)+'" placeholder="https://script.google.com/macros/s/.../exec" style="width:100%;margin-top:10px;padding:11px;border-radius:10px;border:1px solid '+C.line+';background:'+C.bg+';font-size:12px;outline:none;font-family:ui-monospace,Menlo,monospace;" /><div style="display:flex;gap:8px;margin-top:10px;">'+left+'<button class="btn" data-action="connect-sync" style="flex:2;padding:11px;border-radius:10px;border:none;background:'+C.green+';color:#fff;font-weight:700;font-size:13px;">連線並同步</button></div>',"margin-top:10px;");
}
function missingBoardDays(){
  var miss={};
  state.log.forEach(function(e){if(isExtra(e))return;var md=mdOf(e.date);
    if(!/\d{1,2}\/\d{1,2}/.test(md))return;
    if(state.boards[md]||state.tomb[md])return;
    if(!e.entries||!e.entries.length)return;
    miss[md]=1;});
  return Object.keys(miss);
}
function rescueBar(){
  if(state.readOnly)return "";
  var miss=missingBoardDays();
  if(!miss.length)return "";
  return '<div style="margin-top:12px;">'+card('<div style="font-size:13px;font-weight:800;color:'+C.amber+';">偵測到 '+miss.length+' 天有紀錄但沒有排班板</div><div style="font-size:11.5px;color:'+C.sub+';margin-top:5px;line-height:1.6;">'+esc(miss.slice(0,10).join("、"))+(miss.length>10?" …":"")+'</div><button class="btn" data-action="rebuild-boards" style="width:100%;margin-top:10px;padding:11px;border-radius:11px;border:none;background:'+C.brass+';color:#fff;font-weight:800;font-size:13.5px;">從紀錄重建這些排班板</button>',"border-color:"+C.brass+";")+'</div>';
}
function rebuildBoards(){
  // 救援：排班板不見時，用還在的統計紀錄（log）＋行程（plans）把每天重建回來
  var made=0,skip=0;
  state.log.slice().forEach(function(e){
    if(isExtra(e))return;                      // 臨時行程不是排班板
    var md=mdOf(e.date);
    if(!/\d{1,2}\/\d{1,2}/.test(md))return;
    if(state.boards[md]){skip++;return;}       // 已存在的不動
    if(state.tomb[md])return;                  // 曾刻意刪掉的不要救回來
    if(!e.entries||!e.entries.length)return;
    boardFromImport(md,e.entries,(state.plans[md]&&state.plans[md].weekday)||"");
    made++;
  });
  if(made){persistLocal();pushSync();}
  flash(made?("已重建 "+made+" 天排班板"+(skip?"（"+skip+" 天原本就在）":"")):"沒有可重建的日子（排班板都在）");
  render();
}
function statsPage(){
  var grand=0;PEOPLE.forEach(function(p){grand+=total(p.id);});
  var grid='<div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;align-items:start;margin-bottom:16px;">'+PEOPLE.map(statsCard).join("")+'</div>';
  var reset=!state.confirmReset?'<button class="btn" data-action="ask-reset" style="width:100%;margin-top:4px;padding:11px;border-radius:11px;border:1px solid '+C.line+';background:'+C.surface+';color:'+C.red+';font-weight:700;font-size:12.5px;display:flex;align-items:center;justify-content:center;gap:6px;">'+icon("rotate",14)+' 清空全部統計</button>':'<div style="display:flex;gap:8px;margin-top:4px;"><button class="btn" data-action="cancel-reset" style="flex:1;padding:11px;border-radius:11px;border:1px solid '+C.line+';background:'+C.surface+';color:'+C.sub+';font-weight:700;font-size:12.5px;">取消</button><button class="btn" data-action="do-reset" style="flex:1;padding:11px;border-radius:11px;border:none;background:'+C.red+';color:#fff;font-weight:700;font-size:12.5px;">確定清空</button></div>';
  var legend='<div style="display:flex;flex-wrap:wrap;gap:10px 14px;margin:0 2px 12px;">'+["打掃","公差","大公差","小公差","打飯","分菜"].map(function(g){return '<span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;color:'+C.ink+';"><span style="width:11px;height:11px;border-radius:3px;background:'+GCOLORS[g]+';"></span>'+g+'</span>';}).join("")+'</div>';
  var ro=state.readOnly;
  var hint=ro?'累積共 '+grand+' 人次。點卡片可看每人明細。':'累積共 '+grand+' 人次。點卡片可改名字、扣單項或清空該人。';
  var top='<div style="font-size:12.5px;color:'+C.sub+';margin:0 2px 8px;">'+hint+'</div>'+legend+grid;
  if(ro)return top;
  return top+syncBlock()+importBlock()+daysBlock()+backupBlock()+reset;
}

/* ---------- 站哨 ---------- */
function guardPaste_(){return card(label("貼上本週衛哨公版")+'<textarea data-input="gpaste" placeholder="把班長的衛哨表整份貼進來（含日期與 2402、1214 這種時段）。" style="width:100%;height:150px;margin-top:10px;padding:12px;border-radius:10px;border:1px solid '+C.line+';background:'+C.bg+';font-size:13.5px;line-height:1.6;outline:none;resize:vertical;font-family:ui-monospace,Menlo,monospace;">'+esc(state.guardPaste)+'</textarea><button class="btn" data-action="gparse" style="width:100%;margin-top:10px;padding:13px;border-radius:11px;border:none;background:'+C.greenDeep+';color:#fff;font-weight:800;font-size:15px;">解析站哨</button>');}
function guardRow(sh){
  var ro=state.readOnly,filled=sh.assigned.length>0;
  var who=filled?sh.assigned.map(function(id){return '<span style="font-weight:700;color:'+C.greenDeep+';">'+esc(nameOf(id))+'</span>';}).join("、"):'<span style="color:'+C.sub+';font-size:12.5px;">'+(ro?"未排":"點我指派")+'</span>';
  var dtag=sh.date?'<span style="flex-shrink:0;font-size:10.5px;font-weight:800;color:'+(parseInt(sh.code.slice(0,2),10)<18?C.brass:C.sub)+';font-variant-numeric:tabular-nums;">'+esc(sh.date)+'</span>':"";
  var inner='<span style="flex-shrink:0;font-variant-numeric:tabular-nums;font-weight:800;color:'+C.ink+';font-size:14px;">'+esc(sh.code)+'</span>'+dtag+'<span style="flex-shrink:0;font-size:11.5px;color:'+C.sub+';">'+shiftHM(sh.code)+esc(sh.loc||"")+'</span><span style="flex:1;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+who+'</span>';
  var st='width:100%;display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:12px;border:1px solid '+(filled?C.green:C.line)+';background:'+(filled?C.greenSoft:C.surface)+';margin-bottom:7px;text-align:left;';
  if(ro)return '<div style="'+st+'">'+inner+'</div>';
  return '<button class="btn" data-action="gpick" data-shift="'+sh.id+'" style="'+st+'">'+inner+'</button>';
}
function guardStats(){
  var ro=state.readOnly;
  var per={};PEOPLE.forEach(function(p){per[p.id]=[];});
  state.guard.days.forEach(function(day){day.shifts.forEach(function(sh){sh.assigned.forEach(function(pid){if(per[pid])per[pid].push((sh.date||day.date)+" "+shiftHM(sh.code));});});});
  var stepBtn=function(act,pid,txt){return '<button class="btn tap" data-action="'+act+'" data-id="'+pid+'" style="width:26px;height:26px;border-radius:8px;border:1px solid '+C.line+';background:'+C.surface+';color:'+C.sub+';font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">'+txt+'</button>';};
  var rows=PEOPLE.map(function(p){
    var list=per[p.id],wk=list.length,tally=state.guardTally[p.id]||0,col=tally?C.greenDeep:C.sub;
    var adj=ro?'':'<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">'+stepBtn("gt-dec",p.id,"−")+'<span style="min-width:20px;text-align:center;font-size:14px;font-weight:800;font-variant-numeric:tabular-nums;color:'+col+';">'+tally+'</span>'+stepBtn("gt-inc",p.id,"＋")+'</div>';
    var tallyTxt=ro?'<span style="font-size:13px;font-weight:800;color:'+col+';">累積 ×'+tally+'</span>':'';
    return '<div style="display:flex;align-items:center;gap:8px;padding:8px 2px;border-bottom:1px solid '+C.line+';">'+badge(personByCode(p.id).code,22,tally?"green":"mute")+'<div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:700;color:'+C.ink+';">'+esc(nameOf(p.id))+' <span style="font-size:11px;color:'+C.sub+';font-weight:700;">本週 ×'+wk+'</span> '+tallyTxt+'</div>'+(list.length?'<div style="font-size:11px;color:'+C.sub+';margin-top:2px;line-height:1.5;">'+list.map(esc).join("　")+'</div>':"")+'</div>'+adj+'</div>';
  }).join("");
  var clearBtn="";
  if(!ro){
    clearBtn=state.confirmGuardClear
      ?'<div style="display:flex;gap:8px;margin-top:12px;"><button class="btn" data-action="gt-clear-cancel" style="flex:1;padding:11px;border-radius:11px;border:1px solid '+C.line+';background:'+C.surface+';color:'+C.sub+';font-weight:700;font-size:13px;">取消</button><button class="btn" data-action="gt-clear-go" style="flex:1;padding:11px;border-radius:11px;border:none;background:'+C.red+';color:#fff;font-weight:700;font-size:13px;">確定全部歸零</button></div>'
      :'<button class="btn" data-action="gt-clear-ask" style="width:100%;margin-top:12px;padding:11px;border-radius:11px;border:1px solid '+C.line+';background:'+C.surface+';color:'+C.red+';font-weight:700;font-size:12.5px;display:flex;align-items:center;justify-content:center;gap:6px;">'+icon("rotate",14)+' 清空站哨累積次數</button>';
  }
  var open=state.guardTallyOpen;
  var head='<button class="btn" data-action="toggle-gtally" style="width:100%;display:flex;align-items:center;gap:8px;padding:2px 0;border:none;background:transparent;text-align:left;">'+label("站哨累積次數"+(ro?"":" · 可 −／＋ 調整"))+'<span style="margin-left:auto;font-size:11.5px;font-weight:700;color:'+C.sub+';white-space:nowrap;">'+(open?"收合 ▾":"展開 ▸")+'</span></button>';
  return card(head+(open?('<div style="margin-top:8px;">'+rows+'</div>'+clearBtn):""),"margin-top:14px;");
}
function guardWeekTabs(){
  var keys=guardWeekList(),ro=state.readOnly;
  if(!keys.length)return "";
  if(keys.length<=1&&ro)return "";   // 唯讀又只有一週，不用切
  var chips=keys.map(function(k){var w=state.guardWeeks[k],on=(k===state.activeGuardWeek);return '<button class="btn" data-action="guard-week" data-k="'+esc(k)+'" style="flex:0 0 auto;display:flex;align-items:center;gap:4px;padding:6px 11px;border-radius:999px;font-size:12.5px;font-weight:700;border:1px solid '+(on?C.green:C.line)+';background:'+(on?C.greenSoft:C.surface)+';color:'+(on?C.greenDeep:C.sub)+';white-space:nowrap;">'+esc(guardWeekLabel(w))+(w&&w.committed?icon("check",11,on?C.green:C.sub):"")+'</button>';}).join("");
  var add=ro?"":'<button class="btn" data-action="gnewpaste" style="flex:0 0 auto;display:flex;align-items:center;gap:3px;padding:6px 11px;border-radius:999px;font-size:12px;font-weight:800;border:1px dashed '+C.green+';background:transparent;color:'+C.green+';white-space:nowrap;">'+icon("plus",13,C.green)+'新一週</button>';
  return '<div style="display:flex;gap:6px;align-items:center;overflow-x:auto;-webkit-overflow-scrolling:touch;padding:2px 0 9px;">'+chips+add+'</div>';
}
function guardPage(){
  if(state.readOnly){
    var gwtR=guardWeekTabs();
    var okDays=(state.guard.loaded?state.guard.days:[]).filter(function(d){return d.shifts&&d.shifts.length;});
    if(!state.guard.loaded||!okDays.length||!guardCount())
      return gwtR+'<div style="text-align:center;color:'+C.sub+';font-size:13.5px;padding:48px 16px;line-height:1.8;">這一週還沒有排站哨。</div>';
    var rh=gwtR+'<div style="display:flex;align-items:center;gap:8px;background:'+C.greenSoft+';border:1px solid '+C.green+';border-radius:12px;padding:11px 14px;margin-bottom:2px;color:'+C.greenDeep+';font-weight:800;font-size:14px;">'+icon("shield",16,C.green)+' '+esc(guardWeekLabel(state.guardWeeks[state.activeGuardWeek])||"本週")+' 站哨</div>';
    okDays.forEach(function(day){
      rh+='<div style="display:flex;align-items:center;gap:8px;margin:15px 4px 8px;"><span style="font-size:13px;font-weight:800;color:'+C.green+';">'+esc(day.range)+'</span><div style="flex:1;height:1px;background:'+C.line+';"></div></div>';
      day.shifts.forEach(function(sh){rh+=guardRow(sh);});
    });
    return rh;
  }
  var showBox=!state.guard.loaded||state.showGuardPaste;
  if(showBox)return guardWeekTabs()+guardPaste_();
  var h=guardWeekTabs()+'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;background:'+C.greenSoft+';border:1px solid '+C.green+';border-radius:12px;padding:11px 14px;margin-bottom:6px;"><div style="display:flex;align-items:center;gap:8px;color:'+C.greenDeep+';font-weight:700;font-size:13.5px;">'+icon("check",16,C.green)+' '+esc(guardWeekLabel(state.guardWeeks[state.activeGuardWeek])||"本週")+' · '+guardCount()+' 班</div><button class="btn" data-action="grepaste" style="border:none;background:transparent;color:'+C.green+';font-weight:700;font-size:13px;text-decoration:underline;">重新貼上</button></div>';
  state.guard.days.forEach(function(day){
    h+='<div style="display:flex;align-items:center;gap:8px;margin:15px 4px 8px;"><span style="font-size:13px;font-weight:800;color:'+C.green+';">'+esc(day.range)+'</span><div style="flex:1;height:1px;background:'+C.line+';"></div></div>';
    if(!day.shifts.length)h+='<div style="font-size:12px;color:'+C.sub+';padding:4px 6px;">（這天沒有班次）</div>';
    day.shifts.forEach(function(sh){h+=guardRow(sh);});
  });
  h+='<div style="margin-top:16px;"><button class="btn" data-action="gauto" style="width:100%;padding:14px;border-radius:14px;border:none;background:'+C.greenDeep+';color:#fff;font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;gap:7px;box-shadow:0 6px 16px rgba(42,70,52,.22);">'+icon("wand",18,"#fff")+' 自動平均分配</button></div>';
  h+='<button class="btn" data-action="gcopy" style="width:100%;margin-top:8px;padding:14px;border-radius:14px;border:none;background:'+C.brass+';color:#fff;font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;gap:7px;">'+icon("copy",18,"#fff")+' 複製填好的衛哨表（給班長）</button>';
  var cm=state.guard.committed;
  h+='<button class="btn" data-action="gcommit" style="width:100%;margin-top:8px;padding:13px;border-radius:14px;border:1.5px solid '+(cm?C.line:C.green)+';background:'+(cm?C.surface:C.greenSoft)+';color:'+(cm?C.sub:C.greenDeep)+';font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;gap:7px;">'+icon("check",17,cm?C.sub:C.green)+(cm?" 本週已計入":" 計入本週站哨統計")+'</button>';
  if(cm)h+='<button class="btn" data-action="g-uncommit" style="width:100%;margin-top:8px;padding:11px;border-radius:12px;border:1px solid '+C.line+';background:'+C.surface+';color:'+C.red+';font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;">'+icon("rotate",14)+' 取消本週計入（扣回累積、可重排）</button>';
  h+=guardStats();
  return h;
}
function guardInner(id){
  var sh=guardShiftById(id);if(!sh)return handleBar()+'<div style="padding:20px;">找不到班次</div>';
  var list=PEOPLE.slice().sort(function(a,b){return (state.guardTally[a.id]||0)-(state.guardTally[b.id]||0)||a.id-b.id;}).map(function(p){
    var on=sh.assigned.indexOf(p.id)>=0;
    return '<button data-action="gpick-toggle" data-pid="'+p.id+'" style="width:100%;display:flex;align-items:center;gap:11px;padding:11px 8px;border-radius:11px;border:none;background:'+(on?C.greenSoft:"transparent")+';text-align:left;">'+badge(personByCode(p.id).code,30,on?"green":"mute")+'<div style="flex:1;"><div style="font-size:15px;font-weight:700;color:'+C.ink+';">'+esc(nameOf(p.id))+'</div><div style="font-size:11.5px;color:'+C.sub+';">站哨累積 '+(state.guardTally[p.id]||0)+' 次</div></div><span style="width:24px;height:24px;border-radius:999px;border:2px solid '+(on?C.green:C.line)+';background:'+(on?C.green:"transparent")+';display:flex;align-items:center;justify-content:center;">'+(on?icon("check",14,"#fff"):"")+'</span></button>';
  }).join("");
  return handleBar()
    +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;"><div><div style="font-size:16px;font-weight:800;">'+esc(sh.code)+'　'+shiftHM(sh.code)+'</div><div style="font-size:11.5px;color:'+C.sub+';">'+esc((guardDayRange(id)||"")+(sh.loc||""))+'</div></div>'+xBtn()+'</div>'
    +'<div style="font-size:11px;color:'+C.sub+';margin:4px 0 8px;">依站哨累積次數少的排前面。可複選。</div>'
    +'<div class="sheet-list" style="max-height:44vh;overflow-y:auto;">'+list+'</div>'
    +'<div style="display:flex;gap:8px;margin-top:12px;"><button class="btn" data-action="gclear-shift" data-shift="'+sh.id+'" style="flex:0 0 auto;padding:13px 16px;border-radius:12px;border:1px solid '+C.redSoft+';background:'+C.redSoft+';color:'+C.red+';font-weight:700;font-size:14px;">清空</button><button class="btn" data-action="close-sheet" style="flex:1;padding:13px;border-radius:12px;border:none;background:'+C.green+';color:#fff;font-weight:800;font-size:15px;">完成</button></div>';
}
function guardDayRange(id){for(var i=0;i<state.guard.days.length;i++){var s=state.guard.days[i].shifts;for(var j=0;j<s.length;j++)if(s[j].id===id)return state.guard.days[i].range;}return "";}

/* ---------- 底層面板（picker / person） ---------- */
var overlay=document.getElementById("overlay");
var pickAdv=false,psOpen={},pickConfirm=null;
function handleBar(){return '<div data-drag="1" style="padding:9px 0 11px;cursor:grab;touch-action:none;"><div style="width:40px;height:4px;border-radius:2px;background:'+C.line+';margin:0 auto;"></div></div>';}
function xBtn(){return '<button class="btn" data-action="close-sheet" style="width:30px;height:30px;border-radius:8px;border:none;background:'+C.bg+';color:'+C.sub+';display:flex;align-items:center;justify-content:center;flex-shrink:0;">'+icon("x",16)+'</button>';}
function currentDuty(){return (state.sheet&&(state.sheet.type==="picker"||state.sheet.type==="tlblock"))?dutyById(state.sheet.id):null;}
function pickerInner(d){
  var occ=occupiesFor(d),B=blockOf(d),over=!d.keepAll&&d.assigned.length>d.count;
  var ctrl="";
  {
    var stepper=d.keepAll?"":'<div style="display:flex;align-items:center;gap:6px;"><span style="font-size:12.5px;color:'+C.sub+';">人數</span><div style="display:flex;align-items:center;gap:2px;border:1px solid '+C.line+';border-radius:9px;padding:2px;"><button class="btn" data-action="count-dec" style="width:28px;height:28px;border-radius:7px;border:none;background:'+C.bg+';color:'+C.green+';display:flex;align-items:center;justify-content:center;">'+icon("minus",14)+'</button><span style="width:22px;text-align:center;font-size:15px;font-weight:800;">'+d.count+'</span><button class="btn" data-action="count-inc" style="width:28px;height:28px;border-radius:7px;border:none;background:'+C.bg+';color:'+C.green+';display:flex;align-items:center;justify-content:center;">'+icon("plus",14)+'</button></div></div>';
    var keep=d.kind==="meal"?"":'<button class="btn" data-action="toggle-keepall" style="display:flex;align-items:center;gap:6px;padding:7px 10px;border-radius:9px;border:1px solid '+(d.keepAll?C.green:C.line)+';background:'+(d.keepAll?C.greenSoft:C.surface)+';color:'+(d.keepAll?C.greenDeep:C.sub)+';font-size:12.5px;font-weight:600;"><span style="width:15px;height:15px;border-radius:5px;border:1.5px solid '+(d.keepAll?C.green:C.sub)+';background:'+(d.keepAll?C.green:"transparent")+';display:flex;align-items:center;justify-content:center;">'+(d.keepAll?icon("check",10,"#fff"):"")+'</span>八人一起</button>';
    ctrl='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;">'+stepper+keep+'</div>';
  }
  var grp=dutyGroup(d),isEx=(d.extra==="big"||d.extra==="small");
  function gcnt(pid){return groupTotal(pid,grp);}
  function scnt(pid){return (HIST.h[pid]&&HIST.h[pid][d.label])||0;}
  function bigc(pid){return groupTotal(pid,"大公差");}
  function smac(pid){return groupTotal(pid,"小公差");}
  function exkey(pid){return d.extra==="big"?bigc(pid):smac(pid);}
  var sorted=PEOPLE.slice().sort(function(a,b){return (isEx?(exkey(a.id)-exkey(b.id)):((gcnt(a.id)-gcnt(b.id))||(scnt(a.id)-scnt(b.id))))||a.id-b.id;});
  var list=d.keepAll?'<div style="text-align:center;color:'+C.sub+';font-size:13px;padding:24px 0;">這項會保留成「261」，不用選人。</div>':sorted.map(function(p){
    var on=d.assigned.indexOf(p.id)>=0,off=(!on)&&!state.available[p.id],blocked=(!on)&&(occ[p.id]!==undefined),rb=(!on)&&restBlock(p.id,d),warn=off||blocked||!!rb;
    var cntTxt=isEx?("大公差 ×"+bigc(p.id)+"・小公差 ×"+smac(p.id)):(grp+"共 "+gcnt(p.id)+((d.label&&d.label!==grp)?("　"+d.label+" "+scnt(p.id)):""));
    var rzn=absentReason(p.id,curDate());
    var reasonTxt=off?("今日"+(rzn||"不排")):rb?rb:blocked?("同時段已排："+occ[p.id]):"";
    var subT=warn?reasonTxt:cntTxt,subCol=off?C.red:(rb||blocked)?C.amber:C.sub;
    if(pickConfirm===p.id){
      return '<div style="width:100%;display:flex;align-items:center;gap:9px;padding:9px 8px;border-radius:11px;background:'+C.amberSoft+';border:1px solid '+C.amber+';">'+badge(p.code,28,"mute")+'<div style="flex:1;min-width:0;"><div style="font-size:13.5px;font-weight:800;color:'+C.amber+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(nameOf(p.id))+'　'+esc(reasonTxt)+'</div><div style="font-size:11px;color:'+C.sub+';">還是要排他嗎？</div></div><button class="btn" data-action="pick-warn-cancel" style="flex:0 0 auto;padding:8px 11px;border-radius:9px;border:1px solid '+C.line+';background:'+C.surface+';color:'+C.sub+';font-weight:700;font-size:12.5px;">取消</button><button class="btn" data-action="pick-warn-go" data-pid="'+p.id+'" style="flex:0 0 auto;padding:8px 12px;border-radius:9px;border:none;background:'+C.amber+';color:#fff;font-weight:800;font-size:12.5px;">仍要排</button></div>';
    }
    var act=warn?('data-action="pick-warn" data-pid="'+p.id+'"'):('data-action="pick-toggle" data-pid="'+p.id+'"');
    return '<button '+act+' style="width:100%;display:flex;align-items:center;gap:11px;padding:11px 8px;border-radius:11px;border:none;background:'+(on?C.greenSoft:"transparent")+';opacity:'+(warn?0.5:1)+';text-align:left;">'+badge(p.code,30,on?"green":"mute")+'<div style="flex:1;"><div style="font-size:15px;font-weight:700;color:'+C.ink+';display:flex;align-items:center;gap:5px;">'+esc(nameOf(p.id))+(warn?icon("lock",12,C.amber):"")+'</div><div style="font-size:11.5px;color:'+subCol+';">'+subT+'</div></div><span style="width:24px;height:24px;border-radius:999px;border:2px solid '+(on?C.green:warn?C.amber:C.line)+';background:'+(on?C.green:"transparent")+';display:flex;align-items:center;justify-content:center;">'+(on?icon("check",14,"#fff"):"")+'</span></button>';
  }).join("");
  var blockNote=B?('<div style="font-size:11px;color:'+C.sub+';margin:0 0 8px;">'+(B.charAt(0)==="T"?"同一時間":"同一時段（"+(B==="AM"?"上午":B==="NOON"?"中午":B==="AFT"?"下午":"晚間")+"）")+'已排的人會鎖住。</div>'):"";
  var exSel=(d.kind==="meal"||d.fenca)?"":'<div style="display:flex;gap:6px;margin-bottom:9px;">'+[[null,"一般",C.green],["big","大公差",GCOLORS["大公差"]],["small","小公差",GCOLORS["小公差"]]].map(function(o){var on=(d.extra||null)===o[0];return '<button class="btn" data-action="set-extra" data-ex="'+(o[0]||"none")+'" style="flex:1;padding:7px 0;border-radius:8px;font-size:12px;font-weight:700;border:1px solid '+(on?o[2]:C.line)+';background:'+(on?o[2]+"1A":C.surface)+';color:'+(on?o[2]:C.sub)+';">'+o[1]+'</button>';}).join("")+'</div>';
  var stChips=effectiveTimed();
  var chips=stChips.length?'<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:7px;">'+stChips.slice(0,16).map(function(it){var on=(d.schedTime||"")===it.range;return '<button class="btn" data-action="set-time" data-t="'+esc(it.range)+'" style="padding:4px 8px;border-radius:7px;font-size:11px;font-weight:700;border:1px solid '+(on?C.green:C.line)+';background:'+(on?C.greenSoft:C.surface)+';color:'+(on?C.greenDeep:C.sub)+';font-variant-numeric:tabular-nums;">'+esc(it.range)+'</button>';}).join("")+'</div>':"";
  var timeBox='<div style="margin-bottom:11px;">'+label("時間（給行程頁用，可留白）")+'<input data-input="dtime" value="'+esc(d.schedTime||"")+'" placeholder="例：0800 或 0600-0630" style="width:100%;margin-top:7px;padding:9px 11px;border-radius:9px;border:1px solid '+C.line+';background:'+C.bg+';font-size:13.5px;outline:none;font-family:ui-monospace,Menlo,monospace;" />'+chips+'</div>';
  var advOpen=pickAdv;
  var timeStr=d.schedTime?hmFmt(d.schedTime):"";
  var advToggle='<button class="btn" data-action="toggle-adv" style="border:none;background:transparent;color:'+C.brass+';font-size:12px;font-weight:700;text-decoration:underline;padding:2px 4px;margin-left:auto;">'+(advOpen?"收起":"調整")+'</button>';
  var timePill=timeStr?'<span style="display:inline-flex;align-items:center;gap:4px;font-size:12.5px;font-weight:800;color:'+C.greenDeep+';background:'+C.greenSoft+';padding:3px 10px;border-radius:8px;font-variant-numeric:tabular-nums;">'+icon("clock",12,C.green)+esc(timeStr)+'</span>':'<span style="font-size:12px;color:'+C.sub+';">未標時間</span>';
  var timeBar='<div style="display:flex;align-items:center;gap:8px;margin-bottom:'+(advOpen?"9px":"11px")+';">'+timePill+advToggle+'</div>';
  var advBox=advOpen?(exSel+timeBox):"";
  return handleBar()
    +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;"><div style="font-size:16px;font-weight:800;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(d.label)+'</div><div style="display:flex;align-items:center;gap:8px;">'+(d.keepAll?"":'<span style="font-size:12.5px;color:'+(over?C.red:C.sub)+';font-weight:700;">'+d.assigned.length+'/'+d.count+'</span>')+xBtn()+'</div></div>'
    +blockNote+timeBar+advBox+ctrl+'<div class="sheet-list" style="max-height:38vh;overflow-y:auto;">'+list+'</div>'
    +'<div style="display:flex;gap:8px;margin-top:12px;"><button class="btn" data-action="del-duty" style="flex:0 0 auto;padding:13px 16px;border-radius:12px;border:1px solid '+C.redSoft+';background:'+C.redSoft+';color:'+C.red+';font-weight:700;font-size:14px;display:flex;align-items:center;gap:5px;">'+icon("trash",15)+' 移除</button><button class="btn" data-action="close-sheet" style="flex:1;padding:13px;border-radius:12px;border:none;background:'+C.green+';color:#fff;font-weight:800;font-size:15px;">完成</button></div>';
}
function personInner(id){
  var h=HIST.h[id]||{},G=HIST.g[id]||{},order=["打掃","公差","大公差","小公差","打飯","分菜"];
  var byG={};Object.keys(h).forEach(function(k){if(h[k]<=0)return;var grp=HIST.cg[k]||deriveGroup(k);(byG[grp]=byG[grp]||[]).push(k);});
  var tot=total(id);
  var groups=order.filter(function(g){return byG[g]&&byG[g].length;});Object.keys(byG).forEach(function(g){if(order.indexOf(g)<0)groups.push(g);});
  var body=groups.length?groups.map(function(g){
    var col=GCOLORS[g]||C.sub,cats=byG[g].sort(function(a,b){return h[b]-h[a];}),open=!!psOpen[g];
    var head='<button class="btn" data-action="ps-toggle" data-g="'+esc(g)+'" style="width:100%;display:flex;align-items:center;gap:8px;margin:10px 0 2px;padding:6px 4px;border:none;background:transparent;text-align:left;"><span style="width:10px;height:10px;border-radius:3px;background:'+col+';flex-shrink:0;"></span><span style="font-size:13.5px;font-weight:800;color:'+col+';">'+g+'</span><span style="font-size:11px;color:'+C.sub+';">'+cats.length+' 項</span><span style="font-size:13px;font-weight:800;color:'+col+';margin-left:auto;font-variant-numeric:tabular-nums;">×'+(G[g]||0)+'</span><span style="font-size:11px;color:'+C.sub+';width:14px;text-align:center;">'+(open?"▾":"▸")+'</span></button>';
    var rows=open?cats.map(function(k){return '<div style="display:flex;align-items:center;gap:10px;padding:6px 4px 6px 22px;"><span style="flex:1;font-size:13.5px;font-weight:600;color:'+C.ink+';">'+esc(k)+'</span><span style="font-size:13.5px;font-weight:800;color:'+C.greenDeep+';font-variant-numeric:tabular-nums;">×'+h[k]+'</span><button class="btn" data-action="ps-dec" data-id="'+id+'" data-cat="'+esc(k)+'" style="width:28px;height:28px;border-radius:8px;border:1px solid '+C.line+';background:'+C.surface+';color:'+C.red+';display:flex;align-items:center;justify-content:center;">'+icon("minus",14)+'</button></div>';}).join(""):"";
    return head+rows;
  }).join(""):'<div style="text-align:center;color:'+C.sub+';font-size:13px;padding:22px 0;">這個人還沒有紀錄。</div>';
  return handleBar()
    +'<div style="display:flex;align-items:center;gap:9px;margin-bottom:6px;">'+badge(personByCode(id).code,28,"green")+'<input data-input="name" data-id="'+id+'" value="'+esc(nameOf(id))+'" style="flex:1;min-width:0;border:none;background:transparent;font-size:16px;font-weight:800;color:'+C.ink+';outline:none;padding:0;" />'+xBtn()+'</div>'
    +'<div style="display:flex;align-items:baseline;gap:4px;margin:0 4px 2px;"><span style="font-size:24px;font-weight:800;color:'+C.greenDeep+';">'+tot+'</span><span style="font-size:12px;color:'+C.sub+';">次總計 · 點群組看細項</span></div>'
    +'<div class="sheet-list" style="max-height:44vh;overflow-y:auto;">'+body+'</div>'
    +'<div style="display:flex;gap:8px;margin-top:12px;"><button class="btn" data-action="ps-clear" data-id="'+id+'" style="flex:0 0 auto;padding:13px 14px;border-radius:12px;border:1px solid '+C.redSoft+';background:'+C.redSoft+';color:'+C.red+';font-weight:700;font-size:13.5px;display:flex;align-items:center;gap:5px;">'+icon("trash",15)+' 清空此人</button><button class="btn" data-action="close-sheet" style="flex:1;padding:13px;border-radius:12px;border:none;background:'+C.green+';color:#fff;font-weight:800;font-size:15px;">完成</button></div>';
}
function absenceInner(){
  var pid=state.sheet.id,f=state.absForm;
  var people='<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">'+PEOPLE.map(function(p){var on=p.id===pid,n=personAbsences(p.id).length;return '<button class="btn tap" data-action="abs-person" data-id="'+p.id+'" style="display:flex;align-items:center;gap:5px;padding:5px 9px 5px 5px;border-radius:999px;border:1px solid '+(on?C.green:C.line)+';background:'+(on?C.greenSoft:C.surface)+';color:'+(on?C.greenDeep:C.sub)+';">'+badge(p.code,20,on?"green":"mute")+'<span style="font-size:12px;font-weight:600;">'+esc(nameOf(p.id))+(n?' ·'+n:"")+'</span></button>';}).join("")+'</div>';
  var head=handleBar()+'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;"><div style="font-size:16px;font-weight:800;">排休／不在</div>'+xBtn()+'</div>';
  if(!pid)return head+'<div style="font-size:12px;color:'+C.sub+';margin-bottom:10px;">先選一個人。名稱可自訂（例：大公差、返診、留守）。時段<b>留空＝整天不在</b>；填一段（例 1200-2200）＝只擋那段，其他時間照排。</div>'+people+'<div style="text-align:center;color:'+C.sub+';font-size:13px;padding:16px 0;">↑ 先選一個人</div>';
  // 原因：預設＋已用過的自訂當快捷鍵，點一下填進輸入框；輸入框才是真正採用的名稱
  var presets=["補休","大公差","休假","其他"],usedR={};
  for(var md0 in state.absence){var rec0=state.absence[md0];for(var p0 in rec0){absNorm(rec0[p0]).forEach(function(v0){var rr=v0.reason;if(rr&&presets.indexOf(rr)<0)usedR[rr]=1;});}}
  var chipNames=presets.concat(Object.keys(usedR));
  var rseg='<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:9px;">'+chipNames.map(function(nm){var on=f.reason===nm,c=absColor(nm);return '<button class="btn" data-action="abs-reason" data-r="'+esc(nm)+'" style="padding:6px 11px;border-radius:8px;font-size:12px;font-weight:700;border:1px solid '+(on?c:C.line)+';background:'+(on?c+"1A":C.surface)+';color:'+(on?c:C.sub)+';">'+esc(nm)+'</button>';}).join("")+'</div>';
  var rcol=absColor(f.reason);
  var nameIn='<input data-input="abs-reason-name" value="'+esc(f.reason||"")+'" placeholder="不在的名稱（可自訂）" style="width:100%;margin-top:9px;padding:9px 11px;border-radius:9px;border:1px solid '+rcol+';background:'+C.bg+';font-size:14px;font-weight:700;color:'+rcol+';outline:none;" />';
  var start=f.start||curDate();
  var lseg='<div style="display:flex;gap:6px;margin-top:11px;">'+[["只今天",1],["3天",3],["整週",7]].map(function(o){var on=f.len===o[1];return '<button class="btn" data-action="abs-len" data-n="'+o[1]+'" style="flex:1;padding:7px 0;border-radius:8px;font-size:12.5px;font-weight:700;border:1px solid '+(on?C.green:C.line)+';background:'+(on?C.greenSoft:C.surface)+';color:'+(on?C.greenDeep:C.sub)+';">'+o[0]+'</button>';}).join("")+'</div>';
  var startIn='<input data-input="abs-start" value="'+esc(start)+'" placeholder="日期 M/D，例 7/8" style="width:100%;margin-top:9px;padding:9px 11px;border-radius:9px;border:1px solid '+C.line+';background:'+C.bg+';font-size:13.5px;outline:none;font-family:ui-monospace,Menlo,monospace;" />';
  var qs=["","0630-0830","1220-1430","1500-1730","1200-2200","2100-2400"];
  var rq='<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:8px;">'+qs.map(function(tt){var on=(f.range||"")===tt,lab=tt?fmtSpan(tt):"整天",c=tt?C.amber:C.green;return '<button class="btn" data-action="abs-range-q" data-t="'+tt+'" style="padding:4px 9px;border-radius:7px;font-size:11px;font-weight:700;border:1px solid '+(on?c:C.line)+';background:'+(on?c+"1A":C.surface)+';color:'+(on?c:C.sub)+';font-variant-numeric:tabular-nums;">'+esc(lab)+'</button>';}).join("")+'</div>';
  var rangeIn='<div style="font-size:12px;font-weight:700;color:'+C.sub+';margin-top:11px;">不在的時段（留空＝整天）</div><input data-input="abs-range" value="'+esc(f.range||"")+'" placeholder="例 1200-2200（整天請留空）" style="width:100%;margin-top:7px;padding:9px 11px;border-radius:9px;border:1px solid '+C.line+';background:'+C.bg+';font-size:13.5px;outline:none;font-family:ui-monospace,Menlo,monospace;" />'+rq;
  var endMD=addDaysMD(start,f.len-1);
  var daysTxt=f.len>1?(esc(start)+' → '+esc(endMD)+'（'+f.len+' 天）'):(esc(start)+'（當天）');
  var timeTxt=f.range?(esc(fmtSpan(f.range))+' 這段不排'):'整天不在';
  var preview='<div style="font-size:11.5px;color:'+C.sub+';margin-top:10px;line-height:1.6;">'+esc(f.reason||"（先取名）")+'　'+daysTxt+'　·　'+timeTxt+'</div>';
  var addForm=card(label("新增")+rseg+nameIn+lseg+startIn+rangeIn+preview+'<button class="btn" data-action="abs-add" style="width:100%;margin-top:12px;padding:11px;border-radius:10px;border:none;background:'+C.green+';color:#fff;font-weight:800;font-size:14px;">加入</button>',"margin-bottom:10px;");
  var list=personAbsences(pid);
  var listHtml=list.length?'<div style="display:flex;flex-wrap:wrap;gap:6px;">'+list.map(function(a){var c=absColor(a.reason);return '<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:'+c+';background:'+c+'14;padding:4px 5px 4px 10px;border-radius:999px;">'+esc(a.md)+' '+esc(a.reason)+(a.range?(" "+esc(fmtSpan(a.range))):"")+'<button class="btn" data-action="abs-del" data-id="'+pid+'" data-md="'+esc(a.md)+'" data-i="'+a.i+'" style="width:18px;height:18px;border-radius:999px;border:none;background:'+c+'22;color:'+c+';display:flex;align-items:center;justify-content:center;">'+icon("x",11,c)+'</button></span>';}).join("")+'</div>':'<div style="font-size:12.5px;color:'+C.sub+';padding:8px 2px;">目前沒有記錄。</div>';
  return head+people+addForm+label("已排（"+esc(nameOf(pid))+"）")+'<div style="margin-top:8px;">'+listHtml+'</div><button class="btn" data-action="close-sheet" style="width:100%;margin-top:14px;padding:13px;border-radius:12px;border:none;background:'+C.green+';color:#fff;font-weight:800;font-size:15px;">完成</button>';
}
function extraById(id){for(var i=0;i<state.log.length;i++)if(String(state.log[i].id)===String(id))return state.log[i];return null;}
function dayevtInner(){
  var f=state.evtForm,note=(f.group==="行程");
  var head=handleBar()+'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;"><div style="font-size:16px;font-weight:800;">'+(f.id?"編輯":"新增")+'臨時勤務／行程</div>'+xBtn()+'</div>';
  head+='<div style="font-size:11.5px;color:'+C.sub+';margin-bottom:10px;">'+esc(f.md)+'　選了人的分類會併入公差次數；純提醒選「行程」不計次。</div>';
  var labIn='<input data-input="evt-label" value="'+esc(f.label||"")+'" placeholder="做什麼，例：打靶預校、全連集合" style="width:100%;padding:10px 11px;border-radius:9px;border:1px solid '+C.line+';background:'+C.bg+';font-size:14px;outline:none;" />';
  var timeQ='<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:8px;">'+["0800","1000","1330","1500","1900","1400-1500","1900-2100"].map(function(tt){var on=(f.range||"")===tt;return '<button class="btn" data-action="evt-range-q" data-t="'+tt+'" style="padding:4px 9px;border-radius:7px;font-size:11px;font-weight:700;border:1px solid '+(on?C.green:C.line)+';background:'+(on?C.greenSoft:C.surface)+';color:'+(on?C.greenDeep:C.sub)+';font-variant-numeric:tabular-nums;">'+esc(fmtSpan(tt))+'</button>';}).join("")+'</div>';
  var timeIn='<input data-input="evt-range" value="'+esc(f.range||"")+'" placeholder="時間，例 1400 或 1400-1500（可空）" style="width:100%;margin-top:9px;padding:10px 11px;border-radius:9px;border:1px solid '+C.line+';background:'+C.bg+';font-size:13.5px;outline:none;font-family:ui-monospace,Menlo,monospace;" />'+timeQ;
  var GS=[["打掃","打掃"],["公差","公差"],["大公差","大公差"],["小公差","小公差"],["打飯","打飯"],["分菜","分菜"],["行程","行程(不計次)"]];
  var gseg='<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:9px;">'+GS.map(function(o){var on=f.group===o[0],c=dayGroupColor(o[0]);return '<button class="btn" data-action="evt-group" data-g="'+o[0]+'" style="padding:7px 11px;border-radius:8px;font-size:12.5px;font-weight:700;border:1px solid '+(on?c:C.line)+';background:'+(on?c+"1A":C.surface)+';color:'+(on?c:C.sub)+';">'+o[1]+'</button>';}).join("")+'</div>';
  var ppl='<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:9px;opacity:'+(f.keepAll?0.45:1)+';">'+PEOPLE.map(function(p){var on=(f.people||[]).indexOf(p.id)>=0;return '<button class="btn tap" data-action="evt-person" data-id="'+p.id+'" style="display:flex;align-items:center;gap:5px;padding:5px 9px 5px 5px;border-radius:999px;border:1px solid '+(on?C.green:C.line)+';background:'+(on?C.greenSoft:C.surface)+';color:'+(on?C.greenDeep:C.sub)+';">'+badge(p.code,20,on?"green":"mute")+'<span style="font-size:12px;font-weight:600;">'+esc(nameOf(p.id))+'</span></button>';}).join("")+'</div>';
  var kall='<button class="btn" data-action="evt-keepall" style="margin-top:9px;display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;border:1px solid '+(f.keepAll?C.green:C.line)+';background:'+(f.keepAll?C.greenSoft:C.surface)+';color:'+(f.keepAll?C.greenDeep:C.sub)+';font-size:12.5px;font-weight:700;">'+(f.keepAll?icon("check",13,C.green):"")+'全班（8 人一起）</button>';
  var peopleSec=note?'<div style="font-size:11.5px;color:'+C.sub+';margin-top:9px;">「行程」是純提醒，不用選人、不計公差次數。（也可選人，但不會計次）</div>'+ppl+kall:('<div style="font-size:12px;font-weight:700;color:'+C.sub+';margin-top:13px;">誰做（可複選）</div>'+ppl+kall);
  var delBtn=f.id?'<button class="btn" data-action="dayevt-del" style="flex:0 0 auto;padding:13px 16px;border-radius:12px;border:1px solid '+C.redSoft+';background:'+C.redSoft+';color:'+C.red+';font-weight:700;font-size:14px;">刪除</button>':"";
  var save='<div style="display:flex;gap:8px;margin-top:16px;">'+delBtn+'<button class="btn" data-action="dayevt-save" style="flex:1;padding:13px;border-radius:12px;border:none;background:'+C.green+';color:#fff;font-weight:800;font-size:15px;">儲存</button></div>';
  return head+'<div class="sheet-list" style="max-height:60vh;overflow-y:auto;">'+labIn+timeIn+'<div style="font-size:12px;font-weight:700;color:'+C.sub+';margin-top:13px;">分類</div>'+gseg+peopleSec+'</div>'+save;
}
function sheetInner(){var s=state.sheet;if(!s)return "";if(s.type==="picker"){var d=dutyById(s.id);return d?pickerInner(d):"";}if(s.type==="person")return personInner(s.id);if(s.type==="guard")return guardInner(s.id);if(s.type==="absence")return absenceInner();if(s.type==="dayevt")return dayevtInner();if(s.type==="tlblock"){var dt=dutyById(s.id);return dt?tlBlockInner(dt):"";}if(s.type==="tlfree")return tlFreeInner();if(s.type==="tlcluster")return tlClusterInner();if(s.type==="tlrest")return tlRestInner();return "";}
function attachDrag(el){
  var handle=el.querySelector('[data-drag]');if(!handle)return;var startY=0,dragging=false;
  handle.onpointerdown=function(e){dragging=true;startY=e.clientY;el.style.transition="none";try{handle.setPointerCapture(e.pointerId);}catch(_){}};
  handle.onpointermove=function(e){if(!dragging)return;var dy=Math.max(0,e.clientY-startY);el.style.transform="translateY("+dy+"px)";};
  handle.onpointerup=function(e){if(!dragging)return;dragging=false;var dy=Math.max(0,e.clientY-startY);if(dy>90){closeSheet();}else{el.style.transition="transform .22s ease";el.style.transform="translateY(0)";}};
  handle.onpointercancel=function(){dragging=false;el.style.transition="transform .22s ease";el.style.transform="translateY(0)";};
}
function openSheet(type,id){state.sheet={type:type,id:id};pickAdv=false;pickConfirm=null;if(type==="person")psOpen={};refreshHist();overlay.innerHTML='<div class="backdrop" data-action="close-sheet"><div class="sheet" data-action="noop">'+sheetInner()+'</div></div>';attachDrag(overlay.querySelector('.sheet'));}
function refreshSheet(){if(!state.sheet){closeSheet();return;}refreshHist();var el=overlay.querySelector('.sheet');if(!el){openSheet(state.sheet.type,state.sheet.id);return;}var lw=el.querySelector('.sheet-list');var sc=lw?lw.scrollTop:0;el.innerHTML=sheetInner();var lw2=el.querySelector('.sheet-list');if(lw2)lw2.scrollTop=sc;attachDrag(el);}
function closeSheet(){var wasTl=state.sheet&&state.sheet.type==="tlblock"&&!state.readOnly&&state.boardMode!=="view";overlay.innerHTML="";state.sheet=null;if(wasTl)persist();render();}

/* ---------- 行動準則 / 行程 ---------- */
function toMin(t){t=(t||"").replace(/[^0-9]/g,"");if(t.length<3)return null;t=t.slice(0,4);while(t.length<4)t="0"+t;var h=parseInt(t.slice(0,2),10),m=parseInt(t.slice(2,4),10);if(isNaN(h)||isNaN(m))return null;return h*60+m;}
function hmFmt(t){t=(t||"").replace(/[^0-9]/g,"").slice(0,4);if(t.length<4)return (t||"");var hh=t.slice(0,2);return (hh==="24"?"00":hh)+":"+t.slice(2,4);}
// \u53bb\u6389\u958b\u982d\u7684\u300c\u689d\u5217\u7b26\u865f\u300d\uff1a1\ufe0f\u20e3 \u2460..\u2473 \u2776..\u277f 1. 2\u3001 3) \u25aa \u2022 \u2023 \ud83d\udd39\ud83d\udd3a\ud83d\udd38\ud83d\udd37\ud83d\udd35\ud83d\udcf7\ud83e\ude96\u2705\u2b07\u27a1 \u7b49\u3002\u56de\u50b3 {bul:\u662f\u5426\u70ba\u689d\u5217, txt:\u53bb\u7b26\u865f\u5f8c\u6587\u5b57}
var SCHED_BULLET=/^\s*(?:[0-9\uff10-\uff19]\ufe0f?\u20e3|[\u2460-\u2473\u2776-\u277f\u24ea]|\d{1,2}\s*[.\u3001)]|[\u25aa\u25ab\u25e6\u2022\u2023\u2043]|[\ud83c-\ud83e][\udc00-\udfff]\ufe0f?|[\u2705\u2b07\u27a1]\ufe0f?)\s*/;
function schedBullet(s){s=String(s||"");var bul=SCHED_BULLET.test(s);return {bul:bul,txt:s.replace(SCHED_BULLET,"").replace(/\uFFFD/g,"").trim()};}
function parseSched(text){
  var lines=text.replace(/\r/g,"").split("\n"),items=[],title="",cur=null;
  lines.forEach(function(raw){
    var t=raw.trim();if(!t)return;
    var m=t.match(/^(\d{3,4}\s*[-~\u301c\uff5e]\s*\d{3,4}|\d{3,4})\s*(.*)$/);
    if(m){
      var range=m[1].replace(/\s/g,""),rest=schedBullet(m[2]||"").txt;
      cur={id:"s"+items.length,time:range.replace(/[^0-9]/g,"").slice(0,4),range:range,text:rest,min:toMin(range)};
      items.push(cur);return;
    }
    if(/\u884c\u52d5\u6e96\u64da|\u884c\u52d5\u6e96\u5247/.test(t)){if(!title)title=t;return;}
    var b=schedBullet(t);
    if(cur&&!cur.text){cur.text=b.txt;}                          // \u6642\u9593\u9ede\u4e0b\u7684\u7b2c\u4e00\u4ef6\u4e8b\uff08\u53ef\u80fd\u6709 1\ufe0f\u20e3 \u524d\u7db4\uff0c\u53bb\u6389\uff09
    else if(cur&&b.bul){cur.text=cur.text+(cur.text?" \u00b7 ":"")+b.txt;}   // \u540c\u4e00\u6642\u9593\u9ede\u7684\u591a\u4ef6\u4e8b\uff082\ufe0f\u20e33\ufe0f\u20e3\ud83d\udcf7\ud83e\ude96\u2026\uff09\u5408\u4f75
    else{items.push({id:"s"+items.length,time:"",range:"",text:b.txt,min:null});cur=null;}
  });
  return {items:items,title:title};
}
function schedTimed(){return (state.schedule&&state.schedule.items?state.schedule.items:[]).filter(function(it){return it.time;});}
function schedForKw(kw){var it=schedTimed();for(var i=0;i<it.length;i++){if(it[i].text.indexOf(kw)>=0)return it[i];}return null;}
var DEFAULT_SCHED=[{range:"0530",text:"\u8d77\u5e8a"},{range:"0550",text:"\u6668\u64cd\u3001\u5347\u65d7\u3001\u8eca\u52e4"},{range:"0600",text:"\u6253\u65e9\u98ef"},{range:"0610-0630",text:"\u90e8\u968a\u7528\u9910"},{range:"0630-0740",text:"\u65e9\u4e0a\u6253\u6383"},{range:"1100",text:"\u6253\u98ef\u4f5c\u696d"},{range:"1130",text:"\u90e8\u968a\u7528\u9910"},{range:"1230-1350",text:"\u5348\u4f11"},{range:"1350",text:"\u8d77\u5e8a"},{range:"1400",text:"\u64cd\u8ab2"},{range:"1700",text:"\u6253\u98ef\u4f5c\u696d"},{range:"1720",text:"\u5df1\u67e5\u52e4\u524d"},{range:"1730",text:"\u90e8\u968a\u7528\u9910"},{range:"2050",text:"\u665a\u9ede\u540d"},{range:"2130",text:"\u71c8\u706b\u7ba1\u5236"}];
function mkSchedItems(arr){return arr.map(function(o,i){return {id:"df"+i,time:o.range.replace(/[^0-9]/g,"").slice(0,4),range:o.range,text:o.text,min:toMin(o.range)};});}
function effectiveSchedule(){return (state.schedule&&state.schedule.loaded&&state.schedule.items.length)?state.schedule.items:mkSchedItems(DEFAULT_SCHED);}
function effectiveTimed(){return effectiveSchedule().filter(function(it){return it.time;});}
function defaultTimeFor(d){
  var dr=dutyDefaultRange(d);if(dr)return dr;   // \u6253\u98ef\uff08\u65e90600-0730/\u53481100-1230/\u665a1700-1830\uff09\u3001\u6253\u6383\uff08\u65e90600-0620\u3001\u665a/\u6d74\u5ec12100-2120\uff09\u56fa\u5b9a\u6642\u6bb5
  if(d.fenca&&d.fenca!=="head")return d.fenca==="AM"?"0430-0630":d.fenca==="NOON"?"0830-1130":"1500-1730";
  return "";
}
function mealWindow(period){return period==="AM"?[0,600]:period==="NOON"?[600,900]:[900,1440];}
function schedMatch(d,items){
  if(!items.length)return "";
  if(d.kind==="meal"){
    // 用「時間落在哪個區間」判斷早/午/晚，不能靠第幾筆：準則若少寫一行會整個錯位
    var w=mealWindow(d.period);
    var hit=items.filter(function(it){return /\u6253\u98ef|\u6253\u65e9\u98ef/.test(it.text)&&it.min!=null&&it.min>=w[0]&&it.min<w[1];}).sort(function(a,b){return a.min-b.min;});
    return hit.length?hit[0].range:"";
  }
  if(d.period==="AM"&&/(\u8d70\u5eca|\u99ac\u8def|\u6d74\u5ec1|\u51b0\u6876|\u6c34\u6876|\u5783\u573e|\u6383)/.test(d.label)){var sw=items.filter(function(it){return /(\u5916\u6383|\u74b0\u5883\u6574\u7406|\u843d\u8449|\u6c34\u6e9d|\u6253\u6383)/.test(it.text);}).sort(function(a,b){return (a.min||0)-(b.min||0);});if(sw.length)return sw[0].range;}
  var lbl=d.label.replace(/\s+/g,"");
  var kwList=["\u92c1\u5e8a","\u69cd\u7bb1","\u5167\u52d9","\u5167\u7269","\u8cc7\u6536","\u8cc7\u6e90\u56de\u6536","\u7d93\u7406","\u8eca\u5834","\u5206\u83dc","\u4f19\u623f","\u4fdd\u69cd","\u5c04\u64ca","\u6253\u9776","\u53f8\u4ee4\u90e8","\u6559\u53ec","\u88dc\u5eab","\u756b\u5716","\u5674","\u642c","\u5347\u65d7","\u9ede\u540d","\u958b\u5eab","\u9001\u88dd","\u53d6\u88dd"];
  for(var i=0;i<kwList.length;i++){if(lbl.indexOf(kwList[i])>=0){for(var j=0;j<items.length;j++){if(items[j].text.indexOf(kwList[i])>=0)return items[j].range;}}}
  return "";
}
function autoTagTimes(){
  var items=(state.schedule&&state.schedule.loaded)?schedTimed():[];
  state.duties.forEach(function(d){
    if(d.removed||d.timeSrc==="manual")return;
    var dr=dutyDefaultRange(d);   // 打飯/打掃 一律用固定時段，不被準則的單點（如「0600打飯作業」）或行首時間蓋掉
    var t=dr||(d.time||"")||schedMatch(d,items)||defaultTimeFor(d);
    d.schedTime=t||"";d.timeSrc=t?"auto":"";
  });
}
function planGroup(d){return (d.fenca&&d.fenca!=="head")?"\u5206\u83dc":d.extra==="big"?"\u5927\u516c\u5dee":d.extra==="small"?"\u5c0f\u516c\u5dee":d.kind==="meal"?"\u6253\u98ef":d.period==="GC"?"\u516c\u5dee":"\u6253\u6383";}
function livePlan(){
  var raw=state.gongban.raw||(state.schedule?state.schedule.raw:"")||"";
  var date=state.activeDate||extractDate(state.gongban.raw)||(state.schedule&&state.schedule.date)||todayLabel();   // 同 curDate：先信 activeDate，別讓雲端沒 raw 時退回別天準則
  var wm=raw.match(/[\uff08(]([\u4e00\u4e8c\u4e09\u56db\u4e94\u516d\u65e5])[)\uff09]/);
  var events=[];
  state.duties.forEach(function(d){
    if(d.removed)return;
    var ppl=d.keepAll?PEOPLE.map(function(p){return p.id;}):d.assigned.slice();
    if(!ppl.length)return;
    var rng=d.schedTime||d.time||"";
    events.push({range:rng,min:toMin(rng),label:d.label,group:planGroup(d),people:ppl,keepAll:!!d.keepAll});
  });
  (state.guard&&state.guard.days?state.guard.days:[]).forEach(function(day){
    var _md=date.replace(/[\uff08(].*$/,"");
    day.shifts.forEach(function(sh){if((sh.date||day.date)!==_md)return;if(!sh.assigned.length)return;events.push({range:guardRange(sh.code),min:shiftStartMin(sh.code),label:"\u7ad9\u54e8 "+shiftHM(sh.code)+(sh.loc?(" "+sh.loc):""),group:"\u7ad9\u54e8",people:sh.assigned.slice(),keepAll:false});});
  });
  events=events.concat(guardCarryEvents(date.replace(/[\uff08(].*$/,"")));   // \u8de8\u591c\u54e8\u5169\u5929\u90fd\u5beb
  var mdOnly=date.replace(/[\uff08(].*$/,""),rests=[],outs=[];
  PEOPLE.forEach(function(p){absenceRecs(p.id,mdOnly).forEach(function(rec){if(rec.range){var sp=spanMin(rec.range);rests.push({pid:p.id,reason:rec.reason,range:rec.range,s:sp?sp[0]:null,e:sp?sp[1]:null});}else outs.push({pid:p.id,reason:rec.reason});});});
  return {date:date,weekday:wm?wm[1]:"",schedule:effectiveSchedule(),events:events,rests:rests,outs:outs};
}
function liveHasData(){var lp=livePlan();return (state.schedule&&state.schedule.loaded)||lp.events.length>0||(lp.rests&&lp.rests.length>0)||(lp.outs&&lp.outs.length>0);}
function importSlotTime(cat,group){
  if(group==="打飯")return /早/.test(cat)?"0600":/午/.test(cat)?"1100":"1700";
  if(group==="分菜")return /早/.test(cat)?"0430-0630":/中/.test(cat)?"0830-1130":"1500-1730";
  if(group==="打掃")return /(浴廁|晚)/.test(cat)?"":"0630-0740";
  return "";
}
function boardFromImport(date,entries,wd){
  var mdOnly=date.replace(/[\uff08(].*$/,""),byCat={},i=0;
  entries.forEach(function(e){var k=e.g+"|"+e.c;if(!byCat[k])byCat[k]={label:e.c,group:e.g,people:[],time:e.t||""};if(byCat[k].people.indexOf(e.p)<0)byCat[k].people.push(e.p);if(!byCat[k].time&&e.t)byCat[k].time=e.t;});
  var duties=Object.keys(byCat).map(function(k){
    var o=byCat[k],g=o.group,lb=o.label,kind="fill",period="AM",fen=null,extra=null;
    if(g==="打飯"){kind="meal";period=/早/.test(lb)?"AM":/午/.test(lb)?"NOON":"PM";}
    else if(g==="分菜"){period="GC";fen=/早/.test(lb)?"AM":/(中|午)/.test(lb)?"NOON":"PM";}
    else if(g==="大公差"){period="GC";extra="big";}
    else if(g==="小公差"){period="GC";extra="small";}
    else if(g==="公差"){period="GC";}
    else{period="AM";}
    var d={id:"imp"+(i++),kind:kind,mode:"append",label:lb,time:null,period:period,block:(period==="GC"?null:period),count:o.people.length||1,assigned:o.people.slice(),keepAll:false,removed:false,original:lb+"：",extra:extra,schedTime:(o.time||importSlotTime(lb,g)),timeSrc:(o.time?"manual":"auto")};
    if(fen)d.fenca=fen;
    return d;
  });
  var sp=state.plans[mdOnly],sit=(sp&&sp.schedule&&sp.schedule.length)?sp.schedule:[];
  state.boards[mdOnly]={raw:"（由統計匯入）",meta:[],duties:duties,schedule:{raw:"",items:sit,title:"",loaded:!!sit.length,date:""},wd:wd||(sp&&sp.weekday)||"",committed:true,imported:true,ts:Date.now()};
}
function planFromImport(date,entries,weekday){
  var mdOnly=date.replace(/[\uff08(].*$/,""),byCat={};
  entries.forEach(function(e){var k=e.g+"|"+e.c;if(!byCat[k])byCat[k]={label:e.c,group:e.g,people:[],time:e.t||""};if(byCat[k].people.indexOf(e.p)<0)byCat[k].people.push(e.p);if(!byCat[k].time&&e.t)byCat[k].time=e.t;});
  var events=Object.keys(byCat).map(function(k){var o=byCat[k],rng=o.time||importSlotTime(o.label,o.group);return {range:rng,min:toMin(rng),label:o.label,group:o.group,people:o.people,keepAll:false};});
  (state.guard&&state.guard.days?state.guard.days:[]).forEach(function(day){day.shifts.forEach(function(sh){if((sh.date||day.date)!==mdOnly)return;if(!sh.assigned.length)return;events.push({range:guardRange(sh.code),min:shiftStartMin(sh.code),label:"\u7ad9\u54e8 "+shiftHM(sh.code)+(sh.loc?(" "+sh.loc):""),group:"\u7ad9\u54e8",people:sh.assigned.slice(),keepAll:false});});});
  var rests=[],outs=[];PEOPLE.forEach(function(p){absenceRecs(p.id,mdOnly).forEach(function(rec){if(rec.range){var sp=spanMin(rec.range);rests.push({pid:p.id,reason:rec.reason,range:rec.range,s:sp?sp[0]:null,e:sp?sp[1]:null});}else outs.push({pid:p.id,reason:rec.reason});});});
  return {date:mdOnly,weekday:weekday||"",schedule:mkSchedItems(DEFAULT_SCHED),events:events,rests:rests,outs:outs,ts:Date.now()};
}
function savePlan(date){var lp=livePlan();if(!lp.events.length&&!(state.schedule&&state.schedule.loaded))return;state.plans[date]={date:date,weekday:lp.weekday,schedule:lp.schedule,events:lp.events,ts:Date.now()};}
function eventsFromDuties(duties){var events=[];(duties||[]).forEach(function(d){if(d.removed)return;var ppl=d.keepAll?PEOPLE.map(function(p){return p.id;}):(d.assigned||[]).slice();if(!ppl.length&&d.kind!=="manual")return;var rng=d.schedTime||d.time||"";events.push({range:rng,min:toMin(rng),label:d.label,group:planGroup(d),people:ppl,keepAll:!!d.keepAll});});return events;}   // 手動新增的勤務即使還沒排人也帶進行程（同步顯示）
function guardEventsFor(mdOnly){var events=[];(state.guard&&state.guard.days?state.guard.days:[]).forEach(function(day){day.shifts.forEach(function(sh){if((sh.date||day.date)!==mdOnly)return;if(!sh.assigned.length)return;events.push({range:guardRange(sh.code),min:shiftStartMin(sh.code),label:"\u7ad9\u54e8 "+shiftHM(sh.code)+(sh.loc?(" "+sh.loc):""),group:"\u7ad9\u54e8",people:sh.assigned.slice(),keepAll:false});});});return events;}
/* ---------- 臨時行程（額外勤務，存進 log 用 x_ id，不會被排班板覆蓋，會併入公差次數＋時間軸） ---------- */
function isExtra(e){return e&&(e.x===1||/^x_/.test(String(e.id)));}
function extraLogFor(md){return state.log.filter(function(e){return isExtra(e)&&String(e.date).replace(/[（(].*$/,"")===md;});}
function extraEventsFor(md){return extraLogFor(md).map(function(e){var ppl=(e.entries||[]).map(function(x){return x.p;});var uniq=[];ppl.forEach(function(p){if(uniq.indexOf(p)<0)uniq.push(p);});return {range:e.range||"",min:toMin(e.range||""),label:e.label||"",group:e.group||"公差",people:e.keepAll?PEOPLE.map(function(p){return p.id;}):uniq,keepAll:!!e.keepAll,_x:e.id};});}
function extraDates(){var s={};state.log.forEach(function(e){if(isExtra(e))s[String(e.date).replace(/[（(].*$/,"")]=1;});return Object.keys(s);}
function saveExtraEvent(f){
  var md=String(f.md||"").replace(/[（(].*$/,"");if(!/\d{1,2}\/\d{1,2}/.test(md))return "日期不對";
  var label=(f.label||"").trim();if(!label)return "先填名稱";
  var rng=(f.range||"").replace(/\s/g,"");if(rng&&!spanMin(rng))return "時間格式如 1400 或 1400-1500";
  var t=rng.replace(/[^0-9]/g,"").slice(0,4);
  var note=(f.group==="行程");
  var ppl=f.keepAll?PEOPLE.map(function(p){return p.id;}):(f.people||[]).slice();
  if(!note&&!f.keepAll&&!ppl.length)return "選一個人，或選『全班』；純提醒請選『行程(不計次)』";
  var entries=note?[]:ppl.map(function(p){return {p:p,c:label,g:f.group,t:t};});
  var id=f.id||("x_"+md+"_"+Date.now());
  state.log=state.log.filter(function(e){return String(e.id)!==String(id);});
  state.log.push({id:id,date:md,x:1,label:label,group:f.group,range:rng,keepAll:!!f.keepAll,entries:entries,ts:Date.now()});
  persist();return "";
}
function delExtraEvent(id){state.tombIds[String(id)]=Date.now();state.log=state.log.filter(function(e){return String(e.id)!==String(id);});persist();}
function restsOutsFor(mdOnly){var rests=[],outs=[];PEOPLE.forEach(function(p){absenceRecs(p.id,mdOnly).forEach(function(rec){if(rec.range){var sp=spanMin(rec.range);rests.push({pid:p.id,reason:rec.reason,range:rec.range,s:sp?sp[0]:null,e:sp?sp[1]:null});}else outs.push({pid:p.id,reason:rec.reason});});});return {rests:rests,outs:outs};}
function planForBoard(date){
  var mdOnly=(date||"").replace(/[（(].*$/,""),duties,schedule,wd,plan=null;
  var extra=extraEventsFor(mdOnly);
  if(mdOnly&&mdOnly===state.activeDate&&state.gongban.loaded){duties=state.duties;schedule=state.schedule;wd=(state.boards[mdOnly]&&state.boards[mdOnly].wd)||"";}
  else if(state.boards[mdOnly]){var b=state.boards[mdOnly];duties=b.duties;schedule=b.schedule;wd=b.wd||"";}
  else if(state.plans[mdOnly]){var sp=state.plans[mdOnly];plan={date:sp.date,weekday:sp.weekday,schedule:sp.schedule,events:(sp.events||[]).slice(),rests:sp.rests||[],outs:sp.outs||[]};}
  else if(extra.length){var ro0=restsOutsFor(mdOnly);plan={date:mdOnly,weekday:"",schedule:mkSchedItems(DEFAULT_SCHED),events:[],rests:ro0.rests,outs:ro0.outs};}
  else return null;
  if(!plan){var ro=restsOutsFor(mdOnly),sch=(schedule&&schedule.loaded&&schedule.items.length)?schedule.items:mkSchedItems(DEFAULT_SCHED);plan={date:mdOnly,weekday:wd,schedule:sch,events:eventsFromDuties(duties).concat(guardEventsFor(mdOnly)).concat(guardCarryEvents(mdOnly)),rests:ro.rests.concat(impliedRestsExpanded(duties,mdOnly)),outs:ro.outs};}
  if(extra.length)plan.events=plan.events.concat(extra);
  return plan;
}
function dayDates(){
  var seen={},out=[];
  boardDates().forEach(function(d){seen[d]=1;out.push({key:d,label:d+(state.boards[d].wd?"\uff08"+state.boards[d].wd+"\uff09":"")});});
  Object.keys(state.plans).forEach(function(d){if(seen[d])return;seen[d]=1;out.push({key:d,label:d+(state.plans[d].weekday?"\uff08"+state.plans[d].weekday+"\uff09":"")});});
  extraDates().forEach(function(d){if(seen[d])return;seen[d]=1;out.push({key:d,label:d});});
  out.sort(function(a,b){return dnum(b.key)-dnum(a.key);});
  return out;
}
function currentPlan(){
  var sel=state.dayView.date;
  if(sel){var p=planForBoard(sel);if(p)return {plan:p,isLive:(sel===state.activeDate&&state.gongban.loaded)};}
  if(state.activeDate&&state.gongban.loaded){var pa=planForBoard(state.activeDate);if(pa)return {plan:pa,isLive:true};}
  var dds=dayDates();if(dds.length){var p2=planForBoard(dds[0].key);if(p2)return {plan:p2,isLive:(dds[0].key===state.activeDate&&state.gongban.loaded)};}
  return null;
}
var GEN_RE=/(\u8d77\u5e8a|\u5347\u65d7|\u96c6\u5408|\u7528\u9910|\u4e0a\u9910\u5ef3|\u83a2\u5149|\u751f\u547d\u6559\u80b2|\u64cd\u8ab2|\u904b\u52d5|\u904b\u52d5\u6703|\u9ede\u540d|\u5c31\u5bdd|\u71c8\u706b|\u6c34\u96fb|\u5de1\u67e5|\u52e4\u524d|\u6536\u64cd|\u9867\u88dd|\u5f85\u547d|\u5c04\u64ca|\u958b\u5eab|\u53d6\u88dd|\u9001\u88dd|\u5b9a\u4fdd|\u5ea7\u8ac7)/;
function dayGroupColor(g){return GCOLORS[g]||absColor(g);}
/* ========== 時間軸／甘特（排班頁「時間軸」子檢視 + 行程頁「八人時段表」共用） ========== */
var TL_DAYEND=1440;
function tlHM(m){var h=Math.floor(m/60),x=m%60;return (h<10?"0":"")+h+":"+(x<10?"0":"")+x;}
function occSpan(rangeStr){var sp=spanMin(rangeStr);if(!sp)return null;if(sp[1]<=sp[0])return [sp[0],Math.min(TL_DAYEND,sp[0]+30)];return [sp[0],sp[1]];}   // 佔用時段（判斷卡到）：無→null不佔用、只有點→往後30分、有起訖→自身
function tlVis(rangeStr){var sp=spanMin(rangeStr);if(!sp)return {s:0,e:TL_DAYEND,solid:false};if(sp[1]<=sp[0])return {s:sp[0],e:TL_DAYEND,solid:false};return {s:sp[0],e:sp[1],solid:true};}   // 畫圖用：無→整天虛、只有點→往下虛到收假、有起訖→實心
function tlAxis(anchors,nowMin){   // 壓縮空時段：只有事的時段照時長給高度，空白壓成細縫；回傳 y(分鐘)→px
  var pts={};anchors.forEach(function(a){if(a==null)return;pts[a[0]]=1;pts[a[1]]=1;});if(nowMin!=null)pts[nowMin]=1;
  var B=Object.keys(pts).map(Number).sort(function(a,b){return a-b;});
  if(B.length<2)return null;
  function act(t0,t1){for(var i=0;i<anchors.length;i++){var a=anchors[i];if(a&&a[1]>a[0]&&a[0]<t1&&a[1]>t0)return true;}return false;}
  var SCALE=0.6,MIN=46,MAX=150,GAP=18,PAD=12,segs=[],px=PAD;   // MIN 拉高：短時段也要放得下「名稱＋誰」
  for(var i=0;i<B.length-1;i++){var t0=B[i],t1=B[i+1],h=act(t0,t1)?Math.max(MIN,Math.min(MAX,(t1-t0)*SCALE)):GAP;segs.push({t0:t0,t1:t1,a:px,b:px+h});px+=h;}
  var bottom=px;px+=PAD;
  function y(m){if(m<=B[0])return PAD;if(m>=B[B.length-1])return bottom;for(var i=0;i<segs.length;i++){var s=segs[i];if(m>=s.t0&&m<=s.t1){var f=s.t1===s.t0?0:(m-s.t0)/(s.t1-s.t0);return s.a+f*(s.b-s.a);}}return bottom;}
  return {y:y,H:px,B:B,lo:B[0],hi:B[B.length-1]};
}
function tlPri(bk){var g=bk.group;return g==="站哨"?0:g==="補休"?1:g==="分菜"?2:g==="打飯"?3:(g==="公差"||g==="大公差"||g==="小公差")?4:5;}   // 重疊時由左至右：站哨→補休→分菜→打飯→公差→打掃
function tlLanes(blocks){   // 重疊分欄：依 tlPri 讓左邊優先站哨、右邊打掃；沒重疊的一律靠最左的空欄（檢查整欄所有區間，不只最後一段）
  var lanes=[];   // 每欄 = 已放的 [s,e] 陣列
  blocks.slice().sort(function(a,b){return tlPri(a)-tlPri(b)||a.s-b.s||a.e-b.e;}).forEach(function(bk){
    var placed=false;
    for(var i=0;i<lanes.length&&!placed;i++){
      var hit=false;for(var j=0;j<lanes[i].length;j++){var iv=lanes[i][j];if(bk.s<iv[1]&&bk.e>iv[0]){hit=true;break;}}
      if(!hit){bk.lane=i;lanes[i].push([bk.s,bk.e]);placed=true;}
    }
    if(!placed){bk.lane=lanes.length;lanes.push([[bk.s,bk.e]]);}
  });
  return lanes.length||1;
}
function dutyDefaultRange(d){   // 固定勤務的預設時段：早上打掃 0600-0620、晚上浴廁 2100-2120、打飯（打飯班作業）約 1.5 小時
  if(d.kind==="manual")return "";   // 手動新增的勤務不給預設時段（沒填就是「未定時段」，等使用者自己設）
  var g=planGroup(d),lb=d.label||"",per=d.period;
  if(g==="打飯")return (per==="AM"||/早/.test(lb))?"0600-0730":(per==="NOON"||/午/.test(lb))?"1100-1230":"1700-1830";
  if(g==="打掃")return (/浴廁/.test(lb)||per==="PM"||per==="AFT"||/晚/.test(lb))?"2100-2120":"0600-0620";
  return "";
}
function dutyEffSpan(d){   // 這項勤務「實際佔用」的時段：使用者填的範圍 > 固定勤務預設 > 只有點(約30分) > 無
  var raw=spanMin(d.schedTime||d.time||"");if(raw&&raw[1]>raw[0])return raw;
  var def=spanMin(dutyDefaultRange(d));if(def)return def;
  if(raw)return [raw[0],Math.min(TL_DAYEND,raw[0]+30)];return null;
}
function dutyIsNoonMeal(d){return planGroup(d)==="打飯"&&(d.period==="NOON"||/午/.test(d.label||""));}
function dutyRestRange(d){return dutyIsNoonMeal(d)?(d.restRange||"1230-1430"):"";}   // 午打排到的人→補休（可調，存 d.restRange）
function impliedRestsFrom(duties,md){   // 自動補休（合併：一個來源一筆，帶 people＋可編輯 src）：午打→當日1230-1430；夜哨(起22/00/02/04＝2224/2402/0204/0406)→「早上那天」0550-0740；午哨(起12/13)→當日1400-1600。夜哨補休掛在早上的日期（見 guardRestInfo）
  var out=[];
  (duties||[]).forEach(function(d){if(d.removed||!dutyIsNoonMeal(d))return;var ppl=d.keepAll?PEOPLE.map(function(p){return p.id;}):(d.assigned||[]);if(!ppl.length)return;var rng=d.restRange||"1230-1430",sp=spanMin(rng);out.push({reason:"補休",range:rng,s:sp?sp[0]:null,e:sp?sp[1]:null,people:ppl.slice(),src:{t:"duty",id:d.id},kind:"午打",implied:true});});
  (state.guard&&state.guard.days?state.guard.days:[]).forEach(function(day){(day.shifts||[]).forEach(function(sh){if(!sh.assigned.length)return;var ri=guardRestInfo(sh);if(!ri||ri.date!==md)return;var rng=sh.restRange||ri.def,sp=spanMin(rng);out.push({reason:"補休",range:rng,s:sp?sp[0]:null,e:sp?sp[1]:null,people:sh.assigned.slice(),src:{t:"guard",id:sh.id},kind:ri.kind,implied:true});});});
  return out;
}
function impliedRests(md){return impliedRestsFrom(state.duties,md);}
function impliedRestsExpanded(duties,md){var out=[];impliedRestsFrom(duties,md).forEach(function(r){r.people.forEach(function(pid){out.push({pid:pid,reason:"補休",range:r.range,s:r.s,e:r.e,implied:true});});});return out;}   // 每人一筆（給 plan.rests / autoAssign）
function tlFreeAt(s,e,md,exclId){   // 某時段誰有空：扣掉整天不在、補休(含自動推導)、站哨、其他已排勤務（真實分鐘重疊）
  var IR=impliedRests(md);
  return PEOPLE.map(function(p){
    var pid=p.id,why="";
    if(fullDayOut(pid,md))return {pid:pid,free:false,why:(absentReason(pid,md)||"不在")};
    if(s!=null){
      absenceRecs(pid,md).forEach(function(r){if(why||!r.range)return;var rr=spanMin(r.range);if(rr&&s<rr[1]&&e>rr[0])why=(r.reason||"補休")+" "+fmtSpan(r.range);});
      if(!why)IR.forEach(function(r){if(why||r.people.indexOf(pid)<0||r.s==null)return;if(s<r.e&&e>r.s)why="補休 "+fmtSpan(r.range);});
      if(!why)(guardEventsFor(md)||[]).forEach(function(g){if(why||g.people.indexOf(pid)<0)return;var gs=spanMin(g.range);if(gs&&s<gs[1]&&e>gs[0])why="站哨 "+fmtSpan(g.range);});
      if(!why)state.duties.forEach(function(d){if(why||d.id===exclId||d.removed)return;if(!(d.keepAll||d.assigned.indexOf(pid)>=0))return;var oc=dutyEffSpan(d);if(oc&&s<oc[1]&&e>oc[0])why=d.label;});
    }
    return {pid:pid,free:!why,why:why};
  });
}
function tlBoardData(){   // 排班頁時間軸資料：勤務(可編輯)＋站哨(唯讀)＋補休(含自動推導)；不畫日常事件當背景（太雜）
  var md=curDate().replace(/[（(].*$/,"");
  var solids=[],untimed=[],anchors=[];
  state.duties.forEach(function(d){if(d.removed)return;
    var raw=spanMin(d.schedTime||d.time||""),def=spanMin(dutyDefaultRange(d));
    var bk={kind:"duty",id:d.id,label:d.label,group:planGroup(d),keepAll:!!d.keepAll,count:d.count,filled:(d.keepAll?8:d.assigned.length),people:(d.keepAll?PEOPLE.map(function(p){return p.id;}):d.assigned.slice())};
    if(raw&&raw[1]>raw[0]){bk.s=raw[0];bk.e=raw[1];bk.tentative=false;solids.push(bk);anchors.push([bk.s,bk.e]);}          // 使用者填了範圍
    else if(def){bk.s=def[0];bk.e=def[1];bk.tentative=false;bk.defaulted=true;solids.push(bk);anchors.push([bk.s,bk.e]);} // 固定勤務預設範圍
    else if(raw){bk.s=raw[0];bk.e=Math.min(TL_DAYEND,raw[0]+30);bk.tentative=true;solids.push(bk);anchors.push([bk.s,bk.e]);} // 只有點、無預設→約30分虛塊
    else{untimed.push(bk);}   // 完全沒填→上方「未定時段」小丸
  });
  (guardEventsFor(md)||[]).forEach(function(g){var sp=spanMin(g.range);if(!sp)return;anchors.push(sp);solids.push({kind:"guard",id:"",label:g.label,group:"站哨",s:sp[0],e:sp[1],tentative:false,people:g.people.slice()});});
  extraEventsFor(md).forEach(function(ev){var sp=spanMin(ev.range||"");if(!sp||sp[1]<=sp[0])return;anchors.push(sp);solids.push({kind:"extra",id:ev._x,label:ev.label,group:ev.group,s:sp[0],e:sp[1],tentative:false,keepAll:!!ev.keepAll,count:ev.people.length||1,filled:ev.people.length,people:ev.people.slice()});});   // 行程臨時新增（有時間的）也畫進來
  var manual=restsOutsFor(md).rests,mkey={};   // 手動排休（每人一筆，可點調時間→回寫 absence）
  manual.forEach(function(r){if(r.s==null)return;mkey[r.pid+"|"+r.range]=1;anchors.push([r.s,r.e]);solids.push({kind:"rest",id:"",reason:(r.reason||"補休"),group:(r.reason||"補休"),s:r.s,e:r.e,tentative:false,implied:false,people:[r.pid],src:{t:"absence",pid:r.pid,range:r.range}});});
  impliedRests(md).forEach(function(r){if(r.s==null)return;var ppl=r.people.filter(function(p){return !mkey[p+"|"+r.range];});if(!ppl.length)return;anchors.push([r.s,r.e]);solids.push({kind:"rest",id:"",reason:"補休",restKind:r.kind,group:"補休",s:r.s,e:r.e,tentative:false,implied:true,people:ppl.slice(),src:r.src});});   // 自動補休（合併，一來源一筆、可點調時間）
  var rests=restsOutsFor(md).rests.concat(impliedRestsExpanded(state.duties,md));
  return {md:md,solids:solids,untimed:untimed,anchors:anchors,rests:rests,outs:restsOutsFor(md).outs,carry:guardCarryEvents(md)};
}
function tlBoardToggle(){
  return '<div style="display:flex;gap:5px;background:'+C.line+';padding:3px;border-radius:12px;margin:14px 0 4px;">'+[["list","清單"],["time","時間軸"]].map(function(m){var on=(state.boardView||"list")===m[0];return '<button class="btn" data-action="board-view" data-v="'+m[0]+'" style="flex:1;padding:9px 0;border-radius:9px;font-size:13.5px;font-weight:800;border:none;background:'+(on?C.surface:"transparent")+';color:'+(on?C.greenDeep:C.sub)+';box-shadow:'+(on?"0 1px 4px rgba(0,0,0,.12)":"none")+';">'+m[1]+'</button>';}).join("")+'</div>';
}
function boardTimeline(){
  var edit=!state.readOnly&&state.boardMode!=="view";
  var D=tlBoardData();
  var now=(D.md===todayLabel())?(function(){var n=new Date();return n.getHours()*60+n.getMinutes();})():null;
  var ax=tlAxis(D.anchors,now);
  var addForm=(edit&&state.addForm.open)?addDutyBlock():"";
  var addPill=edit?'<button class="btn" data-action="open-add" style="display:flex;align-items:center;gap:4px;padding:5px 11px;border-radius:999px;border:1px solid '+C.green+';background:'+C.greenSoft+';color:'+C.greenDeep+';font-size:11.5px;font-weight:800;">'+icon("plus",13,C.green)+'新增勤務</button>':"";
  var summ="";
  if(D.outs.length){var parts=[];D.outs.forEach(function(o){parts.push('<span style="color:'+absColor(o.reason)+';font-weight:800;">'+esc(short2(nameOf(o.pid)))+' '+esc(o.reason)+' 整天不在</span>');});summ='<div style="background:'+C.surface+';border:1px solid '+C.line+';border-radius:11px;padding:8px 11px;margin-bottom:10px;font-size:11.5px;line-height:1.8;">'+parts.join('　')+'</div>';}
  var untimedRow=(edit||D.untimed.length)?('<div style="margin-bottom:9px;">'+(D.untimed.length?'<div style="font-size:11px;font-weight:800;color:'+C.sub+';margin-bottom:5px;">未定時段（點我設時間、排人）</div>':"")+'<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">'+D.untimed.map(function(bk){var col=dayGroupColor(bk.group);return '<button class="btn" data-action="tl-open" data-duty="'+esc(bk.id)+'" style="display:flex;align-items:center;gap:5px;padding:5px 10px;border-radius:999px;border:1px dashed '+col+';background:'+col+'0E;color:'+col+';font-size:11.5px;font-weight:700;">'+esc(bk.label)+' <span style="color:'+C.sub+';font-weight:600;">'+(bk.keepAll?"全":bk.filled+"/"+bk.count)+'</span></button>';}).join("")+addPill+'</div></div>'):"";
  if(!ax)return '<div style="margin-top:6px;">'+summ+untimedRow+addForm+card('<div style="text-align:center;color:'+C.sub+';font-size:13px;padding:24px 12px;line-height:1.7;">還沒有排定時段的勤務。<br>'+(edit?'按上面「新增勤務」或到清單設時間就會出現。':'目前沒有可顯示的時段。')+'</div>')+'</div>';
  var blocks=tlClusterBlocks(D.solids);
  var GUT=46,LANEW=132,lc=tlLanes(blocks),wide=lc>3;   // ≤3 欄用百分比塞滿畫面；≥4 欄改固定寬(132px)＋左右滑，名稱才放得下
  var laneCss=function(lane){return wide?('left:'+(GUT+lane*LANEW)+'px;width:'+(LANEW-6)+'px;'):('left:calc('+GUT+'px + (100% - '+GUT+'px) * '+lane+' / '+lc+');width:calc((100% - '+GUT+'px) / '+lc+' - 4px);');};
  var pieces="";
  ax.B.forEach(function(m){var yy=ax.y(m);pieces+='<div style="position:absolute;left:'+GUT+'px;right:0;top:'+yy+'px;height:1px;background:'+C.line+';opacity:.7;"></div><div style="position:absolute;left:0;top:'+(yy-7)+'px;width:'+(GUT-6)+'px;text-align:right;font-size:10.5px;font-weight:700;color:'+C.sub+';font-variant-numeric:tabular-nums;">'+esc(tlHM(m))+'</div>';});
  blocks.forEach(function(bk){var top=ax.y(bk.s),hh=Math.max(bk.tentative?28:44,ax.y(bk.e)-top),col=dayGroupColor(bk.group),isG=(bk.kind==="guard"),isR=(bk.kind==="rest"),isC=(bk.kind==="cluster"),isE=(bk.kind==="extra");var who=bk.keepAll?"全班":(bk.people||[]).map(function(id){return esc(short2(nameOf(id)));}).join(" ");
    var act=isC?('data-action="tl-cluster" data-s="'+bk.s+'" data-e="'+bk.e+'" data-label="'+esc(bk.label)+'"'):isR?('data-action="tl-restedit" data-srct="'+esc(bk.src.t)+'"'+(bk.src.t==="absence"?(' data-pid="'+bk.src.pid+'" data-range="'+esc(bk.src.range)+'"'):(' data-srci="'+esc(bk.src.id)+'"'))):isE?('data-action="dayevt-edit" data-x="'+esc(bk.id)+'"'):isG?('data-action="tl-free" data-s="'+bk.s+'" data-e="'+bk.e+'" data-label="站哨" data-tm="'+esc(tlHM(bk.s)+"–"+tlHM(bk.e))+'"'):('data-action="tl-open" data-duty="'+esc(bk.id)+'"');
    var title,sub,corner="";
    if(isC){title=esc(bk.label);corner='<span style="font-size:9.5px;font-weight:800;color:'+(bk.filled>=bk.need?col:C.amber)+';">×'+bk.n+'</span>';sub='共 '+bk.filled+'/'+bk.need+' 人 · 點開排';}
    else if(isR){title="補休"+(bk.restKind?"（"+bk.restKind+"）":"");corner='<span style="font-size:9px;font-weight:800;color:'+col+';">'+(bk.implied?"自動":"排休")+'✎</span>';sub=(bk.people||[]).map(function(id){return esc(short2(nameOf(id)));}).join("、")||"—";}
    else if(isG){title="站哨";corner='<span style="font-size:9px;font-weight:800;color:'+col+';">'+esc(tlHM(bk.s))+'</span>';sub=who||"—";}
    else if(isE){title=esc(bk.label);corner='<span style="font-size:9px;font-weight:800;color:'+col+';">臨</span>';sub=who||"—";}
    else{title=esc(bk.label)+(bk.tentative?'<span style="font-weight:600;color:'+C.sub+';">·約</span>':'');corner='<span style="font-size:9.5px;font-weight:800;color:'+(bk.filled>=bk.count?col:C.amber)+';">'+(bk.keepAll?"全":(bk.filled+"/"+bk.count))+'</span>';sub=who||'<span style="color:'+C.amber+';">未排</span>';}
    var dashed=bk.tentative||isR;
    var stack=isC?'box-shadow:2px 2px 0 '+col+'22,4px 4px 0 '+col+'14;':'';
    pieces+='<button class="btn" '+act+' style="position:absolute;'+laneCss(bk.lane)+'top:'+top+'px;height:'+hh+'px;border:1px '+(dashed?"dashed":"solid")+' '+col+';border-left:4px solid '+col+';border-radius:9px;background:'+col+(dashed?'12':'18')+';text-align:left;padding:3px 5px;overflow:hidden;z-index:'+(isR?2:isC?4:3)+';'+stack+'"><div style="display:flex;align-items:flex-start;gap:3px;justify-content:space-between;"><span style="flex:1;min-width:0;font-size:10.5px;font-weight:800;color:'+col+';line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+title+'</span>'+corner+'</div><div style="font-size:9.5px;color:'+C.ink+';margin-top:1px;line-height:1.2;opacity:.9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+sub+'</div></button>';});
  if(now!=null&&now>=ax.lo&&now<=ax.hi){var ny=ax.y(now);pieces+='<div style="position:absolute;left:0;right:0;top:'+ny+'px;height:0;border-top:2px solid '+C.red+';z-index:5;"></div><div style="position:absolute;left:0;top:'+(ny-7)+'px;width:'+(GUT-6)+'px;text-align:right;font-size:10px;font-weight:800;color:'+C.red+';z-index:6;">現在</div>';}
  var innerStyle=wide?('position:relative;height:'+ax.H+'px;width:'+(GUT+lc*LANEW+4)+'px;'):('position:relative;height:'+ax.H+'px;');
  var legend='<div style="font-size:11px;color:'+C.sub+';margin-top:8px;line-height:1.6;">實線＝已排時段（重疊會並排，一眼看出卡到）；虛線「·約」＝只填了起始、待補結束；虛框補休＝站哨／午打自動帶出。點勤務方塊看誰有空／排人。</div>';
  function carryStrip(where){var list=(D.carry||[]).filter(function(c){return c.pin===where;});if(!list.length)return "";var gcol=GCOLORS["站哨"];var pills=list.map(function(c){return '<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;border:1px dashed '+gcol+';background:'+gcol+'12;color:'+gcol+';font-size:11px;font-weight:700;">'+esc(c.label.replace("站哨 ","").replace("（跨夜）",""))+' '+esc((c.people||[]).map(function(id){return short2(nameOf(id));}).join(" "))+'</span>';}).join("");return '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:'+(where==="top"?"0 0 9px":"9px 0 0")+';"><span style="font-size:10.5px;font-weight:800;color:'+C.sub+';white-space:nowrap;">跨夜哨 '+(where==="top"?"↑前晚":"↓明晨")+'</span>'+pills+'</div>';}
  return '<div style="margin-top:6px;">'+summ+untimedRow+carryStrip("top")+addForm+card('<div style="overflow-x:auto;-webkit-overflow-scrolling:touch;"><div style="'+innerStyle+'">'+pieces+'</div></div>')+carryStrip("bottom")+legend+'</div>';
}
function tlBlockInner(d){
  var edit=!state.readOnly&&state.boardMode!=="view";
  var md=curDate().replace(/[（(].*$/,"");
  var oc=dutyEffSpan(d);
  var sp0=spanMin(d.schedTime||""),defR=dutyDefaultRange(d),restNote=dutyRestRange(d);
  var timeStr=(sp0&&sp0[1]>sp0[0])?fmtSpan(d.schedTime):defR?("預設 "+fmtSpan(defR)+"（固定勤務）"):d.schedTime?hmFmt(d.schedTime)+" 起（約 30 分）":"未設時段";
  var head='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;"><div style="flex:1;min-width:0;">'+(edit?'<input data-input="tl-name" value="'+esc(d.label)+'" style="width:100%;font-size:16px;font-weight:800;color:'+C.ink+';border:none;border-bottom:1.5px solid '+C.line+';background:transparent;outline:none;padding:2px 0;" />':'<div style="font-size:16px;font-weight:800;">'+esc(d.label)+'</div>')+'</div>'+xBtn()+'</div>';
  var gc=dayGroupColor(planGroup(d));
  var gtag='<span style="font-size:11px;font-weight:800;color:'+gc+';background:'+gc+'1A;padding:2px 8px;border-radius:7px;">'+esc(planGroup(d))+'</span>';
  var chips=effectiveTimed().slice(0,16).map(function(it){var on=(d.schedTime||"")===it.range;return '<button class="btn" data-action="set-time" data-t="'+esc(it.range)+'" style="padding:4px 8px;border-radius:7px;font-size:11px;font-weight:700;border:1px solid '+(on?C.green:C.line)+';background:'+(on?C.greenSoft:C.surface)+';color:'+(on?C.greenDeep:C.sub)+';font-variant-numeric:tabular-nums;">'+esc(it.range)+'</button>';}).join("");
  var timeBox=edit?('<div style="margin:2px 0 12px;">'+label(defR?("時段（固定勤務·留白＝用預設 "+fmtSpan(defR)+"）"):"時段（例 0600-0740；只填 0600＝約30分；留白＝未定）")+'<div style="display:flex;gap:7px;margin-top:7px;"><input data-input="dtime" value="'+esc(d.schedTime||"")+'" placeholder="0600-0740" style="flex:1;padding:9px 11px;border-radius:9px;border:1px solid '+C.line+';background:'+C.bg+';font-size:13.5px;outline:none;font-family:ui-monospace,Menlo,monospace;" /><button class="btn" data-action="tl-clear" style="flex:0 0 auto;padding:0 12px;border-radius:9px;border:1px solid '+C.line+';background:'+C.surface+';color:'+C.sub+';font-weight:700;font-size:12.5px;">清空</button></div>'+(chips?'<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:7px;">'+chips+'</div>':"")+'</div>'):('<div style="margin:2px 0 12px;font-size:13px;font-weight:700;color:'+C.greenDeep+';">'+esc(timeStr)+'</div>');
  var ctrl=edit?('<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;">'+(d.keepAll?"":'<div style="display:flex;align-items:center;gap:6px;"><span style="font-size:12.5px;color:'+C.sub+';">人數</span><div style="display:flex;align-items:center;gap:2px;border:1px solid '+C.line+';border-radius:9px;padding:2px;"><button class="btn" data-action="count-dec" style="width:28px;height:28px;border-radius:7px;border:none;background:'+C.bg+';color:'+C.green+';display:flex;align-items:center;justify-content:center;">'+icon("minus",14)+'</button><span style="width:22px;text-align:center;font-size:15px;font-weight:800;">'+d.count+'</span><button class="btn" data-action="count-inc" style="width:28px;height:28px;border-radius:7px;border:none;background:'+C.bg+';color:'+C.green+';display:flex;align-items:center;justify-content:center;">'+icon("plus",14)+'</button></div></div>')+(d.kind==="meal"?"":'<button class="btn" data-action="toggle-keepall" style="display:flex;align-items:center;gap:6px;padding:7px 10px;border-radius:9px;border:1px solid '+(d.keepAll?C.green:C.line)+';background:'+(d.keepAll?C.greenSoft:C.surface)+';color:'+(d.keepAll?C.greenDeep:C.sub)+';font-size:12.5px;font-weight:600;">八人一起</button>')+'</div>'):"";
  var freeList=tlFreeAt(oc?oc[0]:null,oc?oc[1]:null,md,d.id),freeN=freeList.filter(function(x){return x.free;}).length;
  var listHtml=d.keepAll?'<div style="text-align:center;color:'+C.sub+';font-size:13px;padding:20px 0;">這項全班一起，不用選人。</div>':freeList.map(function(fx){
    var p=personByCode(fx.pid),on=d.assigned.indexOf(fx.pid)>=0,warn=!on&&!fx.free;
    if(pickConfirm===fx.pid&&edit)return '<div style="width:100%;display:flex;align-items:center;gap:9px;padding:9px 8px;border-radius:11px;background:'+C.amberSoft+';border:1px solid '+C.amber+';">'+badge(p.code,28,"mute")+'<div style="flex:1;min-width:0;"><div style="font-size:13.5px;font-weight:800;color:'+C.amber+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(nameOf(fx.pid))+'　'+esc(fx.why)+'</div><div style="font-size:11px;color:'+C.sub+';">還是要排他嗎？</div></div><button class="btn" data-action="pick-warn-cancel" style="flex:0 0 auto;padding:8px 11px;border-radius:9px;border:1px solid '+C.line+';background:'+C.surface+';color:'+C.sub+';font-weight:700;font-size:12.5px;">取消</button><button class="btn" data-action="pick-warn-go" data-pid="'+fx.pid+'" style="flex:0 0 auto;padding:8px 12px;border-radius:9px;border:none;background:'+C.amber+';color:#fff;font-weight:800;font-size:12.5px;">仍要排</button></div>';
    var act=!edit?'data-action="noop"':(warn?('data-action="pick-warn" data-pid="'+fx.pid+'"'):('data-action="pick-toggle" data-pid="'+fx.pid+'"'));
    var sub=on?("已排"+(restNote?" · 補休 "+fmtSpan(restNote):"")):fx.free?"有空":fx.why,subCol=on?C.greenDeep:fx.free?C.green:C.amber;
    return '<button '+act+' style="width:100%;display:flex;align-items:center;gap:11px;padding:10px 8px;border-radius:11px;border:none;background:'+(on?C.greenSoft:"transparent")+';opacity:'+(warn?0.6:1)+';text-align:left;">'+badge(p.code,30,on?"green":"mute")+'<div style="flex:1;min-width:0;"><div style="font-size:15px;font-weight:700;color:'+C.ink+';">'+esc(nameOf(fx.pid))+'</div><div style="font-size:11.5px;color:'+subCol+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(sub)+'</div></div><span style="width:24px;height:24px;border-radius:999px;border:2px solid '+(on?C.green:fx.free?C.line:C.amber)+';background:'+(on?C.green:"transparent")+';display:flex;align-items:center;justify-content:center;flex:0 0 auto;">'+(on?icon("check",14,"#fff"):"")+'</span></button>';
  }).join("");
  var footer=edit
    ?'<div style="display:flex;gap:8px;margin-top:12px;"><button class="btn" data-action="del-duty" style="flex:0 0 auto;padding:12px 15px;border-radius:12px;border:1px solid '+C.redSoft+';background:'+C.redSoft+';color:'+C.red+';font-weight:700;font-size:14px;display:flex;align-items:center;gap:5px;">'+icon("trash",15)+' 刪掉</button><button class="btn" data-action="close-sheet" style="flex:1;padding:12px;border-radius:12px;border:none;background:'+C.green+';color:#fff;font-weight:800;font-size:15px;">完成</button></div>'
    :'<button class="btn" data-action="close-sheet" style="width:100%;margin-top:12px;padding:12px;border-radius:12px;border:none;background:'+C.green+';color:#fff;font-weight:800;font-size:15px;">關閉</button>';
  var cap=oc?('　·　此時段 '+freeN+' 人有空'):'　·　未設時段';
  var restBanner=restNote?'<div style="background:'+C.amberSoft+';border:1px solid '+C.amber+';border-radius:9px;padding:7px 10px;margin-bottom:9px;font-size:11.5px;font-weight:700;color:'+C.amber+';">🛌 排到這項的人會自動補休 '+esc(fmtSpan(restNote))+'（時間軸／統計會帶出）</div>':"";
  return handleBar()+head+'<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">'+gtag+'<span style="font-size:11.5px;color:'+C.sub+';font-weight:700;">'+(d.keepAll?"全班":d.assigned.length+"/"+d.count)+cap+'</span></div>'+restBanner+timeBox+ctrl+'<div class="sheet-list" style="max-height:40vh;overflow-y:auto;">'+listHtml+'</div>'+footer;
}
function tlFreeInner(){
  var f=state.tlFree||{},md=curDate().replace(/[（(].*$/,"");
  var oc=(f.s!=null&&f.e!=null&&f.e>f.s)?[f.s,f.e]:(f.s!=null?occSpan(tlHM(f.s).replace(":","")):null);
  var freeList=tlFreeAt(oc?oc[0]:null,oc?oc[1]:null,md,null),freeN=freeList.filter(function(x){return x.free;}).length;
  var rows=freeList.map(function(fx){var p=personByCode(fx.pid);return '<div style="display:flex;align-items:center;gap:10px;padding:8px 6px;border-bottom:1px solid '+C.line+';"><span style="width:9px;height:9px;border-radius:999px;background:'+(fx.free?C.green:C.amber)+';flex:0 0 auto;"></span>'+badge(p.code,26,fx.free?"green":"mute")+'<div style="flex:1;min-width:0;"><div style="font-size:14px;font-weight:700;color:'+C.ink+';">'+esc(nameOf(fx.pid))+'</div></div><span style="font-size:12px;font-weight:700;color:'+(fx.free?C.green:C.amber)+';white-space:nowrap;">'+(fx.free?"有空":esc(fx.why))+'</span></div>';}).join("");
  return handleBar()+'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;"><div style="font-size:16px;font-weight:800;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(f.label||"這個時段")+'</div>'+xBtn()+'</div><div style="font-size:12.5px;color:'+C.sub+';font-weight:700;margin-bottom:10px;">'+esc(f.tm||(oc?tlHM(oc[0])+"–"+tlHM(oc[1]):""))+'　·　'+freeN+' 人有空</div><div class="sheet-list" style="max-height:52vh;overflow-y:auto;">'+rows+'</div>';
}
function tlClusterMembers(s,e){return state.duties.filter(function(d){if(d.removed||planGroup(d)!=="打掃")return false;var sp=dutyEffSpan(d);return sp&&sp[0]===s&&sp[1]===e;});}   // 同一時段的打掃
function tlClusterBlocks(solids){   // 把同時段的打掃收合成一格（早上打掃/晚上打掃 ×N），其它照舊
  var by={},order=[],out=[];
  solids.forEach(function(bk){if(bk.kind==="duty"&&bk.group==="打掃"){var k=bk.s+"|"+bk.e;if(!by[k]){by[k]=[];order.push(k);}by[k].push(bk);}else out.push(bk);});
  order.forEach(function(k){var arr=by[k];
    if(arr.length>=2){var s=arr[0].s,e=arr[0].e,fill=0,need=0;arr.forEach(function(b){fill+=b.filled;need+=(b.keepAll?8:b.count);});
      out.push({kind:"cluster",group:"打掃",s:s,e:e,tentative:!!arr[0].tentative,label:(s<720?"早上打掃":"晚上打掃"),n:arr.length,filled:fill,need:need});}
    else out.push(arr[0]);});
  return out;
}
function tlClusterInner(){
  var f=state.tlCluster||{},edit=!state.readOnly&&state.boardMode!=="view";
  var members=tlClusterMembers(f.s,f.e);
  var rows=members.map(function(d){
    var col=dayGroupColor(planGroup(d)),who=d.keepAll?"全班":(d.assigned.map(function(p){return esc(nameOf(p));}).join("、")||'<span style="color:'+C.amber+';">未排</span>'),full=(d.keepAll?8:d.assigned.length)>=d.count;
    return '<button class="btn" data-action="tl-open" data-duty="'+esc(d.id)+'" style="width:100%;display:flex;align-items:center;gap:10px;padding:11px 8px;border-radius:11px;border:1px solid '+C.line+';background:'+C.surface+';text-align:left;margin-bottom:7px;"><span style="width:4px;align-self:stretch;border-radius:2px;background:'+col+';flex:0 0 auto;"></span><div style="flex:1;min-width:0;"><div style="font-size:14.5px;font-weight:800;color:'+C.ink+';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(d.label)+'</div><div style="font-size:11.5px;color:'+C.sub+';margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+who+'</div></div><span style="flex:0 0 auto;font-size:11.5px;font-weight:800;color:'+(full?col:C.amber)+';">'+(d.keepAll?"全":(d.assigned.length+"/"+d.count))+'</span><span style="flex:0 0 auto;color:'+C.sub+';font-size:15px;font-weight:700;">›</span></button>';
  }).join("");
  var hint='<div style="font-size:11.5px;color:'+C.sub+';margin-bottom:9px;">'+(edit?"點一項去排人／改時段。":"這些是同一時段的打掃。")+'</div>';
  return handleBar()+'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;"><div style="font-size:16px;font-weight:800;">'+esc(f.label||"打掃")+' <span style="color:'+C.sub+';font-weight:700;font-size:13px;">'+esc(f.s!=null?tlHM(f.s)+"–"+tlHM(f.e):"")+' · '+members.length+' 項</span></div>'+xBtn()+'</div>'+hint+'<div class="sheet-list" style="max-height:56vh;overflow-y:auto;">'+rows+'</div>';
}
function tlRestSrc(t,id){return t==="duty"?dutyById(id):t==="guard"?guardShiftById(id):null;}
function setAbsRange(pid,md,oldRange,newRange){var list=absenceRecs(pid,md),found=false;list.forEach(function(r){if(!found&&r.range===oldRange){r.range=newRange;found=true;}});if(found)writeAbs(pid,md,list);return found;}   // 時間軸調手動補休→回寫 absence（今日排休會跟著更新）
function delAbsRange(pid,md,range){writeAbs(pid,md,absenceRecs(pid,md).filter(function(r){return r.range!==range;}));}
function tlRestInner(){
  var f=state.tlRest||{},cur=f.range||"";
  var presets=(f.kind==="夜哨")?["0550-0740","0550-0800","0550-0900"]:(f.kind==="午哨")?["1400-1600","1400-1630","1400-1700"]:["1230-1430","1230-1530","1230-1600","1230-1700"];
  var chips=presets.map(function(r){var on=cur===r;return '<button class="btn" data-action="tl-rest-preset" data-t="'+esc(r)+'" style="padding:6px 11px;border-radius:9px;font-size:12.5px;font-weight:700;border:1px solid '+(on?C.amber:C.line)+';background:'+(on?C.amberSoft:C.surface)+';color:'+(on?C.amber:C.sub)+';font-variant-numeric:tabular-nums;">'+esc(fmtSpan(r))+'</button>';}).join("");
  return handleBar()+'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;"><div style="font-size:16px;font-weight:800;">調補休時間</div>'+xBtn()+'</div><div style="font-size:12.5px;color:'+C.sub+';font-weight:700;margin-bottom:12px;">'+esc(f.label||"")+'</div>'
    +label("補休時段（例 1230-1600；比較晚可補久一點）")+'<input data-input="tl-rest-range" value="'+esc(cur)+'" placeholder="1230-1600" style="width:100%;margin-top:7px;padding:10px 12px;border-radius:10px;border:1px solid '+C.line+';background:'+C.bg+';font-size:14px;outline:none;font-family:ui-monospace,Menlo,monospace;" />'
    +'<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:9px;">'+chips+'</div>'
    +'<div style="display:flex;gap:8px;margin-top:14px;"><button class="btn" data-action="tl-rest-reset" style="flex:1;padding:11px;border-radius:11px;border:1px solid '+(f.t==="absence"?C.redSoft:C.line)+';background:'+(f.t==="absence"?C.redSoft:C.surface)+';color:'+(f.t==="absence"?C.red:C.sub)+';font-weight:700;font-size:13.5px;">'+(f.t==="absence"?"刪掉這筆":"回預設")+'</button><button class="btn" data-action="tl-rest-save" style="flex:2;padding:11px;border-radius:11px;border:none;background:'+C.greenDeep+';color:#fff;font-weight:800;font-size:14px;">存起來</button></div>';
}
var DAILY_RE=/(起床|晨操|升旗|集合|用餐|上餐廳|午休|午睡|操課|運動|點名|就寢|燈火|勤前|收操|盥洗|沐浴|莒光|生命教育|座談)/;
function dailyShort(t){t=String(t||"").split(/[、,，·]/)[0].replace(/\s/g,"");return t.length>5?t.slice(0,5):t;}
function modeC(plan){   // 行程頁：八人時段表（Y=時間、X=8人）＋日常事件（用餐/午休/集合/點名…）當背景
  var items={},anchors=[];
  PEOPLE.forEach(function(p){items[p.id]=personDayItems(plan,p.id).map(function(it){var sp=spanMin(it.range),s=sp?sp[0]:(it.min===99999?null:it.min),e=sp&&sp[1]>sp[0]?sp[1]:(s!=null?Math.min(TL_DAYEND,s+30):null);if(s!=null&&!it.carry)anchors.push([s,e==null?s:e]);return {s:s,e:e,label:it.label,group:it.group,carry:!!it.carry,pin:it.pin};});});
  // 日常事件：取自行動準則，全班共用、畫成整排背景帶（勤務照樣畫在上面＝以勤務為主）
  var daily=[];(plan.schedule||[]).forEach(function(it){if(it.min==null||!DAILY_RE.test(it.text||""))return;var sp=spanMin(it.range),s=it.min,e=(sp&&sp[1]>sp[0])?sp[1]:null;daily.push({s:s,e:e,text:it.text,point:(e==null),kind:"routine"});anchors.push([s,e==null?s:e]);});
  (plan.events||[]).forEach(function(ev){if((ev.people&&ev.people.length)||ev.keepAll||ev.min==null)return;var sp=spanMin(ev.range),s=ev.min,e=(sp&&sp[1]>sp[0])?sp[1]:null;daily.push({s:s,e:e,text:ev.label,point:(e==null),kind:"adhoc"});anchors.push([s,e==null?s:e]);});   // 沒排人的事（行程不計次/剛新增）＝臨時提醒，另一色更醒目
  var outMap={};(plan.outs||[]).forEach(function(o){outMap[o.pid]=o.reason;});
  var now=(plan.date===todayLabel())?(function(){var n=new Date();return n.getHours()*60+n.getMinutes();})():null;
  var ax=tlAxis(anchors,now);
  var nowLine="";
  if(now!=null){var doing=[];var dn=null;daily.forEach(function(dv){if(dv.e!=null&&now>=dv.s&&now<dv.e)dn=dv;});if(dn)doing.push('<span style="color:'+C.sub+';font-weight:800;">全體 '+esc(dailyShort(dn.text))+'</span>');
    PEOPLE.forEach(function(p){if(outMap[p.id]){doing.push('<span style="color:'+C.sub+';">'+esc(short2(nameOf(p.id)))+' '+esc(outMap[p.id])+'</span>');return;}var cur=null;items[p.id].forEach(function(it){if(!it.carry&&it.s!=null&&it.e!=null&&now>=it.s&&now<it.e)cur=it;});if(cur)doing.push('<span style="color:'+dayGroupColor(cur.group)+';font-weight:800;">'+esc(short2(nameOf(p.id)))+' '+esc(cur.group==="站哨"?"站哨":(cur.label||cur.group))+'</span>');});nowLine='<div style="background:'+C.surface+';border:1px solid '+C.line+';border-radius:11px;padding:8px 11px;margin-bottom:10px;font-size:11.5px;line-height:1.85;"><b style="color:'+C.red+';">現在 '+tlHM(now)+'</b>　'+(doing.length?doing.join('　'):'<span style="color:'+C.sub+';">大家都沒排勤務</span>')+'</div>';}
  if(!ax)return nowLine+'<div style="text-align:center;color:'+C.sub+';font-size:13px;padding:30px 12px;">這天還沒有可畫的時段。</div>';
  var GUT=42;   // 左欄只放時間；日常名稱改成往右的浮貼膠囊（見下），不再塞進左欄以免往左突出跑版
  var headRow='<div style="display:flex;padding-left:'+GUT+'px;margin-bottom:5px;">'+PEOPLE.map(function(p){return '<div style="flex:1;min-width:0;display:flex;justify-content:center;">'+badge(p.code,22,outMap[p.id]?"mute":"green")+'</div>';}).join("")+'</div>';
  var pieces="";
  // 日常事件（準則日常＝靛紫、臨時不計次＝玫紅，鮮豔且做成「膠囊」形狀＝和勤務方塊明顯不同、不混淆）：
  //  - 背景仍畫淡色帶／虛線標出時段（z1，勤務蓋在上面）。
  //  - 名稱做成「浮貼膠囊」（帶陰影＝懸浮感），從格線往右放（不進左邊時間欄→不擋時間數字、也不會往左突出跑版）。
  //  - 多個時間相近的膠囊會自動往右錯開一欄，避免彼此疊在一起。
  var DAILY_RTN="#4F46E5",DAILY_ADH="#E11D48",chipRows=[],CHIPH=17;
  daily.slice().sort(function(a,b){return a.s-b.s;}).forEach(function(dv){
    var acc=(dv.kind==="adhoc")?DAILY_ADH:DAILY_RTN,y=ax.y(dv.s);
    if(dv.point)pieces+='<div style="position:absolute;left:'+GUT+'px;right:0;top:'+y+'px;height:0;border-top:2px dashed '+acc+'55;z-index:1;"></div>';
    else{var bh=Math.max(10,ax.y(dv.e)-y);pieces+='<div style="position:absolute;left:'+GUT+'px;right:0;top:'+y+'px;height:'+bh+'px;background:'+acc+'12;border-top:1.5px solid '+acc+'3A;z-index:1;"></div>';}
    var top=Math.max(1,Math.round(y)-CHIPH-1),bot=top+CHIPH,lane=0;   // 膠囊放事件起點「上方」的空檔（避開下面置中的格子文字）；相近就往右錯開
    while((chipRows[lane]||[]).some(function(r){return !(top>r.bot+2||bot<r.top-2);}))lane++;
    (chipRows[lane]=chipRows[lane]||[]).push({top:top,bot:bot});
    var tag=(dv.kind==="adhoc")?'<span style="opacity:.85;">臨 </span>':"";
    pieces+='<div style="position:absolute;left:'+(GUT+4+lane*94)+'px;top:'+top+'px;height:'+CHIPH+'px;display:flex;align-items:center;background:'+acc+';color:#fff;font-size:9px;font-weight:800;padding:0 8px;border-radius:999px;line-height:1;white-space:nowrap;box-shadow:0 2px 5px rgba(0,0,0,.30);z-index:5;">'+tag+esc(dailyShort(dv.text))+'</div>';
  });
  ax.B.forEach(function(m){var yy=ax.y(m);pieces+='<div style="position:absolute;left:'+GUT+'px;right:0;top:'+yy+'px;height:1px;background:'+C.line+';opacity:.6;z-index:3;"></div><div style="position:absolute;left:0;top:'+(yy-6)+'px;width:'+(GUT-3)+'px;text-align:right;font-size:9.5px;font-weight:700;color:'+C.sub+';font-variant-numeric:tabular-nums;z-index:3;">'+esc(tlHM(m))+'</div>';});
  if(!state.mcInfo)state.mcInfo={};   // 哪些勤務方塊被點開資訊泡泡（純畫面、不存不同步）
  PEOPLE.forEach(function(p,ci){var innerLeft=GUT+'px + (100% - '+GUT+'px) * '+ci+' / 8',innerW='(100% - '+GUT+'px) / 8',colLeft='calc('+innerLeft+')',colW='calc('+innerW+')';
    if(outMap[p.id])pieces+='<div style="position:absolute;left:'+colLeft+';width:'+colW+';top:'+ax.y(ax.lo)+'px;height:'+(ax.y(ax.hi)-ax.y(ax.lo))+'px;background:'+C.line+'55;z-index:3;"></div>';
    items[p.id].forEach(function(it){if(it.s==null)return;var col=dayGroupColor(it.group),top,hh;
      if(it.carry){hh=18;top=(it.pin==="top")?ax.y(ax.lo):(ax.y(ax.hi)-hh);}   // 跨夜哨釘在頂/底
      else{top=ax.y(it.s);hh=Math.max(16,ax.y(it.e==null?it.s:it.e)-top);}
      var what=(it.group==="站哨"?(it.carry?"跨夜哨":"站哨"):(it.label||it.group));
      var key=p.id+"@"+it.s+"@"+ci,sel=!it.carry&&state.mcInfo[key];
      pieces+='<div '+(it.carry?'':'data-action="mc-info" data-k="'+esc(key)+'" ')+'style="position:absolute;left:calc('+innerLeft+' + 1px);width:calc('+innerW+' - 3px);top:'+top+'px;height:'+hh+'px;background:'+col+';border-radius:5px;opacity:'+(it.carry?'.72':'.94')+';overflow:hidden;padding:1px 2px;z-index:'+(sel?6:4)+';display:flex;align-items:center;justify-content:center;'+(it.carry?'border:1px dashed #fff;':'cursor:pointer;')+(sel?'outline:2px solid #fff;outline-offset:-2px;':'')+'"><div style="font-size:8.5px;font-weight:800;color:#fff;line-height:1.15;text-align:center;overflow:hidden;">'+esc(what.slice(0,4))+'</div></div>';
      // 資訊泡泡：點勤務方塊跳出（白底不透明＝多個並存也不會顏色互疊）；再點方塊或泡泡就消失
      if(sel){var nm=nameOf(p.id),tr=(it.e!=null?tlHM(it.s)+"–"+tlHM(it.e):tlHM(it.s)+" 起"),above=(top>44);
        var pos=(ci<=3)?('left:calc('+innerLeft+');'):('right:calc(100% - ('+innerLeft+' + '+innerW+'));');
        pos+=above?('top:'+(top-3)+'px;transform:translateY(-100%);'):('top:'+(top+hh+3)+'px;');
        pieces+='<div data-action="mc-info" data-k="'+esc(key)+'" style="position:absolute;'+pos+'z-index:9;background:'+C.surface+';border:1.5px solid '+col+';border-left:5px solid '+col+';border-radius:9px;padding:5px 9px;box-shadow:0 5px 14px rgba(0,0,0,.25);white-space:nowrap;cursor:pointer;"><div style="font-size:11px;font-weight:800;color:'+col+';line-height:1.35;">'+esc(nm)+'</div><div style="font-size:10.5px;color:'+C.ink+';line-height:1.35;">'+esc(what)+'　<span style="font-variant-numeric:tabular-nums;color:'+C.sub+';font-weight:700;">'+esc(tr)+'</span></div></div>';}
    });});
  if(now!=null&&now>=ax.lo&&now<=ax.hi){var ny=ax.y(now);
    pieces+='<div style="position:absolute;left:'+GUT+'px;right:0;top:'+ny+'px;height:0;border-top:2px solid '+C.red+';z-index:6;"></div>'   // 紅線從格線起（不再蓋到左邊時間欄）
      +'<div style="position:absolute;left:'+(GUT-4)+'px;top:'+(ny-4)+'px;width:8px;height:8px;border-radius:999px;background:'+C.red+';box-shadow:0 0 0 2px '+C.surface+';z-index:7;"></div>'   // 交界紅點
      +'<div style="position:absolute;left:0;top:'+(ny-8)+'px;width:'+(GUT-5)+'px;text-align:right;font-size:9.5px;font-weight:800;color:'+C.red+';font-variant-numeric:tabular-nums;background:'+C.bg+'dd;border-radius:3px;z-index:7;">'+tlHM(now)+'</div>';}   // 左欄紅色現在時間
  var legend='<div style="font-size:10.5px;color:'+C.sub+';margin-top:7px;line-height:1.7;"><b style="color:'+DAILY_RTN+';">靛紫膠囊</b>＝全班日常（用餐、午休、集合、點名…）；<b style="color:'+DAILY_ADH+';">玫紅・臨</b>＝臨時提醒（不計次）；彩色方塊＝各自勤務（<b>點方塊看誰／做什麼／幾點</b>，可同時開多個、再點消失）；<b style="color:'+C.red+';">紅線</b>＝現在。</div>';
  return nowLine+headRow+card('<div style="position:relative;height:'+ax.H+'px;">'+pieces+'</div>')+legend;
}
function modeA(plan){
  var rowMap={};
  function ensureRow(min,range,text){
    if(min==null)return null;
    if(!rowMap[min])rowMap[min]={min:min,range:range||"",text:text||"",events:[],rests:[]};
    else{if(text&&!rowMap[min].text)rowMap[min].text=text;if(range&&!rowMap[min].range)rowMap[min].range=range;}
    return rowMap[min];
  }
  (plan.schedule||[]).forEach(function(it){if(it.min!=null)ensureRow(it.min,it.range,it.text);});
  var untimed=[];
  (plan.events||[]).forEach(function(e){if(e.min==null){untimed.push(e);return;}var r=ensureRow(e.min,e.range,"");if(r)r.events.push(e);});
  (plan.rests||[]).forEach(function(rst){if(rst.s==null)return;var r=ensureRow(rst.s,rst.range,"");if(r)r.rests.push(rst);});
  var rows=Object.keys(rowMap).map(function(k){return rowMap[k];}).sort(function(a,b){return a.min-b.min;});
  if(!rows.length&&!untimed.length)return '<div style="text-align:center;color:'+C.sub+';font-size:13px;padding:34px 12px;line-height:1.7;">這天還沒有可顯示的行程。<br>到<b>排班</b>頁排好勤務、或貼上行動準則後就會顯示。</div>';
  function tag(col,txt){return '<span style="display:inline-block;font-size:10.5px;font-weight:800;color:'+col+';background:'+col+'1A;padding:2px 8px;border-radius:7px;margin:5px 5px 0 0;">'+txt+'</span>';}
  var isToday=(plan.date===todayLabel()),nowMin=null,nowHtml="";
  if(isToday){var nd=new Date();nowMin=nd.getHours()*60+nd.getMinutes();var nh=Math.floor(nowMin/60),nm=nowMin%60,hhmm=(nh<10?"0":"")+nh+":"+(nm<10?"0":"")+nm;
    nowHtml='<div style="display:flex;gap:11px;align-items:center;margin:1px 0;"><div style="flex:0 0 46px;text-align:right;font-size:11.5px;font-weight:800;color:'+C.red+';">現在</div><div style="flex:0 0 auto;width:10px;display:flex;justify-content:center;"><div style="width:12px;height:12px;border-radius:999px;background:'+C.red+';box-shadow:0 0 0 3px '+C.red+'22;"></div></div><div style="flex:1;display:flex;align-items:center;gap:8px;"><div style="flex:1;height:2px;background:'+C.red+';border-radius:2px;"></div><span style="font-size:11.5px;font-weight:800;color:'+C.red+';font-variant-numeric:tabular-nums;">'+hhmm+'</span></div></div>';
  }
  var body="",placed=false;
  rows.forEach(function(it,idx){
    var last=idx===rows.length-1;
    if(isToday&&!placed&&it.min>nowMin){body+=nowHtml;placed=true;}
    var mark=it.events.length||it.rests.length;
    var tags=it.events.map(function(e){var who=e.keepAll?'全班':e.people.map(function(id){return esc(short2(nameOf(id)));}).join(" ");return tag(dayGroupColor(e.group),esc(e.label)+(who?' '+who:''));}).join("")
            +it.rests.map(function(rst){var rn=rst.reason||"補休";return tag(absColor(rn),esc(rn)+' '+esc(short2(nameOf(rst.pid))));}).join("");
    var hasText=!!it.text;
    var tcol='<div style="flex:0 0 46px;text-align:right;font-variant-numeric:tabular-nums;font-weight:800;font-size:13px;color:'+C.greenDeep+';padding-top:1px;">'+esc(fmtSpan(it.range))+'</div>';
    var rail='<div style="flex:0 0 auto;display:flex;flex-direction:column;align-items:center;align-self:stretch;"><div style="width:10px;height:10px;border-radius:999px;background:'+(mark?C.green:C.brass)+';margin-top:4px;flex-shrink:0;"></div>'+(last?"":'<div style="flex:1;width:2px;background:'+C.line+';margin-top:2px;"></div>')+'</div>';
    var textHtml=hasText?'<div style="font-size:14px;font-weight:600;color:'+C.ink+';line-height:1.45;">'+esc(it.text)+'</div>':'';
    body+='<div style="display:flex;gap:11px;align-items:stretch;">'+tcol+rail+'<div style="flex:1;padding-bottom:'+(last?0:14)+'px;">'+textHtml+(tags?'<div>'+tags+'</div>':(hasText?'':'<div style="font-size:12px;color:'+C.sub+';">—</div>'))+'</div></div>';
  });
  if(isToday&&!placed&&nowMin!=null)body+=nowHtml;
  var extra="";
  if(untimed.length){
    var uc=untimed.map(function(e){return tag(dayGroupColor(e.group),esc(e.label)+' '+(e.keepAll?'全班':e.people.map(function(id){return esc(short2(nameOf(id)));}).join(" ")));}).join("");
    extra='<div style="margin-top:12px;padding-top:10px;border-top:1px dashed '+C.line+';"><div style="font-size:12px;font-weight:800;color:'+C.sub+';margin-bottom:2px;">未標時間</div>'+uc+'</div>';
  }
  return '<div style="padding:2px 2px 20px;">'+body+extra+'</div>';
}
function personDayItems(plan,pid){
  var items=[];
  (plan.events||[]).forEach(function(e){if(!(e.keepAll||e.people.indexOf(pid)>=0))return;items.push({min:(e.min==null?99999:e.min),range:e.range||"",label:e.label,group:e.group,keepAll:!!e.keepAll,carry:!!e.carry,pin:e.pin});});
  (plan.rests||[]).forEach(function(r){if(r.pid!==pid)return;items.push({min:(r.s==null?99999:r.s),range:r.range||"",label:"",group:(r.reason||"補休")});});
  items.sort(function(a,b){return a.min-b.min;});
  return items;
}
function itemWhat(it){
  if(it.group==="站哨"){var m=(it.label||"").match(/[（(].*$/);return m?m[0]:"";}
  if(it.group==="補休")return "";
  return it.label||"";
}
function modeB(plan){
  var reasonCol={"大公差":GCOLORS["大公差"],"休假":"#4C7D74","其他":C.sub};
  var outMap={};(plan.outs||[]).forEach(function(o){outMap[o.pid]=o.reason;});
  // 全體／提醒：沒排特定人的事（行程不計次、剛新增還沒排人的勤務）
  var gen=(plan.events||[]).filter(function(e){return !e.keepAll&&(!e.people||!e.people.length);}).sort(function(a,b){return (a.min==null?99999:a.min)-(b.min==null?99999:b.min);});
  var genCard=gen.length?card('<div style="font-size:12px;font-weight:800;color:'+C.sub+';margin-bottom:2px;">全體／提醒</div>'+gen.map(function(e){var col=dayGroupColor(e.group),tm=e.range?fmtSpan(e.range):"未定時段";return '<div style="display:flex;align-items:baseline;gap:8px;margin-top:6px;"><span style="flex:0 0 92px;font-size:12px;font-weight:800;color:'+C.greenDeep+';font-variant-numeric:tabular-nums;">'+esc(tm)+'</span><span style="flex:0 0 auto;font-size:11.5px;font-weight:800;color:'+col+';background:'+col+'1A;padding:1px 7px;border-radius:6px;">'+esc(e.group)+'</span><span style="font-size:12.5px;color:'+C.ink+';">'+esc(e.label)+'</span></div>';}).join(""),"margin-bottom:9px;"):"";
  var cards=PEOPLE.map(function(p){
    var whole=outMap[p.id],items=personDayItems(plan,p.id);
    var rc=whole?(reasonCol[whole]||C.sub):C.green;
    var head='<div style="display:flex;align-items:center;gap:8px;">'+badge(p.code,26,"green")+'<span style="font-size:14.5px;font-weight:800;color:'+C.ink+';">'+esc(nameOf(p.id))+'</span>'+(whole?'<span style="margin-left:auto;font-size:11.5px;font-weight:800;color:'+rc+';">'+esc(whole)+' · 整天不在</span>':(items.length?'<span style="margin-left:auto;font-size:11px;color:'+C.sub+';">'+items.length+' 項</span>':""))+'</div>';
    var bodyRows;
    if(whole&&!items.length)bodyRows="";
    else if(!items.length)bodyRows='<div style="font-size:12px;color:'+C.sub+';margin-top:6px;">跟課表，今日無其他勤務</div>';
    else bodyRows='<div style="margin-top:2px;">'+items.map(function(it){
      var col=dayGroupColor(it.group),what=itemWhat(it),tm=it.range?fmtSpan(it.range):"—";
      return '<div style="display:flex;align-items:baseline;gap:8px;margin-top:6px;"><span style="flex:0 0 92px;font-size:12px;font-weight:800;color:'+C.greenDeep+';font-variant-numeric:tabular-nums;">'+esc(tm)+'</span><span style="flex:0 0 auto;font-size:11.5px;font-weight:800;color:'+col+';background:'+col+'1A;padding:1px 7px;border-radius:6px;">'+esc(it.group)+'</span>'+(what?'<span style="font-size:12.5px;color:'+C.ink+';">'+esc(what)+'</span>':'')+'</div>';
    }).join("")+'</div>';
    return card(head+bodyRows,"margin-bottom:9px;");
  }).join("");
  return '<div style="padding-bottom:20px;">'+genCard+cards+'</div>';
}
function dayLegend(){var gs=["打掃","公差","大公差","小公差","打飯","分菜","站哨","補休"];return '<div style="display:flex;flex-wrap:wrap;gap:10px 14px;margin:0 2px 12px;">'+gs.map(function(g){return '<span style="display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;color:'+C.ink+';"><span style="width:10px;height:10px;border-radius:3px;background:'+dayGroupColor(g)+';"></span>'+g+'</span>';}).join("")+'</div>';}
function schedCard(){
  var s=state.schedule;
  if(!s.loaded||state.showSchedPaste){
    return '<div style="margin-top:12px;">'+card(label("\u8cbc\u4e0a\u884c\u52d5\u6e96\u5247\uff08\u53ef\u9078\uff0c\u7528\u4f86\u6a19\u6642\u9593\uff0b\u505a\u884c\u7a0b\u9801\uff09")+'<textarea data-input="spaste" placeholder="\u628a\u73ed\u9577\u7684\u884c\u52d5\u6e96\u64da\u6574\u4efd\u8cbc\u9032\u4f86\uff0c\u6703\u6293\u51fa\u6642\u9593\u8ef8\uff0c\u4e26\u76e1\u91cf\u5e6b\u52e4\u52d9\u6a19\u4e0a\u6642\u9593\u3002" style="width:100%;height:100px;margin-top:9px;padding:11px;border-radius:10px;border:1px solid '+C.line+';background:'+C.bg+';font-size:13px;line-height:1.6;outline:none;resize:vertical;font-family:ui-monospace,Menlo,monospace;">'+esc(state.schedPaste||"")+'</textarea><button class="btn" data-action="sparse" style="width:100%;margin-top:9px;padding:12px;border-radius:11px;border:none;background:'+C.greenDeep+';color:#fff;font-weight:800;font-size:14.5px;">\u89e3\u6790\u6e96\u5247\u4e26\u6a19\u6642\u9593</button>')+'</div>';
  }
  var n=schedTimed().length;
  return '<div style="margin-top:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;background:'+C.brassSoft+';border:1px solid '+C.brass+';border-radius:12px;padding:10px 14px;"><div style="display:flex;align-items:center;gap:8px;color:'+C.amber+';font-weight:700;font-size:13px;">'+icon("clock",15,C.brass)+' \u6e96\u5247\u5df2\u8f09\u5165 \u00b7 '+n+' \u500b\u6642\u6bb5</div><button class="btn" data-action="srepaste" style="border:none;background:transparent;color:'+C.brass+';font-weight:700;font-size:13px;text-decoration:underline;">\u91cd\u8cbc</button></div>';
}
function dayPage(){
  var dates=dayDates();
  if(!dates.length)return '<div style="text-align:center;color:'+C.sub+';font-size:13.5px;padding:44px 16px;line-height:1.8;">\u9084\u6c92\u6709\u884c\u7a0b\u3002<br>\u5230<b>\u6392\u73ed</b>\u9801\u8cbc\u4e0a\u300c\u884c\u52d5\u6e96\u5247\u300d\u4e26\u6392\u597d\u52e4\u52d9\uff0c<br>\u9019\u88e1\u5c31\u6703\u986f\u793a\u7576\u5929\u6d41\u7a0b\u8207\u516b\u4eba\u5206\u5de5\u3002</div>';
  var cp=currentPlan();if(!cp)return '<div style="text-align:center;color:'+C.sub+';font-size:13.5px;padding:44px 16px;">\u9078\u4e00\u5929\u770b\u770b\u3002</div>';
  var plan=cp.plan,mode=state.dayView.mode||"A";
  var selKey=plan.date;
  var chipRow='<div style="display:flex;gap:7px;overflow-x:auto;padding:2px 2px 10px;-webkit-overflow-scrolling:touch;">'+dates.map(function(c){var on=c.key===selKey;return '<button class="btn" data-action="day-date" data-d="'+esc(c.key)+'" style="flex:0 0 auto;padding:6px 13px;border-radius:999px;font-size:12.5px;font-weight:700;border:1px solid '+(on?C.green:C.line)+';background:'+(on?C.greenSoft:C.surface)+';color:'+(on?C.greenDeep:C.sub)+';white-space:nowrap;">'+esc(c.label)+(c.key===state.activeDate&&state.gongban.loaded?" ·排":"")+'</button>';}).join("")+'</div>';
  var toggle='<div style="display:flex;gap:5px;background:'+C.line+';padding:3px;border-radius:12px;margin-bottom:12px;">'+[["A","\u7576\u5929\u6d41\u7a0b"],["B","\u516b\u4eba\u5206\u5de5"],["C","\u516b\u4eba\u6642\u6bb5\u8868"]].map(function(mm){var on=mode===mm[0];return '<button class="btn" data-action="day-mode" data-m="'+mm[0]+'" style="flex:1;padding:9px 0;border-radius:9px;font-size:12.5px;font-weight:800;border:none;background:'+(on?C.surface:"transparent")+';color:'+(on?C.greenDeep:C.sub)+';box-shadow:'+(on?"0 1px 4px rgba(0,0,0,.12)":"none")+';">'+mm[1]+'</button>';}).join("")+'</div>';
  var body=mode==="A"?modeA(plan):mode==="C"?(dayLegend()+modeC(plan)):(dayLegend()+modeB(plan));
  var statusBar="";
  var outs=plan.outs||[],rests=plan.rests||[];
  if(outs.length||rests.length){
    var parts=[];
    outs.forEach(function(o){parts.push('<span style="color:'+(({"大公差":GCOLORS["大公差"],"休假":"#4C7D74","其他":C.sub})[o.reason]||C.sub)+';font-weight:800;">'+esc(nameOf(o.pid))+' '+esc(o.reason)+'</span>');});
    rests.forEach(function(r){var rn=r.reason||"補休";parts.push('<span style="color:'+absColor(rn)+';font-weight:800;">'+esc(nameOf(r.pid))+' '+esc(rn)+' '+esc(fmtSpan(r.range))+'</span>');});
    statusBar='<div style="background:'+C.surface+';border:1px solid '+C.line+';border-radius:11px;padding:9px 12px;margin-bottom:12px;font-size:12px;line-height:1.7;">'+parts.join('<span style="color:'+C.line+';">　</span>')+'</div>';
  }
  var extra=extraCard(selKey);
  var delBar="";
  if(!state.readOnly){
    if(state.confirmDelDay===selKey)delBar='<div style="display:flex;gap:8px;margin-top:16px;"><button class="btn" data-action="del-day-cancel" style="flex:1;padding:11px;border-radius:11px;border:1px solid '+C.line+';background:'+C.surface+';color:'+C.sub+';font-weight:700;font-size:13px;">取消</button><button class="btn" data-action="del-day-go" data-md="'+esc(selKey)+'" style="flex:1;padding:11px;border-radius:11px;border:none;background:'+C.red+';color:#fff;font-weight:700;font-size:13px;">確定刪 '+esc(selKey)+'（行程＋統計）</button></div>';
    else delBar='<button class="btn" data-action="del-day-ask" data-md="'+esc(selKey)+'" style="width:100%;margin-top:16px;padding:11px;border-radius:11px;border:1px solid '+C.line+';background:'+C.surface+';color:'+C.red+';font-weight:700;font-size:12.5px;display:flex;align-items:center;justify-content:center;gap:6px;">'+icon("trash",14)+' 刪掉 '+esc(selKey)+' 這天（行程＋統計）</button>';
  }
  return chipRow+toggle+statusBar+body+extra+delBar;
}
function extraCard(md){
  if(state.readOnly)return "";
  var list=extraLogFor(md);
  var rows=list.map(function(e){
    var note=(e.group==="行程"),col=dayGroupColor(e.group);
    var who=note?"提醒":(e.keepAll?"全班":(e.entries||[]).map(function(x){return nameOf(x.p);}).join("、"));
    var tm=e.range?fmtSpan(e.range):"未標時間";
    return '<div style="display:flex;align-items:center;gap:8px;padding:9px 2px;border-bottom:1px solid '+C.line+';"><span style="flex:0 0 auto;font-size:11.5px;font-weight:800;color:'+col+';background:'+col+'1A;padding:2px 7px;border-radius:6px;">'+esc(e.group)+'</span><div style="flex:1;min-width:0;"><div style="font-size:13px;font-weight:700;color:'+C.ink+';">'+esc(e.label)+'</div><div style="font-size:11px;color:'+C.sub+';margin-top:1px;">'+esc(tm)+' · '+esc(who)+'</div></div><button class="btn" data-action="dayevt-edit" data-x="'+esc(e.id)+'" style="flex:0 0 auto;padding:6px 10px;border-radius:9px;border:1px solid '+C.line+';background:'+C.surface+';color:'+C.sub+';font-weight:700;font-size:12px;">編輯</button><button class="btn" data-action="dayevt-del-row" data-x="'+esc(e.id)+'" style="flex:0 0 auto;width:30px;height:30px;border-radius:9px;border:1px solid '+C.redSoft+';background:'+C.redSoft+';color:'+C.red+';display:flex;align-items:center;justify-content:center;">'+icon("trash",14,C.red)+'</button></div>';
  }).join("");
  var addBtn='<button class="btn" data-action="open-dayevt" data-md="'+esc(md)+'" style="width:100%;margin-top:'+(list.length?"10":"2")+'px;padding:11px;border-radius:11px;border:1.5px dashed '+C.green+';background:transparent;color:'+C.green+';font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;">'+icon("plus",15)+' 新增臨時勤務／行程（'+esc(md)+'）</button>';
  return '<div style="margin-top:16px;">'+card(label("臨時新增（額外勤務會併入公差次數與時間軸）")+(list.length?'<div style="margin-top:6px;">'+rows+'</div>':'<div style="font-size:12px;color:'+C.sub+';margin-top:6px;">臨時有事、加開勤務都可以加在這裡。</div>')+addBtn)+'</div>';
}

function fixMealTimes(){
  // 舊版把早/午/晚打對到準則的「第 1/2/3 筆打飯」，準則少一行就會錯位（例：午打被標成 1700）。
  // 這裡把已存的排班板重算一次；使用者手動指定過的時間（timeSrc==="manual"）不動。
  var changed=false;
  function fixList(duties,items){
    (duties||[]).forEach(function(d){
      if(d.kind!=="meal"||d.timeSrc==="manual")return;
      var t=dutyDefaultRange(d)||schedMatch(d,items)||defaultTimeFor(d);   // 打飯用固定時段（0600-0730…）
      if(t&&d.schedTime!==t){d.schedTime=t;d.timeSrc="auto";changed=true;}
    });
  }
  for(var dt in state.boards){var b=state.boards[dt];if(!b)continue;
    var its=((b.schedule&&b.schedule.items)?b.schedule.items:[]).filter(function(it){return it.time;});
    fixList(b.duties,its);
  }
  fixList(state.duties,schedTimed());
  if(changed)persistLocal();   // 只修本機，不主動上傳（避免使用者什麼都沒做就推雲端）
  return changed;
}
