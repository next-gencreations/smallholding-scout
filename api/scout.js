export default async function handler(req,res){
  const sources=[
    {id:"derbyshire-council",name:"Derbyshire Council",url:"https://www.derbyshire.gov.uk/business/property/estates/premises-for-sale/property-for-sale.aspx",type:"council"},
    {id:"notts-council",name:"Nottinghamshire Council",url:"https://www.nottinghamshire.gov.uk/business-community/property-investment-and-promotion/to-let-for-sale",type:"council"},
    {id:"uklaf-derbyshire",name:"UK Land & Farms Derbyshire",url:"https://www.uklandandfarms.co.uk/land-for-sale/east-midlands/derbyshire/",type:"land"},
    {id:"uklaf-notts",name:"UK Land & Farms Nottinghamshire",url:"https://www.uklandandfarms.co.uk/farms-and-estates-for-sale/east-midlands/nottinghamshire/",type:"land"},
    {id:"otm-derbyshire",name:"OnTheMarket Derbyshire",url:"https://www.onthemarket.com/for-sale/farms-land/derbyshire/",type:"land"},
    {id:"otm-auctions",name:"OnTheMarket Derbyshire Auctions",url:"https://www.onthemarket.com/auction/farms-land/derbyshire-dales/",type:"auction"}
  ];
  const checkedAt=new Date().toISOString();
  const results=await Promise.all(sources.map(async s=>{
    try{
      const r=await fetch(s.url,{headers:{"user-agent":"SmallholdingScout/1.0 (+personal land search)","accept":"text/html"}});
      const html=await r.text();
      const text=html.replace(/<script[\\s\\S]*?<\\/script>/gi," ").replace(/<style[\\s\\S]*?<\\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&pound;|&#163;/gi,"£").replace(/&amp;/gi,"&").replace(/\\s+/g," ").trim();
      const prices=[...text.matchAll(/£\\s?([0-9][0-9,]{3,})/g)].slice(0,30).map(m=>Number(m[1].replace(/,/g,"")));
      const acres=[...text.matchAll(/([0-9]+(?:\\.[0-9]+)?)\\s*(?:acres?|acreage)/gi)].slice(0,30).map(m=>Number(m[1]));
      const noAvailability=/no properties currently to let or for sale/i.test(text);
      return {...s,ok:r.ok,status:r.status,checkedAt,noAvailability,signals:{prices:prices.slice(0,12),acres:acres.slice(0,12)},sample:text.slice(0,700)};
    }catch(e){return {...s,ok:false,checkedAt,error:String(e&&e.message||e)}}
  }));
  res.setHeader("Cache-Control","s-maxage=1800, stale-while-revalidate=3600");
  res.status(200).json({ok:true,checkedAt,results});
}