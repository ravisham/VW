import React from 'react';
import UserInfo from './UserInfo';

export const QuantityLimitText = ({ classNames }) =>
{
    if( UserInfo.isDTC() )
    {
        return <p className={classNames}>Please note for Wheel and Tire products: Max quantity that can be ordered is 12</p>;
    }

    return null;
};


// replace 800-633-3936 with 800-890-7161 for all non-dtc /users
// changed Aug 2022 to 800-633-3936 for all users
export const TollFreeNumber = () =>
{
//    return UserInfo.isDTC() ? '800-633-3936' : '800-890-7161';
    return '800-633-3936';
};

export const DisableCheckout = () =>
{
    return UserInfo.disableCheckout() ? 'y' : 'n';
};

// filter note text component
export const VehicleFilterNote = ( _props ) =>
{
    if( !_props.note || _props.note === '' ) return null;

    let note = _props.note.split( 'NOTE: ' ).join( '' ).toLowerCase();
    note = note.charAt(0).toUpperCase() + note.slice(1);



    return (
        <div className='vehicle-filter-note-container'>
            <span style={{color:'red'}}>Note: </span><span className='vehicle-filter-note-txt'>{note}</span>
        </div>
    )
};