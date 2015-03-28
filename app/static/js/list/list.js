var app = angular.module('ngJigsawListApp',['sf.virtualScroll','pasvaz.bindonce']);

app.config(function($logProvider){
  $logProvider.debugEnabled(false);
});


app.controller('JigListViewController', 
	function($scope, $window, DataFactory){

		var listViewWidth = 350;

		$scope.isLoading = true;
		$scope.mode  = "Any";
		$scope.lists = [1,2,3];

		$scope.width = $window.innerWidth - 40;
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

		$scope.$on('entityTypesLoaded', function(){
			$scope.isLoading = false;
		});

		/** Private Methods **/ 

		function loadRemoteData(){
			DataFactory.init($scope.mode);
		}
	}
);

app.controller("ListController",
	function($scope, $window, $filter, DataFactory){

		$scope.data = []; // will contain the complete data that comes from the server..
		$scope.listData = []; //will contain the actual data that is being shown on the list
		$scope.selectedList = "";
		$scope.previousList = undefined;
		$scope.scrollModel = {};

		$scope.itemsPerPage = 4000; //every time an infinite scroll is triggered, 100 items would be fetched and displayed.
		$scope.currentPage = 1; //holds the current page being shown..
		$scope.totalRecords = 0; //holds the total number of records that can be shown..

		$scope.itemHeight = 0;
		$scope.align = "text-left";
		$scope.sortArgs = [];
		$scope.orderByPredicate = "name";
		$scope.firstOrderPredicate = "";
		$scope.isListLoading = false;
		$scope.isListLoadedOnce = false;
		$scope.module_identifier = Date.now() + Math.floor((Math.random() * 100) + 1) + "_ListView";
		
		$scope.selectedListItems = [];
		$scope.isMultiSelectMode = false;

		$scope.dataWatchFlag = 0; //dummy flag that gets updated everytime the overview scroller should change..

		$scope.lastMultiSelectPosition = undefined;

		//the below call would return an empty array when the controller is 
		//called before the data is loaded, but would return the list of entities
		//when the list is added dynamically..
		$scope.headers = DataFactory.getListEntityTypes();

		var notification;

		/** Subscription for Entity selections **/

		$.jStorage.subscribe("JigsawEntitySelection", function(channel, payload){
			if(payload.id != $scope.module_identifier && !payload.id.endsWith("_ListView")){
				console.log($scope.module_identifier, "RECEIVED");
				if(payload.name == $scope.selectedList){
					$scope.selectedListItems = [];
					var selections = $.jStorage.get(payload.name);
					$scope.selectItem(selections[0], true);
				}
			}
		});

		/** Public methods **/
		$scope.listChanged = function(){
			if($scope.previousList){
				$scope.selectedListItems = [];
				DataFactory.setSelectedListItem($scope.previousList, $scope.selectedListItems);
			}
			$scope.data = DataFactory.getListContents($scope.selectedList);
			$scope.totalRecords = $scope.data.length;
			$scope.loadMoreData(true);
			$scope.dataWatchFlag ++;
			$scope.previousList = $scope.selectedList;
		}

		$scope.loadMoreData = function(isFirstLoad){
			$scope.listData = []
			var _newData = $filter('orderBy')($scope.data, [$scope.firstOrderPredicate, $scope.orderByPredicate])
			$scope.listData.push.apply($scope.listData, _newData);
		}

		$scope.setAlignment = function(align){
			$scope.align = align;
		}

		$scope.selectItem = function(itemName, $event, $index){
			$scope.isListLoading = true;
			if(!notification){
				notification = noty({});
			}

			if($event){
				//$event is not undefined..
				if($event.shiftKey){
					$scope.selectedListItems = [];
					if($scope.lastMultiSelectPosition){
						//lastMultiSelectPosition is not undefined..
						var startIndex = ($index < $scope.lastMultiSelectPosition)? $index : $scope.lastMultiSelectPosition;
						var endIndex = ($index > $scope.lastMultiSelectPosition)? $index : $scope.lastMultiSelectPosition;

						for(var index=startIndex; index<=endIndex; index++){
							$scope.selectedListItems.push($scope.listData[index]['name']);
						}
					} else {
						$scope.selectedListItems.push(itemName);
						// $scope.lastMultiSelectPosition = $index;
					}
				} else if(($event.metaKey && navigator.platform.indexOf('Mac') > -1) || ($event.ctrlKey && navigator.platform.indexOf('Win') > -1)){
					var index = $scope.selectedListItems.indexOf(itemName);
					if(index != -1){
						$scope.selectedListItems.splice(index, 1);
					} else{
						$scope.selectedListItems.push(itemName);
					}
				} else {
					$scope.selectedListItems = [];
					$scope.selectedListItems.push(itemName);
					// $scope.lastMultiSelectPosition = $index;
				}

				$.jStorage.set($scope.selectedList, $scope.selectedListItems);
				$.jStorage.publish('JigsawEntitySelection', {"name":$scope.selectedList, "selected": true, "id": $scope.module_identifier});
			} else {
				//$event is undefined..
				var index = $scope.selectedListItems.indexOf(itemName);
				if(index != -1){
					$scope.selectedListItems.splice(index, 1);
				} else{
					$scope.selectedListItems = [];
					$scope.selectedListItems.push(itemName);
				}
			}

			$scope.lastMultiSelectPosition = $index;
			// var index = $scope.selectedListItems.indexOf(itemName);
			// if(index != -1){
			// 	$scope.selectedListItems.splice(index, 1);
			// } else{
			// 	$scope.selectedListItems = [];
			// 	$scope.selectedListItems.push(itemName);
			// }
			// console.log("SelectedListItems", $scope.selectedListItems);
			DataFactory.setSelectedListItem($scope.selectedList, $scope.selectedListItems);

			// if(!fromJStorage){
			// 	console.log("FROM", $scope.module_identifier);
			// 	$.jStorage.set($scope.selectedList, $scope.selectedListItems);
			// 	$.jStorage.publish('JigsawEntitySelection', {"name":$scope.selectedList, "selected": true, "id": $scope.module_identifier});
			// }
			$scope.isMultiSelectMode = false;
		}

		$scope.selectMultipleItems = function(itemName){
			$scope.isListLoading = true;
			if(!notification){
				notification = noty({});
			}

			if(!$scope.isMultiSelectMode){
				//first time the multi select mode is activated
				//reset the selected items list..
				$scope.selectedListItems = [];
			}

			var index = $scope.selectedListItems.indexOf(itemName);
			if(index != -1){
				$scope.selectedListItems.splice(index, 1);
			} else{
				$scope.selectedListItems.push(itemName);
			}
			DataFactory.setSelectedListItem($scope.selectedList, $scope.selectedListItems);

			// if(!fromJStorage){
			console.log("FROM", $scope.module_identifier);
			$.jStorage.set($scope.selectedList, $scope.selectedListItems);
			$.jStorage.publish('JigsawEntitySelection', {"name":$scope.selectedList, "selected": true, "id": $scope.module_identifier});
			// }
			$scope.isMultiSelectMode = true;

		}

		$scope.getScrollBarBackgroundColor = function(name, strength){
			return (strength == 0)? "#FAFAFA": selectionColors(strength);
		}

		$scope.clearSelections = function(){
			$scope.selectedListItems = [];
			DataFactory.setSelectedListItem($scope.selectedList, $scope.selectedListItems);
		}

		$scope.$watch('orderByPredicate', function(newValue, oldValue){
			resetDisplayList();
			$scope.dataWatchFlag++;
		});

		$scope.setFirstOrderSort = function(sortParams){
			if($scope.firstOrderPredicate == sortParams){
				$scope.firstOrderPredicate = "";
			} else{
				$scope.firstOrderPredicate = sortParams;
			}

			resetDisplayList();
			$scope.dataWatchFlag++;
		}

		function resetDisplayList(){
			// $scope.currentPage = 1;
			// $scope.listData = [];
			$scope.loadMoreData(true);
		}

		$scope.$on('loadComplete', function(){
			$scope.isListLoading = false;
			if(notification){
				notification.close();
				notification = undefined;
			}
			$scope.dataWatchFlag ++;
			resetDisplayList();
		});

		$scope.$on('entityTypesLoaded', function(){
			$scope.headers = DataFactory.getListEntityTypes();
			if(!$scope.isListLoadedOnce && $scope.list_index < 4){
				$scope.isListLoadedOnce = true;
				$scope.selectedList = $scope.headers[$scope.list_index - 1];
				$scope.listChanged();
			}
		});

		$scope.getSortedData = function(){
			return $filter('orderBy')($scope.data, [$scope.firstOrderPredicate, $scope.orderByPredicate]);
		}
	}
);

