SELECT profile
FROM membership.dealer
WHERE nav_customer_id LIKE $1 
AND disabled = false
LIMIT 1