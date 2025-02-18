import React from "react";

class FilterNoResults extends React.Component {
	constructor( props, context ) {
		super( props );
	}
	render() {
		let props = this.props;
		let specifications = props.specifications;
		return <div className="no-results">
			{/*<h1 className="no-results__title">NO RESULTS</h1>*/}
			<p className="no-results__description">There are no results for your filtered search.</p>
			<h3 className="no-results__subtitle">We suggest:</h3>
			<ul className="no-results__list">
				<li className="no-results__list-item">Broadening your selection under specifications</li>
				<li className="no-results__list-item">Choosing a different warehouse location</li>
				<li className="no-results__list-item">Selecting a new Brand / Type</li>
			</ul>
			{
				Object.keys( specifications ).sort().reverse().map(function( category, index, array ) {
					let label;
					switch( category ) {
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
					return <section className="suggestions">
						<h1 className="suggestions__title">{ label }</h1>
						<ul className="suggestions__list">
							{
								specifications[category].brand.values.map(function( value, index, array ) {
									let href = `/#/filters?q={"category":"${ category }","values":[{"type":"brand","value":"${ encodeURIComponent( value ) }"}]}`;
									return <li className="suggestions__list-item"><a className="suggestions__link" href={ href }>{ value }</a></li>;
								})
							}
						</ul>
					</section>;
				})
			}
		</div>;
	}
};

module.exports = FilterNoResults;
