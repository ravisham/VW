import React from "react";
import ReactDOM from "react-dom";
import FilterTool from "../filter-tool";
import FilterResults from "../filter-results";
import FilterNoResults from "../filter-results/partials/no-results";
import ItemDetails from "../overlay/itemDetails";
import ItemImage from "../overlay/itemImage";
import VehicleFilter from "../filter-tool/VehicleFilter";

// vehicle info that gets displayed in the filter box when the user selects a vehicle.
let vehicleFilterInfo = null;

class HomeDispatcher 
{
	constructor() 
	{
		let that = this;
		let store = {
			brands: {},
			categories: [],
			category: "",
			filters: {},
			items: {},
			products: {},
			search: "",
			specifications: {},
			warehouse: "",
			warehouses: {}
		};
		
		// this.store = __parseStore( store );
		this.store = store;

		this.initialize = this.initialize.bind( this );
		this.applyVehicleFilter = this.applyVehicleFilter.bind( this );
		this.onChangeCategory = this.onChangeCategory.bind( this );
		this.onChangeRadio = this.onChangeRadio.bind( this );
		this.onChangeRange = this.onChangeRange.bind( this );
		this.onChangeValue = this.onChangeValue.bind( this );
		this.onChangeWarehouse = this.onChangeWarehouse.bind( this );
		this.onClickAddItem = this.onClickAddItem.bind( this );
		this.onClickAddItems = this.onClickAddItems.bind( this );
		this.onClickClearCategory = this.onClickClearCategory.bind( this );
		this.onClickClearFilter = this.onClickClearFilter.bind( this );
		this.onClickClearFilters = this.onClickClearFilters.bind( this );
		this.onClickClearFilterValue = this.onClickClearFilterValue.bind( this );
		this.onClickClearSearch = this.onClickClearSearch.bind( this );
		this.onClickClearWarehouse = this.onClickClearWarehouse.bind( this );
		this.onClickClose = this.onClickClose.bind( this );
		this.onClickItem = this.onClickItem.bind( this );
		this.onClickItemImage = this.onClickItemImage.bind( this );
		this.onClickSectionLabel = this.onClickSectionLabel.bind( this );
		this.onMount = this.onMount.bind( this );
		this.onNoResults = this.onNoResults.bind( this );
		this.renderFilter = this.renderFilter.bind( this );
		this.renderResults = this.renderResults.bind( this );
		this.updateCartCount = this.updateCartCount.bind( this );
		this.initFeaturedItemModals = this.initFeaturedItemModals.bind( this );
		this.initFeaturedItemModals();
		// window.addEventListener( "hashchange", function() {
		// 	__parseHash( that.store );
		// 	that.renderFilter();
		// 	that.renderResults();
		// }, false );
	}
	
	initialize() 
	{
		let that = this;
		let result, error;
		
		this.user = {
			isDTCUser : $('body').attr('data-isDTCUser') !== "false"
		}

		$.ajax({
			method: "GET",
			url: "/?json=true",
			dataType: "json",
			success: function( response ) {
				result = response;
			},
			error: function( response ) {
				error = response;
			},
			complete: function( response ) {
				if( !error ) {
					that.store = __parseStore( that.store, result.specifications, result.brands, result.items, result.products, result.warehouse, result.warehouses  );
					that.renderFilter();
					that.renderResults();
					window.addEventListener( "hashchange", function() {
						__parseHash( that.store );
						that.renderFilter();
						that.renderResults();
					}, false );
				}
				else {
					console.log( error );
				}
			}
		});
	}
	onChangeCategory( event ) {
		let store = this.store;
		let renderFilter = this.renderFilter;
		let renderResults = this.renderResults.bind( this, __openFilterSection.bind( this, "specifications" ) );
		let target = event.target;
		let category = target.value;
		__updateCategory( store, category );
		renderFilter( renderResults );
	}
	onChangeRadio( event, category, type, value ) {
		let store = this.store;
		let renderFilter = this.renderFilter;
		let renderResults = this.renderResults;
		let filters = store.filters;
		__clearFilters( store, category, type );
		__updateFilters( store, category, type, value );
		renderFilter( renderResults );
	}
	onChangeRange( category, type, values ) {
		let store = this.store;
		let renderFilter = this.renderFilter;
		let renderResults = this.renderResults;
		let filters = store.filters;
		if( filters[category] && filters[category][type] ) {
			__clearFilters( store, category, type );
		}
		values.forEach(function( value, index, array ) {
			__updateFilters( store, category, type, value );
		});
		renderFilter( renderResults );
	}

