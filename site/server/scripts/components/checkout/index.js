import React, {Component} from 'react';
import ReactDOM from 'react-dom';

import PurchaseOrder from './steps/purchaseOrder';
import ShippingAddress from './steps/shippingAddress';
import ShippingOptions from './steps/shippingOptions';
import Cart from './steps/cart';
import Confirmation from './steps/confirmation';
import LoadingIndicator from "../overlay/loadingIndicator";
import ItemDetails from "../overlay/itemDetails";
import ItemImage from "../overlay/itemImage";
import UserInfo from "../UserInfo";


let RemoveItemConfirmation = require("../overlay/removeItemConfirmation");
let SubmitPOError = require("../overlay/submitPOError");
let SubmitShippingError = require("../overlay/submitShippingError");

let Checkout = React.createClass(
    {
        getInitialState: function () {
            let handleCart = this.handleCart;
            let props = this.props;
            let cart = props.cart;
            let warehouses = props.warehouses;
            let subtotal = cart.subtotal;
            let fields = [
                {
                    label: "First Name",
                    name: "first_name",
                    maxLength: "50"
                },
                {
                    label: "Last Name",
                    name: "last_name",
                    maxLength: "50"
                },
                {
                    label: "Phone Number",
                    name: "phone_number"
                },
                {
                    label: "Store Number *",
                    name: "store_number",
                    maxLength: "20"
                },
                {
                    label: "Address 1",
                    name: "address_1",
                    maxLength: "50"
                },
                {
                    label: "Address 2",
                    name: "address_2",
                    maxLength: "50"
                },
                {
                    label: "City",
                    name: "city",
                    maxLength: "30"
                },
                {
                    label: "State",
                    name: "state"
                },
                {
                    label: "Postal Code",
                    name: "postalcode",
                    maxLength: "10"
                }
            ];

            let shipping = {};
            // console.log("props.user.store_number",props.user.store_number);

            fields.forEach((obj, index) => {
                if (obj.name in props.user) fields[index].value = props.user[obj.name];

                if (obj.name === 'postalcode') fields[index].value = props.user.zip;
            });

            fields.forEach(function (field, index, array) {
                shipping[field.name] = field.value;
                // shipping[field.name] = field.name;
            });

            //set default shipping options
            Object.keys(warehouses).map(key => {
                if (warehouses[key].details.shippingOverride) {
                    warehouses[key].method = warehouses[key].details.shippingOverride.value;
                    warehouses[key].option = warehouses[key].details.shippingOverride.option || "";
                }
                else {
                    warehouses[key].method = this.props.shippingOptions[0].value;
                    warehouses[key].option = this.props.shippingOptions[0].option || "";
                }
            });

            // took these out of the state object
            this.po_number = null;
            this.shipping = shipping;
            this.fields = fields;
            this.properties = __generateProperties();

            this.enableCheckoutBtn = this.enableCheckoutBtn.bind(this);
            this.calcTotalQty = this.calcTotalQty.bind( this );

            // initial state
            return {
                canPay: false,
                cart: {
                    items: cart.items
                },
                step: "cart",
                totals: {
                    shippingtotal: 0,
                    subtotal: subtotal || 0,
                    taxtotal: 0,
                    total: 0
                },
                warehouses: warehouses,
                shipping
            };
        },

        // enable / disable proceed to checkout button
        enableCheckoutBtn: function (_enabled) {
            let btnNodes = document.querySelectorAll('.proceedToCheckoutBtn');
            if (!btnNodes) return null;

            let btn;
            for (let i = 0; i < btnNodes.length; i++) {
                btn = btnNodes[i];
                if (!btn) continue;

                if (_enabled) {
                    btn.disabled = false;
                    btn.style.opacity = 1;
                }
                else {
                    btn.disabled = true;
                    btn.style.opacity = .5;
                }
            }
        },

        handleCart: function (cart) {
            let props = this.props;
            let warehouses = {};
            let subtotal = cart.subtotal;

            cart.items.forEach(function (item, index, array) {
                let locations = [];
                for (let key in props.warehouses) {
                    let warehouse = props.warehouses[key];
                    let quantity = item.locations[key];
                    if (quantity) {
                        if (!warehouses[key]) {
                            warehouses[key] = {items: [], method: "", option: "", details: warehouse};
                        }
                        warehouses[key].items.push({item: item, quantity: quantity});
                        locations.push({key: key, quantity: quantity});
                    }
                }

                item.locations = locations;
            });

            return {
                cart: cart,
                subtotal: subtotal,
                warehouses: warehouses
            };
        },

        onChangePONumberField: function (event) {
            let target = event.target;
            let value = target.value;
            let $target = $(target);

            if (value && value.trim() !== "" && $target.hasClass("error")) $target.removeClass("error");

            this.po_number = value && value.trim() !== "" ? value : "";
        },

        onClickAddItems(event, id, locations) {
            event.preventDefault();

            let scope = this;

            // let state = this.state;
            let setState = this.setState.bind(this);
            let target = event.target;
            let $target = $(target);

            let result, error;

            if ($target.hasClass("copy")) $target = $target.parent();

            if (!$target.hasClass("toggle")) {
                $target.addClass("toggle");
                $target.addClass("loading");

                scope.enableCheckoutBtn(false);

                $.ajax({
                    method: "POST",
                    url: "/cart?checkout=true",
                    dataType: "json",
                    data: {
                        id: id,
                        locations: JSON.stringify(locations)
                    },

                    success: function (response) {
                        result = response;
                    },

                    error: function (response) {
                        error = response;
                    },

                    complete: function () {
                        scope.enableCheckoutBtn(true);

                        $target.removeClass("loading");

                        if (!error) {

                            $target.addClass("success");

                            setState({
                                cart: result.data.cart,
                                subtotal: result.data.subtotal,
                                warehouses: result.data.warehouses
                            });

                            setTimeout(function () {
                                $target.removeClass("toggle success");
                            }, 1000);
                        }
                        else {
                            console.log("error");
                            console.log(error);

                            $target.addClass("error");
                            setTimeout(function () {
                                $target.removeClass("toggle error");
                            }, 1000);
                        }
                    }
                });
            }
        },

        onClickPay: function (event) {
            let scope = this;
            let state = this.state;
        },

        onClickClose(event) {
            event.preventDefault();
            __closeModal();
        },

        onClickItem(event, productDetails, item) {
            event.preventDefault();

            let scope = this;
            let state = this.state;
            let user = scope.props.user;
            let warehouses = state.warehouses;
            let onClickAddItems = this.onClickAddItems.bind(this);
            let onClickClose = this.onClickClose.bind(this);

            __openModal("item-details");

            ReactDOM.render(
                <ItemDetails
                    categoryProperties={scope.properties[item.type]}
                    item={item}
                    user={user}
                    onClickAddItems={onClickAddItems}
                    onClickClose={onClickClose}
                    productDetails={productDetails}
                    warehouses={user.warehouses}
                />,
                document.querySelectorAll(".modal__content")[0]
            );
        },

        onClickItemImage(event, brandName, productName, finish, image) {
            event.preventDefault();
            __openModal("item-image");

            ReactDOM.render(
                <ItemImage
                    brandName={brandName}
                    finish={finish}
                    image={image}
                    productName={productName}
                />,
                document.querySelectorAll(".modal__content")[0]
            );
        },

        onClickRemoveItem: function (product, location) {
            let component = this;
            let handleCart = this.handleCart;
            let renderOverlay = this.renderOverlay;
            let unmountOverlay = this.unmountOverlay;
            let itemId = product.item.id;
            if (itemId) {
                let onClickSubmit = function (event) {
                    event.preventDefault();

                    let scope = this;
                    let target = event.target;
                    let $target = $(target);
                    let result, error;

                    if ($target.hasClass("copy")) $target = $target.parent();

                    if (!$target.hasClass("toggle")) {
						component.enableCheckoutBtn(false);

                        $target.addClass("toggle");
                        $target.addClass("loading");

                        $.ajax({
                            method: "POST",
                            url: `/cart/${itemId}?remove=true`,
                            dataType: "json",
                            data: {
                                location: location
                            },

                            success: function (response) {
                                result = response;
                            },

                            error: function (response) {
                                error = response;
                            },

                            complete: function () {
								component.enableCheckoutBtn(true);
                                $target.removeClass("loading");

                                if (!error) {

                                    let totals = component.state.totals;
                                    totals.subtotal = result.subtotal;

                                    $target.addClass("success");

                                    component.setState({
                                        cart: result.cart,
                                        totals: totals,
                                        warehouses: result.warehouses
                                    });

                                    setTimeout(function () {
                                        $target.removeClass("toggle success");
                                        unmountOverlay();
                                    }, 1000);
                                }
                                else {
                                    $target.addClass("error");
                                    setTimeout(function () {
                                        $target.removeClass("toggle error");
                                    }, 1000);
                                }
                            }
                        });
                    }
                };

                __openModal("remove-item");
                renderOverlay(<RemoveItemConfirmation item={product.item} onClickClose={unmountOverlay}
                                                      onClickSubmit={onClickSubmit} product={product}/>);
            }
        },

        onClickGoToCart: function (event) {
            event.preventDefault();

            let setStep = this.setStep.bind(this);
            setStep("cart");
        },

        onClickSaveShipping: function (event, shipping) {
            event.preventDefault();
            let setState = this.setState.bind(this);
            let unmountOverlay = this.unmountOverlay.bind(this);
            
            setState({
                shipping: shipping
            }, unmountOverlay);
        },

        onClickShippingMethod: function (key, value, option) {
            let state = this.state;
            let warehouses = state.warehouses;

            warehouses[key].method = value;
            warehouses[key].option = option || "";

            this.setState({
                warehouses: warehouses
            });
        },

        onClickUpdateQty: function (event, itemId, location, qty) {
            let scope = this;
            let target = event.target;
            let $target = $(target);
            let result, error;

            $target = $target.parent();

            if (!$target.hasClass("toggle")) {
                this.enableCheckoutBtn(false);

                $target.addClass("toggle");
                $target.addClass("loading");

                $.ajax(
                    {
                        method: "POST",
                        url: `/cart/${itemId}?qty=${qty}`,
                        dataType: "json",
                        data: {
                            location: location,
                            qty: qty
                        },

                        success: function (response) {
                            result = response;
                        },

                        error: function (response) {
                            error = response;
                        },

                        complete: function () {
                            scope.enableCheckoutBtn(true);
                            $target.removeClass("loading");

                            if (!error) {
                                $target.addClass("success");

                                //save the shipping option info

                                Object.keys(scope.state.warehouses).forEach(key => {
                                    result.warehouses[key].method = scope.state.warehouses[key].method;
                                    result.warehouses[key].option = scope.state.warehouses[key].option;
                                });

                                scope.setState({
                                    cart: result.cart,
                                    subtotal: result.subtotal,
                                    warehouses: result.warehouses
                                });

                                setTimeout(function () {
                                    $target.removeClass("toggle success");
                                }, 1000);
                            }
                            else {
                                console.log("error");
                                console.log(error);

                                $target.addClass("error");
                                setTimeout(function () {
                                    $target.removeClass("toggle error");
                                }, 1000);
                            }
                        }
                    });
            }
        },

        onSubmit: function (event) {
            event.preventDefault();

            const errors = this.validateCheckout();

            if (errors > 0) {
                document.querySelector('.errors').style.display = 'inline-block';
                return false;
            }
            else {
                document.querySelector('.errors').style.display = 'none';
            }

            let scope = this;
            let state = this.state;
            let onSubmit = this.onSubmit;
            let renderOverlay = this.renderOverlay;
            let setStep = this.setStep;
            let unmountOverlay = this.unmountOverlay;
            let target = event.target;
            let $target = $(target);
            let result, error;

            if ($target.hasClass("copy")) $target = $target.parent();

            scope.shipping = this.state.shipping;

            if (!$target.hasClass("toggle")) {
                this.enableCheckoutBtn(false);

                $target.addClass("toggle");
                $target.addClass("loading");

                // still using frontend for cart instead of retreiving data on DB query
                $.ajax(
                    {
                        method: "POST",
                        url: "/checkout",
                        dataType: "json",
                        data: {
                            po_number: scope.po_number,
                            shipping: JSON.stringify(scope.shipping),
                            // totals: JSON.stringify( state.totals ),
                            warehouses: JSON.stringify(state.warehouses)
                        },

                        success: function (response) {
                            result = response;
                        },

                        error: function (response) {
                            error = response;
                        },

                        complete: function () {
                            scope.enableCheckoutBtn(true);
                            $target.removeClass("loading");

                            if (!error) {
                                $target.addClass("success");
                                scope.setState({
                                    won: result.won
                                }, scope.setStep.bind(this, "confirmation"));

                                setTimeout(function () {
                                    $target.removeClass("toggle success");
                                }, 1000);
                            }
                            else {
                                console.log(error);

                                $target.addClass("error");
                                setTimeout(function () {
                                    $target.removeClass("toggle error");
                                }, 1000);
                                renderOverlay(
                                    <SubmitPOError
                                        error={error.responseJSON}
                                        onClickRetry={onSubmit}
                                        onClickClose={unmountOverlay}
                                    />
                                );
                            }
                        }
                    });
            }
        },

        onSubmitShipping: function (event) {
            let onSubmitShipping = this.onSubmitShipping;
            let onSubmitShippingFieldError = this.onSubmitShippingFieldError;
            let onSubmitShippingWarehouseError = this.onSubmitShippingWarehouseError;
            let renderOverlay = this.renderOverlay;
            let setStep = this.setStep;
            let unmountOverlay = this.unmountOverlay;
            let state = this.state;
            let warehouses = __parseWarehouses(state);
            let emptyFields = [];
            let emptyWarehouses = [];
            let hasFieldError, hasWarehouseError;
            let scope = this;

            for (let key in scope.shipping) {
                let field = scope.shipping[key];
                if (key !== "store_number" && key !== "address_2") {
                    if (field) {
                        //console.log(`${key}: ${field}`);
                    }
                    else {
                        hasFieldError = true;
                        emptyFields.push(key);
                    }
                }
            }

            for (let key in warehouses) {
                let warehouse = warehouses[key];
                if (warehouse.method) {
                    // console.log(`${key}: ${warehouse.method}`);
                }
                else {
                    hasWarehouseError = true;
                    emptyWarehouses.push(key);
                }
            }

            if (!scope.po_number) {
                hasFieldError = true;
                emptyFields.push("po_number");
            }

            if (!hasFieldError && !hasWarehouseError) {
                let result, error;
                this.enableCheckoutBtn(false);

                $.ajax(
                    {
                        method: "POST",
                        url: "/checkout/totals",
                        dataType: "json",
                        data: {
                            // postalcode: state.shipping.postalcode,
                            po_number: scope.po_number,
                            shipping: JSON.stringify(scope.shipping),
                            // totals: JSON.stringify( state.totals ),
                            warehouses: JSON.stringify(warehouses)
                        },

                        success: function (response) {
                            result = response;
                        },

                        error: function (response) {
                            error = response;
                        },

                        complete: function () {
                            scope.enableCheckoutBtn(true);

                            if (!error) {
                                setStep("confirmation", result);
                                unmountOverlay();
                            }
                            else {
                                console.log(error);
                                renderOverlay(<SubmitShippingError error={error.responseJSON}
                                                                   onClickRetry={onSubmitShipping}
                                                                   onClickClose={unmountOverlay}/>);
                            }
                        }
                    });

                renderOverlay(<LoadingIndicator/>);
            }
            else {
                if (hasFieldError) onSubmitShippingFieldError(emptyFields);
                if (hasWarehouseError) onSubmitShippingWarehouseError(emptyWarehouses);
            }
        },

        renderOverlay: function (component) {
            let modal = document.getElementById("modal");
            let modalContent = modal.querySelectorAll(".modal__content")[0];
            let $htmlBody = $("html, body");
            let $modal = $(modal);

            if ($modal.hasClass("hidden")) {
                $htmlBody.addClass("no-scroll");
                $modal.removeClass("hidden");
            }

            ReactDOM.render(component, modalContent);
        },

        unmountOverlay: function () {
            let modal = document.getElementById("modal");
            let modalContent = modal.querySelectorAll(".modal__content")[0];
            let $htmlBody = $("html, body");
            let $modal = $(modal);

            if (!$modal.hasClass("hidden")) {
                $modal.addClass("hidden");
                $htmlBody.removeClass("no-scroll");
            }

            ReactDOM.unmountComponentAtNode(modalContent);
        },

        scrollTop: function (selector, offset = 0) {
            $("html, body").animate({
                scrollTop: offset
            }, 300);
        },

        toggleError: function (selector, hasError, message = hasError) {
            const el = document.querySelector(selector);
            const errorMsg = el.querySelector('.error-msg');

            if (el) {
                if (hasError) {
                    el.classList.add('has-error');
                    if (errorMsg) errorMsg.innerHTML = message;
                }
                else {
                    el.classList.remove('has-error');
                    if (errorMsg) errorMsg.innerHTML = "";
                }
            }
        },

        validateCheckout: function () {
            const rules = {
                po_number: {
                    validate(value) {
                        if (!value || value === '') {
                            return 'Purchase order cannot be blank.';
                        }
                        if (UserInfo.isDTC() && !(/^(45|47)\d{8}$/.test(value))) {
                            return 'Purchase order must be 10 digits and start with "45" or "47".';
                        }
                        return false;
                    }
                },
                shipping_method: {
                    message: 'Please choose a shipping method.'
                },
                quantity: {
                    message: 'Quantity cannot be blank and can only be numbers.'
                }
            };

            let numOfErrors = 0;
            let invalid = rules.po_number.validate(this.po_number);
            numOfErrors += (invalid) ? 1 : 0;

            this.toggleError('.checkout__steps__step-content', invalid);

            const warehouses = this.state.warehouses;

            Object.keys(warehouses).forEach((warehouse) => {
                invalid = (warehouses[warehouse].method === '');
                numOfErrors += (invalid) ? 1 : 0;
                this.toggleError(`[data-location="${warehouse}"] .delivery-options`, invalid, rules.shipping_method.message);

                warehouses[warehouse].items.forEach((item) => {
                    const quantityError = (item.quantity === '');
                    numOfErrors += (quantityError) ? 1 : 0;

                    const overQuantityError = (item.quantity > item.item.inventory[warehouse]);
                    numOfErrors += (overQuantityError) ? 1 : 0;

                    this.toggleError(`[data-location="${warehouse}"] .quantity`, quantityError, rules.quantity.message);
                    this.toggleError(`[data-location="${warehouse}"] [data-id="${item.item.id}"]`, overQuantityError, "Quantity exceeds stock. Please refine your selection.");
                })
            });
            return numOfErrors;
        },

        scrollToError: function () {
            const errors = document.querySelectorAll('.has-error');

            function offset(el) {
                const rect = el.getBoundingClientRect();
                const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                return {
                    top: rect.top + scrollTop,
                    left: rect.left + scrollLeft
                };
            }

            if (errors.length) {
                const headerDiff = document.querySelector('.header').offsetHeight + 30;
                const pos = offset(errors[0]);
                this.scrollTop(null, pos.top - headerDiff);
            }
        },

        setStep: function (step, data, noScroll) {
            if (step === 'confirmation') {
                const errors = this.validateCheckout();

                if (errors > 0) {
                    document.querySelector('.errors').style.display = 'inline-block';
                    return false;
                }
            }

            this.setState({
                step: step
            }, function () {
                this.scrollTop();
            });
        },

        calcTotalQty: function ()
        {
            let total = 0; //need to count up to total, itterating each locations and their item qty's
            let headerQty = $(".header__cart-quantity__count");

            if( this.state.step === 'confirmation' )
            {
                headerQty.html(0);
                return 0;
            }

            for( let locationKey in this.state.warehouses )
            {
                let location = this.state.warehouses[locationKey];
                total += location.items.reduce(( accu, item ) =>
                {
                    return accu + item.quantity;
                }, 0 );
            }

            headerQty.html(total);

            return total;
        },

        render: function () {
            let gotoCheckout = this.setStep.bind(this, "checkout");
            let gotoCart = this.onClickGoToCart.bind(this);
            let gotoConfirmation = this.setStep.bind(this, "confirmation");
            let state = this.state;
            let qty = this.calcTotalQty();
            let totals = this.state.totals;
            let subtotal = this.state.subtotal ? this.state.subtotal : this.state.totals.subtotal;

            let grandtotal = (
                (parseFloat(subtotal) || 0) +
                (parseFloat(totals.shippingtotal) || 0) +
                (parseFloat(totals.taxtotal) || 0))
                .toFixed(2);

            let renderStep;
            let user = this.props.user;

            switch (state.step)
            {
                case "cart":
                    renderStep = <Cart
                        qty={qty}
                        subtotal={subtotal}
                        user={this.props.user}
                        locations={state.warehouses}
                        onClickItem={this.onClickItem}
                        onClickItemImage={this.onClickItemImage}
                        onClickRemoveItem={this.onClickRemoveItem}
                        onClickUpdateQty={this.onClickUpdateQty}
                        submit={gotoCheckout}
                    />;
                    break;

                case "checkout":
                    renderStep = <div className="checkout">
                        <div className="checkout__total">
                            <p>Checkout (<a href="#" onClick={gotoCart} className="cta cta--inline"><span
                                className="cart__total">{qty}</span> Items</a>)</p>
                        </div>

                        {user.isDTCUser ? null :
                            <div className="checkout__steps__place-order-box">
                                <div className="cta cta--button place-order">
                                    <span className="copy" onClick={this.onSubmit}>Place Your Order</span>
                                    <div className="icons">
                                        <span className="icon loading-icon"/>
                                        <span className="icon error-icon"/>
                                        <span className="icon success-icon"/>
                                    </div>
                                </div>

                                <h3>Order Summary</h3>
                                <p>Items ({qty}): <span>${subtotal}</span></p>
                                <p>Shipping &amp; handling*: <span>${totals.shippingtotal}</span></p>
                                <p>Tax:<span>${totals.taxtotal}</span></p>
                                <hr/>
                                <p className="total">Order total:<span>${grandtotal}</span></p>
                                <p className="small">*Price does not include shipping cost<br/> For questions please call, <span>1 (800) 633-3936</span></p>
                            </div>
                        }
                        
                        <PurchaseOrder name='po_number' value={this.po_number} onChange={this.onChangePONumberField}/>

                        <ShippingAddress onClickSaveShipping={this.onClickSaveShipping}
                                         shippingTo={this.state.shipping}
                                         shippingFields={this.fields}
                                         unmountOverlay={this.unmountOverlay}
                                         user={user} />

                        <ShippingOptions warehouses={state.warehouses}
                                         shippingOptions={this.props.shippingOptions}
                                         onClickRemoveItem={this.onClickRemoveItem}
                                         onClickUpdateQty={this.onClickUpdateQty}
                                         onClickShippingMethod={this.onClickShippingMethod}
                                         isDTCUser={user.isDTCUser}/>

                        <div className="checkout__steps__place-order">
                            <div className="cta cta--button place-order">
                                <span className="copy" onClick={this.onSubmit}>Place Your Order</span>
                                <div className="icons">
                                    <span className="icon loading-icon"/>
                                    <span className="icon error-icon"/>
                                    <span className="icon success-icon"/>
                                </div>
                            </div>
                            {user.isDTCUser ? null :
                                <div className="subtotal">Order total: <span>${grandtotal}</span></div>}
                            <br/><br/>
                            <span className="errors">One or more of the fields above are incorrect. <button
                                onClick={this.scrollToError}>See Error(s)</button></span>
                        </div>
                    </div>;
                    break;

                case "confirmation":
                    renderStep = <Confirmation won={this.state.won} locations={state.warehouses} shippingOptions={this.props.shippingOptions} />;
                    break;
            }

            return (
                <div id="checkout">
                    <div className="content">
                        <div className="checkout__steps">
                            {renderStep}
                        </div>
                    </div>
                </div>
            );
        }
    });

