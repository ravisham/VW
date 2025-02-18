select
	count(*) as count,
	s.item_id as id,
	i.part_number,
	i.type,
	i.specification,
	i.inventory,
	i.image,
	i.product_id,
	p.name as model,
	p.logo as p_logo,
	p.description,
	p.image as p_image,
	b.name as brand,
	b.logo as b_logo,
	b.description as b_description,
	b.image as b_image
	
	from sales.sale_item as s
	left join item as i on i.id=s.item_id
	left join product as p on i.product_id=p.id
	left join brand as b on p.brand_id=b.id
	
	group by (
		s.item_id, i.part_number,
		i.type,
		i.specification,
		i.inventory,
		i.image,
		i.product_id,
		model,
		p_logo,
		p.description,
		p_image,
		brand,
		b_logo,
		b_description,
		b_image
	)
	order by count desc