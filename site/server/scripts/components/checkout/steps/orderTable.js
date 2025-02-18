// This is the Order Table component that is used on the cart and confirmation page
import React from 'react';
import UserInfo from '../../UserInfo';

class OrderTable extends React.Component {
    getRows(){
        let rows=[];
        let count=0;
        this.props.onClickRemoveItem;
        for (let locationKey in this.props.locations) {
          let location = this.props.locations[locationKey];
          rows.concat(location.items.map((item,i)=>{
            
            let productCel = <ProductCel
                  onClickItem={ this.props.onClickItem }
                  onClickItemImage={ this.props.onClickItemImage }
                  product={item}
                  locationKey={locationKey}
                  onClickRemoveItem={this.props.onClickRemoveItem} 
                  isDTCUser= { UserInfo.isDTC() }
                  />
            let quantityCel = <QuantityCel
                  product={item}
                  locationKey={locationKey}
                  onClickUpdateQty={this.props.onClickUpdateQty}
                  editable={this.props.isCart} />
            let priceCel = !UserInfo.isDTC() ? <PriceCel product={item} /> : null;
            rows.push( <OrderRow
                  productCel={productCel}
                  quantityCel={quantityCel}
                  priceCel = { priceCel }
                  locationDetails={location.details}
                  shippingDetails={{method:location.method, option:location.option}}
                  shippingOptions={this.props.shippingOptions}
                  showLocation={i==0}
                  showShipping={i==0&&!this.props.isCart}
                  key={count++}
              />);
          }));
        }
        return rows;
    }
    render() {
      let user = this.props.user;      
      let priceLabel = UserInfo.isDTC() ? null : <th>Item Subtotal</th>
      //let priceLabel = user.isDTCUser ? null : <th>Item Subtotal</th>

      let headers = this.props.isCart?(
          <tr>
            <th>Shopping Cart</th>
            <th>Quantity</th>
            { priceLabel }
            <th>Shipping From</th>
          </tr>
        ) : (
          <tr>
            <th>Your Order</th>
            <th>Quantity</th>
            <th>Shipping From</th>
            <th>Shipping Method</th>
          </tr>
        );
        return <section className="orderGrid">
          <table className="orderGrid__list">
            <thead>
              { headers }
            </thead>
            <tbody>
                { this.getRows() }
            </tbody>
          </table>
        </section>;
    }
}

class OrderRow extends React.Component {
  render() {
    let productCel = this.props.productCel;
    let quantityCel = this.props.quantityCel;
    let priceCel = this.props.priceCel;
    let locationDetails = this.props.locationDetails;
    let shippingDetails = this.props.shippingDetails
    let shippingOptions = this.props.shippingOptions;
    let filteredOption = shippingOptions ? shippingOptions.filter(function( opt ) {
      return opt.value && opt.value === shippingDetails.method;
    }) : null;

    let style=this.props.showLocation?"location":null;
    let location = this.props.showLocation ? (
        <td>
          <p>{locationDetails.name.split(" - ")[0]}</p>
          <p>{locationDetails.area}</p>
          <p>{locationDetails.address}</p>
          <p>{locationDetails.city}, {locationDetails.state} {locationDetails.postal}</p>
        </td>
      ) : <td></td>;
    let shippingMethod = this.props.showShipping ? (
      <td>
        {
          filteredOption && filteredOption.length && filteredOption[0].label ? <p dangerouslySetInnerHTML={{__html: filteredOption[0].label}}></p> : null
        }
      </td>
    ) : null;
        // <p>{ shippingDetails.method }</p>
        // <p>{ shippingDetails.option }</p>
    return <tr className={style}>
      {productCel}
      {quantityCel}
      {priceCel}
      {location}
      {shippingMethod}
    </tr>;
  }
}

