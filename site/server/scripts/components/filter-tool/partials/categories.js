import React from "react";

class FilterToolCategories extends React.Component {
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
		let categories = props.categories;
		let category = props.category;
		let onChange = props.onChange;
		let onClickSectionLabel = this.onClickSectionLabel.bind( this, "categories" );
		return <section className="filters__filter categories">
			<label className="filters__filter__label" onClick={ onClickSectionLabel }><span>Categories</span></label>
			<fieldset className="filters__filter__content">
				<fieldset className="filters__filter__fields">{
					categories.map(function( value, index, array ) {
						let isChecked = category === value ? true : false;
						let label;
						switch( value ) {
							case "accessory":
								label = "Accessories";
							break;
							case "tire":
								label = "Tires";
							break;
							case "wheel":
								label = "Wheels";
							break;
						}
						return <fieldset className="filters__filter__field" key={ `filters__filter__field-${ value }` }>
							<label>
								<input type="radio" value={ value } name="category" onChange={ onChange } checked={ isChecked } />
								<span>{ label }</span>
							</label>
						</fieldset>;
					})
				}</fieldset>
			</fieldset>
		</section>;
	}
};

module.exports = FilterToolCategories;
