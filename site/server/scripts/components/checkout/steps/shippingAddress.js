import React from 'react';
import ReactDOM from 'react-dom';
import ShippingAddressForm from './shippingAddressForm';
// import handleModal from '../../handleModal';

const ShippingAddress = (props) => {
    const changeAddress = (evt) => {
        evt.preventDefault();
        const modal = document.getElementById('modal');
        modal.classList.remove('hidden');
        document.body.classList.add('no-scroll');
        ReactDOM.render(<ShippingAddressForm shippingTo={ props.shippingTo } shippingFields={ props.shippingFields } onClickSaveShipping={ props.onClickSaveShipping } unmountOverlay={ props.unmountOverlay } />, document.querySelector('.modal__content'));
    };

    var canEditAddress;
    let dealer = props.user.dealer;
    if ( dealer && dealer.profile && dealer.profile.userCanEdit && dealer.profile.userCanEdit.shipping) {
        canEditAddress = <div className="split__half">
            <a href="#" className="change cta--button" onClick={changeAddress}>Change</a>
        </div>
    }

    return (
        <div className="checkout__steps__step checkout__steps__step--shipping-address">
            <div className="checkout__steps__step-title">
                <h3>Shipping Address</h3>
            </div>
            <div className="checkout__steps__step-content">
                <div className="split">
                    <div>
                        <p>Store Number: {props.shippingTo.store_number}</p>
                        <p>{props.shippingTo.first_name} {props.shippingTo.last_name}</p>
                        <p>{props.shippingTo.address_1}</p>
                        {props.shippingTo.address_2 &&
                            <p>{props.shippingTo.address_2}</p>
                        }
                        <p>{props.shippingTo.city}, {props.shippingTo.state} {props.shippingTo.postalcode}</p>
                    </div>
                    {canEditAddress}
                </div>
            </div>
        </div>
    );
};

export default ShippingAddress;
