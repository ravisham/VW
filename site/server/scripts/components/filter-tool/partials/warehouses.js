import React from "react";

class FilterToolWarehouses extends React.Component {
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
		let onChangeWarehouse = props.onChangeWarehouse;
		let warehouse = props.warehouse;
		let warehouses = props.warehouses;
		let onClickSectionLabel = this.onClickSectionLabel.bind( this, "warehouses" );
		return <section className="filters__filter warehouses">
			<label className="filters__filter__label" onClick={ onClickSectionLabel }>
				<span>Warehouse Inventory</span>
				<span className="note">Location: {warehouse ? warehouses[warehouse].shortName : "Show All"}</span>
			</label>
			<fieldset className="filters__filter__content">
				<label className="note">Select a warehouse location to see products in-stock now</label>
				<fieldset className="filters__filter__fields">
					<fieldset className="filters__filter__field show-all">
						<label>
							<input type="radio" value="" name="warehouse" onChange={ onChangeWarehouse } checked={ !warehouse } />
							<span>Show All</span>
						</label>
					</fieldset>
					{
						Object.keys( warehouses ).map(function( key, index, array ) {
							if (warehouses[key].isLive === false) {
								return null;
							}
							let isChecked = warehouse === key ? true : false;
							return <fieldset className="filters__filter__field" key={ `filters__filter__field-warehouses-${ key }` }>
								<label>
									<input type="radio" value={ key } name="warehouse" onChange={ onChangeWarehouse } checked={ isChecked } />
									<span>{warehouses[key].shortName}</span>
								</label>
							</fieldset>;
						})
					}
				</fieldset>
			</fieldset>
		</section>;
	}
};

module.exports = FilterToolWarehouses;
