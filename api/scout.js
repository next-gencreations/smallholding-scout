function cleanText(html){return html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&pound;|&#163;/gi,"£").replace(/&amp;/gi,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g," ").trim()}
function candidates(text,source){
 const out=[], re=/(?:Guide price|Offers? (?:over|in excess of)|Fixed price|Price)?\s*£\s?([0-9][0-9,]{3,})/gi; let m;
 while((m=re.exec(text))&&out.length<25){
  const price=Number(m[1].replace(/,/g,"")); const start=Math.max(0,m.index-90), end=Math.min(text.length,m.index+430), chunk=text.slice(start,end);
  const acre=chunk.match(/([0-9]+(?:\.[0-9]+)?)\s*(?:acres?|acreage)/i);
  const title=chunk.replace(/\s+/g," ").trim().slice(0,180);
  if(!out.some(x=>x.price===price&&x.title===title)) out.push({id:source.id+"-"+m.index,source:source.name,sourceType:source.type,price,acres:acre?Number(acre[1]):null,title,url:source.url});
 }
 return out;
}
export default async function handler(req,res){
 const sources=[
  {id:"derbyshire-council",name:"Derbyshire Council",url:"https://www.derbyshire.gov.uk/business/property/estates/premises-for-sale/property-for-sale.aspx",type:"council"},
  {id:"notts-council",name:"Nottinghamshire Council",url:"https://www.nottinghamshire.gov.uk/business-community/property-investment-and-promotion/to-let-for-sale",type:"council"},
  {id:"uklaf-derbyshire",name:"UK Land & Farms Derbyshire",url:"https://www.uklandandfarms.co.uk/land-for-sale/east-midlands/derbyshire/",type:"land"},
  {id:"uklaf-notts",name:"UK Land & Farms Nottinghamshire",url:"https://www.uklandandfarms.co.uk/farms-and-estates-for-sale/east-midlands/nottinghamshire/",type:"land"},
  {id:"otm-derbyshire",name:"OnTheMarket Derbyshire",url:"https://www.onthemarket.com/for-sale/farms-land/derbyshire/",type:"land"},
  {id:"otm-auctions",name:"OnTheMarket Derbyshire Auctions",url:"https://www.onthemarket.com/auction/farms-land/derbyshire/",type:"auction"}
 ];
 const checkedAt=new Date().toISOString();
 const results=await Promise.all(sources.map(async s=>{try{
  const r=await fetch(s.url,{headers:{"user-agent":"Mozilla/5.0 SmallholdingScout/1.1","accept":"text/html"}});
  const html=await r.text(), text=cleanText(html);
  return {...s,ok:r.ok,status:r.status,noAvailability:/no properties currently to let or for sale/i.test(text),candidates:candidates(text,s)};
 }catch(e){return {...s,ok:false,error:String(e&&e.message||e),candidates:[]}}}));
 const listings=results.flatMap(x=>x.candidates||[]);
 res.setHeader("Cache-Control","s-maxage=900, stale-while-revalidate=1800");
 res.status(200).json({ok:true,checkedAt,listings,results:results.map(({candidates,...x})=>({...x,count:candidates.length}))});
}