(function(){
	var fs=require('fs');
	var syspath=require('path');
	var async=require('async');
	var $=require('../$');
	var fstools=require('../fs');
	var cloader=require('../config');
	var parser=require('../parser');
	
	var uglify=require('uglify-js');
	var cleancss=require('clean-css');
	var btcss=new cleancss();
	
	var MD5=require('MD5');
	
	var root=process.cwd();
	
	var min={
		run: function(options){
			if(this.clean()){
				this.start();
			}
		},
		
		clean: function(){
			try{
				if(fs.existsSync(syspath.join(root,'prd'))){
					fstools.rmdir(syspath.join(root,'prd'));
				}
				
				if(fs.existsSync(syspath.join(root,'ver'))){
					fstools.rmdir(syspath.join(root,'ver'));
				}
			
			}catch(e){
				var errorinfo;
				switch(e.code){
					case 'ENOTEMPTY':
						errorinfo='prd|ver目录不为空(请检查prd|ver目录中的文件是否使用中), 删除prd|ver目录失败';
						break;
					case 'EPERM':
						errorinfo='权限不足, 删除prd|ver目录失败';
						break;
					default:
						errorinfo='删除prd|ver目录失败'
				}
				console.info('[ERROR]'.red,errorinfo);
				
				return false;
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
		
		getRequiresPath: function(rqpath,path,ver){
			return syspath.join(rqpath.replace(/^(scripts|styles).+$/,
				function(hole,type){ return type; }),
				'alien_requires',
				path.replace(/\\/g,'/').replace(/^src\/(scripts|styles)/g,'').replace(/\.(js|css)$/,'.rq'),
				rqpath.replace(/^(scripts|styles)/,'').replace(/\.(js|css)$/,function(hole){ return '@'+ver+hole; })
			);
		},
		
		one: function(path){
			console.info('');
			console.info('[MINIFYING]',path);
			
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
					return console.info('└──','[MINIFY FAILED]'.red);
				}
				
				var map={};
				var loaded={}, logs=[];
				var parseInlines=function(v){
					if(loaded[v]){
						return;
					}
					
					loaded[v]=true;
					
					var key=v;
					var inlines=parser.getInlineRequires(syspath.join('src',v), path), vers=[];
					
					inlines.forEach(function(v){
						parseInlines(v);
						if(map[v]){
							vers.push(map[v].ver);
						}
					});
					
					var rq=_this.toRequest('src/'+v,request.file);
					//console.log(inlines);
					//console.log(parser.dev.getJSSource(rq));
					
					var code=parser.dev.getJSSource(rq);
					
					if(code===false){
						return logs.push(['[MINIFY FAILED]'.red,v]);
					}
					code=uglify.minify(code,{fromString: true}).code;
					var ver=MD5(code+vers.join(''));
					
					map[key]={
						pattern: new RegExp(key.replace(/\.js$/,'@dev.js').replace(/\./g,'\\.').replace(/\//g,'\\\/'),'g'),
						value: _this.getRequiresPath(v,path,ver).replace(/\\/g,'/'),
						inlines: inlines,
						code: code,
						ver: ver
					};
				};
				
				ret.inlines.forEach(function(v,index){
					if(ret.inlines.indexOf(v)!=index){
						return;
					}
					
					parseInlines(v);
				});
				
				ret.inlines.forEach(function(v,index){
				
					if(ret.inlines.indexOf(v)!=index||!map[v]){
						return;
					}
					
					var code=map[v].code.replace(map[v].pattern, map[v].value), inlines=map[v].inlines;
					for( var i=0; i<inlines.length; i++){
						if(map[inlines[i]]){
							code=code.replace(map[inlines[i]].pattern, map[inlines[i]].value);
						}
					}
					
					var prdpath=syspath.join('prd',map[v].value);
					_this.buildPath(prdpath);
					fs.appendFileSync(prdpath,code);
					logs.push(['(require)'.green,prdpath]);
				});
				
				
				//trunk
				var code=parser.dev.getJSSource(request);
				var inlines=parser.getInlineRequires(path,path);
				for( var i=0; i<inlines.length; i++){
					if(map[inlines[i]]){
						code=code.replace(map[inlines[i]].pattern, map[inlines[i]].value);
					}
				}
				
				code=uglify.minify(code,{fromString: true}).code;
				
				var ver=MD5(code);
				var minpath=this.getPath(path,ver), verpath=this.getVerPath(path,ver);
				this.buildPath(minpath);
				this.buildPath(verpath);
				fs.appendFileSync(minpath,code);
				fs.appendFileSync(verpath,ver);
				console.info(logs.length?'└─┬':'└──','[MINIFY FINISHED]'.green,'=>'.grey,minpath);
				
				for( var i=0; i<logs.length; i++){
					console.info.apply(console,[(i+1==logs.length)?'    └──':'    ├──'].concat(logs[i]));
				}
				
			}else{
				//css
				var code=parser.dev.getCssSource(request);
				code=btcss.minify(code);
				var ver=MD5(code);
				
				var minpath=this.getPath(path,ver), verpath=this.getVerPath(path,ver);
				this.buildPath(minpath);
				this.buildPath(verpath);
				fs.appendFileSync(minpath,code);
				fs.appendFileSync(verpath,ver);
				console.info('└──','[MINIFY FINISHED]'.green,minpath);
			}
		},
		
		getVerPath: function(path,ver){
			return path.replace(/\.(js|css)$/,function(hole,extname){
				return '.'+extname+'.ver';
			}).replace(/^src/,'ver');
		},
		
		getPath: function(path,ver){
			return path.replace(/\.(js|css)$/,function(hole,extname){
				return '@'+ver+'.'+extname;
			}).replace(/^src/,'prd');
		}
	};
	
	$.extend(exports,{
		run: function(options){
			min.run(options);
		},
		
		usage: function(optimist){
			optimist.usage('压缩.config => exports中的file list至PRD目录, 并产生响应的ver目录来保存各个文件的version');
		},
		
		description: '压缩文件'
	});
	
}).call(this);