	applyVehicleFilter( _filterData )
	{
		console.log( "ON VEHICLE FILTER: ", _filterData );

        if( !_filterData ) return;

        __clearFilters( this.store, 'wheel' );

        // changes category to wheel.
        this.onChangeCategory( {target:{value:'wheel'}});

        vehicleFilterInfo = _filterData.carInfo;

        // goes through filter data and applies it as single checkbox event.
        Object.keys(_filterData.wheelInfo).forEach(( key ) =>
		{
            if( _filterData.wheelInfo[key] )
			{
                _filterData.wheelInfo[key].forEach(( item ) => {
					this.onChangeValue( null, 'wheel', key, item );
				})
			}
		});

        __closeModal();
	}

	onChangeValue( event, category, type, value )
	{
        // checks if user clicked on a checkbox, if not it came from vehicle filter.
        if( event )
        {
            if( ['backspace','boltpattern','diameter','offset','width'].indexOf( type ) > -1 )
            {
                vehicleFilterInfo = null;
            }
        }

		let store = this.store;
		let renderFilter = this.renderFilter;
		let renderResults = this.renderResults;
		let filters = store.filters;

		// added event to check for resetting, if no event is passed it means it was from the vehicle filter and not a toggle.
		if( event && filters[category] && filters[category][type] && filters[category][type][value] ) {
			__clearFilters( store, category, type, value );
		}
		else {
			__updateFilters( store, category, type, value );
		}
		renderFilter( renderResults );
	}
	onChangeWarehouse( event ) {
		let store = this.store;
		let renderFilter = this.renderFilter;
		let renderResults = this.renderResults;
		let target = event.target;
		let warehouse = target.value;
		__updateWarehouse( store, warehouse );
		renderFilter( renderResults );
	}
	onClickAddItem( event, id, location, quantity ) {
		let that = this;
		let target = event.target;
		let $target = $( target );
		let locations = {};
		let result, error;
		event.preventDefault();
		if( $target.hasClass( "copy" ) ) {
			$target = $target.parent();
		}
		if( !$target.hasClass( "toggle" ) ) {
			$target.addClass( "toggle" );
			$target.addClass( "loading" );
			locations[location] = {
				quantity: quantity
			};
			$.ajax({
				method: "POST",
				url: "/cart",
				dataType: "json",
				data: {
					id: id,
					locations: JSON.stringify( locations )
				},
				success: function( response ) {
					result = response;
				},
				error: function( response ) {
					error = response;
				},
				complete: function() {
					$target.removeClass( "loading" );
					if( !error ) {
						$target.addClass( "success" );
						that.updateCartCount(result.data.locations);
						setTimeout(function() { $target.removeClass( "toggle success" ); }, 1000 );
					}
					else {
						console.log( "error" );
						console.log( error );
						$target.addClass( "error" );
						setTimeout(function() { $target.removeClass( "toggle error" ); }, 1000 );
					}
				}
			});
		}
	}
	onClickAddItems( event, id, locations ) {
		let that = this;
		let target = event.target;
		let $target = $( target );
		let result, error;
		event.preventDefault();
		if( $target.hasClass( "copy" ) ) {
			$target = $target.parent();
		}
		if( !$target.hasClass( "toggle" ) ) {
			$target.addClass( "toggle" );
			$target.addClass( "loading" );
			$.ajax({
				method: "POST",
				url: "/cart",
				dataType: "json",
				data: {
					id: id,
					locations: JSON.stringify( locations )
				},
				success: function( response ) {
					result = response;
				},
				error: function( response ) {
					error = response;
				},
				complete: function() {
					$target.removeClass( "loading" );
					if( !error ) {
						$target.addClass( "success" );
						that.updateCartCount(result.data.locations);
						// __closeModal();
						setTimeout(function() { $target.removeClass( "toggle success" ); }, 1000 );
					}
					else {
						console.log( "error" );
						console.log( error );
						$target.addClass( "error" );
						setTimeout(function() { $target.removeClass( "toggle error" ); }, 1000 );
					}
				}
			});
		}
	}
	onClickClearCategory( event ) {
		let store = this.store;
		let renderFilter = this.renderFilter;
		let renderResults = this.renderResults.bind( this, __openFilterSection.bind( this, "categories" ) );
		event.preventDefault();
		__clearCategory( store );
		renderFilter( renderResults );
	}

