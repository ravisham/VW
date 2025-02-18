import React from "react";
import ReactDOM from "react-dom";

class ItemImage extends React.Component {
	constructor( props, context ) {
		super( props );
		this.state = {

		};
	}
	render() {
		let props = this.props;
		return <div className="item-image-wrapper">
			<div className="item-image-thumbnail" style={{
				backgroundImage: `url( "${ props.image }" )`
			}}>
				<a href={ props.image } target="_blank"><img src={ props.image } /></a>
			</div>
			<p className="item-image-text">
				<span>{ props.brandName }</span><br />
				<span>{ props.productName }</span><br />
				<span>{ props.finish }</span>
			</p>
		</div>;
	}
};

module.exports = ItemImage;
