SELECT COUNT(*) 
FROM membership.user, membership.dealer 
WHERE membership.user.store_number = $1 
AND membership.dealer.nav_customer_id = $2
AND membership.dealer.id = membership.user.dealer_id