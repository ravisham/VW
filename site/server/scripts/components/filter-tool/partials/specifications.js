import React from "react";
// https://jqueryui.com/upgrade-guide/1.12/#official-package-on-npm
require( "jquery-ui/ui/widgets/slider" );

class FilterToolSpecifications extends React.Component {
	constructor( props, context ) {
		super( props );
	}
	onClickSectionLabel( section, event ) {
		let props = this.props;
		let onClickSectionLabel = props.onClickSectionLabel;
		onClickSectionLabel( event, section );
	}
	render() {
		let props = this.props;
		let category = props.category;
		let categories = props.categories;
		let filters = props.filters;
		let onChangeRadio = props.onChangeRadio;
		let onChangeRange = props.onChangeRange;
		let onChangeValue = props.onChangeValue;
		let onClickClearFilter = props.onClickClearFilter;
		let specifications = props.specifications;
		let onClickSectionLabel = this.onClickSectionLabel.bind( this, "specifications" );
		return <section className="filters__filter specifications">
			<label className={ category ? "filters__filter__label" : "filters__filter__label disabled" } onClick={ onClickSectionLabel }>
				<span>Specifications</span>
				{ !category ? <span className="note">Please select a category.</span> : null }
			</label>
			<fieldset className="filters__filter__content">{
				categories.map(function( value, index, array ) {
					let categoryFilters = filters[value];
					let categorySpecifications = specifications[value];
					let isActive = category === value ? true : false;
					return <fieldset className={ isActive ? "filters__filter__type" : "filters__filter__type hidden" } key={ `filters__filter__type-${ value }` }>{
						Object.keys( categorySpecifications ).map(function( property, index, array ) {
							if ((typeof property === 'string') && ((property === 'boltpattern1') || (property === 'boltpattern2'))) {
								return null;
							}
							return <FilterToolSpecificationProperty
								category={ value }
								categoryFilters={ categoryFilters }
								categorySpecifications={ categorySpecifications }
								key={ `filters__filter__type-${ property }` }
								onChangeRadio={ onChangeRadio }
								onChangeRange={ onChangeRange }
								onChangeValue={ onChangeValue }
								onClickClearFilter={ onClickClearFilter }
								property={ property }
							/>;
						})
					}</fieldset>;
				})
			}</fieldset>
		</section>;
	}
};

