(function(){
	var fs=require('fs');
	var syspath=require('path');
	var async=require('async');
	var $=require('../$');
	var fstools=require('../fs');
	var cloader=require('../config');
	var parser=require('../parser');
	
	var root=process.cwd();
	
	var packer={
		run: function(options){
			if(this.clean()){
				this.start();
			}
		},
		
		clean: function(){
			if(fs.existsSync(syspath.join(root,'dev'))){
				try{
					fstools.rmdir(syspath.join(root,'dev'));
				}catch(e){
					var errorinfo;
					switch(e.code){
						case 'ENOTEMPTY':
							errorinfo='dev目录不为空(请检查dev目录中的文件是否使用中), 删除dev目录失败';
							break;
						case 'EPERM':
							errorinfo='权限不足, 删除dev目录失败';
							break;
						default:
							errorinfo='删除dev目录失败'
					}
					console.info('[ERROR]'.red,errorinfo);
					
					return false;
				}
			}
			return true;
		},
		
		start: function(){
			var config=cloader.getConfig(), self=this;
			
			if(!config){
				return;
			}
			
			var tasks=[];
			(config.exports||[]).forEach(function(v){
				tasks.push(function(){
					return self.one(syspath.join('src',v));
				});
			});
			
			async.parallel(tasks,function(err,values){
				//console.log(values);
			});
		},
		
		getDevPath: function(path){
			return path.replace(/\.(js|css)$/,function(hole,extname){
				return '@dev.'+extname;
			}).replace(/^src/,'dev');
		},
		
		buildPath: function(filepath){
			var path=syspath.dirname(filepath);
			
			fstools.mkdir(syspath.join(root,path));
		},
		
		toRequest: function(path, require){
			return {
				type: /\.js$/.test(path)?'js':'css',
				path: '/'+path.replace(/\\/g,'/'),
				filepath: path.replace(/\\/g,'/'),
				file: path.replace(/\\/g,'/').replace(/^src\//,''),
				project: '',
				query: $.extend({},(require?{require:require}:{}))
			};
		},
		
		getRequiresPath: function(rqpath,path){
			return syspath.join(rqpath.replace(/^(scripts|styles).+$/,
				function(hole,type){ return type; }),
				'alien_requires',
				path.replace(/\\/g,'/').replace(/^src\/(scripts|styles)/g,'').replace(/\.(js|css)$/,'.rq'),
				rqpath.replace(/^(scripts|styles)/,'').replace(/\.(js|css)$/,function(hole){ return '@dev'+hole; })
			);
		},
		
		one: function(path){
			console.info('');
			console.info('[PACKING]',path);
			
			if(!/\.(js|css)$/.test(path)){
				return console.info('└──','[PACK FAILED]'.red,path,'is not a valid path');
			}
			
			var request=this.toRequest(path);
			
			if(request.type=='js'){
			
				var ret=parser.getAllRequires(path), _this=this;

				if(ret.requires.error.length){
					ret.requires.error.forEach(function(v){
						console.info(v);
					});
					return console.info('└──','[PACK FAILED]'.red);
				}
				
				var code=parser.dev.getJSSource(request);
				var map={};
				
				ret.inlines.forEach(function(v){
					var key=v;
					
					map[key]={
						pattern: new RegExp(key.replace(/\.js$/,'@dev.js').replace(/\./g,'\\.').replace(/\//g,'\\\/'),'g'),
						value: _this.getRequiresPath(v,path).replace(/\\/g,'/'),
						inlines: parser.getInlineRequires(syspath.join('src',v), path)
					};
				});
				
				
				var inlines=parser.getInlineRequires(path,path);
				for( var i=0; i<inlines.length; i++){
					if(map[inlines[i]]){
						code=code.replace(map[inlines[i]].pattern, map[inlines[i]].value);
					}
				}

				var loaded={}, logs=[];
				ret.inlines.forEach(function(v,index){
					if(ret.inlines.indexOf(v)!=index){
						return;
					}
					
					var rq=_this.toRequest('src/'+v,request.file);
					
					var inlines=map[v].inlines;
					//console.info('├','[PACKING REQUIRE]',v);
					
					var code=parser.dev.getJSSource(rq);
					
					if(code===false){
						return logs.push(['[PACKING REQUIRE FAILED]'.red, v]);
					}
					
					code=code.replace(map[v].pattern, map[v].value);
					for( var i=0; i<inlines.length; i++){
						if(map[inlines[i]]){
							code=code.replace(map[inlines[i]].pattern, map[inlines[i]].value);
						}
					}
					
					var devpath=syspath.join('dev',map[v].value);
					_this.buildPath(devpath);
					fs.appendFileSync(devpath,code);
					logs.push(['(require)'.green,devpath]);
				});
				
				var devpath=this.getDevPath(path);
				this.buildPath(devpath);
				fs.appendFileSync(devpath,code);
				
				console.info(logs.length?'└─┬':'└──','[PACK FINISHED]'.green,devpath);
				for( var i=0; i<logs.length; i++){
					console.info.apply(console,[(i+1==logs.length)?'    └──':'    ├──'].concat(logs[i]));
				}
			}else{
				//css
				var code=parser.dev.getCssSource(request);
				
				var devpath=this.getDevPath(path);
				this.buildPath(devpath);
				fs.appendFileSync(devpath,code);
				console.info('└──','[PACK FINISHED]'.green,devpath);
			}
		}
	};
	
	$.extend(exports,{
		run: function(options){
			packer.run(options);
		},
		
		usage: function(optimist){
			optimist.usage('打包.config => exports中的file list至DEV目录');
		},
		
		description: '打包文件至DEV'
	});
	
}).call(this);