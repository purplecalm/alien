(function(){
	var $=require('../$');
	var configLoader=require('../config');
	var child_process = require('child_process');
	
	$.extend(exports,{
		run: function(optimist){
			var config=configLoader.getConfig();
			
			if(!config){
				return console.info('[ERROR]'.red,'找不到.config文件');
			}
			
			if(!config.dev){
				return console.info('[ERROR]'.red,'请在.config中增加dev对象, 其中包含host(开发机, e.g: env1.dev.com), path(开发机中放文件的路径, e.g: /home/q/www/)');
			}
			
			if(!config.dev.host){
				return console.info('[ERROR]'.red,'.config中的dev对象必须包含host(开发机, e.g: env1.dev.com)和path(开发机中放文件的路径, e.g: /home/q/www/)');
			}
			
			var cmds=['rsync','-rzcv','--chmod=a=\'rX,u+w\'','--rsync-path=\'sudo rsync\'','./dev'/* dev path */,config.dev.host+':'+config.dev.path,'--exclude=.svn','--temp-dir=/tmp'];
			
			
			console.info('[SYNC FILES]'.cyan);
			child_process.exec(cmds.join(' '),function(err,msg,stderr){
				if(err){
					return console.info('[ERROR]'.red,err);
				}
				
				if(msg){
					return console.info(msg,'\n[FINISHED]'.green);
				}
				
				if(stderr){
					return console.info('[ERROR]'.red,stderr);
				}
			});
		},
		
		usage: function(optimist){
			optimist.usage('根据调用跟目录下的.config中的dev对象设置将开发文件上传至开发机');
		},
		
		description: '同步当前目录下的内容到开发机'
	});
	
}).call(this);