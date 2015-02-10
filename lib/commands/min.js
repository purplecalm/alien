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
			var config=cloader.getConfig();
			if(this.clean(config)){
				this.start(config);
			}
		},
		
		clean: function(config){
			try{
				if(fs.existsSync(syspath.join(root,'prd'))){
					fstools.rmdir(syspath.join(root,'prd'));
				}
				
				if(fs.existsSync(syspath.join(root,'ver'))){
					fstools.rmdir(syspath.join(root,'ver'));
				}
				
				if(fs.existsSync(syspath.join(root,'html'))){
					fstools.rmdir(syspath.join(root,'html'));
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
		
		start: function(config){
			var self=this;
			
			if(!config){
				return;
			}
			
			var tasks=[], map={};
			(config.exports||[]).forEach(function(v){
				tasks.push(function(){
					var ver=self.one(syspath.join('src',v));
					if(ver){
						map[v]=v.replace(/\.(js|css)$/,function(hole,ext){
							return '@'+ver+'.'+ext
						});
					}
				});
			});
			
			async.parallel(tasks,function(err,values){
				//console.log(values);
			});
			
			if(config.html instanceof Array){
				var htmltasks=[];
				(config.html||[]).forEach(function(v){
					if(!v.name){
						return;
					}
					
					htmltasks.push(function(){
						self.buildHtml(v,map,config);
					});
				});
			
				async.parallel(htmltasks,function(err,values){
					//console.log(values);
				});
			}
		},
		
		buildHtml: function(data,map,config){
		
			var domain=data.domain?'http://'+data.domain:'';
			console.info('');
			console.info('[BUILDING]',data.name);
			
			var css=false;
			if(data.css&&map[data.css]){
				css=map[data.css];
				console.info('├──','(include)'.cyan,data.css.grey);
			}
			
			var js=false;
			if(data.js&&map[data.js]){
				js=map[data.js];
				console.info('├──','(include)'.cyan,data.js.grey);
			}
			
			var code=[
				'<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n',
				'<html xmlns="http://www.w3.org/1999/xhtml">\n',
				'<head>\n<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />\n',
				'<title>'+(data.title||'Demo')+'</title>\n',
				css?'<link href="'+domain+'/'+config.job+'/prd/'+css+'" type="text/css" rel="stylesheet" />\n':'',
				'</head>\n<body>\n',
				'<div style="position: absolute; background-color: #c00; color: #fff; font-size: 12px; right: 0; top: 0; height: 24px; line-height: 24px; padding: 0 10px; font-family: \'Microsoft Yahei\'">系统内容加载中...</div>\n',
				js?'<script type="text/javascript" src="'+domain+'/'+config.job+'/prd/'+js+'"></script>\n':'',
				'</body></html>'];
				
			
			var path=syspath.join('html',data.name);
			this.buildPath(path);
			fs.appendFileSync(path,code.join(''));
			
			console.info('└──','[BUILD FINISHED]'.green,path);
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
				
				return ver;
				
			}else{
				//css
				var code=parser.dev.getCssSource(request);
				code=btcss.minify(code).styles||'';
				var ver=MD5(code);
				
				var minpath=this.getPath(path,ver), verpath=this.getVerPath(path,ver);
				this.buildPath(minpath);
				this.buildPath(verpath);
				fs.appendFileSync(minpath,code);
				fs.appendFileSync(verpath,ver);
				console.info('└──','[MINIFY FINISHED]'.green,minpath);
				
				return ver;
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