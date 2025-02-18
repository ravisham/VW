SELECT shipping_config, local_enabled
FROM membership.user
WHERE membership.user.store_number = $1 
LIMIT 1