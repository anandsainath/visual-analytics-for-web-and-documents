/** @jsx React.DOM */

/** Click handlers **/
function createItemClickHandler(reactComponent){
	var scope = reactComponent.props.scope;
	return scope.$apply.bind(
		scope,
		scope.onReactItemClick(null, reactComponent)
	);
}

window.ReactItem = React.createClass({displayName: 'ReactItem',
	render: function(){
		var item = this.props.item;

		var clickHandler = createItemClickHandler(this);

		return (
			React.createElement("li", {className: "row"}, 
				React.createElement("div", {className: "col-xs-2 bar-container", title: item.count}, 
					React.createElement("div", {className: "bar", style: {width: (1-item.frequency)*160 +'%'}})
				), 
				React.createElement("span", {className: "col-xs-10 padding-right-25 ellipsize", style: {'background-color': item.background}, onClick: clickHandler}, " ", item.name, " ")
			)
		);
	}
});

window.ReactItemList = React.createClass({displayName: 'ReactItemList',
	render: function(){
		console.log("INside Item list");
		var scope = this.props.scope;
		var data = scope.data;

		var rows = data.map(function(item){
			return(
				React.createElement(ReactItem, {item: item, scope: scope})
			);
		});

		return(
			React.createElement("ul", {className: "js-items-list"}, rows)
		);
	}
});