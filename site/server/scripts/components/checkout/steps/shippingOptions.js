import React from 'react';
import { QuantityLimitText } from '../../SharedComponents';

class ShippingOptions extends React.Component {
    constructor(props) {
        super(props);
    }
    getLocation(locationCode, warehouse, key) {
        let isDTCUser = this.props.isDTCUser;
        let products = warehouse.items.map((product,i)=>{
            return <Product
                        locationCode={locationCode}
                        item={product.item}
                        qty={product.quantity}
                        onClickRemoveItem={this.props.onClickRemoveItem}
                        onClickUpdateQty={this.props.onClickUpdateQty}
                        key={i} 
                        isDTCUser={isDTCUser}/>
        });
        let deliveryOptions = <DeliveryOptions locationCode={locationCode} warehouse={warehouse} shippingOptions={this.props.shippingOptions} onClickShippingMethod={this.props.onClickShippingMethod} />

        return <Location products={products} details={warehouse.details} deliveryOptions={deliveryOptions} location={locationCode} key={key} />;
    }
    render() {
        let locations = Object.keys(this.props.warehouses).map((key,i)=>{
            return this.getLocation(key, this.props.warehouses[key], i);
        });

        return (
            <div className="checkout__steps__step checkout__steps__step--shipping-methods">
                <div className="checkout__steps__step-title">
                    <h3>Review Items and Shipping Methods</h3>
                    <QuantityLimitText classNames={'note'} />
                </div>
                <div className="checkout__steps__step-content">
                    { locations }
                </div>
            </div>
        );
    }
}

class Product extends React.Component {
    constructor(props) {
        super(props);
        this.state = {qty: this.props.qty, err:false};
        this.handleDeleteClick = this.handleDeleteClick.bind(this);
        this.handleQtyChange = this.handleQtyChange.bind(this);
        this.handleQtyUpdate = this.handleQtyUpdate.bind(this);
    }
    handleDeleteClick() {
        this.props.onClickRemoveItem(this.props, this.props.locationCode);
        return false;
    }
    handleQtyChange(event) {
        this.setState({
            qty: event.target.value,
            err: !isNaN(event.target.value)
        });
    }
    handleQtyUpdate(event){
        let available = this.props.item.inventory[this.props.locationCode];
        if ((!isNaN(event.target.value)) && (event.target.value !== '')){
            this.props.onClickUpdateQty(event, this.props.item.id, this.props.locationCode, event.target.value);
        }
    }
    render() {
        let type = this.props.item.type;
        let product_name = this.props.item.model;
        let img = this.props.item.image.list && this.props.item.image.list.length  ?this.props.item.image.list[0] : "https://placehold.it/160x160";
        let cust_sku = <p>{ `Article # ${ this.props.item.xref || "N/A" }` }</p>;
        let part_number = <p>{`VW SKU # ${ this.props.item.part_number }`}</p>;
        let size = <p className="checkout-size">{ `Size: ${ this.props.item.specification.size }` }</p>;
        let finish = this.props.item.specification.finish ? <p>{ `Finish: ${ this.props.item.specification.finish }` }</p> : null;
        let available = this.props.item.inventory[this.props.locationCode];
        let errorClass = this.state.err?"error":null;
        let isDTCUser = this.props.isDTCUser;
        let qty = this.state.qty;
        let price = (this.props.item.price && !isDTCUser) ? <p>${this.props.item.price} ea.</p> : null
        return (
            <div className="products__product">
              <div className="image">
                <img src={img} alt="" />
              </div>
              <div className="info">
                <strong>{product_name}</strong>
                {cust_sku}
                {part_number}
                {size}
                {finish}
                {price}
                <div className="quantity" data-id={this.props.item.id}>
                  <div className="error-msg"></div>
                  <label>Quantity:</label>
                  <span className="avail-count">{`Avail ${ available }`}</span>
                  <div className="input-indicator" >
                    <input type="text" name="qty"
                        autoComplete="off"
                        value={qty}
                        onChange={this.handleQtyChange}
                        onBlur={this.handleQtyUpdate}
                    />
                    <div className="icons">
                      <span className="icon loading-icon"></span>
                      <span className="icon error-icon"></span>
                      <span className="icon success-icon"></span>
                    </div>
                  </div>
                  <div className="has-error"></div>
                </div>
                <a href="javascript:void(0)" className="delete" onClick={this.handleDeleteClick}>Delete</a>
              </div>
            </div>
        );
    }
}

class DeliveryOptions extends React.Component {
    constructor() {
        super();
    }
    handleOptionClick(value, method) {
        console.log("handleOptionClick(value, method)", value, method);
        this.props.onClickShippingMethod(this.props.locationCode, value, method);
    }
    renderOption(option, key, selectedMethod, selectedOption) {
        const selected = option.value==selectedMethod&&(option.option||"")==selectedOption;
        let props = this.props;
        let label;
        if (typeof(option.label)==='string') {
            label = <span dangerouslySetInnerHTML={{__html: option.label}} />
        } else {
            label = option.label;
        }
        const id = `id-${key}`;
        return (
            <div className="delivery-options__option" key={key}>
                <input 
                    id={id}
                    className={ props.shippingOptions && Array.isArray( props.shippingOptions ) && props.shippingOptions.length > 1 ? "" : "hidden" }
                    type="radio"
                    name={this.props.locationCode}
                    value={option.value}
                    onChange={this.handleOptionClick.bind(this, option.value, option.option)}
                    checked={selected}
                />
                <label htmlFor={id}>
                    {label}
                </label>
            </div>
        );

    }
    render() {
        let options;
        if (this.props.warehouse.details.shippingOverride) {
            options = [this.renderOption(this.props.warehouse.details.shippingOverride, 0, this.props.warehouse.method, this.props.warehouse.option)];
        } else {
            options = this.props.shippingOptions.map((item, i)=>{ return this.renderOption(item, i, this.props.warehouse.method, this.props.warehouse.option)});
        }
        let label = options.length > 1 ? "Choose your delivery option:" : "Delivery Method:";

        return (
            <div className="location__info delivery-options" data-warehouse>
                <div className="error-msg"></div>
                <p><strong>{ label }</strong></p>
                { options }
            </div>
        );
    }
}

class Location extends React.Component {
    render() {
        return (
            <div className="location" data-location={this.props.location}>
              <div className="location__info products">
                { this.props.products }
              </div>
              <div className="location__info shipping-from">
                <strong>Shipping from:</strong>
                <p>{this.props.details.name.split(' - ')[0]}</p>
                <p>{this.props.details.area}</p>
                <p>{this.props.details.address}</p>
                <p>{this.props.details.city}, {this.props.details.state} {this.props.details.postal}</p>
              </div>
              {this.props.deliveryOptions}
            </div>
        )
    }
}

export default ShippingOptions;
