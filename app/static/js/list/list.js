var app = angular.module('ngListViewApp',[]);
app.controller('ListViewController', 
	function($scope, DataFactory){

		$scope.isLoading = true;
		$scope.mode  = "Any";

		loadRemoteData();

		/** Public Methods **/
		
		$scope.updateMode = function(newMode){
			$scope.mode = newMode;
			DataFactory.updateMode(newMode);
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
	}
);

app.service(
	"apiService",
	function($http, $q){

		//Return the public API
		return({
			fetchListContents: fetchListContents,
			getUpdatedListContents: getUpdatedListContents
		});

		/** Public methods **/

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