	onClickClearFilter( event, category, property )
    {
		event.preventDefault();

		let store = this.store;
		let renderFilter = this.renderFilter;
		let renderResults = this.renderResults;
		vehicleFilterInfo = null;

		__clearFilters( store, category, property );
		renderFilter( renderResults );
	}
	onClickClearFilters( event, category )
	{
		// this is being fired from vehicle filter, no event value, getting null object reference error.
		if( event ) event.preventDefault();

		let store = this.store;
		let renderFilter = this.renderFilter;
		let renderResults = this.renderResults.bind( this, __openFilterSection.bind( this, "categories" ) );

		__clearCategory( store );
		__clearFilters( store, category );
		__clearSearch( store );
		renderFilter( renderResults );
	}
	onClickClearFilterValue( event, category, property, value )
	{
		event.preventDefault();

        vehicleFilterInfo = null;

		let store = this.store;
		let renderFilter = this.renderFilter;
		let renderResults = this.renderResults;

		__clearFilters( store, category, property, value );
		renderFilter( renderResults );
	}
	onClickClearSearch( event ) {
		let store = this.store;
		let renderFilter = this.renderFilter;
		let renderResults = this.renderResults;
		event.preventDefault();
		__clearSearch( store );
		renderFilter( renderResults );
	}
	onClickClearWarehouse( event ) {
		let store = this.store;
		let renderFilter = this.renderFilter;
		let renderResults = this.renderResults;
		event.preventDefault();
		__clearWarehouse( store );
		renderFilter( renderResults );
	}
	onClickClose( event ) {
		event.preventDefault();
		__closeModal();
	}
	onClickItem( event, productDetails, categoryProperties, item ) {
		let store = this.store;
		let warehouses = store.warehouses;
		let onClickAddItems = this.onClickAddItems;
		let onClickClose = this.onClickClose;
		event.preventDefault();
		__openModal( "item-details" );
		ReactDOM.render(
			<ItemDetails
				categoryProperties={ categoryProperties }
				item={ item }
				user= { this.user }
				onClickAddItems={ onClickAddItems }
				onClickClose={ onClickClose }
				productDetails={ productDetails }
				warehouses={ warehouses }
			/>,
			document.querySelectorAll( ".modal__content" )[0]
		);
	}
	onClickItemImage( event, brandName, productName, finish, image ) {
		event.preventDefault();
		__openModal( "item-image" );
		ReactDOM.render(
			<ItemImage
				brandName={ brandName }
				finish={ finish }
				image={ image }
				productName={ productName }
			/>,
			document.querySelectorAll( ".modal__content" )[0]
		);
	}
	onClickSectionLabel( event, section ) {
		let store = this.store;
		let category = store.category;
		if( section !== "specifications" || (category && section === "specifications") ) {
			__toggleFilterSection( section );
		}
	}
	onMount() {
		let store = this.store;
		let category = store.category;
		if( !category ) {
			__openFilterSection( "categories" );
		}
		else {
			__openFilterSection( "specifications" );
		}
	}

