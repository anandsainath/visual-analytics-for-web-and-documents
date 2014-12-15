/*javascript external to angular applies to a scope*/

function resizeLists() {
    var domElt = document.getElementById('bodyContainer');
    scope = angular.element(domElt).scope();
    scope.$apply(function() {

        scope.width = window.innerWidth - 40;
        scope.height = window.innerHeight;
        scope.gridHeight = window.innerHeight - 75;
        scope.restrictedHeight = window.innerHeight - 200;
        console.log(scope.restrictedHeight);
    });
}

//first call of tellAngular when the dom is loaded
document.addEventListener("DOMContentLoaded", resizeLists, false);

//calling tellAngular on resize event
window.onresize = resizeLists;

$(function(){
	var select_array = $('select');

	if(select_array.length){
		console.log(select_array);
		$(select_array[0]).val("Author Name");
		$(select_array[1]).val("Conference");
		$(select_array[2]).val("Year");
		
		select_array.trigger('change');	
	}
});