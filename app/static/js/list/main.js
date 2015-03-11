/*javascript external to angular applies to a scope*/

function resizeLists() {
    var domElt = document.getElementById('ListContainer');
    scope = angular.element(domElt).scope();
    scope.$apply(function() {
        scope.width = window.innerWidth - 40;
        // scope.height = window.innerHeight;
        // scope.gridHeight = window.innerHeight - 75;
        // scope.restrictedHeight = window.innerHeight - 200;
        var fixedWindowHeight = 400;
        scope.height = fixedWindowHeight;
        scope.gridHeight = fixedWindowHeight - 75;
        scope.restrictedHeight = fixedWindowHeight - 200;
        // console.log("I am called!",scope.restrictedHeight);
    });
}

//first call of tellAngular when the dom is loaded
document.addEventListener("DOMContentLoaded", resizeLists, false);

//calling tellAngular on resize event
// window.onresize = resizeLists;