import React from "react";
import ReactDOM from "react-dom";
import { QuantityLimitText, TollFreeNumber, DisableCheckout } from '../SharedComponents';

class ItemDetails extends React.Component {
	constructor( props, context ) {
		super( props );
		let item = props.item;
		let warehouses = props.warehouses;
		let inventory = item.inventory;
		let availableLocations = __hasLocations( inventory );
		this.state = {
			availableLocations: availableLocations,
			locations: {},
			warehouses: warehouses
		};
	}
	componentWillReceiveProps( props ) {
		let setState = this.setState.bind( this );
		let item = props.item;
		let warehouses = props.warehouses;
		let inventory = item.inventory;
		let availableLocations = __hasLocations( inventory );
		setState({
			availableLocations: availableLocations,
			locations: {},
			warehouses: warehouses
		});
	}
	onChangeLocation( event ) {
		let state = this.state;
		let setState = this.setState.bind( this );
		let target = event.target;
		let value = target.value;
		let locations = state.locations;
		let location = locations[value];
		if( location ) {
			delete locations[value];
		}
		else {
			locations[value] = { quantity: "" };
		}
		setState({
			locations: locations
		});
	}
	onChangeQuantity( key, value ) {
		let state = this.state;
		let setState = this.setState.bind( this );
		let locations = state.locations;
		if( !value || isNaN( value ) || parseInt( value ) <= 0 ) {
			delete locations[key];
		}
		else {
			locations[key] = { quantity: value };
		}
		setState({
			locations: locations
		});
	}
	onClickAddItems( id, locations, event ) {
		let props = this.props;
		let onClickAddItems = props.onClickAddItems;
		onClickAddItems( event, id, locations );
	}
	onClickClose( event ) {
		let props = this.props;
		let onClickClose = props.onClickClose;
		onClickClose( event );
	}
	preventDefault( event ) {
		event.preventDefault();
	}
	render() {
		let that = this;
		let props = this.props;
		let categoryProperties = props.categoryProperties;
		let item = props.item;
		let user = props.user;
		let productDetails = props.productDetails;
		let state = this.state;
		let availableLocations = state.availableLocations;
		let locations = state.locations;
		let warehouses = state.warehouses;
		let onChangeQuantity = this.onChangeQuantity.bind( this );
		let onChangeLocation = this.onChangeLocation.bind( this );
		let onClickClose = this.onClickClose.bind( this );
		let preventDefault = this.preventDefault.bind( this );
		let inventory = item.inventory;
		let price = item.price;
		let specification = item.specification;
		let hasPrice = !isNaN( price ) && parseFloat( price ) > 0 ? true : false;
		let hasQuantities = __hasQuantities( locations );
		let isAvailable = Object.keys( availableLocations ).length ? true : false;
		let brandLogo = (productDetails.brand && productDetails.brand.logo) ? productDetails.brand.logo : "https://placehold.it/160x160";
		let addToCart = isAvailable && hasQuantities ?
			<div className="cta cta--button add-to-cart">
				<span className="copy" onClick={ that.onClickAddItems.bind( that, item.id, locations ) }>Add To Cart</span>
				<div className="icons">
					<span className="icon loading-icon"></span>
					<span className="icon error-icon"></span>
					<span className="icon success-icon"></span>
				</div>
			</div> :
			<div className={ `cta cta--button add-to-cart ${ isAvailable ? "inactive" : "disabled" }` } onClick={ preventDefault }><span className="copy">{ isAvailable ? "Add To Cart" : "Out Of Stock" }</span></div>;

		let priceBlock = (! user.isDTCUser && hasPrice ) ? <span>{ `Price : $${ parseFloat(price).toFixed(2) } `}</span> : null;

		return <div className="item-details-wrapper">
			<div className="half">
				<div className="left">
					<div className="image" style={{
						backgroundImage: `url( "${ item.image.list && item.image.list.length ? item.image.list[0] : "https://placehold.it/320x320" }" )`
					}}>
						<img src={ item.image.list && item.image.list.length ? item.image.list[0] : "https://placehold.it/320x320" } alt="" />
					</div>
				</div>
				<div className="right">
					<div className="product-info">
						<div className="image" style={{
							backgroundImage: `url( "${ brandLogo }" )`
						}}>
							<img src={ brandLogo } alt="" />
						</div>
						<span>{ productDetails.name }</span>
						{ specification.finish ? <span>{ specification.finish }</span> : null }
						<span>{ `Article #: ${ item.xref || "N/A" }` }</span>
						<span>{ `VW SKU #: ${ item.part_number }` }</span>
						{ priceBlock }
						<p>{ productDetails.description }</p>
						
					</div>
					<ItemDetailSpecifications
						categoryProperties={ categoryProperties }
						specification={ specification }
					/>
				</div>
			</div>
			<div className="half">
				<ItemDetailWarehouses
					inventory={ inventory }
					item={ item }
					locations={ locations }
					onChangeLocation={ onChangeLocation }
					onChangeQuantity={ onChangeQuantity }
					preventDefault={ preventDefault }
					warehouses={ warehouses }
					user = { user }
				/>
				<div className="buttons">
					<button className="cta cta--button--white" onClick={ onClickClose }>Keep Shopping</button>
			
					{
						hasPrice && (DisableCheckout() == 'n') ? addToCart : <div className="call-to-order">
							<span>To Place An Order For This Product,</span>
							<span>Please Call </span><a href="#">{TollFreeNumber()}</a>
						</div>
					}
				</div>
			</div>
		</div>;
	}
};

