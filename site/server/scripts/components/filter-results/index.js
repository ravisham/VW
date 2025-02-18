import React from "react";
import ReactDOM from "react-dom";
import FilterResult from "./partials/result";
import { QuantityLimitText } from '../SharedComponents';

class FilterResults extends React.Component {
	constructor( props, context ) {
		super( props );
		let parsed = __parseProps({
			limits: {
				items: {},
				max: 0,
				results: 8
			}
		}, props );
		this.state = {
			limits: parsed.limits,
			properties: __generateProperties(),
			results: parsed.results,
			warehouse: parsed.warehouse,
			warehouses: parsed.warehouses
		};
	}
	componentDidMount() {
		let onScroll = this.onScroll.bind( this );
		window.addEventListener( "scroll", onScroll, false );
	}
	componentWillReceiveProps( props ) {
		let state = this.state;
		let setState = this.setState.bind( this );
		let element = ReactDOM.findDOMNode( this );
		let isActive = props.active;
		if( isActive ) {
			let parsed = __parseProps( state, props );
			element.scrollTop = 0;
			setState({
				limits: parsed.limits,
				results: parsed.results,
				warehouse: parsed.warehouse,
				warehouses: parsed.warehouses
			});
		}
	}
	onClickAddItem( event, id, location, quantity ) {
		let props = this.props;
		let onClickAddItem = props.onClickAddItem;
		onClickAddItem( event, id, location, quantity );
	}
	onClickItem( productDetails, event, categoryProperties, item ) {
		let props = this.props;
		let onClickItem = props.onClickItem;
		onClickItem( event, productDetails, categoryProperties, item );
	}
	onClickItemImage( productDetails, finishes, finish, event ) {
		let props = this.props;
		let onClickItemImage = props.onClickItemImage;
		let brandName = productDetails.brand.name;
		let productName = productDetails.name;
		let image = finishes[finish].image;
		onClickItemImage( event, brandName, productName, finish, image );
	}
	onClickShowLess( productDetails, finish, event ) {
		let state = this.state;
		let setState = this.setState.bind( this );
		let element = ReactDOM.findDOMNode( this );
		let limits = state.limits;
		let results = state.results;
		let productId = productDetails.id;
		event.preventDefault();
		if( limits.items[productId][finish] > 8 ) {
			limits.items[productId][finish] -= 8;
		}
		setState({
			limits: limits
		});
	}
	onClickShowMore( productDetails, finish, event ) {
		let state = this.state;
		let setState = this.setState.bind( this );
		let element = ReactDOM.findDOMNode( this );
		let limits = state.limits;
		let results = state.results;
		let productId = productDetails.id;
		event.preventDefault();
		if( limits.items[productId][finish] < results[productId].finishes[finish].items.length ) {
			limits.items[productId][finish] += 8;
		}
		setState({
			limits: limits
		});
	}
	onNoResults() {
		let props = this.props;
		let onNoResults = props.onNoResults;
		return onNoResults();
	}
	onScroll( event ) {
		let props = this.props;
		let state = this.state;
		let setState = this.setState.bind( this );
		let isActive = props.active;
		let limits = state.limits;
		let limit = limits.results;
		let max = limits.max;
		let element = ReactDOM.findDOMNode( this );
		let elementRect = element.getBoundingClientRect();
		let elementBottom = elementRect.bottom;
		let windowHeight = window.innerHeight;
		if( isActive && limit < max && elementBottom <= windowHeight ) {
			limits.results += 8;
			setState({
				limits: limits
			});
		}
	}

