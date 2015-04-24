var app = angular.module('ngJigsaw');

app.directive('wordtreeView', 
	function(){
		return ({
			restrict: 'A',
			templateUrl: '/static/directives/wordtree.html'
		});
	});