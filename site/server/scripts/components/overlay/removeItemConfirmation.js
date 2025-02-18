var React = require( "react" );

var RemoveItemConfirmation = React.createClass({
	getInitialState: function() {
		return {

		};
	},
	render: function() {
		let props = this.props;
		let item = props.item;
		let onClickClose = props.onClickClose;
		let onClickSubmit = props.onClickSubmit;
		let product = props.product;
		return <div className="remove-item-wrapper">
			<div className="content">
				<div className="message">
					<p className="copy">Are you sure you want to delete this item?</p>
				</div>
				<div className="item">
					<div className="image" style={{
						backgroundImage: `url( "${ item.image.list && item.image.list.length ? item.image.list[0] : "https://placehold.it/320x320" }" )`
					}}>
						<img src={ item.image.list && item.image.list.length ? item.image.list[0] : "https://placehold.it/320x320" } alt="" />
					</div>
					<div className="description">
						<span>{ product.item.model }</span>
						<span>{ `Article #: ${ item.xref || "N/A" }` }</span>
						<span>{ `VW SKU #: ${ item.part_number }` }</span>
						<div className="specifications">
							<span>{ `Size: ${ item.specification.size }` }</span>
							{ item.specification.finish ? <span>{ `Finish: ${ item.specification.finish }` }</span> : null }
						</div>
					</div>
				</div>
			</div>
			<div className="buttons">
				<div className="cta cta--button remove-from-cart">
					<span className="copy" onClick={ onClickSubmit }>Delete</span>
					<div className="icons">
						<span className="icon loading-icon"></span>
						<span className="icon error-icon"></span>
						<span className="icon success-icon"></span>
					</div>
				</div>
				<button className="cta cta--button--white" onClick={ onClickClose }>Keep Shopping</button>
			</div>
		</div>;
	}
});

module.exports = RemoveItemConfirmation;
