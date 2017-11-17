(function(){

	var $=require('../$');
	var parser=require('../parser');
	var fs=require('fs');
	var cloader=require('../config');
	
	exports.handler=function(req,res,next,options){
		var request=parser.parseRequest(req,'SRC');
		var config=cloader.getConfig(request.project);
		
		if(!config){
			res.writeHead(500, {'Content-Type': 'text/html; charset=UTF-8'});
			return res.end('<html><head></head><body><h1>Please check console info, .config Error</h1></body></html>');
		}
		
		if(!fs.existsSync(request.filepath)){
			console.info('[ERROR 404 REQUEST]'.red,request.url);
			res.writeHead(404, {'Content-Type': 'text/html; charset=UTF-8'});
			return res.end('<html><head></head><body><h1>'+request.filepath+' Not Found</h1></body></html>');
		}
		
		if(parser.isPrd(request.path)&&!request.query.require&&config.exports.indexOf(request.file)==-1){
			console.info('[ERROR]'.red,request.file+' not in exports of .config file');
			res.writeHead(500, {'Content-Type': 'text/html; charset=UTF-8'});
			return res.end('<html><head></head><body><h1>'+request.file+' not in exports of .config file</h1></body></html>');
		}
		
		if(options.mode=='SRC'){
		
			if(parser.isSrc(request.path)&&!request.query.require&&!request.query.parent){
				console.info('[ERROR]'.red,'url have no require or parent param');
				res.writeHead(500, {'Content-Type': 'text/html; charset=UTF-8'});
				return res.end('<html><head></head><body><h1>url have no require or parent param</h1></body></html>');
			}
			
		}else if(options.mode=='DEV'||options.mode=='PRD'){
			if(!parser.isPrd(request.path)){
				console.info('[ERROR]'.red,'only PRD mode url can pass IN '+options.mode+' mode');
				res.writeHead(500, {'Content-Type': 'text/html; charset=UTF-8'});
				return res.end('<html><head></head><body><h1>only PRD mode url can pass IN '+options.mode+' mode</h1></body></html>');
			}
		}else{
			console.info('[ERROR FORMAT]'.red,request.url);
			res.writeHead(500, {'Content-Type': 'text/html; charset=UTF-8'});
			return res.end('<html><head></head><body><h1>Make sure the format of path '+request.path+'</h1></body></html>');
		}
		
		return next();
	};

}).call(this);
