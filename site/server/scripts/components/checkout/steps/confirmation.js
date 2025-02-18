import React from 'react';
import OrderTable from './orderTable';
import UserInfo from '../../UserInfo';


const confirmationMessage = () =>
{
    if( UserInfo.isDTC() )
    {
        return (
            <p>
                <span>Check back within 24 hours under your </span>
                <a href="/account/orders">order history</a>
                <span> to track the status of your order.</span>
            </p>
        )
    }

    return <p>Look out for a detailed email with additional information about your order.</p>;
};


export default class Confirmation extends React.Component
{
    render()
    {
        return (
            <section className="confirmation">
                <div className="confirmation__message">
                    <h3><strong>Thanks for ordering!</strong></h3>
                    <h3>Your order was sent to Vision Wheel.</h3>
                    { confirmationMessage() }
                    <h6><strong>Web Order Number: <span>{this.props.won}</span></strong></h6>
                </div>
                <OrderTable locations={ this.props.locations } shippingOptions={ this.props.shippingOptions } />
            </section>
        );
    }
}