import React from 'react';
import UserInfo from '../../UserInfo';

const PurchaseOrder = ({name, value, onChange}) => {

    let copy = UserInfo.isDTC() ? 'Please create a 10 digit (all numeric) number. All PO Numbers must begin with a 45 or 47.' : 'An alphanumeric purchase order number is required and must be created before placing an order.';

    return (
        <div className="checkout__steps__step checkout__steps__step--pon">
            <div className="checkout__steps__step-title">
                <h3>Enter purchase order number to proceed to checkout</h3>
            </div>
            <div className="checkout__steps__step-content purchaseOrderNumber">
                <input type="text" onChange={onChange} defaultValue={value} placeholder="Purchase Order Number" id={name} name={name}  maxLength="20" className="pon" />
                <div className="error-msg"/>
                <p>{copy}</p>
            </div>
        </div>
    );
};

export default PurchaseOrder;
