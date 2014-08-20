(function(exports){
	
	var config={
		protocol: 'http',
		host: 'localhost',
		project: 'project'
	};
	
	/**
	 *
	 *	worker
	 *
	 *
	 *
	 **/
	var Worker=function(args){
		this.config=args||{};
		
		this.jobs=[];
		this.diseases=[];
		this.working=false;
		this.finished=false;
		
		this.events={};
	};
	
	Worker.prototype.job=function(func){
	
		if(this.finished){
			console.log('all jobs of this worker were done');
			return;
		}
		
		var _this=this;
		
		var job=function(callback,timeout){
			try{
				func(callback);
			}catch(e){
				console.log(e);
			}
			
			if(_this.config.timeout){
				setTimeout(timeout,_this.config.timeout*1000);
			}
		};
		
		this.jobs.push(job);
		
		if(this.working){
			this.run(job);
		}
	
	};
	
	Worker.prototype.finish=function(job, health){
		for( var i=0; i<this.jobs.length; i++){
			if(this.jobs[i]==job){
				this.jobs.splice(i,1);
				break;
			}
		}
		
		if(!health){
			this.diseases.push(job);
		}
		
		this.check();
	};
	
	Worker.prototype.run=function(job){
	
		var _this=this;
		
		var health=true, finished=false;
		var callback=function(){
			if(finished||!health){
				return;
			}
			
			finished=true;
			
			_this.finish(job,health);
		};
		
		var timeout=function(){
			if(finished){
				return;
			}
			
			health=false;
			finished=true;
			
			_this.finish(job,health);
		};
		
		job(callback,timeout);
	};
	
	Worker.prototype.check=function(){
		if(!this.jobs.length){
			this.done();
		}
	};
	
	Worker.prototype.done=function(){
	
		this.finished=true;
	
		if(this.diseases.length&&typeof this.events['timeout']=='function'){
			this.events['timeout']();
			return;
		}
		
		if(typeof this.events['done']=='function'){
			this.events['done']();
		}
	};
	
	Worker.prototype.on=function(eve,callback){
		this.events[eve]=callback;
	};
	
	Worker.prototype.work=function(){
		for( var i=0; i<this.jobs.length; i++){
			this.run(this.jobs[i]);
		}
		
		this.working=true;
		
		this.check();
	};
	/****************************WORKER COMPLETE**********************************/
	
	var workers=[];
	
	var findScript=function(parent){
	
		var pattern=getPattern(parent,'g');
		
		var scripts=document.getElementsByTagName('script');
		for( var i=0; i<scripts.length; i++){
			if(scripts[i].src==parent||pattern.test(scripts[i].src)){
				return scripts[i];
			}
		}
		return false;
	};
	
	var getURL=function(url){
		if(/^(scripts|styles)\/.+\.(js|css)$/.test(url)){
			return config.protocol+'://'+config.host+'/'+config.project+'/prd/'+url;
		}
		return url;
	};
	
	var getPattern=function(url){
		return new RegExp('^'+config.protocol+':\\\/\\\/'+config.host.replace(/\./g,'\\.')+'\\\/'+config.project
			+'\\\/prd\\\/'+url.replace('@dev','@(dev|[0-9a-zA-Z]{32})').replace(/\//g,'\\\/').replace(/\./g,'\\.')+'([\\?]_=[\\d]{13})?$');
	}
	
	var scripts={};
	
	var newJob=function(_url,id){
		var url=getURL(_url);
		
		if(scripts[url]&&scripts[url].status=='loaded'){
			return false;
		}
	
		return function(callback){
			if(!scripts[url]){
				scripts[url]={
					status: 'loading',
					jobs: []
				};
				
				var cb=false;
				var script=document.createElement('script');
				script.setAttribute('data-require-id',id);
				script.setAttribute('type','text/javascript');
				script.src=url+(url.indexOf('?')==-1?'?':'&')+'_='+(new Date()).valueOf();
				(document.head||document.getElementsByTagName('head')[0]||document.body||document.getElementsByTagName('body')[0]).appendChild(script);
				
				var finished=function(){
					scripts[url].status='loaded';
					for( var i=0; i<scripts[url].jobs.length; i++){
						try{
							scripts[url].jobs[i]&&scripts[url].jobs[i]();
						}catch(e){
							console.log(e);
						}
					}
				};
				
				if(script.addEventListener){
					script.addEventListener('load',finished);
				}else if(script.attachEvent){
					script.attachEvent("onreadystatechange",function(){
						if(script.readyState=="loaded"){
							finished();
						}
					}); 
				}
			}
			
			scripts[url].jobs.push(callback);
		};
	};
	
	var require=function(list,callback,parent){
		var worker=new Worker(), parentCallback=false;
		var id=workers.push(worker)-1;
		
		for( var i=0; i<list.length; i++){
			var job=newJob(list[i],id);
			job&&worker.job(job);
		}
		
		if(parent&&findScript(parent)){
			var pid=findScript(parent).getAttribute('data-require-id');
			
			if(pid&&!isNaN(pid=parseInt(pid,10))&&pid>-1&&pid<workers.length){
				var parentWorker=workers[pid];
				parentWorker.job(function(callback){
					parentCallback=callback;
				});
			}
		}
		
		worker.on('done',function(){
			callback();
			
			if(parentCallback){
				parentCallback();
			}
		});
		
		worker.work();
	};

	exports.require=require;
})(this);