    showClickVehicleFilter( event )
	{
        let applyVehicleFilter = this.applyVehicleFilter.bind( this );

		__openModal( "vehicle-filter" );
        ReactDOM.render(
			<VehicleFilter store={ this.store } applyVehicleFilter={ applyVehicleFilter }/>,
            document.querySelectorAll( ".modal__content" )[0]
        );
	}

	onNoResults()
	{
		let store = this.store;
		let specifications = store.specifications;
		return <FilterNoResults
			specifications={ specifications }
		/>;
	}
	renderFilter( callback ) {
		let store = this.store;
		let onChangeCategory = this.onChangeCategory;
		let onChangeWarehouse = this.onChangeWarehouse;
		let onChangeRadio = this.onChangeRadio;
		let onChangeRange = this.onChangeRange;
		let onChangeValue = this.onChangeValue;
		let onClickClearCategory = this.onClickClearCategory;
		let onClickClearFilter = this.onClickClearFilter;
		let onClickClearFilters = this.onClickClearFilters;
		let onClickClearFilterValue = this.onClickClearFilterValue;
		let onClickClearSearch = this.onClickClearSearch;
		let onClickClearWarehouse = this.onClickClearWarehouse;
		let onClickSectionLabel = this.onClickSectionLabel;
		let showClickVehicleFilter = this.showClickVehicleFilter.bind( this );

		let onMount = this.onMount;
		let brands = store.brands;
		let categories = store.categories;
		let category = store.category;
		let filters = store.filters;
		let items = store.items;
		let products = store.products;
		let search = store.search;
		let specifications = store.specifications;
		let warehouse = store.warehouse;
		let warehouses = store.warehouses;

		ReactDOM.render(
			<FilterTool
				brands={ brands }
				categories={ categories }
				category={ category }
				filters={ filters }
				items={ items }
				vehicleFilterInfo={ vehicleFilterInfo }
				showClickVehicleFilter={ showClickVehicleFilter }
				onChangeCategory={ onChangeCategory }
				onChangeWarehouse={ onChangeWarehouse }
				onChangeRadio={ onChangeRadio }
				onChangeRange={ onChangeRange }
				onChangeValue={ onChangeValue }
				onClickClearCategory={ onClickClearCategory }
				onClickClearFilter={ onClickClearFilter }
				onClickClearFilters={ onClickClearFilters }
				onClickClearFilterValue={ onClickClearFilterValue }
				onClickClearSearch={ onClickClearSearch }
				onClickClearWarehouse={ onClickClearWarehouse }
				onClickSectionLabel={ onClickSectionLabel }
				onMount={ onMount }
				products={ products }
				search={ search }
				specifications={ specifications }
				warehouse={ warehouse }
				warehouses={ warehouses }
			/>,
			document.querySelectorAll( ".sidebar" )[0],
			function() {
				if( callback ) {
					callback();
				}
			}
		);
	}
	renderResults( callback ) {
		let store = this.store;
		let onClickAddItem = this.onClickAddItem;
		let onClickItem = this.onClickItem;
		let onClickItemImage = this.onClickItemImage;
		let onNoResults = this.onNoResults;
		let brands = store.brands;
		let category = store.category;
		let items = store.items;
		let products = store.products;
		let warehouse = store.warehouse;
		let warehouses = store.warehouses;
	
		ReactDOM.render(
			<FilterResults
				active={ category ? true : false }
				brands={ brands[category] }
				items={ __filterCategoryItems( store ) }
				user = { this.user }
				onClickAddItem={ onClickAddItem }
				onClickItem={ onClickItem }
				onClickItemImage={ onClickItemImage }
				onNoResults={ onNoResults }
				products={ products[category] }
				warehouse={ warehouse }
				warehouses={ warehouses }
			/>,
			document.querySelectorAll( ".filter-results" )[0],
			function() {
				if( category ? true : false ) {
					__onActive();
				}
				else {
					__onInactive();
				}
				if( callback ) {
					callback();
				}
			}
		);
	}
	updateCartCount( locations ){
		let count = $( ".header__cart-quantity__count" );
		try {
			let qty = Object.keys( locations ).reduce( ( acc,key ) => {
				return acc + locations[key].quantity;
			}, 0 );
			//update cart
			// console.log( "qty", qty );
			count.html( parseInt( count.text() ) + qty );
		} catch( e ) { console.log( e ); }
	}
	initFeaturedItemModals(){
		let that = this;
		let categoryProperties = __generateProperties();
		let popularItemList = $( ".popular__item" );
		popularItemList.each((i, popularItem)=>{
			let link = $("a", popularItem);
			let img = $("img", popularItem);
			let itemData = JSON.parse($(popularItem).attr('data-item'));
			let brandName = itemData.brand;
  			let productName = itemData.model;
  			let finish = itemData.specification.finish;
  			let image = itemData.image.list && itemData.image.list.length ? itemData.image.list[0] : "https://placehold.it/160x160";
			let productDetails =  {
				name: productName,
				brand: {
					logo: itemData.b_logo
				}
			}
			link.click(function( event ) {
				event.preventDefault();
				that.onClickItem( event, productDetails, categoryProperties[itemData.type], itemData );
			});
			img.click(function( event ) {
				event.preventDefault();
				that.onClickItemImage( event, brandName, productName, finish, image );
			});
		});
	}
};

