const st=require('./_store');
module.exports=async(req,res)=>{res.setHeader('Cache-Control','no-store');if(!st.configured)return res.status(503).json({error:'backend not configured'});try{res.status(200).json(await st.load())}catch(e){res.status(500).json({error:e.message})}};
