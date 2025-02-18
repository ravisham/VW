update item
set product_id=$2
WHERE id = any($1)
--'{170962, 170961}'