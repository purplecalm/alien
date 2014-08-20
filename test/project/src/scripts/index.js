require(['./index/a.js',
	'./index/b.js'
],function(){

	(typeof require=='function')&&require([
		'./index/a.js',
		'./index/b.js',
		'./require/index.js'
	],function(){
		var a="";
		console.log('load index');
	});
});
