const SPREADSHEET_ID = '1ISUbQV5yTKXHVA8qwwOh8rI54mpnqHhORSAPVmEQk9Y';
const SYNC_SECRET = 'PASTE_THE_SAME_RANDOM_SECRET_HERE';

function json_(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function nowLondon_(){
  return Utilities.formatDate(new Date(),'Europe/London',"yyyy-MM-dd'T'HH:mm:ssXXX");
}

function doPost(e){
  try{
    const body=JSON.parse((e&&e.postData&&e.postData.contents)||'{}');
    if(!body.secret || body.secret!==SYNC_SECRET) return json_({ok:false,error:'Unauthorised'});
    if(body.action==='getState') return getState_();
    if(body.action==='setState') return setState_(body);
    if(body.action==='getOutgoings') return getOutgoings_();
    if(body.action==='setOutgoings') return setOutgoings_(body);
    return json_({ok:false,error:'Unknown action'});
  }catch(err){
    return json_({ok:false,error:String(err&&err.message||err)});
  }
}

function getState_(){
  const sh=SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Dashboard State');
  const rows=sh.getRange(1,1,Math.max(sh.getLastRow(),2),4).getValues();
  let value='';
  for(let i=1;i<rows.length;i++) if(String(rows[i][0])==='confirmed_balance'){value=rows[i][1];break;}
  return json_({ok:true,confirmedBalance:value===''?null:Number(value)});
}

function setState_(body){
  const n=Number(body.confirmedBalance);
  if(!Number.isFinite(n)||n<0) return json_({ok:false,error:'Invalid balance'});
  const sh=SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Dashboard State');
  const rows=sh.getRange(1,1,Math.max(sh.getLastRow(),2),4).getValues();
  let row=0;
  for(let i=1;i<rows.length;i++) if(String(rows[i][0])==='confirmed_balance'){row=i+1;break;}
  if(!row){row=Math.max(sh.getLastRow()+1,2);sh.getRange(row,1).setValue('confirmed_balance');}
  sh.getRange(row,2,1,3).setValues([[Math.round(n*100)/100,nowLondon_(),'Saved user-confirmed balance via Finance Tracker']]);
  return json_({ok:true,confirmedBalance:Math.round(n*100)/100});
}

function getOutgoings_(){
  const sh=SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Recurring Outgoings');
  const last=Math.max(sh.getLastRow(),1);
  const rows=sh.getRange(1,1,last,10).getValues();
  const items=[];
  for(let i=1;i<rows.length;i++){
    const r=rows[i],type=String(r[1]||'');
    if(type!=='Direct Debit' && type!=='Subscription') continue;
    items.push({
      id:String(r[0]||('row-'+(i+1))),type,date:String(r[2]||'TBC'),name:String(r[3]||''),
      amount:r[4]===''?null:Number(r[4]),status:String(r[5]||'Keep'),notes:String(r[6]||''),
      endDate:String(r[7]||''),edited:String(r[8]||'').indexOf('saved_user_edit')===0
    });
  }
  return json_({ok:true,items});
}

function setOutgoings_(body){
  if(!Array.isArray(body.items)) return json_({ok:false,error:'Items must be an array'});
  const clean=body.items.map(function(x){
    const type=String(x.type||'');
    if(type!=='Direct Debit' && type!=='Subscription') throw new Error('Only Direct Debit and Subscription items can be saved here.');
    const name=String(x.name||'').trim();
    if(!name) throw new Error('Each item needs a name.');
    let amount='';
    if(x.amount!==null && x.amount!==''){
      const n=Number(x.amount); if(!Number.isFinite(n)||n<0) throw new Error('Invalid amount for '+name); amount=Math.round(n*100)/100;
    }
    return [
      String(x.id||('user-'+Date.now()+'-'+Math.random().toString(36).slice(2))),
      type,String(x.date||'TBC'),name,amount,String(x.status||'Keep'),String(x.notes||''),String(x.endDate||''),
      x.edited?'saved_user_edit':'monthly_outgoings_v1',nowLondon_()
    ];
  });

  const sh=SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Recurring Outgoings');
  const last=Math.max(sh.getLastRow(),1);
  const existing=last>1?sh.getRange(2,1,last-1,10).getValues():[];
  const preserved=existing.filter(function(r){return r[1]!=='Direct Debit' && r[1]!=='Subscription';});
  const all=clean.concat(preserved);
  if(sh.getMaxRows()>1) sh.getRange(2,1,sh.getMaxRows()-1,10).clearContent();
  if(all.length) sh.getRange(2,1,all.length,10).setValues(all);
  return json_({ok:true,count:clean.length});
}
