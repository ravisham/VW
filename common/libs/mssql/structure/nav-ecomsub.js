module.exports = {
	name: "NAV-Ecomsub",
	schema: {
		name: "dbo",
		tables: {
			items: {
				name: "Vision Wheel, Inc_$EComm Item Data",
				columns: {
					/** 
					 * @type {Object} 
					 * @description Part Number 
					 */
					itemNum: {
						name: "Item No_"
					},
					itemNum2: {
						name: "Item No_ 2"
					},
					itemDesc: {
						name: "Description"
					},
					itemDesc2: {
						name: "Description 2"
					},
					finishDesc: {
						name: "Finish Description"
					},
					searchDesc: {
						name: "Search Description"
					},
					/** 
					 * @type {Object} 
					 * @description Product Type (wheel, tire, accessory) 
					 */
					inventoryGrp: {
						name: "Inventory Posting Group"
					}
				}
			},
			inventory: {
				name: "Vision Wheel, Inc_$Location Inventory",
				columns: {
					itemDesc: {
						name: "Item Description"
					},
					itemNum: {
						name: "Item No_",
						datatype: "varchar"
					},
					itemUnitCost: {
						name: "Item Unit Cost",
						datatype: "decimal"
					},
					onHandQty: {
						name: "Nav Qty On Hand"
					},
					locCode: {
						name: "Location Code"
					}
				}
			},
			salesHeader: {
				name: "Vision Wheel, Inc_$Sales Header",
				columns: {
					timeStamp: {
						name: "timestamp"
					},
					docType: {
						name: "Document Type"
					},
					salesNum: {
						name: "No_"
					},
					customerNum: {
						name: "Sell-to Customer No_"
					},
					docNum: {
						name: "External Document No_"
					},
					trackingNum: {
						name: "Package Tracking No_"
					}
				}
			},
			salesInvoiceHeader: {
				name: "Vision Wheel, Inc_$Sales Invoice Header",
				columns: {
					timeStamp: {
						name: "timestamp"
					},
					salesNum: {
						name: "No_"
					},
					postingDate: {
						name: "Posting Date"
					},
					customerNum: {
						name: "Sell-to Customer No_"
					},
					locCode: {
						name: "Location Code"
					},
					orderNum: {
						name: "Order No_"
					},
					docNum: {
						name: "External Document No_"
					},
					agentCode: {
						name: "Shipping Agent Code"
					},
					trackingNum: {
						name: "Package Tracking No_"
					}
				}
			},
			pricing: {
				name: "Vision Wheel, Inc_$E-Comm Cust Sales Price",
				columns: {
					customerNum: {
						name: "Customer No_"
					},
					itemNum: {
						name: "Item No_"
					},
					itemDesc: {
						name: "Item Description"
					},
					baseUnitMeasure: {
						name: "Base Unit of Measure"
					},
					unitPrice: {
						name: "Unit Price"
					},
					crossRef1: {
						name: "Item Xref1"
					},
					crossRef2: {
						name: "Item Xref2"
					},
					crossRef3: {
						name: "Item Xref3"
					},
					crossRef4: {
						name: "Item Xref4"
					},
					crossRef5: {
						name: "Item Xref5"
					}
				}
			},
			orderHeader: {
				name: "Vision Wheel, Inc_$Website Inbound Order Header",
				columns: {
					addShipToCodeToNAV: {
						datatype: "tinyint",
						name: "Add Ship-to Code to NAV",
						notnull: true
					},
					agentEmailAddress: {
						datatype: "varchar",
						name: "Agent Email Address",
						maxlength: 50,
						notnull: false
					},
					billToEmail: {
						datatype: "varchar",
						name: "Bill-to E-mail",
						maxlength: 50,
						notnull: false
					},
					customerEmail: {
						datatype: "varchar",
						name: "Customer E-mail",
						maxlength: 50,
						notnull: false
					},
					customerPhone: {
						datatype: "varchar",
						name: "Customer Phone No_",
						maxlength: 30,
						notnull: false
					},
					ccStatus: {
						datatype: "int",
						name: "CCStatus",
						notnull: false
					},
					ccAuthCode: {
						datatype: "varchar",
						name: "CCAuthCode",
						capitalize: true,
						maxlength: 30,
						notnull: false
					},
					ccAuthDate: {
						datatype: "datetime",
						name: "CCAuthDate",
						notnull: false
					},
					ccSettleDate: {
						datatype: "datetime",
						name: "CCSettleDate",
						notnull: false
					},
					ccResponse: {
						datatype: "varchar",
						name: "CCResponse",
						capitalize: true,
						maxlength: 250,
						notnull: false
					},
					customerNum: {
						datatype: "varchar",
						name: "Customer No_",
						capitalize: true,
						maxlength: 20,
						notnull: true
					},
					cancelAfterDate: {
						datatype: "datetime",
						name: "Cancel after Date",
						notnull: false
					},
					changedDefaultPaymentInfo: {
						datatype: "tinyint",
						name: "Changed Default Payment Info",
						notnull: false
					},
					commentLine1: {
						datatype: "varchar",
						name: "Comment Line 1",
						maxlength: 80,
						notnull: false
					},
					commentLine2: {
						datatype: "varchar",
						name: "Comment Line 2",
						maxlength: 80,
						notnull: false
					},
					commentLine3: {
						datatype: "varchar",
						name: "Comment Line 3",
						maxlength: 80,
						notnull: false
					},
					commentLine4: {
						datatype: "varchar",
						name: "Comment Line 4",
						maxlength: 80,
						notnull: false
					},
					commentLine5: {
						datatype: "varchar",
						name: "Comment Line 5",
						maxlength: 80,
						notnull: false
					},
					creditAppliedTo: {
						datatype: "varchar",
						name: "Credit Applied to",
						capitalize: true,
						maxlength: 20,
						notnull: false
					},
					customerSelectedShipMethod: {
						datatype: "tinyint",
						name: "Customer Selected Ship Method",
						notnull: false
					},
					docType: {
						datatype: "int",
						name: "Document Type",
						notnull: true
					},
					docNum: {
						datatype: "varchar",
						name: "Document No_",
						maxlength: 20,
						notnull: true
					},
					deliveryType: {
						datatype: "int",
						name: "Delivery Type",
						notnull: false
					},
					discountCode: {
						datatype: "varchar",
						name: "Discount Code",
						capitalize: true,
						maxlength: 20,
						notnull: false
					},
					discountHandled: {
						datatype: "tinyint",
						name: "Discount Handled",
						notnull: false
					},
					externalDocNum: {
						datatype: "varchar",
						name: "External Document No_",
						maxlength: 30,
						notnull: true
					},
					errors: {
						datatype: "tinyint",
						name: "Errors",
						notnull: false
					},
					errorMessage: {
						datatype: "varchar",
						name: "Error Message",
						maxlength: 200,
						notnull: false
					},
					eShipAgentService: {
						datatype: "varchar",
						name: "EShip Agent Service",
						capitalize: true,
						maxlength: 30,
						notnull: false
					},
					freightTotal: {
						datatype: "decimal",
						name: "Freight Total",
						notnull: true
					},
					locationCode: {
						datatype: "varchar",
						name: "Location Code",
						capitalize: true,
						maxlength: 20,
						notnull: true
					},
					msReplTranVersion: {
						datatype: "varchar",
						name: "msrepl_tran_version",
						notnull: false
					},
					noOfTries: {
						datatype: "int",
						name: "No of Tries",
						notnull: false
					},
					orderType: {
						datatype: "varchar",
						name: "Order Type",
						maxlength: 10,
						notnull: false
					},
					orderDate: {
						datatype: "datetime",
						name: "Order Date",
						notnull: true
					},
					paymentMethod: {
						datatype: "varchar",
						name: "Payment Method",
						capitalize: true,
						notnull: true
					},
					paymentTermsCode: {
						datatype: "varchar",
						name: "Payment Terms Code",
						capitalize: true,
						notnull: false
					},
					processed: {
						datatype: "tinyint",
						name: "Processed",
						notnull: false
					},
					processedDate: {
						datatype: "datetime",
						name: "Processed Date",
						notnull: false
					},
					processFee: {
						datatype: "decimal",
						name: "Process Fee",
						notnull: false
					},
					released: {
						datatype: "tinyint",
						name: "Released",
						notnull: false
					},
					releasedDate: {
						datatype: "datetime",
						name: "Released Date",
						notnull: false
					},
					requestDeliveryDate: {
						datatype: "datetime",
						name: "Requested Delivery Date",
						notnull: false
					},
					sellToName: {
						datatype: "varchar",
						name: "Sell-to Name",
						maxlength: 30,
						notnull: false
					},
					sellToAddress: {
						datatype: "varchar",
						name: "Sell-to Address 1",
						maxlength: 30,
						notnull: false
					},
					sellToAddress2: {
						datatype: "varchar",
						name: "Sell-to Address 2",
						maxlength: 30,
						notnull: false
					},
					sellToPostCode: {
						datatype: "varchar",
						name: "Sell-to Post Code",
						maxlength: 10,
						notnull: false
					},
					sellToCounty: {
						datatype: "varchar",
						name: "Sell-to County",
						maxlength: 30,
						notnull: false
					},
					sellToCity: {
						datatype: "varchar",
						name: "Sell-to City",
						maxlength: 30,
						notnull: false
					},
					sellToCountryCode: {
						datatype: "varchar",
						name: "Sell-to Country Code",
						capitalize: true,
						maxlength: 10,
						notnull: false
					},
					sellToEmail: {
						datatype: "varchar",
						name: "Sell-to E-Mail",
						maxlength: 50,
						notnull: false
					},
					shipToCode: {
						datatype: "varchar",
						name: "Ship-to Code",
						capitalize: true,
						maxlength: 20,
						notnull: false
					},
					shipToName: {
						datatype: "varchar",
						name: "Ship-to Name",
						maxlength: 50,
						notnull: true
					},
					shipToName2: {
						datatype: "varchar",
						name: "Ship-to Name 2",
						maxlength: 50
					},
					shipToAddress: {
						datatype: "varchar",
						name: "Ship-to Address",
						maxlength: 50,
						notnull: true
					},
					shipToAddress2: {
						datatype: "varchar",
						name: "Ship-to Address 2",
						maxlength: 50,
						notnull: false
					},
					shipToPostCode: {
						datatype: "varchar",
						name: "Ship-to Post Code",
						maxlength: 10,
						notnull: true
					},
					shipToCity: {
						datatype: "varchar",
						name: "Ship-to City",
						maxlength: 30,
						notnull: true
					},
					shipToCountryCode: {
						datatype: "varchar",
						name: "Ship-to Country Code",
						capitalize: true,
						maxlength: 10,
						notnull: true
					},
					shipToPhone: {
						datatype: "varchar",
						name: "Ship-to Phone No_",
						notnull: false
					},
					shipToEmail: {
						datatype: "varchar",
						name: "Ship-to E-Mail",
						maxlength: 50,
						notnull: false
					},
					shipToContact: {
						datatype: "varchar",
						name: "Ship-to Contact",
						maxlength: 30,
						notnull: false
					},
					shipToCounty: {
						datatype: "varchar",
						name: "Ship-to County",
						capitalize: true,
						maxlength: 30,
						notnull: false
					},
					shipmentMethod: {
						datatype: "varchar",
						name: "Shipment Method",
						capitalize: true,
						maxlength: 20,
						notnull: false
					},
					shippingAgent: {
						datatype: "varchar",
						name: "Shipping Agent",
						capitalize: true,
						maxlength: 10,
						notnull: true
					},
					storeNo: {
						datatype: "varchar",
						name: "Store No_",
						maxlength: 20,
						notnull: false
					},
					shippingServiceIndicator: {
						datatype: "varchar",
						name: "Shipping Service Indicator",
						capitalize: true,
						maxlength: 10,
						notnull: false
					},
					timeStamp: {
						datatype: "timestamp",
						name: "timestamp",
						notnull: true
					},
					termsDiscountAmount: {
						datatype: "decimal",
						name: "Terms Discount Amount",
						notnull: false
					},
					thirdPartAccountNum: {
						datatype: "varchar",
						name: "Third Part Account No_",
						maxlength: 20,
						notnull: false
					},
					totalDiscountAmount: {
						datatype: "decimal",
						name: "Total Discount Amount",
						notnull: true
					},
					taxAmount: {
						datatype: "decimal",
						name: "Tax Amount",
						notnull: true
					},
					totalInvoiceAmount: {
						datatype: "decimal",
						name: "Total Invoice Amount",
						notnull: true
					},
					webmasterOrderNum: {
						datatype: "varchar",
						name: "Web Master Order No_",
						maxlength: 20,
						notnull: true
					},
					websiteUserEmailAddress: {
						datatype: "varchar",
						name: "Website User Email Address",
						maxlength: 50,
						notnull: true
					},
					yourReference: {
						datatype: "varchar",
						name: "Your Reference",
						maxlength: 30,
						notnull: false
					},
					transactionType: {
						datatype: "int",
						name: "Transaction Type",
						notnull: false
					}
				}
			},
			orderLine: {
				name: "Vision Wheel, Inc_$Website Inbound Order Line",
				columns: {
					timeStamp: {
						datatype: "timestamp",
						name: "timestamp",
						notnull: true
					},
					docType: {
						datatype: "int",
						name: "Document Type",
						notnull: true
					},
					docNum: {
						datatype: "varchar",
						name: "Document No_",
						maxlength: 20,
						notnull: true
					},
					lineNum: {
						datatype: "int",
						name: "Line No_",
						notnull: true
					},
					itemNum: {
						datatype: "varchar",
						name: "Item No_",
						maxlength: 20,
						notnull: true
					},
					description: {
						datatype: "varchar",
						name: "Description",
						maxlength: 30,
						notnull: false
					},
					qty: {
						datatype: "decimal",
						name: "Quantity",
						notnull: true
					},
					qtyUnitOfMeasure: {
						datatype: "varchar",
						name: "Quantity Unit of Measure",
						maxlength: 10,
						notnull: false
					},
					unitPrice: {
						datatype: "decimal",
						name: "Unit Price",
						notnull: true
					},
					extendedLinePrice: {
						datatype: "decimal",
						name: "Extended Line Price",
						notnull: false
					},
					customerItemNo_: {
						datatype: "varchar",
						name: "Customer Item No_",
						maxlength: 20,
						notnull: false
					},
					customerLineNo_: {
						datatype: "varchar",
						name: "Customer Line No_",
						maxlength: 10,
						notnull: false
					},
					promotionNum: {
						datatype: "varchar",
						name: "Promotion No_",
						maxlength: 20,
						notnull: false
					},
					promotionPairedLineNum: {
						datatype: "int",
						name: "Promotion Paired Line No_",
						notnull: false
					},
					promotionDiscAmt: {
						datatype: "decimal",
						name: "Promotion Disc_ Amt_",
						notnull: false
					},
					promotionDiscPercentage: {
						datatype: "decimal",
						name: "Promotion Discount Percentage",
						notnull: false
					},
					taxAmount: {
						datatype: "decimal",
						name: "Tax Amount",
						notnull: true
					},
					totalLineAmount: {
						datatype: "decimal",
						name: "Total Line Amount",
						notnull: true
					},
					appliedToInvoiceNum: {
						datatype: "varchar",
						name: "Applied-to Invoice No",
						maxlength: 20,
						notnull: false
					},
					appliedToInvoiceLineNum: {
						datatype: "int",
						name: "Applied-to Invoice Line No_",
						notnull: false
					},
					creditMemoReasonCode: {
						datatype: "varchar",
						name: "Credit Memo Reason Code",
						capitalize: true,
						maxlength: 10,
						notnull: false
					},
					eCommLineType: {
						datatype: "int",
						name: "E-Comm Line Type",
						notnull: true
					}
				}
			}
		}
	}
};