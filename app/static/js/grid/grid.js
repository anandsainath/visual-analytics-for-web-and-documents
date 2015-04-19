// var app = angular.module('ngJigsawGridApp',['ngSanitize']);
var app = angular.module('ngJigsaw');

app.filter("sanitize", ['$sce', function($sce) {
  return function(htmlCode){
    return $sce.trustAsHtml(htmlCode);
  }
}]);

/** Global View Controller **/

app.service(
	"gridAPIService",
	function($http, $q){

		//Return the public API
		return({
			fetchGridDataList: fetchGridDataList,
			fetchDocContent: fetchDocContent,
			fetchCosineSimmilarity: fetchCosineSimmilarity,
			fetchClusterAssignments: fetchClusterAssignments
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

		function fetchClusterAssignments(){
			var request = $http({
				method: "get",
				url: "/data/compute-clusters"
			});

			return(request.then(function(response){
				return response.data;
			}, handleError))
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

app.factory('GridDataFactory',
	function($rootScope, gridAPIService){

		var service = {};

		var gridData = undefined;
		var content = {};
		var dict_simmilarity_score = {};
		var cluster_assignments = undefined;

		service.init = function(){
			gridAPIService.fetchGridDataList()
				.then(function(list){
					gridData = list;
					$rootScope.$broadcast('gridListLoaded');
				});

			gridAPIService.fetchClusterAssignments()
				.then(function(doc_cluster_assignments){
					cluster_assignments = doc_cluster_assignments;
					$rootScope.$broadcast('clustersLoaded');
				});
		}

		service.loadDocContent = function(doc_id){
			gridAPIService.fetchDocContent(doc_id)
				.then(function(doc_content){
					content = doc_content;
					$rootScope.$broadcast('contentChanged');
				});
		}

		service.loadSimmilarity = function(doc_id){
			gridAPIService.fetchCosineSimmilarity(doc_id)
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

		service.getClusterAssignments = function(){
			return cluster_assignments;
		}

		return service;
	});

app.directive('myDocGridComponent', 
	function(){
		
		function Controller($scope, $window, GridDataFactory){
			GridDataFactory.init();
		}

		function link($scope, element, attributes, controller){
			console.log("Link function inside the directive called..");
		}

		return ({
			restrict: 'A',
			templateUrl: '/static/directives/grid-component.html',
			controller: Controller,
			link: link
		});
	});

app.directive('gridView', 
	function(){
		
		function Controller($scope, $window, GridDataFactory){
			GridDataFactory.init();
		}

		function link($scope, element, attributes, controller){
			console.log("Link function inside the directive called..");
		}

		return ({
			restrict: 'A',
			templateUrl: '/static/directives/grid-view-new.html',
			controller: Controller,
			link: link
		});
	});

app.controller("GridController",
	function($scope, $window, $timeout, GridDataFactory){

		/** Entities, Content and Summary of the current document being displayed. **/

		$scope.gridData = [];
		$scope.clusterData = [];
		$scope.clusterLabels = [];
		var gridDict = {};
		var minDict = {'l': 10000, 'e': 10000, 'ds': 10000};
		var maxDict = {'l': -1, 'e': -1, 'ds': -1};

		$scope.sortByOrder = false;
		$scope.colorByOption = "dark";
		$scope.cur_doc = 'No document selected';

		$scope.reader_doc_id = undefined;
		$scope.content = []
		$scope.content_loaded = false;
		$scope.module_identifier = Date.now() + Math.floor((Math.random() * 100) + 1) + "_GridView";
		$scope.clusters_loaded = false;
		$scope.display_mode = 'grid'; //can be either 'grid' or 'cluster'

		$scope.display_mode_grid = true;
		$scope.display_mode_cluster = false;

		$scope.compute_btn_disabled = true

		
		$scope.blueShades = ['#08306B', '#08519C', '#2171B5', '#4292c6', '#6BAED6', '#9ECAE1', '#C6DBEF', '#DEEBF7'];
		$scope.redShades = ['#67000d', '#a50f15', '#CB181D', '#EF3B2C', '#FB6A4A', '#FCA114', '#FCBBA1', '#FEE0D2'];
		$scope.clusterShades = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"];
		
		$scope.sortByOrderOptions = [
			{label: "Ascending", value: false}, 
			{label: "Descending", value: true}
		];

		$scope.colorByOptions = [{label: "Greater Value, Darker Color", value: "dark"}, {label: "Greater Value, Lighter Color", value: "light"}];

		$scope.selectOptions = [
			{id:1, label: "Document Length", value:'l', shade: 'light'},
			{id:2, label: "Number of Entities", value:'e', shade: 'light'},
			{id:3, label: "Sentiment", value:'p', shade: 'light'},
			{id:4, label: "Subjectivity", value:'s', shade: 'light'},
			{id:5, label: "Document Similarity", value: 'ds', shade: 'dark'},
			{id:6, label: "Cluster Assignment", value: 'c', shade: 'dark'}
		];

		$timeout(function(){
			$scope.sortByAttribute = "l";
			$scope.colorByAttribute = "l";
		});

		loadGridData();
		addClusterAssignments(); // loads the cluster assignments if the view is loaded up the second time..


		$scope.displayMode = function(mode){
			if(mode == 'grid'){
				$scope.display_mode_grid = true;
				$scope.display_mode_cluster = false;
			}else{
				$scope.display_mode_grid = false;
				$scope.display_mode_cluster = true;
			}
		}

		/** Subscription for Entity selections **/

		$.jStorage.subscribe("JigsawEntitySelection", function(channel, payload){
			if(payload.id != $scope.module_identifier){
				//only accept entity selections other than from itself.
				console.log($scope.module_identifier, "RECEIVED");
				if(payload.name == "ID"){
					var selections = $.jStorage.get(payload.name);
					// console.log(gridDict[selections[0]])
					var doc = gridDict[selections[0]]
					$scope.mouseClick(doc, true);
					console.log(doc);
				}
			}
		});

		$scope.mouseEnterDoc = function(doc){
			doc.hover = true;
			$scope.cur_doc = doc.name +" : "+ doc[$scope.sortByAttribute];
		}

		$scope.mouseLeaveDoc = function(doc){
			doc.hover = false;

			if($scope.reader_doc_id){
				$scope.cur_doc = $scope.reader_doc_id +" : "+ gridDict[$scope.reader_doc_id][$scope.sortByAttribute];
			}else{
				$scope.cur_doc = 'No document selected';
			}
		}

		$scope.mouseClick = function(doc, fromJStorage){
			fromJStorage = fromJStorage || false

			if(doc.clicked){
				doc.clicked = false;
				doc.hover = false;
				$scope.content_loaded = false;
				$scope.compute_btn_disabled = true;
			}else{
				doc.clicked = true;

				if($scope.reader_doc_id){
					gridDict[$scope.reader_doc_id].clicked = false;
				}

				$scope.reader_doc_id = doc.name;
				$scope.compute_btn_disabled = false;

				if(!fromJStorage){
					console.log("FROM", $scope.module_identifier);
					$.jStorage.set("ID", [doc.name]);
					$.jStorage.publish('JigsawEntitySelection', {"name":"ID", "selected": true, "id": $scope.module_identifier});
				}
			}
		}

		$scope.loadSimmilarityScore = function(){
			GridDataFactory.loadSimmilarity($scope.reader_doc_id);
		}

		// $scope.$watch('reader_doc_id', function(newValue, oldValue){
		// 	if(newValue != ''){
		// 		GridDataFactory.loadDocContent(newValue);
		// 		if(oldValue != ''){
		// 			gridDict[oldValue].clicked = false;
		// 		}
		// 	}
		// });

		$scope.$on('contentChanged', function(){
			var docContent = GridDataFactory.getCurrentDocContent();
			$scope.content = docContent.content;
			$scope.content_loaded = true;
		});
		
		function loadGridData(){
			var _grid_data = GridDataFactory.getGridData();
			if(_grid_data){
				$scope.gridData = _grid_data;
				$scope.gridData.forEach(function(doc, index){
					gridDict[doc.name] = doc;
					if(minDict['l'] > doc.l){minDict['l'] = doc.l;}
					if(maxDict['l'] < doc.l){maxDict['l'] = doc.l;}
					if(minDict['e'] > doc.e){minDict['e'] = doc.e;}
					if(maxDict['e'] < doc.e){maxDict['e'] = doc.e;}
				});
			}
		}

		$scope.$on('gridListLoaded', function(){
			loadGridData();
		});

		$scope.$on('simmilarityScoreLoaded', function(){
			var dict_doc_simmilarity = GridDataFactory.getSimmilarityScore();
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

		function addClusterAssignments(){
			var cluster_assignments = GridDataFactory.getClusterAssignments();

			if(cluster_assignments){
				$scope.clusters_loaded = true;
				for(var index in cluster_assignments){
					cluster_object = cluster_assignments[index];
					var cluster_num = cluster_object['cluster'];
					var cluster_docs = [];

					for(var doc_index in cluster_object['ids']){
						var key = cluster_object['ids'][doc_index];
						gridDict[key]['c'] = cluster_num;

						cluster_docs.push(gridDict[key]);
					}
					$scope.clusterData.push({
						'docs': cluster_docs,
						'words': cluster_object['words']
					});
				}
				$scope.selectOptions[5]['shade'] = 'light';
			}
		}

		$scope.$on('clustersLoaded', function(){
			addClusterAssignments();
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
				case 'c':
					value = gridDict[doc_id]['c'];
					color = $scope.clusterShades[parseInt(value)];
					break
			}
			return color;
		}
	});
