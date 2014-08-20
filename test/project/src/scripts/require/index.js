require(['./synca.js','./syncb.js'],function(){

	console.log('require finish');

	require(['./rqa.js'],function(){
		console.log('load rqa');
	});
	
	
	require(['./rqb.js'],function(){
		console.log('load rqb');
	});
});