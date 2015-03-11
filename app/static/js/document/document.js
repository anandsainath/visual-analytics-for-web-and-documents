var app_doc = angular.module('ngJigsawDocApp',['sf.virtualScroll','pasvaz.bindonce', 'ngSanitize']);

app_doc.config(function($logProvider){
	$logProvider.debugEnabled(false);
});

app_doc.directive('myDocumentComponent', function(){
	myDocumentComponent = {};
	myDocumentComponent.restrict = 'E';
	myDocumentComponent.templateUrl = '/static/directives/document/doc-component.html';
	return myDocumentComponent;
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
			fetchDocumentList: fetchDocumentList,
			fetchDocumentContent: fetchDocumentContent,
			fetchMarkupDoc: fetchMarkupDoc,
			fetchMarkupSummary: fetchMarkupSummary,
			fetchWordCloudList: fetchWordCloudList,
			fetchEntityTypes: fetchEntityTypes,
			addEntity: addEntity
		});

		/** Public Methods **/

		//Fetches a list of all the documents that can be shown in the document view.
		function fetchDocumentList(){
			var request = $http({
				method: "get",
				url: "/data/get-document-list"
			});

			return(request.then(function(response){
				return response.data;
			}, handleError));
		}

		//Gets the content of a document identified by a unique document ID
		function fetchDocumentContent(documentID){
			var request = $http({
				method: "get",
				url: "/data/get-document/"+documentID
			});

			return(request.then(function(response){
				return response.data;
			}, handleError));
		}

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

		//gets the content that has to be shown in the word cloud..
		function fetchWordCloudList(num_words, only_entities){
			var request = $http({
				method: "get",
				url: "/data/get-word-cloud/"+num_words+"/"+only_entities
			});

			return(request.then(function(response){
				return response.data;
			}, handleError));			
		}

		//gets a list of the entities that are present in the document corpus..
		function fetchEntityTypes(){
			var request = $http({
				method: "get",
				url: "/data/get-entity-types"
			});

			return(request.then(function(response){
				return response.data;
			}, handleError));
		}

		function addEntity(entityType, entityText){
			var request = $http({
				method: "get",
				url: "/data/update-entity/"+entityType+"/"+entityText
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
		var documentList = [];
		var wordCloudList = [];
		var entityTypesList = [];

		var documentContentJSON = {};
		var markupDocContentJSON = {};
		var summaryJSON = {};

		var service = {};

		service.init = function(){
			docAPIService.fetchDocumentList()
				.then(function(list){
					documentList = list;
					documentList[0].count += 1;
					documentList[0].color = currentSelection;
					$rootScope.$broadcast('documentListLoaded');

					docAPIService.fetchDocumentContent(documentList[0].name)
						.then(function(content){
							documentContentJSON = content;
							$rootScope.$broadcast('documentContentLoaded');
						});
				});

			docAPIService.fetchEntityTypes()
				.then(function(list){
					entityTypesList = list;
					$rootScope.$broadcast('entityTypesLoaded');
				});
		}

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

		service.fetchDocument = function(doc_id){
			docAPIService.fetchDocumentContent(doc_id)
				.then(function(content){
					documentContentJSON = content;
					$rootScope.$broadcast('documentContentLoaded');
				});
		}

		service.fetchWordCloudList = function(num_words, only_entities){
			docAPIService.fetchWordCloudList(num_words, only_entities)
				.then(function(_wordCloudList){
					wordCloudList = _wordCloudList;
					$rootScope.$broadcast('wordCloudLoaded');
				});
		}

		service.fetchEntityTypes = function(){
			docAPIService.fetchEntityTypes()
				.then(function(list){
					entityTypesList = list;
					$rootScope.$broadcast('entityTypesLoaded');
				});
		}

		service.addEntity = function(entityType, entityText){
			docAPIService.addEntity(entityType, entityText)
				.then(function(){
					$rootScope.$broadcast('refreshAfterEntityAddition');
				});
		}

		service.getDocumentList = function(){
			return documentList;
		}

		service.getDocumentContent = function(){
			return documentContentJSON;
		}

		service.getMarkupDocContent = function(){
			return markupDocContentJSON;
		}

		service.getSummaryContent = function(){
			return summaryJSON;
		}

		service.getWordCloudList = function(){
			return wordCloudList;
		}

		service.getEntityTypesList = function(){
			return entityTypesList;
		}

		return service;
	});

/** Global View Controller **/
app_doc.controller('JigDocViewController', 
	function($scope, $window, DocDataFactory){

		console.log("I am here!!");
		if($window.location.pathname === "/data/"){
			//means that the page is loaded when the documents are being uploaded..
			loadMarkupData();
		}else{
			loadRemoteData();
		}

		/** Private Methods **/ 

		function loadRemoteData(){
			DocDataFactory.init();
		}

		function loadMarkupData(){
			DocDataFactory.loadMarkupData();
		}
	});

app_doc.controller("DocController",
	function($scope, $window, $filter, DocDataFactory, $sce){

		var currentSelection = "#FEF935";
		$scope.documentList = [];
		$scope.wordCloudList = [];
		$scope.orderByPredicate = "-count"; //can be one of name, date or count

		$scope.num_words = 30;
		$scope.only_entities = "0";

		DocDataFactory.fetchWordCloudList($scope.num_words, $scope.only_entities);

		/** Entities, Content and Summary of the current document being displayed. **/

		$scope.document_id = "";
		$scope.entities = {};
		$scope.content = [];
		$scope.summary = [];
		$scope.entity_columns = [];

		$scope.entityTypes = [];
		$scope.entityName = "";
		$scope.selectedEntity = "";
		$scope.selectedText = "";

		$scope.$on('entityTypesLoaded', function(){
			var entity_list = DocDataFactory.getEntityTypesList();
			$scope.entityTypes = entity_list;
			$scope.selectedEntity = entity_list[0];
		});
		
		$scope.$on('documentListLoaded', function(){
			$scope.documentList = DocDataFactory.getDocumentList();
		});

		$scope.$on('documentContentLoaded', function(){
			var documentJSON = DocDataFactory.getDocumentContent();
			$scope.summary = documentJSON['summary'];
			$scope.content = documentJSON['content'];
			$scope.entities = documentJSON['entities'];
			$scope.entity_columns = documentJSON['entity_columns'];
			$scope.document_id = documentJSON['id'];
		});

		$scope.$on('wordCloudLoaded', function(){
			$scope.wordCloudList = DocDataFactory.getWordCloudList();
		});

		$scope.$watch('num_words', function(old_value, new_value){
			console.log(old_value, new_value);
			console.log(typeof(old_value), typeof(new_value));
			if(old_value != new_value){
				DocDataFactory.fetchWordCloudList($scope.num_words, $scope.only_entities);
			}
		});

		$scope.$watch('only_entities', function(old_value, new_value){
			if(old_value != new_value){
				DocDataFactory.fetchWordCloudList($scope.num_words, $scope.only_entities);
			}
		});

		// $scope.$watch('selectedText', function(old_value, new_value){
		// 	console.log(old_value, new_value);
		// });

		$scope.loadDocument = function(doc_id){
			var previous_doc_id = $scope.document_id;
			DocDataFactory.fetchDocument(doc_id);
			var no_of_updates = 0;

			for (var len = $scope.documentList.length, i=0; i<len && no_of_updates < 2; ++i) {
				if($scope.documentList[i].name === doc_id){
					$scope.documentList[i].count += 1;
					$scope.documentList[i].color = currentSelection;
					no_of_updates += 1;
				}

				if($scope.documentList[i].name === previous_doc_id){
					$scope.documentList[i].color = "";
					no_of_updates += 1;
				}
			}
		}

		function createOrUpdateEntity(selectedText, selectedEntity){
			console.log(selectedText, selectedEntity);

			//1. Add the text as the entity in all documents.
			//2. Update the document cloud on top. - TODO
			//4. Refresh the entity table contents..
			selectedText = selectedText.replace(/\//g,"{_}")
			DocDataFactory.addEntity(selectedEntity, selectedText);

			//3. Update the current document.
			DocDataFactory.fetchDocument($scope.document_id);
			DocDataFactory.fetchWordCloudList($scope.num_words, $scope.only_entities);
		}

		$scope.addEntity = function(){
			createOrUpdateEntity($scope.selectedText, $scope.selectedEntity);
		}

		$scope.createEntity = function(){
			createOrUpdateEntity($scope.selectedText, $scope.entityName);

			//Update the entity type drop down..
			DocDataFactory.fetchEntityTypes();
			$scope.entityName = "";
		}
	});

app_doc.controller("MarkupController",
	function($scope, $window, $filter, DocDataFactory, $sce){
		
		$scope.lines = 1;
		$scope.summary = [];
		$scope.content = [];
		$scope.options = [];
		$scope.entities = {};

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
		});
	});