app.directive('myListView', function($window, $parse){
	myListView = {};
	myListView.restrict = 'E';
	myListView.templateUrl = '/static/directives/list-view.html';	
	var seedSelectionColorSwatch = ["#ffdc8c", '#ffd278','#ffc864','#ffbe50','#ffb43c','#ffaa28','#ffa014','#ff9600'];

 	myListView.compile = function(element, attrs){

 		return {
 			pre: function($scope, element, attrs){
 				$scope.list_index = attrs.index;
				$scope.parent_container_selector = "#parentContainer"+$scope.list_index;
 			},
 			post: function($scope, element, attrs){
				// console.log("Link function called!!");
				var svg = d3.select(element[0]).select('svg');
				// var page = svg.select('rect.page');
				var frame = svg.select('rect.frame');
				var overviewList = svg.select('#overviewList');
				var mainList = d3.select(element[0]).select('.js-items-list');
				// var thumb = d3.select(element[0]).select('.thumb');
				// console.log(mainList, $scope.parent_container_selector);

				// mainList.on("scroll", function(){
				// 	// console.log("List Scrolled: "+ this.scrollTop);
				// 	// console.log("Total: "+ $scope.totalRecords);
				// 	// console.log(page.attr("height"), $scope.restrictedHeight);
				// 	var y = ((this.scrollTop/20) * ($scope.restrictedHeight/$scope.totalRecords));
				// 	if(page.attr("height") <= 10){
				// 		// console.log("Fraction", page.attr("y")/($scope.restrictedHeight-page.attr("height")));
				// 		var diff = (page.attr("y")/($scope.restrictedHeight-page.attr("height")))*page.attr('height')*2;
				// 		y = y - diff;
				// 	}
				// 	page.attr("y", y);
				// 	// thumb.attr("y", y + (page.attr("height")/2) - 20);
				// });

				// function dragEvent(d) {
				// 	// console.log(page.attr("y"), d3.event.y);
				// 	// var y = d3.event.y - ((d3.event.y/($scope.restrictedHeight))*page.attr("height"));
				// 	// console.log("Original Y", d3.event.y);
				// 	// console.log("Computed Y", y);
					
				// 	var y = d3.event.y * ($scope.totalRecords/$scope.restrictedHeight) * 20;
				// 	mainList.transition().duration(10)
    //     				.tween("mainScrollListTween", scrollTopTween(y));
    //  				// mainList.attr("scrollTop",y);
    //  				// mainList.scrollTop = y;
				// }

				function scrollTopTween(scrollTop) { 
				    return function() { 
				        var i = d3.interpolateNumber(this.scrollTop, scrollTop); 
				        return function(t) { this.scrollTop = i(t); }; 
				        // this.scrollTop = scrollTop;
				    }; 
				}

				// function thumbDragEvent(){
				// 	var y = (d3.event.y + 20 - (page.attr("height")/2))  * ($scope.totalRecords/$scope.restrictedHeight) * 20;
				// 	mainList.transition().duration(10)
    //     				.tween("mainScrollListTweenViaThumb", scrollTopTween(y));
				// }

				// function refreshScrollerPositions(){
					// console.log("Refreshing scroller positions..");
					// console.log("restrictedHeight", $scope.restrictedHeight);
					// console.log("totalRecords", $scope.totalRecords);
					// var pageHeight = (($scope.restrictedHeight/$scope.totalRecords)*($scope.restrictedHeight/20));
					// // console.log("Page Height", pageHeight);
					// // console.log("Current Page", $scope.currentPage);
					// var y = ($scope.currentPage-2)*pageHeight;
					// page.attr("y", y);
					// if (pageHeight < 10){
					// 	console.log("Original page height: ", pageHeight);
					// 	pageHeight = 10;
					// }
					// page.attr("height", pageHeight);
					// thumb.attr("y", (y + (pageHeight/2)) - 20);
				// }

				$scope.$watch('restrictedHeight', function(newHeight, oldHeight){
					svg.attr("height", newHeight);
					frame.attr("height", newHeight);

					refreshOverviewList();
				});

				$scope.$watch('dataWatchFlag', function(){
					refreshOverviewList();
				});

				function refreshOverviewList(){
					if($scope.totalRecords == 0){
						return;
					}

					// refreshScrollerPositions();

					var itemHeight = $scope.restrictedHeight / $scope.totalRecords;
					var sortedData = $scope.getSortedData();

					if(!sortedData){
						return;
					}
					
					// var overview = overviewList.selectAll('.row-item').data(sortedData, function(datum){return datum;});

					// overview.enter()
					// 	.append("rect")
					// 	.attr("class","row-item")
					// 	.attr("x", 0)
					// 	.attr("y", function(datum, index){
					// 		return index * itemHeight;
					// 	})
					// 	.attr("width", 20)
					// 	.attr("height", itemHeight)
					// 	.attr("style", function(datum){
					// 		var color = "#FFFFFF";
					// 		if(datum.background){
					// 			color = datum.background;
					// 		}
					// 		return "fill: "+ color;
					// 	});

					// overview.exit().remove();

					overviewList.selectAll('.row-item').remove();
					overviewList.selectAll('.row-item')
						.data(sortedData).enter()
						.append("rect")
						.attr("class","row-item")
						.attr("x", 0)
						.attr("y", function(datum, index){
							return index * itemHeight;
						})
						.attr("width", 20)
						.attr("height", itemHeight)
						.attr("style", function(datum){
							var color = "#FFFFFF";
							if(datum.background){
								color = datum.background;
							}
							return "fill: "+ color;
						})
						// .on("click", function(){
							// var eventY = parseFloat(d3.select(this).attr("y"));
							// var pageY = parseFloat(page.attr("y"));
							// // console.log(pageY, eventY);
							// var currentPage = Math.ceil((pageY * $scope.totalRecords)/($scope.itemsPerPage * $scope.restrictedHeight));

							// if(eventY < pageY){
							// 	currentPage = currentPage - 1;
							// }else if(eventY > pageY){
							// 	currentPage = currentPage + 1;
							// }

							// var y = currentPage * $scope.itemsPerPage * 20;
							// mainList.transition().duration(10)
		     //    				.tween("mainScrollListTween", scrollTopTween(y));
						// });
				}

				// console.log("Page:",page);
				//page.call(d3.behavior.drag().on("drag", dragEvent));
				// thumb.call(d3.behavior.drag().on("drag", thumbDragEvent));
				// var page = d3.select(element[0]).select('rect.page')
				// 			.datum({y: 0, h: 40})
				// 			.call(d3.behavior.drag().origin(Object).on("drag", drag));

				// $scope.$watch('height', function(newValue, oldValue){
				// 	console.log("Height change detected! in the link function");
				// });
 			}
 		}
 	}
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
			}, handleError));
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

	var currentSelection = "#FEF935";
	var seedSelectionColorSwatch = ["#ffdc8c", '#ffd278','#ffc864','#ffbe50','#ffb43c','#ffaa28','#ffa014','#ff9600'];
	// var selectionColors = d3.scale.linear()
	//                .domain(d3.range(0, 1, 1.0 / (seedSelectionColorSwatch.length - 1)))
 	//                .range(seedSelectionColorSwatch);

		

	service.init = function(defaultMode){
		listMode = defaultMode;
		apiService.fetchListContents()
			.then(function(data){
				listContents = data;
				apiService.fetchEntityTypes()
				.then(function(data){
					listEntityTypes = data;
					$rootScope.$broadcast('entityTypesLoaded');
				});
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

		// console.log("Pushing value: "+ selectedListItems+" in list "+ listName);
		// console.log("SelectedListItems.length: "+ selectedListItems.length);
		var params = { 'column' : listName, 'values' : selectedListItems };

		if(index != -1){
			if(selectedListItems.length){
				// console.log("Updating params");
				selectedLists[index] = params;	
			}else{
				// console.log("Removing params");
				selectedLists.splice(index, 1);
			}
		}else{
			if(selectedListItems.length){
				selectedLists.push(params);
			}
		}

		console.log("SelectedLists", selectedLists);
		updateListContents();
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
				list[itemIndex]['hasStrength'] = 0;
				list[itemIndex]['strengthCount'] = 0;
				list[itemIndex]['background'] = "#FFFFFF";
			}
		}
	}

	function updateListContents(){
		if(selectedLists.length){
			apiService.getUpdatedListContents({'mode':listMode, 'params': selectedLists, 'column_list': currentlyDisplayedLists})
			.then(function(data){
				resetStrengthData();
				var listIndex, listContent, itemIndex;
				var strength;
				for(var index=0; index<data.length; index++){

					listIndex = findInList(data[index]['key'], listContents, 'key');
					listContent = data[index]['values'];
					
					for(var sub_index=0; sub_index<listContent.length; sub_index++){
						itemIndex = findInList(listContent[sub_index]['name'], listContents[listIndex]['values'], 'name');
						if(itemIndex != -1){
							listContents[listIndex]['values'][itemIndex]['strength'] = listContent[sub_index]['strength'];
							listContents[listIndex]['values'][itemIndex]['hasStrength']	= 1;
							listContents[listIndex]['values'][itemIndex]['strengthCount'] = listContent[sub_index]['count'];
							strength_count = (listContent[sub_index]['count'] > 8)? 8: listContent[sub_index]['count'];
							listContents[listIndex]['values'][itemIndex]['background'] = seedSelectionColorSwatch[strength_count-1];
						}
					}
				}

				var listIndex, itemIndex;
				selectedLists.map(function(params){
					listIndex = findInList(params.column, listContents, 'key');

					params.values.map(function(itemName){
						itemIndex = findInList(itemName, listContents[listIndex]['values'],'name');
						if(itemIndex != -1){
							listContents[listIndex]['values'][itemIndex]['background'] = currentSelection;
							listContents[listIndex]['values'][itemIndex]['hasStrength'] = 0;
							listContents[listIndex]['values'][itemIndex]['strength'] = 9999;
						}
					});
				});
				$rootScope.$broadcast('loadComplete');
			});
		} else {
			resetStrengthData();
			$rootScope.$broadcast('loadComplete');
		}
	}
	return service;
});