class FilterToolSpecificationProperty extends React.Component {
	constructor( props, context ) {
		super( props );
		let categorySpecifications = props.categorySpecifications;
		let property = props.property;
		let categorySpecificationsProperty = categorySpecifications[property];
		let type = categorySpecificationsProperty.type;
		let values = categorySpecificationsProperty.values;
		let hasRange = type === "range" ? true : false;
		this.state = {
			min: hasRange ? Math.floor( parseFloat( values[0] ) ) : null,
			max: hasRange ? Math.ceil( parseFloat( values[values.length - 1] ) ) : null
		};
	}
	onChangeRange() {
		let props = this.props;
		let category = props.category;
		let categorySpecifications = props.categorySpecifications;
		let onChangeRange = props.onChangeRange;
		let property = props.property;
		let state = this.state;
		let max = state.max;
		let min = state.min;
		let categorySpecificationsProperty = categorySpecifications[property];
		let values = categorySpecificationsProperty.values;
		onChangeRange( category, property, values.filter(function( value, index, array ) {
			return parseFloat( value ) >= min && parseFloat( value ) <= max;
		}));
	}
	onClickClearFilter( category, property, event ) {
		let props = this.props;
		let categorySpecifications = props.categorySpecifications;
		let onClickClearFilter = props.onClickClearFilter;
		let onSlideRange = this.onSlideRange.bind( this );
		let categorySpecificationsProperty = categorySpecifications[property];
		let values = categorySpecificationsProperty.values;
		let min = Math.floor( values[0] );
		let max = Math.ceil( values[values.length - 1] );
		let target = document.querySelectorAll( `.range-${ category }-${ property } .ui-slider-handles` )[0];
		let $target = $( target );
		let handles = target.querySelectorAll( ".ui-slider-handle" );
		let handleValues = document.querySelectorAll( `.range-${ category }-${ property } .ui-slider-handle-value` );
		$target.slider( "values", [min, max] );
		$( handleValues[0] ).html( $target.slider( "values", 0 ) ).css({
			left: "0"
		});
		$( handleValues[1] ).html( $target.slider( "values", 1 ) ).css({
			left: "100%"
		});
		onClickClearFilter( event, category, property );
		onSlideRange( min, max );
	}
	onClickGroupLabel( event ) {
		let target = event.target;
		let $target = $( target );
		if( !$target.parent().hasClass( "active" ) ) {
			// $( ".active .fields__group--content" ).slideUp( 400 );
			// $( ".fields__group" ).removeClass( "active" );
			$target.next().slideDown( 400 );
			$target.parent().addClass( "active" );
		}
		else {
			$target.next().slideUp( 400 );
			$target.parent().removeClass( "active" );
		}
	}
	onSlideRange( min, max ) {
		let setState = this.setState.bind( this );
		setState({
			max: max,
			min: min
		});
	}
	render() {
		let that = this;
		let props = this.props;
		let category = props.category;
		let categoryFilters = props.categoryFilters;
		let categorySpecifications = props.categorySpecifications;
		let onChangeRadio = props.onChangeRadio;
		let onChangeValue = props.onChangeValue;
		let property = props.property;
		let state = this.state;
		let max = state.max;
		let min = state.min;
		let onChangeRange = this.onChangeRange.bind( this );
		let onClickGroupLabel = this.onClickGroupLabel.bind( this );
		let onSlideRange = this.onSlideRange.bind( this );
		let categoryFiltersProperty = categoryFilters ? categoryFilters[property] : null;
		let categorySpecificationsProperty = categorySpecifications[property];
		let label = categorySpecificationsProperty.label;
		let type = categorySpecificationsProperty.type;
		let values = categorySpecificationsProperty.values;
		let className = "filters__filter__group";
		switch( category ) {
			case "accessory":
				switch( property ) {
					case "brand":
					case "finish":
					case "model":
					case "size":
						className += " active";
					break;
				}
			break;
			case "tire":
				switch( property ) {
					case "brand":
					case "ply":
					case "model":
					case "search_description":
						className += " active";
					break;
				}
			break;
			case "wheel":
				switch( property ) {
					case "boltpattern":
					case "boltpattern1":
					case "boltpattern2":
					case "diameter":
					case "width":
						className += " active";
					break;
				}
			break;
		}
		return <fieldset className={ className }>
			<label className="filters__filter__group__label" onClick={ onClickGroupLabel }>
				{ label }
				{ type === "range" ? <a href="#" onClick={ that.onClickClearFilter.bind( that, category, property ) }>Clear</a> : null }
			</label>
			<fieldset className="filters__filter__group__content">
				{ 
					type === "range" ? <FilterToolSpecificationPropertyRange 
						category={ category }
						onChangeRange={ onChangeRange }
						onSlideRange={ onSlideRange }
						max={ max }
						min={ min }
						property={ property }
						values={ values }
					/> : null
				}
				<FilterToolSpecificationPropertyValues
					category={ category }
					categoryFiltersProperty={ categoryFiltersProperty }
					max={ max }
					min={ min }
					onChangeRadio={ onChangeRadio }
					onChangeValue={ onChangeValue }
					property={ property }
					type={ type }
					values={ values }
				/>
			</fieldset>
		</fieldset>;
	}
};

