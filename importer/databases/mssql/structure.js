const Structure = require('./nav-ecomsub');
const debug = require('debug')('importer:mssql:structure');
const inventoryLocationCodes = {
    '02': 'CA',
    '04': 'IN',
    '11': 'AL', 
    '55': 'TX',
    '60': 'AB',
    '61': 'ON',
    '70': 'NC',
    '80': 'WA',
    '85': 'NJ',
    'H10': 'FL',
    'H20': 'GA'
};

module.exports = {
    get: function(options) {
    	options = options || {};

    	var src = null;

    	if (options.from) {
    		switch(options.from) {
    			case "schema":
    				src = Structure.schema;
    				break;
    			case "tables":
    				src = Structure.schema.tables;
    				break;
    			case "tables.inventory":
    				src = Structure.schema.tables.inventory;
    				break;
                case "tables.tracking":
    				src = Structure.schema.tables.tracking;
    				break;
    			case "tables.pricing":
    				src = Structure.schema.tables.pricing;
    				break;
                case "tables.items":
                    src = Structure.schema.tables.items;
                    break;
                case "tables.orderHeader":
                    src = Structure.schema.tables.orderHeader;
                    break;
                case "tables.orderLine":
                    src = Structure.schema.tables.orderLine;
                    break;
    			default:
    				src = Structure;
    		}
    	}

    	if (src)
    		return src;
    	return Structure;
    },
    getInvTable: function() {
        return Structure.schema.tables.inventory;
    },
    getLocationCodes: function() {
        return inventoryLocationCodes;
    },
    getTrackTable: function() {
        return Structure.schema.tables.tracking;
    },
    getCrossReferenceColumns: function() {
        var crossRefColumnNames = [];
        var pricingTable = this.get({
            from: "tables.pricing"
        });
        var columns = pricingTable.columns;
        crossRefColumnNames.push(columns.crossRef1.name);
        crossRefColumnNames.push(columns.crossRef2.name);
        crossRefColumnNames.push(columns.crossRef3.name);
        crossRefColumnNames.push(columns.crossRef4.name);
        crossRefColumnNames.push(columns.crossRef5.name);
        return crossRefColumnNames;
    },
    dbName: function() {
    	return Structure.name;
    },
    schemaName: function() {
    	return Structure.schema.name;
    },
    inventoryTableName: function() {
    	return Structure.schema.tables.inventory.name;
    },
    pricingTableName: function() {
        return Structure.schema.tables.pricing.name;
    },
    itemTableName: function() {
        return Structure.schema.tables.items.name;
    }
};