class ItemDetailSpecifications extends React.Component {
	constructor( props, context ) {
		super( props );
	}
	render() {
		let props = this.props;
		let categoryProperties = props.categoryProperties;
		let specification = props.specification;
		let fields = [];
		let note, info;
		categoryProperties.forEach(function( property, index, array ) {
			let key = property.key;
			let value = specification[key];
			if( value ) {
				switch( key ) {
					case "additional_info":
						info = <p>{ value }</p>;
					break;
					case "special_notes":
						note = <p>{ value }</p>;
					break;
					default:
						fields.push( <li>{ `${ property.label } - ${ specification[key] }` }</li> );
					break;
				}
			}
		});
		return <div className="item-info">
			<div className="item-info-specifications">
				<strong>SPECS:</strong>
				<ul>{ fields }</ul>
			</div>
			{
				note ? <div className="item-info-note">
					<strong>ITEM NOTE:</strong>
					{ note }
				</div> : null
			}
			{
				info ? <div className="item-info-additional">
					<strong>ADDITIONAL INFO:</strong>
					{ info }
				</div> : null
			}
		</div>;
	}
};

class ItemDetailWarehouses extends React.Component {
	constructor( props, context ) {
		super( props );
	}
	onChangeQuantity( key, event ) {
		let props = this.props;
		let onChangeQuantity = props.onChangeQuantity;
		let target = event.target;
		let value = target.value;
		onChangeQuantity( key, value );
	}
	render() {
		let that = this;
		let props = this.props;
		let inventory = props.inventory;
		let item = props.item;
		let locations = props.locations;
		let onChangeLocation = props.onChangeLocation;
		let preventDefault = props.preventDefault;
		let warehouses = props.warehouses;
		let price = item.price;
		let hasPrice = !isNaN( price ) && parseFloat( price ) > 0 ? true : false;

		let warehouseNote = !props.user.isDTCUser ? null : <p className="warehouses--note">Please note for Wheel and Tire products: Max quantity that can be ordered is 12</p>
		return <div className="warehouses">
			<p className="warehouses--label">This product is available at these warehouses.</p>
			{ warehouseNote }

			<form>
				<div className="fields">{
					Object.keys( inventory ).map(function( key, index, array ) {
						let warehouse = warehouses[key];
						let field;
						if ((warehouse) && (warehouse.isLive)) {
							let inventoryQuantity = inventory[key];
							let location = locations[key];
							let locationInput = !inventoryQuantity ?
								<input name="location" type="checkbox" checked={ false } disabled onChange={ preventDefault } /> :
								<input name="location" type="checkbox" value={ key } checked={ location ? true : false } onChange={ onChangeLocation } />;
							let quantityInput = !inventoryQuantity ?
								<input name="qty" type="text" value="" disabled onChange={ preventDefault } /> :
								<input name="qty" type="text" value={ location ? location.quantity : "" } onChange={ that.onChangeQuantity.bind( that, key ) } autoComplete="off" />;
							field = <div className={ inventoryQuantity || !hasPrice ? "field" : "field disabled" }>
								<label>
									{ hasPrice && (DisableCheckout() == 'n') ? locationInput : null }
									<span>{warehouse.shortName}: Inventory - {inventoryQuantity}</span>
								</label>
								{
									hasPrice && (DisableCheckout() == 'n') ? <div className="quantity">
										<label>
											<span>QTY:</span>
											{ quantityInput }
										</label>
									</div> : null
								}
							</div>;
						}
						return field;
					})
				}</div>
			</form>
		</div>;
	}
};

module.exports = ItemDetails;

function __hasLocations( inventory ) {
	let availableLocations = {};
	Object.keys( inventory ).forEach(function( key, index, array ) {
		let quantity = inventory[key];
		if( quantity ) {
			availableLocations[key] = quantity;
		}
	});
	return availableLocations;
};

function __hasQuantities( locations ) {
	let locationKeys = Object.keys( locations );
	let hasLocationKeys = locationKeys.length ? true : false;
	let hasQuantities = true;
	if( hasLocationKeys ) {
		locationKeys.forEach(function( key, index, array ) {
			let location = locations[key];
			let quantity = location.quantity;
			if( !quantity || isNaN( quantity ) || parseInt( quantity ) <= 0 ) {
				hasQuantities = false;
			}
		});
	}
	else {
		hasQuantities = false;
	}
	return hasQuantities;
};
