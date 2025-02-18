SELECT web_order_number
FROM sales.sale
WHERE web_order_number IS NOT NULL AND web_order_number LIKE $1
ORDER BY CAST(web_order_number AS BIGINT) DESC LIMIT 1;