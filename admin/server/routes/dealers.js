let passport = require('passport');
let express = require('express');
let router = express.Router();

let AWS = require('aws-sdk');
let multer = require('multer');
let multerS3 = require('multer-s3');

router.get("/", function (req, res) {
	let alert = req.query.alert;
	let brands;
	let products;
	req.VWModel.findDealers().then(items => {
		let alert;
		res.render("dealerList", {
			dealers: items,
			alert: alert,
			message: req.query.message
		});
	}).catch(err => {
		res.render("dealerList", {
			err: err
		});
	});
});

router.get("/create", function (req, res) {
	res.render("dealerEdit", {
		mode: 'Create',
		dealer: {}
	});
});

router.post("/create", function (req, res) {
	let items = [];

	let newDealer = {
		company_name_1: req.body.company_name_1,
		company_name_2: req.body.company_name_2,
		account_number: req.body.account_number,
		taxable: req.body.taxable,
		status: req.body.status,
		nav_customer_id: req.body.nav_customer_id,
		account_number: req.body.account_number
	}
	let profile = (req.body.profile) ? JSON.parse(req.body.profile) : {};

	if (req.body.sendToDealer === "on" && req.body.order_confirmation_email !== "") {
		profile.dealerEmail = req.body.order_confirmation_email
	} else {
		profile.dealerEmail = '';
	}
	profile.sendOrderEmailstoUser = req.body.sendToUser === "on";
	newDealer.profile = profile;

	let canEdit = {
		contactDetails: req.body.userPermission_name === "on",
		login: req.body.userPermission_login === "on",
		salesRep: req.body.userPermission_rep === "on",
		address: req.body.userPermission_addr === "on",
		location: req.body.userPermission_loc === "on",
		shipping: req.body.userPermission_ship === "on"
	}
	newDealer.profile.userCanEdit = canEdit;

	req.VWModel.createDealer(newDealer, items).then(product => {
		console.log(product);
		let message = "New dealer created successfully."
		res.redirect("/dealers/" + product.id + "?message=" + message);
	}).catch(err => {
		console.error(err);
		res.render("dealerEdit", {
			err: err
		});
	});
});

router.get("/:id", function (req, res) {
	let dealer_id = req.params.id;

	req.VWModel.findDealer({
		id: dealer_id
	}).then(item => {
		res.render("dealerEdit", {
			mode: 'Edit',
			message: req.query.message,
			dealer: item,
			dealer_id: dealer_id
		});
	}).catch(err => {
		console.error(err);
		res.render("dealerEdit", {
			err: err
		});
	});
});

router.post("/edit", function (req, res) {
  // if (req.body.payment_option === null || req.body.payment_option === undefined) {
  //   req.body.payment_option = "not selected"
  // }
  console.log(req.body, "BODY PAYMENT OPTION")
  console.log(req.body.payment_option, "PAYMENT OPTION")
  let newDealer = {
    id: req.body.id,
    company_name_1: req.body.company_name_1,
    company_name_2: req.body.company_name_2 || null,
    account_number: req.body.account_number,
    taxable: req.body.taxable || false,
    nav_customer_id: req.body.nav_customer_id,
    disabled: req.body.disable_user,
    payment_option: req.body.payment_option,
    fedex_account: req.body.fedex_account,
    ups_account: req.body.ups_account
  }

  let profile = req.body.profile ? JSON.parse(req.body.profile) : {}
  if (req.body.sendToDealer === "on" && req.body.order_confirmation_email !== "") {
    profile.dealerEmail = req.body.order_confirmation_email
  } else {
    profile.dealerEmail = ""
  }
  profile.sendOrderEmailstoUser = req.body.sendToUser === "on"
  newDealer.profile = profile

  let canEdit = {
    contactDetails: req.body.userPermission_name === "on",
    login: req.body.userPermission_login === "on",
    salesRep: req.body.userPermission_rep === "on",
    address: req.body.userPermission_addr === "on",
    location: req.body.userPermission_loc === "on",
    shipping: req.body.userPermission_ship === "on"
  }
  newDealer.profile.userCanEdit = canEdit
  console.log(newDealer, "UPDATED DEALER")

  let disabledUser = req.body.disable_user === "true"
  req.VWModel.createDealer(newDealer, [])
    .then((dealer) => {
      if (disabledUser) {
        res.redirect('/dealers/?message=Dealer "' + req.body.company_name_1 + '" has been disabled')
      } else {
        let message = "Dealer edited successfully."
        res.redirect("/dealers/" + dealer.id + "?message=" + message)
      }
    })
    .catch((err) => {
      console.log(err)
      res.render("dealerEdit", {
        err: err
      })
    })
});

module.exports = {
	Router: router
};