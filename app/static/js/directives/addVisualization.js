'use strict';

var app = angular.module('ngJigsaw');

app.directive('addVisualization', ['$timeout', function($timeout){
	return{
		templateUrl: '/static/directives/add-visualization.html',
		restrict: 'EA',
        scope: {
            gridsterConfigs: "="
        },
        link: function($scope, $element) {
            $element.addClass('add-visualization');

            $scope.alertMessage = "";
            $scope.alertTimer = null;
            $scope.alertDelay = 4000;
            $scope.fadeTime = 500;

            /** Hold the default size, name, and directive settings for allowed visualizations. */
            $scope.visualizations = [{
		        name: "List",
		        sizeX: 2,
		        sizeY: 3,
		        type: 'my-jig-list-component'
		    }, {
		        name: "Grid",
		        sizeX: 4,
		        sizeY: 2,
		        type: 'grid-view'
		    }, {
		        name: "Document",
		        sizeX: 4,
		        sizeY: 3,
		        type: 'document-view'
		    }];

            // $scope.visualizations = [{
            //     name: 'Timeline',
            //     sizeX: 6,
            //     sizeY: 1,
            //     type: 'timeline-selector',
            //     icon: 'img/visualizations/Timeline64.png'
            // }, {
            //     name: 'Map',
            //     sizeX: 4,
            //     sizeY: 2,
            //     type: 'heat-map',
            //     icon: 'img/visualizations/Map64.png'
            // }, {
            //     name: 'Linechart',
            //     sizeX: 2,
            //     sizeY: 2,
            //     type: 'linechart',
            //     icon: 'img/visualizations/LineChart64.png'
            // }, {
            //     name: 'Barchart',
            //     sizeX: 2,
            //     sizeY: 2,
            //     type: 'barchart',
            //     icon: 'img/visualizations/BarChart64.png'
            // }, {
            //     name: 'Ops Clock',
            //     sizeX: 2,
            //     sizeY: 2,
            //     type: 'circular-heat-form',
            //     icon: 'img/visualizations/OpsClock64.png'
            // }, {
            //     name: 'Tag Cloud',
            //     sizeX: 2,
            //     sizeY: 2,
            //     type: 'tag-cloud',
            //     bindings: {
            //         "tag-field": "'hashtags'"
            //     },
            //     icon: 'img/visualizations/TagCloud64.png'
            // },{
            //     name: 'Count By',
            //     sizeX: 2,
            //     sizeY: 2,
            //     type: 'count-by',
            //     icon: 'img/visualizations/Count64.png'
            // },{
            //     name: 'Sunburst',
            //     sizeX: 2,
            //     sizeY: 2,
            //     type: 'sunburst',
            //     icon: 'img/visualizations/Sunburst64.png'
            // },{
            //     name: 'View Data',
            //     sizeX: 6,
            //     sizeY: 2,
            //     type: 'query-results-table',
            //     icon: 'img/visualizations/ViewData64.png'
            // }];

            /**
             * Displays a simple "added" alert to the user when they have added a new visualization.
             * The alert will disappear after a few seconds.
             * @method displayAlert
             */
            $scope.displayAlert = function(message) {
                // Cancel any existing alert timeouts.
                if($scope.alertTimer) {
                    $timeout.cancel($scope.alertTimer);
                }

                // Set the new alert
                $scope.alertMessage = message;
                $element.find('.alert-success').fadeIn($scope.fadeTime);
                $scope.alertTimer = $timeout(function() {
                    $element.find('.alert-success').fadeOut($scope.fadeTime);
                }, $scope.alertDelay);
            };

            /**
             * A selection handler that adds new visualizations when a type is selected by the user.
             * @method onItemSelected
             */
            $scope.onItemSelected = function(item) {
                if($scope.lastSelected) {
                    $scope.lastSelected.selected = false;
                }
                item.selected = true;
                $scope.lastSelected = item;
                $scope.addVisualization(item);
            };

            /**
             * Adds one instance of each user-selected visualization type to the gridsterConfigs provided as
             * a binding to this directive instance.
             * @param {Object} visualziation a visualization configuration;
             * @param {String} visualization.name The name to display in the visualization list.
             * @param {Number} visualization.sizeX The number of columns to take up in a gridster layout.
             * @param {Number} visualization.sizeY The number of rows to take up in a gridster layout.
             * @param {String} visualization.type The name of the visualization directive to use in a gridster layout.
             * @param {Object} visualization.bindings An object mapping variable names to use for directive bindings.
             * @param {String} visualization.icon A URL for an icon representing this visualization type.
             * @method addVisualization
             */
            $scope.addVisualization = function(visualization) {
                // Clone the items.  Note that underscore's clone is shallow, so also
                // clone the default bindings explicitly.
                var newVis = _.clone(visualization);
                newVis.bindings = _.clone(visualization.bindings);
                newVis.id = uuid();
                $scope.gridsterConfigs.push(newVis);

                $scope.displayAlert(visualization.name + " added!");
            };

            /**
             * Deselects all visualization configurations in the dialog managed byt his directive.
             * @method deselectAll
             * @private
             */
            $scope.deselectAll = function() {
                _.each($scope.visualizations, function(visualization) {
                    visualization.selected = false;
                });
            };
        }
	};
}]);