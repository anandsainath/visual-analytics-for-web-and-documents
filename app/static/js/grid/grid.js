var app = angular.module('ngJigsawApp',['ngSanitize']);

app.filter("sanitize", ['$sce', function($sce) {
  return function(htmlCode){
    return $sce.trustAsHtml(htmlCode);
  }
}]);

/** Global View Controller **/

app.service(
	"apiService",
	function($http, $q){

		//Return the public API
		return({
			fetchGridDataList: fetchGridDataList,
			fetchDocContent: fetchDocContent,
			fetchCosineSimmilarity: fetchCosineSimmilarity
		});

		/** Public Methods **/

		//Fetches a list of all the documents that can be shown in the document view.
		function fetchGridDataList(){
			var request = $http({
				method: "get",
				url: "/data/get-grid-data"
			});

			return(request.then(function(response){
				return response.data;
			}, handleError));
		}

		//Fetches the content of the document that is currently in focus.
		function fetchDocContent(doc_id){
			var request = $http({
				method: "get",
				url: "/data/get-document/" + doc_id
			});

			return(request.then(function(response){
				return response.data;
			}, handleError));
		}

		function fetchCosineSimmilarity(doc_id){
			var request = $http({
				method: "get",
				url: "/data/compute-simmilarity/" + doc_id
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

app.factory('DataFactory',
	function($rootScope, apiService){

		var service = {};

		var gridData = [];
		var content = {};
		var dict_simmilarity_score = {};

		service.init = function(){
			apiService.fetchGridDataList()
				.then(function(list){
					gridData = list;
					$rootScope.$broadcast('gridListLoaded');
				});
		}

		service.loadDocContent = function(doc_id){
			apiService.fetchDocContent(doc_id)
				.then(function(doc_content){
					content = doc_content;
					$rootScope.$broadcast('contentChanged');
				});
		}

		service.loadSimmilarity = function(doc_id){
			apiService.fetchCosineSimmilarity(doc_id)
				.then(function(dict_simmilarity){
					dict_simmilarity_score = dict_simmilarity;
					$rootScope.$broadcast('simmilarityScoreLoaded');
				});
		}

		service.getGridData = function(){
			return gridData;
		}

		service.getCurrentDocContent = function(){
			return content;
		}

		service.getSimmilarityScore = function(){
			return dict_simmilarity_score;
		}

		return service;
	});

app.controller('JigViewController', 
	function($scope, $window, DataFactory){

		loadRemoteData();
		
		/** Private Methods **/ 
		function loadRemoteData(){
			DataFactory.init();
		}
	});

app.directive('myDocGridComponent', 
	function(){
		myDocGridComponent = {};
		myDocGridComponent.restrict = 'E';
		myDocGridComponent.templateUrl = '/static/directives/grid-component.html';
		return myDocGridComponent;
	});

app.controller("GridController",
	function($scope, $window, $timeout, DataFactory){

		/** Entities, Content and Summary of the current document being displayed. **/

		$scope.gridData = [];
		
		$scope.sortByOrder = "false";
		$scope.colorByOption = "dark";
		$scope.cur_doc = 'No document selected';

		$scope.reader_doc_id = '';
		$scope.content = []
		$scope.content_loaded = false;

		$scope.compute_btn_disabled = true

		var minDict = {'l': 10000, 'e': 10000, 'ds': 10000};
		var maxDict = {'l': -1, 'e': -1, 'ds': -1};
		var gridDict = {};

		$scope.blueShades = ['#08306B', '#08519C', '#2171B5', '#4292c6', '#6BAED6', '#9ECAE1', '#C6DBEF', '#DEEBF7'];
		$scope.redShades = ['#67000d', '#a50f15', '#CB181D', '#EF3B2C', '#FB6A4A', '#FCA114', '#FCBBA1', '#FEE0D2'];
		
		$scope.sortByOrderOptions = [
			{label: "Ascending", value: "false"}, 
			{label: "Descending", value: "true"}
		];

		$scope.colorByOptions = [{label: "Greater Value, Darker Color", value: "dark"}, {label: "Greater Value, Lighter Color", value: "light"}];

		$scope.selectOptions = [
			{id:1, label:"Document Length", value:'l', shade: 'light'},
			{id:2, label: "Number of Entities", value:'e', shade: 'light'},
			{id:3, label: "Polarity", value:'p', shade: 'light'},
			{id:4, label: "Subjectivity", value:'s', shade: 'light'},
			{id:5, label: "Document Simmilarity", value: 'ds', shade: 'dark'}
		];

		$timeout(function(){
			$scope.sortByAttribute = "l";
			$scope.colorByAttribute = "l";
		});

		$scope.mouseEnterDoc = function(doc){
			doc.hover = true;
			$scope.cur_doc = doc.name +" : "+ doc[$scope.sortByAttribute];
		}

		$scope.mouseLeaveDoc = function(doc){
			doc.hover = false;

			if($scope.reader_doc_id == ''){
				$scope.cur_doc = 'No document selected';
			}else{
				$scope.cur_doc = $scope.reader_doc_id +" : "+ gridDict[$scope.reader_doc_id][$scope.sortByAttribute];
			}
		}

		$scope.mouseClick = function(doc){
			if(doc.clicked){
				doc.clicked = false;
				doc.hover = false;
				$scope.content_loaded = false;
				$scope.compute_btn_disabled = true;
			}else{
				doc.clicked = true;
				$scope.reader_doc_id = doc.name;
				$scope.compute_btn_disabled = false;
			}
		}

		$scope.loadSimmilarityScore = function(){
			DataFactory.loadSimmilarity($scope.reader_doc_id);
		}

		$scope.$watch('reader_doc_id', function(newValue, oldValue){
			if(newValue != ''){
				DataFactory.loadDocContent(newValue);
				if(oldValue != ''){
					gridDict[oldValue].clicked = false;
				}
			}
		});

		$scope.$on('contentChanged', function(){
			var docContent = DataFactory.getCurrentDocContent();
			$scope.content = docContent.content;
			$scope.content_loaded = true;
		});
		
		$scope.$on('gridListLoaded', function(){
			var _grid_data = DataFactory.getGridData();
			$scope.gridData = _grid_data;
			$scope.gridData.forEach(function(doc, index){
				gridDict[doc.name] = doc;
				if(minDict['l'] > doc.l){minDict['l'] = doc.l;}
				if(maxDict['l'] < doc.l){maxDict['l'] = doc.l;}
				if(minDict['e'] > doc.e){minDict['e'] = doc.e;}
				if(maxDict['e'] < doc.e){maxDict['e'] = doc.e;}
			});
		});

		$scope.$on('simmilarityScoreLoaded', function(){
			var dict_doc_simmilarity = DataFactory.getSimmilarityScore();
			minDict['ds'] = 10000;
			maxDict['ds'] = -1;

			var ds;
			for(var key in dict_doc_simmilarity){
				ds = dict_doc_simmilarity[key];
				gridDict[key]['ds'] = ds;
				if(minDict['ds'] > ds){minDict['ds'] = ds;}
				if(maxDict['ds'] < ds){maxDict['ds'] = ds;}
			}
			$scope.selectOptions[4]['shade'] = 'light';
		});

		$scope.getDocColor = function(doc_id){
			var color = "#FFFFFF";
			switch($scope.colorByAttribute){
				case 'l':
					value = gridDict[doc_id]['l'];
					maxColorValue = ($scope.colorByOption == "dark")? maxDict['l'] : minDict['l'];
					minColorValue = ($scope.colorByOption == "dark")? minDict['l'] : maxDict['l'];
					color = $scope.blueShades[parseInt(($scope.blueShades.length-1)*(maxColorValue-value)*1.0/(maxColorValue-minColorValue))];
					break;
				case 'e':
					value = gridDict[doc_id]['e'];
					maxColorValue = ($scope.colorByOption == "dark")? maxDict['e'] : minDict['e'];
					minColorValue = ($scope.colorByOption == "dark")? minDict['e'] : maxDict['e'];
					color = $scope.blueShades[parseInt(($scope.blueShades.length-1)*(maxColorValue-value)*1.0/(maxColorValue-minColorValue))];
					break;
				case 'p':
					value = gridDict[doc_id]['p'];
					maxColorValue = ($scope.colorByOption == "dark")? 1 : 0;
					if(value > 0){
						color = $scope.blueShades[ parseInt(($scope.blueShades.length-1)*Math.abs(maxColorValue-Math.abs(value)))];
					}else if(value < 0){
						color = $scope.redShades[ parseInt(($scope.redShades.length-1)*Math.abs(maxColorValue-Math.abs(value)))];
					}
					break;
				case 's':
					value = gridDict[doc_id]['s'];
					maxColorValue = ($scope.colorByOption == "dark")? 1 : 0;
					minColorValue = ($scope.colorByOption == "dark")? 0 : 1;
					color = $scope.blueShades[parseInt(($scope.blueShades.length-1)*(maxColorValue-value)*1.0/(maxColorValue-minColorValue))];
					break;
				case 'ds':
					value = gridDict[doc_id]['ds'];
					if(value>1){ value = 1; }
					maxColorValue = ($scope.colorByOption == "dark")? maxDict['ds'] : minDict['ds'];
					minColorValue = ($scope.colorByOption == "dark")? minDict['ds'] : maxDict['ds'];
					color = $scope.blueShades[parseInt(($scope.blueShades.length-1)*(maxColorValue-value)*1.0/(maxColorValue-minColorValue))];
					break;
			}
			return color;
		}
	});
