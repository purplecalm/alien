(function(){
	exports.handler=function(req,res,next){
	
		if(req.url=='/favicon.ico'){
			return res.end('');
		}
	
		console.info('\n[LOG] '+req.url);
		next();
	};
}).call(this);