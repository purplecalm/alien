(function(){
	console.log('log abc');
	
	
	require(['./log-delay.js'],function(){
		console.log('delay');
	});
})();