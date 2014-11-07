/*javascript external to angular applies to a scope*/

function resizeLists() {
    var domElt = document.getElementById('bodyContainer');
    scope = angular.element(domElt).scope();
    scope.$apply(function() {
        scope.width = window.innerWidth;
        scope.height = window.innerHeight;
        scope.gridHeight = window.innerHeight - 75;
        scope.restrictedHeight = window.innerHeight - 200;
    });
}

//first call of tellAngular when the dom is loaded
document.addEventListener("DOMContentLoaded", resizeLists, false);

//calling tellAngular on resize event
window.onresize = resizeLists;