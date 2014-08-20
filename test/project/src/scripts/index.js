require(['./index/a.js',
	'./index/b.js'
],function(){

	require([
		'./index/a.js',
		'./index/b.js',
		'./require/index.js'
	],function(){
		var a="foo bar";
		console.log(a);
	});
});
