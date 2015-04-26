var app_doc = angular.module('ngJigsawDocApp',['sf.virtualScroll','pasvaz.bindonce', 'ngSanitize']);

app_doc.config(function($logProvider){
	$logProvider.debugEnabled(false);
});

app_doc.filter("sanitize", ['$sce', function($sce) {
  return function(htmlCode){
    return $sce.trustAsHtml(htmlCode);
  }
}]);

app_doc.service(
	"docAPIService",
	function($http, $q){
		//Return the public API
		return({
			fetchMarkupDoc: fetchMarkupDoc,
			fetchMarkupSummary: fetchMarkupSummary
		});

		/** Public Methods **/

		//Gets the content of an initial markup document
		function fetchMarkupDoc(){
			var request = $http({
				method: "post",
				url: "/data/get-markup-document"
			});

			return(request.then(function(response){
				return response.data;
			}, handleError));
		}

		//Gets the summary of the markup document with the corresponding number of lines
		function fetchMarkupSummary(num_lines){
			var request = $http({
				method: "get",
				url: "/data/get-markup-document-summary/lines/"+num_lines
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



app_doc.factory('DocDataFactory',
	function($rootScope, docAPIService){

		var currentSelection = "#FEF935";
		var markupDocContentJSON = {};
		var summaryJSON = {};

		var service = {};

		service.loadMarkupData = function(){
			docAPIService.fetchMarkupDoc()
				.then(function(contentJSON){
					markupDocContentJSON = contentJSON;
					$rootScope.$broadcast('markupDocContentLoaded');
				});
		}

		service.updateSummary = function(num_lines){
			docAPIService.fetchMarkupSummary(num_lines)
				.then(function(summaryJSONData){
					summaryJSON = summaryJSONData;
					$rootScope.$broadcast('summaryChanged');
				});
		}

		service.getMarkupDocContent = function(){
			return markupDocContentJSON;
		}

		service.getSummaryContent = function(){
			return summaryJSON;
		}

		return service;
	});


app_doc.controller("MarkupController",
	function($scope, $window, $filter, DocDataFactory, $sce){
		
		$scope.lines = 1;
		$scope.summary = [];
		$scope.content = [];
		$scope.options = [];
		$scope.entities = {};
		$scope.entity_columns = [];

		DocDataFactory.loadMarkupData();

		$scope.onLineChange = function(){
			DocDataFactory.updateSummary($scope.lines);
		}

		$scope.$on("summaryChanged", function(){
			$scope.summary = DocDataFactory.getSummaryContent()['summary'];
		});

		$scope.$on("markupDocContentLoaded", function(){
			var documentJSON = DocDataFactory.getMarkupDocContent();
			$scope.summary = documentJSON['summary'];
			$scope.content = documentJSON['content'];
			$scope.options = documentJSON['options'];
			$scope.entities = documentJSON['entities'];
			$scope.entity_columns = documentJSON['entity_columns'];
		});
	});