	renderFinish( productDetails, finishes, finish, categoryProperties, limits, warehouses, warehouse )
	{
		// console.log( "RENDER FINISH: ", productDetails );

		let onClickItemImage = this.onClickItemImage.bind( this, productDetails, finishes, finish );
		let onClickShowLess = this.onClickShowLess.bind( this, productDetails, finish );
		let onClickShowMore = this.onClickShowMore.bind( this, productDetails, finish );
		let renderItems = this.renderItems.bind( this );
		// let category = productDetails.type;
		let productId = productDetails.id;
		let productBrand = productDetails.brand;
		let limit = limits.items[productId][finish];
		let itemsLength = finishes[finish].items.length;
		let itemsVisibleLength = limit >= itemsLength ? itemsLength : limit;

		let specifications = categoryProperties.map(function( property, index, array )
		{
			if (property.hide) return null;
			return <th>{ property.label }</th>;
		});

		let items = renderItems( productDetails, finishes, finish, categoryProperties, limits, warehouses, warehouse );

		// console.log( "ITEMS: ", items );

		let user = this.props.user;
		let priceLabel = user.isDTCUser ? null : <th>Price</th>;
		
		return <div className="filter-results__result">
			<div className="filter-results__result--product-info">
				<div className="image">
					<a href="#" onClick={ onClickItemImage }><img src={ finishes[finish].image } alt="" /></a>
				</div>
				<div className="text">
					<p>{ productBrand.name }</p>
					<a className="product-name" href="#" onClick={ onClickItemImage }>{ productDetails.name }</a>
					{ finish !== "null" ? <p>{ finish }</p> : null }
				</div>
			</div>
			<table>
				<thead>
					<tr>
						<th>Article #</th>
						<th>VW SKU #</th>
						{ specifications }
						<th>Inventory</th>
						{ priceLabel }
						<th className="qty">QTY</th> 
						<th>Order</th> 
					</tr>
				</thead>
				<tfoot className="filter-results__result--footer">
					<tr>
						<td colSpan="2"><span className="current-visible">{ `Results ${ itemsVisibleLength } of ${ itemsLength }` }</span></td>
						<td className="menu" colSpan={ specifications.length }>
							{ limit > 8 ? <a className="showLess" href="#" onClick={ onClickShowLess }>Show Less</a> : null }
							{ limit < itemsLength ? <a className="showMore" href="#" onClick={ onClickShowMore }>Show More</a> : null }
						</td>
						<td colSpan="1"/>
					</tr>
				</tfoot>
				{ items }
			</table>
		</div>;
	}
	renderFinishes( product, categoryProperties, limits, warehouses, warehouse, count ) {
		let renderFinish = this.renderFinish.bind( this );
		let productDetails = product.details;
		let finishes = product.finishes;
		let limit = limits.results;
		let currentLimit = limit - count;
		let index = 0;
		let children = [];
		let finishNames = Object.keys( finishes );
		let finishNamesLength = finishNames.length;
		currentLimit = finishNamesLength < currentLimit ? finishNamesLength : currentLimit;
		while( index < currentLimit ) {
			let finish = finishNames[index];
			let child = renderFinish( productDetails, finishes, finish, categoryProperties, limits, warehouses, warehouse );
			children.push( child );
			index++;
		}
		return children;
	}

	renderItem( productDetails, categoryProperties, item, warehouses, warehouse )
	{
		let onClickAddItem = this.onClickAddItem.bind( this );
		let onClickItem = this.onClickItem.bind( this, productDetails );

		// console.log("RENDER ITEM: ", productDetails, item );

		return <FilterResult
			categoryProperties={ categoryProperties }
			item={ item }
			user = { this.props.user }
			onClickAddItem={ onClickAddItem }
			onClickItem={ onClickItem }
			warehouse={ warehouse }
			warehouses={ warehouses }
		/>;
	}

	renderItems( productDetails, finishes, finish, categoryProperties, limits, warehouses, warehouse )
	{
		let renderItem = this.renderItem.bind( this );
		let productId = productDetails.id;
		let limit = limits.items[productId][finish];
		let index = 0;
		let children = [];
		let items = finishes[finish].items;
		let itemsLength = items.length;

		limit = itemsLength < limit ? itemsLength : limit;

		while( index < limit )
		{
			let item = items[index];
			let child = renderItem( productDetails, categoryProperties, item, warehouses, warehouse );

			// console.log( "ITEM CHILD: ", child.props.item.price );

			children.push( child );
			if( index < limit - 1 ) {
				children.push( <tr className="spacer" /> );
			}
			index++;
		}

		return <tbody>
			{ children }
		</tbody>;
	}

