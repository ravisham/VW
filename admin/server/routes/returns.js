var passport = require('passport');
var express = require('express');
var router = express.Router();
const warehouses = require("../../../common/config/settings/warehouses")
const arrayOfSortedWarehouses = []
const sortedWarehouses = Object.keys(warehouses).sort((a, b) => {
  return warehouses[a].locationCode.localeCompare(warehouses[b].locationCode)
})

function renderPage(req, res, saleId) {
  let VWModel = req.VWModel
  if (true) {
    VWModel.findSale({ id: saleId })
      .then((order) => {
        //conver curency to floats for easy editing
        let moneyToFloat = (str) => {
          return str ? Number(str.replace(/[^0-9\.]+/g, "")) : str
        }
        order.subtotal_amount = moneyToFloat(order.subtotal_amount)
        order.freight_total = moneyToFloat(order.freight_total)
        order.total_discount_amount = moneyToFloat(order.total_discount_amount)
        order.tax_amount = moneyToFloat(order.tax_amount)
        order.total_invoice_amount = moneyToFloat(order.total_invoice_amount)
        sortedWarehouses.forEach((key) => {
          arrayOfSortedWarehouses.push(warehouses[key])
        })

        res.render("returns", {
          order: order,
          message: req.query.message,
          warehouses: arrayOfSortedWarehouses
        })
      })
      .catch((err) => {
        res.render("returns", {
          error: err
        })
      })
  } else {
    return res.redirect("/")
  }
}
router.get("/", function(req, res) {
	var VWModel = req.VWModel;
	var user = req.user;

	if (true) {
		VWModel.getReturnOrdersAdmin()
		.then(results=>{
			// console.log("Got orders:", results);
			res.render("returnList", {
				orders:results.reverse(),
				message : req.query.message
			});
		})
		.catch(err=>{
			res.render("returnList", {
				error:err
			});
		});
	} else {
		res.render("login", {
			error: req.query.error ? req.query.error : false
		});
	}
});
router.get("/:id", function(req, res) {
	let saleId = req.params.id;
	renderPage(req, res, saleId);
});

router.get("/delete/:id", function(req, res) {
	req.VWModel.updateSale({ id : req.params.id, deleted : true });
	res.redirect("/?message=Order " + req.params.id + " has been removed.");
});

router.post("/:id", function(req, res) {
	let saleId = req.params.id;
	let VWModel = req.VWModel;
	if (req.body.action==="updateSaleItem") {
		VWModel.findSaleItems({id: req.body.saleLineId})
		.then(saleItems=>{
			let saleItem = saleItems[0];
			let update = {
				id : saleItem.id, //req.body.saleLineId,
				shipping_options: saleItem.shipping_options
			}
			update.shipping_options.shipped= req.body.shipped==="on"?true:false;
			update.shipping_options.tracking_number= req.body.tracking_number;
			update.shipping_options.return_to= req.body.return_to;
			if (req.body.shipping_agent)
				update.shipping_options.shipping_agent= req.body.shipping_agent;
			return VWModel.updateSaleItem(update);
		})
		.then(saleItem=>{
			renderPage(req, res, saleId);
		});
	} else if (req.body.action==="updateSale") {
		VWModel.findSale({id: saleId})
		.then(sale=>{

			let update = {
				id : sale.id, //req.body.saleLineId,
				status: req.body.status,
				subtotal_amount : req.body.subtotal_amount,
				freight_total : req.body.freight_total,
				total_discount_amount : req.body.total_discount_amount,
				tax_amount : req.body.tax_amount,
				total_invoice_amount : req.body.total_invoice_amount,
				payment: sale.payment
			}
			update.payment.return_notes = req.body.return_notes;
			
			return VWModel.updateSale(update);
		})
		.then(sale=>{
			renderPage(req, res, saleId);
		}).catch(err=>{
			console.log(err);
			console.log('errr', err);
		});
	} else {
		res.status==500;
		res.end();
	}
});



module.exports = {
	Router: router
};