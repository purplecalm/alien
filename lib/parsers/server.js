(function(){
	var $=require('../$');
	var parserPack=require('../parser');
	var parser;
	
	exports.init=function(options){
		if(options.mode){
			parser=parserPack[options.mode.toLowerCase()];
		}
		
		parser=parser||parserPack.src;
	};
	
	exports.handler=function(req, res, next){
		res.end(parser.parse(req));
	};
}).call(this);