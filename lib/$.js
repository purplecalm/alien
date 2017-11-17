(function(){
	var colors=require('colors');

	var $={
		extend: function(obj,props){
			for( var method in props){
				obj[method]=props[method];
			}
			return obj;
		},
		
		each: function(list,callback){
			Array.prototype.forEach.call(list,callback);
		},
		
		proxy: function(func,caller){
			return function(){
				return func.apply(caller,Array.prototype.slice.call(arguments));
			};
		}
	};
	
	$.extend(exports,$);
}).call(this);