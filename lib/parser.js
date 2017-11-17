(function(){
	
	var $=require('./$');
	var fs=require('fs');
	var syspath=require('path');
	var urlParser=require('url');
	var hogan=require('hogan.js');
	var vm=require('vm');
	
	var uglify=require('uglify-js');
	var cleancss=require('clean-css');
	var btcss=new cleancss();
	
	var MD5=require('MD5');
	
	var root=process.cwd();

	var patterns={
		prd: /^\/([a-zA-Z0-9_-]+)\/prd\/(.+)@(dev|[a-z0-9]{5,60})\.(js|css)$/,
		src: /^\/([a-zA-Z0-9_-]+)\/src\/(.+)\.(js|css|mustache)$/,
		mustache: /.+\.mustache$/,
		relative: /^\/src\/(.+)\.(js|css|mustache)$/,
		external: /^(http|https)?\:\/\/.+$/,
		inline: /^([.a-zA-Z0-9_-]*|\/)+\.(js|css|mustache)$/,
		pack: /^[\s|^.]*require[\s|^.]*\([\s|^.]*\[([\s|^.]*('|")[\s]*([.a-zA-Z0-9-_]|\/)+\.(js|mustache)[\s]*('|")[\s|^.]*(,)?[\s|^.]*)*[\s|^.]*\](.*|[\s|^.]*)*\)[\s|^.]*(;)?[\s|^.]*/,
		devpack: /^[\s|^.]*require[\s|^.]*\([\s|^.]*\[([\s|^.]*('|")[\s]*([.a-zA-Z0-9-_:=@?%]|\/)+\.js[\s]*('|")[\s|^.]*(,)?[\s|^.]*)*[\s|^.]*\](.*|[\s|^.]*)*\)[\s|^.]*(;)?[\s|^.]*/,
		require: /([\s|^.]*)require[\s|^.]*\([\s|^.]*\[([\s|^.]*('|")[\s]*([.a-zA-Z0-9-_:=@?%]|\/)+\.js[\s]*('|")[\s|^.]*(,)?[\s|^.]*)*[\s|^.]*\]/g,
		csspack: /require\(('|")(([.a-zA-Z0-9_-]|\/)+?\.css)('|")\)(;)?/g
	};
	
	var parsers=function(compiler){
		var src=function(options){
			this.config=$.extend({
			},options);
		};
		
		$.extend(src.prototype,{
			parse: function(req){
				var request=this.parseRequest(req);

				if(request.mode=='pack'){
				
					var requires={error:[],files:[]};

					if(request.type=='js'){
						requires=compiler.getJSRequires(request.filepath,true);
					}else if(request.type=='css'){
						requires=compiler.getCssRequires(request.filepath);
					}else if(request.type=='mustache'){
						return 'document.write(\'<script type="text/javascript" src="'+request.protocol+'://'+request.headers.host+'/'+request.project+'/src/'+request.file+'?parent='+encodeURIComponent(request.file)+'"></script>\');';
					}
					
					if(requires.error){
						requires.error.forEach(function(v){
							console.info(v);
						});
					}
					
					requires.files.forEach(function(v, index){
						console.info(index+1==requires.files.length?'└──':'├──','(include)'.cyan,v.grey);
					});
					
					
					var ret=[];
					if(request.type=='js'){
						requires.files.forEach(function(v){
							ret.push('document.write(\'<script type="text/javascript" src="'+request.protocol+'://'+request.headers.host+'/'+request.project+'/src/'+v+'?parent='+encodeURIComponent(request.file)+'" defer="defer"></script>\');');
						});
					}else if(request.type=='css'){
						requires.files.forEach(function(v){
							ret.push('@import "'+request.protocol+'://'+request.headers.host+'/'+request.project+'/src/'+v+'?parent='+encodeURIComponent(request.file)+'";');
						});
					}
					
					return ret.join('\n');
					
				}else if(request.mode=='require'||request.mode=='source'){
					var code='';
					if(request.type=='js'){
						code=this.getJSSource(request);
					}else if(request.type=='css'){
						code=this.getCssSource(request);
					}else if(request.type=='mustache'){
						code=this.getTplSource(request);
					}
					return code;
				}else{
					//throw new Error('sth. wrong');
				}
				
				
				return JSON.stringify(request);
			},
			
			getJSSource: function(req){
				var file=compiler.readFile(req.filepath), dir=syspath.dirname(req.file), code=file, parent=req.query.parent||req.query.require;
				
				var requires=compiler.getJSRequires(syspath.join(req.project,'src',parent));

				if(patterns.pack.test(compiler.removeJSComments(file))){
					try{
						var script=vm.createScript(code);
						
						if(req.mode=='require'){
							script.runInNewContext({require: function(list,func){
								if(typeof func=='undefined'){
									code='require('+JSON.stringify(list)+');';
								}else{
									code='require('+JSON.stringify(list)+','+func.toString().replace(/^function[\s]*\(/,'function(')+','+JSON.stringify(req.protocol+'://'+req.headers.host+req.url)+');';
								}
							}});
						}else{
							script.runInNewContext({require: function(list,func){
								if(typeof func=='undefined'){
									code='';
								}else{
									code='('+func.toString().replace(/^function[\s]*\(/,'function(')+')(this);';
								}
							}});
						}
					}catch(e){
						return code;
					}
				}
				
				code=(code||'').replace(patterns.require,function(hole,pre){
					var ret=pre;
					
					var script=vm.createScript(hole+')');
					
					script.runInNewContext({require: function(list){
						var children=[];
						list.forEach(function(v){
							if(patterns.external.test(v)||!patterns.inline.test(v)){
								return children.push(v);
							}
							
							var path=syspath.join(dir,v).replace(/\\/g,'/');
							
							if(requires.files.indexOf(path)==-1){
								children.push(req.protocol+'://'+req.headers.host+'/'+req.project+'/src/'+path+'?require='+encodeURIComponent(parent));
							}
						});
						
						ret+='require('+JSON.stringify(children);
						
					}});
					
					return ret;
				});
				
				return code;
			},
			
			getCssSource: function(req){
				var code=compiler.readFile(req.filepath);
				return (code||'').replace(patterns.csspack,'');
			},
			
			getTplSource: function(req){
				var text=compiler.readFile(req.filepath);
			
				var name=req.file.match(/([a-zA-Z0-9_-]+)\.mustache$/)[1];
				
				return compiler.parseTemplate(text,name);
			},
			
			parseRequest: function(req){
				var request=compiler.formatRequest(req);
				
				if(patterns.prd.test(request.path)){
					request.filepath=request.path.replace(patterns.prd,function(hole/* all url */,project/* project name */,path/* file path without extend */,ver/* version */,type/* js|css */){
						request.mode='pack';
						request.file=path+'.'+type;
						request.project=project;
						return syspath.join(project,'src',path+'.'+type);
					});
				}else if(patterns.src.test(request.path)){
					request.filepath=request.path.replace(patterns.src,function(hole/* all url */,project/* project name */,path/* file path without extend */,type/* js|css */){
						request.file=path+'.'+type;
						request.project=project;
						return syspath.join(project,'src',path+'.'+type);
					});
					
					if(request.query.parent||request.query.require){
						request.mode=request.query.require?'require':'source';
					}
				}
				
				return request;
			}
		});
		
		var dev=function(options){
			this.config=$.extend({
			},options);
		};
		
		$.extend(dev.prototype,{
			parse: function(req){
				var request=this.parseRequest(req), code='';
				
				if(request.type=='js'){
					code=this.getJSSource(request);
					console.info('└──','[PACK FINISHED]'.green);
				}else if(request.type=='css'){
					code=this.getCssSource(request);
					console.info('└──','[PACK FINISHED]'.green);
				}else{
					console.info('└──','[UNKNOWN URL]'.red);
				}
				return code;
			},
			
			parseRequest: function(req){
				var request=compiler.formatRequest(req);
				
				if(patterns.prd.test(request.path)){
					request.filepath=request.path.replace(patterns.prd,function(hole/* all url */,project/* project name */,path/* file path without extend */,ver/* version */,type/* js|css */){
						request.file=path+'.'+type;
						request.project=project;
						return syspath.join(project,'src',path+'.'+type);
					});
				}
				
				return request;
			},
			
			getJSSource: function(request){
			
				var requires=compiler.getJSRequires(request.query.require?syspath.join(request.project,'src',request.query.require):request.filepath);
				
				if(requires.error){
					requires.error.forEach(function(v){
						console.info(v);
					});
				}
	
				var codes=[];
				if(!request.query.require){
					requires.files.forEach(function(v){
						console.info('├──','(include)'.cyan,v.grey);
												
						codes.push('/* File '+v+' */');
						
						var path=syspath.join(request.project,'src',v);
						var dir=syspath.dirname(v);
						
						var code=compiler.readFile(path);
						
						if(patterns.mustache.test(v)){
							var name=v.match(/([a-zA-Z0-9_-]+)\.mustache$/)[1];
							code=compiler.parseTemplate(code,name);
						}else{
							if(patterns.pack.test(compiler.removeJSComments(code))){
								try{
									var script=vm.createScript(code);
									
									script.runInNewContext({require: function(list,func){
											if(typeof func=='function'){
												code='('+func.toString().replace(/^function[\s]*\(/,'function(')+')(this);';
											}else{
												code='';
											}
									}});
								}catch(e){
								}
							}
							
							code=(code||'').replace(patterns.require,function(hole,pre){
								var ret=pre;
								
								var script=vm.createScript(hole+')');
								
								script.runInNewContext({require: function(list){
									var children=[];
									list.forEach(function(v){
									
										if(patterns.external.test(v)||!patterns.inline.test(v)){
											return children.push(v);
										}
									
										var rqpath=syspath.join(dir,v).replace(/\\/g,'/');
										
										if(requires.files.indexOf(rqpath)==-1){
											if(request.project){
												children.push(request.protocol+'://'+request.headers.host+'/'+request.project+'/prd/'+rqpath.replace(/\.(js|css)$/,function(ext){ return '@dev'+ext; })+'?require='+encodeURIComponent(request.file));
											}else{
												children.push(rqpath.replace(/\.(js|css)$/,function(ext){ return '@dev'+ext; }));
											}
										}
									});
									
									ret+='require('+JSON.stringify(children);
									
								}});
								
								return ret;
							});
						}
						
						codes.push(code+'\n');
					});
				}else{
					if(request.project){
						console.info('├──','(require)'.cyan,request.file.grey);
					}
					
					var code=compiler.readFile(request.filepath);
					var dir=syspath.dirname(request.file);
					
					if(code===false){
						console.info('├──','[ERROR]'.red,request.file+' not exits');
						return false;
					}
					
					code=(code||'').replace(patterns.require,function(hole,pre){
						var ret=pre;
						var script=vm.createScript(hole+')');
						var children=[];
						
						script.runInNewContext({require: function(list){
							(list||[]).forEach(function(v){
							
								if(patterns.external.test(v)||!patterns.inline.test(v)){
									return children.push(v);
								}
							
								var rqpath=syspath.join(dir,v).replace(/\\/g,'/');
								
								if(requires.files.indexOf(rqpath)==-1){

									if(request.project){
										children.push(request.protocol+'://'+request.headers.host+'/'+request.project+'/prd/'+rqpath.replace(/\.(js|css)$/,function(ext){ return '@dev'+ext; })+'?require='+encodeURIComponent(request.query.require));
									}else{
										children.push(rqpath.replace(/\.(js|css)$/,function(ext){ return '@dev'+ext; }));
									}
								}
							});
						}});
						
						ret+='require('+JSON.stringify(children);
						
						return ret;
					});
					
					if(patterns.devpack.test(compiler.removeJSComments(code))){
						var script=vm.createScript(code);
						script.runInNewContext({require: function(list,func){
							if(request.project){
								code='require('+JSON.stringify(list)+','+func.toString().replace(/^function[\s]*\(/,'function(')+','+JSON.stringify(request.protocol+'://'+request.headers.host+request.url)+');';
							}else{
								code='require('+JSON.stringify(list)+','+func.toString().replace(/^function[\s]*\(/,'function(')+','+JSON.stringify(request.file.replace(/\.(js|css)$/,function(ext){ return '@dev'+ext; }))+');';
							}
						}});
					}
					
					codes.push(code);
				}
				
				return codes.join('\n');
			},
			
			getCssSource: function(request){
				var requires=compiler.getCssRequires(request.filepath), ret=[];
					
				if(requires.error){
					requires.error.forEach(function(v){
						console.info(v);
					});
				}
				
				requires.files.forEach(function(v){
					console.info('├──','(include)'.cyan,v.grey);
					
					ret.push('/* File '+v+' */');
					
					ret.push((compiler.readFile(syspath.join(request.project,'src',v))||'').replace(patterns.csspack,'').replace(/^[\s]*/,'').replace(/[\s]*$/,'')+'\n');
				});
				
				return ret.join('\n');
			}
		});
		
		var prd=function(){
		};
		
		$.extend(prd.prototype,{
			parse: function(req){
				var request=pack.dev.parseRequest(req), code='';
				
				if(request.type=='js'){
					code=uglify.minify(pack.dev.getJSSource(request),{fromString: true}).code;
					console.info('└──','[MINIFY FINISHED]'.green);
				}else if(request.type=='css'){
					var ret=btcss.minify(pack.dev.getCssSource(request));
					code=ret.styles;
					console.info('└──','[MINIFY FINISHED]'.green);
					
					if(ret.errors.length){
						console.info('   ','[ERROR]'.red,ret.errors);
					}
				}else{
					console.info('└──','[UNKNOWN URL]'.red);
				}
				return code;
			},
			
			parseRequest: function(req){
				return pack.dev.parseRequest(req);
			}
		});
		
		var pack={
			src: new src(),
			dev: new dev(),
			prd: new prd()
		};
		
		return $.extend({
			parseRequest: function(req,mode){
				return pack[mode.toLowerCase()].parseRequest(req);
			},
			
			isPrd: function(path){
				return patterns.prd.test(path);
			},
			
			isSrc: function(path){
				return patterns.src.test(path);
			},
			
			getAllRequires: function(path){
				return {
					requires: compiler.getJSRequires(path),
					inlines: compiler.getJSInlineRequires(path)
				}
			},
			
			getInlineRequires: function(path, parent){
				return compiler.getOneJSinlineRequires(path, parent);
			}
		},pack);
		
	}({
		formatRequest: function(ret){
			if(/.+\.js$/.test(ret.path)){
				ret.type='js';
			}else if(/.+\.css$/.test(ret.path)){
				ret.type='css';
			}else if(/.+\.mustache$/.test(ret.path)){
				ret.type='mustache';
			}
			
			return ret;
		},
		
		removeJSComments: function(code){
			return (code||'').replace(/(?:^|\n|\r)\s*\/\*[\s\S]*?\*\/\s*(?:\r|\n|$)/g,'\n').replace(/(?:^|\n|\r)\s*\/\/.*(?:\r|\n|$)/g,'\n');
		},
		
		removeCssComment: function(code){
			return (code||'').replace(/(?:^|\n|\r)\s*\/\*[\s\S]*?\*\/\s*(?:\r|\n|$)/g,'\n');
		},

		getRelativePath: function(p){
		
			path='/'+p.replace(/\\/g,'/');
			if(patterns.src.test(path)){
				return path.replace(patterns.src,function(hole/* all url */,project,path/* file path without extend */,type/* js|css */){
					return path+'.'+type;
				});
			}else if(patterns.relative.test(path)){
				return path.replace(patterns.relative,function(hole/* all url */,path/* file path without extend */,type/* js|css */){
					return path+'.'+type;
				});
			}
			return p.replace(/\\/g,'/');
		},
		
		getProject: function(path){
			return ('/'+path.replace(/\\/g,'/')).replace(patterns.src,function(hole/* all url */,project/* project name */,path/* file path without extend */,type/* js|css */){
				return project;
			});
		},
		
		requiresCache: {},
		
		getJSRequires: function(p,clean){
			if(clean===true){
				this.requiresCache={};
			}
			
			if(this.requiresCache[this.getRelativePath(p)]){
				return this.requiresCache[this.getRelativePath(p)];
			}
			
			var cache={};
			
			var ret=$.proxy(function(holepath){
			
				if(cache[this.getRelativePath(holepath)]){
					return {
						error: [],
						files: []
					};
				}
				var file=this.readFile(holepath), dir=syspath.dirname(holepath);
				
				var hole=this.removeJSComments(file||''), _self=$.proxy(arguments.callee,this), _this=this, error=(file===false?[['├──','[WARN]'.yellow,holepath,'not exist'.yellow].join(' ')]:[]);
				
				cache[this.getRelativePath(holepath)]=true;
				
				var files=[];
				//pack mode
				if(patterns.pack.test(hole)){
					var children=[];
					try{
						var script=vm.createScript(hole);
						script.runInNewContext({require: function(list,func){
							children=list;
						}});
					}catch(e){
					}
					
					(children||[]).forEach(function(v){
					
						var path=syspath.join(dir,v);
						
						if(cache[_this.getRelativePath(path)]){
							return;
						}
						
						var r=_self(path);
						
						error=error.concat(r.error||[]);
						files=files.concat(r.files||[]);
					});
				}
				
				files.push(this.getRelativePath(holepath));
				
				var data= {
					error: error,
					files: files
				};
				
				this.requiresCache[this.getRelativePath(holepath)]=data;
				
				return data;
			},this);
			
			return ret(p);
		},
		
		getOneJSinlineRequires: function(p, parent){
		
			var parents=[];
			
			if(parent){
				parents=this.getJSRequires(parent).files||[];
			}
			
			var relativePath=this.getRelativePath(p), _this=this;
			var path=syspath.join('src',relativePath);
			
			var code=this.readFile(path), dir=syspath.dirname(relativePath), ret=[];
			(code||'').replace(patterns.require,function(hole,pre){
				var script=vm.createScript(hole+')');
				script.runInNewContext({require: function(list){
					var children=[];
					list.forEach(function(v){
						if(patterns.external.test(v)||!patterns.inline.test(v)){
							return;
						}
						
						var path=syspath.join(dir,v).replace(/\\/g,'/');
						
						if(parents.indexOf(path)==-1&&ret.indexOf(path)==-1){
							ret.push(path);
						}
					});
					
				}});
			});
			
			if(parent==p){
				for( var i=0; i<parents.length; i++){
					if(parents[i]!=relativePath){
						ret=ret.concat(arguments.callee.call(this,syspath.join('src',parents[i]),parent));
					}
				}
			}
			
			return ret;
		},
		
		getJSInlineRequires: function(p){
		
			var relativePath=this.getRelativePath(p), _this=this;
			
			var analysised={}, inlineRequires=[], parents=this.getJSRequires(p).files;
			
			var getRequires=function(relative){
			
				var path=syspath.join('src',relative);
				
				if(analysised[path]){
					return;
				}
				analysised[path]=true;
				
				var requires=_this.getJSRequires(path);
				
				requires.files.forEach(function(v){
				
					if(analysised[v]){
						return;
					}
					
					analysised[v]=true;
				
					var filepath=syspath.join('src',v), dir=syspath.dirname(v);
					var code=_this.readFile(filepath), analysis=arguments.callee;
					
					if(!code){
						return;
					}
				
					/*
					if(patterns.pack.test(_this.removeJSComments(code))){
						var script=vm.createScript(code);
						
						script.runInNewContext({require: function(list,func){
							code=func.toString();
						}});
					}*/
					
					code=(code||'').replace(patterns.require,function(hole,pre){
						var script=vm.createScript(hole+')');
						script.runInNewContext({require: function(list){
							var children=[];
							list.forEach(function(v){
								if(patterns.external.test(v)||!patterns.inline.test(v)){
									return;
								}
								
								var path=syspath.join(dir,v).replace(/\\/g,'/');
								
								if(parents.indexOf(path)==-1){
									inlineRequires.push(path);
									
									getRequires(path);
								}
							});
							
						}});
					});
				});
			};
			
			getRequires(relativePath);
			
			return inlineRequires;
		},
		
		getCssRequires: function(p){
			var cache={};
			
			var ret=$.proxy(function(holepath){

				if(cache[this.getRelativePath(holepath)]){
					return {
						error: [],
						files: []
					};
				}
				
				var file=this.readFile(holepath), dir=syspath.dirname(holepath);
				var hole=this.removeJSComments(file||''), _self=$.proxy(arguments.callee,this), _this=this, error=(file===false?[['#'.grey,'[WARN]'.yellow,holepath,'not exist'.yellow].join(' ')]:[]);
				
				cache[this.getRelativePath(holepath)]=true;
				
				var files=[];
			
				hole.replace(patterns.csspack,function(hole,__i,inc){
					var _path=syspath.join(dir,inc);
					if(cache[_this.getRelativePath(_path)]){
						return;
					}
					
					var r=_self(_path);

					files=files.concat(r.files);
					error=error.concat(r.error);
					return '';
				});
				
				files.push(this.getRelativePath(holepath));
				
				return {
					files: files,
					error: error
				};
			
			},this);
			
			return ret(p);
		},
		
		parseTemplate: function(text, name){
			var code='if(typeof window.TPL === "undefined"){ window.TPL={}; }\n';
			code+= 'window.TPL.' + name + ' = new window.Hogan.Template(' + hogan.compile(text, { asString: 1}) + ');';
			return code;
		},
		
		readFile: function(path){
			path=syspath.join(root,path);
			var file=false;
			if(fs.existsSync(path)){
				file=fs.readFileSync(path).toString();
			}
			return file;
		}
	});
	
	$.extend(exports,parsers);
	
}).call(this);