module.exports = HomeDispatcher;

function __closeFilterSection( section ) {
	let className = `.filters__filter.${ section }`;
	let $section = $( className );
	if( $section.hasClass( "active" ) ) {
		$( `${ className } .filters__filter__content` ).slideUp( 400 );
		$section.removeClass( "active" );
	}
}

function __openFilterSection( section )
{
	let className = `.filters__filter.${ section }`;
	let $section = $( className );
	
	if( section === 'categories')
	{
		$( `${ className } .filters__filter__content` ).slideDown( 400 );
		return null;
	}
	
	if( !$section.hasClass( "active" ))
	{
		$( ".filters__filter.active .filters__filter__content" ).slideUp( 400 );
		$( ".filters__filter" ).removeClass( "active" );
		$( `${ className } .filters__filter__content` ).slideDown( 400 );
		if( section !== 'categories') $section.addClass( "active" );
	}
}

function __toggleFilterSection( section ) {
	let $target = $( `.filters__filter.${ section }` );
	if( !$target.hasClass( "active" ) ) {
		__openFilterSection( section );
	}
	else {
		__closeFilterSection( section );
	}
}

function __closeModal() {
	let modal = document.getElementById( "modal" );
	modal.className = "";
	$( modal ).addClass( "hidden" );
	$( "html, body" ).removeClass( "no-scroll" );
	document.querySelectorAll( ".modal__content" )[0].scrollTop = 0;
	ReactDOM.unmountComponentAtNode( document.querySelectorAll( ".modal__content" )[0] );
}

function __openModal( className ) {
	let $modal = $( "#modal" );
	$( "html, body" ).addClass( "no-scroll" );
	$modal.removeClass( "hidden" );
	if( className ) {
		$modal.addClass( className );
	}
	document.querySelectorAll( ".modal__content" )[0].scrollTop = 0;
}

function __clearCategory( store ) {
	store.category = "";
}

function __clearFilters( store, category, type, value )
{
    vehicleFilterInfo = null;

    let filters = store.filters;
	if( filters[category] && filters[category][type] ) {
		if( value && filters[category][type][value] ) {
			delete filters[category][type][value];
		}
		if( !value || !Object.keys( filters[category][type] ).length ) {
			delete filters[category][type];
		}
		if( !Object.keys( filters[category] ).length ) {
			delete filters[category];
		}
	}
	else if( filters[category] ) {
		delete filters[category];
	}
}

