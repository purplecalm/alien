(function(){

	var fs=require('./fs');
	var commands=require('./cmd.js');
	
	var run=function(cmd){
		if(!commands.exits(cmd)){
			console.info('[ERROR] '+cmd+' 命令不存在 , 请参照以下命令');
			commands.help();
			return;
		}
		
		if(cmd.toLowerCase()=='help'){
			commands.help();
			return;
		}
		
		commands.run(cmd);
	};

	exports.run=run;
	
}).call(this);