	renderProduct( product, properties, limits, warehouses, warehouse, count )
	{
		let renderFinishes = this.renderFinishes.bind( this );
		let details = product.details;
		let category = details.type;
		let categoryProperties = properties[category];
		let children = renderFinishes( product, categoryProperties, limits, warehouses, warehouse, count );
		return children;
	}

	renderProducts( results, properties, limits, warehouses, warehouse )
	{
		let onNoResults = this.onNoResults.bind( this );
		let renderProduct = this.renderProduct.bind( this );
		let limit = limits.results;
		let count = 0;
		let index = 0;
		let children = [];
		let productIds = Object.keys( results );
		let productIdsLength = productIds.length;

		console.log({
			results: results,
			properties: properties,
			limits: limits,
			warehouses: warehouses,
			warehouse: warehouse
		});

		// Hard coding the field for now
		// but making it a variable for flexibility in the future
		const sortField = 'part_number';
		// Sort the product ids by a given field
		productIds.sort((a, b) => {
			try {
				// To get to the sort property, we have to compare
				// each item's finishes
				let finishesA = results[a].finishes;
				let finishesB = results[b].finishes;
				// taking the first finish within each
				let firstFinishA = Object.keys(finishesA)[0];
				let firstFinishB = Object.keys(finishesB)[0];
				// and then the first item in the items array within that
				let firstItemA = finishesA[firstFinishA].items[0];
				let firstItemB = finishesB[firstFinishB].items[0];
				// then look at the property within the item we want to compare
				let valueA = firstItemA[sortField].toString();
				let valueB = firstItemB[sortField].toString();
				return valueA.localeCompare(valueB);
			} catch (e) {
				return 0;
			}
		});

		while( index < productIdsLength && count < limit )
		{
			let productId = productIds[index];
			let product = results[productId];
			let child = renderProduct( product, properties, limits, warehouses, warehouse, count );
			children.push( child );
			count += child.length;
			index++;
		}

		return <div className="filter-results__content">
			{ children.length ? children : onNoResults() }
		</div>;
	}

	render()
	{
		let props = this.props;
		let state = this.state;
		let renderProducts = this.renderProducts.bind( this );
		let isActive = props.active;
		let limits = state.limits;
		let properties = state.properties;
		let results = state.results;
		let warehouse = state.warehouse;
		let warehouses = state.warehouses;
		let products = isActive ? renderProducts( results, properties, limits, warehouses, warehouse ) : null;

		// console.log( "render FilterResults" );
		// console.log( isActive );
		// console.log( results );
		// console.log( "PRODUCTS: ", products );

		return <div className="filter-results--wrapper">
			<h2 className="filter-results__title">Search Results</h2>
			<QuantityLimitText classNames={'filter-results__note'} />
			{ products }
		</div>;
	}
};

module.exports = FilterResults;

