import React from 'react';
import OrderTable from './orderTable';


class Cart extends React.Component
{
	render()
	{
		let qty = this.props.qty;
		let subtotal = this.props.subtotal;

		return (
			<div className="cart">
				<CartSubmit qty={qty} submit={this.props.submit} user={this.props.user} subtotal={subtotal}/>
				<OrderTable locations={ this.props.locations }
						onClickItem={ this.props.onClickItem }
						onClickItemImage={ this.props.onClickItemImage }
						onClickRemoveItem={ this.props.onClickRemoveItem }
						onClickUpdateQty={this.props.onClickUpdateQty}
						user = {this.props.user}
						isCart={true} />
				<CartSubmit qty={qty} submit={this.props.submit} user={this.props.user} subtotal={this.props.subtotal}/>
			</div>
		);
	}
}

class CartSubmit extends React.Component
{
	render()
	{
		let user = this.props.user;
		let cart_message = !user.isDTCUser ? null : 
			<p className="cart__message">Please note for Wheel and Tire products: Max quantity that can be ordered is 12</p>;

		let qty = this.props.qty;
		let subtotal = this.props.subtotal && !user.isDTCUser ? <span className="subtotal">${this.props.subtotal}</span> : null;

		return (
			<div className="cart__submit">
				{cart_message}
				<div className="cart__submit-total">
					<p>Order Subtotal (<span className="cart__total">{qty}</span> Items) {subtotal}</p>
				</div>
				<button type="submit" onClick={this.props.submit} className="cta cta--button checkout proceedToCheckoutBtn">Proceed to checkout (<span className="cart__total">{qty}</span> Items)</button>
			</div>
		);
  	}
}

export default Cart;