function __clearSearch( store ) {
	store.search = "";
}

function __clearWarehouse( store ) {
	store.warehouse = "";
}

function __filterCategoryItems( store ) {
	let brands = store.brands;
	let category = store.category;
	let filters = store.filters;
	let items = store.items;
	let products = store.products;
	let search = store.search;
	let warehouse = store.warehouse;
	let specifications = store.specifications;
	let filtered = {};
	if( category ) {
		let categoryBrands = brands[category];
		let categoryFilters = filters[category];
		let categoryItems = items[category];
		let categoryProducts = products[category];
		let categorySpecifications = specifications[category];
		let searchType = search ? search.type : null;
		let searchValue = search ? search.value : null;
		for( let productId in categoryItems ) {
			let product;
			let productName;
			let brandId;
			let brand;
			let brandName;
			try {
				product = categoryProducts[productId];
				productName = product.name;
				brandId = product.brand_id;
				brand = categoryBrands[brandId];
				brandName = brand.name;
				if((
					!search || (
						search && searchType && searchValue && (
							(searchType === "part_number" || searchType === "xref") || 
							(searchType === "brand" && searchValue === brandName) || 
							(searchType === "model" && searchValue === productName)
						)
					)
				) && (
					!categoryFilters || (
						categoryFilters && (
							( !categoryFilters.brand || (categoryFilters.brand && categoryFilters.brand[brandName]) ) && 
							( !categoryFilters.model || (categoryFilters.model && categoryFilters.model[productName]) )
						)
					)
				)) {
					let categoryProductItems = categoryItems[productId];
					let productItems = categoryFilters || (search && searchType && searchValue) || warehouse ? __filterProductItems( categoryProductItems, categorySpecifications, categoryFilters, warehouse, search ) : categoryProductItems;
					if( productItems.length ) {
						filtered[productId] = productItems;
					}
				}
			} catch(ex) {
				console.log('Error in __filterCategoryItems');
				console.log('exception', ex);
				console.log('search', search);
				console.log('searchType', searchType);
				console.log('searchValue', searchValue);
				console.log('categoryBrands', categoryBrands);
				console.log('categoryItems', categoryItems);
				console.log('categoryProducts', categoryProducts);
				console.log('productId', productId);
				console.log('product (set from categoryProducts[productId])', product);
				console.log('productName (set from product.name)', productName);
				console.log('brandId (set from product.brand_id)', brandId);
				console.log('brand (set from categoryBrands[brandId])', brand);
				console.log('brandName (set from brand.name)', brandName);
			}
		}
	}
	return filtered;
};
function __filterProductItems( categoryProductItems, categorySpecifications, categoryFilters, warehouse, search ) {
	let filtered = [];
	let searchType = search ? search.type : null;
	let searchValue = search ? search.value : null;
	categoryProductItems.forEach(function( productItem, index, array ) {
		let partNumber = productItem.part_number;
		let specification = productItem.specification;
		let xref = productItem.xref;
		let hasFilter = true;
		if( categoryFilters ) {
			for( let filter in categoryFilters ) {
				if( filter === "brand" || filter === "model" ) {
					continue;
				}
				else if( filter === "boltpattern" ) {
					let boltpatterns = [specification["boltpattern1"], specification["boltpattern2"]];
					let hasMatch = false;
					boltpatterns.forEach(function( boltpattern, index, array ) {
						if( categoryFilters[filter][boltpattern] ) {
							hasMatch = true;
						}
					});
					if( !hasMatch ) {
						hasFilter = false;
						break;
					}
				}
				else {
					let specificationFilter = specification[filter];
					let categoryFilter, alias;
					if( filter === "finish" ) {
						alias = categorySpecifications[filter].aliases[specificationFilter];
					}
					categoryFilter = alias ? categoryFilters[filter][alias] : categoryFilters[filter][specificationFilter];
					if( !categoryFilter ) {
						hasFilter = false;
						break;
					}
				}
			}
		}
		// client request: show out of stock
		// if( warehouse ) {
		// 	let inventory = productItem.inventory;
		// 	let inventoryWarehouseQuantity = inventory[warehouse];
		// 	if( !inventoryWarehouseQuantity ) {
		// 		hasFilter = false;
		// 	}
		// }
		if( 
			search && searchType && searchValue &&
			((searchType === "part_number" && searchValue !== partNumber) || (searchType === "xref" && searchValue !== xref))
		) {
			hasFilter = false;
		}
		if( hasFilter ) {
			filtered.push( productItem );
		}
	});
	filtered.sort((a, b) => {
		return a.part_number.toString().localeCompare(b.part_number.toString());
	});
	return filtered;
};

