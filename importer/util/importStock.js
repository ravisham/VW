const sql = require('mssql');
const config = require('config');
const Massive = require('massive');

let siteDBSettings = config.get('database');
let navDBSettings = config.get('mssql');

const pool = new sql.ConnectionPool({
	user: navDBSettings.username,
	password: navDBSettings.password,
	server: navDBSettings.host,
	database: navDBSettings.name,
	port: navDBSettings.port,
	connectionTimeout: navDBSettings.connectionTimeout || 15000,
	requestTimeout: navDBSettings.requestTimeout || 15000
});
sql.on('error', err => {
	console.log("err", err);
});

(async function () {
    try {
        let result1 = await pool.request()
            .input('input_parameter', sql.Int, 34)
            .query('select * from mytable where id = @input_parameter')
            
        console.dir(result1)
    
        // Stored procedure 
        
        let result2 = await pool.request()
            .input('input_parameter', sql.Int, value)
            .output('output_parameter', sql.VarChar(50))
            .execute('procedure_name')
        
        console.dir(result2)
    } catch (err) {
        // ... error checks 
    }
})()