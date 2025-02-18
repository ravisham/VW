import React from "react";
import { VehicleFilterNote } from '../SharedComponents';

const YEAR = '/fitmentguide/years';
const MAKE = '/fitmentguide/makes?year={year}';
const MODEL = '/fitmentguide/models?year={year}&make={make}';
const WHEEL_DATA = '/fitmentguide/wheelData?year={year}&make={make}&model={model}';


export default class VehicleFilter extends React.Component
{
    constructor( props )
    {
        super( props );

        this.state = {
            years:null,
            brands:null,
            models:null,
            diameter:null,
            note:null,
            diameterDisabled:true,
            searchBtnDisabled:true,
            isLoading:false
        };

        this.years = null;

        this.getApiData = this.getApiData.bind( this );
        this.getYears = this.getYears.bind( this );
        this.getBrands = this.getBrands.bind( this );
        this.getModels = this.getModels.bind( this );

        this.yearsLoaded = this.yearsLoaded.bind( this );
        this.brandsLoaded = this.brandsLoaded.bind( this );
        this.modelsLoaded = this.modelsLoaded.bind( this );
        this.wheelDataLoaded = this.wheelDataLoaded.bind( this );

        this.search = this.search.bind( this );
        this.restart = this.restart.bind( this );

        this.dropDownChange = this.dropDownChange.bind( this );
    }

    // did mount only fires once, after that everytime it's opened we update the props, so i'm using that event to reset.
    componentWillReceiveProps( _props )
    {
        this.init();
    }

    componentDidMount()
    {
        this.init();
        this.getYears();
    }

    componentWillUnmount()
    {
        this.init();
    }

    // >>>>>>>>>>>>>>>>>>>> AJAX CALL <<<<<<<<<<<<<<<<<<<<<<<<<<
    getApiData( _url, _callback )
    {
        this.setState({ isLoading:true });
        let scope = this;

        $.ajax({
            method: "GET",
            url: _url,
            dataType: "json",
            success: ( _data ) => {
                scope.setState({ isLoading:false });
                _callback( _data );
            },
            error: function( response ) { error = response; },
            complete: function( response )
            {
                // console.log( "FILTER DATA COMPLETE: ", response );
            }
        });
    }

    // >>>>>>>>>>>>>>>>>>>> GET VEHICLE DATA <<<<<<<<<<<<<<<<<<<<<<<<<<
    getYears()
    {
        if( this.years )
        {
            this.yearsLoaded( this.years );
            return;
        }

        this.getApiData( YEAR, this.yearsLoaded );
    }

    getBrands()
    {
        let path = MAKE.split( '{year}' ).join( this.filterData.carInfo.year );
        this.getApiData( path, this.brandsLoaded );
    }

    getModels()
    {
        let path = MODEL.split( '{year}' ).join( this.filterData.carInfo.year ).split( '{make}' ).join( this.filterData.carInfo.brand );
        this.getApiData( path, this.modelsLoaded );
    }

    getWheelData()
    {
        let path = WHEEL_DATA.split( '{year}' ).join( this.filterData.carInfo.year ).split( '{make}' ).join( this.filterData.carInfo.brand ).split( '{model}' ).join( this.filterData.carInfo.model );
        this.getApiData( path, this.wheelDataLoaded );
    }

    // >>>>>>>>>>>>>>>>>>>> VEHICLE DATA LOADED <<<<<<<<<<<<<<<<<<<<<<<<<<
    yearsLoaded( _data )
    {
        this.years = _data.result.psgxml.years[0].year;
        this.setState({ years:_data.result.psgxml.years[0].year, diameter:this.props.store.specifications.wheel.diameter.values, brands:null, models:null });
    }

    brandsLoaded( _data )
    {
        this.setState({ brands:_data.result.psgxml.makes[0].make, models:null });
    }

    modelsLoaded( _data )
    {
        this.setState({ models:_data.result.psgxml.models[0].model });
    }