// function __parseBrands( store ) {
function __parseBrands( store, brands ) {
	try {
		// let brands = JSON.parse( document.getElementById( "js" ).getAttribute( "data-brands" ) );
		let brandsObj = {};
		brands.forEach(function( brand, index, array ) {
			let brandId = brand.id;
			let category = brand.type;
			if( !brandsObj[category] ) {
				brandsObj[category] = {};
			}
			brandsObj[category][brandId] = brand;
		});
		store.brands = brandsObj;
	}
	catch( e ) { console.log( e ); }
};
// function __parseCategories( store ) {
function __parseCategories( store, specifications ) {
	// try { store.categories = Object.keys( store.specifications ); }
	try { store.categories = Object.keys( specifications ); }
	catch( e ) { console.log( e ); }
};
function __parseHash( store ) {
	let hash = window.location.hash;
	if( hash ) {
		let hashSlice = hash.slice( 1 );
		let filterMatch = hashSlice.match( /\/filters\?q=([^\/]+|$)/ );
		let searchMatch = hashSlice.match( /\/search\?q=([^\/]+|$)/ );
		let filters, search;
		if( filterMatch && filterMatch[1] ) {
			try { filters = JSON.parse( decodeURIComponent( filterMatch[1] ) ); }
			catch( e ) { console.log( e ); }
		}
		if( searchMatch && searchMatch[1] ) {
			try { search = JSON.parse( decodeURIComponent( searchMatch[1] ) ); }
			catch( e ) { console.log( e ); }
		}
		if( filters && filters.category && filters.values && Array.isArray( filters.values ) && filters.values.length ) {
			let category = filters.category;
			__updateCategory( store, category );
			filters.values.forEach(function( filter, index, array ) {
				let type = filter.type;
				let value = filter.value;
				if( category === "accessory" && type === "brand" ) {
					__clearFilters( store, category, type );
				}
				__updateFilters( store, category, type, value );
			});
		}
		else if( search && search.category && search.type && search.value ) {
			let category = search.category;
			let type = search.type;
			let value = search.value;
			__updateCategory( store, category );
			__updateSearch( store, type, value );
		}
	}
};
// function __parseItems( store ) {
function __parseItems( store, items ) {
	try {
		// let items = JSON.parse( document.getElementById( "js" ).getAttribute( "data-items" ) );
		let itemsObj = {};
		items.forEach(function( item, index, array ) {
			let category = item.type;
			let productId = item.product_id;
			if( !itemsObj[category] ) {
				itemsObj[category] = {};
			}
			if( !itemsObj[category][productId] ) {
				itemsObj[category][productId] = [];
			}
			itemsObj[category][productId].push( item );
		});
		store.items = itemsObj;
	}
	catch( e ) { console.log( e ); }
};
// function __parseProducts( store ) {
function __parseProducts( store, products ) {
	try {
		// let products = JSON.parse( document.getElementById( "js" ).getAttribute( "data-products" ) );
		let productsObj = {};
		products.forEach(function( product, index, array ) {
			let category = product.type;
			let productId = product.id;
			if( !productsObj[category] ) {
				productsObj[category] = {};
			}
			productsObj[category][productId] = product;
		});
		store.products = productsObj;
	}
	catch( e ) { console.log( e ); }
};
// function __parseSpecifications( store ) {
function __parseSpecifications( store, specifications ) {
	// try { store.specifications = JSON.parse( document.getElementById( "js" ).getAttribute( "data-specifications" ) ); }
	try { store.specifications = specifications; }
	catch( e ) { console.log( e ); }
};
// function __parseStore( store ) {
function __parseStore( store, specifications, brands, items, products, warehouse, warehouses ) {
	// __parseSpecifications( store );
	// __parseBrands( store );
	// __parseCategories( store );
	// __parseItems( store );
	// __parseProducts( store );
	// __parseWarehouse( store );
	// __parseWarehouses( store );
	// __parseHash( store );
	__parseSpecifications( store, specifications );
	__parseBrands( store, brands );
	__parseCategories( store, specifications );
	__parseItems( store, items );
	__parseProducts( store, products );
	__parseWarehouse( store, warehouse );
	__parseWarehouses( store, warehouses );
	__parseHash( store );
	return store;
};
// function __parseWarehouse( store ) {
function __parseWarehouse( store, warehouse ) {
	// try { __updateWarehouse( store, document.getElementById( "js" ).getAttribute( "data-warehouse" ) ); }
	try { __updateWarehouse( store, warehouse ); }
	catch( e ) { console.log( e ); }
};
// function __parseWarehouses( store ) {
function __parseWarehouses( store, warehouses ) {
	// try { store.warehouses = JSON.parse( document.getElementById( "js" ).getAttribute( "data-warehouses" ) ); }
	try { store.warehouses = warehouses; }
	catch( e ) { console.log( e ); }
};