class FilterToolSpecificationPropertyRange extends React.Component {
	constructor( props, context ) {
		super( props );
	}
	componentDidMount() {
		let props = this.props;
		let onChangeRange = this.onChangeRange.bind( this );
		let onSlideRange = this.onSlideRange.bind( this );
		let category = props.category;
		let max = props.max;
		let min = props.min
		let property = props.property;
		let values = props.values;
		let target = document.querySelectorAll( `.range-${ category }-${ property } .ui-slider-handles` )[0];
		let handleValues = document.querySelectorAll( `.range-${ category }-${ property } .ui-slider-handle-value` );
		let $target = $( target );
		let step, inc, prevMin, prevMax;
		$target.slider({
			min: Math.floor( values[0] ),
			max: Math.ceil( values[values.length - 1] ),
			values: [min, max],
			create: function( event, ui ) {
				let handles = target.querySelectorAll( ".ui-slider-handle" );
				$( handleValues[0] ).html( $target.slider( "values", 0 ) ).css({
					left: handles[0].style.left
				});
				$( handleValues[1] ).html( $target.slider( "values", 1 ) ).css({
					left: handles[1].style.left
				});
				step = $target.slider( "option", "step" );
				inc = 100 / ((Math.ceil( values[values.length - 1] ) - Math.floor( values[0] )) / step);
				prevMin = min;
				prevMax = max;
			},
			slide: function( event, ui ) {
				
				let newMin = ui.values[0] > ui.values[1] ? ui.values[1] : ui.values[0];
				let newMax = ui.values[0] > ui.values[1] ? ui.values[0] : ui.values[1];
				let left = parseFloat( ui.handle.style.left.split( "%" )[0] );
				let newLeft;
				if( newMin === prevMin && newMax === prevMax ) {
					// no change
				}
				else if( newMax === prevMax ) {
					if( newMin > prevMin ) {
						// right
						left += inc;
					}
					else if( newMin < prevMin ) {
						// left
						left -= inc;
					}
				}
				else if( newMin === prevMin ) {
					if( newMax > prevMax ) {
						// right
						left += inc;
					}
					else if( newMax < prevMax ) {
						// left
						left -= inc;
					}
				}
				$( handleValues[ui.handleIndex] ).html( ui.values[ui.handleIndex] ).css({
					left: `${ left }%`
				});
				prevMin = newMin;
				prevMax = newMax;
				onSlideRange( newMin, newMax );
			},
			change: function( event, ui ) {
				let newMin = ui.values[0] > ui.values[1] ? ui.values[1] : ui.values[0];
				let newMax = ui.values[0] > ui.values[1] ? ui.values[0] : ui.values[1];
				$( handleValues[ui.handleIndex] ).html( ui.values[ui.handleIndex] ).css({
					left: ui.handle.style.left
				});
				onChangeRange();
			}
		});
	}
	onChangeRange() {
		let props = this.props;
		let onChangeRange = props.onChangeRange;
		onChangeRange();
	}
	onSlideRange( min, max ) {
		let props = this.props;
		let onSlideRange = props.onSlideRange;
		onSlideRange( min, max );
	}
	render() {
		let props = this.props;
		let category = props.category;
		let max = props.max;
		let min = props.min;
		let property = props.property;
		let values = props.values;
			// <h1>Range</h1>
			// <span>Min: { min }</span>
			// <span>Max: { max }</span>
			// <br />
			// <span>Price: </span>
			// <span className="amount"></span>
			// <div className="range"><div className="ui-slider-background"></div></div>
		return <div className={ `filters__filter__range range-${ category }-${ property } ui-slider` }>
			<div className="ui-slider-handles">
				<div className="ui-slider-handles-background"></div>
			</div>
			<div className="ui-slider-handle-values">
				<span className="ui-slider-handle-value"></span>
				<span className="ui-slider-handle-value"></span>
			</div>
		</div>;
	}
};

class FilterToolSpecificationPropertyValues extends React.Component {
	constructor( props, context ) {
		super( props );
	}
	onChangeRadio( category, property, value, event ) {
		let props = this.props;
		let onChangeRadio = props.onChangeRadio;
		onChangeRadio( event, category, property, value );
	}
	onChangeValue( category, property, value, event ) {
		let props = this.props;
		let onChangeValue = props.onChangeValue;
		onChangeValue( event, category, property, value );
	}
	render() {
		let that = this;
		let props = this.props;
		let onChangeRadio = this.onChangeRadio;
		let onChangeValue = this.onChangeValue;
		let category = props.category;
		let categoryFiltersProperty = props.categoryFiltersProperty;
		let max = props.max;
		let min = props.min;
		let property = props.property;
		let type = props.type;
		let values = props.values;
		return <fieldset className={ type !== "range" ? "filters__filter__fields" : "filters__filter__fields range" }>{
			values.map(function( value, index, array ) {
				let categoryFiltersPropertyValue = categoryFiltersProperty ? categoryFiltersProperty[value] : null;
				let isChecked = categoryFiltersPropertyValue ? true : false;
				return type !== "range" || (type === "range" && parseFloat( value ) >= min && parseFloat( value ) <= max) ? <fieldset className="filters__filter__field" key={ `filters__filter__field-${ category }-${ property }-${ value }` }>
					<label>
						{ 
							type === "radio" ? 
								<input name={ `filter-${ category }-${ property }` } type="radio" value={ value } onChange={ onChangeRadio.bind( that, category, property, value ) } checked={ isChecked } /> : 
								<input name={ `filter-${ category }-${ property }-${ value }` } type="checkbox" value={ value } onChange={ onChangeValue.bind( that, category, property, value ) } checked={ isChecked } />
						}
						<span>{ value }</span>
					</label>
				</fieldset> : null;
			})
		}</fieldset>;
	}
};

module.exports = FilterToolSpecifications;