    /*
    Create wheel spec object here, this will be passed to filters.
     */
    wheelDataLoaded( _data )
    {

        let fitment = _data.result.psgxml.fitment["0"];
        let tires = fitment.tires["0"].tire;
        let wheel = fitment.wheel[0];
        let note = fitment.note[0];

        this.filterData.carInfo.note = fitment.note[0];
        this.filterData.wheelInfo.diameter = this.getWheelDiameters( tires );
        this.filterData.wheelInfo.offset = this.getWheelOffsets( wheel );
        this.filterData.wheelInfo.boltpattern = this.getBoltPatterns( wheel );

        this.setState({ searchBtnDisabled:false, note:note });
        console.log( "WHEEL DATA LOADED: ", _data, this.filterData );
    }

    /*
    Gets bolt patterns, checks against current pattern list to verify.
     */
    getBoltPatterns( _wheel )
    {
        let boltpatterns = [];

        let std = _wheel.bpstd[0] ? _wheel.bpstd[0].split( 'x' ).join( '-' ) : null;
        let met = _wheel.bpmet[0] ? _wheel.bpmet[0].split( 'x' ).join( '-' ) : null;
        let both = _wheel.bpmet[0] && _wheel.bpstd[0] ? `${_wheel.bpstd[0].split( 'x' ).join( '-' )} (${_wheel.bpmet[0].split( 'x' ).join( '-' )})` : null;

        this.props.store.specifications.wheel.boltpattern.values.forEach(( pattern ) =>
        {
            if( pattern === std || pattern === met || pattern === both )
            {
                boltpatterns.push( pattern );
            }
        });

        return boltpatterns;
    }

    /*
    Gets wheel offsets by using the API offsets as min and max values and returning VW offset values in that range.
     */
    getWheelOffsets( _wheel )
    {
        if( !_wheel ) return [];

        if( _wheel.offsetmm[0] && _wheel.offsetmm[0].indexOf( '-' ) === -1 ) return null;

        let offsetMin = parseFloat( _wheel.offsetmm[0].split( '-' )[0] );
        let offsetMax = parseFloat( _wheel.offsetmm[0].split( '-' )[1] );
        let offsets = [];`${_wheel.bpstd[0].split( 'x' ).join( '-' )} (${_wheel.bpmet[0].split( 'x' ).join( '-' )})`
        this.props.store.specifications.wheel.offset.values.forEach(( offset ) =>
        {
            if( parseFloat( offset ) >= offsetMin && parseFloat( offset ) <= offsetMax )
            {
                offsets.push( offset );
            }
        });

        return offsets;
    }

    /*
    Gets wheel diameters by using the API diameters as min and max values and returning VW diameter values in that range.
     */
    getWheelDiameters( _tires )
    {
        if( !_tires ) return [];

        let diaMin = parseFloat( _tires[0]['plus'][0].match(/\d+/g).map(Number).join('') );
        let diaMax = parseFloat( _tires[_tires.length -1]['plus'][0].match(/\d+/g).map(Number).join('') );
        let diameters = [];
        let diameter;
        
        if( isNaN( diaMin ) || isNaN( diaMax ) ) return [];
        
        this.props.store.specifications.wheel.diameter.values.forEach(( option ) =>
        {
			diameter = parseFloat( option );
            if( !isNaN( diameter ) && diameter >= diaMin && diameter <= diaMax )
            {
                diameters.push( option );
            }
        });

        return diameters;
    }

    // >>>>>>>>>>>>>>>>>>>> ITEM SELECTED FROM DROPDOWN <<<<<<<<<<<<<<<<<<<<<<<<<<
    yearSelected( _value )
    {
        this.filterData.carInfo.year = _value;

        this.getBrands();

        document.querySelector('#Brand').selectedIndex = 0;
        document.querySelector('#Model').selectedIndex = 0;
        document.querySelector('#Diameter').selectedIndex = 0;

        this.setState({ searchBtnDisabled:true, diameterDisabled:true, brands:null, models:null });
    }

    brandSelected( _value )
    {
        this.filterData.carInfo.brand = _value;

        this.getModels( _value );

        document.querySelector('#Model').selectedIndex = 0;
        document.querySelector('#Diameter').selectedIndex = 0;

        this.setState({ searchBtnDisabled:true, diameterDisabled:true, models:null });
    }

    modelSelected( _value )
    {
        this.filterData.carInfo.model = _value;

        this.getWheelData( _value );
        document.querySelector('#Diameter').selectedIndex = 0;
        this.setState({ searchBtnDisabled:false, diameterDisabled:false });
    }

