(function(){
	
	var $=require('../$');
	var validator=require('./validator');
	var header=require('./header');
	var server=require('./server');
	var logger=require('./logger');
	
	
	exports.validator=function(options){
		return function(){
			validator.handler.apply(validator,Array.prototype.slice.call(arguments).concat([options]));
		};
	};
	
	exports.header=function(options){
		return function(){
			header.handler.apply(header,Array.prototype.slice.call(arguments).concat([options]));
		};
	};
	
	exports.server=function(options){
		server.init(options);
		return function(){
			server.handler.apply(server,Array.prototype.slice.call(arguments));
		};
	};
	
	exports.logger=function(options){
		return function(){
			logger.handler.apply(logger,Array.prototype.slice.call(arguments).concat([options]));
		};
	};
	
}).call(this);