class ProductCel extends React.Component {
    constructor(props) {
      super(props);
      this.handleDelete=this.handleDelete.bind(this);
    }
    handleDelete( event ){
      event.preventDefault();
      this.props.onClickRemoveItem(this.props.product, this.props.locationKey);
      return false;
    }
    onClickItem( product, event ) {
      let props = this.props;
      let onClickItem = props.onClickItem;
      onClickItem( event, {
        name: product.item.model,
        brand: {
          logo: product.item.blogo
        }
      }, product.item );
    }
    onClickItemImage( product, event ) {
      let props = this.props;
      let onClickItemImage = props.onClickItemImage;
      let brandName = product.item.brand;
      let productName = product.item.model;
      let finish = product.item.specification.finish;
      let image = `${ product.item.image.list && product.item.image.list.length ? product.item.image.list[0] : "https://placehold.it/160x160" }`;
      onClickItemImage( event, brandName, productName, finish, image );
    }
    render() {
      let product = this.props.product;
      let onClickItem = this.onClickItem.bind( this, product );
      let onClickItemImage = this.onClickItemImage.bind( this, product );
      let img =  `${ product.item.image.list && product.item.image.list.length ? product.item.image.list[0] : "https://placehold.it/160x160" }`;
      let model = product.item.model;
      let custSku = <p>{`Article # ${ product.item.xref || "N/A" }`}</p>;
      let partnumber = <p>{`VW SKU # ${ product.item.part_number }`}</p>;
      let size = product.item.specification.size?<p className="checkout-size">Size: {product.item.specification.size}</p>:null;
      let finish = product.item.specification.finish?<p>Finish: {product.item.specification.finish}</p>:null;
      let deleteLink = typeof this.props.onClickRemoveItem==="function"?
                  <a href="#" className="delete" onClick={this.handleDelete}>Delete</a>:null
      let price = (product.item.price && !this.props.isDTCUser) ? <p>${product.item.price} ea.</p> : null
      return <td>
        <div className="product">
          <div className="image">
            <img src={img} alt={model} onClick={ onClickItemImage } />
          </div>
          <div className="info">
            <a href="#" onClick={ onClickItem }>{model}</a>
            {custSku}
            {partnumber}
            {size}
            {finish}
            {price}
            { deleteLink }
          </div>
        </div>
      </td>;
    }
}

class PriceCel extends React.Component {
  constructor(props){
    super(props);
    this.state = {err:false};
  }

  render() {
    let item = this.props.product.item;
    let basePrice = item.price;
    let updatedPrice = (basePrice * this.props.product.quantity).toFixed(2);
    let displayedPrice;
    if ( isNaN(updatedPrice) || !updatedPrice || typeof item.price === "undefined" ) {
      displayedPrice = 'N/A';
    } else {
      displayedPrice = '$' + updatedPrice;
    }

  return <td>
      {displayedPrice}
    </td>;
  }
}

class QuantityCel extends React.Component {
  constructor(props){
    super(props);
    this.state = {qty: this.props.product.quantity, err:false};
  }
  componentWillReceiveProps(props) {
    this.setState({
      qty: props.product.quantity,
      err: false
    });
  }
  handleQtyChange(event) {
    this.setState({
      qty: event.target.value,
      err: !isNaN(event.target.value)
    });
  }
  handleQtyUpdate(event){
    let state = this.state;
    if ( event.target.value !== "" && !isNaN(event.target.value) && parseInt( event.target.value ) !== state.qty ){
      this.props.onClickUpdateQty(event, this.props.product.item.id, this.props.locationKey, event.target.value);
    }
  }
  render() {
    let handleQtyUpdate = this.handleQtyUpdate.bind(this);
    let handleQtyChange= this.handleQtyChange.bind(this);
    let product = this.props.product;
    let avlNum = product.item.inventory[this.props.locationKey];
    let available = typeof this.props.onClickUpdateQty==="function" ? <span className="avail-count">{ `Avail ${ avlNum }` }</span> :null
    let qty =  typeof this.props.onClickUpdateQty==="function" ?
      <div className="input-indicator">
        <input name="qty" type="text"
          autoComplete="off"
          onBlur={handleQtyUpdate}
          onChange={handleQtyChange}
          value={this.state.qty}
        />
        <div className="icons">
          <span className="icon loading-icon"></span>
          <span className="icon error-icon"></span>
          <span className="icon success-icon"></span>
        </div>
      </div> :
      <div className="count">{this.state.qty}</div>;
    let qtyError = this.state.qty>avlNum? <div className="error-wrapper"><div className="error-image"><img src="/img/checkout/ErrorIcon-01.svg"/></div><div className="error">Quantity exceeds current stock. Please refine your selection.</div></div> : null;
    return <td>
      <div className="quantity">
        { available }
        { qty }
        { qtyError }
      </div>
    </td>;
  }
}

export default OrderTable;
