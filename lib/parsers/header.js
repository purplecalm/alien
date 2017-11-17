(function(){

	var urlParser=require('url');

	exports.handler=function(req,res,next){
		var url=urlParser.parse(req.url);
		
		if(url.pathname=='/favicon.ico'){
			return res.end('');
		}
		
		if(/.+\.(js|mustache)$/.test(url.pathname)){
			res.writeHead(200, {'Content-Type': 'application/x-javascript;charset=UTF-8'});
		}else if(/.+\.css$/.test(url.pathname)){
			res.writeHead(200, {'Content-Type': 'text/css;charset=UTF-8'});
		}else{
			res.writeHead(500, {'Content-Type': 'text/html;charset=UTF-8'});
		}
		
		next();
	};
}).call(this);