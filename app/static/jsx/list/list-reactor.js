/** @jsx React.DOM */

/** Click handlers **/
function createItemClickHandler(reactComponent){
	var scope = reactComponent.props.scope;
	return scope.$apply.bind(
		scope,
		scope.onReactItemClick(null, reactComponent)
	);
}

window.ReactItem = React.createClass({
	render: function(){
		var item = this.props.item;

		var clickHandler = createItemClickHandler(this);

		return (
			<li className="row">
				<div className="col-xs-2 bar-container" title={item.count}>
					<div className="bar" style={{width: (1-item.frequency)*160 +'%'}}></div>
				</div>
				<span className="col-xs-10 padding-right-25 ellipsize" style={{'background-color': item.background}} onClick={clickHandler}> {item.name} </span> 
			</li>
		);
	}
});

window.ReactItemList = React.createClass({
	render: function(){
		console.log("INside Item list");
		var scope = this.props.scope;
		var data = scope.data;

		var rows = data.map(function(item){
			return(
				<ReactItem item={item} scope={scope} />
			);
		});

		return(
			<ul className="js-items-list">{rows}</ul>
		);
	}
});