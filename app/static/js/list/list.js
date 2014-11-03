var app = angular.module('ngListViewApp',[]);

app.controller('ListViewController', 
	function($scope, $window, DataFactory){

		var listViewWidth = 350;

		$scope.isLoading = true;
		$scope.mode  = "Any";
		$scope.lists = [1,2];

		$scope.width = $window.innerWidth;
		$scope.height = $window.innerHeight;
		$scope.gridHeight = $window.innerHeight - 75;
		$scope.restrictedHeight = $window.innerHeight - 200;

		loadRemoteData();

		/** Public Methods **/
		
		$scope.updateMode = function(newMode){
			$scope.mode = newMode;
			DataFactory.updateMode(newMode);
		}

		$scope.addList = function(){
			$scope.lists.push($scope.lists.length+1);
		}

		/** Private Methods **/ 

		function loadRemoteData(){
			DataFactory.init($scope.mode);
			$scope.isLoading = false;
		}
	}
);

app.controller("ListController",
	function($scope, DataFactory){

		$scope.list = [];
		$scope.itemHeight = 0;
		$scope.align = "text-left";
		$scope.sortArgs = [];
		$scope.orderByPredicate = "";
		$scope.firstOrderPredicate = "";
		$scope.isListLoading = false;
		
		$scope.selectedListItems = [];

		//the below call would return an empty array when the controller is 
		//called before the data is loaded, but would return the list of entities
		//when the list is added dynamically..
		$scope.headers = DataFactory.getListEntityTypes();

		var currentSelection = "#FEF935";
		var seedSelectionColorSwatch = ["#ffdc8c", '#ffd278','#ffc864','#ffbe50','#ffb43c','#ffaa28','#ffa014','#ff9600'];
		var selectionColors = d3.scale.linear()
                    .domain(d3.range(0, 1, 1.0 / (seedSelectionColorSwatch.length - 1)))
                    .range(seedSelectionColorSwatch);

		/** Public methods **/
		$scope.listChanged = function(){
			var listData = DataFactory.getListContents($scope.selectedList);
			var length = listData.length;
			if(length > 26){
				$scope.itemHeight = 550/length;
			}
			$scope.list = listData;
		}

		$scope.setAlignment = function(align){
			$scope.align = align;
		}

		$scope.selectItem = function(itemName){
			$scope.isListLoading = true;
			var index = $scope.selectedListItems.indexOf(itemName);
			if(index != -1){
				$scope.selectedListItems.splice(index, 1);
			} else{
				$scope.selectedListItems.push(itemName);
			}
			DataFactory.setSelectedListItem($scope.selectedList, $scope.selectedListItems);
		}

		$scope.getBackgroundColor = function(name, strength){
			return ($scope.selectedListItems.indexOf(name) != -1) ? currentSelection : 
				((strength == 0)? "#FFFFFF": selectionColors(strength));
		}

		$scope.getScrollBarBackgroundColor = function(name, strength){
			return (strength == 0)? "#FAFAFA": selectionColors(strength);
		}

		$scope.getItemWidth = function(itemFrequency){
			return ((1-itemFrequency) * 160)+"%";
		}

		$scope.clearSelections = function(){
			$scope.selectedListItems = [];
			DataFactory.setSelectedListItem($scope.selectedList, $scope.selectedListItems);
		}

		$scope.setFirstOrderSort = function(sortParams){
			if($scope.firstOrderPredicate == sortParams){
				$scope.firstOrderPredicate = "";
			} else{
				$scope.firstOrderPredicate = sortParams;
			}
		}

		$scope.$on('loadComplete', function(){
			$scope.isListLoading = false;
		});

		$scope.$on('entityTypesLoaded', function(){
			$scope.headers = DataFactory.getListEntityTypes();
		});
	}
);

app.directive('myListView', function(){
	myListView = {};
	myListView.restrict = 'E';
	myListView.templateUrl = '/static/directives/list-view.html'
	myListView.link = function($scope, element, attrs){
		var svg = d3.select(element[0]).select('.js-scrollbar')
					.append('svg')
					.attr("width", 20);

		var heatmap = svg.append("g");
		heatmap.append("rect").attr("class", "frame").attr("width", 20);

		var page = heatmap.append("rect")
						.datum({y: 0})
						.attr("class", "page")
						.attr("width", 20)
    					.call(d3.behavior.drag().origin(Object).on("drag", drag));

// function scroll() {
//   var d = page.datum();
//   page.attr("y", d.y = Math.max(0, Math.min(height - d.h, height * this.scrollTop / (textViewer.rowHeight() * lines.length))));
// }

		function drag(d) {
		  d.y = Math.max(0, Math.min(height - d.h - 1, d3.event.y));
		  text.node().scrollTop = d.y * textViewer.rowHeight() * lines.length / height;
		  page.attr("y", d.y);
		}
	};
	return myListView;
});

