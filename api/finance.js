const SCRIPT_URL = process.env.FINANCE_APPS_SCRIPT_URL;
const SYNC_SECRET = process.env.FINANCE_SYNC_SECRET;

function send(res, status, body){
  res.setHeader('Cache-Control','no-store');
  res.status(status).json(body);
}

export default async function handler(req,res){
  if(!SCRIPT_URL || !SYNC_SECRET){
    return send(res,503,{error:'Cloud sync is not configured on Vercel yet.'});
  }
  if(!['GET','POST'].includes(req.method)){
    return send(res,405,{error:'Method not allowed'});
  }
  const resource=String(req.query.resource||'');
  if(!['state','outgoings'].includes(resource)){
    return send(res,400,{error:'Unknown resource'});
  }
  const action = req.method==='GET'
    ? (resource==='state' ? 'getState' : 'getOutgoings')
    : (resource==='state' ? 'setState' : 'setOutgoings');

  const payload={secret:SYNC_SECRET,action};
  if(req.method==='POST'){
    if(resource==='state') payload.confirmedBalance=req.body?.confirmedBalance;
    if(resource==='outgoings') payload.items=req.body?.items;
  }

  try{
    const upstream=await fetch(SCRIPT_URL,{
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify(payload),
      redirect:'follow'
    });
    const text=await upstream.text();
    let data;
    try{data=JSON.parse(text)}catch(_){data={ok:false,error:'Google sync returned an invalid response.'}}
    if(!upstream.ok || !data.ok){
      return send(res,502,{error:data.error||`Google sync failed (${upstream.status})`});
    }
    return send(res,200,data);
  }catch(err){
    console.error(err);
    return send(res,502,{error:'Unable to reach the private finance database.'});
  }
}
