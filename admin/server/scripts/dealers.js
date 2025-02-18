require("../styles/dealers.scss");

var List = require("list.js");

$(function () {

	var userList = new List('sortableTable', {
		valueNames: ['name', 'taxable', 'nav_customer_id', 'account_number', 'created', 'updated']
	});

    $('button#delete').click(event => {
        let self = event.currentTarget;

        if (confirm('Disabling this dealer will prevent them from logging in, and you will not be able to edit their information further. Continue?')) {

            $("input[name=disable_user]").val('true');
            $(".dealerCreateDetails form").submit();
        }

        event.stopPropagation();
        return false;
    });

    const disabledRows = document.querySelectorAll('#dealerListTable tr.disabled');
    const checkbox = document.querySelector("#statusToggle input[type=checkbox]");
    if (checkbox) {
        checkbox.addEventListener('change', function () {
            const display = this.checked ? "table-row" : "none";

            for (let i = 0; disabledRows.length > 0; i++) {
                disabledRows[i].style.display = display;
            }
        });
    }

    $(".dealerCreateDetails form").on('submit', function(evt){
       let sendToUser = $("input[name=sendToUser]")[0];
       let sendToDealer = $("input[name=sendToDealer]")[0];
       let dealerEmail = $("input[name=order_confirmation_email]");

        if ( !sendToUser.checked && !sendToDealer.checked ) {
            alert('Note - user\'s belonging to this dealer will not receive ANY order confirmation based on the options chosen.');
        }
        if ( sendToDealer.checked && !/.+@.+\..+/i.test(dealerEmail.val())) {
            alert('Dealer email is invalid');
            dealerEmail.addClass('err');
            evt.preventDefault();
            return false;
        }

    });

    $(disabledRows).prependTo("#dealerListTable");
    $("#dealerListTable tr.head").prependTo("#dealerListTable");

    if ( /[?&](error|message)=/.test(location.search))
        history.pushState(null, "", location.href.split("?")[0]);
});