app.directive('myListComponent', function(){
	myListComponent = {};
	myListComponent.restrict = 'E';
	myListComponent.templateUrl = '/static/directives/list-component.html';
	return myListComponent;
});

app.service(
	"apiService",
	function($http, $q){

		//Return the public API
		return({
			fetchListContents: fetchListContents,
			fetchEntityTypes: fetchEntityTypes,
			getUpdatedListContents: getUpdatedListContents
		});

		/** Public methods **/

		//Saves all the entity types that are displayed in the list view
		function fetchEntityTypes(){
			var request = $http({
				method: "get",
				url: "/list/get-list-entity-types"
			});

			return(request.then(function(response){
				return response.data;
			}, handleError))
		}

		//Saves all the list contents to be stored in the Angular Model.
		function fetchListContents(){
			var request = $http({
				method: "get",
				url: "/list/get-list-contents"
			});

			return( request.then(function(response){
				return response.data;
			}, handleError) );
		}

		function getUpdatedListContents(params){
			var request = $http({
				url: "/list/get-updated-list-contents",
				method: "POST",
        		data: JSON.stringify(params),
        		headers: {'Content-Type': 'application/json'}
			});

			return (request.then(function(response){
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
	}
);

app.factory('DataFactory',function($rootScope, apiService){
	var listContents = [];
	var listEntityTypes = [];
	
	var selectedLists = [];
	var listMode;

	var currentlyDisplayedLists = [];
	var service = {};

	service.init = function(defaultMode){
		listMode = defaultMode;
		apiService.fetchListContents()
			.then(function(data){
				listContents = data;
			});

		apiService.fetchEntityTypes()
			.then(function(data){
				listEntityTypes = data;
				$rootScope.$broadcast('entityTypesLoaded');
			});
	}

	//Returns the list contents
	service.getListContents = function(listName){
		for(var index=0; index<listContents.length; index++){
			if(listContents[index].key === listName){
				if(currentlyDisplayedLists.indexOf(listName) == -1){
					currentlyDisplayedLists.push(listName);
				}
				return listContents[index].values;
			}
		}
		return [];
	}

	//Returns the list of entity headers
	service.getListEntityTypes = function(){
		return listEntityTypes;
	}

	service.setSelectedListItem = function(listName, selectedListItems){
		var index = findInList(listName, selectedLists, 'column');
		var params = { 'column' : listName, 'values' : selectedListItems };

		if(index != -1){
			if(selectedListItems.length){
				selectedLists[index] = params;	
			}else{
				selectedLists.splice(index, 1);
			}
		}else{
			selectedLists.push(params);
		}

		updateListContents();
		$rootScope.$broadcast('loadComplete');
	}

	service.updateMode = function(newMode){
		listMode = newMode;
		updateListContents();
	}

	/** Private functions **/

	function findInList(needle, hayStack, attributeName){
		for(var index=0; index<hayStack.length; index++){
			if(hayStack[index][attributeName] === needle){
				return index;
			}
		}
		return -1;
	}

	function resetStrengthData(){
		//Reset the data here..
		for(var listIndex=0; listIndex<listContents.length; listIndex++){
			var list = listContents[listIndex]['values'];
			for(var itemIndex=0; itemIndex<list.length; itemIndex++){
				list[itemIndex]['strength'] = 0;
			}
		}
	}

	function updateListContents(){
		if(selectedLists.length){
			apiService.getUpdatedListContents({'mode':listMode, 'params': selectedLists, 'column_list': currentlyDisplayedLists})
			.then(function(data){
				resetStrengthData();

				var listIndex, listContent, itemIndex;
				for(var index=0; index<data.length; index++){

					listIndex = findInList(data[index]['key'], listContents, 'key');
					listContent = data[index]['values'];
					
					for(var sub_index=0; sub_index<listContent.length; sub_index++){
						itemIndex = findInList(listContent[sub_index]['name'], listContents[listIndex]['values'], 'name');
						if(itemIndex != -1){
							listContents[listIndex]['values'][itemIndex]['strength'] = listContent[sub_index]['strength'];
							listContents[listIndex]['values'][itemIndex]['hasStrength']	= 1;
							listContents[listIndex]['values'][itemIndex]['strengthCount'] = listContent[sub_index]['count'];
						}
					}
				}
			});
		} else {
			//Reset the data here..
			for(var listIndex=0; listIndex<listContents.length; listIndex++){
				var list = listContents[listIndex]['values'];
				for(var itemIndex=0; itemIndex<list.length; itemIndex++){
					list[itemIndex]['strength'] = 0;
					list[itemIndex]['hasStrength'] = 0;
					list[itemIndex]['strengthCount'] = 0;
				}
			}
		}
	}

	return service;
});

