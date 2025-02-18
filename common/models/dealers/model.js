class DealersModel {
	constructor( parameters ) {

	}
	getProps( props ) {
		return props;
	}
	getErrors( errors ) {
		return errors;
	}
	pushError( errors, message ) {
		errors.push( message );
		return errors;
	}
	setProps( props, data ) {
		for( var key in data ) {
			if( props[key] ) {
				props[key] = data[key];
			}
		}
		return props;
	}
	get errors() {
		var errors = this.getErrors();
		return errors;
	}
	get props() {
		var props = this.getProps();
		return props;
	}
	set props( data ) {
		var props = this.setProps( data );
		return props;
	}
}

module.exports = DealersModel;
