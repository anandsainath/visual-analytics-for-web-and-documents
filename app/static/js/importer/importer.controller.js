var app = angular.module('ngJigsawDocApp');

app.controller("ImportController",
	function($scope, $window, $timeout, ImportFactory){
		$scope.totalDocuments = 0;
		$scope.documents = 0;
		$scope.percentage = 0;

		var ajax_data = undefined;

		ImportFactory.init();

		$scope.$on('TotalDocumentCount', function(){
			$scope.totalDocuments = ImportFactory.getTotalDocumentCount();
			// getCurrentDocumentCount();
		});

		$scope.$on('CurrentCount', function(){
			$scope.documents = ImportFactory.getCurrentDocumentCount();
			$scope.percentage = ($scope.documents/$scope.totalDocuments) * 100;
		});

		function getCurrentDocumentCount(){
			console.log("getCurrentDocumentCount called");
			ImportFactory.fetchCurrentDocumentCount();

			if($scope.documents < $scope.totalDocuments){
				$timeout(getCurrentDocumentCount, 7500);
			}else{
				if(ajax_data.success){
					window.location.href = ajax_data.redirect;
				}else{
					window.alert("The documents could not be processed. Please try again!");
				}
			}
		}

		$scope.triggerProgressUpdates = function(){
			var params = $('tbody > tr:not(".js-entity-template")').find("[name='value[]']").serialize();
			params += "&" + $('tbody > tr:not(".js-entity-template")').find("[name='entityName[]']").serialize();
			params += "&" + $('[name="summary-lines"]').serialize();

			console.log(params);

			$.ajax('/data/process-documents',{
				data: params,
				type: 'POST',
				dataType: 'json',
				success: function(data){
					ajax_data = data;
				}
			});

			getCurrentDocumentCount();
		}
	});

app.factory('ImportFactory',
	function($rootScope, ImportAPIService){

		var service = {};
		var data = [];
		var totalDocumentCount = 0;
		var documentCount = 0;

		service.init = function(){
			ImportAPIService.fetchTotalDocumentCount().then(function(documentCount){
				totalDocumentCount = parseInt(documentCount);
				$rootScope.$broadcast('TotalDocumentCount');
			});
		}

		service.fetchCurrentDocumentCount = function(){
			ImportAPIService.fetchCurrentDocumentCount().then(function(currentCount){
				documentCount = currentCount;
				$rootScope.$broadcast('CurrentCount');
			});
		}

		service.getCurrentDocumentCount = function(){
			return documentCount;
		}

		service.getTotalDocumentCount = function(){
			return totalDocumentCount;
		}

		return service;
	});

app.service(
	"ImportAPIService",
		function($http, $q){

		//Return the public API
		return({
			fetchTotalDocumentCount: fetchTotalDocumentCount,
			fetchCurrentDocumentCount: fetchCurrentDocumentCount
		});

		/** Public Methods **/

		function fetchTotalDocumentCount(){
			var request = $http({
				method: "get",
				url: "/data/fetch-total-document-count/"
			});

			return(request.then(function(response){
				return response.data;
			}, handleError));
		}

		function fetchCurrentDocumentCount(){
			var request = $http({
				method: "get",
				url: "/data/fetch-current-document-count/"
			});

			return(request.then(function(response){
				return response.data;
			}, handleError));
		}

		/** Private methods **/

		function handleError(response){
			// The API response from the server should be returned in a
            // nomralized format. However, if the request was not handled by the
            // server (or what not handles properly - ex. server error), then we
            // may have to normalize it on our end, as best we can.
            if (
                ! angular.isObject( response.data ) ||
                ! response.data.message
                ) {

                return( $q.reject( "An unknown error occurred." ) );

            }

            // Otherwise, use expected error message.
            return( $q.reject( response.data.message ) );
		}
	});