module.exports = Checkout;


function __parseWarehouses(state) {
    // Since this logic runs in `onSubmit`
    // I put it in this private function.
    // "standard", "ltl", "expedited", expedited.option = "2 day" || "overnight"
    // "pickup"
    let warehouses = {};
    //console.log( state.warehouses );
    for (let key in state.warehouses) {
        let method = state.warehouses[key].method;
        let option = state.warehouses[key].option;
        if (!warehouses[key]) {
            warehouses[key] = {};
        }
        warehouses[key].method = method;
        warehouses[key].option = option;
    }
    //console.log( warehouses );
    return warehouses;
};

function __closeModal() {
    let modal = document.getElementById("modal");
    modal.className = "";
    $(modal).addClass("hidden");
    $("html, body").removeClass("no-scroll");
    document.querySelectorAll(".modal__content")[0].scrollTop = 0;
    ReactDOM.unmountComponentAtNode(document.querySelectorAll(".modal__content")[0]);
};

function __generateProperties() {
    return {
        accessory: [
            {
                key: "size",
                label: "Size"
            }, {
                key: "description",
                label: "Description"
            }, {
                key: "finish",
                label: "Finish"
            }, {
                key: "additional_info",
                label: "Additional Info"
            }, {
                key: "special_notes",
                label: "Item Note"
            }
        ],
        tire: [
            {
                key: "size",
                label: "Size"
            }, {
                key: "search_description",
                label: "Search Size"
            }, {
                key: "model",
                label: "Pattern"
            }, {
                key: "ply",
                label: "PLY"
            }, {
                key: "additional_info",
                label: "Additional Info"
            }, {
                key: "special_notes",
                label: "Item Note"
            }
        ],
        wheel: [
            {
                key: "diameter",
                label: "Diameter"
            }, {
                key: "width",
                label: "Width"
            }, {
                key: "boltpattern1",
                label: "Bolt Pattern 1"
            }, {
                key: "boltpattern2",
                label: "Bolt Pattern 2"
            }, {
                key: "backspace",
                label: "Backspace"
            }, {
                key: "offset",
                label: "Offset"
            }, {
                key: "cap_bore_load",
                label: "Cap/Bore/Load"
            }, {
                key: "additional_info",
                label: "Additional Info"
            }, {
                key: "special_notes",
                label: "Item Note"
            }
        ],
    };
};

function __openModal(className) {
    let $modal = $("#modal");
    $("html, body").addClass("no-scroll");
    $modal.removeClass("hidden");
    if (className) {
        $modal.addClass(className);
    }
    document.querySelectorAll(".modal__content")[0].scrollTop = 0;
};
