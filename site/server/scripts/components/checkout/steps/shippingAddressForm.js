import React from 'react';
import UsStates from '../../statesDropdown';

const usStates = [
    'AK',
    'AL',
    'AZ',
    'AR',
    'CA',
    'CO',
    'CT',
    'DE',
    'FL',
    'GA',
    'HI',
    'ID',
    'IL',
    'IN',
    'IA',
    'KS',
    'KY',
    'LA',
    'ME',
    'MD',
    'MA',
    'MI',
    'MN',
    'MS',
    'MO',
    'MT',
    'NE',
    'NV',
    'NH',
    'NJ',
    'NM',
    'NY',
    'NC',
    'ND',
    'OH',
    'OK',
    'OR',
    'PA',
    'RI',
    'SC',
    'SD',
    'TN',
    'TX',
    'UT',
    'VT',
    'VA',
    'WA',
    'WV',
    'WI',
    'WY',
];

class ShippingAddressForm extends React.Component {
	constructor( props, context ) {
		super( props );
        this.handleSubmit = this.handleSubmit.bind(this);
        this.onClickSaveShipping = this.onClickSaveShipping.bind(this);
        this.requiredFields = [
            'first_name',
            'last_name',
            'address_1',
            'city',
            'state',
            'postalcode',
        ];
		this.state = {
			shippingTo: JSON.parse( JSON.stringify( props.shippingTo ) )
		};
	}
	componentWillReceiveProps( props ) {
		let setState = this.setState.bind( this );
		setState({
			shippingTo: JSON.parse( JSON.stringify( props.shippingTo ) )
		});
	}
	onChangeShippingField( event ) {
		let state = this.state;
		let setState = this.setState.bind( this );
		let shippingTo = state.shippingTo;
		let target = event.target;
		let value = target.value;
		let name = target.getAttribute( "name" );
		let $target = $( target );
		shippingTo[name] = value;
		setState({
			shippingTo: shippingTo
		});
	}
    toggleError(selector, hasError, message) {
        const el = document.querySelector(selector);
        if (el) {
            if (hasError) {
                el.classList.add('has-error');
            } else {
                el.classList.remove('has-error');
            }
            const errorMsg = el.querySelector('.error-msg');
            if (errorMsg) {
                errorMsg.innerHTML = message;
            }
        }
    }
	validateForm() {
		let numOfErrors = 0;
		Object.keys(this.state.shippingTo).forEach((key) => {
            if (this.requiredFields.indexOf(key) !== -1) {
                if (this.state.shippingTo[key] === '' && !this.state.shippingTo[key]) {
                    this.toggleError(`[name="${key}`, true);
                    numOfErrors += 1;
                } else {
                    this.toggleError(`[name="${key}"`, false);
                }
            }
		});
		return (numOfErrors > 0);
	}
	handleSubmit(e) {
        e.preventDefault();
        const hasErrors = this.validateForm();
        if (hasErrors) {
			console.log('there are errors');
            document.querySelector('.address-form__actions .errors').style.display = 'inline-block';
            return false;
        }
        this.onClickSaveShipping(this.state.shippingTo, e);
	}
	onClickSaveShipping( shippingTo, event ) {
		let props = this.props;
		let onClickSaveShipping = props.onClickSaveShipping;
		onClickSaveShipping( event, shippingTo );
	}
	render() {
		let props = this.props;
		let state = this.state;
		let shippingTo = state.shippingTo;
		let onChangeShippingField = this.onChangeShippingField.bind( this );
		let onClickSaveShipping = this.onClickSaveShipping.bind( this, shippingTo );
		let unmountOverlay = props.unmountOverlay;
		let fields = props.shippingFields.map(function( field, index, array ) {
			let value = shippingTo[field.name] || "";
            if (field.name === 'store_number') {
                return (<input name={ field.name } value={ value } type="hidden" />);
            }
			let caption = field.caption ? <p className="address-form__note">{ field.caption }</p> : null;
			let fieldElement = <input className="address-form__control" name={ field.name } defaultValue={ value } maxLength={ field.maxLength } placeholder={ field.label } onChange={ onChangeShippingField } />;
			return (
                <div className="address-form__row" key={ `shipping-field-${ index + 1 }` }>
                    <label className="address-form__label">{ field.label }</label>
                    <div className="address-form__right-col">
    					{ fieldElement }
    					{ caption }
                    </div>
    			</div>
            );
		});
		return <section className="update-address">
        <h1 className="update-address__title">Change Shipping Address For This Order</h1>
			<form className="address-form" action="" method="POST" onSubmit={this.handleSubmit}>
				<div className="fields">
					{ fields }
				</div>
				<div className="address-form__actions">
					<button className="cta cta--button" type="submit">Save</button>
					<button className="cta cta--button--white" onClick={ unmountOverlay } type="button">Cancel</button>
                    <span className="errors">One or more of the fields above are incorrect.</span>
				</div>
			</form>
		</section>;
	}
}

export default ShippingAddressForm;
