let AWS = require("libs/aws")
let pug = require("pug")
let path = require("path")
let Q = require("q")

//http://responsiveemailpatterns.com/patterns/layout/2-equal-width-columns.html
module.exports = {
  /**
   * Build an email, using the pug template orderTableEmail.pug.
   *
   * Use the order information passed in the order argument
   * and the information in the message options (dealer info, user info, etc)
   *
   * If renderResponse is true, just return the email's html
   * otherwise send it via AWS.
   *
   * If there is a dealer profile in messageOptions,
   * send the email to both the user and the dealer.
   *
   * Note: DISCOUNTTIRE emails get their email address hard coded to DTCVisionUser@visionwheel.com
   *
   * @returns {Promise}
   * @param {object} order The order details.
   * @param {object} messageOptions The details on where to send the message.
   * @param {boolean} renderResponse Should the email's HTML just be returned in the promise rather than sent via AWS.
   */
  sendOrderEmail: function (order, messageOptions, renderResponse) {
    console.log("/common/controllers/email/index.js - sendOrderEmail - Starting...")
    // If messageOptions.user.dealer.profile is set
    // Store it to dealer_profile which is otherwise undefined

    let dealer_profile
    // When there is a dealer profile
    // Send emails to both the user and their dealer
    let emailTasks = []
    let emailAddresses = []
    const localOrder = order.sale_items.find((order) => {
      return order.shipping_options.shipping_agent === "DELIVERY"
    })

    if (messageOptions === undefined) {
      console.log("ERROR in /common/controllers/email/index.js - messageOptions is undefined")
      console.log("messageOptions was...")
      console.log(messageOptions)
    } else if (messageOptions.user === undefined) {
      console.log("ERROR in /common/controllers/email/index.js - messageOptions.user is undefined")
      console.log("messageOptions was...")
      console.log(messageOptions)
    } else if (messageOptions.user.dealer && messageOptions.user.dealer.profile) {
      dealer_profile = messageOptions.user.dealer.profile
    }
    let templatePath = path.join(__dirname, "orderTableEmail.pug")
    if (messageOptions.user.isReturn) {
      order.return_reason = messageOptions.user.return_reason
      order.original_order_num = messageOptions.user.original_order_num

      templatePath = path.join(__dirname, "returnTableEmail.pug")
      messageOptions.action = "apiReturn"
    }

    // Set up the JSON object to pass to the Pug (Jade) template
    let emailData = {
      order: order,
      message: null,
      isDTCUser: order.customer_id.toUpperCase() === "DISCOUNTTIRE"
    }
    if (messageOptions) {
      emailData.message = getMessageCopy(messageOptions)
    }

    // Get the Pug (Jade) template
    // and render it to the variable emailHTML

    let emailHtml = pug.renderFile(templatePath, emailData)
    // If a response is requested
    // return a promise with the HTML
    // (rather than sending via AWS)
    if (renderResponse) {
      console.log(
        "/common/controllers/email/index.js - sendOrderEmail - Rendered response requested, not sending."
      )
      let deferred = Q.defer()
      deferred.resolve(emailHtml)
      return deferred.promise
    }

    if (localOrder) {
      if (
        messageOptions.hasOwnProperty("managerEmail") &&
        messageOptions.managerEmail.siteManagerEmail &&
        messageOptions.managerEmail.emailPreference
      ) {
        console.log(messageOptions.managerEmail.siteManagerEmail, "SEND TO SITE MANAGER")
        emailTasks.push(
          AWS.sendEmail(messageOptions.managerEmail.siteManagerEmail, emailData.message.subject, emailHtml)
        )
        emailAddresses.push(messageOptions.managerEmail.siteManagerEmail)
      }
    }
    // Attempt to get the customer email address from the order.customer_info.email
    let email = order && order.customer_info && order.customer_info.email ? order.customer_info.email : null
    // If it was present
    if (email) {
      // If there's no dealer_profile
      // overwrite email addresses for DISCOUNTTIRE
      // and then send the email
      // console.log("message options dealer email", messageOptions.user.dealerEmail)
      //API Order case
      if (messageOptions.user.isApiOrder) {
        if (messageOptions.user.isReturn) {
          email = "returns@visionwheel.com"
          //	email = "gkrauthamer@trafficdigitalagency.com";
          console.log(
            "/common/controllers/email/index.js - sendOrderEmail - API order, sending email to",
            email
          )
          emailTasks.push(AWS.sendEmail(email, emailData.message.subject, emailHtml))
          emailAddresses.push(email)
        } else if (
          //   order.web_order_number.charAt(0) === "V" ||
          //   order.web_order_number.startsWith("W") ||
          //   order.web_order_number.charAt(0) === "1"
          messageOptions.user.dealer.nav_customer_id !== "DISCOUNTTIRE"
        ) {
          //email = "ASapp@visionwheel.com";
          if (messageOptions.user.dealerEmail === "") {
            email = messageOptions.user.email
          } else {
            email = messageOptions.user.dealerEmail
          }
          console.log(email, "VISION WHEEL EMAIL")

          console.log(
            "/common/controllers/email/index.js - sendOrderEmail - API order, sending email to",
            email
          )
          emailTasks.push(AWS.sendEmail(email, emailData.message.subject, emailHtml))
          emailAddresses.push(email)
        } else {
          console.log("Test case, exiting email controller")
          return
        }

        return Promise.all(emailTasks)
      }
      //API Assign PO case
      if (messageOptions.action == "apiPoUpdate" || messageOptions.action == "apiReturn") {
        if (messageOptions.user.isReturn) {
          email = "returns@visionwheel.com"
          //email = "gkrauthamer@trafficdigitalagency.com";

          console.log(
            "/common/controllers/email/index.js - sendOrderEmail - API order, sending email to",
            email
          )
          emailTasks.push(AWS.sendEmail(email, emailData.message.subject, emailHtml))
          emailAddresses.push(email)
        } else if (order.web_order_number.charAt(0) === "V" || order.web_order_number.startsWith("W")) {
          //email = "ASapp@visionwheel.com";
          email = messageOptions.user.dealerEmail
          console.log(
            "/common/controllers/email/index.js - sendOrderEmail - API order, sending email to",
            email
          )
          emailTasks.push(AWS.sendEmail(email, emailData.message.subject, emailHtml))
          emailAddresses.push(email)
        } else if (order.web_order_number.charAt(0) === "1") {
          email = "dtdorders@visionwheel.com"

          console.log(
            "/common/controllers/email/index.js - sendOrderEmail - API order, sending email to",
            email
          )
          emailTasks.push(AWS.sendEmail(email, emailData.message.subject, emailHtml))
          emailAddresses.push(email)
        } else {
          console.log("Test case, exiting email controller")
          return
        }
      }

      if (!dealer_profile) {
        if (order.customer_id.toUpperCase() === "DISCOUNTTIRE") {
          email = "DTCVisionUser@visionwheel.com"
        }
        console.log(
          "/common/controllers/email/index.js - sendOrderEmail - No dealer profile, sending email to ",
          email
        )
        emailTasks.push(AWS.sendEmail(email, emailData.message.subject, emailHtml))
        emailAddresses.push(email)
      } else {
        if (dealer_profile.sendOrderEmailstoUser !== false) {
          emailTasks.push(AWS.sendEmail(email, emailData.message.subject, emailHtml))
          emailAddresses.push(email)
        }

        if (dealer_profile.dealerEmail) {
          emailTasks.push(AWS.sendEmail(dealer_profile.dealerEmail, emailData.message.subject, emailHtml))
          emailAddresses.push(dealer_profile.dealerEmail)
        }

        // Log how many emails _should_ be getting sent
        console.log(
          "/common/controllers/email/index.js - sendOrderEmail - Dealer profile, sending",
          emailAddresses.length,
          "email(s) to ",
          emailAddresses.join(", ")
        )
        return Promise.all(emailTasks)
      }
    }
  },
  /**
   * Handle password reset emails, sending via AWS.
   *
   * @returns {Promise}
   * @param {object} user The user to send the email to.
   * @param {string} resetUrl The url to give them.
   * @param {boolean} renderResponse Should the email's HTML just be returned in the promise rather than sent via AWS.
   */
  sendPasswordResetEmail: function (user, resetUrl, renderResponse) {
    // Set up the JSON object to pass to the Pug (Jade) template
    let emailData = {
      user: user,
      resetUrl: resetUrl,
      message: getMessageCopy({
        action: "passwordRecovery"
      })
    }

    // Get the Pug (Jade) template
    // and render it to the variable emailHTML
    let templatePath = path.join(__dirname, "passwordRecovery.pug")
    let emailHtml = pug.renderFile(templatePath, emailData)

    // If a response is requested
    // return a promise with the HTML
    // (rather than sending via AWS)
    if (renderResponse) {
      let deferred = Q.defer()
      deferred.resolve(emailHtml)
      return deferred.promise
    }
    // Send the email via AWS, returning its promise
    return AWS.sendEmail(user.email, emailData.message.subject, emailHtml)
  },
  /**
   * Handle username recovery emails, sending via AWS.
   *
   * @returns {Promise}
   * @param {object} user The user to send the email to.
   * @param {boolean} renderResponse Should the email's HTML just be returned in the promise rather than sent via AWS.
   */
  sendUsernameRecoveryEmail: function (user, renderResponse) {
    // Set up the JSON object to pass to the Pug (Jade) template
    let emailData = {
      user: user,
      message: getMessageCopy({
        action: "usernameRecovery"
      })
    }

    // Get the Pug (Jade) template
    // and render it to the variable emailHTML
    let templatePath = path.join(__dirname, "usernameRecovery.pug")
    let emailHtml = pug.renderFile(templatePath, emailData)

    // If a response is requested
    // return a promise with the HTML
    // (rather than sending via AWS)
    if (renderResponse) {
      let deferred = Q.defer()
      deferred.resolve(emailHtml)
      return deferred.promise
    }
    // Send the email via AWS, returning its promise
    return AWS.sendEmail(user.email, emailData.message.subject, emailHtml)
  },

  /**
   * Some errors need the team alerting immediately.
   * This method takes a JSON object, stringifies it, then emails to the team.
   *
   * Sends to visionwheel-alerts@mirumagency.com
   *
   * @returns {Promise}
   * @param {string} title The title to give the email.
   * @param {object} json The JSON object to stringify and send.
   * @param {boolean} renderResponse Should the email's HTML just be returned in the promise rather than sent via AWS.
   */
  sendCriticalError: function (title, json, renderResponse) {
    let emailHTML = JSON.stringify(json, null, 4)
    // Swap whitespace out to non breaking whitespace
    emailHTML = emailHTML.replace(" ", "&nbsp;")
    // Swap new lines out to break elements
    emailHTML = emailHTML.replace("\n", "<br />\n")

    // If a response is requested
    // return a promise with the HTML
    // (rather than sending via AWS)
    if (renderResponse) {
      let deferred = Q.defer()
      deferred.resolve(emailHtml)
      return deferred.promise
    }
    // Send the email via AWS, returning its promise
    return AWS.sendEmail("developer@onemagnify.com", title, emailHtml)
  }
}

