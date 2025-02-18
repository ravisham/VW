select
	si.id,
	si.sale_id,
	si.item_id,
	si.item_no,
	si.item_description,
	si.customer_item_no,
	si.qty,
	si.tax_amount,
	si.unit_price,
	si.total_line_amount,
	si.fulfilment_location,
	si.shipping_options,
	i.type,
	i.specification,
	i.inventory,
	i.image,
	p.name as model,
	p.slug,
	p.logo,
	p.description,
	p.image as p_image,
	b.name as brand,
	b.slug as b_slug,
	b.logo as b_logo,
	b.description as b_description,
	b.image as b_image
	from sales.sale_item as si
	left join item as i on si.item_id=i.id
	left join product as p on i.product_id=p.id
	left join brand as b on p.brand_id=b.id
	WHERE si.sale_id = any($1)