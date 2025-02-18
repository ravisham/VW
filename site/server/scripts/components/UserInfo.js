/*
This contains all the user data. Right now i'm just using it to test for DTC,
but we can add more methods to cover all the user functionality.
 */

import $ from 'jquery';


export default class UserInfo
{
    static userDataObj;

    static getUserInfo()
    {
        this.userDataObj = {
            isDTCUser:$('body').attr('data-isDTCUser') !== "false",
            checkout_disabled:$('body').attr('data-checkout') === "false"
        };

        console.log( "GET USER INFO: ", this.userDataObj );
        // let props = document.getElementById( "props" );
        // if( !props ) return null;
        //
        // this.userDataObj = JSON.parse( props.getAttribute( "user" ));
    }

    static isDTC()
    {
        if( !this.userDataObj ) this.getUserInfo();

        // if no data just bail.
        // if( !this.userDataObj || !this.userDataObj. ) return false;

        return this.userDataObj.isDTCUser;
    }
    static disableCheckout()
    {
        if( !this.userDataObj ) this.getUserInfo();

        return this.userDataObj.checkout_disabled;
    }
}