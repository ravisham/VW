import React from "react";
import { DisableCheckout } from '../../SharedComponents';

class FilterResult extends React.Component
{
	constructor( props, context )
	{
		super( props );

		let item = props.item;
		let inventory = item.inventory;
		let availableLocations = {};
		let location = props.warehouse;
		let warehouses = props.warehouses;

		Object.keys( inventory ).forEach(function( key, index, array )
		{
			let quantity = inventory[key];
			if( quantity )
			{
				if( !location ) location = key;
				availableLocations[key] = quantity;
			}
		});

		this.state = {
			availableLocations: availableLocations,
			item: item,
			location: location || null,
			quantity: "",
			warehouses: warehouses
		};
	}

	componentWillReceiveProps( props )
	{
		let setState = this.setState.bind( this );
		let item = props.item;
		let inventory = item.inventory;
		let availableLocations = {};
		let location = props.warehouse;
		let warehouses = props.warehouses;

		Object.keys( inventory ).forEach(function( key, index, array )
		{
			let quantity = inventory[key];
			if( quantity )
			{
				if( !location ) location = key;
				availableLocations[key] = quantity;
			}
		});

		setState({
			availableLocations: availableLocations,
			item: item,
			location: location || null,
			quantity: "",
			warehouses: warehouses
		});
	}

	onChangeLocation( event )
	{
		let state = this.state;
		let setState = this.setState.bind( this );
		let availableLocations = state.availableLocations;
		let location = state.location;
		let target = event.target;
		let value = target.value;
		let isAvailable = availableLocations[value] ? true : false;

		setState({
			location: isAvailable ? value : location
		});
	}

	onChangeQuantity( event )
	{
		let state = this.state;
		let setState = this.setState.bind( this );
		let quantity = state.quantity;
		let target = event.target;
		let value = target.value;

		setState({
			quantity: value === "" || (!isNaN( value ) && parseInt( value ) >= 0) ? value : quantity
		});
	}

	onClickAddItem( id, location, quantity, event )
	{
		let props = this.props;
		let onClickAddItem = props.onClickAddItem;
		onClickAddItem( event, id, location, quantity );
	}

	onClickItem( categoryProperties, item, event )
	{
		let props = this.props;
		let onClickItem = props.onClickItem;
		onClickItem( event, categoryProperties, item );
	}

	preventDefault( event ) {
		event.preventDefault();
	}

	render()
	{
		let props = this.props;
		let categoryProperties = props.categoryProperties;
		let state = this.state;
		let availableLocations = state.availableLocations;
		//console.log('availableLocations', availableLocations);
		let item = state.item;
		let location = state.location;
		let quantity = state.quantity;
		let warehouses = state.warehouses;
		//console.log('warehouses', warehouses);
		let onChangeLocation = this.onChangeLocation.bind( this );
		let onChangeQuantity = this.onChangeQuantity.bind( this );
		let onClickAddItem = this.onClickAddItem.bind( this, item.id, location, quantity );
		let onClickItem = this.onClickItem.bind( this, categoryProperties, item );
		let preventDefault = this.preventDefault.bind( this );
		let inventory = item.inventory;
		//console.log('inventory', inventory);
		let price = item.price;
		let specification = item.specification;

		let hasPrice = !isNaN( price ) && parseFloat( price ) > 0 ? true : false;
		let hasQuantity = !isNaN( quantity ) && parseInt( quantity ) > 0 ? true : false;
		let hasAvailable = Object.keys( availableLocations ).length ? true : false;
		let isAvailable = location && availableLocations[location];
		//let hasPriceAndUserAllow = hasPrice && (DisableCheckout == 'n') ? true : false;
		let addToCart = isAvailable && hasQuantity ?
			<td>
				<div className="cta cta--button add-to-cart">
					<span className="copy" onClick={ onClickAddItem }>Add</span>
					<div className="icons">
						<span className="icon loading-icon"/>
						<span className="icon error-icon"/>
						<span className="icon success-icon"/>
					</div>
				</div>
			</td> : 
			<td><button className={ `cta cta--button ${ isAvailable ? "inactive" : "disabled" }` } onClick={ preventDefault }>Add</button></td>;

		let inputQuantity = isAvailable ? 
			<td className="qty"><input name="qty" type="text" value={ quantity } onChange={ onChangeQuantity } autoComplete="off" /></td> : 
			<td className="qty"><input name="qty" type="text" value="" disabled onChange={ preventDefault } /></td>;

		let user = this.props.user;
		let priceText = user.isDTCUser ? null : <td>${ parseFloat(price).toFixed(2) }</td>;
		let hasPriceAndUserAllow = hasPrice && (DisableCheckout() == 'n') ? true : false;
		return <tr>
			<td><a href="#" onClick={ onClickItem }><span>{ item.xref || "N/A" }</span></a></td>
			<td><a href="#" onClick={ onClickItem }>{ item.part_number }</a></td>
			{
				categoryProperties.map(function( property, index, array )
				{
					if( property.hide ) return null;

					let key = property.key;
					let propLabel = property.label;
					let value = specification[key];
					let label;

					switch( propLabel )
					{
						case "Info":
						case "Additional Info":
							//combine for table
							let sValue = specification["special_notes"];
							label = (value||sValue) ? <a href="#" onClick={ onClickItem }>View</a> : null;
							break;
						default:
							label = value;
							break;
					}

					return <td>{ label }</td>;
				})
			}
			{ 
				hasAvailable ? 
					<td>
						<select value={ location } onChange={ onChangeLocation }>{
						Object.keys( inventory ).map( function( key, index, array )
						{
							let warehouse = warehouses[key];
							let option;
							if ((warehouse) && (warehouse.isLive !== false))
							{
								let inventoryAvailable = `${ warehouse.shortName } - ${ Math.round( inventory[key] )}`;
								let isDisabled = !availableLocations[key] ? true : false;
								option = isDisabled ? <option value={ key } disabled >{ inventoryAvailable }</option> : <option value={ key }>{ inventoryAvailable }</option>;
							}

							return option;
						})
					}</select>
					</td> :
					<td>
						<select value="out-of-stock" disabled onChange={ preventDefault } >
							<option value="out-of-stock" disabled >Out of Stock</option>
						</select>
					</td>
			}
			{ hasPrice ? priceText : null }
			{ hasPriceAndUserAllow ? inputQuantity : <td className="qty"><input name="qty" className='qty_disabled' type="text" value="N/A" disabled onChange={ preventDefault } /></td> }
			{ hasPriceAndUserAllow ? addToCart : <td><button className="cta cta--button call-to-order" onClick={ onClickItem }>Call</button></td> }
		</tr>;
	}
}

module.exports = FilterResult;
