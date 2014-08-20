(function(){
	
	var $=require('../$');
	var validator=require('./validator');
	var header=require('./header');
	var src=require('./src');
	var dev=require('./dev');
	var prd=require('./prd');
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
	
	exports.src=function(options){
		return function(){
			src.handler.apply(src,Array.prototype.slice.call(arguments).concat([options]));
		};
	};
	
	exports.dev=function(options){
		return function(){
			dev.handler.apply(dev,Array.prototype.slice.call(arguments).concat([options]));
		};
	};
	
	exports.prd=function(options){
		return function(){
			prd.handler.apply(prd,Array.prototype.slice.call(arguments).concat([options]));
		};
	};
	
	exports.logger=function(options){
		return function(){
			logger.handler.apply(logger,Array.prototype.slice.call(arguments).concat([options]));
		};
	};
	
}).call(this);