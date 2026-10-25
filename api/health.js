const st=require('./_store');module.exports=(req,res)=>res.status(st.configured?200:503).json({ok:st.configured?1:0});
