(function(){
	var $=require('../$');
	var parser=require('../parsers/exports');
	var http = require('http');
	var connect=require('express');
	
	var server={
		run: function(options){
		
			options.port=options.port||80;
			var mode='SRC';
			if(options.mode&&(options.mode.toUpperCase()=='DEV'||options.mode.toUpperCase()=='PRD')){
				mode=options.mode.toUpperCase();
			}
			options.mode=mode;
			
			var app=connect();
			app.use(parser.logger(options));
			app.use(parser.validator(options));
			app.use(parser.header(options));
			app.use(parser.server(options));
			
			var _server=http.createServer(app);
			
			_server.on('error',function(e){
				if(e.code=='EADDRINUSE'||e.code=='EACCES'){
					console.info(('[ERROR] '+options.port+'端口被占用, 请检查').red);
				}
				
				process.exit(1);
				
			});
			
			_server.on('listening',function(e){
				console.info('');
				console.info(('[Listen Port:'+options.port+' Mode:'+options.mode+'] Server Running ...').green);
			});
			
			_server.listen(options.port);
		}
	};
	
	$.extend(exports,{
		run: function(options){
			server.run(options);
		},
		
		usage: function(optimist){
			optimist.alias('m','mode');
			optimist.describe('m','设定server的运行方式 [ src | dev | prd ] , 默认为src模式');
			optimist.alias('p','port');
			optimist.describe('p','为server指定一个端口');
		},
		
		description: '在当前路径下启动一个server'
	});
	
}).call(this);