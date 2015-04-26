var app = angular.module('ngJigsawDocApp');

app.directive('importDialog', 
	function(){
		return ({
			restrict: 'A',
			templateUrl: '/static/directives/import-dialog.html'
		});
	});