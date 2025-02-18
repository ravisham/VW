update item
set image=$2
WHERE id = any($1)
--'{170962, 170961}'