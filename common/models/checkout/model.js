/**
 * @class
 */
class CheckoutModel {

	/**
	 * @returns {CheckoutModel}
	 * @param {object} parameters
	 */
	constructor( parameters ) {
		var props = {
			appSettings: parameters.appSettings,
			canPay: false,
			order: null,
			po_number: null,
			purchaseOrder: null,
			salesRep: null,
			shipping: null,
			shippingRates: null,
			taxRate: null,
			totals: {
				discounttotal: null,
				shippingtotal: null,
				subtotal: null,
				taxtotal: null,
				total: null
			},
			token: null,
			user: parameters.user,
			warehouses: null,
			web_order_number: null
		};
		var errors = [];
		this.getErrors = this.getErrors.bind( this, errors );
		this.getProps = this.getProps.bind( this, props );
		this.pushError = this.pushError.bind( this, errors );
		this.setProps = this.setProps.bind( this, props );
	}

	/**
	 * @returns {object}
	 * @param {object} props
	 */
	getProps( props ) {
		return props;
	}

	/**
	 * @returns {array}
	 * @param {array} errors
	 */
	getErrors( errors ) {
		return errors;
	}

	/**
	 * @returns {array}
	 * @param {array} errors
	 * @param {string} message
	 */
	pushError( errors, message ) {
		errors.push( message );
		return errors;
	}

	/**
	 * @returns {object}
	 * @param {object} props
	 * @param {object} data
	 */
	setProps( props, data ) {
		for( var key in data ) {
			if( props[key] ) {
				props[key] = data[key];
			}
		}
		return props;
	}

	/**
	 * @returns {array}
	 */
	get errors() {
		var errors = this.getErrors();
		return errors;
	}
	/**
	 * @returns {object}
	 */
	get props() {
		var props = this.getProps();
		return props;
	}
	/**
	 * @returns {object}
	 * @param {object} data
	 */
	set props( data ) {
		var props = this.setProps( data );
		return props;
	}
}

module.exports = CheckoutModel;
