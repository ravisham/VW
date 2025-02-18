import React from "react";
import { VehicleFilterNote } from '../../SharedComponents';

class FilterToolFilters extends React.Component
{
	constructor( props, context )
	{
		super( props );
	}

	onClickClearCategory( category, event ) {
		let props = this.props;
		let onClickClearCategory = props.onClickClearCategory;
		onClickClearCategory( event, category );
	}

	onClickClearFilters( event ) {
		let props = this.props;
		let category = props.category;
		let onClickClearFilters = props.onClickClearFilters;
		onClickClearFilters( event, category );
	}

	onClickClearFilterValue( category, property, value, event ) {
		let props = this.props;
		let onClickClearFilterValue = props.onClickClearFilterValue;
		onClickClearFilterValue( event, category, property, value );
	}

    getVehicleFilterLabel()
	{
		if( !this.props.vehicleFilterInfo ) return null;

		let year = this.props.vehicleFilterInfo.year;
		let name = `${this.props.vehicleFilterInfo.brand} ${this.props.vehicleFilterInfo.model}`;

		return (
			<div className='vehicle-filter-box-txt'>
				<span>{year}</span><br/>
				<span>{name}</span>
				<VehicleFilterNote note={this.props.vehicleFilterInfo.note} />
			</div>
		)
	}

	render()
	{
		let that = this;
		let props = this.props;
		let category = props.category;
		let filters = props.filters;
		let onClickClearSearch = props.onClickClearSearch;
		let onClickClearWarehouse = props.onClickClearWarehouse;
		let search = props.search;
		let specifications = props.specifications;
		let warehouse = props.warehouse;
		let warehouses = props.warehouses;
		let onClickClearCategory = this.onClickClearCategory.bind( this, category );
		let onClickClearFilters = this.onClickClearFilters.bind( this );
		let onClickClearFilterValue = this.onClickClearFilterValue;
		let categoryFilters = category ? filters[category] : null;
		let categorySpecifications = specifications[category];

		return <div className="filters__filter-by">
			<label className="filters__filter-by__label">
				<span>Filters: </span>
				{ category ? <a href="#" onClick={ onClickClearFilters }>Clear All</a> : null }
			</label>
			{ this.getVehicleFilterLabel() }
			<div className="filters__filter-by__fields">
				<label className="filters__filter-by__field">
					<span>{ `Warehouse > ${ warehouse ? warehouses[warehouse].state : "Show All" }` }</span>
					<a href="#" onClick={ onClickClearWarehouse }>x</a>
				</label>
				{
					search && search.type && search.value ? <label className="filters__filter-by__field">
						<span>{ `Search > ${ search.value }` }</span>
						<a href="#" onClick={ onClickClearSearch }>x</a>
					</label> : null
				}
				{
					category ? <label className="filters__filter-by__field">
						<span>{ `Category > ${ category.charAt( 0 ).toUpperCase() + category.slice( 1 ) }` }</span>
						<a href="#" onClick={ onClickClearCategory }>x</a>
					</label> : null
				}
				{
					categoryFilters && categorySpecifications ? Object.keys( categoryFilters ).map(function( property, index, array ) {
						let categoryFilterProperty = categoryFilters[property];
						let categorySpecificationProperty = categorySpecifications[property];
						let categorySpecificationPropertyLabel = categorySpecificationProperty.label;
						let filterValues = Object.keys( categoryFilterProperty ).map(function( value, index, array ) {
							return <label className="filters__filter-by__field" key={ `filters__filter-by__field-${ category }-${ property }-${ value }` }>
								<span>{ `${ categorySpecificationPropertyLabel } > ${ value }` }</span>
								<a href="#" onClick={ onClickClearFilterValue.bind( that, category, property, value ) }>x</a>
							</label>;
						});
						return category ? filterValues : null;
					}) : null
				}
			</div>
		</div>;
	}
};

module.exports = FilterToolFilters;
