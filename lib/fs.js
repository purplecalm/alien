(function(){
	var fs=require('fs');
	var syspath=require('path');
	
	module.exports={
		dir: function(path){
			return fs.readdirSync(path||'./');
		},
		
		rmdir: function(path){
			var files = [], self=this, me=arguments.callee;
			if(fs.existsSync(path)){
				files = fs.readdirSync(path);
				files.forEach(function(file,index){
					var curPath = path + syspath.sep + file;
					if(fs.statSync(curPath).isDirectory()){ // recurse
						me.call(self,curPath);
					}else{ // delete file
						fs.unlinkSync(curPath);
					}
				});
				fs.rmdirSync(path);
			}
			return !fs.existsSync(path);
		},
		mkdir: function(_p){
			if(fs.existsSync(_p)){
				return;
			}
			
			if(!_p){
				return false;
			}
			
			var path=syspath.join(_p).split(syspath.sep);
			
			for( var i=0; i<path.length; i++){
				var _path=path.slice(0,i+1).join(syspath.sep)+syspath.sep;
				if(!fs.existsSync(_path)){
					fs.mkdirSync(_path);
				}
			}
			
			return fs.existsSync(_p);
		}
	};
}).call(this);