// changed to case statement, a little cleaner and easier to read.
function getMessageCopy(messageOptions) {
  let returnMessage = { subject: null, header: null, subheader: null, aside: null }
  if (messageOptions.user.isReturn) {
    messageOptions.action = "apiReturn"
  }
  switch (messageOptions.action) {
    case "initOrder":
      returnMessage.subject = "Order Received"
      returnMessage.header = "Thanks for your order"
      returnMessage.subheader =
        "Your order has been received and we are now working to get it ready for shipment. Please review your order below."
      returnMessage.aside =
        "<sup>*</sup>Shipping charges may still be pending. Please allow for 24 hours for the final charges to appear."
      break

    case "shippingUpdate":
      returnMessage.subject = "A shipment is coming your way soon"
      returnMessage.header = getShippedHeaderCopy(messageOptions.itemNumbers)
      returnMessage.subheader =
        "Once your remaining items in your cart are ready for shipment we will notify you."
      returnMessage.aside = "Please review your updated charges and final receipt below."
      break

    case "shippingComplete":
      returnMessage.subject = "A shipment is coming your way soon"
      returnMessage.header = getShippedHeaderCopy(messageOptions.itemNumbers)
      returnMessage.subheader =
        "This completes all of your order.<br>We look forward to working with you again!"
      returnMessage.aside =
        "If you have not paid your order in full please click here with your purchase order number available."
      break

    case "userPayment":
      returnMessage.subject = "Thank you for your payment"
      returnMessage.header = "Thank you for your payment"
      returnMessage.subheader = "Please see your full receipt below."
      break

    case "usernameRecovery":
      returnMessage.subject = "Username Recovery"
      returnMessage.header = "Username Recovery"
      returnMessage.subheader = "Please see your username below."
      break

    case "passwordRecovery":
      returnMessage.subject = "Vision Wheel Password Reset"
      returnMessage.header = "Password Recovery"
      returnMessage.subheader = "Click on the link below to reset your password"
      break

    case "apiPoUpdate":
      returnMessage.subject = "Purchase Order Assigned"
      returnMessage.header = "This order has been updated"
      returnMessage.subheader =
        "Temporary Purchase Order <b>" +
        messageOptions.tempPOnum +
        "</b> has been updated to <b>" +
        messageOptions.permPOnum +
        "</b>"
      returnMessage.aside =
        "<sup>*</sup>Shipping charges may still be pending. Please allow for 24 hours for the final charges to appear."
      break
    case "apiReturn":
      returnMessage.subject = "New Return Submitted"
      returnMessage.header = "A new return has been submitted"
      returnMessage.subheader = ""
      break

    default:
      // just to get around lint errors.
      break
  }

  // if (messageOptions.action==="initOrder") {
  // 	returnMessage.subject = "Order Received";
  // 	returnMessage.header = "Thanks for your order";
  // 	returnMessage.subheader = "Your order has been received and we are now working to get it ready for shipment. Please review your order below.";
  // 	returnMessage.aside = "<sup>*</sup>Shipping charges may still be pending. Please allow for 24 hours for the final charges to appear.";
  // }
  // else if (messageOptions.action==="shippingUpdate")
  // {
  // 	returnMessage.subject = "A shipment is coming your way soon";
  // 	returnMessage.header = getShippedHeaderCopy(messageOptions.itemNumbers);
  // 	returnMessage.subheader = "Once your remaining items in your cart are ready for shipment we will notify you.";
  // 	returnMessage.aside = "Please review your updated charges and final receipt below.";
  // }
  // else if (messageOptions.action==="shippingComplete")
  // {
  // 	returnMessage.subject = "A shipment is coming your way soon";
  // 	returnMessage.header = getShippedHeaderCopy(messageOptions.itemNumbers);
  // 	returnMessage.subheader = "This completes all of your order.<br>We look forward to working with you again!";
  // 	returnMessage.aside = "If you have not paid your order in full please click here with your purchase order number available.";
  // }
  // else if (messageOptions.action==="userPayment")
  // {
  // 	returnMessage.subject = "Thank you for your payment";
  // 	returnMessage.header = "Thank you for your payment";
  // 	returnMessage.subheader = "Please see your full receipt below.";
  // }
  // else if (messageOptions.action==="usernameRecovery")
  // {
  // 	returnMessage.subject = "Username Recovery";
  // 	returnMessage.header = "Username Recovery";
  // 	returnMessage.subheader = "Please see your username below.";
  // }
  // else if (messageOptions.action==="passwordRecovery")
  // {
  // 	returnMessage.subject = "Vision Wheel Password Reset";
  // 	returnMessage.header = "Password Recovery";
  // 	returnMessage.subheader = "Click on the link below to reset your password";
  // }

  return returnMessage
}

function getShippedHeaderCopy(itemNumbers) {
  let returnMessageHeader = ""
  switch (itemNumbers.length) {
    case 1:
      returnMessageHeader = `Item Number ${itemNumbers[0]} has shipped and is on it's way`
      break

    case 2:
      returnMessageHeader = `Item Number ${itemNumbers[0]} and ${itemNumbers[1]} have shipped and are on their way`
      break

    default:
      let shippedNo = itemNumbers.reduce((strBuilder, itemNo, index) => {
        if (index < itemNumbers.length - 1) {
          return (strBuilder += `${itemNo}, `)
        } else {
          return (strBuilder += `and ${itemNo}`)
        }
      }, "")
      returnMessageHeader = `Item Number's ${shippedNo} have shipped and are on their way`
  }

  return returnMessageHeader
}
