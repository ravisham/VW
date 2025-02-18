import React from "react";
import ReactDOM from "react-dom";
import FilterToolCategories from "./partials/categories.js";
import FilterToolFilters from "./partials/filters.js";
import FilterToolSpecifications from "./partials/specifications.js";
import FilterToolWarehouses from "./partials/warehouses.js";

class FilterTool extends React.Component
{
	constructor( props, context )
	{
		super( props );
	}

	componentDidMount()
	{
		let props = this.props;
		let onMount = props.onMount;
		onMount();
	}

	onChangeCategory( event )
	{
		let props = this.props;
		let onChangeCategory = props.onChangeCategory;
		onChangeCategory( event );
	}

	onChangeRadio( event, category, property, value )
	{
		let props = this.props;
		let onChangeRadio = props.onChangeRadio;
		onChangeRadio( event, category, property, value );
	}

	onChangeRange( category, property, values )
	{
		let props = this.props;
		let onChangeRange = props.onChangeRange;
		onChangeRange( category, property, values );
	}

	onChangeValue( event, category, property, value )
	{
		let props = this.props;
		let onChangeValue = props.onChangeValue;
		onChangeValue( event, category, property, value );
	}

	onChangeWarehouse( event )
	{
		let props = this.props;
		let onChangeWarehouse = props.onChangeWarehouse;
		onChangeWarehouse( event );
	}

	onClickClearCategory( event )
	{
		let props = this.props;
		let onClickClearCategory = props.onClickClearCategory;
		onClickClearCategory( event );
	}

	onClickClearFilter( event, category, property )
	{
		let props = this.props;
		let onClickClearFilter = props.onClickClearFilter;
		onClickClearFilter( event, category, property );
	}

	onClickClearFilters( event, category )
	{
		let props = this.props;
		let onClickClearFilters = props.onClickClearFilters;
		onClickClearFilters( event, category );
	}

	onClickClearFilterValue( event, category, property, value )
	{
		let props = this.props;
		let onClickClearFilterValue = props.onClickClearFilterValue;
		onClickClearFilterValue( event, category, property, value );
	}

	onClickClearSearch( event )
	{
		let props = this.props;
		let onClickClearSearch = props.onClickClearSearch;
		onClickClearSearch( event );
	}

	onClickClearWarehouse( event )
	{
		let props = this.props;
		let onClickClearWarehouse = props.onClickClearWarehouse;
		onClickClearWarehouse( event );
	}

	onClickSectionLabel( event, section )
	{
		let props = this.props;
		let onClickSectionLabel = props.onClickSectionLabel;
		onClickSectionLabel( event, section );
	}

	onClickVehicleFilter( event )
	{
		this.props.showClickVehicleFilter();
	}

	render()
	{
		let props = this.props;
		let categories = props.categories;
		let category = props.category;
		let filters = props.filters;
		let search = props.search;
		let specifications = props.specifications;
		let warehouse = props.warehouse;
		let warehouses = props.warehouses;

		let onChangeCategory = this.onChangeCategory.bind( this );
		let onChangeRadio = this.onChangeRadio.bind( this );
		let onChangeRange = this.onChangeRange.bind( this );
		let onChangeValue = this.onChangeValue.bind( this );
		let onChangeWarehouse = this.onChangeWarehouse.bind( this );
		let onClickClearCategory = this.onClickClearCategory.bind( this );
		let onClickClearFilter = this.onClickClearFilter.bind( this );
		let onClickClearFilters = this.onClickClearFilters.bind( this );
		let onClickClearFilterValue = this.onClickClearFilterValue.bind( this );
		let onClickClearSearch = this.onClickClearSearch.bind( this );
		let onClickClearWarehouse = this.onClickClearWarehouse.bind( this );
		let onClickSectionLabel = this.onClickSectionLabel.bind( this );
		let onClickVehicleFilter = this.onClickVehicleFilter.bind( this );

		return (
			<div>
				<button onClick={onClickVehicleFilter} className="cta cta--button cta--button-vehicle-filter" type="submit">Select By Vehicle &#x25ba; </button>
				<div className="filters">
					<p className="filters__description">Looking for something specific? Start here to refine your search and narrow it down to the results you want.</p>
					<FilterToolFilters
						category={ category }
						filters={ filters }
						vehicleFilterInfo={ this.props.vehicleFilterInfo }
						onClickClearCategory={ onClickClearCategory }
						onClickClearFilters={ onClickClearFilters }
						onClickClearFilterValue={ onClickClearFilterValue }
						onClickClearSearch={ onClickClearSearch }
						onClickClearWarehouse={ onClickClearWarehouse }
						search={ search }
						specifications={ specifications }
						warehouse={ warehouse }
						warehouses={ warehouses }
					/>
					<form className="filters__form">
						<FilterToolWarehouses
							onChangeWarehouse={ onChangeWarehouse }
							onClickSectionLabel={ onClickSectionLabel }
							warehouse={ warehouse }
							warehouses={ warehouses }
						/>
						<FilterToolCategories
							categories={ categories }
							category={ category }
							onChange={ onChangeCategory }
							onClickSectionLabel={ onClickSectionLabel }
						/>
						<FilterToolSpecifications
							categories={ categories }
							category={ category }
							filters={ filters }
							onChangeRadio={ onChangeRadio }
							onChangeRange={ onChangeRange }
							onChangeValue={ onChangeValue }
							onClickClearFilter={ onClickClearFilter }
							onClickSectionLabel={ onClickSectionLabel }
							specifications={ specifications }
						/>
					</form>
				</div>
			</div>
		)
	}
};

module.exports = FilterTool;
