const fs = require('fs');
const path = require('path');
const config = require('config');
const Massive = require('massive');
const parse = require('csv-parse/lib/sync');
const Crypt = require('../helpers/crypt');
const dealerID = process.env.NODE_ENV==="production"? 29039 : 40583;

let settings = config.get('database');
let dbSettings = {connectionString: settings.client+'://'+settings.username+':'+settings.password+'@'+settings.host+':'+settings.port+'/'+settings.name};
let Database = Massive.connectSync(dbSettings);
let userDataRaw  = fs.readFileSync(path.resolve(__dirname, "../src", "dtc_users.csv"),'utf8');
let userData = parse(userDataRaw, {columns:true});

console.log(dbSettings.connectionString);

let dbUsers = Database.membership.user.findSync({})
// find the new people
let dbUserEmails = dbUsers.map(user=>user.email);
let newUsers = userData.filter(user=>!dbUserEmails.includes(user.Email));
console.log(`Found ${newUsers.length} new users`);
if (newUsers.length===0) return false;


return false;
//create new users record objects	
let newUserRecords =  newUsers.map(user=> {return {
	first_name: user['First Name'],
	last_name: user['Last Name'],
	phone_number: user.Phone,
	role: 'owner',
	status: 'pending',
	cart: { items: {} },
	dealer_id: dealerID,
	email: user.Email,
	sales_rep: 34,
	address_1: user['Address 1'],
	address_2: user['Address 2'],
	city: user.City,
	state: user.State,
	zip: user.Zip,
	country: 'US',
	shipping_config: { defaultLocationCode: user['Preffered Location'] },
	username: user.Username.toLowerCase(),
	store_number: user['Site ID/Ship-to Code']
}});
let newUserPasswords = newUsers.map(user=>{return { password_hash: Crypt.encode(user.Password).token }});

//  write logins to db
let dbLogins = Database.membership.login.saveSync(newUserPasswords);
console.log("saved logins", dbLogins);

newUserRecords.forEach((userRec,i)=>{
	console.log('Matching', userRec.username,'to pass',Crypt.decode(dbLogins[i].password_hash))
	userRec.login_id=dbLogins[i].id;
});
let newDBUsers = Database.membership.user.saveSync(newUserRecords);
console.log("got new DB users", newDBUsers);
//update logins with new userId's
dbLogins.forEach((login,i)=>{
	let loginUpdate = {
		id: login.id,
		user_id: newDBUsers[i].id
	}
	let result = Database.membership.login.updateSync(loginUpdate);
	console.log("udpated", result);
});


// DB Login Structure
// id : 3
// user_id : 3791
// password_hash : "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJwYXNzd29yZCI6Ik1uYnp4YzEyISJ9.kWY_9SfybHL2Jmge2MP-b8qvuIsHxOsQ7xm6Dvd_Sh0"
// created : "2017-05-25 10:12:21.885"  <--- set to now()
// last_accessed : "2017-06-27 19:19:58.134"  <--- set to now()
// status : 
// hashed_reset_id : 


//db user structure
// {
// id: 10,
// login_id: 3,
// first_name: 'Ryan',
// last_name: 'Elston',
// phone_number: '8313202449',
// role: 'owner',
// status: 'pending',
// cart: { items: {} },
// dealer_id: 40584,
// email: 'ryan.elston@mirumagency.com',
// sales_rep: 34,
// address_1: '3823 Prospect Ave',
// address_2: '',
// city: 'Los Angeles',
// state: 'CA',
// zip: '90232',
// country: 'US',
// shipping_config: { defaultLocationCode: '02' },
// created: 2017-01-30T13:08:26.829Z,  <--- set to now()
// updated: 2017-06-15T22:38:07.974Z, <--- set to now()
// comments: null,
// username: 'ryan.elston',
// store_number: null }


// VW user structure
// { 'Dealer/Customer No.': 'DISCOUNTTIRE',
//   'Site ID/Ship-to Code': '1661',
//   'First Name': 'Davis ',
//   'Last Name': ' Milton',
//   'Address 1': '1572 E Florence Blvd',
//   'Address 2': '',
//   City: 'Casa Grande',
//   State: 'AZ',
//   Zip: '85122-4741',
//   Phone: '520-836-1120',
//   Username: 'AZC01',
//   Password: 'AZ1661',
//   Email: 'AZC_01@discounttire.com',
//   'Preffered Location': '02' }


