angular.module('ngJigsaw', ['gridster','sf.virtualScroll','pasvaz.bindonce','ngSanitize'])
	.controller("RootCtrl", function($scope){

		/**
	     * Simple toggle method for tracking which chart is visible.
	     * @method toggleCreateFilters
	     */
	    $scope.toggleChartOptions = function() {
	        $scope.chartOptions = !$scope.chartOptions;
	    };

		/**
	     * Basic gridster layout hander that will disable mouse events on gridster items via CSS so mouse handlers
	     * in the items will not trigger and conflict with the layout action.
	     * @method onStartGridsterLayoutChange
	     * @private
	     */
	    var onStartGridsterLayoutChange = function(event, $element, widget) {
	        $('.gridster-item').css('pointer-events', 'none');
	        console.log("onStartGridsterLayoutChange");
	    };

	    /**
	     * Basic gridster layout hander that will enable mouse events on gridster items via CSS so mouse handlers
	     * in the items will trigger again after the layout action was completed.
	     * @method onStopGridsterLayoutChange
	     * @private
	     */
	    var onStopGridsterLayoutChange = function(event, $element, widget) {
	        $('.gridster-item').css('pointer-events', 'auto');
	        console.log("onStopGridsterLayoutChange");
	        console.log(widget);
	        if(widget.type == 'my-jig-list-component'){
	    		var height = $element.height();

	    		console.log($element.innerHeight(), $element.outerHeight());
	        	var scope = angular.element($element.find('#ListContainer')).scope();
	        	scope.gridHeight = height - 13;
		        scope.restrictedHeight = height - 130;
	        	console.log("resize the list view..", height);
	        }
	    };

	    var onResizeGridsterLayoutChange = function(event, $element, widget){
	    	console.log("Resize called..");
	    	// if(widget.type == 'my-jig-list-component'){
	    	// 	var height = $element.height();

	    	// 	console.log($element.innerHeight(), $element.outerHeight());
	     //    	var scope = angular.element($element.find('#ListContainer')).scope();
	     //    	scope.gridHeight = height - 13;
		    //     scope.restrictedHeight = height - 130;
	     //    	console.log("resize the list view..", height);
	     //    }
	    }

		$scope.gridsterOpts = {
			margins: [10, 10],
			outerMargin: false,
			pushing: true,
			floating: true,
			mobileBreakPoint: 800, // if the screen is not wider that this, remove the grid layout and stack the items
			draggable: {
				enabled: true,
				handle: '.visualization-drag-handle' // optional selector for draggable handle
			},
			resizable: {
				enabled: true,
				handles: ['ne', 'se', 'sw', 'nw'],
				// handles: ['e', 's', 'w', 'se', 'sw', 'ne', 'nw'],
				start: onStartGridsterLayoutChange,
            	stop: onStopGridsterLayoutChange,
            	resize: onResizeGridsterLayoutChange
			}
		};

		 $scope.visualizations = [
		 	{
		        id: uuid(),
		        sizeX: 2,
		        sizeY: 3,
		        type: 'my-jig-list-component'
		    }, {
		        id: uuid(),
		        sizeX: 4,
		        sizeY: 2,
		        minSizeX: 3,
		        minSizeY: 2,
		        type: 'grid-view'
		    }, {
		        id: uuid(),
		        sizeX: 4,
		        sizeY: 3,
		        minSizeX: 4,
		        minSizeY: 3,
		        type: 'document-view'
		    }
		];
	})
	.directive('visualizationWidget', function($compile) {
	    var MAXIMIZED_COLUMN_SIZE = 6;
	    var MAXIMIZED_ROW_SIZE = 3;

	    return {
	        restrict: 'A',
	        scope: {
	            gridsterConfigs: "=",
	            gridsterConfigIndex: "="
	        },
	       templateUrl: "/static/directives/visualization-widget.html",
	        link: function($scope, $element) {
	            // Create our widget.  Here, we are assuming the visualization is
	            // implementated as an attribute directive.
	            var widgetElement = document.createElement("div");
	            widgetElement.style.width = "100%";
	            widgetElement.style.height = "100%";
	            widgetElement.setAttribute($scope.gridsterConfigs[$scope.gridsterConfigIndex].type, "");

	            // Pass along any bindings.
	            if($scope.gridsterConfigs[$scope.gridsterConfigIndex] &&
	                $scope.gridsterConfigs[$scope.gridsterConfigIndex].bindings) {
	                var bindings = $scope.gridsterConfigs[$scope.gridsterConfigIndex].bindings;
	                for(var prop in bindings) {
	                    if(bindings.hasOwnProperty(prop)) {
	                        widgetElement.setAttribute(prop, bindings[prop]);
	                    }
	                }
	            }

	            $element.append($compile(widgetElement)($scope));

	            /**
	             * Toggles the visualization widget between default and maximized views.
	             * @method onDatasetChanged
	             */
	            $scope.toggleSize = function() {
	                if($scope.oldSize) {
	                    $scope.gridsterConfigs[$scope.gridsterConfigIndex].sizeX = $scope.oldSize.sizeX;
	                    $scope.gridsterConfigs[$scope.gridsterConfigIndex].sizeY = $scope.oldSize.sizeY;
	                    $scope.gridsterConfigs[$scope.gridsterConfigIndex].col = $scope.oldSize.col;
	                    $scope.gridsterConfigs[$scope.gridsterConfigIndex].row = $scope.oldSize.row;
	                    $scope.oldSize = null;
	                } else {
	                    $scope.oldSize = {
	                        col: $scope.gridsterConfigs[$scope.gridsterConfigIndex].col,
	                        row: $scope.gridsterConfigs[$scope.gridsterConfigIndex].row,
	                        sizeX: $scope.gridsterConfigs[$scope.gridsterConfigIndex].sizeX,
	                        sizeY: $scope.gridsterConfigs[$scope.gridsterConfigIndex].sizeY
	                    };
	                    $scope.gridsterConfigs[$scope.gridsterConfigIndex].col = 0;
	                    $scope.gridsterConfigs[$scope.gridsterConfigIndex].sizeX = MAXIMIZED_COLUMN_SIZE;
	                    $scope.gridsterConfigs[$scope.gridsterConfigIndex].sizeY = Math.max(MAXIMIZED_ROW_SIZE,
	                        $scope.gridsterConfigs[$scope.gridsterConfigIndex].sizeY);
	                }
	            };

	            /**
	             * Remove ourselves from the visualization list.
	             * @method remove
	             */
	            $scope.remove = function() {
	                $scope.gridsterConfigs.splice($scope.gridsterConfigIndex, 1);
	            };
	        }
	    };
	});