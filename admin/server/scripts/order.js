require( "../styles/order.scss" );
var request = require('superagent');

$(function(){
	$("#remove-order").click(function(){
		if ( confirm('This will remove this order. This action cannot be undone, are you sure?') ) {
			window.location = "/order/delete/" + $(this).val();
		}
	});
});


(function OrderTotalsCalculator() {
	var saleform = $(".paymentDetailsContainer form");
	var subtotalInput = $("input.subtotal_amount:first", saleform);
	var shippingInput = $("input.freight_total", saleform);
	var discountInput = $("input.total_discount_amount", saleform);
	var taxInput = $("input.tax_amount", saleform);
	var totalInputs = $("input.total_invoice_amount", saleform);

	//console.log(saleform,subtotalInputs,shippingInput,discountInput,taxInput,totalInput);

	$("input", saleform).change(function(){
		//recalculate total
		var subtotal = Number(subtotalInput.val());
		var shipping = Number(shippingInput.val());
		var discount = Number(discountInput.val());
		var tax = Number(taxInput.val());
		var total = (subtotal-discount)+shipping+tax;
		totalInputs.val( total );
		console.log("new Total", total);
	});	
}());


//the email modal
(function HandleEmailNotifications(){
	var emailButton = $("button#emails");
	var overlay = $("#overlay");
	var emailModal = $("#emailNotificationsContainer");
	var orderId = emailModal.attr('data-orderId');
	var exit = $(".exit");
	var sendShippingUpdateBtn = $(".shipping button");
	var sendShippingCompleteBtn = $(".complete button");
	var sendPaymentBtn = $(".payment button");
	var getShippedItems = function(jqueryInputs) {
		return jqueryInputs
					.filter(function(index, item){return item.checked;})
					.map(function(index, item){return item.value;})
					.toArray();
	}
	var sendEmail = function(actionObj, cb) {
		request.post("/email/"+orderId)
		.send(actionObj)
		.end(function (err, res){
			cb(res);
		});
	}
	sendShippingUpdateBtn.click(function(e){
		var checkItems = getShippedItems($(".shipping input", emailModal));
		if (checkItems.length>0) {
			sendEmail({action:"shippingUpdate", itemNumbers:checkItems}, function(result){
				$(".shipping .alert").text("Email sent successfully");
			});
		} else {
			alert("Please check with items where shipped");
		}
	});

	sendShippingCompleteBtn.click(function(e){
		var checkItems = getShippedItems($(".complete input", emailModal));
		if (checkItems.length>0) {
			sendEmail({action:"shippingComplete", itemNumbers:checkItems}, function(result){
				$(".complete .alert").text("Email sent successfully");
			});
		} else {
			alert("Please check with items where shipped");
		}
	});
	sendPaymentBtn.click(function(e){
		sendEmail({action:"userPayment"}, function(result){
			$(".payment .alert").text("Email sent successfully");
		});
	});

	var toggleModal = function (e){
		$("#overlay").toggleClass("on");
		$("#emailNotificationsContainer").toggleClass("on");
	}
	emailButton.click(toggleModal);
	overlay.click(toggleModal);
	exit.click(toggleModal);



}());
