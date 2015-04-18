/*javascript external to angular applies to a scope*/

function resizeLists() {
    var domElt = document.getElementById('ListContainer');
    scope = angular.element(domElt).scope();
    scope.$apply(function() {
        scope.width = window.innerWidth - 40;
        scope.height = window.innerHeight;
        scope.gridHeight = window.innerHeight - 75;
        scope.restrictedHeight = window.innerHeight - 200;
        // var fixedWindowHeight = 375;
        // scope.height = fixedWindowHeight;
        // scope.gridHeight = fixedWindowHeight - 75;
        // scope.restrictedHeight = fixedWindowHeight - 200;
        // console.log("I am called!",scope.restrictedHeight);
    });
}

function resizeListToSize(height){
    var domElt = document.getElementById('ListContainer');
    scope = angular.element(domElt).scope();
    scope.$apply(function() {
        scope.width = window.innerWidth - 40;
        scope.gridHeight = height;
        scope.restrictedHeight = height - 130;
    });   
}

function resize(scope, height){
    scope.$apply(function(){
        scope.gridHeight = height;
        scope.restrictedHeight = height - 130;
    });
}

//first call of tellAngular when the dom is loaded
// document.addEventListener("DOMContentLoaded", resizeLists, false);

//calling tellAngular on resize event
// window.onresize = resizeLists;