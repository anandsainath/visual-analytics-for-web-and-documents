var app = angular.module('ngJigsaw');

app.factory('WordTreeFactory',
	function($rootScope, WordTreeAPIService){

		var service = {};
		var data = [];

		service.fetchResults = function(rootWord){
			WordTreeAPIService.fetchAllContent(rootWord).then(function(_data){
				data = _data;
				$rootScope.$broadcast('WordTreeLoaded')
			});
		}

		service.getData = function(){
			return data;
		}

		return service;
	});