    diameterSelected( _value )
    {
        if( this.filterData.wheelInfo.diameter.indexOf( _value ) > -1 ) return;
        this.filterData.wheelInfo.diameter = [_value];
    }

    // >>>>>>>>>>>>>>>>>>>> HANDLES DROPDOWN CHANGES <<<<<<<<<<<<<<<<<<<<<<<<<<
    dropDownChange( _item, _event )
    {
        switch( _item )
        {
            case 'years':
                this.yearSelected( _event.target.value );
                break;

            case 'brands':
                this.brandSelected( _event.target.value );
                break;

            case 'models':
                this.modelSelected( _event.target.value );
                break;

            case 'diameter':
                this.diameterSelected( _event.target.value );
                break;
        }
    }

    // >>>>>>>>>>>>>>>>>>>> SEND WHEEL DATA TO FILTERS <<<<<<<<<<<<<<<<<<<<<<<<<<
    search( event )
    {
        this.props.applyVehicleFilter( this.filterData );
    }

    // >>>>>>>>>>>>>>>>>>>> CLEARS DROPDOWNS <<<<<<<<<<<<<<<<<<<<<<<<<<
    restart( event )
    {
        this.init();
    }

    init()
    {
        document.querySelector('#Year').selectedIndex = 0;
        document.querySelector('#Brand').selectedIndex = 0;
        document.querySelector('#Model').selectedIndex = 0;
        document.querySelector('#Diameter').selectedIndex = 0;

        this.filterData = {
            carInfo:{
                year:'',
                brand:'',
                model:'',
                note:''
            },
            wheelInfo:{
                backspace:[],
                boltpattern:[],
                diameter:[],
                offset:[],
                width:[]
            }
        };

        this.setState({ searchBtnDisabled:true, diameterDisabled:true, brands:null, models:null, note:null });
    }

    render()
    {
        let searchDisabled = this.state.searchBtnDisabled ? 'inactive' : '';

        return (
            <div>
                <FitmentLoadingIndicator isLoading={this.state.isLoading} />
                <div>
                    <h1 className='vehicle-filter-header'>FIND WHEELS FOR<br/>SPECIFIC VEHICLES</h1>
                    <div className='vehicle-filter-dropdowns'>
                        <DropDown items={this.state.years} disabled={false} onChange={this.dropDownChange.bind( null, 'years' )} id='Year'/>
                        <DropDown items={this.state.brands} disabled={ !this.state.brands || this.state.brands.length === 0 } onChange={this.dropDownChange.bind( null, 'brands' )} id='Brand'/>
                        <DropDown items={this.state.models} disabled={ !this.state.models || this.state.models.length === 0 } onChange={this.dropDownChange.bind( null, 'models' )} id='Model'/>
                        <DropDown items={this.state.diameter} disabled={this.state.diameterDisabled} onChange={this.dropDownChange.bind( null, 'diameter' )} id='Diameter'/>
                    </div>
                    <VehicleFilterNote note={this.state.note} />
                    <div className='vehicle-filter-buttons'>
                        <button onClick={this.restart} className="cta cta--button--white btnLeft vehicle-filter-btn" type="submit">Restart</button>
                        <button onClick={this.search} disabled={this.state.searchBtnDisabled} className={`cta cta--button btnRight vehicle-filter-btn ${searchDisabled}`} type="submit">Search</button>
                    </div>
                </div>
            </div>
        )
    }
}


const DropDown = ( props ) =>
{
    if( !props ) return null;

    let options = [
        <option key={ 'na' } value={ 'na' }>{`Select ${props.id}`}</option>,
    ];

    if( props.items )
    {
        props.items.forEach(( item ) =>
        {
            options.push( <option key={ item } value={ item }>{ item }</option> );
        });
    }

    return (
        <select disabled={ props.disabled } onChange={ props.onChange } className="select-item" name={ props.id } id={ props.id }>
            { options }
        </select>
    )
};

const FitmentLoadingIndicator = ( props ) =>
{
    if( !props.isLoading ) return null;

    return (
        <div className='loading'>
            <div className="loading-indicator">
                <span className="loading-icon"/>
            </div>
        </div>
    );
};