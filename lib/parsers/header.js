(function(){

	var urlParser=require('url');

	exports.handler=function(req,res,next){
		var url=urlParser.parse(req.url);
		
		if(url.pathname=='/favicon.ico'){
			return res.end('');
		}
		
		if(/.+\.js$/.test(url.pathname)){
			res.writeHead(200, {'Content-Type': 'application/x-javascript'});
		}else if(/.+\.css$/.test(url.pathname)){
			res.writeHead(200, {'Content-Type': 'text/css'});
		}else{
			res.writeHead(500, {'Content-Type': 'text/html'});
		}
		
		next();
	};
}).call(this);