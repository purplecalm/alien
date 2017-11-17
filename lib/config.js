(function(){
	var fs=require('fs');
	var $=require('./$');
	var syspath=require('path');
	
	var file=fs.readFileSync(syspath.join(__dirname, "../package.json"));
	
	$.extend(exports,JSON.parse(file.toString()));
	
	exports.getConfig=function(root){
		var path;
		if(root){
			path=syspath.join(root,'.config');
		}else{
			path=syspath.join(process.cwd(),'.config');
		}
		
		if(fs.existsSync(path)){
			try{
				return JSON.parse(fs.readFileSync(path).toString());
			}catch(e){
				console.info('[ERROR]'.red,path+' 格式有误');
				return false;
			}
		}else{
			console.info('[ERROR]'.red,path+' 不存在');
			return false;
		}
	};
}).call(this);