// function __generateLimit( currentLimit, productItemsLength, show ) {
function __generateLimit( currentLimit, productItemsLength ) {
	// if( show ) {
	// 	console.log( "currentLimit" );
	// 	console.log( currentLimit );
	// 	console.log( "productItemsLength" );
	// 	console.log( productItemsLength );
	// }
	let limit = currentLimit <= productItemsLength ? currentLimit : productItemsLength + (currentLimit % productItemsLength);
	return limit;
};
function __generateProperties() {
	return {
		accessory: [
			{
				key: "size",
				label: "Size"
			}, {
				key: "description_2",
				label: "Description"
			}, {
				key: "finish",
				label: "Finish"
			}, {
				key: "additional_info",
				label: "Additional Info"
			}, {
				key: "special_notes",
				label: "Item Note",
				hide: true //dont show in results table
			}
		],
		tire: [
			{
				key: "size",
				label: "Size"
			}, {
				key: "search_description",
				label: "Search Size"
			}, /*{
				key: "model",
				label: "Pattern"
			},*/ {
				key: "ply",
				label: "PLY"
			}, {
				key: "additional_info",
				label: "Additional Info"
			}, {
				key: "special_notes",
				label: "Item Note",
				hide: true //dont show in results table
			}
		],
		wheel: [
			{
				key: "diameter",
				label: "Diam."
			}, {
				key: "width",
				label: "Width"
			}, {
				key: "boltpattern1",
				label: "Bolt Pattern"
			}, 
			{
				key: "boltpattern2",
				label: "Bolt Pattern 2",
			},
			{
				key: "cap_bore_load",
				label: "Cap/Bore/Load",
				hide: true //dont show in results table
			},
			{
				key: "backspace",
				label: "Backspace"
			}, {
				key: "offset",
				label: "Offset"
			}, {
				key: "additional_info",
				label: "Info"
			}, {
				key: "special_notes",
				label: "Item Note",
				hide: true //dont show in results table
			}
		],
	};
};
function __parseProps( state, props ) {
	let brands = props.brands;
	let items = props.items;
	let products = props.products;
	let warehouse = props.warehouse;
	let warehouses = props.warehouses;
	let productIds = Object.keys( items );
	let productIdsLength = productIds.length;
	let limits = {
		items: {},
		max: 0,
		results: 8
	};
	let results = {};
	let index = 0;
	while( index < productIdsLength ) {
		let productId = productIds[index];
		let productItems = items[productId];
		let product = products[productId];
		let productBrandId = product.brand_id;
		product.brand = brands[productBrandId];
		limits.items[productId] = {};
		results[productId] = {
			details: product,
			finishes: {}
		};
		productItems.forEach(function( item, indx, array ) {
			let specification = item.specification;
			let finish = specification.finish;
			// if( !limits.items[productId][finish] ) {
			// 	if( index === 0 && indx === 0 ) {
			// 		if( state.limits.items[productId] && state.limits.items[productId][finish] ) {
			// 			console.log( "__generateLimit( state.limits.items[productId][finish], productItems.length )" );
			// 			console.log( __generateLimit( state.limits.items[productId][finish], productItems.length, true ) );
			// 			console.log( "state.limits.items[productId] && state.limits.items[productId][finish] && (productItems.length > 8) ? __generateLimit( state.limits.items[productId][finish], productItems.length ) : 8" );
			// 			console.log( state.limits.items[productId] && state.limits.items[productId][finish] && (productItems.length > 8) ? __generateLimit( state.limits.items[productId][finish], productItems.length, true ) : 8 );
			// 		}
			// 	}
			// 	limits.items[productId][finish] = state.limits.items[productId] && state.limits.items[productId][finish] && (productItems.length > 8) ? __generateLimit( state.limits.items[productId][finish], productItems.length ) : 8;
			// 	limits.max++;
			// }
			// if( !results[productId].details.brand ) {
			// 	results[productId].details.brand = specification.brand;
			// }
			if( !results[productId].finishes[finish] ) {
				results[productId].finishes[finish] = {
					image: item.image && item.image.list && item.image.list.length ? item.image.list[0] : "https://placehold.it/160x160",
					items: []
				};
			}
			results[productId].finishes[finish].items.push( item );
		});
		index++;
	}
	Object.keys( results ).forEach(function( productId, indx, array ) {
		let finishes = results[productId].finishes;
		Object.keys( finishes ).forEach(function( finish, ndx, array ) {
			let obj = finishes[finish];
			let items = obj.items;
			// let show = ndx === 0;
			// let show = finish === "Matte Black" && productId === "10219";
			// limits.items[productId][finish] = state.limits.items[productId] && state.limits.items[productId][finish] && (items.length > 8) ? __generateLimit( state.limits.items[productId][finish], items.length, show ) : 8;
			limits.items[productId][finish] = state.limits.items[productId] && state.limits.items[productId][finish] && (items.length > 8) ? __generateLimit( state.limits.items[productId][finish], items.length ) : 8;
			limits.max++;
		});
	});
	return {
		limits: limits,
		results: results,
		warehouse: warehouse,
		warehouses: warehouses
	};
};
