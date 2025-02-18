SELECT web_order_number
FROM sales.sale
WHERE web_order_number IS NOT NULL AND web_order_number LIKE $2 AND REPLACE(web_order_number,$1,'') ~ '^[0-9]*$'
ORDER BY id DESC LIMIT 1;