function __updateCategory( store, category ) {
	store.category = category;
};
function __updateFilters( store, category, type, value ) {
    let filters = store.filters;
	if( !filters[category] ) {
		filters[category] = {};
	}
	if( !filters[category][type] ) {
		filters[category][type] = {};
	}
	filters[category][type][value] = true;
};
function __updateSearch( store, type, value ) {
	store.search = {
		type: type,
		value: value
	};
};
function __updateWarehouse( store, warehouse ) {
	store.warehouse = warehouse;
};

function __onActive() {
	$( ".main-content" ).addClass( "hidden" );
	$( ".filter-results" ).removeClass( "hidden" );
};
function __onInactive() {
	$( ".filter-results" ).addClass( "hidden" );
	$( ".main-content" ).removeClass( "hidden" );
};

function __generateProperties() {
	return {
		accessory: [
			{
				key: "size",
				label: "Size"
			}, {
				key: "description",
				label: "Description"
			}, {
				key: "finish",
				label: "Finish"
			}, {
				key: "additional_info",
				label: "Additional Info"
			}, {
				key: "special_notes",
				label: "Item Note"
			}
		],
		tire: [
			{
				key: "size",
				label: "Size"
			}, {
				key: "search_description",
				label: "Search Size"
			}/*, {
				key: "model",
				label: "Pattern"
			}*/, {
				key: "ply",
				label: "PLY"
			}, {
				key: "additional_info",
				label: "Additional Info"
			}, {
				key: "special_notes",
				label: "Item Note"
			}
		],
		wheel: [
			{
				key: "diameter",
				label: "Diameter"
			}, {
				key: "width",
				label: "Width"
			}, {
				key: "boltpattern1",
				label: "Bolt Pattern 1"
			}, {
				key: "boltpattern2",
				label: "Bolt Pattern 2"
			}, {
				key: "backspace",
				label: "Backspace"
			}, {
				key: "offset",
				label: "Offset"
			}, {
				key: "cap_bore_load",
				label: "Cap/Bore/Load"
			}, {
				key: "additional_info",
				label: "Additional Info"
			}, {
				key: "special_notes",
				label: "Item Note"
			}
		],
	};
};