(function(){
	var fs=require('./fs');
	var syspath = require("path");
	var config=require('./config');
	var optimist = require("optimist");
	
	var existsCommands=function(){
		var cmds=fs.dir(__dirname+'/commands');
		var ret={};
		
		cmds.forEach(function(v,i){
			if(/.+\.js$/i.test(v)){
				ret[v.replace(/\.js$/i,'').toLowerCase()]=v;
			}
		});
		return ret;
	}();
	
	var str='                ';
	var help_info=function(name,describe){
		return ' '+name+str.slice(name.length)+'# '+describe;
	}
	
	exports.exits=function(cmd){
		return !!existsCommands[String(cmd).toLowerCase()];
	};
	
	exports.get=function(cmd){
		if(existsCommands[String(cmd).toLowerCase()]){
			return require(syspath.join(__dirname,'/commands/'+existsCommands[String(cmd).toLowerCase()]));
		}
	};
	
	exports.run=function(cmd){
		var _cmd=exports.get(cmd), options=optimist;
		if(_cmd.usage){
			_cmd.usage(optimist);
		}
		
		optimist.alias('h','help');
		options=optimist.describe('h','查看帮助').argv;
		
		if(options.help){
			this.help(cmd);
		}else{
			_cmd.run(options);
		}
	};
	
	exports.help=function(cmd){
		console.info('\n========================= ALIEN '+config.version+' =========================\n');
		
		if(cmd){
			var _cmd=exports.get(cmd);
			console.info(help_info(cmd,_cmd.description));
			console.info('');
			optimist.showHelp();
		}else{
			for( var c in existsCommands){
				var _cmd=this.get(c);
				if(_cmd.description){
					console.info(help_info(c,_cmd.description));
				}
			}
			console.info('\nalien [cmd] -h, --help 查看具体命令帮助');
		}
	};
	
}).call(this);